import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkshops, workshopQueryKeys } from '../../api/client'
import { monthRange } from '../shared/calendar'
import { MonthCalendar, MonthNavigation } from '../shared/MonthCalendar'
import { WorkshopDialog } from './WorkshopDialog'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

const time = (value: string) => value.slice(0, 5)

/** Talleres: igual que Clases (calendario o lista), pero cada taller es de fecha única y tiene sus propios anotados. */
export function WorkshopsPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState<Dayjs>(() => dayjs())
  const [view, setView] = useState<'calendario' | 'lista'>('calendario')
  const [newDate, setNewDate] = useState<string | null>(null)
  const range = monthRange(month)
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...workshopQueryKeys.all, 'rango', range], queryFn: () => listWorkshops(range) })
  const open = (id: number) => navigate(`/talleres/${id}`)
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type records-page academy-menu-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Talleres</Typography><Typography className="companies-page-description">Encuentros de fecha única. Elegí un día para cargar un taller.</Typography></div>
      <Button variant="contained" className="company-new-button" onClick={() => setNewDate(dayjs().format('YYYY-MM-DD'))}>Nuevo taller</Button></header>
    <Box className="academy-calendar-toolbar" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <MonthNavigation month={month} onChange={setMonth} />
      <ToggleButtonGroup className="academy-view-toggle" exclusive size="small" value={view} onChange={(_, value) => value && setView(value)} aria-label="Vista de talleres">
        <ToggleButton value="calendario">Calendario</ToggleButton><ToggleButton value="lista">Lista</ToggleButton>
      </ToggleButtonGroup>
    </Box>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void refetch()}>Reintentar</Button>}>No pudimos cargar los talleres. {error.message}</Alert>}
    {isPending && !error ? <Typography role="status">Cargando talleres…</Typography> : view === 'calendario'
      ? <MonthCalendar className="academy-month-calendar" month={month} onDayClick={setNewDate} onItemClick={open} dayLabel={date => `Agregar un taller el ${dayjs(date).locale('es').format('D [de] MMMM')}`}
        items={(data ?? []).map(w => ({ id: Number(w.id), date: w.fecha, title: w.titulo, subtitle: `${time(w.horaInicio)} a ${time(w.horaFin)}` }))} />
      : <div className="company-table-panel">{(data ?? []).length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay talleres este mes</Typography><Typography color="text.secondary">Pasá al calendario y elegí un día para cargar uno.</Typography></section>
        : <TableContainer className="data-table-wrap"><Table size="small" aria-label="Lista de talleres"><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Horario</TableCell><TableCell>Taller</TableCell><TableCell>Servicio</TableCell><TableCell>Anotados</TableCell></TableRow></TableHead>
          <TableBody>{(data ?? []).map(w => <TableRow key={w.id} hover className="company-clickable-row" onClick={() => open(Number(w.id))}>
            <TableCell>{dayjs(w.fecha).format('DD/MM/YYYY')}</TableCell><TableCell>{time(w.horaInicio)} a {time(w.horaFin)}</TableCell>
            <TableCell><Button size="small" onClick={event => { event.stopPropagation(); open(Number(w.id)) }}>{w.titulo}</Button></TableCell><TableCell>{w.servicio.descripcion}</TableCell><TableCell>{w.cantidadInscriptos}</TableCell>
          </TableRow>)}</TableBody></Table></TableContainer>}</div>}
    {newDate && <WorkshopDialog date={newDate} onClose={() => setNewDate(null)} onSaved={() => setNewDate(null)} />}
  </Box></Box>
}
