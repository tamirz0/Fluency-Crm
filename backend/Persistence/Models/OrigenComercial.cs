using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class OrigenComercial
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;

    public virtual ICollection<Contacto> Contactos { get; set; } = new List<Contacto>();

    public virtual ICollection<Empresa> Empresas { get; set; } = new List<Empresa>();

    public virtual ICollection<Oportunidad> Oportunidades { get; set; } = new List<Oportunidad>();
}
