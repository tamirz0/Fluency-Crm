using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class OportunidadesModelTests
{
    private static FluencyLocalDbContext Open(CommercialSchemaFixture fixture) =>
        new(new DbContextOptionsBuilder<FluencyLocalDbContext>().UseNpgsql(fixture.ConnectionString).Options);

    [Fact]
    public async Task ReadsOpportunityAndDerivesFunnelServiceAndStateFromItsStage()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = Open(fixture);

        var model = db.Model;
        Assert.Null(model.FindEntityType(typeof(Oportunidad))!.FindProperty("IdServicio"));
        Assert.Null(model.FindEntityType(typeof(Oportunidad))!.FindProperty("IdEstado"));
        Assert.Null(model.FindEntityType(typeof(Oportunidad))!.FindProperty("IdEmbudo"));
        Assert.DoesNotContain(model.GetEntityTypes(), t => t.ClrType.Name is "OportunidadItem" or "LogOportunidadCambio");
        Assert.All(new[] { typeof(Oportunidad), typeof(HistorialEtapa) },
            type => Assert.All(model.FindEntityType(type)!.GetForeignKeys(), fk => Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior)));

        var item = await db.Oportunidades.AsNoTracking()
            .Include(o => o.IdEtapaNavigation).ThenInclude(e => e.IdEmbudoNavigation).ThenInclude(b => b.IdServicioNavigation)
            .Include(o => o.IdEtapaNavigation).ThenInclude(e => e.IdEstadoNavigation)
            .SingleAsync();
        Assert.Equal("Embudo ficticio", item.IdEtapaNavigation.IdEmbudoNavigation.Nombre);
        Assert.Equal("Servicio ficticio", item.IdEtapaNavigation.IdEmbudoNavigation.IdServicioNavigation.Nombre);
        Assert.Equal("ABIERTA", item.IdEtapaNavigation.IdEstadoNavigation.Codigo);
        Assert.Equal(100.25m, item.Valor);
        Assert.True(item.Activo);
        Assert.Equal(DateTimeKind.Utc, item.FechaCreacion.Kind);
        Assert.Null(item.FechaCierre);
        Assert.Null(item.IdMotivoPerdida);
        Assert.Null(item.CantidadParticipantes);

        foreach (var name in new[] { "IdResponsable", "IdEtapa", "Valor", "FechaCreacion", "Activo" })
            Assert.False(model.FindEntityType(typeof(Oportunidad))!.FindProperty(name)!.IsNullable);
        foreach (var name in new[] { "Titulo", "IdEmpresa", "IdContacto", "IdOrigen", "FechaEstimadaCierre", "FechaCierre", "IdMotivoPerdida",
                     "ObjetivoAprendizaje", "CantidadParticipantes", "DisponibilidadHoraria", "Observaciones" })
            Assert.True(model.FindEntityType(typeof(Oportunidad))!.FindProperty(name)!.IsNullable);
    }

    [Fact]
    public async Task PersistsDecimalsDatesAcademicFieldsAndInitialHistoryWithoutPreviousStage()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = Open(fixture);

        var user = await db.Usuarios.SingleAsync();
        var stage = await db.EtapaComerciales.SingleAsync(e => e.Nombre == "Abierta");
        var lost = await db.EtapaComerciales.SingleAsync(e => e.Nombre == "Perdida");
        var company = await db.Empresas.SingleAsync(e => e.RazonSocial == "Empresa B");
        var reason = new MotivoPerdida { Descripcion = "Precio" };
        db.MotivosPerdida.Add(reason);
        await db.SaveChangesAsync();

        var closedAt = DateTime.UtcNow;
        var created = new Oportunidad
        {
            Titulo = "Curso corporativo", IdResponsable = user.Id, IdEmpresa = company.Id, IdEtapa = stage.Id,
            Valor = 9999999999.99m, FechaEstimadaCierre = new DateOnly(2026, 12, 31),
            ObjetivoAprendizaje = "Reuniones en inglés", CantidadParticipantes = 12, DisponibilidadHoraria = "Martes y jueves",
            HistorialEtapas = { new HistorialEtapa { IdNuevaEtapa = stage.Id, IdUsuario = user.Id, Observacion = "Alta" } }
        };
        var zero = new Oportunidad { Titulo = "Sin costo", IdResponsable = user.Id, IdContacto = (await db.Contactos.SingleAsync()).Id, IdEtapa = stage.Id, Valor = 0m };
        db.Oportunidades.AddRange(created, zero);
        await db.SaveChangesAsync();

        // Cierre perdido con motivo y un segundo registro de historial que conserva la etapa anterior.
        created.IdEtapa = lost.Id;
        created.FechaCierre = closedAt;
        created.IdMotivoPerdida = reason.Id;
        db.HistorialEtapas.Add(new HistorialEtapa { IdOportunidad = created.Id, IdEtapaAnterior = stage.Id, IdNuevaEtapa = lost.Id, IdUsuario = user.Id });
        await db.SaveChangesAsync();

        await using var fresh = Open(fixture);
        var read = await fresh.Oportunidades.AsNoTracking().Include(o => o.HistorialEtapas).SingleAsync(o => o.Id == created.Id);
        Assert.Equal(9999999999.99m, read.Valor);
        Assert.Equal(new DateOnly(2026, 12, 31), read.FechaEstimadaCierre);
        Assert.Equal(closedAt, read.FechaCierre!.Value, TimeSpan.FromMilliseconds(1));
        Assert.Equal(reason.Id, read.IdMotivoPerdida);
        Assert.Equal(12, read.CantidadParticipantes);
        Assert.Equal("Martes y jueves", read.DisponibilidadHoraria);
        var history = read.HistorialEtapas.OrderBy(h => h.Id).ToList();
        Assert.Null(history[0].IdEtapaAnterior);
        Assert.Equal(stage.Id, history[0].IdNuevaEtapa);
        Assert.Equal(stage.Id, history[1].IdEtapaAnterior);
        Assert.All(history, h => { Assert.Equal(user.Id, h.IdUsuario); Assert.Equal(DateTimeKind.Utc, h.FechaHora.Kind); });
        Assert.Equal(0m, (await fresh.Oportunidades.AsNoTracking().SingleAsync(o => o.Id == zero.Id)).Valor);

        // Índices y FKs del esquema: borrar etapa, usuario u oportunidad con historial queda restringido.
        foreach (var sql in new[] { $"DELETE FROM oportunidad WHERE id={created.Id}", $"DELETE FROM etapa_comercial WHERE id={lost.Id}" })
            Assert.Equal(Npgsql.PostgresErrorCodes.ForeignKeyViolation,
                (await Assert.ThrowsAsync<Npgsql.PostgresException>(() => CommercialSchemaFixture.ExecuteAsync(connection, sql))).SqlState);
        Assert.Equal(6L, await CommercialSchemaFixture.ScalarAsync<long>(connection,
            "SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname LIKE 'ix_oportunidad_%'"));
        Assert.Equal(4L, await CommercialSchemaFixture.ScalarAsync<long>(connection,
            "SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname LIKE 'ix_historial_%'"));
    }
}
