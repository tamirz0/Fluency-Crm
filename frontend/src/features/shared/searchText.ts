export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim()
}

export function matchesSearch(fields: Array<string | null | undefined>, query: string): boolean {
  const needle = normalizeSearchText(query)
  return !needle || normalizeSearchText(fields.filter(Boolean).join(' ')).includes(needle)
}
