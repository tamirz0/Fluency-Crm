import { ArchiveOutlined, DeleteOutlined } from '@mui/icons-material'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { ApiRequestError } from '../../api/client'
import './commercial-dialog.css'

type RemoveRecordProps = { noun: 'empresa' | 'contacto' | 'oportunidad' | 'actividad' | 'curso'; name: string; remove: () => Promise<void>; onRemoved: () => void }

/** Si la API bloquea la baja definitiva, muestra las causas y deja el diálogo abierto. */
export function RemoveRecordDialog({ noun, name, remove, onRemoved, onClose }: RemoveRecordProps & { onClose: () => void }) {
  const titleId = useId()
  const mutation = useMutation({ mutationFn: remove, onSuccess: onRemoved })
  const close = () => { if (!mutation.isPending) onClose() }
  const message = mutation.error instanceof ApiRequestError ? mutation.error.message : 'No pudimos dar de baja el registro. Intentá de nuevo.'
  const title = <DialogTitle id={titleId}>Dar de baja {noun === 'empresa' ? 'la empresa' : noun === 'contacto' ? 'el contacto' : noun === 'actividad' ? 'la actividad' : noun === 'curso' ? 'el curso' : 'la oportunidad'}</DialogTitle>
  return <Dialog open onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm"
    slotProps={{ paper: { className: 'commercial-dialog commercial-dialog--danger' } }}>
      <header className="commercial-dialog-header">
        <span className="commercial-dialog-icon" aria-hidden="true"><ArchiveOutlined /></span>
        {title}
      </header>
      <DialogContent className="commercial-dialog-content">
        <DialogContentText>Vas a dar de baja «{name}». La baja es definitiva y no se puede restaurar. {noun === 'oportunidad' ? 'Funciona también si está cerrada; su historial de etapas y sus actividades se conservan.' : noun === 'actividad' ? 'No modifica la oportunidad ni los clientes asociados.' : noun === 'curso' ? 'Sus alumnos siguen siendo alumnos pero quedan sin curso, y sus clases dejan de mostrarse.' : 'Las oportunidades y actividades anteriores conservan su referencia.'}</DialogContentText>
        {mutation.isError && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={close} disabled={mutation.isPending}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Dar de baja definitivamente</Button>
      </DialogActions>
    </Dialog>
}

export function RemoveRecordButton(props: RemoveRecordProps) {
  const [open, setOpen] = useState(false)
  return <>
    <Button color="error" variant="outlined" startIcon={<DeleteOutlined />} onClick={() => setOpen(true)}>Dar de baja</Button>
    {open && <RemoveRecordDialog {...props} onClose={() => setOpen(false)} />}
  </>
}
