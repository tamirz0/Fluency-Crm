import { useState } from 'react'
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { courseQueryKeys, createStudent, getCatalogOptions, listCourses, listStudentCandidates, studentQueryKeys, type AlumnoCandidato } from '../../api/client'

const selectSlots = { select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }

/** Alta de un alumno desde un contacto en estado Cliente que todavía no lo es. El curso es opcional y debe ser del nivel elegido. */
export function NewStudentDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
  const client = useQueryClient()
  const [contact, setContact] = useState<AlumnoCandidato | null>(null)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [course, setCourse] = useState('')
  const [touched, setTouched] = useState(false)
  const candidates = useQuery({ queryKey: [...studentQueryKeys.all, 'candidatos', search], queryFn: () => listStudentCandidates({ q: search, pageSize: 25 }) })
  const levels = useQuery({ queryKey: ['catalogos', 'niveles-ingles', 'opciones'], queryFn: () => getCatalogOptions('niveles-ingles') })
  const courses = useQuery({ queryKey: [...courseQueryKeys.all, 'nivel', Number(level)], queryFn: () => listCourses({ idNivel: Number(level), pageSize: 100 }), enabled: !!level })
  const save = useMutation({
    mutationFn: () => createStudent({ idContacto: Number(contact?.id), idNivel: Number(level), ...(course ? { idCurso: Number(course) } : {}) }),
    onSuccess: async result => { await client.invalidateQueries({ queryKey: studentQueryKeys.all }); await client.invalidateQueries({ queryKey: courseQueryKeys.all }); onSaved(Number(result.id)) },
  })
  const errors = { contact: contact ? '' : 'Elegí un contacto.', level: level ? '' : 'Elegí un nivel.' }
  const submit = () => { setTouched(true); if (!errors.contact && !errors.level && !save.isPending) save.mutate() }
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="new-student-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="new-student-title">Nuevo alumno</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        <Autocomplete slotProps={{ paper: { className: 'record-dialog-options fluency-shell-type' } }} value={contact} options={candidates.data?.items ?? []} filterOptions={x => x} loading={candidates.isPending}
          getOptionLabel={c => `${c.apellido}, ${c.nombre}`} getOptionKey={c => c.id} isOptionEqualToValue={(a, b) => a.id === b.id} noOptionsText="No hay contactos Cliente sin alta de alumno" loadingText="Cargando contactos…"
          onChange={(_, value) => setContact(value)} onInputChange={(_, input, reason) => { if (reason === 'input' || reason === 'clear') setSearch(input) }}
          renderInput={params => <TextField {...params} autoFocus required label="Contacto" error={touched && !!errors.contact}
            helperText={touched && errors.contact ? errors.contact : candidates.isError ? candidates.error.message : 'Contactos en estado Cliente que todavía no son alumnos.'} />} />
        <TextField select slotProps={selectSlots} label="Nivel de inglés" value={level} onChange={e => { setLevel(e.target.value); setCourse('') }} required error={touched && !!errors.level}
          helperText={touched && errors.level ? errors.level : levels.isError ? levels.error.message : undefined}>
          {levels.data?.map(n => <MenuItem key={n.id} value={String(n.id)}>{n.descripcion}</MenuItem>)}
        </TextField>
        <TextField select slotProps={selectSlots} label="Curso (opcional)" value={course} onChange={e => setCourse(e.target.value)} disabled={!level}
          helperText={!level ? 'Elegí primero un nivel.' : courses.isError ? courses.error.message : courses.data?.items.length === 0 ? 'No hay cursos de este nivel.' : 'Cursos de ese nivel.'}>
          <MenuItem value="">Sin curso</MenuItem>
          {courses.data?.items.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre} · {item.profesor.descripcion}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Crear alumno'}</Button></DialogActions>
    </Box>
  </Dialog>
}
