import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/login/LoginPage'
import { CompanyDetailPage } from './features/companies/CompanyDetailPage'
import { CompaniesPage } from './features/companies/CompaniesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell />}>
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/empresas" element={<CompaniesPage />} />
          <Route path="/empresas/:idEmpresa" element={<CompanyDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

export default App
