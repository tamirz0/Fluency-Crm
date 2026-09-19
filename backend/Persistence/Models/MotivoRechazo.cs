using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class MotivoRechazo
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;
}
