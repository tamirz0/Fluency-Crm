import { useRef, useState } from 'react'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, FormLabel, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { changeUserPassword, createUser, patchUser, setUserActive, usuarioQueryKeys, type AuthUser } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
export type UserAction = 'create' | 'edit' | 'password' | 'active'
function schema(mode: UserAction) {
  return z.object({ nombre: z.string(), apellido: z.string(), correo: z.string(), username: z.string(), roles: z.array(z.string()), password: z.string() }).superRefine((v, ctx) => {
    if (mode === 'create' || mode === 'edit') {
      for (const [field, max] of [['nombre', 100], ['apellido', 100], ['correo', 150], ['username', 50]] as const) {
        if (!v[field].trim()) ctx.addIssue({ code: 'custom', path: [field], message: 'El campo es obligatorio.' })
        if (v[field].length > max) ctx.addIssue({ code: 'custom', path: [field], message: `Máximo ${max} caracteres.` })
      }
      if (!z.email().safeParse(v.correo.trim()).success) ctx.addIssue({ code: 'custom', path: ['correo'], message: 'Ingresá un correo válido.' })
      if (!v.roles.length) ctx.addIssue({ code: 'custom', path: ['roles'], message: 'Elegí al menos un rol.' })
    }
    if ((mode === 'create' || mode === 'password') && (v.password.length < 8 || new TextEncoder().encode(v.password).length > 72)) ctx.addIssue({ code: 'custom', path: ['password'], message: 'Usá al menos 8 caracteres y hasta 72 bytes UTF-8.' })
  })
}
type Values = z.infer<ReturnType<typeof schema>>
export function UserDialog({ mode, user, roles, onClose, onSaved }: { mode: UserAction; user?: AuthUser; roles: { codigo: string; etiqueta: string }[]; onClose: () => void; onSaved: () => void }) {
  const { user: actor, refresh, isLoading } = useAuth()
  const client = useQueryClient()
  const pending = useRef(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema(mode)), defaultValues: { nombre: user?.nombre ?? '', apellido: user?.apellido ?? '', correo: user?.correo ?? '', username: user?.username ?? '', roles: user?.roles ?? [], password: '' } })
  const profile = mode === 'create' || mode === 'edit'
  const title = mode === 'create' ? 'Nuevo usuario' : mode === 'edit' ? 'Editar usuario' : mode === 'password' ? 'Cambiar contraseña' : user?.activo ? 'Desactivar usuario' : 'Reactivar usuario'
  const save = async (values: Values) => {
    if (pending.current || isLoading) return
    pending.current = true; setError('')
    try {
      const data = { nombre: values.nombre.trim(), apellido: values.apellido.trim(), correo: values.correo.trim(), username: values.username.trim(), roles: values.roles }
      if (mode === 'create') await createUser({ ...data, password: values.password })
      else if (mode === 'edit') await patchUser(user!.id, data)
      else if (mode === 'password') await changeUserPassword(user!.id, values.password)
      else await setUserActive(user!.id, !user!.activo)
      await client.invalidateQueries({ queryKey: usuarioQueryKeys.all })
      await client.invalidateQueries({ queryKey: usuarioQueryKeys.options })
      onSaved()
      if (user?.id === actor?.id) await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.') }
    finally { pending.current = false }
  }
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="user-dialog-title">
    <DialogTitle id="user-dialog-title">{title}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { void handleSubmit(save)(event) }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {isLoading && <Alert severity="warning">Necesitamos comprobar tu sesión antes de guardar. Podés cancelar y reintentar desde la pantalla.</Alert>}
        {profile && <>
          {(['nombre', 'apellido', 'correo', 'username'] as const).map((field, i) => <TextField key={field} {...register(field)} label={['Nombre', 'Apellido', 'Correo', 'Usuario'][i]} required fullWidth disabled={isSubmitting || isLoading} type={field === 'correo' ? 'email' : 'text'} autoComplete="off" error={!!errors[field]} helperText={errors[field]?.message} />)}
          <Box component="fieldset" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }} disabled={isSubmitting || isLoading}><FormLabel component="legend">Roles</FormLabel><FormGroup>{roles.map(r => <FormControlLabel key={r.codigo} label={r.etiqueta} control={<Checkbox {...register('roles')} value={r.codigo} />} />)}</FormGroup>{errors.roles && <Typography color="error" role="alert">{errors.roles.message}</Typography>}</Box>
        </>}
        {(mode === 'create' || mode === 'password') && <TextField {...register('password')} label={mode === 'password' ? 'Nueva contraseña' : 'Contraseña'} required type="password" autoComplete="new-password" disabled={isSubmitting || isLoading} error={!!errors.password} helperText={errors.password?.message ?? 'Mínimo 8 caracteres; máximo 72 bytes UTF-8.'} />}
        {mode === 'active' && <Typography>¿Confirmás {user?.activo ? 'desactivar' : 'reactivar'} a {user?.nombre} {user?.apellido}? {user?.activo && 'Perderá acceso. Sus asignaciones e historial se conservan.'}</Typography>}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button disabled={isSubmitting || isLoading} type="submit" variant="contained">{isSubmitting ? 'Guardando…' : mode === 'active' ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
