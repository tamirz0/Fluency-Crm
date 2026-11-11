import { useId, useState, type ReactNode } from 'react'
import { Avatar, Box, ButtonBase, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu as AccountMenu, MenuItem, Toolbar, Typography } from '@mui/material'
import { Business, CalendarMonth, Contacts, Dashboard, ExpandMore, PersonOutlined, MenuBook, School, Groups, Event, Logout, Menu, Timeline, ViewKanban, ManageAccounts, Settings } from '@mui/icons-material'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import unlamLogo from '../assets/unlam.png'
import { useAuth } from '../auth/useAuth'
import { canUseAcademy, canUseCommercial, roleLabels } from './navigation'
import './shell.css'

const drawerWidth = 240
const navigationItemSx = {
  position: 'relative',
  mb: .25,
  minHeight: 32,
  py: .25,
  borderRadius: 1,
  color: 'text.secondary',
  transition: 'background-color 160ms ease, color 160ms ease',
  '& .MuiListItemIcon-root': { transition: 'color 160ms ease, transform 160ms ease' },
  '&.active': {
    color: 'primary.light',
    bgcolor: 'rgba(69,117,178,.25)',
    fontWeight: 700,
    '& .MuiListItemIcon-root': { color: 'primary.light' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
  },
  '&:hover': { bgcolor: 'rgba(231,239,241,.06)' },
  '&.Mui-focusVisible': { outline: '2px solid var(--accent-text)', outlineOffset: 2 },
} as const

type NavEntry = { to: string; label: string; icon: ReactNode; end?: boolean }
function NavItem({ to, label, icon, end, onNavigate }: NavEntry & { onNavigate?: () => void }) {
  return <ListItemButton component={NavLink} to={to} end={end} onClick={onNavigate} sx={{ ...navigationItemSx, px: 1.25 }}><ListItemIcon sx={{ minWidth: 28, color: 'inherit', '& svg': { fontSize: 17 } }}>{icon}</ListItemIcon><ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: 13 } } }} /></ListItemButton>
}

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const canCommercial = canUseCommercial(user)
  const canAcademy = canUseAcademy(user)
  const isAdmin = !!user?.roles?.includes('ADMINISTRADOR')
  const canConfigure = isAdmin && !!user?.permisos?.includes('AdministrarConfiguracion')
  const home = { to: '/inicio', label: 'Inicio', end: true, icon: <Dashboard fontSize="small" /> }
  // Los tres tipos conservan el orden de siempre; un tipo sin entradas visibles no se muestra.
  const groups: { title: string; items: NavEntry[] }[] = [
    { title: 'Comercial', items: canCommercial ? [
      home,
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
  return <Box className="fluency-shell-type" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <Box sx={{ px: 2.5, minHeight: 64, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box component="img" className="fluency-unlam-logo" src={unlamLogo} alt="UNLaM" />
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>Fluency</Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: '#b8bec9' }}>Academia y CRM</Typography>
      </Box>
    </Box>
    <List sx={{ px: 1.5, py: 1 }} aria-label="Navegación principal">
      {!canCommercial && <Box component="li"><NavItem {...home} onNavigate={onNavigate} /></Box>}
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
      onClick={() => setGroup({ pathname, open: !group.open })} sx={{ ...navigationItemSx, width: '100%', minHeight: 30, px: 1 }}>
      <ListItemText primary={title} slotProps={{ primary: { sx: { fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' } } }} />
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
  const initials = [user?.nombre, user?.apellido].map(part => Array.from(part?.trim() ?? '')[0] ?? '').join('').toLocaleUpperCase('es')
  return <>
    <ButtonBase id={id} aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? `${id}-menu` : undefined}
      aria-label={fullName ? `Cuenta de ${fullName}` : 'Cuenta'}
      sx={{ minHeight: 48, maxWidth: { xs: 'min(220px, 59vw)', sm: 320 }, px: 1, gap: 1.5, borderRadius: 1,
        justifyContent: 'flex-start', '&:hover, &[aria-expanded="true"]': { bgcolor: 'action.hover' } }}
      onClick={event => setAnchor(event.currentTarget)}>
      <Avatar aria-hidden="true" sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: '#2563eb33', border: '1px solid #3b82f64d', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
        {initials || <PersonOutlined fontSize="small" />}
      </Avatar>
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography component="span" noWrap sx={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{fullName || 'Cuenta'}</Typography>
        {!!user?.roles?.length && <Typography component="span" noWrap sx={{ display: 'block', fontSize: 10, color: '#94a3b8' }}>
          {user.roles.map(role => roleLabels[role] ?? role).join(' · ')}
        </Typography>}
      </Box>
      <ExpandMore fontSize="small" sx={{ flexShrink: 0, color: 'text.secondary', ml: { sm: .5 } }} />
    </ButtonBase>
    <AccountMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} transitionDuration={180}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { mt: .75, minWidth: 200, maxWidth: 280 } }, list: { id: `${id}-menu`, 'aria-labelledby': id } }}>
      <ListSubheader disableSticky sx={{ py: 1, overflowWrap: 'anywhere' }}>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 700 }}>{fullName || 'Cuenta'}</Typography>
        {user?.roles?.length ? <Typography variant="body2" color="text.secondary">{user.roles.map(role => roleLabels[role] ?? role).join(' · ')}</Typography> : null}
      </ListSubheader>
      <MenuItem component={NavLink} to="/perfil" onClick={() => setAnchor(null)} sx={{ minHeight: 44 }}><ListItemIcon><PersonOutlined fontSize="small" /></ListItemIcon>Mi perfil</MenuItem>
      <Divider role="separator" />
      <MenuItem disabled={closing} onClick={async () => {
        if (closing) return
        setClosing(true)
        try { await logout() } finally { setClosing(false); setAnchor(null) }
      }} sx={{ minHeight: 44 }}><ListItemIcon><Logout fontSize="small" /></ListItemIcon>{closing ? 'Cerrando sesión…' : 'Cerrar sesión'}</MenuItem>
    </AccountMenu>
  </>
}

