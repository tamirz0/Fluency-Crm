import { describe, expect, it } from 'vitest'
import { sortByStatus } from './sortByStatus'

describe('sortByStatus', () => {
  it('ordena por estado en español, mantiene el orden de empates y deja vacíos al final', () => {
    const records = [
      { id: 1, estadoDescripcion: 'Inactivo' },
      { id: 2, estadoDescripcion: null },
      { id: 3, estadoDescripcion: 'Activo' },
      { id: 4, estadoDescripcion: 'activo' },
      { id: 5, estadoDescripcion: '  ' },
    ]

    expect(sortByStatus(records).map(({ id }) => id)).toEqual([3, 4, 1, 2, 5])
  })
})
