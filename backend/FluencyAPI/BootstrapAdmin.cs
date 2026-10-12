using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Persistence.Models;
using Services.Acceso;

namespace FluencyAPI;

internal static class BootstrapAdmin
{
    internal static async Task<int> RunAsync(string[] args)
    {
        if (args.Length != 1)
            return Report(1, "Use únicamente --bootstrap-admin; los datos del administrador se reciben por variables de entorno.");

        try
        {
            // Use the normal connection sources, but never command-line administrator credentials.
            var builder = WebApplication.CreateBuilder(Array.Empty<string>());
            var configured = builder.Configuration.GetConnectionString("SegundaEntregaDB");
            if (string.IsNullOrWhiteSpace(configured))
                return Report(1, "Falta configurar ConnectionStrings:SegundaEntregaDB.");

            NpgsqlConnectionStringBuilder connection;
            try
            {
                connection = new NpgsqlConnectionStringBuilder(configured);
            }
            catch (ArgumentException)
            {
                return Report(1, "La configuración ConnectionStrings:SegundaEntregaDB no es válida.");
            }
            if (string.IsNullOrWhiteSpace(connection.Host) || string.IsNullOrWhiteSpace(connection.Database)
                || (builder.Environment.IsDevelopment() && connection.Host is not ("localhost" or "127.0.0.1" or "::1")))
                return Report(1, "Revisar Host y Database de ConnectionStrings:SegundaEntregaDB; Development exige un único host local.");

            connection.IncludeErrorDetail = false;
            connection.LogParameters = false;
            await using var db = new FluencyLocalDbContext(new DbContextOptionsBuilder<FluencyLocalDbContext>()
                .UseNpgsql(connection.ConnectionString).Options);
            await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            if (await db.Usuarios.AnyAsync())
            {
                var operationalAdmin = await db.Usuarios.AnyAsync(user => user.Activo && user.UsuarioRoles
                    .Any(join => join.IdRolNavigation.Nombre == RolesYPermisos.Administrador));
                return operationalAdmin
                    ? Report(0, "Administrador ya inicializado; no se modificaron cuentas ni credenciales.")
                    : Report(2, "Hay usuarios sin administrador activo; se requiere recuperación operativa por el dueño del entorno.");
            }

            var values = new Dictionary<string, string>();
            foreach (var (field, limit) in new[] { ("Nombre", 100), ("Apellido", 100), ("Correo", 150), ("Username", 50) })
            {
                var value = Environment.GetEnvironmentVariable("BootstrapAdmin__" + field)?.Trim();
                if (string.IsNullOrEmpty(value) || value.Length > limit)
                    return Report(1, $"BootstrapAdmin__{field} es obligatorio y admite hasta {limit} caracteres después de trim.");
                values[field] = value;
            }
            if (!new EmailAddressAttribute().IsValid(values["Correo"]))
                return Report(1, "BootstrapAdmin__Correo debe ser un correo válido.");

            var password = Environment.GetEnvironmentVariable("BootstrapAdmin__Password");
            if (password is null || password.EnumerateRunes().Count() < 8 || Encoding.UTF8.GetByteCount(password) > 72)
                return Report(1, "BootstrapAdmin__Password requiere al menos 8 caracteres y hasta 72 bytes UTF-8, sin trim.");

            var adminRole = await db.Roles.SingleOrDefaultAsync(role => role.Nombre == RolesYPermisos.Administrador);
            if (adminRole is null)
                return Report(4, "Falta preparar el esquema y los roles; el bootstrap no los crea ni repara.");

            var user = new Usuario
            {
                Nombre = values["Nombre"], Apellido = values["Apellido"], Correo = values["Correo"],
                Username = values["Username"], PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
                Activo = true
            };
            user.UsuarioRoles.Add(new UsuarioRol { IdRolNavigation = adminRole });
            db.Usuarios.Add(user);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Report(0, "Administrador inicial creado.");
        }
        catch (Exception error) when (error.GetBaseException() is PostgresException postgres
            && postgres.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected or PostgresErrorCodes.UniqueViolation)
        {
            // Disposal rolls back the entire attempt. The operator decides whether to run it again.
            return Report(3, "Cambio concurrente: se revirtió el intento completo. Revisar el estado antes de volver a ejecutar; no hubo reintento automático.");
        }
        catch (Exception)
        {
            return Report(4, "No se pudo inicializar el administrador. Revisar conexión, esquema y roles preparados; no se crean ni reparan automáticamente.");
        }
    }

    private static int Report(int code, string message)
    {
        Console.WriteLine(message);
        return code;
    }
}
