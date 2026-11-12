import { CalendarMonth, EventAvailableOutlined, GroupsOutlined, MenuBookOutlined, SchoolOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Link, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Link as RouterLink } from 'react-router-dom'
import { getTeacherLevels, getTeacherSummary, type Clase } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { HomeEntry, HomeMetrics, HomePanel, LoadError } from './homeParts'
import './home.css'

const time = (value: string) => value.slice(0, 5)

function LessonPanel({ title, lessons, empty, withDate }: { title: string; lessons: Clase[]; empty: string; withDate?: boolean }) {
  return <HomePanel title={title} to="/clases" link="Ver calendario">
    {lessons.length === 0
      ? <Box className="home-agenda-empty"><CalendarMonth aria-hidden="true" /><Typography color="text.secondary">{empty}</Typography></Box>
      : <ul className="home-agenda">
        {lessons.map(lesson => <HomeEntry key={lesson.id} title={lesson.titulo} to={`/clases/${lesson.id}`} course={lesson.curso.descripcion}
          subtitle={[lesson.esExamen && 'Examen', withDate && dayjs(lesson.fecha).locale('es').format('ddd D/M'), `${time(lesson.horaInicio)}–${time(lesson.horaFin)}`].filter(Boolean).join(' · ')} />)}
      </ul>}
  </HomePanel>
}

/** Inicio del profesor: sus cursos y alumnos, las clases de hoy y de la semana, y los próximos exámenes, con el mismo formato que los demás inicios. */
export function TeacherHomePage() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['inicio', 'profesor'], queryFn: getTeacherSummary, refetchOnMount: 'always' })
  const data = summary.data
  const levels = useQuery({ queryKey: ['profesor', 'niveles'], queryFn: getTeacherLevels })
  const selected = levels.data?.seleccionados.map(Number) ?? []
  const levelNames = levels.data ? levels.data.disponibles.filter(level => selected.includes(Number(level.id))).map(level => level.descripcion).join(', ') || 'Sin niveles' : undefined
  const stats = [
    { label: 'Cursos a cargo', value: data?.cantidadCursos, icon: <MenuBookOutlined />, tone: 'blue', link: { to: '/cursos', label: 'Ver cursos' } },
    { label: 'Alumnos en tus cursos', value: data?.cantidadAlumnos, icon: <SchoolOutlined />, tone: 'mint', link: { to: '/alumnos', label: 'Ver alumnos' } },
    { label: 'Mis niveles de inglés', value: levelNames, icon: <GroupsOutlined />, tone: 'neutral', text: true, link: { to: '/perfil', label: 'Cambiar en Mi perfil' } },
  ] as const

  return <Box className="home-page fluency-shell-type">
    <header className="home-overview">
      <div className="home-overview-intro">
        <Typography component="h1">Hola, {user?.nombre}</Typography>
        <Typography component="p">{dayjs().locale('es').format('dddd D [de] MMMM')}: esto es lo que tenés por delante.</Typography>
      </div>
      <Button component={RouterLink} to="/clases" variant="contained" startIcon={<EventAvailableOutlined />}>Ir al calendario de clases</Button>
    </header>
    {summary.isError && <LoadError message={`No pudimos cargar tu resumen. ${summary.error.message}`} retry={() => void summary.refetch()} />}
    {data && data.cantidadNiveles === 0 && <Alert severity="info" sx={{ mb: 2 }}>
      Todavía no marcaste con qué niveles de inglés trabajás. <Link component={RouterLink} to="/perfil">Marcalos en Mi perfil</Link> para poder abrir cursos y ver a tus alumnos.
    </Alert>}
    <HomeMetrics stats={[...stats]} pending={summary.isPending} failed={summary.isError} />
    {data && <div className="home-work home-work--teacher">
      <LessonPanel title="Clases de hoy" lessons={data.clasesHoy} empty="No tenés clases hoy." />
      <LessonPanel title="Próximos 7 días" lessons={data.proximasClases} empty="No tenés clases programadas esta semana." withDate />
      <LessonPanel title="Próximos exámenes" lessons={data.proximosExamenes} empty="No hay exámenes en los próximos 30 días." withDate />
    </div>}
  </Box>
}
