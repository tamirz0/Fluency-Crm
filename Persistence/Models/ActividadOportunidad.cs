using System;
using System.Collections.Generic;

namespace Persistence.Models;

public partial class ActividadOportunidad
{
    public int Id { get; set; }

    public int? IdTipoActividad { get; set; }

    public int? IdUsuario { get; set; }

    public int? IdEmpresa { get; set; }

    public int? IdContacto { get; set; }

    public int? IdOportunidad { get; set; }

    public DateTime? FechaHora { get; set; }

    public string? Descripcion { get; set; }

    public string? Resultado { get; set; }

    public virtual Actividad? IdTipoActividadNavigation { get; set; }

    public virtual Usuario? IdUsuarioNavigation { get; set; }

    public virtual Empresa? IdEmpresaNavigation { get; set; }

    public virtual Contacto? IdContactoNavigation { get; set; }

    public virtual Oportunidad? IdOportunidadNavigation { get; set; }
}
