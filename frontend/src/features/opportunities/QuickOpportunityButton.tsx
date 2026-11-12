import { Add, PersonOutlineOutlined, TrendingUpOutlined } from '@mui/icons-material'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { createOpportunity, listFunnels, listServices, opportunityQueryKeys, type CreateOportunidadRequest } from '../../api/client'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { confirmationFor, saveErrorMessage } from '../shared/formUtils'
import { ReadOnlyValue } from '../shared/ReadOnlyValue'
import '../shared/commercial-dialog.css'

const selectSlots = { select: { MenuProps: { slotProps: { paper: { className: 'commercial-dialog-options' } } } } }

/**
 * Alta rápida desde la ficha de una empresa o un contacto: solo se elige el servicio. El embudo se deriva de él (se pregunta únicamente
 * si lo admiten varios embudos activos) y el servidor completa etapa inicial y valor. El origen se hereda del cliente (si está activo) y
 * el responsable es quien crea, salvo que un superior elija a otro. El resto se edita desde la ficha.
 */
export function QuickOpportunityDialog({ idEmpresa, idContacto, idOrigen, label, onClose }: { idEmpresa?: number; idContacto?: number; idOrigen?: number | string | null; label: string; onClose: () => void }) {
  const { user } = useAuth()
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const ownName = user ? `${user.nombre} ${user.apellido}`.trim() : ''
  const [responsible, setResponsible] = useState(user ? String(user.id) : '')
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
      // Algunas bases locales todavía exigen un título explícito.
      const payload: CreateOportunidadRequest = {
        idEmbudo: Number(funnelId), idServicio: Number(service),
        titulo: label.trim().slice(0, 100).trimEnd() || 'Nueva oportunidad',
      }
      if (idEmpresa !== undefined) payload.idEmpresa = idEmpresa
      if (idContacto !== undefined) payload.idContacto = idContacto
      if (idOrigen != null) payload.idOrigen = Number(idOrigen)
      if (isSuperior && responsible !== '' && responsible !== String(user?.id)) payload.idResponsable = Number(responsible)
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
  return <Dialog open onClose={close} fullWidth maxWidth="xs" aria-labelledby="quick-opportunity-title" slotProps={{ paper: { className: 'commercial-dialog' } }}>
    <header className="commercial-dialog-header">
      <span className="commercial-dialog-icon" aria-hidden="true"><TrendingUpOutlined /></span>
      <div>
        <DialogTitle id="quick-opportunity-title">Nueva oportunidad</DialogTitle>
        <Typography className="commercial-dialog-context">{label}</Typography>
      </div>
    </header>
    <DialogContent className="commercial-dialog-content">
      <Typography className="commercial-dialog-context">Elegí el servicio. Podés editar los datos de la oportunidad después de crearla.</Typography>
      {servicesQuery.isError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void servicesQuery.refetch()}>Reintentar</Button>}>No pudimos cargar los servicios.</Alert>}
      {funnels.isError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void funnels.refetch()}>Reintentar</Button>}>No pudimos cargar los embudos.</Alert>}
      {servicesQuery.isSuccess && services.length === 0 && <Alert severity="warning">No hay servicios activos para crear oportunidades. Pedile a un administrador que configure uno.</Alert>}
      {funnels.isSuccess && serviceFunnels.length === 0 && <Alert severity="warning">Ningún embudo activo admite este servicio. Pedile a un administrador que lo configure.</Alert>}
      <TextField select fullWidth required label="Servicio" value={service} onChange={event => { setPickedService(event.target.value); setPickedFunnel(''); mutation.reset() }} disabled={mutation.isPending || servicesQuery.isPending || services.length === 0} slotProps={selectSlots}>
        {services.map(item => <MenuItem key={item.id} value={String(item.id)}>{serviceName(item)}</MenuItem>)}
      </TextField>
      {serviceFunnels.length > 1 && <TextField select fullWidth required label="Embudo" value={pickedFunnel} onChange={event => { setPickedFunnel(event.target.value); mutation.reset() }} disabled={mutation.isPending} slotProps={selectSlots}>
        {serviceFunnels.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
      </TextField>}
      {isSuperior
        ? <CompanyResponsibleSelect value={responsible} onChange={value => { setResponsible(value); mutation.reset() }} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" inputIcon={<PersonOutlineOutlined />} current={user ? { id: user.id, nombre: ownName, activo: true } : undefined} helperText="Por defecto, vos." />
        : <ReadOnlyValue label="Responsable" value={ownName} description="Se asignará a tu usuario." icon={<PersonOutlineOutlined />} />}
      {mutation.isError && <Alert severity="error" role="alert">{saveErrorMessage(mutation.error)}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
      <Button variant="contained" disabled={!funnelId || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Creando…' : 'Crear oportunidad'}</Button>
    </DialogActions>
  </Dialog>
}

export function QuickOpportunityButton({ idEmpresa, idContacto, idOrigen, label, primary = false }: { idEmpresa?: number; idContacto?: number; idOrigen?: number | string | null; label: string; primary?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant={primary ? 'contained' : 'outlined'} startIcon={primary ? <Add /> : undefined} onClick={() => setOpen(true)}>Nueva oportunidad</Button>
    {open && <QuickOpportunityDialog idEmpresa={idEmpresa} idContacto={idContacto} idOrigen={idOrigen} label={label} onClose={() => setOpen(false)} />}
  </>
}
