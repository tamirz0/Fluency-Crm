using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class LoginController(ILoginService loginService) : ControllerBase
{
    /// <summary>Registra un nuevo usuario, hasheando su contraseña.</summary>
    [HttpPost("Register", Name = "Register")]
    [ProducesResponseType(typeof(UsuarioResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UsuarioResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await loginService.RegisterAsync(request, cancellationToken);

        return result.Outcome switch
        {
            RegisterOutcome.Success => Created($"/Login/{result.Usuario!.Id}", result.Usuario),
            RegisterOutcome.UsernameTaken
                => Conflict($"Ya existe un usuario con username '{request.Username}'."),
            _ => Problem()
        };
    }

    /// <summary>Autentica un usuario por username y contraseña.</summary>
    [HttpPost("Login", Name = "Login")]
    [ProducesResponseType(typeof(UsuarioResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UsuarioResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await loginService.LoginAsync(request, cancellationToken);

        return result.Outcome switch
        {
            LoginOutcome.Success => Ok(result.Usuario),
            LoginOutcome.InvalidCredentials => Unauthorized("Usuario o contraseña incorrectos."),
            _ => Problem()
        };
    }
}
