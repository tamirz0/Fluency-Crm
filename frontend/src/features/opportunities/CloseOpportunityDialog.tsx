import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getCatalogOptions, loseOpportunity, opportunityQueryKeys, winOpportunity, type Oportunidad } from '../../api/client'
import { saveErrorMessage } from '../shared/formUtils'

export type CloseResult = 'GANADA' | 'PERDIDA'

const maxValue = 9999999999.99
const parseValue = (text: string) => Number(text.trim().replace(',', '.'))
const validValue = (text: string) => /^\d+([.,]\d{1,2})?$/.test(text.trim()) && parseValue(text) <= maxValue
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }

/**
 * Cierra una abierta como ganada (fecha y valor final, cero válido) o perdida (fecha y motivo activo). Es el único camino a las
 * etapas finales: el movimiento entre etapas no las admite. Si el resultado ya viene decidido (arrastre o etapa final elegida) se muestra fijo; el cierre
 * genérico lo pide. El servidor vuelve a validar permiso, estado y datos.
 */
export function CloseOpportunityDialog({ item, initialResult, open, onClose, onDone }: {
  item: Oportunidad; initialResult?: CloseResult; open: boolean; onClose: () => void; onDone: (saved: Oportunidad) => void
}) {
  const queryClient = useQueryClient()
  const [result, setResult] = useState<CloseResult | ''>(initialResult ?? '')
  const [date, setDate] = useState(today)
  const [value, setValue] = useState(() => String(item.valor).replace('.', ','))
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const reasons = useQuery({ queryKey: ['catalogos', 'motivos-perdida'], queryFn: () => getCatalogOptions('motivos-perdida'), enabled: open && result === 'PERDIDA' })
  const mutation = useMutation({
    mutationFn: () => {
      const observacion = note.trim() || undefined
      return result === 'GANADA'
        ? winOpportunity(Number(item.id), { fechaCierre: date, valor: parseValue(value), ...(observacion ? { observacion } : {}) })
        : loseOpportunity(Number(item.id), { fechaCierre: date, idMotivoPerdida: Number(reason), ...(observacion ? { observacion } : {}) })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      onDone(saved)
    },
  })
  const close = () => { if (mutation.isPending) return; mutation.reset(); setSubmitted(false); onClose() }
  const dateError = submitted && !date ? 'Ingresá la fecha de cierre.' : undefined
  const valueError = submitted && result === 'GANADA' && !validValue(value) ? 'Ingresá un importe entre 0 y 9999999999,99 con hasta dos decimales.' : undefined
  const reasonError = submitted && result === 'PERDIDA' && !reason ? 'Elegí el motivo de pérdida.' : undefined
  const submit = () => {
    setSubmitted(true)
    if (!result || !date || (result === 'GANADA' && !validValue(value)) || (result === 'PERDIDA' && !reason)) return
    mutation.mutate()
  }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="close-opportunity-title">
    <DialogTitle id="close-opportunity-title">Cerrar oportunidad</DialogTitle>
    <DialogContent className="funnel-dialog-content">
      <Typography className="funnel-selected-title">{item.tituloVisible}</Typography>
      {initialResult
        ? <Typography>Resultado: <strong>{initialResult === 'GANADA' ? 'Ganada' : 'Perdida'}</strong></Typography>
        : <TextField select fullWidth required label="Resultado" value={result} onChange={event => setResult(event.target.value as CloseResult)} disabled={mutation.isPending}>
          <MenuItem value="GANADA">Ganada</MenuItem>
          <MenuItem value="PERDIDA">Perdida</MenuItem>
        </TextField>}
      <TextField label="Fecha de cierre" type="date" required fullWidth value={date} onChange={event => setDate(event.target.value)} error={Boolean(dateError)} helperText={dateError}
        slotProps={{ inputLabel: { shrink: true } }} />
      {result === 'GANADA' && <TextField label="Valor final" required fullWidth value={value} onChange={event => setValue(event.target.value)} error={Boolean(valueError)}
        helperText={valueError ?? 'Podés ingresar 0.'} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />}
      {result === 'PERDIDA' && <>
        <TextField select fullWidth required label="Motivo de pérdida" value={reason} onChange={event => setReason(event.target.value)} error={Boolean(reasonError)} helperText={reasonError} disabled={reasons.isPending || reasons.isError}>
          {(reasons.data ?? []).map(option => <MenuItem key={option.id} value={String(option.id)}>{option.descripcion}</MenuItem>)}
        </TextField>
        {reasons.isError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void reasons.refetch()}>Reintentar</Button>}>No pudimos cargar los motivos de pérdida.</Alert>}
        {reasons.isSuccess && reasons.data.length === 0 && <Alert severity="info">No hay motivos de pérdida activos. Pedile a un administrador que configure uno.</Alert>}
      </>}
      <TextField label="Observación" value={note} onChange={event => setNote(event.target.value)} multiline minRows={3} fullWidth />
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!result || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Cerrando…' : 'Cerrar oportunidad'}</Button>
    </DialogActions>
  </Dialog>
}
