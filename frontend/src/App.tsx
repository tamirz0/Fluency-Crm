import { Navigate, Route, Routes } from 'react-router-dom'
import { Typography, Box } from '@mui/material'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { LoginPage } from './features/login/LoginPage'
import { useAuth } from './auth/useAuth'
import { UsersPage } from './features/settings/UsersPage'
import { CatalogsPage } from './features/settings/CatalogsPage'
function AccessHome() {
  const { user } = useAuth()
  return <Box sx={{ p: { xs: 3, md: 5 } }}><Typography variant="h4" component="h1">Hola, {user?.nombre}</Typography><Typography sx={{ mt: 2 }}>Bienvenido a Fluency CRM.</Typography></Box>
}
function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AuthenticatedShell />}>
      <Route path="/inicio" element={<AccessHome />} />
      <Route path="/configuracion/usuarios" element={<UsersPage />} />
      <Route path="/configuracion/catalogos" element={<CatalogsPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/inicio" replace />} />
  </Routes>
}
export default App
