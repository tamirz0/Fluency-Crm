type HasStatus = { estadoDescripcion?: string | null }

export function sortByStatus<T extends HasStatus>(records: readonly T[]): T[] {
  return records
    .map((record, index) => ({ record, index, status: record.estadoDescripcion?.trim() ?? '' }))
    .sort((a, b) => {
      if (!a.status && b.status) return 1
      if (a.status && !b.status) return -1
      return a.status.localeCompare(b.status, 'es', { sensitivity: 'base' }) || a.index - b.index
    })
    .map(({ record }) => record)
}
