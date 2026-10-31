import { Navigate, Route, Routes } from 'react-router-dom'
import { Typography, Box } from '@mui/material'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { LoginPage } from './features/login/LoginPage'
import { useAuth } from './auth/useAuth'
import { UsersPage } from './features/settings/UsersPage'
import { CatalogsPage } from './features/settings/CatalogsPage'
import { ServicesPage } from './features/services/ServicesPage'
import { FunnelsPage } from './features/settings/FunnelsPage'
import { CompaniesPage } from './features/companies/CompaniesPage'
import { CompanyDetailPage } from './features/companies/CompanyDetailPage'
import { NewCompanyPage, EditCompanyPage } from './features/companies/CompanyFormPage'
function AccessHome() {
  const { user } = useAuth()
  return <Box sx={{ p: { xs: 3, md: 5 } }}><Typography variant="h4" component="h1">Hola, {user?.nombre}</Typography><Typography sx={{ mt: 2 }}>Bienvenido a Fluency CRM.</Typography></Box>
}
function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AuthenticatedShell />}>
      <Route path="/inicio" element={<AccessHome />} />
      <Route path="/empresas" element={<CompaniesPage />} />
      <Route path="/empresas/nueva" element={<NewCompanyPage />} />
      <Route path="/empresas/:idEmpresa" element={<CompanyDetailPage />} />
      <Route path="/empresas/:idEmpresa/editar" element={<EditCompanyPage />} />
      <Route path="/configuracion/usuarios" element={<UsersPage />} />
      <Route path="/configuracion/catalogos" element={<CatalogsPage />} />
      <Route path="/configuracion/servicios" element={<ServicesPage />} />
      <Route path="/configuracion/embudos" element={<FunnelsPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/inicio" replace />} />
  </Routes>
}
export default App
