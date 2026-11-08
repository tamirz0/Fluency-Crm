using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Npgsql;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ActividadesModelTests
{
    private static FluencyLocalDbContext Open(CommercialSchemaFixture fixture) =>
        new(new DbContextOptionsBuilder<FluencyLocalDbContext>().UseNpgsql(fixture.ConnectionString).Options);

    [Fact]
    public async Task MapsTheActivityAsARealizedFactWithItsCatalogAndOptionalContexts()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = Open(fixture);

        var model = db.Model;
        Assert.Null(model.FindEntityType("Persistence.Models.ActividadOportunidad"));
        var activity = model.FindEntityType(typeof(Actividad))!;
        Assert.Equal("actividad", activity.GetTableName());
        Assert.All(activity.GetForeignKeys(), fk => Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior));
        Assert.Equal(5, activity.GetForeignKeys().Count());
        foreach (var name in new[] { "IdTipo", "IdUsuario", "FechaHora", "FechaRegistro", "Descripcion", "Activo" })
            Assert.False(activity.FindProperty(name)!.IsNullable, name);
        foreach (var name in new[] { "IdEmpresa", "IdContacto", "IdOportunidad", "Resultado" })
            Assert.True(activity.FindProperty(name)!.IsNullable, name);
        // Sin agenda, estado de tarea ni auditoría adicional: solo el hecho y sus dos instantes.
        Assert.DoesNotContain(activity.GetProperties(), p => p.Name is "FechaModificacion" or "IdUsuarioModificacion" or "FechaProgramada" or "Estado" or "Completada");
        Assert.Equal("tipo_actividad", model.FindEntityType(typeof(TipoActividad))!.GetTableName());
        Assert.Contains(model.FindEntityType(typeof(TipoActividad))!.GetNavigations(), n => n.Name == "Actividades");
    }

    [Fact]
    public async Task KeepsTheMomentOfTheFactAndTheRegistrationInstantApartInUtcAndEnforcesTheContext()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = Open(fixture);

        var user = await db.Usuarios.SingleAsync();
        var contact = await db.Contactos.SingleAsync();
        var company = await db.Empresas.OrderBy(e => e.Id).FirstAsync();
        var opportunity = await db.Oportunidades.SingleAsync();
        var type = await db.TiposActividad.OrderBy(t => t.Id).FirstOrDefaultAsync();
        if (type is null) { type = new TipoActividad { Nombre = "Llamada" }; db.TiposActividad.Add(type); await db.SaveChangesAsync(); }

        // Una llamada de ayer cargada hoy: el hecho conserva su instante y el registro lo fija la base.
        var yesterday = DateTime.UtcNow.AddDays(-1);
        var call = new Actividad { IdTipo = type.Id, IdUsuario = user.Id, IdContacto = contact.Id, FechaHora = yesterday, Descripcion = "Llamada de seguimiento" };
        var full = new Actividad { IdTipo = type.Id, IdUsuario = user.Id, IdEmpresa = company.Id, IdContacto = contact.Id, IdOportunidad = opportunity.Id, FechaHora = yesterday.AddHours(-3), Descripcion = "Reunión", Resultado = "Pidió propuesta" };
        db.Actividades.AddRange(call, full);
        await db.SaveChangesAsync();

        await using var reader = Open(fixture);
        var saved = await reader.Actividades.AsNoTracking().OrderBy(a => a.Id).ToListAsync();
        Assert.Equal(2, saved.Count);
        Assert.All(saved, a => { Assert.Equal(DateTimeKind.Utc, a.FechaHora.Kind); Assert.Equal(DateTimeKind.Utc, a.FechaRegistro.Kind); Assert.True(a.Activo); });
        Assert.Equal(yesterday, saved[0].FechaHora, TimeSpan.FromMilliseconds(1));
        Assert.True(saved[0].FechaRegistro - saved[0].FechaHora > TimeSpan.FromHours(23));
        Assert.True(DateTime.UtcNow - saved[0].FechaRegistro < TimeSpan.FromMinutes(5));
        Assert.Null(saved[0].IdEmpresa); Assert.Null(saved[0].IdOportunidad); Assert.Null(saved[0].Resultado);
        Assert.Equal(user.Id, saved[0].IdUsuario);
        Assert.Equal("Pidió propuesta", saved[1].Resultado);
        Assert.Equal(opportunity.Id, saved[1].IdOportunidad);

        // La navegación desde el catálogo, el cliente y la oportunidad usa las relaciones directas.
        Assert.Equal(2, await reader.TiposActividad.Where(t => t.Id == type.Id).SelectMany(t => t.Actividades).CountAsync());
        Assert.Equal(1, await reader.Oportunidades.Where(o => o.Id == opportunity.Id).SelectMany(o => o.Actividades).CountAsync());

        // Contexto y descripción se exigen en la base: una oportunidad sola o un texto en blanco no alcanzan.
        async Task<string?> Rejected(Actividad invalid)
        {
            await using var writer = Open(fixture);
            writer.Actividades.Add(invalid);
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => writer.SaveChangesAsync());
            return (error.InnerException as PostgresException)?.SqlState;
        }
        Assert.Equal(PostgresErrorCodes.CheckViolation, await Rejected(new Actividad { IdTipo = type.Id, IdUsuario = user.Id, IdOportunidad = opportunity.Id, FechaHora = yesterday, Descripcion = "Sin cliente" }));
        Assert.Equal(PostgresErrorCodes.CheckViolation, await Rejected(new Actividad { IdTipo = type.Id, IdUsuario = user.Id, IdContacto = contact.Id, FechaHora = yesterday, Descripcion = "   " }));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, await Rejected(new Actividad { IdTipo = type.Id, IdUsuario = 999999, IdContacto = contact.Id, FechaHora = yesterday, Descripcion = "Autor inexistente" }));
        Assert.Equal(2, await reader.Actividades.CountAsync());
    }
}
