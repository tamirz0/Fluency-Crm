namespace Persistence.Models;

// Hecho ya realizado (no agenda). El autor y la fecha de registro los fija el servidor y no se editan.
public partial class Actividad
{
    public int Id { get; set; }

    public int IdTipo { get; set; }

    public int IdUsuario { get; set; }

    public int? IdEmpresa { get; set; }

    public int? IdContacto { get; set; }

    public int? IdOportunidad { get; set; }

    /// <summary>Instante en que ocurrió la interacción.</summary>
    public DateTime FechaHora { get; set; }

    /// <summary>Instante en que se cargó en el sistema.</summary>
    public DateTime FechaRegistro { get; set; }

    public string Descripcion { get; set; } = null!;

    public string? Resultado { get; set; }

    public bool Activo { get; set; } = true;

    public virtual TipoActividad IdTipoNavigation { get; set; } = null!;

    public virtual Usuario IdUsuarioNavigation { get; set; } = null!;

    public virtual Empresa? IdEmpresaNavigation { get; set; }

    public virtual Contacto? IdContactoNavigation { get; set; }

    public virtual Oportunidad? IdOportunidadNavigation { get; set; }
}
