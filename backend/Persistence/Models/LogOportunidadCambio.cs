using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class LogOportunidadCambio
{
    public int Id { get; set; }

    public int? IdOportunidad { get; set; }

    public int? IdUsuario { get; set; }

    public string Campo { get; set; } = null!;

    public string? ValorAnterior { get; set; }

    public string? ValorNuevo { get; set; }

    public DateTime? FechaHora { get; set; }

    public virtual Oportunidad? IdOportunidadNavigation { get; set; }

    public virtual Usuario? IdUsuarioNavigation { get; set; }
}
