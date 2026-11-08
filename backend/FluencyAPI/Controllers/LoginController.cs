using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FluencyAPI.Authentication;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class LoginController(ILoginService login, ActorActual actor, TimeProvider clock, IAntiforgery antiforgery) : ControllerBase
{
    /// <summary>Obtiene un token CSRF para la identidad actual.</summary>
    [AllowAnonymous]
    [HttpGet("csrf")]
    [ProducesResponseType<CsrfResponse>(StatusCodes.Status200OK)]
    public ActionResult<CsrfResponse> Csrf() => Ok(new CsrfResponse(antiforgery.GetAndStoreTokens(HttpContext).RequestToken!));

    /// <summary>Inicia una sesión no persistente con vencimiento absoluto de ocho horas.</summary>
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationSetup.LoginRatePolicy)]
    [HttpPost("login")]
    [ProducesResponseType<SesionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<SesionResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var session = await login.LoginAsync(request, cancellationToken);
        if (session is null) return Problem(statusCode: 401, title: "Usuario o contraseña incorrectos.");
        var now = clock.GetUtcNow();
        var expires = now.AddHours(8);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, SessionValidation.Principal(session),
            new AuthenticationProperties { IssuedUtc = now, ExpiresUtc = expires, IsPersistent = false, AllowRefresh = false });
        return Ok(new SesionResponse(session.Usuario, expires));
    }

    /// <summary>Consulta la identidad validada y el vencimiento original de la sesión.</summary>
    [HttpGet("me")]
    [ProducesResponseType<SesionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SesionResponse>> Me()
    {
        var authentication = await HttpContext.AuthenticateAsync();
        return Ok(new SesionResponse(actor.Usuario, authentication.Properties!.ExpiresUtc!.Value));
    }

    /// <summary>Cierra la sesión actual; requiere token CSRF de esa identidad.</summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
