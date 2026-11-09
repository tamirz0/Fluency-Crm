import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lessonQueryKeys, listLessons } from '../../api/client'
import { monthRange } from '../shared/calendar'
import { MonthCalendar, MonthNavigation } from '../shared/MonthCalendar'
import { ClassDialog } from './ClassDialog'
import '../companies/companies.css'
import '../contacts/records.css'

const time = (value: string) => value.slice(0, 5)

/** Clases: calendario mensual (por defecto) o lista. Hacer clic en un día crea una clase; hacerlo en una clase abre su asistencia. */
export function ClassesPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState<Dayjs>(() => dayjs())
  const [view, setView] = useState<'calendario' | 'lista'>('calendario')
  const [newDate, setNewDate] = useState<string | null>(null)
  const range = monthRange(month)
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...lessonQueryKeys.all, 'rango', range], queryFn: () => listLessons(range) })
  const open = (id: number) => navigate(`/clases/${id}`)
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Clases</Typography><Typography className="companies-page-description">Clases programadas de tus cursos. Elegí un día para cargar una nueva.</Typography></div>
      <Button variant="contained" onClick={() => setNewDate(dayjs().format('YYYY-MM-DD'))}>Nueva clase</Button></header>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <MonthNavigation month={month} onChange={setMonth} />
      <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, value) => value && setView(value)} aria-label="Vista de clases">
        <ToggleButton value="calendario">Calendario</ToggleButton><ToggleButton value="lista">Lista</ToggleButton>
      </ToggleButtonGroup>
    </Box>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void refetch()}>Reintentar</Button>}>No pudimos cargar las clases. {error.message}</Alert>}
    {isPending && !error ? <Typography role="status">Cargando clases…</Typography> : view === 'calendario'
      ? <MonthCalendar month={month} onDayClick={setNewDate} onItemClick={open} dayLabel={date => `Agregar una clase el ${dayjs(date).locale('es').format('D [de] MMMM')}`}
        items={(data ?? []).map(c => ({ id: Number(c.id), date: c.fecha, title: c.titulo, subtitle: `${time(c.horaInicio)} a ${time(c.horaFin)}` }))} />
      : (data ?? []).length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay clases este mes</Typography><Typography color="text.secondary">Pasá al calendario y elegí un día para cargar una.</Typography></section>
        : <TableContainer className="data-table-wrap"><Table size="small" aria-label="Lista de clases"><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Horario</TableCell><TableCell>Título</TableCell><TableCell>Curso</TableCell><TableCell>Profesor</TableCell></TableRow></TableHead>
          <TableBody>{(data ?? []).map(c => <TableRow key={c.id} hover className="company-clickable-row" onClick={() => open(Number(c.id))}>
            <TableCell>{dayjs(c.fecha).format('DD/MM/YYYY')}</TableCell><TableCell>{time(c.horaInicio)} a {time(c.horaFin)}</TableCell>
            <TableCell><Button size="small" onClick={event => { event.stopPropagation(); open(Number(c.id)) }}>{c.titulo}</Button>{c.esExamen && <Chip size="small" color="warning" label="Examen" sx={{ ml: 1 }} />}</TableCell>
            <TableCell>{c.curso.descripcion}</TableCell><TableCell>{c.profesor.descripcion}</TableCell>
          </TableRow>)}</TableBody></Table></TableContainer>}
    {newDate && <ClassDialog date={newDate} onClose={() => setNewDate(null)} onSaved={() => setNewDate(null)} />}
  </Box>
}
