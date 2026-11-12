import { useRef, useState } from 'react'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, FormHelperText, MenuItem, Radio, RadioGroup, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFunnel, patchFunnel, setFunnelActive, listServices, listServiceTypes, type Embudo, type EmbudoRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

const schema = z.object({ nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100, 'Máximo 100 caracteres.'), descripcion: z.string() })
type Values = z.infer<typeof schema>
/** Por cada tipo admitido: todos sus servicios (también los futuros) o una selección puntual. */
type Admission = Record<number, { all: boolean; serviceIds: number[] }>
const admissionOf = (item?: Embudo): Admission => Object.fromEntries((item?.tipos ?? []).map(t => [Number(t.tipo.id), { all: t.servicios.length === 0, serviceIds: t.servicios.map(s => Number(s.id)) }]))
const tiposOf = (admission: Admission): NonNullable<EmbudoRequest['tipos']> => Object.entries(admission)
  .map(([id, value]) => ({ idTipoServicio: Number(id), idServicios: value.all ? null : [...value.serviceIds].sort((a, b) => a - b) }))
  .sort((a, b) => a.idTipoServicio - b.idTipoServicio)

function ServicePicker({ typeId, typeName, item, value, onChange, disabled }: { typeId: number; typeName: string; item?: Embudo; value: number[]; onChange: (ids: number[]) => void; disabled: boolean }) {
  const services = useQuery({ queryKey: ['servicios', 'por-tipo', typeId], queryFn: () => listServices({ idTipoServicio: typeId, activo: 'true', pageSize: 100 }) })
  const options = (services.data?.items ?? []).map(s => ({ id: Number(s.id), label: s.nombre, activo: true }))
  // Los servicios ya admitidos se conservan aunque hoy estén inactivos.
  for (const kept of item?.tipos.find(t => Number(t.tipo.id) === typeId)?.servicios ?? [])
    if (!options.some(o => o.id === Number(kept.id))) options.push({ id: Number(kept.id), label: kept.descripcion ?? '', activo: !!kept.activo })
  return <Box>
    {services.error && <Alert severity="error" action={<Button onClick={() => void services.refetch()}>Reintentar servicios</Button>}>{services.error.message}</Alert>}
    <TextField select fullWidth label={`Servicios de ${typeName}`} value={value.map(String)} disabled={disabled || services.isPending || !!services.error}
      onChange={event => onChange((Array.isArray(event.target.value) ? event.target.value : [event.target.value]).map(Number))}
      slotProps={{ select: { multiple: true, MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} helperText={services.isPending ? 'Cargando servicios…' : options.length ? 'Solo estos servicios entrarán al embudo.' : `Todavía no hay servicios de ${typeName}.`}>
      {options.map(o => <MenuItem key={o.id} value={String(o.id)}>{`${o.label}${o.activo ? '' : ' (Inactivo)'}`}</MenuItem>)}
    </TextField>
    {Number(services.data?.totalCount ?? 0) > 100 && <FormHelperText>Se muestran los primeros 100 servicios.</FormHelperText>}
  </Box>
}

export function FunnelDialog({ item, active = false, onClose }: { item?: Embudo; active?: boolean; onClose: () => void }) {
  const client = useQueryClient(), pending = useRef(false)
  const { isLoading } = useAuth()
  const [error, setError] = useState('')
  const baseline = admissionOf(item)
  const [admission, setAdmission] = useState<Admission>(baseline)
  const [admissionError, setAdmissionError] = useState('')
  const defaults = { nombre: item?.nombre ?? '', descripcion: item?.descripcion ?? '' }
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: defaults })
  const types = useQuery({ queryKey: ['catalogos', 'tipos-servicio', 'con-regla'], queryFn: listServiceTypes, enabled: !active })
  const admissionChanged = JSON.stringify(tiposOf(admission)) !== JSON.stringify(tiposOf(baseline))
  // Un tipo admitido hoy inactivo se conserva en la lista, igual que sus servicios.
  const typeOptions = (types.data ?? []).filter(t => t.activo || baseline[Number(t.id)])
  const setType = (id: number, ticked: boolean) => setAdmission(a => {
    const next = { ...a }
    if (ticked) next[id] = { all: true, serviceIds: [] }
    else delete next[id]
    return next
  })
  const save = async (v?: Values) => {
    if (pending.current || isLoading) return
    if (!active && !Object.keys(admission).length) { setAdmissionError('Seleccioná al menos un tipo de servicio.'); return }
    if (!active && Object.values(admission).some(a => !a.all && !a.serviceIds.length)) { setAdmissionError('Elegí al menos un servicio o admití todos los del tipo.'); return }
    pending.current = true; setError(''); setAdmissionError('')
    try {
      const body: EmbudoRequest = v ? { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, tipos: tiposOf(admission) } : {}
      const base: EmbudoRequest = { nombre: defaults.nombre, descripcion: defaults.descripcion.trim() || null, tipos: tiposOf(baseline) }
      const patch: EmbudoRequest = Object.fromEntries(Object.entries(body).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(base[key as keyof EmbudoRequest])))
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
  const busy = isSubmitting || isLoading
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="funnel-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="funnel-title">{active ? item?.activo ? 'Desactivar embudo' : 'Reactivar embudo' : item ? 'Editar embudo' : 'Nuevo embudo'}</DialogTitle>
    <Box component="form" noValidate onSubmit={e => { if (active) { e.preventDefault(); void handleSubmit(() => save())(e) } else void handleSubmit(save)(e) }}>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {active ? <Typography>¿Confirmás {item?.activo ? 'desactivar' : 'reactivar'} «{item?.nombre}»? Sus etapas y oportunidades conservan su estado. Las oportunidades abiertas y activas impiden desactivarlo.</Typography> : <>
          <TextField {...register('nombre')} label="Nombre" autoFocus required disabled={busy} error={!!errors.nombre} helperText={errors.nombre?.message} />
          <TextField {...register('descripcion')} label="Descripción" multiline minRows={2} disabled={busy} />
          <Box component="fieldset" sx={{ border: '1px solid', borderColor: admissionError ? 'error.main' : 'divider', borderRadius: 1, p: 2, m: 0 }}>
            <Typography component="legend" variant="subtitle2" sx={{ px: 1 }}>Servicios que admite</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Las oportunidades de los servicios admitidos caen en este embudo. Un embudo con oportunidades no puede dejar de admitir sus servicios.</Typography>
            {types.error && <Alert severity="error" action={<Button onClick={() => void types.refetch()}>Reintentar tipos</Button>}>{types.error.message}</Alert>}
            {types.isPending && <Box role="status">Cargando tipos de servicio…</Box>}
            <FormGroup>
              {typeOptions.map(type => {
                const id = Number(type.id), current = admission[id]
                return <Box key={id}>
                  <FormControlLabel label={`${type.descripcion}${type.activo ? '' : ' (Inactivo)'}`} control={<Checkbox checked={!!current} disabled={busy} onChange={event => { setAdmissionError(''); setType(id, event.target.checked) }} />} />
                  {current && <Box sx={{ ml: 4, display: 'grid', gap: 1 }}>
                    <RadioGroup aria-label={`Servicios de ${type.descripcion}`} value={current.all ? 'todos' : 'algunos'} onChange={event => { setAdmissionError(''); setAdmission(a => ({ ...a, [id]: { ...a[id], all: event.target.value === 'todos' } })) }}>
                      <FormControlLabel value="todos" control={<Radio disabled={busy} />} label="Todos los servicios de este tipo (también los futuros)" />
                      <FormControlLabel value="algunos" control={<Radio disabled={busy} />} label="Solo algunos" />
                    </RadioGroup>
                    {!current.all && <ServicePicker typeId={id} typeName={type.descripcion} item={item} value={current.serviceIds} disabled={busy} onChange={ids => { setAdmissionError(''); setAdmission(a => ({ ...a, [id]: { all: false, serviceIds: ids } })) }} />}
                  </Box>}
                </Box>
              })}
            </FormGroup>
            {admissionError && <FormHelperText error role="alert">{admissionError}</FormHelperText>}
          </Box>
          {!item && <Alert severity="info">Se crearán las etapas Consulta recibida, Necesidad relevada, Nivel de inglés evaluado y Presupuesto enviado, más Ganada y Perdida. Podés editarlas, reordenarlas o agregar otras después.</Alert>}
        </>}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={busy || !active && !!item && !isDirty && !admissionChanged}>{isSubmitting ? 'Guardando…' : active ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
