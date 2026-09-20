namespace Services.DTO;

/// <summary>Datos de consulta del catálogo de etapas comerciales.</summary>
public sealed record EtapaComercialResponse(int Id, string Nombre, string? Descripcion, int Orden);
