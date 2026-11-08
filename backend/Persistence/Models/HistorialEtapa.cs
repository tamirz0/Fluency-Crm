namespace Persistence.Models;

// Inmutable: solo se inserta. La etapa anterior es null en el alta de la oportunidad.
public partial class HistorialEtapa
{
    public int Id { get; set; }

    public int IdOportunidad { get; set; }

    public int? IdEtapaAnterior { get; set; }

    public int IdNuevaEtapa { get; set; }

    public DateTime FechaHora { get; set; }

    public int IdUsuario { get; set; }

    public string? Observacion { get; set; }

    public virtual EtapaComercial? IdEtapaAnteriorNavigation { get; set; }

    public virtual EtapaComercial IdNuevaEtapaNavigation { get; set; } = null!;

    public virtual Oportunidad IdOportunidadNavigation { get; set; } = null!;

    public virtual Usuario IdUsuarioNavigation { get; set; } = null!;
}
