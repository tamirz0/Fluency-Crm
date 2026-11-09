import { useState } from 'react'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { courseQueryKeys, createLesson, lessonQueryKeys, listCourses, listTeachers, teacherQueryKeys, updateLesson, type Clase } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

/**
 * Alta de una clase en el día elegido, o edición de una existente (título, fecha, horario y examen; el curso no cambia).
 * El Administrador elige un profesor y luego uno de sus cursos; el Profesor, entre los suyos.
 * Al elegir el curso se sugiere el título «Curso · Clase N», que se puede cambiar.
 */
export function ClassDialog({ date, lesson, onClose, onSaved }: { date?: string; lesson?: Clase; onClose: () => void; onSaved: (id: number) => void }) {
  const { user } = useAuth()
  const editing = !!lesson
  const isAdmin = !!user?.roles?.includes('ADMINISTRADOR')
  const client = useQueryClient()
  const [title, setTitle] = useState(lesson?.titulo ?? '')
  const [titleEdited, setTitleEdited] = useState(editing)
  const [day, setDay] = useState(lesson?.fecha ?? date ?? dayjs().format('YYYY-MM-DD'))
  const [start, setStart] = useState(lesson?.horaInicio.slice(0, 5) ?? '09:00')
  const [end, setEnd] = useState(lesson?.horaFin.slice(0, 5) ?? '10:00')
  const [isExam, setExam] = useState(lesson?.esExamen ?? false)
  const [topics, setTopics] = useState(lesson?.temasExamen ?? '')
  const [teacher, setTeacher] = useState('')
  const [course, setCourse] = useState('')
  const [touched, setTouched] = useState(false)
  const teachers = useQuery({ queryKey: teacherQueryKeys.all, queryFn: () => listTeachers(), enabled: isAdmin && !editing })
  const filter = isAdmin ? { idProfesor: Number(teacher), pageSize: 100 } : { pageSize: 100 }
  const courses = useQuery({ queryKey: [...courseQueryKeys.all, 'opciones', filter], queryFn: () => listCourses(filter), enabled: !editing && (!isAdmin || !!teacher) })
  const payload = { titulo: title.trim(), fecha: day, horaInicio: `${start}:00`, horaFin: `${end}:00`, esExamen: isExam, temasExamen: isExam && topics.trim() ? topics.trim() : null }
  const save = useMutation({
    mutationFn: () => editing ? updateLesson(Number(lesson.id), payload) : createLesson({ ...payload, idCurso: Number(course) }),
    onSuccess: async result => {
      await client.invalidateQueries({ queryKey: lessonQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all })
      if (editing) client.setQueryData(lessonQueryKeys.detail(Number(lesson.id)), result)
      onSaved(Number(result.clase.id))
    },
  })
  const chooseCourse = (value: string) => {
    setCourse(value)
    const picked = courses.data?.items.find(c => String(c.id) === value)
    if (picked && !titleEdited) setTitle(`${picked.nombre} · Clase ${Number(picked.cantidadClases) + 1}`)
  }
  const errors = { title: title.trim() ? '' : 'Ingresá el título.', course: editing || course ? '' : 'Elegí un curso.', time: end > start ? '' : 'El fin debe ser posterior al inicio.', day: day ? '' : 'Elegí la fecha.' }
  const invalid = Object.values(errors).some(Boolean)
  const submit = () => { setTouched(true); if (!invalid && !save.isPending) save.mutate() }
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="class-dialog-title">
    <DialogTitle id="class-dialog-title">{editing ? 'Editar clase' : `Nueva clase · ${dayjs(day).locale('es').format('dddd D [de] MMMM')}`}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        {editing && <Typography color="text.secondary">Curso: <strong>{lesson.curso.descripcion}</strong> · {lesson.profesor.descripcion}</Typography>}
        {!editing && isAdmin && <TextField select label="Profesor" value={teacher} onChange={e => { setTeacher(e.target.value); setCourse('') }} required helperText={teachers.isError ? teachers.error.message : teachers.isPending ? 'Cargando profesores…' : teachers.data?.length === 0 ? 'Todavía no hay profesores. Creá uno desde Usuarios.' : undefined}>
          {teachers.data?.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.apellido}, {t.nombre}</MenuItem>)}
        </TextField>}
        {!editing && <TextField select label="Curso" value={course} onChange={e => chooseCourse(e.target.value)} required disabled={isAdmin && !teacher}
          error={touched && !!errors.course} helperText={touched && errors.course ? errors.course : courses.isError ? courses.error.message : isAdmin && !teacher ? 'Elegí primero un profesor.' : courses.data?.items.length === 0 ? 'No hay cursos para elegir. Creá uno desde Cursos.' : undefined}>
          {courses.data?.items.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre} · {c.nivel.descripcion}</MenuItem>)}
        </TextField>}
        <TextField label="Título" value={title} onChange={e => { setTitle(e.target.value); setTitleEdited(true) }} required autoFocus error={touched && !!errors.title} helperText={touched ? errors.title : undefined} />
        {editing && <TextField label="Fecha" type="date" value={day} onChange={e => setDay(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required error={touched && !!errors.day} helperText={touched ? errors.day : undefined} />}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Hora de inicio" type="time" value={start} onChange={e => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Hora de fin" type="time" value={end} onChange={e => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required error={touched && !!errors.time} helperText={touched ? errors.time : undefined} />
        </Box>
        <FormControlLabel label="Es un examen" control={<Checkbox checked={isExam} onChange={e => setExam(e.target.checked)} />} />
        {isExam && <TextField label="Temas del examen (opcional)" value={topics} onChange={e => setTopics(e.target.value)} multiline minRows={2} />}
      </DialogContent>
      <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear clase'}</Button></DialogActions>
    </Box>
  </Dialog>
}
