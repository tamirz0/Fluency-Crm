using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Services.Acceso;
using Services.Interface;

namespace FluencyAPI.Authentication;

public sealed class SessionValidation(ILoginService login, ActorActual actor) : CookieAuthenticationEvents
{
    internal const string FingerprintClaim = "password_fingerprint";
    internal const string PermissionClaim = "permission";

    internal static ClaimsPrincipal Principal(SesionUsuario session)
    {
        List<Claim> claims = [new(ClaimTypes.NameIdentifier, session.Usuario.Id.ToString(CultureInfo.InvariantCulture)),
            new(ClaimTypes.Name, session.Usuario.Username), new(FingerprintClaim, session.PasswordFingerprint)];
        claims.AddRange(session.Usuario.Roles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.AddRange(session.Usuario.Permisos.Select(permission => new Claim(PermissionClaim, permission)));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    }

    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var idClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var session = int.TryParse(idClaim, out var id)
            ? await login.GetSessionAsync(id, context.HttpContext.RequestAborted) : null;
        var fingerprint = context.Principal?.FindFirstValue(FingerprintClaim) ?? "";
        if (session is null || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(session.PasswordFingerprint), Encoding.UTF8.GetBytes(fingerprint)))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        actor.Establecer(session.Usuario);
        context.ReplacePrincipal(Principal(session));
        context.ShouldRenew = false;
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}
