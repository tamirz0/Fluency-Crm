import { useState } from 'react'
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { courseQueryKeys, createCourse, getTeacherLevels, listStudents, listTeachers, studentQueryKeys, teacherQueryKeys } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

type Option = { id: number; descripcion: string }

/**
 * Alta de un curso. El Profesor elige entre sus niveles; el Administrador, un profesor y luego uno de los niveles de ese profesor.
 * Opcionalmente suma alumnos del nivel elegido que todavía no tienen curso.
 */
export function CourseDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const { user } = useAuth()
  const isAdmin = !!user?.roles?.includes('ADMINISTRADOR')
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [level, setLevel] = useState('')
  const [students, setStudents] = useState<{ id: number; label: string }[]>([])
  const [touched, setTouched] = useState(false)
  const teachers = useQuery({ queryKey: teacherQueryKeys.all, queryFn: () => listTeachers(), enabled: isAdmin })
  const ownLevels = useQuery({ queryKey: ['profesor', 'niveles'], queryFn: getTeacherLevels, enabled: !isAdmin })
  const levelOptions: Option[] = isAdmin
    ? (teachers.data?.find(t => String(t.id) === teacher)?.niveles ?? []).map(n => ({ id: Number(n.id), descripcion: n.descripcion }))
    : (ownLevels.data?.disponibles ?? []).filter(n => ownLevels.data?.seleccionados.map(Number).includes(Number(n.id))).map(n => ({ id: Number(n.id), descripcion: n.descripcion }))
  const candidates = useQuery({ queryKey: [...studentQueryKeys.all, 'candidatos', level], queryFn: () => listStudents({ idNivel: Number(level), sinCurso: true, pageSize: 100 }), enabled: !!level })
  const save = useMutation({
    mutationFn: () => createCourse({ nombre: name.trim(), idNivel: Number(level), ...(isAdmin ? { idProfesor: Number(teacher) } : {}), idAlumnos: students.map(s => s.id) }),
    onSuccess: async result => { await client.invalidateQueries({ queryKey: courseQueryKeys.all }); await client.invalidateQueries({ queryKey: studentQueryKeys.all }); onSaved(Number(result.curso.id)) },
  })
  const errors = { name: name.trim() ? '' : 'Ingresá el nombre del curso.', teacher: !isAdmin || teacher ? '' : 'Elegí un profesor.', level: level ? '' : 'Elegí un nivel.' }
  const invalid = Object.values(errors).some(Boolean)
  const submit = () => { setTouched(true); if (!invalid && !save.isPending) save.mutate() }
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="course-dialog-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="course-dialog-title">Nuevo curso</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        <TextField label="Nombre del curso" value={name} onChange={e => setName(e.target.value)} required autoFocus error={touched && !!errors.name} helperText={touched ? errors.name : undefined} />
        {isAdmin && <TextField select slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} label="Profesor" value={teacher} onChange={e => { setTeacher(e.target.value); setLevel(''); setStudents([]) }} required error={touched && !!errors.teacher}
          helperText={touched && errors.teacher ? errors.teacher : teachers.isError ? teachers.error.message : teachers.data?.length === 0 ? 'Todavía no hay profesores. Creá uno desde Usuarios.' : undefined}>
          {teachers.data?.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.apellido}, {t.nombre}</MenuItem>)}
        </TextField>}
        <TextField select slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} label="Nivel de inglés" value={level} onChange={e => { setLevel(e.target.value); setStudents([]) }} required disabled={isAdmin && !teacher} error={touched && !!errors.level}
          helperText={touched && errors.level ? errors.level : isAdmin && !teacher ? 'Elegí primero un profesor.' : levelOptions.length === 0 && (isAdmin ? !!teacher : ownLevels.isSuccess) ? 'No hay niveles marcados: se definen desde Mi perfil del profesor.' : undefined}>
          {levelOptions.map(n => <MenuItem key={n.id} value={String(n.id)}>{n.descripcion}</MenuItem>)}
        </TextField>
        <Autocomplete multiple slotProps={{ paper: { className: 'record-dialog-options fluency-shell-type' } }} disabled={!level} options={(candidates.data?.items ?? []).map(s => ({ id: Number(s.id), label: `${s.apellido}, ${s.nombre}` }))} value={students} onChange={(_, value) => setStudents(value)}
          isOptionEqualToValue={(a, b) => a.id === b.id} loading={candidates.isPending && !!level} noOptionsText="No hay alumnos de este nivel sin curso" renderInput={params => <TextField {...params} label="Agregar alumnos (opcional)" helperText={level ? 'Alumnos del nivel que todavía no tienen curso.' : 'Elegí un nivel para ver los alumnos.'} />} />
      </DialogContent>
      <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Crear curso'}</Button></DialogActions>
    </Box>
  </Dialog>
}
