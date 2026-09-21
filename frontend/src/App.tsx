import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/login/LoginPage'
import { CompanyDetailPage } from './features/companies/CompanyDetailPage'
import { CompaniesPage } from './features/companies/CompaniesPage'
import { ContactsPage } from './features/contacts/ContactsPage'
import { ContactDetailPage } from './features/contacts/ContactDetailPage'
import { OpportunitiesPage } from './features/opportunities/OpportunitiesPage'
import { OpportunityDetailPage } from './features/opportunities/OpportunityDetailPage'
import { FunnelPage } from './features/funnel/FunnelPage'
import { EditCompanyPage, NewCompanyPage } from './features/companies/CompanyFormPage'
import { EditContactPage, NewContactPage } from './features/contacts/ContactFormPage'
import { EditOpportunityPage, NewOpportunityPage } from './features/opportunities/OpportunityFormPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell />}>
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/empresas" element={<CompaniesPage />} />
          <Route path="/empresas/nueva" element={<NewCompanyPage />} />
          <Route path="/empresas/:idEmpresa/editar" element={<EditCompanyPage />} />
          <Route path="/empresas/:idEmpresa" element={<CompanyDetailPage />} />
          <Route path="/contactos" element={<ContactsPage />} />
          <Route path="/contactos/nuevo" element={<NewContactPage />} />
          <Route path="/contactos/:idContacto/editar" element={<EditContactPage />} />
          <Route path="/contactos/:idContacto" element={<ContactDetailPage />} />
          <Route path="/oportunidades" element={<OpportunitiesPage />} />
          <Route path="/oportunidades/nueva" element={<NewOpportunityPage />} />
          <Route path="/oportunidades/:idOportunidad/editar" element={<EditOpportunityPage />} />
          <Route path="/oportunidades/:idOportunidad" element={<OpportunityDetailPage />} />
          <Route path="/embudo" element={<FunnelPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

export default App
