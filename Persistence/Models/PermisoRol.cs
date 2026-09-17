using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class PermisoRol
{
    public int IdRol { get; set; }

    public int IdPermiso { get; set; }

    public virtual Permiso IdPermisoNavigation { get; set; } = null!;

    public virtual Rol IdRolNavigation { get; set; } = null!;
}
