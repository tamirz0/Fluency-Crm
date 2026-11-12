import { describe, expect, it } from 'vitest'
import { backTarget, contactFullName, contactNaturalName, displayValue, formatCommercialDate, isoToCommercialDate, opportunityContactName } from './display'

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

describe('nombres y destino de "volver"', () => {
  it('ordena el contacto como "Nombre Apellido"', () => {
    expect(contactNaturalName({ nombre: 'Lucía', apellido: 'Pérez' })).toBe('Lucía Pérez')
    expect(contactNaturalName({ nombre: ' Ana ' })).toBe('Ana')
  })

  it('usa el origen de la navegación solo si es válido; si no, el listado', () => {
    const fallback = { to: '/empresas', label: 'Volver a empresas' }
    expect(backTarget({ from: { to: '/oportunidades/9', label: 'Volver a la oportunidad' } }, fallback)).toEqual({ to: '/oportunidades/9', label: 'Volver a la oportunidad' })
    expect(backTarget(null, fallback)).toBe(fallback)
    expect(backTarget({ from: { to: 3, label: 'x' } }, fallback)).toBe(fallback)
  })
})
