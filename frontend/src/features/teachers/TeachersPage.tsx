import { ExpandMore, Refresh } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, Chip, FormControlLabel, FormGroup, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getCatalogOptions, getRoles, getUserById, lessonQueryKeys, listLessons, listTeachers, setTeacherLevelsOf, teacherQueryKeys, usuarioQueryKeys, type Profesor } from '../../api/client'
import { UserDialog } from '../settings/UserDialog'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

/** Clases asignadas a un profesor, desde hoy y por los próximos tres meses (el límite del listado). */
function TeacherLessons({ teacher }: { teacher: Profesor }) {
  const range = { desde: dayjs().format('YYYY-MM-DD'), hasta: dayjs().add(90, 'day').format('YYYY-MM-DD'), idProfesor: Number(teacher.id) }
  const { data, error, isPending } = useQuery({ queryKey: [...lessonQueryKeys.all, 'profesor', range], queryFn: () => listLessons(range) })
  if (isPending) return <Skeleton height={48} />
  if (error) return <Alert severity="error">No pudimos cargar las clases. {error.message}</Alert>
  if (data.length === 0) return <Typography color="text.secondary">No tiene clases programadas en los próximos 90 días.</Typography>
  return <TableContainer className="data-table-wrap"><Table size="small" aria-label={`Clases de ${teacher.apellido}, ${teacher.nombre}`}>
    <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Horario</TableCell><TableCell>Clase</TableCell><TableCell>Curso</TableCell></TableRow></TableHead>
    <TableBody>{data.map(lesson => <TableRow key={lesson.id}><TableCell>{dayjs(lesson.fecha).format('DD/MM/YYYY')}</TableCell><TableCell>{lesson.horaInicio.slice(0, 5)} a {lesson.horaFin.slice(0, 5)}</TableCell>
      <TableCell><Link component={RouterLink} to={`/clases/${lesson.id}`} underline="hover">{lesson.titulo}</Link>{lesson.esExamen && <Chip size="small" color="warning" label="Examen" sx={{ ml: 1 }} />}</TableCell><TableCell>{lesson.curso.descripcion}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
}

/** Edición administrativa de un profesor: sus datos de cuenta (mismo diálogo que Usuarios) y los niveles con los que trabaja. */
function TeacherAdmin({ teacher }: { teacher: Profesor }) {
  const client = useQueryClient()
  const id = Number(teacher.id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<number[] | null>(null)
  const user = useQuery({ queryKey: [...usuarioQueryKeys.all, 'detalle', id], queryFn: () => getUserById(id), enabled: editing })
  const roles = useQuery({ queryKey: ['roles'], queryFn: getRoles, enabled: editing })
  const levels = useQuery({ queryKey: ['catalogos', 'niveles-ingles', 'opciones'], queryFn: () => getCatalogOptions('niveles-ingles') })
  const selected = draft ?? teacher.niveles.map(level => Number(level.id))
  const save = useMutation({
    mutationFn: () => setTeacherLevelsOf(id, selected),
    onSuccess: async () => { setDraft(null); await client.invalidateQueries({ queryKey: teacherQueryKeys.all }) },
  })
  const toggle = (levelId: number) => setDraft(selected.includes(levelId) ? selected.filter(x => x !== levelId) : [...selected, levelId])
  return <Box sx={{ mb: 3, display: 'grid', gap: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Button variant="outlined" onClick={() => setEditing(true)}>Editar datos</Button>
      {editing && user.isError && <Alert severity="error">{user.error.message}</Alert>}
    </Box>
    <Box>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>Niveles de inglés</Typography>
      {levels.isError ? <Alert severity="error">No pudimos cargar los niveles. {levels.error.message}</Alert> : <FormGroup row role="group" aria-label={`Niveles de ${teacher.nombre} ${teacher.apellido}`}>
        {levels.data?.map(level => <FormControlLabel key={level.id} label={level.descripcion} control={<Checkbox checked={selected.includes(Number(level.id))} onChange={() => toggle(Number(level.id))} />} />)}
      </FormGroup>}
      {save.isError && <Alert severity="error" sx={{ mt: 1 }}>{save.error.message}</Alert>}
      <Button sx={{ mt: 1 }} variant="contained" disabled={draft === null || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar niveles'}</Button>
    </Box>
    {editing && user.data && roles.data && <UserDialog mode="edit" user={user.data} roles={roles.data} onClose={() => setEditing(false)}
      onSaved={() => { setEditing(false); void client.invalidateQueries({ queryKey: teacherQueryKeys.all }); void client.invalidateQueries({ queryKey: usuarioQueryKeys.all }) }} />}
  </Box>
}

/** Pestaña del administrador: cada profesor con sus niveles de inglés, cursos y clases asignadas. */
export function TeachersPage() {
  const [open, setOpen] = useState<string | null>(null)
  const { data, error, isPending, refetch } = useQuery({ queryKey: teacherQueryKeys.all, queryFn: () => listTeachers() })
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type records-page academy-menu-page academic-teachers-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Profesores</Typography><Typography className="companies-page-description">Niveles con los que trabaja cada profesor y las clases que tiene asignadas. Las cuentas nuevas se crean desde Usuarios.</Typography></div></header>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void refetch()}>Reintentar</Button>}>No pudimos cargar los profesores. {error.message}</Alert>}
    {isPending && !error ? <div role="status" aria-label="Cargando profesores"><Skeleton height={64} /><Skeleton height={64} /></div> : data && (data.length === 0
      ? <div className="company-table-panel"><section className="company-feedback"><Typography component="h2" className="company-feedback-title">Todavía no hay profesores</Typography><Typography color="text.secondary">Creá una cuenta con el rol Profesor desde Usuarios.</Typography></section></div>
      : <Box className="academic-teacher-list">{data.map(teacher => <Accordion key={teacher.id} className="academic-teacher-accordion" disableGutters expanded={open === String(teacher.id)} onChange={(_, expanded) => setOpen(expanded ? String(teacher.id) : null)}>
        <AccordionSummary expandIcon={<ExpandMore />} aria-label={`${teacher.apellido}, ${teacher.nombre}`}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Typography component="h2" variant="h6" sx={{ mr: 1 }}>{teacher.apellido}, {teacher.nombre}{teacher.activo ? '' : ' (inactivo)'}</Typography>
            {teacher.niveles.length === 0 ? <Typography color="text.secondary">Sin niveles marcados</Typography> : teacher.niveles.map(level => <Chip key={level.id} size="small" color="primary" variant="outlined" label={level.descripcion} />)}
            <Typography sx={{ ml: { md: 'auto' }, mr: 2 }} color="text.secondary">{teacher.cantidadCursos} {teacher.cantidadCursos === 1 ? 'curso' : 'cursos'} · {teacher.cantidadClases} {teacher.cantidadClases === 1 ? 'clase' : 'clases'}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>{open === String(teacher.id) && <><TeacherAdmin teacher={teacher} /><Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Clases asignadas</Typography><TeacherLessons teacher={teacher} /></>}</AccordionDetails>
      </Accordion>)}</Box>)}
  </Box></Box>
}
