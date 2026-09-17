using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class Servicio
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Descripcion { get; set; }

    public decimal PrecioReferencia { get; set; }

    public int? DuracionHoras { get; set; }

    public int? IdNivel { get; set; }

    public int? IdModalidad { get; set; }

    public bool? Activo { get; set; }

    public virtual Modalidad? IdModalidadNavigation { get; set; }

    public virtual NivelIngles? IdNivelNavigation { get; set; }

    public virtual ICollection<OportunidadItem> OportunidadItems { get; set; } = new List<OportunidadItem>();

    public virtual ICollection<Oportunidad> Oportunidades { get; set; } = new List<Oportunidad>();
}
