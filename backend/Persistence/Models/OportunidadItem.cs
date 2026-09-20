using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class OportunidadItem
{
    public int Id { get; set; }

    public int? IdOportunidad { get; set; }

    public int? IdServicio { get; set; }

    public int? Cantidad { get; set; }

    public decimal? PrecioUnitario { get; set; }

    public decimal? Descuento { get; set; }

    public virtual Oportunidad? IdOportunidadNavigation { get; set; }

    public virtual Servicio? IdServicioNavigation { get; set; }
}
