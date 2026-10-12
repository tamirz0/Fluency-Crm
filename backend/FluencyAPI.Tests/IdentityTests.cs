using Microsoft.EntityFrameworkCore;
using Npgsql;
using Persistence.Models;
using Services.Acceso;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

public sealed class IdentityTests
{
    [Fact]
    public void SellerDoesNotBecomeSuperiorWhenHigherPermissionsAreAttached()
    {
        var seller = new Rol { Nombre = RolesYPermisos.Vendedor };
        seller.PermisoRoles = new[]
        {
            RolesYPermisos.ConsultarComercial, RolesYPermisos.GestionarOportunidad,
            RolesYPermisos.AdministrarUsuarios, RolesYPermisos.AdministrarConfiguracion, RolesYPermisos.ReabrirOportunidad
        }.Select(code => new PermisoRol { IdPermisoNavigation = new Permiso { Codigo = code } }).ToList();
        var user = User("vendedor");
        user.UsuarioRoles = [new UsuarioRol { IdRolNavigation = seller }];
        var capabilities = CapacidadesUsuario.Calcular(user);
        Assert.True(capabilities.PuedeLeerComercial);
        Assert.True(capabilities.PuedeGestionarPropias);
        Assert.True(capabilities.FunnelSoloPropio);
        Assert.False(capabilities.PuedeGestionarTodas);
        Assert.False(capabilities.PuedeReabrir);
        Assert.False(capabilities.PuedeAdministrarUsuarios);
        Assert.False(capabilities.PuedeAdministrarConfiguracion);
    }

