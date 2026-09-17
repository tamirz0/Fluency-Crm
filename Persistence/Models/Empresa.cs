using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Empresa
{
    public int Id { get; set; }

    public string RazonSocial { get; set; } = null!;

    public string? Cuit { get; set; }

    public string? Industria { get; set; }

    public string? Correo { get; set; }

    public string? Telefono { get; set; }

    public string? Direccion { get; set; }

    public int? IdEstado { get; set; }

    public int? IdOrigen { get; set; }

    public string? Observaciones { get; set; }

    public virtual ICollection<ActividadOportunidad> ActividadOportunidades { get; set; } = new List<ActividadOportunidad>();

    public virtual ICollection<Contacto> Contactos { get; set; } = new List<Contacto>();

    public virtual EstadoCliente? IdEstadoNavigation { get; set; }

    public virtual OrigenComercial? IdOrigenNavigation { get; set; }

    public virtual ICollection<Oportunidad> Oportunidades { get; set; } = new List<Oportunidad>();
}
