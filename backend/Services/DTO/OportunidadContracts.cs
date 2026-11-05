using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Operaciones que el actor puede intentar; la API vuelve a comprobarlas al ejecutar.</summary>
public sealed record AccionesOportunidad(bool Editar, bool Reasignar, bool Mover, bool Cerrar, bool Reabrir, bool DarDeBaja, bool GestionarActividades);

/// <summary>Oportunidad con referencias etiquetadas; embudo, servicio y estado se derivan de la etapa.</summary>
public sealed record OportunidadResponse
{
    public required int Id { get; init; }
    /// <summary>Título propio, si se informó.</summary>
    public string? Titulo { get; init; }
    /// <summary>Lo que se muestra: el título propio o, si falta, el nombre de la empresa y/o el contacto.</summary>
    public required string TituloVisible { get; init; }
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

/// <summary>Filtros del listado; se combinan con AND, así que los incompatibles dan un conjunto vacío.</summary>
public sealed record OportunidadFilters(string? Q, int? IdResponsable, int? IdEmpresa, int? IdContacto, int? IdEmbudo, int? IdEtapa, string? Estado, int? IdOrigen);

/// <summary>Entrada inmutable del historial de etapas; la etapa anterior es null en el alta.</summary>
public sealed record HistorialEtapaResponse(int Id, int? IdEtapaAnterior, string? EtapaAnteriorNombre, int IdNuevaEtapa, string EtapaNuevaNombre,
    DateTime FechaHora, int IdUsuario, string UsuarioNombre, string? Observacion);

/// <summary>Columna del funnel: etapa activa con sus oportunidades vigentes.</summary>
public sealed record FunnelEtapa(int Id, string Nombre, int Orden, string Estado, IReadOnlyList<OportunidadResponse> Oportunidades);

/// <summary>Embudo con sus columnas activas; puede ser un embudo inactivo, que solo se consulta.</summary>
public sealed record FunnelResponse(int IdEmbudo, string Nombre, bool Activo, int IdServicio, string ServicioNombre, bool ServicioActivo, IReadOnlyList<FunnelEtapa> Etapas);

/// <summary>
/// Alta de oportunidad. Requiere embudo (solo contexto, no se persiste) y empresa o contacto; el título es opcional.
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
        if (IdEmbudo <= 0) yield return new("El embudo es obligatorio.", [nameof(IdEmbudo)]);
        if (IdEmpresa is null && IdContacto is null)
            yield return new("Indique una empresa o un contacto.", [nameof(IdEmpresa), nameof(IdContacto)]);
        if (Valor is { } value && (value is < 0 or > 9999999999.99m || decimal.Round(value, 2) != value))
            yield return new("El valor debe ser un importe entre 0 y 9.999.999.999,99 con hasta dos decimales.", [nameof(Valor)]);
    }
}

/// <summary>
/// Edición de datos de una oportunidad abierta. Omitir un campo lo conserva; null solo limpia los opcionales.
/// Responsable, etapa, cierre, baja y derivados no se editan por aquí (propiedades desconocidas: 400).
/// </summary>
public sealed record PatchOportunidadRequest : PatchRequest
{
    [MaxLength(100)] public string? Titulo { get; init { field = value; ProvidedFields.Add(nameof(Titulo)); } }
    [Range(1, int.MaxValue)] public int? IdEmpresa { get; init { field = value; ProvidedFields.Add(nameof(IdEmpresa)); } }
    [Range(1, int.MaxValue)] public int? IdContacto { get; init { field = value; ProvidedFields.Add(nameof(IdContacto)); } }
    [Range(1, int.MaxValue)] public int? IdOrigen { get; init { field = value; ProvidedFields.Add(nameof(IdOrigen)); } }
    public decimal? Valor { get; init { field = value; ProvidedFields.Add(nameof(Valor)); } }
    public DateOnly? FechaEstimadaCierre { get; init { field = value; ProvidedFields.Add(nameof(FechaEstimadaCierre)); } }
    public string? ObjetivoAprendizaje { get; init { field = value; ProvidedFields.Add(nameof(ObjetivoAprendizaje)); } }
    [Range(1, int.MaxValue)] public int? CantidadParticipantes { get; init { field = value; ProvidedFields.Add(nameof(CantidadParticipantes)); } }
    public string? DisponibilidadHoraria { get; init { field = value; ProvidedFields.Add(nameof(DisponibilidadHoraria)); } }
    public string? Observaciones { get; init { field = value; ProvidedFields.Add(nameof(Observaciones)); } }

    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(Valor)) && Valor is not { } value)
            yield return new("El valor no puede quedar vacío.", [nameof(Valor)]);
        else if (Valor is { } amount && (amount is < 0 or > 9999999999.99m || decimal.Round(amount, 2) != amount))
            yield return new("El valor debe ser un importe entre 0 y 9.999.999.999,99 con hasta dos decimales.", [nameof(Valor)]);
        if (HasField(nameof(IdEmpresa)) && HasField(nameof(IdContacto)) && IdEmpresa is null && IdContacto is null)
            yield return new("Indique una empresa o un contacto.", [nameof(IdEmpresa), nameof(IdContacto)]);
    }
}

/// <summary>Error público sin detalles de persistencia.</summary>
public sealed class OportunidadOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
