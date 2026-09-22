export function parsePositiveId(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : undefined
}

export function displayValue(value: string | null | undefined): string {
  return value?.trim() || 'Sin informar'
}

export function contactFullName(contact: { nombre?: string | null; apellido?: string | null }): string {
  return [contact.apellido?.trim(), contact.nombre?.trim()].filter(Boolean).join(', ') || 'Sin informar'
}

export function opportunityContactName(contact: { contactoApellido?: string | null; contactoNombre?: string | null }): string {
  return [contact.contactoApellido?.trim(), contact.contactoNombre?.trim()].filter(Boolean).join(', ') || 'Sin informar'
}

export function formatCommercialDate(value: string | null | undefined): string {
  if (!value?.trim()) return 'Sin informar'
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!dateOnly) return 'Sin informar'
  return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
}

export function isoToCommercialDate(value: string | null | undefined): string { return formatCommercialDate(value) === 'Sin informar' ? '' : formatCommercialDate(value) }

export function commercialDateToIso(value: string): { value?: string; error?: 'format' | 'invalid' } {
  if (!value.trim()) return {}
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return { error: 'format' }
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return { error: 'invalid' }
  return { value: `${year}-${month}-${day}` }
}
