using Microsoft.EntityFrameworkCore;
using Npgsql;
using Persistence.Models;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

public sealed class IdentityTests
{
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

    private static Usuario User(string username, string? email = null) => new()
    {
        Nombre = "Usuario",
        Apellido = "Ficticio",
        Username = username,
        Correo = email ?? username + "@example.invalid",
        PasswordHash = "hash-ficticio"
    };
}
