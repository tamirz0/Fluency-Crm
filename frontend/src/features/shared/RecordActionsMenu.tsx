import { ArchiveOutlined, EditOutlined, KeyOutlined, MoreHoriz, UnarchiveOutlined } from '@mui/icons-material'
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useId, useRef, useState } from 'react'

export function RecordActionsMenu({ name, active, editDisabled, onEdit, onPassword, onToggleActive }: {
  name: string
  active: boolean
  editDisabled?: boolean
  onEdit: () => void
  onPassword?: () => void
  onToggleActive: () => void
}) {
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null)
  const pendingAction = useRef<(() => void) | null>(null)
  const select = (action: () => void) => {
    pendingAction.current = action
    setAnchor(null)
  }

  return <div className="company-actions">
    <IconButton id={id} aria-label={`Opciones de ${name}`} aria-haspopup="menu"
      aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      onClick={event => setAnchor(event.currentTarget)}>
      <MoreHoriz fontSize="small" />
    </IconButton>
    <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: { className: 'company-actions-menu fluency-shell-type' },
        list: { id: `${id}-menu`, 'aria-labelledby': id },
        transition: { onExited: () => {
          const action = pendingAction.current
          pendingAction.current = null
          action?.()
        } },
      }}>
      <ListSubheader disableSticky className="company-actions-heading">Acciones</ListSubheader>
      <MenuItem disabled={editDisabled} onClick={() => select(onEdit)}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Editar</MenuItem>
      {onPassword && <MenuItem onClick={() => select(onPassword)}><ListItemIcon><KeyOutlined fontSize="small" /></ListItemIcon>Contraseña</MenuItem>}
      <Divider />
      <MenuItem className={active ? 'company-actions-remove' : undefined} onClick={() => select(onToggleActive)}>
        <ListItemIcon>{active ? <ArchiveOutlined fontSize="small" /> : <UnarchiveOutlined fontSize="small" />}</ListItemIcon>
        {active ? 'Desactivar' : 'Reactivar'}
      </MenuItem>
    </Menu>
  </div>
}
