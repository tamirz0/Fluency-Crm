import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFunnel, patchFunnel, setFunnelActive, listServices, type Embudo, type EmbudoRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

const schema = z.object({ nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100, 'Máximo 100 caracteres.'), descripcion: z.string(), idServicio: z.string().min(1, 'Elegí un servicio.') })
type Values = z.infer<typeof schema>
export function FunnelDialog({ item, active = false, onClose }: { item?: Embudo; active?: boolean; onClose: () => void }) {
  const client = useQueryClient(), pending = useRef(false)
  const { isLoading } = useAuth()
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1)
  const [pickedService, setPickedService] = useState(item?.servicio)
  const defaults = { nombre: item?.nombre ?? '', descripcion: item?.descripcion ?? '', idServicio: item ? String(item.servicio.id) : '' }
  const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: defaults })
  const services = useQuery({ queryKey: ['servicios', 'opciones', search, page], queryFn: () => listServices({ q: search, page, pageSize: 25 }), enabled: !active })
  const save = async (v?: Values) => {
    if (pending.current || isLoading) return
    pending.current = true; setError('')
    try {
      const body: EmbudoRequest = v ? { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, idServicio: Number(v.idServicio) } : {}
      const baseline: EmbudoRequest = { nombre: defaults.nombre, descripcion: defaults.descripcion.trim() || null, idServicio: Number(defaults.idServicio) }
      const patch: EmbudoRequest = Object.fromEntries(Object.entries(body).filter(([key, value]) => value !== baseline[key as keyof EmbudoRequest]))
      if (item && !active && !Object.keys(patch).length) { setError('No hay cambios para guardar.'); return }
      if (active) await setFunnelActive(Number(item!.id), !item!.activo)
      else if (item) await patchFunnel(Number(item.id), patch)
      else await createFunnel(body)
      await client.invalidateQueries({ queryKey: ['embudos'] }); onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.')
      await client.invalidateQueries({ queryKey: ['embudos'] })
    } finally { pending.current = false }
  }
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="funnel-title">
    <DialogTitle id="funnel-title">{active ? item?.activo ? 'Desactivar embudo' : 'Reactivar embudo' : item ? 'Editar embudo' : 'Nuevo embudo'}</DialogTitle>
    <Box component="form" noValidate onSubmit={e => { if (active) { e.preventDefault(); void handleSubmit(() => save())(e) } else void handleSubmit(save)(e) }}>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {active ? <Typography>¿Confirmás {item?.activo ? 'desactivar' : 'reactivar'} «{item?.nombre}»? Sus etapas y oportunidades conservan su estado. Las oportunidades abiertas y activas impiden desactivarlo.</Typography> : <>
          <TextField {...register('nombre')} label="Nombre" autoFocus required disabled={isSubmitting || isLoading} error={!!errors.nombre} helperText={errors.nombre?.message} />
          <TextField {...register('descripcion')} label="Descripción" multiline minRows={2} disabled={isSubmitting || isLoading} />
          <TextField label="Buscar servicios" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} disabled={isSubmitting} />
          {services.error && <Alert severity="error" action={<Button onClick={() => void services.refetch()}>Reintentar servicios</Button>}>{services.error.message}</Alert>}
          <Controller name="idServicio" control={control} render={({ field }) => <TextField {...field} onChange={e => { field.onChange(e); const selected = services.data?.items.find(s => String(s.id) === e.target.value); if (selected) setPickedService({ id: selected.id, descripcion: selected.nombre, activo: selected.activo }) }} select label="Servicio" required disabled={isSubmitting || isLoading || !item && (services.isPending || !!services.error)} error={!!errors.idServicio} helperText={errors.idServicio?.message ?? (services.isPending ? 'Cargando servicios…' : 'Un embudo utilizado conserva su servicio.')}>
            <MenuItem value="">Elegir servicio</MenuItem>
            {pickedService && !services.data?.items.some(s => s.id === pickedService.id) && <MenuItem value={String(pickedService.id)}>{pickedService.descripcion}{pickedService.activo ? '' : ' (Inactivo)'}</MenuItem>}
            {services.data?.items.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nombre}</MenuItem>)}
          </TextField>} />
          <Box><Button disabled={page === 1 || isSubmitting} onClick={() => setPage(p => p - 1)}>Servicios anteriores</Button><Button disabled={!services.data || page * 25 >= Number(services.data.totalCount) || isSubmitting} onClick={() => setPage(p => p + 1)}>Más servicios</Button></Box>
          {!item && <Alert severity="info">Se crearán Ganada y Perdida. Podés agregar las etapas abiertas después.</Alert>}
        </>}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={isSubmitting || isLoading || !active && !!item && !isDirty}>{isSubmitting ? 'Guardando…' : active ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
