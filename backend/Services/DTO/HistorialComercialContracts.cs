namespace Services.DTO;

/// <summary>
/// Entrada del historial comercial combinado. <c>Tipo</c> discrimina el contenido: ACTIVIDAD (tipo de actividad, descripción, resultado,
/// fecha de registro) o TRANSICION (etapa anterior y nueva, observación). No es una tabla: se proyecta desde los registros existentes.
/// </summary>
public sealed record HistorialComercialItem
{
    public required string Tipo { get; init; }
    /// <summary>ID del registro de origen: la actividad o la entrada de historial de etapas.</summary>
    public required int IdOrigen { get; init; }
    /// <summary>Cuándo ocurrió el hecho (actividad) o la transición.</summary>
    public required DateTime FechaHora { get; init; }
    public required int IdUsuario { get; init; }
    public required string UsuarioNombre { get; init; }
    public int? IdOportunidad { get; init; }
    public string? OportunidadTitulo { get; init; }
    public int? IdEmpresa { get; init; }
    public int? IdContacto { get; init; }
    // ACTIVIDAD
    public DateTime? FechaRegistro { get; init; }
    public string? TipoActividad { get; init; }
    public string? Descripcion { get; init; }
    public string? Resultado { get; init; }
    // TRANSICION
    public string? EtapaAnterior { get; init; }
    public string? EtapaNueva { get; init; }
    public string? Observacion { get; init; }
}
