namespace Persistence.Models;

// Tipo de servicio (Clases, Talleres y los que agregue el administrador). El código solo existe en los
// tipos base y fija sus reglas: CLASES exige nivel y crea alumnos al ganarse; TALLERES alimenta el módulo de talleres.
public partial class TipoServicio
{
    public const string CodigoClases = "CLASES";
    public const string CodigoTalleres = "TALLERES";

    public int Id { get; set; }
    public string Descripcion { get; set; } = null!;
    public string? Codigo { get; set; }
    public bool Activo { get; set; } = true;
    public virtual ICollection<Servicio> Servicios { get; set; } = new List<Servicio>();
}
