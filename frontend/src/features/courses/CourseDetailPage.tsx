import { ArrowBack } from '@mui/icons-material'
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { addStudentsToCourse, ApiRequestError, courseQueryKeys, deleteCourse, getCourse, listStudents, studentQueryKeys } from '../../api/client'
import { parsePositiveId } from '../shared/display'
import { ProfileHeader, ProfileStats } from '../shared/RecordProfile'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { AcademyDetailPage } from '../shared/AcademyDetailPage'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

function AddStudentsDialog({ courseId, levelId, onClose }: { courseId: number; levelId: number; onClose: () => void }) {
  const client = useQueryClient()
  const [selected, setSelected] = useState<{ id: number; label: string }[]>([])
  const candidates = useQuery({ queryKey: [...studentQueryKeys.all, 'candidatos', levelId], queryFn: () => listStudents({ idNivel: levelId, sinCurso: true, pageSize: 100 }) })
  const save = useMutation({
    mutationFn: () => addStudentsToCourse(courseId, selected.map(s => s.id)),
    onSuccess: async data => { client.setQueryData(courseQueryKeys.detail(courseId), data); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); await client.invalidateQueries({ queryKey: studentQueryKeys.all }); onClose() },
  })
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="add-students-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="add-students-title">Agregar alumnos</DialogTitle>
    <DialogContent sx={{ pt: 1 }}>
      {save.isError && <Alert severity="error" sx={{ mb: 2 }}>{save.error.message}</Alert>}
      {candidates.isError && <Alert severity="error" sx={{ mb: 2 }}>{candidates.error.message}</Alert>}
      <Autocomplete multiple slotProps={{ paper: { className: 'record-dialog-options fluency-shell-type' } }} options={(candidates.data?.items ?? []).map(s => ({ id: Number(s.id), label: `${s.apellido}, ${s.nombre}` }))} value={selected} onChange={(_, value) => setSelected(value)}
        isOptionEqualToValue={(a, b) => a.id === b.id} loading={candidates.isPending} noOptionsText="No hay alumnos de este nivel sin curso"
        renderInput={params => <TextField {...params} autoFocus label="Alumnos" helperText="Solo alumnos del nivel del curso que todavía no tienen curso." />} />
    </DialogContent>
    <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={save.isPending || selected.length === 0} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Agregar'}</Button></DialogActions>
  </Dialog>
}

/** Ficha del curso: cantidad de alumnos y su lista, con el mismo formato que las demás fichas. */
export function CourseDetailPage() {
  const { idCurso: routeId } = useParams()
  const id = parsePositiveId(routeId)
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: courseQueryKeys.detail(id ?? 0), queryFn: () => getCourse(id as number), enabled: id !== undefined })
  const back = <Link component={RouterLink} to="/cursos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a cursos</Link>
  if (id === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <AcademyDetailPage>{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos el curso</Typography></section></AcademyDetailPage>
  if (query.isPending) return <AcademyDetailPage><Box role="status" aria-label="Cargando curso"><Skeleton width="54%" height={54} /><Skeleton /><Skeleton /></Box></AcademyDetailPage>
  if (query.isError) return <AcademyDetailPage>{back}<Alert severity="error">No pudimos cargar el curso. {query.error.message}</Alert></AcademyDetailPage>
  const { curso, alumnos } = query.data
  return <AcademyDetailPage>
    {back}
    <article className="profile-sheet" aria-label={`Ficha del curso ${curso.nombre}`}>
      <ProfileHeader name={curso.nombre} subtitle={`Curso · ${curso.nivel.descripcion}`} actions={<><Button variant="contained" onClick={() => setAdding(true)}>Agregar alumnos</Button>
        <RemoveRecordButton noun="curso" name={curso.nombre} remove={() => deleteCourse(id)} onRemoved={() => {
          void client.invalidateQueries({ queryKey: courseQueryKeys.all }); void client.invalidateQueries({ queryKey: studentQueryKeys.all }); navigate('/cursos')
        }} /></>} />
      <ProfileStats items={[
        { label: 'Nivel', value: curso.nivel.descripcion },
        { label: 'Profesor', value: curso.profesor.descripcion },
        { label: 'Alumnos', value: String(curso.cantidadAlumnos) },
        { label: 'Clases', value: String(curso.cantidadClases) },
      ]} />
    </article>
    <Typography component="h2" variant="h6" sx={{ mt: 4, mb: 1 }}>Alumnos ({alumnos.length})</Typography>
    {alumnos.length === 0 ? <section className="company-feedback"><Typography color="text.secondary">Todavía no hay alumnos en este curso. Usá «Agregar alumnos».</Typography></section>
      : <TableContainer className="data-table-wrap"><Table size="small" aria-label="Alumnos del curso"><TableHead><TableRow><TableCell>Apellido y nombre</TableCell><TableCell>Documento</TableCell><TableCell>Correo</TableCell></TableRow></TableHead>
        <TableBody>{alumnos.map(a => <TableRow key={a.id}><TableCell><Link component={RouterLink} to={`/alumnos/${a.id}`} underline="hover">{a.apellido}, {a.nombre}</Link></TableCell><TableCell>{a.documento?.trim() || '-'}</TableCell><TableCell>{a.correo}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
    {adding && <AddStudentsDialog courseId={id} levelId={Number(curso.nivel.id)} onClose={() => setAdding(false)} />}
  </AcademyDetailPage>
}
