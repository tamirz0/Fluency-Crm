import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { listStages, moveOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { saveErrorMessage } from '../shared/formUtils'
import type { CloseResult } from './CloseOpportunityDialog'

/**
 * Mueve una oportunidad abierta a otra etapa de su embudo. Elegir una final no mueve nada: continúa en el formulario de cierre, que
 * pide los datos obligatorios de ganar o perder. El servidor vuelve a validar propiedad, estado y destino.
 */
export function MoveStageDialog({ item, open, onClose, onDone, onCloseRequest }: {
  item: Oportunidad; open: boolean; onClose: () => void; onDone: (saved: Oportunidad) => void; onCloseRequest: (result: CloseResult) => void
}) {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const stages = useQuery({ queryKey: ['embudos', Number(item.idEmbudo), 'etapas', 'true'], queryFn: () => listStages(Number(item.idEmbudo)), enabled: open })
  const rank = (state: string) => state === 'ABIERTA' ? 0 : state === 'GANADA' ? 1 : 2
  const options = (stages.data ?? []).filter(s => s.activo && Number(s.id) !== Number(item.idEtapa)).sort((a, b) => rank(a.estado) - rank(b.estado) || Number(a.orden) - Number(b.orden))
  const finalChoice = options.find(s => String(s.id) === stage && s.estado !== 'ABIERTA')
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
      {stages.isSuccess && options.length === 0 && <Typography className="funnel-no-alternatives">No hay otras etapas disponibles en este embudo.</Typography>}
      {finalChoice
        ? <Typography className="funnel-no-alternatives">Para cerrar la oportunidad hay que indicar {finalChoice.estado === 'GANADA' ? 'la fecha y el valor final' : 'la fecha y el motivo de pérdida'}: se continúa en el formulario de cierre.</Typography>
        : <TextField label="Observación" value={note} onChange={event => setNote(event.target.value)} multiline minRows={3} fullWidth />}
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      {finalChoice
        ? <Button variant="contained" onClick={() => { const result = finalChoice.estado as CloseResult; setStage(''); setNote(''); onCloseRequest(result) }}>Continuar al cierre</Button>
        : <Button variant="contained" disabled={!stage || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Guardando…' : 'Guardar cambio'}</Button>}
    </DialogActions>
  </Dialog>
}
