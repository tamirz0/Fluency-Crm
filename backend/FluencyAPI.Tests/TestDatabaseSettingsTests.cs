using Microsoft.Extensions.Configuration;
using Npgsql;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class TestDatabaseSettingsTests
{
    private const string DummyCredential = nameof(TestDatabaseSettingsTests) + nameof(LocalApiFactory);
    private const string ValidConnection =
        "Host=localhost;Port=5433;Database=fluency_segunda_entrega_test;Username=fixture;Password=" + DummyCredential;

    [Fact]
    public void MissingTestConnectionFailsEvenWhenDevelopmentIsConfigured()
    {
        var configuration = Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SegundaEntregaDB"] = ValidConnection.Replace("_test", "_dev"),
            ["ConnectionStrings:FluencyLocalDB"] = ValidConnection
        });

        var error = Assert.Throws<InvalidOperationException>(() => TestDatabaseSettings.Load(configuration));

        Assert.Contains("SegundaEntregaTestDB", error.Message);
        Assert.DoesNotContain(DummyCredential, error.Message);
    }

    [Theory]
    [MemberData(nameof(RejectedConnections))]
    public void UnsafeOrIncompleteConfigurationIsRejectedWithoutConnecting(string connection)
    {
        var configuration = Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SegundaEntregaTestDB"] = connection
        });

        var error = Assert.Throws<InvalidOperationException>(() => TestDatabaseSettings.Load(configuration));

        Assert.DoesNotContain(DummyCredential, error.Message);
        Assert.Null(error.InnerException);
    }

    public static IEnumerable<object[]> RejectedConnections()
    {
        yield return [""];
        yield return [" "];
        yield return ["Password=" + DummyCredential + ";FormatoIncorrecto"];
        yield return [ValidConnection.Replace("Host=localhost", "Host=api.postgres.database.azure.com")];
        yield return [ValidConnection.Replace("Host=localhost", "Host=localhost,remote")];
        yield return [ValidConnection.Replace("Host=localhost", "Host=/tmp")];
        yield return [ValidConnection.Replace("Port=5433;", "")];
        yield return [ValidConnection.Replace("_test", "_dev")];
        yield return [ValidConnection.Replace("Database=fluency_segunda_entrega_test;", "")];
        yield return [ValidConnection.Replace("Username=fixture;", "")];
        yield return [ValidConnection.Replace(";Password=" + DummyCredential, "")];
        yield return [ValidConnection + ";Options=-c role=otro"];
    }

    [Fact]
    public void ExplicitTestConnectionWinsOverUnrelatedDevelopmentConfiguration()
    {
        var settings = TestDatabaseSettings.Load(Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SegundaEntregaTestDB"] = ValidConnection,
            ["ConnectionStrings:SegundaEntregaDB"] = "configuración de desarrollo ajena"
        }));

        Assert.Equal(TestDatabaseSettings.DatabaseName,
            new NpgsqlConnectionStringBuilder(settings.ConnectionString).Database);
    }

    [Theory]
    [InlineData("localhost")]
    [InlineData("127.0.0.1")]
    [InlineData("::1")]
    public void FixtureOverridesSessionAndLoggingSettings(string host)
    {
        var configuration = Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SegundaEntregaTestDB"] = ValidConnection.Replace("localhost", host)
                + ";Search Path=public;Include Error Detail=true;Log Parameters=true;Pooling=true;Enlist=true"
        });

        var settings = TestDatabaseSettings.Load(configuration);
        var connection = new NpgsqlConnectionStringBuilder(settings.ConnectionString);

        Assert.Matches("^t03_[a-f0-9]{32}$", settings.SchemaName);
        Assert.Equal(settings.SchemaName, connection.SearchPath);
        Assert.Equal("-c search_path=" + settings.SchemaName, connection.Options);
        Assert.False(connection.IncludeErrorDetail);
        Assert.False(connection.LogParameters);
        Assert.False(connection.Pooling);
        Assert.False(connection.Enlist);
    }

    [Theory]
    [InlineData("fluency_segunda_entrega_dev", "fixture", "fixture", "fixture")]
    [InlineData("fluency_segunda_entrega_test", "otro", "fixture", "fixture")]
    [InlineData("fluency_segunda_entrega_test", "fixture", "otro", "fixture")]
    [InlineData("fluency_segunda_entrega_test", "fixture", "fixture", "otro")]
    public void UnexpectedDatabaseIdentityOrOwnerIsRejected(
        string database, string currentUser, string sessionUser, string owner)
    {
        var settings = TestDatabaseSettings.Load(Configuration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:SegundaEntregaTestDB"] = ValidConnection
        }));

        Assert.Throws<InvalidOperationException>(() =>
            settings.ValidateIdentity(database, currentUser, sessionUser, owner));
    }

    private static IConfiguration Configuration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
