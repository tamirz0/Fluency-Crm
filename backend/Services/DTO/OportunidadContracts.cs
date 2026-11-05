using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Operaciones que el actor puede intentar; la API vuelve a comprobarlas al ejecutar.</summary>
public sealed record AccionesOportunidad(bool Editar, bool Reasignar, bool Mover, bool Cerrar, bool Reabrir, bool DarDeBaja, bool GestionarActividades);

/// <summary>Oportunidad con referencias etiquetadas; embudo, servicio y estado se derivan de la etapa.</summary>
public sealed record OportunidadResponse
{
    public required int Id { get; init; }
    public required string Titulo { get; init; }
    public required int IdResponsable { get; init; }
    public required string ResponsableNombre { get; init; }
    public required bool ResponsableActivo { get; init; }
    public int? IdEmpresa { get; init; }
    public string? EmpresaRazonSocial { get; init; }
    public int? IdContacto { get; init; }
    public string? ContactoNombre { get; init; }
    public required int IdEtapa { get; init; }
    public required string EtapaNombre { get; init; }
    public required bool EtapaActiva { get; init; }
    public required string Estado { get; init; }
    public required int IdEmbudo { get; init; }
    public required string EmbudoNombre { get; init; }
    public required bool EmbudoActivo { get; init; }
    public required int IdServicio { get; init; }
    public required string ServicioNombre { get; init; }
    public required bool ServicioActivo { get; init; }
    public int? IdOrigen { get; init; }
    public string? OrigenDescripcion { get; init; }
    public bool? OrigenActivo { get; init; }
    public required decimal Valor { get; init; }
    public required DateTime FechaCreacion { get; init; }
    public DateOnly? FechaEstimadaCierre { get; init; }
    public DateTime? FechaCierre { get; init; }
    public int? IdMotivoPerdida { get; init; }
    public string? MotivoPerdidaDescripcion { get; init; }
    public string? ObjetivoAprendizaje { get; init; }
    public int? CantidadParticipantes { get; init; }
    public string? DisponibilidadHoraria { get; init; }
    public string? Observaciones { get; init; }
    public required bool Activo { get; init; }
    public AccionesOportunidad AccionesPermitidas { get; init; } = new(false, false, false, false, false, false, false);
}

/// <summary>
/// Alta de oportunidad. Requiere título, embudo (solo contexto, no se persiste) y empresa o contacto.
/// Autor, estado y fechas los fija el servidor; propiedades desconocidas se rechazan.
/// </summary>
public sealed record CreateOportunidadRequest : IValidatableObject
{
    [MaxLength(100)] public string? Titulo { get; init; }
    [Range(1, int.MaxValue)] public int IdEmbudo { get; init; }
    [Range(1, int.MaxValue)] public int? IdEmpresa { get; init; }
    [Range(1, int.MaxValue)] public int? IdContacto { get; init; }
    [Range(1, int.MaxValue)] public int? IdEtapa { get; init; }
    [Range(1, int.MaxValue)] public int? IdResponsable { get; init; }
    [Range(1, int.MaxValue)] public int? IdOrigen { get; init; }
    /// <summary>Omitido o null: copia el precio del servicio. Un importe informado, incluido cero, prevalece.</summary>
    public decimal? Valor { get; init; }
    public DateOnly? FechaEstimadaCierre { get; init; }
    public string? ObjetivoAprendizaje { get; init; }
    [Range(1, int.MaxValue)] public int? CantidadParticipantes { get; init; }
    public string? DisponibilidadHoraria { get; init; }
    public string? Observaciones { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (string.IsNullOrWhiteSpace(Titulo)) yield return new("El título es obligatorio.", [nameof(Titulo)]);
        if (IdEmbudo <= 0) yield return new("El embudo es obligatorio.", [nameof(IdEmbudo)]);
        if (IdEmpresa is null && IdContacto is null)
            yield return new("Indique una empresa o un contacto.", [nameof(IdEmpresa), nameof(IdContacto)]);
        if (Valor is { } value && (value is < 0 or > 9999999999.99m || decimal.Round(value, 2) != value))
            yield return new("El valor debe ser un importe entre 0 y 9.999.999.999,99 con hasta dos decimales.", [nameof(Valor)]);
    }
}

/// <summary>Error público sin detalles de persistencia.</summary>
public sealed class OportunidadOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