    [Fact]
    public async Task CapabilitiesCombinePersistedRolesAndSuperiorRolePrevailsOverSeller()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await ApplyRolesAsync(connection);
        await using var db = Context(connection);
        var roles = await db.Roles.Include(role => role.PermisoRoles)
            .ThenInclude(join => join.IdPermisoNavigation).ToListAsync();
        foreach (var combination in new[]
        {
            new[] { RolesYPermisos.Vendedor },
            new[] { RolesYPermisos.Vendedor, RolesYPermisos.ResponsableComercial },
            new[] { RolesYPermisos.Vendedor, RolesYPermisos.Administrador },
            new[] { RolesYPermisos.Vendedor, RolesYPermisos.ResponsableComercial, RolesYPermisos.Administrador }
        })
        {
            var user = User("multirrol" + combination.Length + combination.Last());
            user.UsuarioRoles = roles.Where(role => combination.Contains(role.Nombre))
                .Select(role => new UsuarioRol { IdRolNavigation = role }).ToList();
            db.Usuarios.Add(user);
            await db.SaveChangesAsync();
            var stored = await db.Usuarios.AsNoTracking().Include(usuario => usuario.UsuarioRoles)
                .ThenInclude(join => join.IdRolNavigation).ThenInclude(role => role.PermisoRoles)
                .ThenInclude(join => join.IdPermisoNavigation).SingleAsync(usuario => usuario.Id == user.Id);
            var capabilities = CapacidadesUsuario.Calcular(stored);
            Assert.Equal(combination.Length, capabilities.Roles.Count);
            Assert.True(capabilities.PuedeLeerComercial);
            Assert.True(capabilities.PuedeGestionarPropias);
            Assert.Equal(combination.Length > 1, capabilities.PuedeGestionarTodas);
            Assert.Equal(combination.Length > 1, capabilities.PuedeReabrir);
            Assert.Equal(combination.Length == 1, capabilities.FunnelSoloPropio);
            Assert.Equal(combination.Contains(RolesYPermisos.Administrador), capabilities.PuedeAdministrarUsuarios);
            Assert.Equal(combination.Contains(RolesYPermisos.Administrador), capabilities.PuedeAdministrarConfiguracion);
            Assert.Equal(combination.Contains(RolesYPermisos.Administrador) ? 7 : combination.Length > 1 ? 5 : 4,
                capabilities.Permisos.Count);
        }
    }

    [Fact]
    public void InactiveUnknownOrUnassignedUsersHaveNoCapabilities()
    {
        var permission = new Permiso { Codigo = RolesYPermisos.AdministrarUsuarios };
        var knownRole = new Rol { Nombre = RolesYPermisos.Administrador,
            PermisoRoles = [new PermisoRol { IdPermisoNavigation = permission }] };
        var unknownRole = new Rol { Nombre = "DESCONOCIDO",
            PermisoRoles = [new PermisoRol { IdPermisoNavigation = permission }] };
        var inactive = User("inactivo");
        inactive.Activo = false;
        inactive.UsuarioRoles = [new UsuarioRol { IdRolNavigation = knownRole }];
        var unknown = User("desconocido");
        unknown.UsuarioRoles = [new UsuarioRol { IdRolNavigation = unknownRole }];
        var unloaded = User("no_cargado");
        unloaded.UsuarioRoles = [new UsuarioRol { IdRol = 1 }];
        foreach (var user in new[] { inactive, unknown, unloaded, User("sin_roles") })
        {
            var capabilities = CapacidadesUsuario.Calcular(user);
            Assert.Empty(capabilities.Roles);
            Assert.Empty(capabilities.Permisos);
            Assert.False(capabilities.PuedeLeerComercial);
            Assert.False(capabilities.PuedeGestionarPropias);
            Assert.False(capabilities.PuedeGestionarTodas);
            Assert.False(capabilities.PuedeReabrir);
            Assert.False(capabilities.PuedeAdministrarUsuarios);
            Assert.False(capabilities.PuedeAdministrarConfiguracion);
            Assert.False(capabilities.FunnelSoloPropio);
        }
    }

    [Fact]
    public async Task SeedsExactlyThreeFixedProfilesWithTheirPermissionMatrixAndNoUsers()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await ApplyRolesAsync(connection);
        Assert.Equal(new[] { "ADMINISTRADOR", "RESPONSABLE_COMERCIAL", "VENDEDOR" },
            await ScalarAsync<string[]>(connection, "SELECT array_agg(nombre ORDER BY nombre) FROM rol"));
        Assert.Equal(7L, await ScalarAsync<long>(connection, "SELECT count(*) FROM permiso"));
        Assert.Equal(16L, await ScalarAsync<long>(connection, "SELECT count(*) FROM permiso_rol"));
        Assert.Equal(0L, await ScalarAsync<long>(connection, "SELECT (SELECT count(*) FROM usuario)+(SELECT count(*) FROM usuario_rol)"));
        await using var db = Context(connection);
        var roles = await db.Roles.Include(role => role.PermisoRoles)
            .ThenInclude(join => join.IdPermisoNavigation).OrderBy(role => role.Nombre).ToListAsync();
        var common = new[] { "ConsultarComercial", "GestionarActividad", "GestionarClientes", "GestionarOportunidad" };
        Assert.Equal(common.Concat(["AdministrarUsuarios", "AdministrarConfiguracion", "ReabrirOportunidad"]).Order(),
            roles[0].PermisoRoles.Select(join => join.IdPermisoNavigation.Codigo).Order());
        Assert.Equal(common.Append("ReabrirOportunidad").Order(),
            roles[1].PermisoRoles.Select(join => join.IdPermisoNavigation.Codigo).Order());
        Assert.Equal(common, roles[2].PermisoRoles.Select(join => join.IdPermisoNavigation.Codigo).Order());
        Assert.All(roles, role => Assert.False(string.IsNullOrWhiteSpace(role.Descripcion)));
    }

    [Theory]
    [InlineData("INSERT INTO rol(nombre) VALUES ('AJENO')")]
    [InlineData("INSERT INTO permiso(codigo) VALUES ('Ajeno')")]
    [InlineData("INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Cuenta','Previa','previa@example.invalid','previa','hash-ficticio')")]
    public async Task SeedRejectsPreexistingIdentityDataWithoutCorrectiveWrites(string preexisting)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await ExecuteAsync(connection, preexisting);
        var error = await Assert.ThrowsAsync<PostgresException>(() => ApplyRolesAsync(connection));
        Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
        Assert.Equal(1L, await ScalarAsync<long>(connection,
            "SELECT (SELECT count(*) FROM usuario)+(SELECT count(*) FROM rol)+(SELECT count(*) FROM permiso)"));
        Assert.Equal(0L, await ScalarAsync<long>(connection,
            "SELECT (SELECT count(*) FROM usuario_rol)+(SELECT count(*) FROM permiso_rol)"));
    }

    [Fact]
    public async Task SeedRequiresExplicitMatchingTargetAndPreparedIdentitySchema()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        foreach (var target in new string?[] { null, "otra_base_ficticia" })
        {
            await using var transaction = await connection.BeginTransactionAsync();
            if (target is not null)
            {
                await using var command = new NpgsqlCommand("SELECT set_config('fluency.target_database',@target,true)", connection, transaction);
                command.Parameters.AddWithValue("target", target);
                await command.ExecuteNonQueryAsync();
            }
            Assert.Equal(PostgresErrorCodes.RaiseException, (await Assert.ThrowsAsync<PostgresException>(() =>
                ExecuteAsync(connection, Script("roles"), transaction))).SqlState);
            await transaction.RollbackAsync();
        }
        Assert.Equal(0L, await ScalarAsync<long>(connection, "SELECT count(*) FROM rol"));
        await using var unprepared = new CommercialSchemaFixture();
        await unprepared.InitializeAsync(commercial: false);
        await using var unpreparedConnection = await unprepared.OpenAsync();
        Assert.Equal(PostgresErrorCodes.RaiseException,
            (await Assert.ThrowsAsync<PostgresException>(() => ApplyRolesAsync(unpreparedConnection))).SqlState);
        Assert.Equal(1L, await ScalarAsync<long>(unpreparedConnection,
            "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()"));
    }

    [Fact]
    public async Task SeedReexecutionRejectsAndPreservesFixedProfilesAndExistingAccount()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await ApplyRolesAsync(connection);
        await using var db = Context(connection);
        db.Usuarios.Add(User("cuenta_conservada"));
        await db.SaveChangesAsync();
        Assert.Equal(PostgresErrorCodes.RaiseException,
            (await Assert.ThrowsAsync<PostgresException>(() => ApplyRolesAsync(connection))).SqlState);
        Assert.Equal(3L, await ScalarAsync<long>(connection, "SELECT count(*) FROM rol"));
        Assert.Equal(7L, await ScalarAsync<long>(connection, "SELECT count(*) FROM permiso"));
        Assert.Equal(16L, await ScalarAsync<long>(connection, "SELECT count(*) FROM permiso_rol"));
        Assert.Equal("cuenta_conservada", await ScalarAsync<string>(connection, "SELECT username FROM usuario"));
        Assert.Equal(0L, await ScalarAsync<long>(connection, "SELECT count(*) FROM usuario_rol"));
    }

    [Fact]
    public void IdentityMetadataMatchesSqlAndDoesNotInventSimpleNormalizedIndexes()
    {
        using var db = new FluencyLocalDbContext(new DbContextOptionsBuilder<FluencyLocalDbContext>()
            .UseNpgsql().Options);
        var usuario = db.Model.FindEntityType(typeof(Usuario))!;
        Assert.Equal(typeof(bool), usuario.FindProperty(nameof(Usuario.Activo))!.ClrType);
        Assert.False(usuario.FindProperty(nameof(Usuario.Activo))!.IsNullable);
        Assert.Equal(150, usuario.FindProperty(nameof(Usuario.PasswordHash))!.GetMaxLength());
        Assert.DoesNotContain(usuario.GetIndexes(), index => index.Properties.Any(property =>
            property.Name is nameof(Usuario.Correo) or nameof(Usuario.Username)));
        var rol = db.Model.FindEntityType(typeof(Rol))!;
        Assert.Equal(100, rol.FindProperty(nameof(Rol.Nombre))!.GetMaxLength());
        Assert.Equal("text", rol.FindProperty(nameof(Rol.Descripcion))!.GetColumnType());
        Assert.True(rol.FindProperty(nameof(Rol.Descripcion))!.IsNullable);
        var permiso = db.Model.FindEntityType(typeof(Permiso))!;
        Assert.Equal(100, permiso.FindProperty("Codigo")!.GetMaxLength());
        Assert.False(permiso.FindProperty("Codigo")!.IsNullable);
        Assert.Equal("text", permiso.FindProperty(nameof(Permiso.Descripcion))!.GetColumnType());
        Assert.True(permiso.FindProperty(nameof(Permiso.Descripcion))!.IsNullable);
        foreach (var type in new[] { typeof(UsuarioRol), typeof(PermisoRol) })
            Assert.All(db.Model.FindEntityType(type)!.GetForeignKeys(), key =>
                Assert.Equal(DeleteBehavior.Restrict, key.DeleteBehavior));
    }

    [Fact]
    public async Task EfPersistsActiveDefaultAndExplicitFalseAndUpdatesWithoutReactivation()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await using var db = Context(connection);
        var activo = User("activo");
        var inactivo = User("inactivo");
        inactivo.Activo = false;
        db.Usuarios.AddRange(activo, inactivo);
        await db.SaveChangesAsync();
        Assert.True(activo.Id > 0 && inactivo.Id > activo.Id);
        db.ChangeTracker.Clear();
        var stored = await db.Usuarios.OrderBy(usuario => usuario.Id).ToListAsync();
        Assert.True(stored[0].Activo == true);
        Assert.True(stored[1].Activo == false);
        stored[1].Nombre = "Nombre corregido";
        await db.SaveChangesAsync();
        Assert.False(await ScalarAsync<bool>(connection, "SELECT activo FROM usuario WHERE username='inactivo'"));
        stored[0].Activo = false;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        Assert.All(await db.Usuarios.ToListAsync(), usuario => Assert.True(usuario.Activo == false));
    }

    [Fact]
    public async Task EfManyToManyReadsPermissionCodesAndDatabaseKeepsNormalizedUniqueness()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await ExecuteAsync(connection, """
            INSERT INTO rol(nombre) VALUES ('ROL_PRUEBA_UNO'),('ROL_PRUEBA_DOS');
            INSERT INTO permiso(codigo,descripcion) VALUES ('PermisoPrueba',NULL);
            INSERT INTO permiso_rol SELECT r.id,p.id FROM rol r CROSS JOIN permiso p;
            """);
        await using var db = Context(connection);
        var user = User("prueba");
        db.Usuarios.Add(user);
        foreach (var role in await db.Roles.ToListAsync())
            user.UsuarioRoles.Add(new UsuarioRol { IdRolNavigation = role });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var loaded = await db.Usuarios.Include(usuario => usuario.UsuarioRoles)
            .ThenInclude(join => join.IdRolNavigation).ThenInclude(role => role.PermisoRoles)
            .ThenInclude(join => join.IdPermisoNavigation).SingleAsync();
        Assert.Equal(2, loaded.UsuarioRoles.Count);
        Assert.All(loaded.UsuarioRoles, join => Assert.Null(join.IdRolNavigation.Descripcion));
        Assert.Equal(new[] { "PermisoPrueba" }, await db.Permisos
            .Select(permiso => EF.Property<string>(permiso, "Codigo")).ToArrayAsync());
        foreach (var duplicate in new[]
        {
            User("  PRUEBA  ", "otra@example.invalid"),
            User("otra", "  PRUEBA@EXAMPLE.INVALID  ")
        })
        {
            db.Usuarios.Add(duplicate);
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
            db.ChangeTracker.Clear();
        }
        await using var delete = new NpgsqlCommand("DELETE FROM rol", connection);
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation,
            (await Assert.ThrowsAsync<PostgresException>(() => delete.ExecuteNonQueryAsync())).SqlState);
    }

    private static FluencyLocalDbContext Context(NpgsqlConnection connection) =>
        new(new DbContextOptionsBuilder<FluencyLocalDbContext>().UseNpgsql(connection).Options);

    private static async Task ApplyRolesAsync(NpgsqlConnection connection)
    {
        await using var transaction = await connection.BeginTransactionAsync();
        await SetTargetAsync(connection, transaction);
        await ExecuteAsync(connection, Script("roles"), transaction);
        await transaction.CommitAsync();
    }

    private static Usuario User(string username, string? email = null) => new()
    {
        Nombre = "Usuario",
        Apellido = "Ficticio",
        Username = username,
        Correo = email ?? username + "@example.invalid",
        PasswordHash = "hash-ficticio"
    };
}
