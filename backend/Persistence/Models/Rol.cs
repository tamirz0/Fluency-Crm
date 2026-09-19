using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Rol
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Descripcion { get; set; }

    public virtual ICollection<PermisoRol> PermisoRoles { get; set; } = new List<PermisoRol>();

    public virtual ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
}
