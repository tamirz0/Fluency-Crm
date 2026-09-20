using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class HistorialEtapa
{
    public int Id { get; set; }

    public int? IdOportunidad { get; set; }

    public int? IdEtapaAnterior { get; set; }

    public int? IdNuevaEtapa { get; set; }

    public DateTime? Fecha { get; set; }

    public int? IdUsuario { get; set; }

    public string? Observacion { get; set; }

    public virtual EtapaComercial? IdEtapaAnteriorNavigation { get; set; }

    public virtual EtapaComercial? IdNuevaEtapaNavigation { get; set; }

    public virtual Oportunidad? IdOportunidadNavigation { get; set; }

    public virtual Usuario? IdUsuarioNavigation { get; set; }
}
