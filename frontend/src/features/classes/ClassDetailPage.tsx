import { ArrowBack } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ApiRequestError, getLesson, lessonQueryKeys, saveAttendance, saveGrades, type ClaseDetalle } from '../../api/client'
import { parsePositiveId } from '../shared/display'
import '../companies/companies.css'
import '../contacts/records.css'

type Presence = 'presente' | 'ausente' | null
const toPresence = (value: boolean | null | undefined): Presence => value === true ? 'presente' : value === false ? 'ausente' : null
const noteText = (value: number | string | null | undefined) => value == null ? '' : String(value)
const parseNote = (text: string) => text.trim() === '' ? null : Number(text.replace(',', '.'))
const validNote = (text: string) => { const n = parseNote(text); return n === null || (Number.isFinite(n) && n >= 0 && n <= 10 && Math.round(n * 100) / 100 === n) }

/** Planilla de la clase: presente/ausente por alumno y, si es un examen, la nota de cada uno. */
function Sheet({ lesson }: { lesson: ClaseDetalle }) {
  const client = useQueryClient()
  const { clase, alumnos } = lesson
  const [presence, setPresence] = useState<Record<number, Presence>>(() => Object.fromEntries(alumnos.map(a => [Number(a.idAlumno), toPresence(a.presente)])))
  const [notes, setNotes] = useState<Record<number, string>>(() => Object.fromEntries(alumnos.map(a => [Number(a.idAlumno), noteText(a.nota)])))
  const changedPresence = alumnos.filter(a => presence[Number(a.idAlumno)] !== null && presence[Number(a.idAlumno)] !== toPresence(a.presente))
  const changedNotes = alumnos.filter(a => clase.esExamen && notes[Number(a.idAlumno)] !== noteText(a.nota))
  const invalidNote = alumnos.some(a => !validNote(notes[Number(a.idAlumno)]))
  const save = useMutation({
    mutationFn: async () => {
      let latest: ClaseDetalle | undefined
      if (changedPresence.length) latest = await saveAttendance(Number(clase.id), changedPresence.map(a => ({ idAlumno: Number(a.idAlumno), presente: presence[Number(a.idAlumno)] === 'presente' })))
      if (changedNotes.length) latest = await saveGrades(Number(clase.id), changedNotes.map(a => ({ idAlumno: Number(a.idAlumno), nota: parseNote(notes[Number(a.idAlumno)]) })))
      return latest
    },
    onSuccess: async latest => {
      if (latest) client.setQueryData(lessonQueryKeys.detail(Number(clase.id)), latest)
      await client.invalidateQueries({ queryKey: ['alumnos'] })
    },
  })
  return <>
    {alumnos.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">El curso todavía no tiene alumnos</Typography><Typography color="text.secondary">Sumá alumnos desde la ficha del curso para tomar asistencia.</Typography></section> : <>
      <TableContainer className="data-table-wrap"><Table size="small" aria-label={clase.esExamen ? 'Asistencia y notas' : 'Asistencia'}>
        <TableHead><TableRow><TableCell>DNI</TableCell><TableCell>Apellido y nombre</TableCell><TableCell>Asistencia</TableCell>{clase.esExamen && <TableCell>Nota</TableCell>}</TableRow></TableHead>
        <TableBody>{alumnos.map(a => {
          const id = Number(a.idAlumno)
          const name = `${a.apellido}, ${a.nombre}`
          return <TableRow key={id}>
            <TableCell>{a.documento?.trim() || '-'}</TableCell>
            <TableCell><Link component={RouterLink} to={`/alumnos/${a.idAlumno}`} underline="hover">{name}</Link></TableCell>
            <TableCell><ToggleButtonGroup exclusive size="small" aria-label={`Asistencia de ${name}`} value={presence[id]} onChange={(_, value: Presence) => { if (value) setPresence(p => ({ ...p, [id]: value })) }}>
              <ToggleButton value="presente" color="success">Presente</ToggleButton><ToggleButton value="ausente" color="error">Ausente</ToggleButton>
            </ToggleButtonGroup></TableCell>
            {clase.esExamen && <TableCell><TextField size="small" value={notes[id]} onChange={e => setNotes(n => ({ ...n, [id]: e.target.value }))} error={!validNote(notes[id])} slotProps={{ htmlInput: { 'aria-label': `Nota de ${name}`, inputMode: 'decimal' } }} sx={{ width: 96 }} /></TableCell>}
          </TableRow>
        })}</TableBody>
      </Table></TableContainer>
      {invalidNote && <Alert severity="warning" sx={{ mt: 2 }}>Las notas van de 0 a 10, con hasta dos decimales.</Alert>}
      {save.isError && <Alert severity="error" sx={{ mt: 2 }}>{save.error.message}</Alert>}
      {save.isSuccess && !changedPresence.length && !changedNotes.length && <Alert severity="success" sx={{ mt: 2 }}>Cambios guardados.</Alert>}
      <Button sx={{ mt: 2 }} variant="contained" disabled={save.isPending || invalidNote || (!changedPresence.length && !changedNotes.length)} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
    </>}
  </>
}

export function ClassDetailPage() {
  const { idClase: routeId } = useParams()
  const id = parsePositiveId(routeId)
  const query = useQuery({ queryKey: lessonQueryKeys.detail(id ?? 0), queryFn: () => getLesson(id as number), enabled: id !== undefined })
  const back = <Link component={RouterLink} to="/clases" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a clases</Link>
  if (id === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page">{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos la clase</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page" role="status" aria-label="Cargando clase"><Skeleton width="54%" height={54} /><Skeleton /><Skeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page">{back}<Alert severity="error">No pudimos cargar la clase. {query.error.message}</Alert></Box>
  const { clase } = query.data
  return <Box className="companies-page company-result-page records-page">
    {back}
    <Typography component="h1" className="companies-page-title">{clase.titulo}{clase.esExamen && <Chip color="warning" label="Examen" sx={{ ml: 2, verticalAlign: 'middle' }} />}</Typography>
    <Typography className="companies-page-description">{dayjs(clase.fecha).locale('es').format('dddd D [de] MMMM [de] YYYY')} · {clase.horaInicio.slice(0, 5)} a {clase.horaFin.slice(0, 5)} · <Link component={RouterLink} to={`/cursos/${clase.curso.id}`} underline="hover">{clase.curso.descripcion}</Link> · {clase.profesor.descripcion}</Typography>
    {clase.esExamen && <Typography sx={{ mt: 1 }}><strong>Temas:</strong> {clase.temasExamen?.trim() || 'Sin temas cargados.'}</Typography>}
    <Box sx={{ mt: 3 }}><Sheet lesson={query.data} /></Box>
  </Box>
}
