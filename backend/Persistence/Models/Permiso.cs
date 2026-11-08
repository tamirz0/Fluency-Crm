using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Permiso
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string? Descripcion { get; set; }

    public virtual ICollection<PermisoRol> PermisoRoles { get; set; } = new List<PermisoRol>();
}
