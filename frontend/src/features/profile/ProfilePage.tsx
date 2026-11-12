import { useState } from 'react'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTeacherLevels, patchMyProfile, setTeacherLevels, type AuthUser } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { roleLabels } from '../../app/navigation'
import { ProfileHeader, ProfileRows } from '../shared/RecordProfile'
import { AcademyDetailPage } from '../shared/AcademyDetailPage'
import '../companies/companies.css'
import '../contacts/records.css'
import '../shared/academy-pages.css'

/** El profesor marca los niveles de inglés con los que trabaja; solo puede abrir cursos de esos niveles. */
function TeacherLevels() {
  const client = useQueryClient()
  const levels = useQuery({ queryKey: ['profesor', 'niveles'], queryFn: getTeacherLevels })
  const [draft, setDraft] = useState<number[] | null>(null)
  const save = useMutation({ mutationFn: setTeacherLevels, onSuccess: data => { client.setQueryData(['profesor', 'niveles'], data); setDraft(null) } })
  if (levels.isPending) return <CircularProgress size={24} aria-label="Cargando niveles" />
  if (levels.isError) return <Alert severity="error">No pudimos cargar tus niveles. {levels.error.message}</Alert>
  const selected = draft ?? levels.data.seleccionados.map(Number)
  const toggle = (id: number) => setDraft(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  return <section className="profile-section" aria-labelledby="teacher-levels-title">
    <Typography id="teacher-levels-title" component="h2" variant="h6">Mis niveles de inglés</Typography>
    <Typography color="text.secondary" sx={{ mb: 1 }}>Marcá los niveles con los que trabajás. Solo podés abrir cursos de esos niveles.</Typography>
    <FormGroup row aria-label="Niveles de inglés">{levels.data.disponibles.map(level => <FormControlLabel key={level.id} label={level.descripcion} control={<Checkbox checked={selected.includes(Number(level.id))} onChange={() => toggle(Number(level.id))} />} />)}</FormGroup>
    {save.isError && <Alert severity="error" sx={{ mt: 1 }}>{save.error.message}</Alert>}
    {save.isSuccess && draft === null && <Alert severity="success" sx={{ mt: 1 }}>Niveles guardados.</Alert>}
    <Button sx={{ mt: 2 }} variant="contained" disabled={draft === null || save.isPending} onClick={() => save.mutate(selected)}>Guardar niveles</Button>
  </section>
}

/** Edición de los datos de la cuenta: cualquier usuario edita los suyos; roles, estado y contraseña los gestiona un administrador. */
function EditAccountDialog({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { refresh } = useAuth()
  const initial = { nombre: user.nombre, apellido: user.apellido, correo: user.correo, username: user.username }
  const [form, setForm] = useState(initial)
  const [touched, setTouched] = useState(false)
  const save = useMutation({
    mutationFn: () => patchMyProfile({ nombre: form.nombre.trim(), apellido: form.apellido.trim(), correo: form.correo.trim(), username: form.username.trim() }),
    onSuccess: async () => { await refresh(); onClose() },
  })
  const errors = {
    nombre: form.nombre.trim() ? '' : 'Ingresá tu nombre.', apellido: form.apellido.trim() ? '' : 'Ingresá tu apellido.',
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()) ? '' : 'Ingresá un correo válido.', username: form.username.trim() ? '' : 'Ingresá tu usuario.',
  }
  const invalid = Object.values(errors).some(Boolean)
  const changed = (Object.keys(initial) as (keyof typeof initial)[]).some(key => form[key].trim() !== initial[key])
  const fields: [keyof typeof initial, string, number][] = [['nombre', 'Nombre', 100], ['apellido', 'Apellido', 100], ['correo', 'Correo', 150], ['username', 'Usuario', 50]]
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="edit-account-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="edit-account-title">Editar mis datos</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); setTouched(true); if (!invalid && changed && !save.isPending) save.mutate() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        {fields.map(([key, label, max], index) => <TextField key={key} label={label} value={form[key]} autoFocus={index === 0} onChange={event => setForm(f => ({ ...f, [key]: event.target.value }))} required slotProps={{ htmlInput: { maxLength: max } }} error={touched && !!errors[key]} helperText={touched ? errors[key] : undefined} />)}
      </DialogContent>
      <DialogActions>
        <Button disabled={save.isPending} onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={save.isPending || !changed}>{save.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
      </DialogActions>
    </Box>
  </Dialog>
}

/** Perfil: datos de la sesión del servidor, editables por su dueño. */
export function ProfilePage() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  if (!user) return null
  return <AcademyDetailPage>
    <article className="profile-sheet" aria-label="Mi perfil">
      <ProfileHeader name={`${user.nombre} ${user.apellido}`.trim()} subtitle="Mi perfil" actions={<Button variant="contained" onClick={() => setEditing(true)}>Editar mis datos</Button>} />
      <ProfileRows rows={[
        { label: 'Usuario', value: user.username },
        { label: 'Correo', value: user.correo },
        { label: 'Roles', value: <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{user.roles.map(role => <Chip key={role} size="small" label={roleLabels[role] ?? role} />)}</Box> },
      ]} />
    </article>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Datos de tu cuenta. Podés editarlos; la contraseña y los roles los gestiona un administrador.</Typography>
    {user.roles.includes('PROFESOR') && <TeacherLevels />}
    {editing && <EditAccountDialog key={`${user.nombre}|${user.apellido}|${user.correo}|${user.username}`} user={user} onClose={() => setEditing(false)} />}
  </AcademyDetailPage>
}
