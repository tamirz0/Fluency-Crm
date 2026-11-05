namespace Persistence.Models;

// Embudo, servicio y estado no se persisten: se derivan de la etapa actual.
public partial class Oportunidad
{
    public int Id { get; set; }

    // Opcional: sin título se muestra el nombre de la empresa y/o el contacto.
    public string? Titulo { get; set; }

    public int IdResponsable { get; set; }

    public int? IdEmpresa { get; set; }

    public int? IdContacto { get; set; }

    public int IdEtapa { get; set; }

    public int? IdOrigen { get; set; }

    public decimal Valor { get; set; }

    public DateTime FechaCreacion { get; set; }

    public DateOnly? FechaEstimadaCierre { get; set; }

    public DateTime? FechaCierre { get; set; }

    public int? IdMotivoPerdida { get; set; }

    public string? ObjetivoAprendizaje { get; set; }

    public int? CantidadParticipantes { get; set; }

    public string? DisponibilidadHoraria { get; set; }

    public string? Observaciones { get; set; }

    public bool Activo { get; set; } = true;

    public virtual Usuario IdResponsableNavigation { get; set; } = null!;

    public virtual Empresa? IdEmpresaNavigation { get; set; }

    public virtual Contacto? IdContactoNavigation { get; set; }

    public virtual EtapaComercial IdEtapaNavigation { get; set; } = null!;

    public virtual OrigenComercial? IdOrigenNavigation { get; set; }

    public virtual MotivoPerdida? IdMotivoPerdidaNavigation { get; set; }

    public virtual ICollection<HistorialEtapa> HistorialEtapas { get; set; } = new List<HistorialEtapa>();

    public virtual ICollection<Actividad> Actividades { get; set; } = new List<Actividad>();
}
