import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createService, patchService, setServiceActive, getCatalogOptions, catalogQueryKeys, type Servicio, type ServicioRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

export type ServiceAction = 'create' | 'edit' | 'active'
const schema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(150, 'Máximo 150 caracteres.'),
  descripcion: z.string(),
  precioReferencia: z.string().trim().refine(v => /^\d+([.,]\d{1,2})?$/.test(v) && Number(v.replace(',', '.')) <= 9999999999.99, 'Ingresá un precio no negativo, hasta 9999999999.99 y con hasta dos decimales.'),
  duracionHoras: z.string().trim().refine(v => v === '' || /^-?\d+$/.test(v) && Number(v) >= -2147483648 && Number(v) <= 2147483647, 'Ingresá una cantidad de horas entera válida.'),
  idNivel: z.string(), idModalidad: z.string(),
})
type Values = z.infer<typeof schema>
function payload(v: Values): ServicioRequest {
  return { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null, precioReferencia: Number(v.precioReferencia.replace(',', '.')), duracionHoras: v.duracionHoras === '' ? null : Number(v.duracionHoras), idNivel: v.idNivel === '' ? null : Number(v.idNivel), idModalidad: v.idModalidad === '' ? null : Number(v.idModalidad) }
}
export function ServiceDialog({ mode, item, onClose, onSaved }: { mode: ServiceAction; item?: Servicio; onClose: () => void; onSaved: () => void }) {
  const { isLoading } = useAuth()
  const client = useQueryClient()
  const pending = useRef(false)
  const [error, setError] = useState('')
  const defaults = { nombre: item?.nombre ?? '', descripcion: item?.descripcion ?? '', precioReferencia: item ? String(item.precioReferencia) : '', duracionHoras: item?.duracionHoras == null ? '' : String(item.duracionHoras), idNivel: item?.nivel ? String(item.nivel.id) : '', idModalidad: item?.modalidad ? String(item.modalidad.id) : '' }
  const { register, control, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(schema), defaultValues: defaults })
  const levels = useQuery({ queryKey: ['catalogos', 'niveles-ingles', 'opciones'], queryFn: () => getCatalogOptions('niveles-ingles'), enabled: mode !== 'active' })
  const modalities = useQuery({ queryKey: ['catalogos', 'modalidades', 'opciones'], queryFn: () => getCatalogOptions('modalidades'), enabled: mode !== 'active' })
  const title = mode === 'create' ? 'Nuevo servicio' : mode === 'edit' ? 'Editar servicio' : item?.activo ? 'Desactivar servicio' : 'Reactivar servicio'
  const save = async (values?: Values) => {
    if (pending.current || isLoading) return
    pending.current = true; setError('')
    try {
      const body = values ? payload(values) : {}
      const baseline: ServicioRequest = item ? payload(defaults) : {}
      const patch: ServicioRequest = Object.fromEntries(Object.entries(body).filter(([key, value]) => value !== baseline[key as keyof ServicioRequest]))
      if (mode === 'edit' && !Object.keys(patch).length) { setError('No hay cambios para guardar.'); return }
      const saved = mode === 'active' ? await setServiceActive(item!.id, !item!.activo) : mode === 'create' ? await createService(body) : await patchService(item!.id, patch)
      client.setQueryData(['servicios', 'detalle', saved.id], saved)
      await client.invalidateQueries({ queryKey: ['servicios'] })
      await client.invalidateQueries({ queryKey: catalogQueryKeys.services })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.') }
    finally { pending.current = false }
  }
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="service-dialog-title">
    <DialogTitle id="service-dialog-title">{title}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { if (mode === 'active') { event.preventDefault(); void handleSubmit(() => save())(event) } else void handleSubmit(save)(event) }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {isLoading && <Alert severity="warning">Necesitamos comprobar tu sesión antes de guardar.</Alert>}
        {mode === 'active' ? <Typography>¿Confirmás {item?.activo ? 'desactivar' : 'reactivar'} «{item?.nombre}»? Los embudos existentes conservan su estado; desactivar el servicio solo impide elegirlo en nuevos embudos.</Typography> : <>
          <TextField {...register('nombre')} label="Nombre" required autoFocus disabled={isSubmitting || isLoading} error={!!errors.nombre} helperText={errors.nombre?.message} />
          <TextField {...register('descripcion')} label="Descripción" multiline minRows={2} disabled={isSubmitting || isLoading} />
          <TextField {...register('precioReferencia')} label="Precio de referencia" required slotProps={{ htmlInput: { inputMode: 'decimal' } }} disabled={isSubmitting || isLoading} error={!!errors.precioReferencia} helperText={errors.precioReferencia?.message ?? 'Importe total. Cero es válido; hasta dos decimales.'} />
          <TextField {...register('duracionHoras')} label="Duración en horas" disabled={isSubmitting || isLoading} error={!!errors.duracionHoras} helperText={errors.duracionHoras?.message} />
          {([{ field: 'idNivel', label: 'Nivel de inglés', query: levels, reference: item?.nivel }, { field: 'idModalidad', label: 'Modalidad', query: modalities, reference: item?.modalidad }] as const).map(({ field, label, query, reference }) => <Box key={field}>
            {query.error && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Reintentar {label}</Button>}>{query.error.message}</Alert>}
            <Controller name={field} control={control} render={({ field: input }) => <TextField {...input} select fullWidth label={label} disabled={isSubmitting || isLoading || query.isPending || !!query.error} helperText={query.isPending ? 'Cargando opciones…' : 'Opcional'}>
              <MenuItem value="">Sin especificar</MenuItem>
              {reference && !query.data?.some(x => x.id === reference.id) && <MenuItem value={String(reference.id)}>{reference.descripcion}{reference.activo ? '' : ' (Inactivo)'}</MenuItem>}
              {query.data?.map(x => <MenuItem key={x.id} value={String(x.id)}>{x.descripcion}</MenuItem>)}
            </TextField>} />
          </Box>)}
        </>}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button disabled={isSubmitting || isLoading || mode === 'edit' && !isDirty} type="submit" variant="contained">{isSubmitting ? 'Guardando…' : mode === 'active' ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
