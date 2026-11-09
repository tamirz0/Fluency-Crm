import { ArrowBack } from '@mui/icons-material'
import { Alert, Box, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ApiRequestError, getStudent, getStudentAttendance, studentQueryKeys } from '../../api/client'
import { AttendanceSummary } from './AttendanceSummary'
import { parsePositiveId } from '../shared/display'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import '../companies/companies.css'
import '../contacts/records.css'

/** Ficha del alumno: datos personales y nivel, sin historial comercial (el profesor no accede a la parte comercial). */
export function StudentDetailPage() {
  const { idAlumno: routeId } = useParams()
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
      <ProfileHeader name={name} subtitle={`Alumno · ${student.nivel.descripcion}`} />
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
    {attendance.isError ? <Alert severity="warning" sx={{ mt: 3 }}>No pudimos cargar la asistencia. {attendance.error.message}</Alert> : attendance.data && <AttendanceSummary data={attendance.data} />}
  </Box>
}
