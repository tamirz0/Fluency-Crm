import { Fragment, useState, type ReactNode } from 'react'
import { Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { Business, CalendarMonth, Contacts, Dashboard, MenuBook, School, Groups, Event, Logout, Menu, Timeline, ViewKanban, ManageAccounts, Settings } from '@mui/icons-material'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { canUseAcademy, canUseCommercial } from './navigation'

const drawerWidth = 260
const navigationItemSx = {
  position: 'relative',
  mb: .5,
  borderRadius: 1,
  color: 'text.secondary',
  transition: 'background-color 160ms ease, color 160ms ease',
  '& .MuiListItemIcon-root': { transition: 'color 160ms ease, transform 160ms ease' },
  '&.active': {
    color: 'primary.main',
    bgcolor: 'rgba(98,189,181,.12)',
    fontWeight: 700,
    '&::before': { content: '""', position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', bgcolor: 'primary.main' },
    '& .MuiListItemIcon-root': { color: 'primary.main', transform: 'scale(1.06)' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
  },
  '&:hover': { bgcolor: 'rgba(231,239,241,.06)' },
  '&.Mui-focusVisible': { outline: '2px solid #8adbd3', outlineOffset: 2 },
} as const

type NavEntry = { to: string; label: string; icon: ReactNode; end?: boolean }
function NavItem({ to, label, icon, end, onNavigate }: NavEntry & { onNavigate?: () => void }) {
  return <ListItemButton component={NavLink} to={to} end={end} onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{icon}</ListItemIcon><ListItemText primary={label} /></ListItemButton>
}

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth()
  const [closing, setClosing] = useState(false)
  const fullName = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
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
  return <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
    <Box sx={{ px: 3, py: 3.25 }}><Typography sx={{ color: 'text.primary', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Fluency CRM</Typography></Box>
    <Divider />
    <List sx={{ px: 1.5, py: 2 }} aria-label="Navegación principal">
      <NavItem to="/inicio" end label="Inicio" icon={<Dashboard fontSize="small" />} onNavigate={onNavigate} />
      {groups.map(group => <Fragment key={group.title}>
        <Box component="li" role="presentation" aria-label={group.title} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, mt: 2, mb: 1, listStyle: 'none' }}>
          <Divider sx={{ flex: 1 }} />
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'text.secondary' }}>{group.title}</Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>
        {group.items.map(item => <NavItem key={item.to} {...item} onNavigate={onNavigate} />)}
      </Fragment>)}
    </List>
    <Box sx={{ mt: 'auto', p: 2.25 }}><Divider sx={{ mb: 2 }} /><Typography component={NavLink} to="/perfil" onClick={onNavigate} aria-label={`Mi perfil (${fullName})`} sx={{ display: 'block', mb: 1.25, color: 'text.secondary', fontSize: '.95rem', textDecoration: 'none', '&:hover, &.active': { color: 'text.primary', textDecoration: 'underline' } }}>{fullName}</Typography><Button color="inherit" fullWidth startIcon={<Logout />} disabled={closing} onClick={async () => { if (closing) return; setClosing(true); try { await logout() } finally { setClosing(false) } }} sx={{ justifyContent: 'flex-start', color: 'text.primary' }}>Cerrar sesión</Button></Box>
  </Box>
}
export function AuthenticatedShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileDrawer = () => setMobileOpen(false)
  return <Box sx={{ display: 'flex', minHeight: '100svh', bgcolor: 'background.default' }}>
    <Box component="nav" aria-label="Secciones de Fluency CRM">
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0, bgcolor: '#101C28' } }}><NavigationContent /></Drawer>
      <Drawer open={mobileOpen} onClose={closeMobileDrawer} variant="temporary" sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#101C28' } }}><NavigationContent onNavigate={closeMobileDrawer} /></Drawer>
    </Box>
    <Box component="main" sx={{ width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}><Toolbar sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}><IconButton aria-label="Abrir navegación" edge="start" onClick={() => setMobileOpen(true)}><Menu /></IconButton><Typography sx={{ ml: 1, color: 'text.primary', fontWeight: 700 }}>Fluency CRM</Typography></Toolbar><Outlet /></Box>
  </Box>
}
