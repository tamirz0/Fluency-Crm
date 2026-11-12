import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { courseQueryKeys, listCourses } from '../../api/client'
import { CourseDialog } from './CourseDialog'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

/** Cursos en formato grilla; al abrir uno se ve su ficha con la cantidad y la lista de alumnos. */
export function CoursesPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...courseQueryKeys.all, 'list'], queryFn: () => listCourses({ pageSize: 100 }) })
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type records-page academy-menu-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Cursos</Typography><Typography className="companies-page-description">Grupos por nivel de inglés. A un curso solo se le suman alumnos.</Typography></div>
      <Button variant="contained" className="company-new-button" onClick={() => setCreating(true)}>Nuevo curso</Button></header>
    {error && <Alert severity="error" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void refetch()}>Reintentar</Button>}>No pudimos cargar los cursos. {error.message}</Alert>}
    {isPending && !error ? <Box role="status" aria-label="Cargando cursos" sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>{[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={132} />)}</Box>
      : data && (data.items.length === 0
        ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">Todavía no hay cursos</Typography><Typography color="text.secondary">Creá el primero con «Nuevo curso». Antes, el profesor tiene que marcar sus niveles en Mi perfil.</Typography></section>
        : <Box component="ul" aria-label="Cursos" className="academy-course-grid" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {data.items.map(course => <li key={course.id}><Card variant="outlined" className="academy-course-card" sx={{ height: '100%' }}><CardActionArea sx={{ height: '100%' }} onClick={() => navigate(`/cursos/${course.id}`)} aria-label={`Abrir curso ${course.nombre}`}><CardContent>
            <Chip size="small" color="primary" variant="outlined" label={course.nivel.descripcion} sx={{ mb: 1 }} />
            <Typography component="h2" variant="h6">{course.nombre}</Typography>
            <Typography color="text.secondary">{course.profesor.descripcion}</Typography>
            <Typography className="academy-course-summary" sx={{ mt: 1 }}>{course.cantidadAlumnos} {course.cantidadAlumnos === 1 ? 'alumno' : 'alumnos'} · {course.cantidadClases} {course.cantidadClases === 1 ? 'clase' : 'clases'}</Typography>
          </CardContent></CardActionArea></Card></li>)}
        </Box>)}
    {creating && <CourseDialog onClose={() => setCreating(false)} onSaved={id => { setCreating(false); navigate(`/cursos/${id}`) }} />}
  </Box></Box>
}
