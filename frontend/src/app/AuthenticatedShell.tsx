import { useState } from 'react'
import { Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { Business, Contacts, Dashboard, Logout, Menu, Timeline, ViewKanban, ManageAccounts, Settings } from '@mui/icons-material'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const drawerWidth = 260
const navigationItemSx = {
  position: 'relative',
  mb: .5,
  px: 1.5,
  borderRadius: '10px',
  color: 'text.secondary',
  transition: 'background-color 140ms ease, color 140ms ease',
  '& .MuiListItemIcon-root': { transition: 'color 140ms ease' },
  '&.active': {
    color: 'var(--accent-strong)',
    bgcolor: 'var(--accent-soft)',
    fontWeight: 700,
    '& .MuiListItemIcon-root': { color: 'var(--accent)' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
  },
  '&:hover': { bgcolor: 'rgba(234, 240, 244, .05)', color: 'text.primary' },
  '&.active:hover': { bgcolor: 'var(--accent-soft)', color: 'var(--accent-strong)' },
  '&.Mui-focusVisible': { outline: '2px solid var(--accent-strong)', outlineOffset: 2 },
} as const

function NavigationContent({ onNavigate, commercial }: { onNavigate?: () => void; commercial: boolean }) {
  const { logout, user } = useAuth()
  const [closing, setClosing] = useState(false)
  const fullName = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
  return <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 3 }}><Box aria-hidden sx={{ display: 'grid', width: 34, height: 34, placeItems: 'center', borderRadius: '10px', bgcolor: 'var(--accent)', color: '#06201D', fontSize: '1.1rem', fontWeight: 800 }}>F</Box><Typography sx={{ color: 'text.primary', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Fluency CRM</Typography></Box>
    <Divider />
    <List sx={{ px: 1.5, py: 2 }} aria-label="Navegación principal">
      <ListItemButton component={NavLink} to="/inicio" end onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Dashboard fontSize="small" /></ListItemIcon><ListItemText primary="Inicio" /></ListItemButton>
      <ListItemButton component={NavLink} to="/empresas" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Business fontSize="small" /></ListItemIcon><ListItemText primary="Empresas" /></ListItemButton>
      <ListItemButton component={NavLink} to="/contactos" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Contacts fontSize="small" /></ListItemIcon><ListItemText primary="Contactos" /></ListItemButton>
      {commercial && <>
      <ListItemButton component={NavLink} to="/oportunidades" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Timeline fontSize="small" /></ListItemIcon><ListItemText primary="Oportunidades" /></ListItemButton>
      <ListItemButton component={NavLink} to="/embudo" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><ViewKanban fontSize="small" /></ListItemIcon><ListItemText primary="Embudo" /></ListItemButton>
    </>}
      {user?.permisos?.includes('AdministrarUsuarios') && <ListItemButton component={NavLink} to="/configuracion/usuarios" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><ManageAccounts fontSize="small" /></ListItemIcon><ListItemText primary="Usuarios" /></ListItemButton>}
      {user?.roles?.includes('ADMINISTRADOR') && user.permisos?.includes('AdministrarConfiguracion') && <ListItemButton component={NavLink} to="/configuracion/catalogos" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Settings fontSize="small" /></ListItemIcon><ListItemText primary="Catálogos" /></ListItemButton>}
      {user?.roles?.includes('ADMINISTRADOR') && user.permisos?.includes('AdministrarConfiguracion') && <ListItemButton component={NavLink} to="/configuracion/servicios" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Settings fontSize="small" /></ListItemIcon><ListItemText primary="Servicios" /></ListItemButton>}
      {user?.roles?.includes('ADMINISTRADOR') && user.permisos?.includes('AdministrarConfiguracion') && <ListItemButton component={NavLink} to="/configuracion/embudos" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Settings fontSize="small" /></ListItemIcon><ListItemText primary="Embudos y etapas" /></ListItemButton>}
    </List>
    <Box sx={{ mt: 'auto', p: 2.25 }}><Divider sx={{ mb: 2 }} /><Typography sx={{ mb: 1.25, color: 'text.secondary', fontSize: '.95rem' }}>{fullName}</Typography><Button color="inherit" fullWidth startIcon={<Logout />} disabled={closing} onClick={async () => { if (closing) return; setClosing(true); try { await logout() } finally { setClosing(false) } }} sx={{ justifyContent: 'flex-start', color: 'text.primary' }}>Cerrar sesión</Button></Box>
  </Box>
}
export function AuthenticatedShell({ commercial = false }: { commercial?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileDrawer = () => setMobileOpen(false)
  return <Box sx={{ display: 'flex', minHeight: '100svh', bgcolor: 'background.default' }}>
    <Box component="nav" aria-label="Secciones de Fluency CRM">
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid var(--border)', bgcolor: 'var(--surface)' } }}><NavigationContent commercial={commercial} /></Drawer>
      <Drawer open={mobileOpen} onClose={closeMobileDrawer} variant="temporary" sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: 'var(--surface)' } }}><NavigationContent commercial={commercial} onNavigate={closeMobileDrawer} /></Drawer>
    </Box>
    <Box component="main" sx={{ width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}><Toolbar sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}><IconButton aria-label="Abrir navegación" edge="start" onClick={() => setMobileOpen(true)}><Menu /></IconButton><Typography sx={{ ml: 1, color: 'text.primary', fontWeight: 700 }}>Fluency CRM</Typography></Toolbar><Outlet /></Box>
  </Box>
}
