import { HistoryOutlined } from '@mui/icons-material'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listStages, opportunityQueryKeys, reopenOpportunity, type Oportunidad } from '../../api/client'
import { saveErrorMessage } from '../shared/formUtils'
import '../shared/commercial-dialog.css'

/**
 * Reabre una cerrada en una etapa abierta activa de su embudo (solo superiores; el servidor lo vuelve a comprobar). El cierre anterior
 * queda registrado en el historial junto con la justificación, y el valor se mantiene. No hace falta reasignar un responsable inactivo.
 */
export function ReopenOpportunityDialog({ item, open, onClose, onDone }: { item: Oportunidad; open: boolean; onClose: () => void; onDone: (saved: Oportunidad) => void }) {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const stages = useQuery({ queryKey: ['embudos', Number(item.idEmbudo), 'etapas', 'true'], queryFn: () => listStages(Number(item.idEmbudo)), enabled: open && item.embudoActivo })
  const options = (stages.data ?? []).filter(s => s.estado === 'ABIERTA' && s.activo).sort((a, b) => Number(a.orden) - Number(b.orden))
  const mutation = useMutation({
    mutationFn: () => reopenOpportunity(Number(item.id), { idEtapa: Number(stage), justificacion: reason.trim() }),
    onSuccess: (saved) => {
      queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setStage(''); setReason(''); setSubmitted(false)
      onDone(saved)
    },
  })
  const close = () => { if (mutation.isPending) return; mutation.reset(); setSubmitted(false); onClose() }
  const reasonError = submitted && !reason.trim() ? 'Escribí la justificación de la reapertura.' : undefined
  const submit = () => { setSubmitted(true); if (stage && reason.trim()) mutation.mutate() }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="reopen-title" slotProps={{ paper: { className: 'commercial-dialog' } }}>
    <header className="commercial-dialog-header">
      <span className="commercial-dialog-icon" aria-hidden="true"><HistoryOutlined /></span>
      <div>
        <DialogTitle id="reopen-title">Reabrir oportunidad</DialogTitle>
        <Typography className="commercial-dialog-context">{item.tituloVisible} · {item.etapaNombre}</Typography>
      </div>
    </header>
    <DialogContent className="commercial-dialog-content">
      <Typography color="text.secondary">El cierre anterior queda en el historial y el valor se mantiene. El responsable y el servicio actuales no hace falta cambiarlos.</Typography>
      {!item.embudoActivo && <Alert severity="warning">El embudo «{item.embudoNombre}» está inactivo: reactivalo desde la configuración antes de reabrir esta oportunidad.</Alert>}
      <TextField select fullWidth required label="Etapa de destino" value={stage} onChange={event => setStage(event.target.value)} disabled={!item.embudoActivo || stages.isPending || stages.isError || options.length === 0}
        slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'commercial-dialog-options' } } } } }}>
        {options.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nombre}</MenuItem>)}
      </TextField>
      {item.embudoActivo && stages.isError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void stages.refetch()}>Reintentar</Button>}>No pudimos cargar las etapas del embudo.</Alert>}
      {item.embudoActivo && stages.isSuccess && options.length === 0 && <Alert severity="warning">El embudo no tiene etapas abiertas activas: configurá una antes de reabrir.</Alert>}
      <TextField label="Justificación" required fullWidth multiline minRows={3} value={reason} onChange={event => setReason(event.target.value)} error={Boolean(reasonError)} helperText={reasonError} />
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!stage || !item.embudoActivo || mutation.isPending} onClick={submit}>{mutation.isPending ? 'Reabriendo…' : 'Reabrir oportunidad'}</Button>
    </DialogActions>
  </Dialog>
}
