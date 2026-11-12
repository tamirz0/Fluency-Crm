using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;

namespace Services.Implementations;

/// <summary>Cifras globales del inicio, coherentes con los listados compartidos de los tres roles.</summary>
public sealed class InicioService(FluencyLocalDbContext db)
{
    // Argentina no tiene horario de verano: UTC-3 fijo evita depender de ids de zona horaria distintos en Windows y Linux.
    private static (DateTime From, DateTime To) CurrentMonth(DateTime utcNow)
    {
        var today = utcNow.AddHours(-3);
        var from = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return (from, from.AddMonths(1));
    }

    public async Task<InicioResumenResponse> ResumenAsync(CancellationToken ct)
    {
        var (from, to) = CurrentMonth(DateTime.UtcNow);
        // Alumno = contacto cuya oportunidad ganada era un servicio con nivel (bonus de academia).
        var students = await db.Alumnos.CountAsync(a => a.Activo && a.IdContactoNavigation.Activo, ct);
        var open = await db.Oportunidades.CountAsync(o => o.Activo && o.IdEtapaNavigation.IdEstadoNavigation.Codigo == "ABIERTA", ct);
        // FechaCierre guarda la fecha de negocio como medianoche UTC: rango [primer día, primer día del mes siguiente).
        var closedThisMonth = db.Oportunidades.Where(o => o.Activo && o.FechaCierre >= from && o.FechaCierre < to
            && (o.IdEtapaNavigation.IdEstadoNavigation.Codigo == "GANADA" || o.IdEtapaNavigation.IdEstadoNavigation.Codigo == "PERDIDA"));
        var closed = await closedThisMonth.CountAsync(ct);
        var wonValue = await closedThisMonth.Where(o => o.IdEtapaNavigation.IdEstadoNavigation.Codigo == "GANADA").SumAsync(o => (decimal?)o.Valor, ct) ?? 0m;
        return new(students, open, closed, wonValue);
    }
}
