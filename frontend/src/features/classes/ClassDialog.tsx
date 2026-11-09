import { useState } from 'react'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { courseQueryKeys, createLesson, lessonQueryKeys, listCourses, listTeachers, teacherQueryKeys } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

/** Alta de una clase en el día elegido. El Administrador elige un profesor y luego uno de sus cursos; el Profesor, entre los suyos. */
export function ClassDialog({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: (id: number) => void }) {
  const { user } = useAuth()
  const isAdmin = !!user?.roles?.includes('ADMINISTRADOR')
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [isExam, setExam] = useState(false)
  const [topics, setTopics] = useState('')
  const [teacher, setTeacher] = useState('')
  const [course, setCourse] = useState('')
  const [touched, setTouched] = useState(false)
  const teachers = useQuery({ queryKey: teacherQueryKeys.all, queryFn: () => listTeachers(), enabled: isAdmin })
  const filter = isAdmin ? { idProfesor: Number(teacher), pageSize: 100 } : { pageSize: 100 }
  const courses = useQuery({ queryKey: [...courseQueryKeys.all, 'opciones', filter], queryFn: () => listCourses(filter), enabled: !isAdmin || !!teacher })
  const save = useMutation({
    mutationFn: () => createLesson({ titulo: title.trim(), idCurso: Number(course), fecha: date, horaInicio: `${start}:00`, horaFin: `${end}:00`, esExamen: isExam, temasExamen: isExam && topics.trim() ? topics.trim() : null }),
    onSuccess: async result => { await client.invalidateQueries({ queryKey: lessonQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); onSaved(Number(result.clase.id)) },
  })
  const errors = { title: title.trim() ? '' : 'Ingresá el título.', course: course ? '' : 'Elegí un curso.', time: end > start ? '' : 'El fin debe ser posterior al inicio.' }
  const invalid = Object.values(errors).some(Boolean)
  const submit = () => { setTouched(true); if (!invalid && !save.isPending) save.mutate() }
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="class-dialog-title">
    <DialogTitle id="class-dialog-title">Nueva clase · {dayjs(date).locale('es').format('dddd D [de] MMMM')}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        <TextField label="Título" value={title} onChange={e => setTitle(e.target.value)} required autoFocus error={touched && !!errors.title} helperText={touched ? errors.title : undefined} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Hora de inicio" type="time" value={start} onChange={e => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Hora de fin" type="time" value={end} onChange={e => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required error={touched && !!errors.time} helperText={touched ? errors.time : undefined} />
        </Box>
        {isAdmin && <TextField select label="Profesor" value={teacher} onChange={e => { setTeacher(e.target.value); setCourse('') }} required helperText={teachers.isError ? teachers.error.message : teachers.isPending ? 'Cargando profesores…' : teachers.data?.length === 0 ? 'Todavía no hay profesores. Creá uno desde Usuarios.' : undefined}>
          {teachers.data?.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.apellido}, {t.nombre}</MenuItem>)}
        </TextField>}
        <TextField select label="Curso" value={course} onChange={e => setCourse(e.target.value)} required disabled={isAdmin && !teacher}
          error={touched && !!errors.course} helperText={touched && errors.course ? errors.course : courses.isError ? courses.error.message : isAdmin && !teacher ? 'Elegí primero un profesor.' : courses.data?.items.length === 0 ? 'No hay cursos para elegir. Creá uno desde Cursos.' : undefined}>
          {courses.data?.items.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre} · {c.nivel.descripcion}</MenuItem>)}
        </TextField>
        <FormControlLabel label="Es un examen" control={<Checkbox checked={isExam} onChange={e => setExam(e.target.checked)} />} />
        {isExam && <TextField label="Temas del examen (opcional)" value={topics} onChange={e => setTopics(e.target.value)} multiline minRows={2} />}
      </DialogContent>
      <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Crear clase'}</Button></DialogActions>
    </Box>
  </Dialog>
}
