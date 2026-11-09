import { ArrowBack } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Skeleton, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { addStudentsToCourse, ApiRequestError, courseQueryKeys, getStudent, getStudentAttendance, listCourses, studentQueryKeys, type Alumno } from '../../api/client'
import { AttendanceSummary } from './AttendanceSummary'
import { parsePositiveId } from '../shared/display'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import '../companies/companies.css'
import '../contacts/records.css'

/** Asigna el alumno a uno de los cursos de su nivel que el usuario puede ver (el profesor, los propios). Un curso solo suma alumnos. */
function AssignCourseDialog({ student, onClose }: { student: Alumno; onClose: () => void }) {
  const client = useQueryClient()
  const [course, setCourse] = useState('')
  const levelId = Number(student.nivel.id)
  const courses = useQuery({ queryKey: [...courseQueryKeys.all, 'nivel', levelId], queryFn: () => listCourses({ idNivel: levelId, pageSize: 100 }) })
  const save = useMutation({
    mutationFn: () => addStudentsToCourse(Number(course), [Number(student.id)]),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: studentQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); onClose() },
  })
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="assign-course-title">
    <DialogTitle id="assign-course-title">Asignar curso</DialogTitle>
    <DialogContent sx={{ pt: 1 }}>
      {save.isError && <Alert severity="error" sx={{ mb: 2 }}>{save.error.message}</Alert>}
      <TextField select fullWidth autoFocus label="Curso" value={course} onChange={event => setCourse(event.target.value)}
        error={courses.isError} helperText={courses.isError ? courses.error.message : courses.data?.items.length === 0 ? `No hay cursos de nivel ${student.nivel.descripcion}. Creá uno desde Cursos.` : `Cursos de nivel ${student.nivel.descripcion}.`}>
        {courses.data?.items.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre} · {item.profesor.descripcion}</MenuItem>)}
      </TextField>
    </DialogContent>
    <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={!course || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Asignando…' : 'Asignar'}</Button></DialogActions>
  </Dialog>
}

/** Ficha del alumno: datos personales y nivel, sin historial comercial (el profesor no accede a la parte comercial). */
export function StudentDetailPage() {
  const { idAlumno: routeId } = useParams()
  const [assigning, setAssigning] = useState(false)
  const id = parsePositiveId(routeId)
  const query = useQuery({ queryKey: studentQueryKeys.detail(id ?? 0), queryFn: () => getStudent(id as number), enabled: id !== undefined })
  const attendance = useQuery({ queryKey: [...studentQueryKeys.detail(id ?? 0), 'asistencia'], queryFn: () => getStudentAttendance(id as number), enabled: id !== undefined })
  const back = <Link component={RouterLink} to="/alumnos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a alumnos</Link>
  if (id === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page">{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos al alumno</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page" role="status" aria-label="Cargando alumno"><Skeleton width="54%" height={54} /><Skeleton /><Skeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page">{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar al alumno</Typography><Typography color="text.secondary">{query.error.message}</Typography></section></Box>
  const student = query.data
  const name = `${student.nombre} ${student.apellido}`.trim()
  return <Box className="companies-page company-result-page records-page">
    {back}
    <article className="profile-sheet" aria-label={`Ficha de ${name}`}>
      <ProfileHeader name={name} subtitle={`Alumno · ${student.nivel.descripcion}`} actions={student.curso ? undefined : <Button variant="contained" onClick={() => setAssigning(true)}>Asignar curso</Button>} />
      <ProfileStats items={[
        { label: 'Nivel', value: student.nivel.descripcion },
        { label: 'Curso', value: student.curso ? student.curso.descripcion : 'Sin curso' },
        { label: 'Alumno desde', value: new Date(student.fechaAlta).toLocaleDateString('es-AR') },
      ]} />
      <ProfileRows rows={[
        { label: 'Correo', value: student.correo ? <Link href={`mailto:${student.correo}`} underline="hover">{student.correo}</Link> : undefined },
        { label: 'Teléfono', value: student.telefono ? <Link href={`tel:${student.telefono}`} underline="hover">{student.telefono}</Link> : undefined },
        { label: 'Documento', value: student.documento?.trim() },
      ]} />
    </article>
    {assigning && <AssignCourseDialog student={student} onClose={() => setAssigning(false)} />}
    {attendance.isError ? <Alert severity="warning" sx={{ mt: 3 }}>No pudimos cargar la asistencia. {attendance.error.message}</Alert> : attendance.data && <AttendanceSummary data={attendance.data} />}
  </Box>
}
