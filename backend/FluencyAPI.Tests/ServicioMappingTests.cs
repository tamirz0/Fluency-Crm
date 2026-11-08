using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ServicioMappingTests
{
    [Fact]
    public async Task MaterializesServiceFunnelAndStageFromTargetSchema()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = new FluencyLocalDbContext(new DbContextOptionsBuilder<FluencyLocalDbContext>().UseNpgsql(fixture.ConnectionString).Options);
        var stage = await db.EtapaComerciales.Include(x => x.IdEmbudoNavigation).ThenInclude(x => x.IdServicioNavigation)
            .Include(x => x.IdEstadoNavigation).SingleAsync(x => x.Nombre == "Abierta");
        Assert.True(stage.Activo);
        Assert.Equal("ABIERTA", stage.IdEstadoNavigation.Codigo);
        Assert.True(stage.IdEmbudoNavigation.Activo);
        var service = stage.IdEmbudoNavigation.IdServicioNavigation;
        service.PrecioReferencia = 1234567890.12m;
        service.Activo = false;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        Assert.Equal(1234567890.12m, await db.Servicios.Select(x => x.PrecioReferencia).SingleAsync());
        Assert.True(await db.Embudos.Select(x => x.Activo).SingleAsync());
        // Historical reads use the target schema while opportunity management remains pending.
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection,
            "SELECT count(*) FROM oportunidad o JOIN etapa_comercial e ON e.id=o.id_etapa JOIN embudo b ON b.id=e.id_embudo JOIN servicio s ON s.id=b.id_servicio WHERE NOT s.activo"));
    }
}
