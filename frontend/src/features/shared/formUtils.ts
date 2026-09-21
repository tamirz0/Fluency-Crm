import { ApiRequestError } from '../../api/client'

export function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
  return normalized || null
}

export function normalizeId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function buildDifferentialPatch<T extends Record<string, unknown>>(
  initial: T,
  current: T,
  fields: (keyof T)[],
  idFields: (keyof T)[] = [],
): Partial<T> {
  const patch: Partial<T> = {}
  fields.forEach((field) => {
    const before = idFields.includes(field) ? normalizeId(initial[field] as string | number | null | undefined) : normalizeOptionalText(initial[field] as string | null | undefined)
    const after = idFields.includes(field) ? normalizeId(current[field] as string | number | null | undefined) : normalizeOptionalText(current[field] as string | null | undefined)
    if (before !== after) patch[field] = after as T[keyof T]
  })
  return patch
}

export function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message
  return 'No pudimos guardar los cambios. Revisá la información e intentá de nuevo.'
}

export function confirmationFor(noun: 'Empresa' | 'Contacto' | 'Oportunidad', action: 'creada' | 'creado' | 'actualizada' | 'actualizado'): string {
  return `${noun} ${action}`
}
