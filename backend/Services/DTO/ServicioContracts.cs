namespace Services.DTO;

/// <summary>Servicio activo disponible para seleccionar al crear o modificar una oportunidad.</summary>
public sealed record ServicioResponse(
    int Id,
    string Nombre,
    string? Descripcion,
    decimal PrecioReferencia);
