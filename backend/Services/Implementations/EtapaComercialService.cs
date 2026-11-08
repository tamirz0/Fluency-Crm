using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class EtapaComercialService(FluencyLocalDbContext db, EmbudoService funnels) : IEtapaComercialService
{
    private static ConfiguracionOperationException Invalid(string message) => new(400, "VALIDATION_FAILED", message);
    private static IQueryable<EtapaComercialResponse> Project(IQueryable<EtapaComercial> query) => query.Select(e =>
        new EtapaComercialResponse(e.Id, e.Nombre, e.Descripcion, e.Orden, e.IdEmbudo, e.IdEstadoNavigation.Codigo, e.Activo));
    public async Task<EtapaComercialResponse> GetAsync(int id, CancellationToken ct) =>
        await Project(db.EtapaComerciales.AsNoTracking().Where(e => e.Id == id)).SingleOrDefaultAsync(ct) ?? throw EmbudoService.Missing("la etapa");
    public async Task<IReadOnlyList<EtapaComercialResponse>> ListAsync(int idEmbudo, string activo, CancellationToken ct)
    {
        if (activo != "true") await funnels.RequireAdminAsync(ct);
        if (!await db.Embudos.AnyAsync(e => e.Id == idEmbudo, ct)) throw EmbudoService.Missing("el embudo");
        var query = db.EtapaComerciales.AsNoTracking().Where(e => e.IdEmbudo == idEmbudo);
        query = activo switch { "true" => query.Where(e => e.Activo), "false" => query.Where(e => !e.Activo), "todos" => query, _ => throw Invalid("Estado inválido; use true, false o todos.") };
        return await Project(query.OrderBy(e => e.Orden).ThenBy(e => e.Id)).ToListAsync(ct);
    }
    public async Task<EtapaComercialResponse> WriteAsync(int? id, int? idEmbudo, EtapaComercialRequest? request, bool? activo, CancellationToken ct)
    {
        if (id is null && (request is null || !request.HasField(nameof(request.Nombre)) || !request.HasField(nameof(request.Orden)) || request.HasField(nameof(request.IdEmbudo))))
            throw Invalid("Alta requiere nombre y orden; el embudo proviene de la ruta.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await funnels.RequireAdminAsync(ct);
        var item = id is null ? new EtapaComercial { IdEmbudo = idEmbudo!.Value } :
            await db.EtapaComerciales.Include(e => e.IdEstadoNavigation).SingleOrDefaultAsync(e => e.Id == id, ct) ?? throw EmbudoService.Missing("la etapa");
        var isFinal = id is not null && item.IdEstadoNavigation.Codigo != "ABIERTA";
        if (request is not null)
        {
            if (request.HasField(nameof(request.IdEmbudo)))
            {
                if (isFinal) throw EmbudoService.Conflict("Una etapa final conserva su embudo.");
                if (request.IdEmbudo != item.IdEmbudo)
                {
                    if (await db.Database.SqlQuery<int>($"""
                        SELECT 1 AS "Value" WHERE EXISTS (SELECT 1 FROM oportunidad WHERE id_etapa={id})
                        OR EXISTS (SELECT 1 FROM historial_etapas WHERE id_etapa_anterior={id} OR id_nueva_etapa={id})
                        """).AnyAsync(ct)) throw EmbudoService.Conflict("Una etapa utilizada conserva su embudo.");
                    item.IdEmbudo = request.IdEmbudo!.Value;
                }
            }
            if (request.HasField(nameof(request.Nombre))) item.Nombre = request.Nombre!.Trim();
            if (request.HasField(nameof(request.Descripcion))) item.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
            if (request.HasField(nameof(request.Orden))) item.Orden = request.Orden!.Value;
        }
        if (!await db.Embudos.AnyAsync(e => e.Id == item.IdEmbudo, ct))
            throw id is null ? EmbudoService.Missing("el embudo") : new ConfiguracionOperationException(400, "REFERENCE_UNAVAILABLE", "El embudo no existe.");
        if (activo is not null)
        {
            if (isFinal) throw EmbudoService.Conflict("Las etapas finales son permanentes y activas.");
            if (activo == false && item.Activo && await db.Database.SqlQuery<int>($"""
                SELECT 1 AS "Value" FROM oportunidad WHERE id_etapa={id} AND activo
                """).AnyAsync(ct)) throw EmbudoService.Conflict("La etapa tiene oportunidades abiertas y activas.");
            if (activo == true && !item.Activo)
            {
                var max = await db.EtapaComerciales.Where(e => e.IdEmbudo == item.IdEmbudo && e.Activo).MaxAsync(e => (int?)e.Orden, ct);
                if (max == int.MaxValue) throw EmbudoService.Conflict("No hay una posición disponible al final. Reordene las etapas activas.");
                item.Orden = max is null ? 1 : max.Value + 1;
            }
            item.Activo = activo.Value;
        }
        if (id is null)
        {
            item.IdEstado = await db.EstadoOportunidades.Where(s => s.Codigo == "ABIERTA").Select(s => s.Id).SingleAsync(ct);
            db.EtapaComerciales.Add(item);
        }
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(item.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
    public async Task<IReadOnlyList<EtapaComercialResponse>> ReorderAsync(int idEmbudo, OrdenEtapasRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await funnels.RequireAdminAsync(ct);
        if (!await db.Embudos.AnyAsync(e => e.Id == idEmbudo, ct)) throw EmbudoService.Missing("el embudo");
        var stages = await db.EtapaComerciales.Where(e => e.IdEmbudo == idEmbudo && e.Activo).ToListAsync(ct);
        if (request.Etapas.Any(e => e is null) || request.Etapas.Count != stages.Count || request.Etapas.Select(e => e.Id).Distinct().Count() != stages.Count ||
            !request.Etapas.Select(e => e.Id).ToHashSet().SetEquals(stages.Select(e => e.Id)))
            throw Invalid("Debe incluir todas las etapas activas del embudo exactamente una vez.");
        if (request.Etapas.Select(e => e.Orden).Distinct().Count() != stages.Count)
            throw new ConfiguracionOperationException(409, "DUPLICATE_VALUE", "Las posiciones activas no pueden repetirse.");
        var positions = request.Etapas.ToDictionary(e => e.Id, e => e.Orden);
        // The partial unique index is immediate: park in unused positions without changing activo.
        var occupied = stages.Select(e => e.Orden).Concat(positions.Values).ToHashSet();
        long temporary = int.MinValue;
        foreach (var stage in stages)
        {
            while (occupied.Contains((int)temporary)) temporary++;
            stage.Orden = (int)temporary++;
        }
        await db.SaveChangesAsync(ct);
        foreach (var stage in stages) stage.Orden = positions[stage.Id];
        await db.SaveChangesAsync(ct);
        var result = await Project(db.EtapaComerciales.AsNoTracking().Where(e => e.IdEmbudo == idEmbudo && e.Activo).OrderBy(e => e.Orden).ThenBy(e => e.Id)).ToListAsync(ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
