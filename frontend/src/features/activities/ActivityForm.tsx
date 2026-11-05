import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createActivity, getCatalogOptions, type CreateActividadRequest } from '../../api/client'
import { saveErrorMessage } from '../shared/formUtils'

/** Asociaciones que la ficha ya conoce: el editor las envía sin pedir repetirlas. */
export type ActivityContext = { idEmpresa?: number; idContacto?: number; idOportunidad?: number; label: string }

const pad = (value: number) => String(value).padStart(2, '0')
const nowLocal = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}` }

/**
 * Registra una interacción ya realizada: tipo activo, cuándo ocurrió, descripción y resultado opcional. El autor y la fecha de
 * registro los fija el servidor, que además vuelve a comprobar permisos y asociaciones.
 */
export function ActivityDialog({ context, open, onClose, onDone }: { context: ActivityContext; open: boolean; onClose: () => void; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState('')
  const [occurred, setOccurred] = useState(nowLocal)
  const [description, setDescription] = useState('')
  const [result, setResult] = useState('')
  const [errors, setErrors] = useState<{ type?: string; date?: string; description?: string }>({})
  const types = useQuery({ queryKey: ['catalogos', 'tipos-actividad'], queryFn: () => getCatalogOptions('tipos-actividad'), enabled: open })
  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateActividadRequest = {
        idTipo: Number(type), fechaHora: new Date(occurred).toISOString(), descripcion: description.trim(),
        ...(context.idEmpresa === undefined ? {} : { idEmpresa: context.idEmpresa }),
        ...(context.idContacto === undefined ? {} : { idContacto: context.idContacto }),
        ...(context.idOportunidad === undefined ? {} : { idOportunidad: context.idOportunidad }),
        ...(result.trim() ? { resultado: result.trim() } : {}),
      }
      return createActivity(body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['actividades'] })
      setType(''); setDescription(''); setResult(''); setOccurred(nowLocal()); setErrors({})
      onDone()
    },
  })
  const close = () => { if (mutation.isPending) return; mutation.reset(); setErrors({}); onClose() }
  // Se valida al enviar (no durante el render): la fecha no puede ser futura porque son hechos ya realizados.
  const submit = () => {
    const when = occurred ? new Date(occurred) : undefined
    const next = {
      type: type ? undefined : 'Elegí el tipo de actividad.',
      date: !when || Number.isNaN(when.getTime()) ? 'Ingresá cuándo ocurrió.' : when.getTime() > Date.now() + 5 * 60_000 ? 'La actividad ya debe haber ocurrido: la fecha no puede ser futura.' : undefined,
      description: description.trim() ? undefined : 'Describí qué pasó.',
    }
    setErrors(next)
    if (!next.type && !next.date && !next.description) mutation.mutate()
  }
  const { type: typeError, date: dateError, description: descriptionError } = errors
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="activity-title">
    <DialogTitle id="activity-title">Registrar actividad</DialogTitle>
    <DialogContent className="funnel-dialog-content">
      <Typography className="funnel-selected-title">{context.label}</Typography>
      <TextField select fullWidth required label="Tipo de actividad" value={type} onChange={event => setType(event.target.value)} error={Boolean(typeError)} helperText={typeError} disabled={types.isPending || types.isError}>
        {(types.data ?? []).map(option => <MenuItem key={option.id} value={String(option.id)}>{option.descripcion}</MenuItem>)}
      </TextField>
      {types.isError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void types.refetch()}>Reintentar</Button>}>No pudimos cargar los tipos de actividad.</Alert>}
      <TextField label="Cuándo ocurrió" type="datetime-local" required fullWidth value={occurred} onChange={event => setOccurred(event.target.value)} error={Boolean(dateError)}
        helperText={dateError ?? 'Podés registrar algo de ayer: guardamos aparte cuándo la cargás.'} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Descripción" required fullWidth multiline minRows={3} value={description} onChange={event => setDescription(event.target.value)} error={Boolean(descriptionError)} helperText={descriptionError} />
      <TextField label="Resultado" fullWidth multiline minRows={2} value={result} onChange={event => setResult(event.target.value)} helperText="Opcional. Podés completarlo después." />
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? 'Guardando…' : 'Registrar actividad'}</Button>
    </DialogActions>
  </Dialog>
}

/** Botón + editor listos para montar en las fichas de empresa, contacto y oportunidad. */
export function RegisterActivityButton({ context, onRegistered }: { context: ActivityContext; onRegistered?: () => void }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="outlined" onClick={() => setOpen(true)}>Registrar actividad</Button>
    <ActivityDialog context={context} open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onRegistered?.() }} />
  </>
}
