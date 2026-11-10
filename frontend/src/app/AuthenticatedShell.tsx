import { useId, useState, type ReactNode } from 'react'
import { Box, Button, Collapse, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu as AccountMenu, MenuItem, Toolbar, Typography } from '@mui/material'
import { Business, CalendarMonth, Contacts, Dashboard, ExpandMore, AccountCircle, MenuBook, School, Groups, Event, Logout, Menu, Timeline, ViewKanban, ManageAccounts, Settings } from '@mui/icons-material'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { canUseAcademy, canUseCommercial } from './navigation'

const drawerWidth = 224
const navigationItemSx = {
  position: 'relative',
  mb: .25,
  minHeight: 40,
  py: .25,
  borderRadius: 1,
  color: 'text.secondary',
  transition: 'background-color 160ms ease, color 160ms ease',
  '& .MuiListItemIcon-root': { transition: 'color 160ms ease, transform 160ms ease' },
  '&.active': {
    color: 'primary.light',
    bgcolor: 'rgba(69,117,178,.18)',
    fontWeight: 700,
    '&::before': { content: '""', position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', bgcolor: 'primary.light' },
    '& .MuiListItemIcon-root': { color: 'primary.light', transform: 'scale(1.06)' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
  },
  '&:hover': { bgcolor: 'rgba(231,239,241,.06)' },
  '&.Mui-focusVisible': { outline: '2px solid var(--accent-text)', outlineOffset: 2 },
} as const

type NavEntry = { to: string; label: string; icon: ReactNode; end?: boolean }
function NavItem({ to, label, icon, end, onNavigate }: NavEntry & { onNavigate?: () => void }) {
  return <ListItemButton component={NavLink} to={to} end={end} onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{icon}</ListItemIcon><ListItemText primary={label} /></ListItemButton>
}

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const canCommercial = canUseCommercial(user)
  const canAcademy = canUseAcademy(user)
  const isAdmin = !!user?.roles?.includes('ADMINISTRADOR')
  const canConfigure = isAdmin && !!user?.permisos?.includes('AdministrarConfiguracion')
  // Los tres tipos conservan el orden de siempre; un tipo sin entradas visibles no se muestra.
  const groups: { title: string; items: NavEntry[] }[] = [
    { title: 'Comercial', items: canCommercial ? [
      { to: '/empresas', label: 'Empresas', icon: <Business fontSize="small" /> }, { to: '/contactos', label: 'Contactos', icon: <Contacts fontSize="small" /> },
      { to: '/oportunidades', label: 'Oportunidades', icon: <Timeline fontSize="small" /> }, { to: '/embudo', label: 'Embudo', icon: <ViewKanban fontSize="small" /> }] : [] },
    { title: 'Academia', items: canAcademy ? [
      { to: '/alumnos', label: 'Alumnos', icon: <School fontSize="small" /> }, { to: '/cursos', label: 'Cursos', icon: <MenuBook fontSize="small" /> },
      { to: '/clases', label: 'Clases', icon: <CalendarMonth fontSize="small" /> }, { to: '/talleres', label: 'Talleres', icon: <Event fontSize="small" /> },
      ...(isAdmin ? [{ to: '/profesores', label: 'Profesores', icon: <Groups fontSize="small" /> }] : [])] : [] },
    { title: 'Gestión', items: [
      ...(user?.permisos?.includes('AdministrarUsuarios') ? [{ to: '/configuracion/usuarios', label: 'Usuarios', icon: <ManageAccounts fontSize="small" /> }] : []),
      ...(canConfigure ? [{ to: '/configuracion/catalogos', label: 'Catálogos', icon: <Settings fontSize="small" /> }, { to: '/configuracion/servicios', label: 'Servicios', icon: <Settings fontSize="small" /> },
        { to: '/configuracion/embudos', label: 'Embudos y etapas', icon: <Settings fontSize="small" /> }] : [])] },
  ].filter(group => group.items.length > 0)
  return <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <Typography sx={{ px: 3, py: 1.5, fontSize: '1.45rem', fontWeight: 750, letterSpacing: '-.04em' }}>Fluency</Typography>
    <List sx={{ px: 1.5, py: 1 }} aria-label="Navegación principal">
      <Box component="li"><NavItem to="/inicio" end label="Inicio" icon={<Dashboard fontSize="small" />} onNavigate={onNavigate} /></Box>
      {groups.map(group => <NavigationGroup key={group.title} {...group} onNavigate={onNavigate} />)}
    </List>
  </Box>
}

function NavigationGroup({ title, items, onNavigate }: { title: string; items: NavEntry[]; onNavigate?: () => void }) {
  const id = useId()
  const { pathname } = useLocation()
  const active = items.some(({ to }) => pathname === to || pathname.startsWith(to + '/'))
  const [group, setGroup] = useState({ pathname, open: true })
  if (group.pathname !== pathname) setGroup({ pathname, open: active || group.open })
  return <Box component="li" sx={{ mt: .75 }}>
    <ListItemButton component="button" type="button" aria-expanded={group.open} aria-controls={id}
      onClick={() => setGroup({ pathname, open: !group.open })} sx={{ ...navigationItemSx, width: '100%', minHeight: 40 }}>
      <ListItemText primary={title} slotProps={{ primary: { sx: { fontSize: '.9rem', fontWeight: 700 } } }} />
      <ExpandMore fontSize="small" sx={{ transform: group.open ? 'rotate(180deg)' : undefined, transition: 'transform 180ms ease' }} />
    </ListItemButton>
    <Collapse in={group.open} timeout={180} id={id}>
      <Box inert={!group.open}>{items.map(item => <NavItem key={item.to} {...item} onNavigate={onNavigate} />)}</Box>
    </Collapse>
  </Box>
}

function Account() {
  const { logout, user } = useAuth()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [closing, setClosing] = useState(false)
  const id = useId()
  const fullName = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
  return <>
    <Button id={id} color="inherit" aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      aria-label={fullName ? `Cuenta de ${fullName}` : 'Cuenta'} startIcon={<AccountCircle />} endIcon={<ExpandMore />}
      onClick={event => setAnchor(event.currentTarget)}>{fullName || 'Cuenta'}</Button>
    <AccountMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} transitionDuration={180}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ list: { id: `${id}-menu`, 'aria-labelledby': id } }}>
      <MenuItem component={NavLink} to="/perfil" onClick={() => setAnchor(null)}>Mi perfil</MenuItem>
      <MenuItem disabled={closing} onClick={async () => {
        if (closing) return
        setClosing(true)
        try { await logout() } finally { setClosing(false); setAnchor(null) }
      }}><Logout fontSize="small" sx={{ mr: 1 }} />{closing ? 'Cerrando sesión…' : 'Cerrar sesión'}</MenuItem>
    </AccountMenu>
  </>
}

export function AuthenticatedShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileDrawer = () => setMobileOpen(false)
  const drawerPaper = { width: drawerWidth, bgcolor: 'background.paper', borderColor: 'divider' }
  return <Box sx={{ display: 'flex', minHeight: '100svh', bgcolor: 'background.default' }}>
    <Box component="nav" aria-label="Secciones de Fluency CRM">
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': drawerPaper }}><NavigationContent /></Drawer>
      <Drawer open={mobileOpen} onClose={closeMobileDrawer} variant="temporary" sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': drawerPaper }}><NavigationContent onNavigate={closeMobileDrawer} /></Drawer>
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, ml: { md: `${drawerWidth}px` } }}>
      <Toolbar component="header" sx={{ justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="Abrir navegación" edge="start" onClick={() => setMobileOpen(true)}><Menu /></IconButton>
          <Typography sx={{ fontWeight: 750 }}>Fluency</Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}><Account /></Box>
      </Toolbar>
      <Box component="main"><Outlet /></Box>
    </Box>
  </Box>
}
