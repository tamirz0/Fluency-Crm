using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class EstadoOportunidad
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Descripcion { get; set; } = null!;
}
