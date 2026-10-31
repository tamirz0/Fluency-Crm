using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ClientesModelTests
{
    [Fact]
    public async Task PersistsClientsAndKeepsHistoricalAssociationsAndRestrictiveReferences()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(connection);
        await using var db = new FluencyLocalDbContext(new DbContextOptionsBuilder<FluencyLocalDbContext>().UseNpgsql(fixture.ConnectionString).Options);
        foreach (var type in new[] { typeof(Empresa), typeof(Contacto) })
        {
            var entity = db.Model.FindEntityType(type)!;
            foreach (var name in new[] { "IdEstado", "IdResponsable", "FechaCreacion", "Activo" })
                Assert.False(Assert.IsAssignableFrom<Microsoft.EntityFrameworkCore.Metadata.IProperty>(entity.FindProperty(name)).IsNullable);
            Assert.All(entity.GetForeignKeys(), fk => Assert.Equal(DeleteBehavior.Restrict, fk.DeleteBehavior));
        }
        var company = await db.Empresas.SingleAsync(x => x.RazonSocial == "Empresa A");
        var contact = await db.Contactos.SingleAsync();
        var second = await db.Empresas.SingleAsync(x => x.RazonSocial == "Empresa B");
        contact.IdEmpresa = second.Id;
        await db.SaveChangesAsync();
        Assert.Equal(company.Id, await CommercialSchemaFixture.ScalarAsync<int>(connection, "SELECT id_empresa FROM oportunidad"));
        Assert.Equal(contact.Id, await CommercialSchemaFixture.ScalarAsync<int>(connection, "SELECT id_contacto FROM oportunidad"));
        // Parameterized target-schema queries prepare the CP09 blockers without enabling a deletion API.
        await using var blockers = new Npgsql.NpgsqlCommand("SELECT (SELECT count(*) FROM contacto WHERE id_empresa=@id AND activo) + (SELECT count(*) FROM oportunidad WHERE id_empresa=@id AND activo)", connection);
        blockers.Parameters.AddWithValue("id", company.Id);
        Assert.Equal(1L, await blockers.ExecuteScalarAsync());
        Assert.Equal(Npgsql.PostgresErrorCodes.ForeignKeyViolation,
            (await Assert.ThrowsAsync<Npgsql.PostgresException>(() => CommercialSchemaFixture.ExecuteAsync(connection, $"DELETE FROM empresa WHERE id={company.Id}"))).SqlState);
    }
}
