namespace Persistence.Models;

public partial class Embudo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public int IdServicio { get; set; }
    public bool Activo { get; set; } = true;
    public virtual Servicio IdServicioNavigation { get; set; } = null!;
    public virtual ICollection<EtapaComercial> Etapas { get; set; } = new List<EtapaComercial>();
}
