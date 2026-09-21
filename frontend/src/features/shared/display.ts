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
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin informar'
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
}
