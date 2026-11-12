import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link as RouterLink } from 'react-router-dom'
import { getTeacherSummary, type Clase } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import '../companies/companies.css'

const time = (value: string) => value.slice(0, 5)

function LessonList({ title, lessons, empty, withDate }: { title: string; lessons: Clase[]; empty: string; withDate?: boolean }) {
  return <Card variant="outlined" component="section" aria-label={title}><CardContent>
    <Typography component="h2" variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {lessons.length === 0 ? <Typography color="text.secondary">{empty}</Typography>
      : <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>{lessons.map(lesson => <li key={lesson.id}>
        <Link component={RouterLink} to={`/clases/${lesson.id}`} underline="hover" sx={{ fontWeight: 700 }}>{lesson.titulo}</Link>
        {lesson.esExamen && <Typography component="span" color="warning.main" sx={{ ml: 1, fontSize: 13, fontWeight: 700 }}>Examen</Typography>}
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>{withDate ? `${dayjs(lesson.fecha).locale('es').format('ddd D/M')} · ` : ''}{time(lesson.horaInicio)} a {time(lesson.horaFin)} · {lesson.curso.descripcion}</Typography>
      </li>)}</Box>}
  </CardContent></Card>
}

/** Inicio del profesor: sus cursos y alumnos, las clases de hoy y de la semana, y los próximos exámenes. */
export function TeacherHomePage() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['inicio', 'profesor'], queryFn: getTeacherSummary, refetchOnMount: 'always' })
  const data = summary.data
  return <Box className="companies-page">
    <Typography component="h1" className="companies-page-title">Hola, {user?.nombre}</Typography>
    <Typography sx={{ mt: 2 }}>{dayjs().locale('es').format('dddd D [de] MMMM')}. Esto es lo que tenés por delante.</Typography>
    {summary.isError && <Alert severity="warning" sx={{ mt: 3 }} action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void summary.refetch()}>Reintentar</Button>}>
      No pudimos cargar tu resumen. {summary.error.message}
    </Alert>}
    {data && data.cantidadNiveles === 0 && <Alert severity="info" sx={{ mt: 3 }}>Todavía no marcaste con qué niveles de inglés trabajás. <Link component={RouterLink} to="/perfil">Marcalos en Mi perfil</Link> para poder abrir cursos y ver a tus alumnos.</Alert>}
    <Box component="section" aria-label="Resumen" sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
      {([['Cursos a cargo', data?.cantidadCursos, '/cursos', 'Ver cursos'], ['Alumnos en tus cursos', data?.cantidadAlumnos, '/alumnos', 'Ver alumnos']] as const).map(([title, value, to, link]) => <Card key={title} variant="outlined" sx={{ borderTop: 2, borderTopColor: 'primary.main' }}><CardContent>
        <Typography component="h2" variant="subtitle1" color="text.secondary">{title}</Typography>
        {summary.isPending ? <Skeleton variant="text" width={64} sx={{ fontSize: '2.5rem' }} aria-label={`Cargando ${title}`} />
          : <Typography variant="h3" component="p" sx={{ fontVariantNumeric: 'tabular-nums', my: .5 }} color={value === undefined ? 'text.disabled' : 'text.primary'} aria-label={`${title}: ${value ?? 'no disponible'}`}>{value ?? '—'}</Typography>}
        <Link component={RouterLink} to={to} underline="hover">{link}</Link>
      </CardContent></Card>)}
    </Box>
    {data && <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' } }}>
      <LessonList title="Clases de hoy" lessons={data.clasesHoy} empty="No tenés clases hoy." />
      <LessonList title="Próximos 7 días" lessons={data.proximasClases} empty="No tenés clases programadas esta semana." withDate />
      <LessonList title="Próximos exámenes" lessons={data.proximosExamenes} empty="No hay exámenes en los próximos 30 días." withDate />
    </Box>}
    <Button component={RouterLink} to="/clases" variant="outlined" sx={{ mt: 3 }}>Ir al calendario de clases</Button>
  </Box>
}
