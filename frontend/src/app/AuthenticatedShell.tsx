import { useState } from 'react'
import { Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { Logout, Menu, Timeline } from '@mui/icons-material'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const drawerWidth = 260
const futureItems = ['Empresas', 'Contactos', 'Oportunidades', 'Embudo']
function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth()
  const fullName = `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()
  return <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
    <Box sx={{ px: 3, py: 3.25 }}><Typography sx={{ color: '#fff', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Fluency CRM</Typography></Box>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.18)' }} />
    <List sx={{ px: 1.5, py: 2 }} aria-label="Navegación principal">
      <ListItemButton component="a" href="/inicio" onClick={onNavigate} selected sx={{ mb: .5, borderRadius: 1, color: '#fff', '&.Mui-selected': { background: '#2F7F7B' } }}><ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><Timeline fontSize="small" /></ListItemIcon><ListItemText primary="Inicio" /></ListItemButton>
      {futureItems.map((item) => <ListItemButton disabled key={item} aria-label={`${item}: disponible en próximos incrementos`} sx={{ borderRadius: 1, '&.Mui-disabled': { color: 'rgba(255,255,255,0.48)', '& .MuiListItemText-secondary': { color: 'inherit', fontSize: '.8rem' } } }}><ListItemText primary={item} secondary="Próximamente" /></ListItemButton>)}
    </List>
    <Box sx={{ mt: 'auto', p: 2.25 }}><Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.18)' }} /><Typography sx={{ mb: 1.25, color: '#dce9eb', fontSize: '.95rem' }}>{fullName}</Typography><Button color="inherit" fullWidth startIcon={<Logout />} onClick={logout} sx={{ justifyContent: 'flex-start', color: '#fff' }}>Cerrar sesión</Button></Box>
  </Box>
}
export function AuthenticatedShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileDrawer = () => setMobileOpen(false)
  return <Box sx={{ display: 'flex', minHeight: '100svh', bgcolor: 'background.default' }}>
    <Box component="nav" aria-label="Secciones de Fluency CRM">
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0, bgcolor: '#17324D' } }}><NavigationContent /></Drawer>
      <Drawer open={mobileOpen} onClose={closeMobileDrawer} variant="temporary" sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, bgcolor: '#17324D' } }}><NavigationContent onNavigate={closeMobileDrawer} /></Drawer>
    </Box>
    <Box component="main" sx={{ width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}><Toolbar sx={{ display: { xs: 'flex', md: 'none' }, borderBottom: '1px solid #D9E0DE', bgcolor: '#fff' }}><IconButton aria-label="Abrir navegación" edge="start" onClick={() => setMobileOpen(true)}><Menu /></IconButton><Typography sx={{ ml: 1, color: '#17324D', fontWeight: 700 }}>Fluency CRM</Typography></Toolbar><Outlet /></Box>
  </Box>
}
