import { ExpandMore, Refresh } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { lessonQueryKeys, listLessons, listTeachers, teacherQueryKeys, type Profesor } from '../../api/client'
import '../companies/companies.css'
import '../contacts/records.css'

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

/** Pestaña del administrador: cada profesor con sus niveles de inglés, cursos y clases asignadas. */
export function TeachersPage() {
  const [open, setOpen] = useState<string | null>(null)
  const { data, error, isPending, refetch } = useQuery({ queryKey: teacherQueryKeys.all, queryFn: () => listTeachers() })
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Profesores</Typography><Typography className="companies-page-description">Niveles con los que trabaja cada profesor y las clases que tiene asignadas. Las cuentas nuevas se crean desde Usuarios.</Typography></div></header>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void refetch()}>Reintentar</Button>}>No pudimos cargar los profesores. {error.message}</Alert>}
    {isPending && !error ? <div role="status" aria-label="Cargando profesores"><Skeleton height={64} /><Skeleton height={64} /></div> : data && (data.length === 0
      ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">Todavía no hay profesores</Typography><Typography color="text.secondary">Creá una cuenta con el rol Profesor desde Usuarios.</Typography></section>
      : data.map(teacher => <Accordion key={teacher.id} disableGutters expanded={open === String(teacher.id)} onChange={(_, expanded) => setOpen(expanded ? String(teacher.id) : null)} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 1.5, '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} aria-label={`${teacher.apellido}, ${teacher.nombre}`}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Typography component="h2" variant="h6" sx={{ mr: 1 }}>{teacher.apellido}, {teacher.nombre}{teacher.activo ? '' : ' (inactivo)'}</Typography>
            {teacher.niveles.length === 0 ? <Typography color="text.secondary">Sin niveles marcados</Typography> : teacher.niveles.map(level => <Chip key={level.id} size="small" color="primary" variant="outlined" label={level.descripcion} />)}
            <Typography sx={{ ml: { md: 'auto' }, mr: 2 }} color="text.secondary">{teacher.cantidadCursos} {teacher.cantidadCursos === 1 ? 'curso' : 'cursos'} · {teacher.cantidadClases} {teacher.cantidadClases === 1 ? 'clase' : 'clases'}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>{open === String(teacher.id) && <TeacherLessons teacher={teacher} />}</AccordionDetails>
      </Accordion>))}
  </Box>
}
