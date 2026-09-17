using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Usuario
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Apellido { get; set; } = null!;

    public string Correo { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public bool? Activo { get; set; }

    public virtual ICollection<HistorialEtapa> HistorialEtapas { get; set; } = new List<HistorialEtapa>();

    public virtual ICollection<Oportunidad> Oportunidads { get; set; } = new List<Oportunidad>();

    public virtual ICollection<UsuarioRol> UsuarioRols { get; set; } = new List<UsuarioRol>();
}
