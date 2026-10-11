using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;
using Persistence.Models;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class DatabaseIsolationTests
{
    [Fact]
    public async Task RealHttpHostPersistsOnlyItsProbeAndRemovesItsOwnResources()
    {
        var factory = new LocalApiFactory();
        await using (factory)
        {
            await factory.InitializeDatabaseAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
            Assert.Equal(Environments.Development,
                factory.Services.GetRequiredService<IHostEnvironment>().EnvironmentName);
            using var response = await client.GetAsync("/openapi/v1.json");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(document.RootElement.TryGetProperty("openapi", out _));

            var id = Guid.NewGuid();
            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluencyLocalDbContext>();
                Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", db.Database.ProviderName);
                await db.Database.OpenConnectionAsync();
                var connection = Assert.IsType<NpgsqlConnection>(db.Database.GetDbConnection());
                await factory.VerifyConnectionAsync(connection);
                await using var insert = new NpgsqlCommand("INSERT INTO probe (id) VALUES (@id)", connection);
                insert.Parameters.AddWithValue("id", id);
                Assert.Equal(1, await insert.ExecuteNonQueryAsync());
            }

            await using var secondConnection = await factory.OpenVerifiedConnectionAsync();
            await using var read = new NpgsqlCommand("SELECT id FROM probe", secondConnection);
            Assert.Equal(id, Assert.IsType<Guid>(await read.ExecuteScalarAsync()));
        }

        await using var afterCleanup = await factory.OpenVerifiedConnectionAsync(requireSchema: false);
        Assert.False(await factory.SchemaExistsAsync(afterCleanup));
    }

    [Theory]
    [InlineData(2u, 3u, "fixture", "fixture")]
    [InlineData(1u, 4u, "fixture", "fixture")]
    [InlineData(1u, 3u, "otro", "fixture")]
    [InlineData(1u, 3u, "fixture", "otro")]
    public void CleanupRejectsReplacedOrForeignResourcesWithoutConnecting(
        uint schemaOid, uint tableOid, string schemaOwner, string tableOwner)
    {
        var created = new LocalApiFactory.OwnedResources(1, 3, "fixture", "fixture");
        var unexpected = new LocalApiFactory.OwnedResources(schemaOid, tableOid, schemaOwner, tableOwner);

        Assert.Throws<InvalidOperationException>(() => LocalApiFactory.ValidateResources(created, unexpected));
    }
}
