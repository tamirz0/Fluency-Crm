namespace Services.DTO;

/// <summary>
/// Cifras globales del inicio. Alumnos: contactos vigentes en estado Cliente. Abiertas: oportunidades vigentes en etapa ABIERTA.
/// Cerradas este mes: vigentes hoy GANADA o PERDIDA con fecha de cierre en el mes calendario actual de Buenos Aires.
/// </summary>
public sealed record InicioResumenResponse(int Alumnos, int OportunidadesAbiertas, int CerradasEsteMes);
