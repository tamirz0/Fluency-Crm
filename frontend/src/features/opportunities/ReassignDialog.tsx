import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { opportunityQueryKeys, reassignOpportunity, type Oportunidad } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
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
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="reassign-title">
    <DialogTitle id="reassign-title">Reasignar oportunidad</DialogTitle>
    <DialogContent>
      <Typography sx={{ mb: 2 }}>{item.tituloVisible}: hoy a cargo de {item.responsableNombre}.</Typography>
      <CompanyResponsibleSelect value={responsible} onChange={setResponsible} role={isSuperior ? undefined : 'VENDEDOR'}
        helperText={isSuperior ? 'Elegí cualquier usuario activo.' : 'Solo podés reasignarla a un vendedor activo.'} />
      <Typography color="text.secondary" sx={{ mt: 2 }}>Después de reasignarla vas a poder consultarla, pero ya no editarla.</Typography>
      {mutation.isError && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!responsible || unchanged || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Reasignando…' : 'Reasignar'}</Button>
    </DialogActions>
  </Dialog>
}
