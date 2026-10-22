using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class CatalogoMappingTests
{
    [Fact]
    public async Task ReadsSeedsAndPreservesInactiveReferenceLabels()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = new FluencyLocalDbContext(new DbContextOptionsBuilder<FluencyLocalDbContext>()
            .UseNpgsql(fixture.ConnectionString).Options);
        Assert.Equal(4, await db.EstadoClientes.CountAsync(x => x.Activo));
        Assert.Equal(3, await db.OrigenComerciales.CountAsync(x => x.Activo));
        Assert.Equal(6, await db.NivelesIngles.CountAsync(x => x.Activo));
        Assert.Equal(3, await db.Modalidades.CountAsync(x => x.Activo));
        Assert.Equal(9, await db.TiposActividad.CountAsync(x => x.Activo));
        Assert.Equal(4, await db.MotivosPerdida.CountAsync(x => x.Activo));
        Assert.Equal(new[] { "ABIERTA", "GANADA", "PERDIDA" }, await db.EstadoOportunidades.OrderBy(x => x.Codigo).Select(x => x.Codigo).ToArrayAsync());
        var origin = new OrigenComercial { Descripcion = "Origen de prueba", Activo = false };
        db.OrigenComerciales.Add(origin);
        await db.SaveChangesAsync();
        await using var connection = await fixture.OpenAsync();
        await CommercialSchemaFixture.ExecuteAsync(connection, $"""
            INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Test','CP05','test@example.invalid','test','ficticio');
            INSERT INTO empresa(razon_social,id_estado,id_responsable,id_origen)
            SELECT 'Empresa CP05',e.id,u.id,{origin.Id} FROM estado_cliente e CROSS JOIN usuario u LIMIT 1;
            """);
        db.ChangeTracker.Clear();
        var reference = await db.Empresas.Select(e => new { e.IdOrigenNavigation!.Descripcion, e.IdOrigenNavigation.Activo }).SingleAsync();
        Assert.Equal("Origen de prueba", reference.Descripcion);
        Assert.False(reference.Activo);
    }
}
