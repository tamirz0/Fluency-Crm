using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Contacto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Apellido { get; set; } = null!;

    public string? Documento { get; set; }

    public string? Cargo { get; set; }

    public string Correo { get; set; } = null!;

    public string? Telefono { get; set; }

    public int? IdEstado { get; set; }

    public int? IdOrigen { get; set; }

    public int IdResponsable { get; set; }
    public DateTime FechaCreacion { get; set; }
    public bool Activo { get; set; } = true;
    public virtual Usuario IdResponsableNavigation { get; set; } = null!;

    public int? IdEmpresa { get; set; }

    public string? Observaciones { get; set; }

    public virtual ICollection<Actividad> Actividades { get; set; } = new List<Actividad>();

    public virtual Empresa? IdEmpresaNavigation { get; set; }

    public virtual EstadoCliente? IdEstadoNavigation { get; set; }

    public virtual OrigenComercial? IdOrigenNavigation { get; set; }

    public virtual ICollection<Oportunidad> Oportunidades { get; set; } = new List<Oportunidad>();
}
