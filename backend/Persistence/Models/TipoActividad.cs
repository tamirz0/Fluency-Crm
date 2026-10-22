namespace Persistence.Models;

public partial class TipoActividad
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public virtual ICollection<ActividadOportunidad> ActividadOportunidades { get; set; } = new List<ActividadOportunidad>();
}
