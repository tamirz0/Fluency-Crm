import { useState } from 'react'
import { Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { Business, Contacts, Dashboard, Logout, Menu, Timeline, ViewKanban } from '@mui/icons-material'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

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

function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth()
  const fullName = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
  return <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
    <Box sx={{ px: 3, py: 3.25 }}><Typography sx={{ color: 'text.primary', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Fluency CRM</Typography></Box>
    <Divider />
    <List sx={{ px: 1.5, py: 2 }} aria-label="Navegación principal">
      <ListItemButton component={NavLink} to="/inicio" end onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Dashboard fontSize="small" /></ListItemIcon><ListItemText primary="Inicio" /></ListItemButton>
      <ListItemButton component={NavLink} to="/empresas" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Business fontSize="small" /></ListItemIcon><ListItemText primary="Empresas" /></ListItemButton>
      <ListItemButton component={NavLink} to="/contactos" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Contacts fontSize="small" /></ListItemIcon><ListItemText primary="Contactos" /></ListItemButton>
      <ListItemButton component={NavLink} to="/oportunidades" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Timeline fontSize="small" /></ListItemIcon><ListItemText primary="Oportunidades" /></ListItemButton>
      <ListItemButton component={NavLink} to="/embudo" onClick={onNavigate} sx={navigationItemSx}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><ViewKanban fontSize="small" /></ListItemIcon><ListItemText primary="Embudo" /></ListItemButton>
    </List>
    <Box sx={{ mt: 'auto', p: 2.25 }}><Divider sx={{ mb: 2 }} /><Typography sx={{ mb: 1.25, color: 'text.secondary', fontSize: '.95rem' }}>{fullName}</Typography><Button color="inherit" fullWidth startIcon={<Logout />} onClick={logout} sx={{ justifyContent: 'flex-start', color: 'text.primary' }}>Cerrar sesión</Button></Box>
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
