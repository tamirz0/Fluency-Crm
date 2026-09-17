using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Actividad
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;

    public virtual ICollection<ActividadOportunidad> ActividadOportunidades { get; set; } = new List<ActividadOportunidad>();
}
