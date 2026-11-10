import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOpportunity, listFunnels, listServices, opportunityQueryKeys, type CreateOportunidadRequest } from '../../api/client'
import { confirmationFor, saveErrorMessage } from '../shared/formUtils'

/**
 * Alta rápida desde la ficha de una empresa o un contacto: solo se elige el servicio. El embudo se deriva de él (se pregunta únicamente
 * si lo admiten varios embudos activos) y el servidor completa etapa inicial, responsable y valor. El resto se edita desde la ficha.
 */
function QuickOpportunityDialog({ idEmpresa, idContacto, label, onClose }: { idEmpresa?: number; idContacto?: number; label: string; onClose: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pickedService, setPickedService] = useState('')
  const [pickedFunnel, setPickedFunnel] = useState('')
  const servicesQuery = useQuery({ queryKey: ['servicios', 'opciones', 'activos'], queryFn: () => listServices({ activo: 'true', pageSize: 100 }) })
  const services = servicesQuery.data?.items ?? []
  const service = pickedService || (services.length === 1 ? String(services[0].id) : '')
  const funnels = useQuery({ queryKey: ['embudos', 'opciones', service], queryFn: () => listFunnels({ idServicio: Number(service), pageSize: 100 }), enabled: service !== '' })
  const serviceFunnels = (funnels.data?.items ?? []).filter(item => item.activo)
  const funnelId = serviceFunnels.length === 1 ? String(serviceFunnels[0].id) : pickedFunnel
  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateOportunidadRequest = { idEmbudo: Number(funnelId), idServicio: Number(service) }
      if (idEmpresa !== undefined) payload.idEmpresa = idEmpresa
      if (idContacto !== undefined) payload.idContacto = idContacto
      return createOpportunity(payload)
    },
    onSuccess: saved => {
      queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      navigate(`/oportunidades/${saved.id}`, { state: { confirmation: confirmationFor('Oportunidad', 'creada') } })
    },
  })
  const close = () => { if (!mutation.isPending) onClose() }
  const serviceName = (item: { nombre?: string | null; descripcion?: string | null }) => item.nombre ?? item.descripcion ?? ''
  return <Dialog open onClose={close} fullWidth maxWidth="xs" aria-labelledby="quick-opportunity-title">
    <DialogTitle id="quick-opportunity-title">Nueva oportunidad</DialogTitle>
    <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
      <Typography color="text.secondary">Para {label}. Elegí el servicio; el resto se completa solo y después podés editarlo.</Typography>
      {servicesQuery.isError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void servicesQuery.refetch()}>Reintentar</Button>}>No pudimos cargar los servicios.</Alert>}
      {funnels.isError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void funnels.refetch()}>Reintentar</Button>}>No pudimos cargar los embudos.</Alert>}
      {servicesQuery.isSuccess && services.length === 0 && <Alert severity="warning">No hay servicios activos para crear oportunidades. Pedile a un administrador que configure uno.</Alert>}
      {funnels.isSuccess && serviceFunnels.length === 0 && <Alert severity="warning">Ningún embudo activo admite este servicio. Pedile a un administrador que lo configure.</Alert>}
      <TextField select fullWidth required label="Servicio" value={service} onChange={event => { setPickedService(event.target.value); setPickedFunnel('') }} disabled={servicesQuery.isPending || services.length === 0}>
        {services.map(item => <MenuItem key={item.id} value={String(item.id)}>{serviceName(item)}</MenuItem>)}
      </TextField>
      {serviceFunnels.length > 1 && <TextField select fullWidth required label="Embudo" value={pickedFunnel} onChange={event => setPickedFunnel(event.target.value)}>
        {serviceFunnels.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
      </TextField>}
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!funnelId || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Creando…' : 'Crear oportunidad'}</Button>
    </DialogActions>
  </Dialog>
}

export function QuickOpportunityButton({ idEmpresa, idContacto, label }: { idEmpresa?: number; idContacto?: number; label: string }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="outlined" onClick={() => setOpen(true)}>Nueva oportunidad</Button>
    {open && <QuickOpportunityDialog idEmpresa={idEmpresa} idContacto={idContacto} label={label} onClose={() => setOpen(false)} />}
  </>
}
