using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Permiso
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;

    public virtual ICollection<PermisoRol> PermisoRols { get; set; } = new List<PermisoRol>();
}
