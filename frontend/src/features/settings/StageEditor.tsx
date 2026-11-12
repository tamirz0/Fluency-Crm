import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createStage, patchStage, setStageActive, listFunnels, type Embudo, type EtapaConfiguracion, type EtapaRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

const stageOrder = z.string().trim().refine(v => /^-?\d+$/.test(v) && Number(v) >= -2147483648 && Number(v) <= 2147483647, 'Ingresá un orden entero válido.')
const schema = z.object({ nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100, 'Máximo 100 caracteres.'), descripcion: z.string(), orden: stageOrder, idEmbudo: z.string().min(1, 'Elegí un embudo.') })
type Values = z.infer<typeof schema>
export function StageEditor({ funnel, item, active = false, nextOrder, onClose }: { funnel: Embudo; item?: EtapaConfiguracion; active?: boolean; nextOrder: number; onClose: () => void }) {
  const client = useQueryClient(), pending = useRef(false)
  const { isLoading } = useAuth()
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1)
  const [pickedFunnel, setPickedFunnel] = useState(funnel)
  const isFinal = !!item && item.estado !== 'ABIERTA'
  const defaults = { nombre: item?.nombre ?? '', descripcion: item?.descripcion ?? '', orden: String(item?.orden ?? nextOrder), idEmbudo: String(item?.idEmbudo ?? funnel.id) }
  const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: defaults })
  const funnels = useQuery({ queryKey: ['embudos', 'opciones', search, page], queryFn: () => listFunnels({ q: search, activo: 'todos', page, pageSize: 25 }), enabled: !!item && !isFinal && !active })
  const save = async (v?: Values) => {
    if (pending.current || isLoading) return
    pending.current = true; setError('')
    try {
      const body: EtapaRequest = v ? { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, ...(!isFinal ? { orden: item ? Number(v.orden) : nextOrder } : {}), ...(item && !isFinal ? { idEmbudo: Number(v.idEmbudo) } : {}) } : {}
      const baseline: EtapaRequest = { nombre: defaults.nombre, descripcion: defaults.descripcion.trim() || null, orden: Number(defaults.orden), idEmbudo: Number(defaults.idEmbudo) }
      const patch: EtapaRequest = Object.fromEntries(Object.entries(body).filter(([key, value]) => value !== baseline[key as keyof EtapaRequest]))
      if (item && !active && !Object.keys(patch).length) { setError('No hay cambios para guardar.'); return }
      if (active) await setStageActive(Number(item!.id), !item!.activo)
      else if (item) await patchStage(Number(item.id), patch)
      else await createStage(Number(funnel.id), body)
      await client.invalidateQueries({ queryKey: ['etapas'] }); await client.invalidateQueries({ queryKey: ['embudos'] }); onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.')
      await client.invalidateQueries({ queryKey: ['etapas'] }); await client.invalidateQueries({ queryKey: ['embudos'] })
    } finally { pending.current = false }
  }
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="stage-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="stage-title">{active ? item?.activo ? 'Desactivar etapa abierta' : 'Reactivar etapa abierta' : item ? 'Editar etapa' : 'Nueva etapa abierta'}</DialogTitle>
    <Box component="form" noValidate onSubmit={e => { if (active) { e.preventDefault(); void handleSubmit(() => save())(e) } else void handleSubmit(save)(e) }}>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {active ? <Typography>¿Confirmás {item?.activo ? 'desactivar' : 'reactivar'} «{item?.nombre}»? Las oportunidades abiertas y activas en ella impiden la baja. Reactivar la coloca al final del orden activo y conserva las oportunidades dadas de baja.</Typography> : <>
          <TextField {...register('nombre')} label="Nombre" autoFocus required disabled={isSubmitting || isLoading} error={!!errors.nombre} helperText={errors.nombre?.message} />
          <TextField {...register('descripcion')} label="Descripción" multiline minRows={2} disabled={isSubmitting || isLoading} />
          {item && !isFinal && <TextField {...register('orden')} label="Orden" required disabled={isSubmitting || isLoading} error={!!errors.orden} helperText={errors.orden?.message ?? 'Único entre activas. Para intercambiar posiciones, arrastrá las etapas en la lista y usá Guardar orden.'} />}
          {!item && errors.orden && <Alert severity="error">No hay un orden válido disponible al final del embudo.</Alert>}
          {item && !isFinal && <>
            <TextField label="Buscar embudos" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} disabled={isSubmitting} />
            {funnels.error && <Alert severity="error" action={<Button onClick={() => void funnels.refetch()}>Reintentar embudos</Button>}>{funnels.error.message}</Alert>}
            <Controller name="idEmbudo" control={control} render={({ field }) => <TextField {...field} onChange={e => { field.onChange(e); const selected = funnels.data?.items.find(f => String(f.id) === e.target.value); if (selected) setPickedFunnel(selected) }} select label="Embudo" disabled={isSubmitting || isLoading} helperText="Solo una etapa nunca utilizada puede cambiar de embudo."
              slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }}>
              {!funnels.data?.items.some(f => f.id === pickedFunnel.id) && <MenuItem value={String(pickedFunnel.id)}>{pickedFunnel.nombre}{pickedFunnel.activo ? '' : ' (Inactivo)'}</MenuItem>}
              {funnels.data?.items.map(f => <MenuItem key={f.id} value={String(f.id)}>{f.nombre}{f.activo ? '' : ' (Inactivo)'}</MenuItem>)}
            </TextField>} />
            <Box><Button disabled={page === 1 || isSubmitting} onClick={() => setPage(p => p - 1)}>Embudos anteriores</Button><Button disabled={!funnels.data || page * 25 >= Number(funnels.data.totalCount) || isSubmitting} onClick={() => setPage(p => p + 1)}>Más embudos</Button></Box>
          </>}
          {isFinal && <Alert severity="info">Esta etapa del sistema conserva su estado, embudo y orden; permanece activa. Podés editar su nombre y descripción.</Alert>}
        </>}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={isSubmitting || isLoading || !active && !!item && !isDirty}>{isSubmitting ? 'Guardando…' : active ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
