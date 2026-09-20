using Microsoft.EntityFrameworkCore;
using Persistence.Models;

namespace FluencyAPI.Bootstrap;

internal static class DemoSeed
{
    public static async Task ApplyAsync(FluencyLocalDbContext db, string? password)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        // Serialize concurrent seed runs without introducing domain constraints.
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(72190421)");

        foreach (var description in new[] { "Sitio Web", "Instagram", "Recomendación" })
            if (!await db.OrigenComerciales.AnyAsync(x => x.Descripcion == description))
                db.OrigenComerciales.Add(new OrigenComercial { Descripcion = description });
        foreach (var description in new[] { "Potencial", "Cliente", "Inactivo" })
            if (!await db.EstadoClientes.AnyAsync(x => x.Descripcion == description))
                db.EstadoClientes.Add(new EstadoCliente { Descripcion = description });
        foreach (var description in new[] { "A1", "A2", "B1", "B2", "C1", "C2" })
            if (!await db.NivelesIngles.AnyAsync(x => x.Descripcion == description))
                db.NivelesIngles.Add(new NivelIngles { Descripcion = description });
        foreach (var description in new[] { "Grupal Online", "Individual 1-to-1", "In-Company" })
            if (!await db.Modalidades.AnyAsync(x => x.Descripcion == description))
                db.Modalidades.Add(new Modalidad { Descripcion = description });

        var stages = new[]
        {
            ("Consulta Recibida", "Contacto inicial por la web", 1),
            ("Examen de Nivelación", "Evaluación oral y escrita", 2),
            ("Propuesta Enviada", "Cotización enviada", 3),
            ("Matrícula Abonada", "Inscripción confirmada", 4)
        };
        foreach (var (name, description, order) in stages)
            if (!await db.EtapaComerciales.AnyAsync(x => x.Nombre == name))
                db.EtapaComerciales.Add(new EtapaComercial { Nombre = name, Descripcion = description, Orden = order });

        if (!await db.Usuarios.AnyAsync(x => x.Username == "vendedor"))
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new BootstrapException("Falta Seed:DemoPassword para crear el usuario vendedor.");
            if (await db.Usuarios.AnyAsync(x => x.Correo == "vendedor@academia.com"))
                throw new BootstrapException("El correo del usuario demo ya pertenece a otro usuario. No se sobrescribió ningún usuario ni se guardaron seeds.");
            db.Usuarios.Add(new Usuario
            {
                Nombre = "Vendedor", Apellido = "Demo", Correo = "vendedor@academia.com",
                Username = "vendedor", Activo = true, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
            });
        }
        await db.SaveChangesAsync();

        var services = new[]
        {
            ("Inglés General B1", "Curso semestral de nivelación", 45000m, 60, "B1", "Grupal Online"),
            ("Business English Corporate", "Capacitación a medida para empresas", 120000m, 40, "B2", "In-Company")
        };
        foreach (var (name, description, price, hours, level, modality) in services)
        {
            if (await db.Servicios.AnyAsync(x => x.Nombre == name)) continue;
            var levelId = await db.NivelesIngles.Where(x => x.Descripcion == level).Select(x => x.Id).SingleAsync();
            var modalityId = await db.Modalidades.Where(x => x.Descripcion == modality).Select(x => x.Id).SingleAsync();
            db.Servicios.Add(new Servicio
            {
                Nombre = name, Descripcion = description, PrecioReferencia = price, DuracionHoras = hours,
                IdNivel = levelId, IdModalidad = modalityId, Activo = true
            });
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
