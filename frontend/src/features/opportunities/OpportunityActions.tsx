import { ArchiveOutlined, EditOutlined, EventNote, FlagOutlined, HistoryOutlined, MoreHoriz, PersonOutlined, SwapHoriz, VisibilityOutlined } from '@mui/icons-material'
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useId, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { deleteOpportunity, type Oportunidad } from '../../api/client'
import { RemoveRecordDialog } from '../shared/RemoveRecordButton'

type DetailActions = { move: () => void; close: () => void; reopen: () => void; reassign: () => void }

export function OpportunityActions({ opportunity, onRemoved, detail }: { opportunity: Oportunidad; onRemoved: () => void; detail?: DetailActions }) {
  const id = useId()
  const location = useLocation()
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [removing, setRemoving] = useState(false)
  const path = `/oportunidades/${opportunity.id}`
  const actions = opportunity.accionesPermitidas
  const close = () => setAnchor(null)
  const from = { to: `/oportunidades${location.search}`, label: 'Volver a oportunidades' }
  const commands = detail ? [
    { allowed: actions.mover, run: detail.move, icon: SwapHoriz, label: 'Cambiar etapa' },
    { allowed: actions.cerrar, run: detail.close, icon: FlagOutlined, label: 'Cerrar oportunidad' },
    { allowed: actions.reabrir, run: detail.reopen, icon: HistoryOutlined, label: 'Reabrir oportunidad' },
    { allowed: actions.reasignar, run: detail.reassign, icon: PersonOutlined, label: 'Reasignar' },
  ].filter(command => command.allowed) : []
  if (detail && !commands.length && !actions.darDeBaja) return null

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
      {!detail && <MenuItem component={RouterLink} to={path} state={{ from }} onClick={close}><ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>Ver ficha completa</MenuItem>}
      {!detail && actions?.editar && <MenuItem component={RouterLink} to={`${path}/editar`} state={{ from, opportunityFormBackground: location }} onClick={close}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Editar datos de la oportunidad</MenuItem>}
      {!detail && actions?.gestionarActividades && <MenuItem component={RouterLink} to={path}
        state={{ openActivity: true, from }} onClick={close}>
        <ListItemIcon><EventNote fontSize="small" /></ListItemIcon>Crear actividad
      </MenuItem>}
      {commands.map(({ run, icon: Icon, label }) => <MenuItem key={label} onClick={() => { close(); run() }}><ListItemIcon><Icon fontSize="small" /></ListItemIcon>{label}</MenuItem>)}
      {actions?.darDeBaja && (!detail || commands.length > 0) && <Divider />}
      {actions?.darDeBaja && <MenuItem className="company-actions-remove" onClick={() => { close(); setRemoving(true) }}><ListItemIcon><ArchiveOutlined fontSize="small" /></ListItemIcon>Dar de baja</MenuItem>}
    </Menu>
    {actions?.darDeBaja && removing && <RemoveRecordDialog noun="oportunidad" name={opportunity.tituloVisible}
      remove={() => deleteOpportunity(Number(opportunity.id))} onClose={() => {
        setRemoving(false)
        document.getElementById(id)?.focus()
      }} onRemoved={() => { setRemoving(false); onRemoved() }} />}
  </div>
}
