import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Box, Button, IconButton, Typography } from '@mui/material'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import { monthGrid, type CalendarItem } from './calendar'

const weekdays = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** Navegación mensual compartida por Clases y Talleres. */
export function MonthNavigation({ month, onChange }: { month: Dayjs; onChange: (month: Dayjs) => void }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <IconButton aria-label="Mes anterior" onClick={() => onChange(month.subtract(1, 'month'))}><ChevronLeft /></IconButton>
    <Typography component="h2" variant="h6" aria-live="polite" sx={{ minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>{month.locale('es').format('MMMM YYYY')}</Typography>
    <IconButton aria-label="Mes siguiente" onClick={() => onChange(month.add(1, 'month'))}><ChevronRight /></IconButton>
    <Button size="small" onClick={() => onChange(dayjs())}>Hoy</Button>
  </Box>
}

/**
 * Calendario mensual. Cada casilla muestra los elementos del día (título y, debajo, el horario);
 * hacer clic en el día pide crear uno nuevo y hacerlo en un elemento lo abre.
 */
export function MonthCalendar({ month, items, onDayClick, onItemClick, dayLabel, className }: {
  month: Dayjs
  items: CalendarItem[]
  onDayClick?: (date: string) => void
  onItemClick: (id: number) => void
  dayLabel: (date: string) => string
  className?: string
}) {
  const days = monthGrid(month)
  const today = dayjs().format('YYYY-MM-DD')
  return <Box role="grid" aria-label={month.locale('es').format('MMMM YYYY')} className={className} sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
    <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: 'background.paper' }}>
      {weekdays.map(day => <Typography role="columnheader" key={day} sx={{ p: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{day}</Typography>)}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {days.map(day => {
        const date = day.format('YYYY-MM-DD')
        const inMonth = day.month() === month.month()
        const dayItems = items.filter(item => item.date === date)
        return <Box role="gridcell" key={date} data-date={date}
          onClick={onDayClick ? () => onDayClick(date) : undefined}
          sx={{ minHeight: { xs: 84, md: 112 }, p: .5, minWidth: 0, borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'divider', bgcolor: inMonth ? 'transparent' : 'rgba(11,17,24,.45)', cursor: onDayClick ? 'pointer' : 'default', '&:hover': onDayClick ? { bgcolor: 'rgba(98,189,181,.08)' } : undefined }}>
          {onDayClick
            ? <Button aria-label={dayLabel(date)} onClick={event => { event.stopPropagation(); onDayClick(date) }} size="small"
              sx={{ minHeight: 24, minWidth: 24, p: '0 6px', borderRadius: 1, fontWeight: 700, color: date === today ? 'primary.contrastText' : inMonth ? 'text.primary' : 'text.disabled', bgcolor: date === today ? 'primary.main' : 'transparent', '&:hover': { bgcolor: date === today ? 'primary.main' : undefined } }}>{day.date()}</Button>
            : <Typography component="span" sx={{ fontWeight: 700, fontSize: 14 }}>{day.date()}</Typography>}
          <Box sx={{ mt: .5, display: 'grid', gap: .5 }}>
            {dayItems.map(item => <Box component="button" type="button" key={item.id} onClick={event => { event.stopPropagation(); onItemClick(item.id) }}
              sx={{ textAlign: 'left', width: '100%', minWidth: 0, p: '3px 6px', border: 0, borderLeft: '3px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'background.paper', color: 'text.primary', font: 'inherit', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid var(--accent-text)' } }}>
              <Typography component="span" noWrap sx={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{item.title}</Typography>
              <Typography component="span" noWrap sx={{ display: 'block', fontSize: 11, color: 'text.secondary' }}>{item.subtitle}</Typography>
            </Box>)}
          </Box>
        </Box>
      })}
    </Box>
  </Box>
}
