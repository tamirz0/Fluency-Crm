import { ArchiveOutlined, EditOutlined, MoreHoriz, TrendingUp, VisibilityOutlined } from '@mui/icons-material'
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useId, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { deleteCompany, type Empresa } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { RemoveRecordDialog } from '../shared/RemoveRecordButton'

export function CompanyActions({ company, onRemoved }: { company: Empresa; onRemoved: () => void }) {
  const id = useId()
  const permissions = useAuth().user?.permisos
  const canManage = permissions?.includes('GestionarClientes')
  const canCreateOpportunity = permissions?.includes('GestionarOportunidad')
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const [removing, setRemoving] = useState(false)
  const path = `/empresas/${company.id}`
  const close = () => setAnchor(null)

  return <div className="company-actions" onClick={event => event.stopPropagation()}>
    <IconButton id={id} aria-label={`Opciones de ${company.razonSocial}`} aria-haspopup="menu"
      aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      onClick={event => setAnchor(event.currentTarget)}>
      <MoreHoriz fontSize="small" />
    </IconButton>
    <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'company-actions-menu fluency-shell-type' }, list: { id: `${id}-menu`, 'aria-labelledby': id } }}>
      <ListSubheader disableSticky className="company-actions-heading">
        Opciones de cuenta
      </ListSubheader>
      <MenuItem component={RouterLink} to={path} onClick={close}><ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>Ver ficha completa</MenuItem>
      {canManage && <MenuItem component={RouterLink} to={`${path}/editar`} onClick={close}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Editar datos de empresa</MenuItem>}
      {canCreateOpportunity && <MenuItem component={RouterLink} to={`/oportunidades/nueva?idEmpresa=${company.id}`} onClick={close}><ListItemIcon><TrendingUp fontSize="small" /></ListItemIcon>Crear oportunidad comercial</MenuItem>}
      {canManage && <Divider />}
      {canManage && <MenuItem className="company-actions-remove" onClick={() => { close(); setRemoving(true) }}><ListItemIcon><ArchiveOutlined fontSize="small" /></ListItemIcon>Dar de baja</MenuItem>}
    </Menu>
    {canManage && removing && <RemoveRecordDialog noun="empresa" name={company.razonSocial}
      remove={() => deleteCompany(Number(company.id))} onClose={() => {
        setRemoving(false)
        document.getElementById(id)?.focus()
      }} onRemoved={() => { setRemoving(false); onRemoved() }} />}
  </div>
}
