import type { Dayjs } from 'dayjs'

export type CalendarItem = { id: number; date: string; title: string; subtitle: string }

/** Días de la grilla mensual, de lunes a domingo, incluyendo los de relleno del mes anterior y siguiente. */
export function monthGrid(month: Dayjs): Dayjs[] {
  const first = month.startOf('month')
  const start = first.subtract((first.day() + 6) % 7, 'day')
  const end = month.endOf('month')
  const weeks = Math.ceil((end.diff(start, 'day') + 1) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => start.add(i, 'day'))
}

export const monthRange = (month: Dayjs) => ({ desde: month.startOf('month').format('YYYY-MM-DD'), hasta: month.endOf('month').format('YYYY-MM-DD') })
