namespace Persistence.Models;

public partial class Embudo
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
    // Admisión de servicios: tipos admitidos y, para un tipo, una selección puntual de sus servicios (ver EmbudoAdmision).
    public virtual ICollection<TipoServicio> TiposServicio { get; set; } = new List<TipoServicio>();
    public virtual ICollection<Servicio> Servicios { get; set; } = new List<Servicio>();
    public virtual ICollection<EtapaComercial> Etapas { get; set; } = new List<EtapaComercial>();
}
