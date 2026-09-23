import { describe, expect, it } from 'vitest'
import { contactFullName, displayValue, formatCommercialDate, isoToCommercialDate, opportunityContactName } from './display'

describe('presentación de valores opcionales', () => {
  it('usa un guion para valores vacíos en fichas y campos compartidos', () => {
    expect(displayValue(null)).toBe('-')
    expect(displayValue('   ')).toBe('-')
    expect(contactFullName({})).toBe('-')
    expect(opportunityContactName({})).toBe('-')
    expect(formatCommercialDate(undefined)).toBe('-')
    expect(formatCommercialDate('fecha inválida')).toBe('-')
  })

  it('mantiene vacía la fecha de edición cuando la API no tiene una fecha válida', () => {
    expect(isoToCommercialDate(null)).toBe('')
    expect(isoToCommercialDate('fecha inválida')).toBe('')
    expect(isoToCommercialDate('2026-09-22')).toBe('22/09/2026')
  })
})
