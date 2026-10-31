using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class EmpresaService(FluencyLocalDbContext db, ActorActual actor) : IEmpresaService
{
    private static EmpresaOperationException Missing() => new(404, "NOT_FOUND", "No existe la empresa.");
    private IQueryable<EmpresaResponse> Query(IQueryable<Empresa>? source = null) => (source ?? db.Empresas).AsNoTracking().Where(e => e.Activo).Select(e => new EmpresaResponse
    {
        Id = e.Id, RazonSocial = e.RazonSocial, Cuit = e.Cuit, Industria = e.Industria, Correo = e.Correo,
        Telefono = e.Telefono, Direccion = e.Direccion, Observaciones = e.Observaciones,
        IdEstado = e.IdEstado!.Value, EstadoDescripcion = e.IdEstadoNavigation!.Descripcion, EstadoActivo = e.IdEstadoNavigation.Activo,
        IdOrigen = e.IdOrigen, OrigenDescripcion = e.IdOrigenNavigation == null ? null : e.IdOrigenNavigation.Descripcion,
        OrigenActivo = e.IdOrigenNavigation == null ? null : e.IdOrigenNavigation.Activo,
        IdResponsable = e.IdResponsable, ResponsableNombre = e.IdResponsableNavigation.Nombre + " " + e.IdResponsableNavigation.Apellido,
        ResponsableActivo = e.IdResponsableNavigation.Activo, FechaCreacion = e.FechaCreacion, Activo = e.Activo
    });

    public async Task<PageResponse<EmpresaResponse>> ListAsync(string? q, int? idEstado, int? idOrigen, int? idResponsable, int page, int pageSize, CancellationToken ct)
    {
        var source = db.Empresas.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            const string accents = "áàäâãåéèëêíìïîóòöôõúùüûñç";
            const string plain =   "aaaaaaeeeeiiiiooooouuuunc";
            var search = q.Trim().ToLowerInvariant();
            for (var i = 0; i < accents.Length; i++) search = search.Replace(accents[i], plain[i]);
            source = db.Empresas.FromSqlInterpolated($"""
                SELECT * FROM empresa
                WHERE strpos(translate(lower(razon_social), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(cuit), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(correo), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(telefono), {accents}, {plain}), {search}) > 0
                """).AsNoTracking();
        }
        var query = Query(source);
        if (idEstado is not null) query = query.Where(e => e.IdEstado == idEstado);
        if (idOrigen is not null) query = query.Where(e => e.IdOrigen == idOrigen);
        if (idResponsable is not null) query = query.Where(e => e.IdResponsable == idResponsable);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(e => e.RazonSocial).ThenBy(e => e.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    public async Task<EmpresaResponse> GetAsync(int id, CancellationToken ct)
        => await Query().SingleOrDefaultAsync(e => e.Id == id, ct) ?? throw Missing();

    public async Task<EmpresaResponse> WriteAsync(int? id, EmpresaRequest request, CancellationToken ct)
    {
        if (id is null && !request.HasField(nameof(request.RazonSocial)))
            throw new EmpresaOperationException(400, "VALIDATION_FAILED", "La razón social es obligatoria.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new EmpresaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var company = id is null ? new Empresa() : await db.Empresas.SingleOrDefaultAsync(e => e.Id == id && e.Activo, ct) ?? throw Missing();
        var state = request.HasField(nameof(request.IdEstado)) ? request.IdEstado : id is null
            ? await db.EstadoClientes.Where(e => e.Activo && e.Descripcion.ToLower() == "potencial").Select(e => (int?)e.Id).SingleOrDefaultAsync(ct)
            : company.IdEstado;
        if (state is null) throw new EmpresaOperationException(400, "REFERENCE_UNAVAILABLE", "El estado Potencial no está disponible. Seleccione un estado activo.");
        var responsible = request.HasField(nameof(request.IdResponsable)) ? request.IdResponsable!.Value : id is null ? actor.Id : company.IdResponsable;
        if ((id is null || state != company.IdEstado) && !await db.EstadoClientes.AnyAsync(e => e.Id == state && e.Activo, ct))
            throw new EmpresaOperationException(400, "REFERENCE_UNAVAILABLE", "El estado no está disponible.");
        if ((id is null || responsible != company.IdResponsable) && !await db.Usuarios.AnyAsync(u => u.Id == responsible && u.Activo, ct))
            throw new EmpresaOperationException(400, "REFERENCE_UNAVAILABLE", "El responsable no está disponible.");
        if (request.HasField(nameof(request.IdOrigen)) && request.IdOrigen is not null && (id is null || request.IdOrigen != company.IdOrigen)
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == request.IdOrigen && o.Activo, ct))
            throw new EmpresaOperationException(400, "REFERENCE_UNAVAILABLE", "El origen no está disponible.");
        company.IdEstado = state; company.IdResponsable = responsible;
        if (request.HasField(nameof(request.RazonSocial))) company.RazonSocial = request.RazonSocial!.Trim();
        if (request.HasField(nameof(request.Cuit))) company.Cuit = Text(request.Cuit);
        if (request.HasField(nameof(request.Industria))) company.Industria = Text(request.Industria);
        if (request.HasField(nameof(request.Correo))) company.Correo = Text(request.Correo);
        if (request.HasField(nameof(request.Telefono))) company.Telefono = Text(request.Telefono);
        if (request.HasField(nameof(request.Direccion))) company.Direccion = Text(request.Direccion);
        if (request.HasField(nameof(request.Observaciones))) company.Observaciones = Text(request.Observaciones);
        if (request.HasField(nameof(request.IdOrigen))) company.IdOrigen = request.IdOrigen;
        if (id is null) db.Empresas.Add(company);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(company.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
    private static string? Text(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
