using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class EtapaComercial
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Descripcion { get; set; }

    public int Orden { get; set; }

    public virtual ICollection<HistorialEtapa> HistorialEtapaIdEtapaAnteriorNavigations { get; set; } = new List<HistorialEtapa>();

    public virtual ICollection<HistorialEtapa> HistorialEtapaIdNuevaEtapaNavigations { get; set; } = new List<HistorialEtapa>();

    public virtual ICollection<Oportunidad> Oportunidades { get; set; } = new List<Oportunidad>();
}
