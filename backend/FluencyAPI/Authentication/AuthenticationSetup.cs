using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Services.Acceso;

namespace FluencyAPI.Authentication;

internal static class AuthenticationSetup
{
    internal const string CookieName = "Fluency.Session";
    internal const string LoginRatePolicy = "login";

    internal static void AddSession(this IServiceCollection services, IWebHostEnvironment environment)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<ActorActual>();
        services.AddScoped<SessionValidation>();
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = CookieName;
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
            options.Cookie.SecurePolicy = environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = false;
            options.EventsType = typeof(SessionValidation);
        });
        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<TimeProvider>((options, clock) => options.TimeProvider = clock);

        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
            foreach (var permission in new[] { RolesYPermisos.ConsultarComercial, RolesYPermisos.GestionarClientes,
                         RolesYPermisos.GestionarOportunidad, RolesYPermisos.GestionarActividad })
                options.AddPolicy(permission, policy => policy.RequireAuthenticatedUser()
                    .RequireClaim(SessionValidation.PermissionClaim, permission));
            options.AddPolicy(RolesYPermisos.AdministrarUsuarios, policy => policy.RequireAuthenticatedUser()
                .RequireRole(RolesYPermisos.Administrador).RequireClaim(SessionValidation.PermissionClaim, RolesYPermisos.AdministrarUsuarios));
            options.AddPolicy(RolesYPermisos.AdministrarConfiguracion, policy => policy.RequireAuthenticatedUser()
                .RequireRole(RolesYPermisos.Administrador).RequireClaim(SessionValidation.PermissionClaim, RolesYPermisos.AdministrarConfiguracion));
            options.AddPolicy(RolesYPermisos.ReabrirOportunidad, policy => policy.RequireAuthenticatedUser()
                .RequireRole(RolesYPermisos.Administrador, RolesYPermisos.ResponsableComercial)
                .RequireClaim(SessionValidation.PermissionClaim, RolesYPermisos.ReabrirOportunidad));
        });

        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "Fluency.Antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
            options.Cookie.SecurePolicy = environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        });
        // MVC's standard antiforgery filters are registered by the view-services extension.
        services.AddControllersWithViews(options => options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));

        services.AddRateLimiter(options =>
        {
            options.AddPolicy(LoginRatePolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0
                }));
            options.OnRejected = async (context, cancellationToken) =>
            {
                var retry = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var delay) ? delay.TotalSeconds : 60;
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.Headers.RetryAfter = Math.Max(1, Math.Ceiling(retry)).ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>().WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context.HttpContext,
                    ProblemDetails = new ProblemDetails { Status = 429, Title = "Demasiados intentos. Intente nuevamente más tarde." }
                });
            };
        });
    }
}
