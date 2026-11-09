import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { LoginPage } from './features/login/LoginPage'
import { HomePage } from './features/home/HomePage'
import { ProfilePage } from './features/profile/ProfilePage'
import { UsersPage } from './features/settings/UsersPage'
import { CatalogsPage } from './features/settings/CatalogsPage'
import { ServicesPage } from './features/services/ServicesPage'
import { FunnelsPage } from './features/settings/FunnelsPage'
import { CompaniesPage } from './features/companies/CompaniesPage'
import { CompanyDetailPage } from './features/companies/CompanyDetailPage'
import { NewCompanyPage, EditCompanyPage } from './features/companies/CompanyFormPage'
import { ContactsPage } from './features/contacts/ContactsPage'
import { ContactDetailPage } from './features/contacts/ContactDetailPage'
import { NewContactPage, EditContactPage } from './features/contacts/ContactFormPage'
import { OpportunitiesPage } from './features/opportunities/OpportunitiesPage'
import { FunnelPage } from './features/funnel/FunnelPage'
import { EditOpportunityPage, NewOpportunityPage } from './features/opportunities/OpportunityFormPage'
import { OpportunityDetailPage } from './features/opportunities/OpportunityDetailPage'
function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AuthenticatedShell />}>
      <Route path="/inicio" element={<HomePage />} />
      <Route path="/perfil" element={<ProfilePage />} />
      <Route path="/empresas" element={<CompaniesPage />} />
      <Route path="/empresas/nueva" element={<NewCompanyPage />} />
      <Route path="/empresas/:idEmpresa" element={<CompanyDetailPage />} />
      <Route path="/empresas/:idEmpresa/editar" element={<EditCompanyPage />} />
      <Route path="/contactos" element={<ContactsPage />} />
      <Route path="/contactos/nuevo" element={<NewContactPage />} />
      <Route path="/contactos/:idContacto" element={<ContactDetailPage />} />
      <Route path="/contactos/:idContacto/editar" element={<EditContactPage />} />
      <Route path="/oportunidades" element={<OpportunitiesPage />} />
      <Route path="/oportunidades/nueva" element={<NewOpportunityPage />} />
      <Route path="/oportunidades/:idOportunidad" element={<OpportunityDetailPage />} />
      <Route path="/oportunidades/:idOportunidad/editar" element={<EditOpportunityPage />} />
      <Route path="/embudo" element={<FunnelPage />} />
      <Route path="/configuracion/usuarios" element={<UsersPage />} />
      <Route path="/configuracion/catalogos" element={<CatalogsPage />} />
      <Route path="/configuracion/servicios" element={<ServicesPage />} />
      <Route path="/configuracion/embudos" element={<FunnelsPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/inicio" replace />} />
  </Routes>
}
export default App