export function AuthenticatedShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const breadcrumb = pathname === '/inicio' ? 'Inicio' : pathname === '/empresas' ? 'Comercial / Empresas' : null
  const closeMobileDrawer = () => setMobileOpen(false)
  const drawerPaper = { width: drawerWidth, bgcolor: 'background.paper', borderColor: 'divider' }
  return <Box sx={{ display: 'flex', minHeight: '100svh', bgcolor: 'background.default' }}>
    <Box component="nav" aria-label="Secciones de Fluency CRM">
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': drawerPaper }}><NavigationContent /></Drawer>
      <Drawer open={mobileOpen} onClose={closeMobileDrawer} variant="temporary" sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': drawerPaper }}><NavigationContent onNavigate={closeMobileDrawer} /></Drawer>
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, ml: { md: `${drawerWidth}px` } }}>
      <Toolbar component="header" className="fluency-shell-type" sx={{ justifyContent: 'space-between', borderBottom: '1px solid', borderColor: '#1e293b', bgcolor: '#0e131f', px: { sm: 4 }, position: 'sticky', top: 0, zIndex: 2 }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="Abrir navegación" edge="start" onClick={() => setMobileOpen(true)}><Menu /></IconButton>
          <Typography sx={{ fontWeight: 750 }}>Fluency</Typography>
        </Box>
        {breadcrumb && <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 12, color: '#94a3b8' }}>
          <Box component="span" sx={{ color: '#e2e8f0', fontWeight: 600 }}>Fluency</Box> / {breadcrumb}
        </Typography>}
        <Box sx={{ ml: 'auto' }}><Account /></Box>
      </Toolbar>
      <Box component="main"><Outlet /></Box>
    </Box>
  </Box>
}
