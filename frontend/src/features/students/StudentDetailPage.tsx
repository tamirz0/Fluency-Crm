import { ArrowBack } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Skeleton, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ApiRequestError, changeStudentCourse, changeStudentLevel, courseQueryKeys, getCatalogOptions, getStudent, getStudentAttendance, getTeacherLevels, listCourses, studentQueryKeys, type Alumno } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { AttendanceSummary } from './AttendanceSummary'
import { parsePositiveId } from '../shared/display'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import { AcademyDetailPage } from '../shared/AcademyDetailPage'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

/** Asigna, cambia o quita el curso del alumno entre los cursos de su nivel que el usuario puede ver (el profesor, los propios). */
function ChangeCourseDialog({ student, onClose }: { student: Alumno; onClose: () => void }) {
  const client = useQueryClient()
  const [course, setCourse] = useState(student.curso ? String(student.curso.id) : '')
  const levelId = Number(student.nivel.id)
  const courses = useQuery({ queryKey: [...courseQueryKeys.all, 'nivel', levelId], queryFn: () => listCourses({ idNivel: levelId, pageSize: 100 }) })
  const options = courses.data?.items ?? []
  const save = useMutation({
    mutationFn: () => changeStudentCourse(Number(student.id), course ? Number(course) : null),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: studentQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); onClose() },
  })
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="assign-course-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="assign-course-title">{student.curso ? 'Cambiar curso' : 'Asignar curso'}</DialogTitle>
    <DialogContent sx={{ pt: 1 }}>
      {save.isError && <Alert severity="error" sx={{ mb: 2 }}>{save.error.message}</Alert>}
      <TextField select slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} fullWidth autoFocus label="Curso" value={course} onChange={event => setCourse(event.target.value)}
        error={courses.isError} helperText={courses.isError ? courses.error.message : options.length === 0 ? `No hay cursos de nivel ${student.nivel.descripcion}. Creá uno desde Cursos.` : `Cursos de nivel ${student.nivel.descripcion}.`}>
        <MenuItem value="">Sin curso</MenuItem>
        {student.curso && !options.some(item => String(item.id) === String(student.curso?.id)) && <MenuItem value={String(student.curso.id)}>{student.curso.descripcion}</MenuItem>}
        {options.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre} · {item.profesor.descripcion}</MenuItem>)}
      </TextField>
    </DialogContent>
    <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={course === (student.curso ? String(student.curso.id) : '') || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
  </Dialog>
}

/** Cambia el nivel de inglés (p. ej. para ascenderlo). El administrador elige entre todos; el profesor, entre sus niveles. */
function ChangeLevelDialog({ student, onClose }: { student: Alumno; onClose: () => void }) {
  const client = useQueryClient()
  const isAdmin = !!useAuth().user?.roles?.includes('ADMINISTRADOR')
  const [level, setLevel] = useState(String(student.nivel.id))
  const all = useQuery({ queryKey: ['catalogos', 'niveles-ingles', 'opciones'], queryFn: () => getCatalogOptions('niveles-ingles'), enabled: isAdmin })
  const own = useQuery({ queryKey: ['profesor', 'niveles'], queryFn: getTeacherLevels, enabled: !isAdmin })
  const options = isAdmin ? (all.data ?? []).map(n => ({ id: Number(n.id), descripcion: n.descripcion ?? '' }))
    : (own.data?.disponibles ?? []).filter(n => own.data?.seleccionados.map(Number).includes(Number(n.id))).map(n => ({ id: Number(n.id), descripcion: n.descripcion }))
  const loadError = isAdmin ? all.error : own.error
  const save = useMutation({
    mutationFn: () => changeStudentLevel(Number(student.id), Number(level)),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: studentQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); onClose() },
  })
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="change-level-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="change-level-title">Cambiar nivel de inglés</DialogTitle>
    <DialogContent sx={{ pt: 1 }}>
      {save.isError && <Alert severity="error" sx={{ mb: 2 }}>{save.error.message}</Alert>}
      <TextField select slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} fullWidth autoFocus label="Nivel de inglés" value={level} onChange={event => setLevel(event.target.value)}
        error={!!loadError} helperText={loadError ? loadError.message : student.curso ? 'Si el curso actual es de otro nivel, el alumno queda sin curso y se lo puede asignar a uno nuevo.' : undefined}>
        {options.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.descripcion}</MenuItem>)}
      </TextField>
    </DialogContent>
    <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={level === String(student.nivel.id) || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
  </Dialog>
}

/** Ficha del alumno: datos personales y nivel, sin historial comercial (el profesor no accede a la parte comercial). */
export function StudentDetailPage() {
  const { idAlumno: routeId } = useParams()
  const [assigning, setAssigning] = useState(false)
  const [changingLevel, setChangingLevel] = useState(false)
  const id = parsePositiveId(routeId)
  const query = useQuery({ queryKey: studentQueryKeys.detail(id ?? 0), queryFn: () => getStudent(id as number), enabled: id !== undefined })
  const attendance = useQuery({ queryKey: [...studentQueryKeys.detail(id ?? 0), 'asistencia'], queryFn: () => getStudentAttendance(id as number), enabled: id !== undefined })
  const back = <Link component={RouterLink} to="/alumnos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a alumnos</Link>
  if (id === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <AcademyDetailPage>{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos al alumno</Typography></section></AcademyDetailPage>
  if (query.isPending) return <AcademyDetailPage><Box role="status" aria-label="Cargando alumno"><Skeleton width="54%" height={54} /><Skeleton /><Skeleton /></Box></AcademyDetailPage>
  if (query.isError) return <AcademyDetailPage>{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar al alumno</Typography><Typography color="text.secondary">{query.error.message}</Typography></section></AcademyDetailPage>
  const student = query.data
  const name = `${student.nombre} ${student.apellido}`.trim()
  return <AcademyDetailPage>
    {back}
    <article className="profile-sheet" aria-label={`Ficha de ${name}`}>
      <ProfileHeader name={name} subtitle={`Alumno · ${student.nivel.descripcion}`} actions={<><Button variant="outlined" onClick={() => setChangingLevel(true)}>Cambiar nivel</Button><Button variant="contained" onClick={() => setAssigning(true)}>{student.curso ? 'Cambiar curso' : 'Asignar curso'}</Button></>} />
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
    {assigning && <ChangeCourseDialog student={student} onClose={() => setAssigning(false)} />}
    {changingLevel && <ChangeLevelDialog student={student} onClose={() => setChangingLevel(false)} />}
    {attendance.isError ? <Alert severity="warning" sx={{ mt: 3 }}>No pudimos cargar la asistencia. {attendance.error.message}</Alert> : attendance.data && <AttendanceSummary data={attendance.data} />}
  </AcademyDetailPage>
}
