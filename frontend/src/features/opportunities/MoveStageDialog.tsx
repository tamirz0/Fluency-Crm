import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listStages, moveOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { saveErrorMessage } from '../shared/formUtils'

/**
 * Mueve una oportunidad abierta a otra etapa abierta de su embudo. Las finales no se ofrecen aquí: ganar y perder tienen su propio
 * cierre con datos obligatorios. El servidor vuelve a validar propiedad, estado y destino.
 */
export function MoveStageDialog({ item, open, onClose, onDone }: { item: Oportunidad; open: boolean; onClose: () => void; onDone: (saved: Oportunidad) => void }) {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const stages = useQuery({ queryKey: ['embudos', Number(item.idEmbudo), 'etapas', 'true'], queryFn: () => listStages(Number(item.idEmbudo)), enabled: open })
  const options = (stages.data ?? []).filter(s => s.estado === 'ABIERTA' && s.activo && Number(s.id) !== Number(item.idEtapa)).sort((a, b) => Number(a.orden) - Number(b.orden))
  const mutation = useMutation({
    mutationFn: () => moveOpportunity(Number(item.id), Number(stage), note.trim() || undefined),
    onSuccess: (saved) => {
      queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setStage(''); setNote('')
      onDone(saved)
    },
  })
  const close = () => { if (mutation.isPending) return; mutation.reset(); setStage(''); setNote(''); onClose() }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="move-stage-title">
    <DialogTitle id="move-stage-title">Cambiar etapa</DialogTitle>
    <DialogContent className="funnel-dialog-content">
      <Typography className="funnel-selected-title">{item.tituloVisible}: hoy en {item.etapaNombre}.</Typography>
      <TextField select fullWidth required label="Nueva etapa" value={stage} onChange={event => setStage(event.target.value)} disabled={stages.isPending || stages.isError || options.length === 0}>
        {options.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nombre}</MenuItem>)}
      </TextField>
      {stages.isError && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void stages.refetch()}>Reintentar</Button>}>No pudimos cargar las etapas del embudo.</Alert>}
      {stages.isSuccess && options.length === 0 && <Typography className="funnel-no-alternatives">No hay otras etapas abiertas disponibles en este embudo.</Typography>}
      <TextField label="Observación" value={note} onChange={event => setNote(event.target.value)} multiline minRows={3} fullWidth />
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!stage || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Guardando…' : 'Guardar cambio'}</Button>
    </DialogActions>
  </Dialog>
}
