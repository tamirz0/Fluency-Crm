namespace Persistence.Models;

public partial class MotivoPerdida
{
    public int Id { get; set; }
    public string Descripcion { get; set; } = null!;
    public bool Activo { get; set; } = true;
}
