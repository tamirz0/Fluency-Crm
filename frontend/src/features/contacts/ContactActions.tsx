import { ArchiveOutlined, EditOutlined, MoreHoriz, MoreVert, TrendingUp, VisibilityOutlined } from '@mui/icons-material'
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useId, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { deleteContact, type Contacto } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { QuickOpportunityDialog } from '../opportunities/QuickOpportunityButton'
import { contactFullName, contactNaturalName } from '../shared/display'
import { RemoveRecordDialog } from '../shared/RemoveRecordButton'

export function ContactActions({ contact, onRemoved, inDetail = false }: { contact: Contacto; onRemoved: () => void; inDetail?: boolean }) {
  const id = useId()
  const permissions = useAuth().user?.permisos
  const location = useLocation()
  const canManage = permissions?.includes('GestionarClientes')
  const canCreateOpportunity = permissions?.includes('GestionarOportunidad')
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [removing, setRemoving] = useState(false)
  const [creating, setCreating] = useState(false)
  const path = `/contactos/${contact.id}`
  const name = contactFullName(contact)
  const close = () => setAnchor(null)

  if (inDetail && !canManage) return null

  return <div className="company-actions" onClick={event => event.stopPropagation()}>
    <IconButton id={id} aria-label={`Opciones de ${name}`} aria-haspopup="menu"
      aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      onClick={event => setAnchor(event.currentTarget)}>
      {inDetail ? <MoreVert fontSize="small" /> : <MoreHoriz fontSize="small" />}
    </IconButton>
    <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'company-actions-menu fluency-shell-type' }, list: { id: `${id}-menu`, 'aria-labelledby': id } }}>
      <ListSubheader disableSticky className="company-actions-heading">{inDetail ? 'Opciones del contacto' : 'Opciones de contacto'}</ListSubheader>
      {!inDetail && <MenuItem component={RouterLink} to={path} onClick={close}><ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>Ver ficha completa</MenuItem>}
      {!inDetail && canManage && <MenuItem component={RouterLink} to={`${path}/editar`} state={{ contactFormBackground: location }} onClick={close}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Editar datos del contacto</MenuItem>}
      {!inDetail && canCreateOpportunity && <MenuItem onClick={() => { close(); setCreating(true) }}><ListItemIcon><TrendingUp fontSize="small" /></ListItemIcon>Crear oportunidad comercial</MenuItem>}
      {!inDetail && canManage && <Divider />}
      {canManage && <MenuItem className="company-actions-remove" onClick={() => { close(); setRemoving(true) }}><ListItemIcon><ArchiveOutlined fontSize="small" /></ListItemIcon>Dar de baja</MenuItem>}
    </Menu>
    {canCreateOpportunity && creating && <QuickOpportunityDialog idContacto={Number(contact.id)} {...(contact.idEmpresa == null ? {} : { idEmpresa: Number(contact.idEmpresa) })}
      idOrigen={contact.origenActivo === false ? null : contact.idOrigen} label={contactNaturalName(contact)}
      onClose={() => { setCreating(false); document.getElementById(id)?.focus() }} />}
    {canManage && removing && <RemoveRecordDialog noun="contacto" name={name}
      remove={() => deleteContact(Number(contact.id))} onClose={() => {
        setRemoving(false)
        document.getElementById(id)?.focus()
      }} onRemoved={() => { setRemoving(false); onRemoved() }} />}
  </div>
}
