using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Oportunidad
{
    public int Id { get; set; }

    public string Titulo { get; set; } = null!;

    public int? IdUsuario { get; set; }

    public int? IdEmpresa { get; set; }

    public int? IdContacto { get; set; }

    public int? IdServicio { get; set; }

    public int? IdEtapa { get; set; }

    public DateOnly? FechaEstimadaCierre { get; set; }

    public DateTime? FechaCierre { get; set; }

    public int? IdOrigen { get; set; }

    public int? IdEstado { get; set; }

    public string? Observaciones { get; set; }

    public virtual ICollection<ActividadOportunidad> ActividadOportunidades { get; set; } = new List<ActividadOportunidad>();

    public virtual ICollection<HistorialEtapa> HistorialEtapas { get; set; } = new List<HistorialEtapa>();

    public virtual ICollection<LogOportunidadCambio> LogOportunidadCambios { get; set; } = new List<LogOportunidadCambio>();

    public virtual Contacto? IdContactoNavigation { get; set; }

    public virtual Empresa? IdEmpresaNavigation { get; set; }

    public virtual EstadoCliente? IdEstadoNavigation { get; set; }

    public virtual EtapaComercial? IdEtapaNavigation { get; set; }

    public virtual OrigenComercial? IdOrigenNavigation { get; set; }

    public virtual Servicio? IdServicioNavigation { get; set; }

    public virtual Usuario? IdUsuarioNavigation { get; set; }

    public virtual ICollection<OportunidadItem> OportunidadItems { get; set; } = new List<OportunidadItem>();
}
