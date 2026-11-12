import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { PersonAddAltOutlined, PersonOutlineOutlined } from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { opportunityQueryKeys, reassignOpportunity, type Oportunidad } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import '../shared/commercial-dialog.css'
import { saveErrorMessage } from '../shared/formUtils'

/** Reasigna una abierta. El vendedor solo ofrece vendedores; el servidor vuelve a comprobar quién puede reasignar y a quién. */
export function ReassignDialog({ item, open, onClose, onDone }: { item: Oportunidad; open: boolean; onClose: () => void; onDone: (saved: Oportunidad) => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const [responsible, setResponsible] = useState('')
  const mutation = useMutation({
    mutationFn: () => reassignOpportunity(Number(item.id), Number(responsible)),
    onSuccess: (saved) => {
      queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setResponsible('')
      onDone(saved)
    },
  })
  const close = () => { if (mutation.isPending) return; mutation.reset(); setResponsible(''); onClose() }
  const unchanged = responsible === String(item.idResponsable)
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="reassign-title" slotProps={{ paper: { className: 'commercial-dialog' } }}>
    <header className="commercial-dialog-header">
      <span className="commercial-dialog-icon" aria-hidden="true"><PersonAddAltOutlined /></span>
      <div>
        <DialogTitle id="reassign-title">Reasignar oportunidad</DialogTitle>
        <Typography className="commercial-dialog-context">{item.tituloVisible} · hoy a cargo de {item.responsableNombre}</Typography>
      </div>
    </header>
    <DialogContent className="commercial-dialog-content">
      <CompanyResponsibleSelect value={responsible} onChange={setResponsible} role={isSuperior ? undefined : 'VENDEDOR'}
        optionsClassName="commercial-dialog-options" inputIcon={<PersonOutlineOutlined />}
        helperText={isSuperior ? 'Elegí cualquier usuario activo.' : 'Solo podés reasignarla a un vendedor activo.'} />
      <Alert severity="info" variant="outlined">Después de reasignarla vas a poder consultarla, pero ya no editarla.</Alert>
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!responsible || unchanged || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Reasignando…' : 'Reasignar'}</Button>
    </DialogActions>
  </Dialog>
}
