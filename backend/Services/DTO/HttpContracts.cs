using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Parámetros comunes de listados; los filtros y el orden pertenecen a cada recurso.</summary>
public sealed record PageQuery
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 25;
}

/// <summary>Página de resultados, contados después de aplicar los filtros.</summary>
public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

/// <summary>
/// Base para DTO PATCH explícitos. Cada setter init registra su nombre en ProvidedFields,
/// siguiendo el patrón existente: omisión conserva y null solo limpia campos opcionales.
/// Los DTO concretos validan campos obligatorios y conservan la validación base.
/// </summary>
public abstract record PatchRequest : IValidatableObject
{
    protected HashSet<string> ProvidedFields { get; } = [];

    public bool HasField(string propertyName) => ProvidedFields.Contains(propertyName);

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ProvidedFields.Count == 0)
            yield return new ValidationResult("Debe enviar al menos un campo modificable.");
    }
}
