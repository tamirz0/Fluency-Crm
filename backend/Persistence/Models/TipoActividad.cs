namespace Persistence.Models;

public partial class TipoActividad
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public virtual ICollection<Actividad> Actividades { get; set; } = new List<Actividad>();
}
