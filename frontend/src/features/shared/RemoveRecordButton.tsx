import { DeleteOutlined } from '@mui/icons-material'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiRequestError } from '../../api/client'

/** Baja definitiva de una empresa o un contacto; si la API la bloquea (409) muestra las causas y deja el diálogo abierto. */
export function RemoveRecordButton({ noun, name, remove, onRemoved }: { noun: 'empresa' | 'contacto'; name: string; remove: () => Promise<void>; onRemoved: () => void }) {
  const [open, setOpen] = useState(false)
  const mutation = useMutation({ mutationFn: remove, onSuccess: onRemoved })
  const close = () => { if (!mutation.isPending) { setOpen(false); mutation.reset() } }
  const message = mutation.error instanceof ApiRequestError ? mutation.error.message : 'No pudimos dar de baja el registro. Intentá de nuevo.'
  return <>
    <Button color="error" variant="outlined" startIcon={<DeleteOutlined />} onClick={() => setOpen(true)}>Dar de baja</Button>
    <Dialog open={open} onClose={close} aria-labelledby="remove-record-title">
      <DialogTitle id="remove-record-title">Dar de baja {noun === 'empresa' ? 'la empresa' : 'el contacto'}</DialogTitle>
      <DialogContent>
        <DialogContentText>Vas a dar de baja «{name}». La baja es definitiva y no se puede restaurar. Las oportunidades y actividades anteriores conservan su referencia.</DialogContentText>
        {mutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Dar de baja definitivamente</Button>
      </DialogActions>
    </Dialog>
  </>
}
