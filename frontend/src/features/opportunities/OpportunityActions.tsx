import { ArchiveOutlined, EditOutlined, EventNote, MoreHoriz, VisibilityOutlined } from '@mui/icons-material'
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useId, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { deleteOpportunity, type Oportunidad } from '../../api/client'
import { RemoveRecordDialog } from '../shared/RemoveRecordButton'

export function OpportunityActions({ opportunity, onRemoved }: { opportunity: Oportunidad; onRemoved: () => void }) {
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [removing, setRemoving] = useState(false)
  const path = `/oportunidades/${opportunity.id}`
  const actions = opportunity.accionesPermitidas
  const close = () => setAnchor(null)

  return <div className="company-actions" onClick={event => event.stopPropagation()}>
    <IconButton id={id} aria-label={`Opciones de ${opportunity.tituloVisible}`} aria-haspopup="menu"
      aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      onClick={event => setAnchor(event.currentTarget)}>
      <MoreHoriz fontSize="small" />
    </IconButton>
    <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'company-actions-menu fluency-shell-type' }, list: { id: `${id}-menu`, 'aria-labelledby': id } }}>
      <ListSubheader disableSticky className="company-actions-heading">Opciones de oportunidad</ListSubheader>
      <MenuItem component={RouterLink} to={path} onClick={close}><ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>Ver ficha completa</MenuItem>
      {actions?.editar && <MenuItem component={RouterLink} to={`${path}/editar`} onClick={close}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Editar datos de la oportunidad</MenuItem>}
      {actions?.gestionarActividades && <MenuItem component={RouterLink} to={path}
        state={{ openActivity: true, from: { to: '/oportunidades', label: 'Volver a oportunidades' } }} onClick={close}>
        <ListItemIcon><EventNote fontSize="small" /></ListItemIcon>Crear actividad
      </MenuItem>}
      {actions?.darDeBaja && <Divider />}
      {actions?.darDeBaja && <MenuItem className="company-actions-remove" onClick={() => { close(); setRemoving(true) }}><ListItemIcon><ArchiveOutlined fontSize="small" /></ListItemIcon>Dar de baja</MenuItem>}
    </Menu>
    {actions?.darDeBaja && removing && <RemoveRecordDialog noun="oportunidad" name={opportunity.tituloVisible}
      remove={() => deleteOpportunity(Number(opportunity.id))} onClose={() => {
        setRemoving(false)
        document.getElementById(id)?.focus()
      }} onRemoved={() => { setRemoving(false); onRemoved() }} />}
  </div>
}
