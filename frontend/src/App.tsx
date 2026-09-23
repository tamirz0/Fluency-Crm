import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/login/LoginPage'

const CompaniesPage = lazy(() => import('./features/companies/CompaniesPage').then(({ CompaniesPage }) => ({ default: CompaniesPage })))
const CompanyDetailPage = lazy(() => import('./features/companies/CompanyDetailPage').then(({ CompanyDetailPage }) => ({ default: CompanyDetailPage })))
const EditCompanyPage = lazy(() => import('./features/companies/CompanyFormPage').then(({ EditCompanyPage }) => ({ default: EditCompanyPage })))
const NewCompanyPage = lazy(() => import('./features/companies/CompanyFormPage').then(({ NewCompanyPage }) => ({ default: NewCompanyPage })))
const ContactsPage = lazy(() => import('./features/contacts/ContactsPage').then(({ ContactsPage }) => ({ default: ContactsPage })))
const ContactDetailPage = lazy(() => import('./features/contacts/ContactDetailPage').then(({ ContactDetailPage }) => ({ default: ContactDetailPage })))
const EditContactPage = lazy(() => import('./features/contacts/ContactFormPage').then(({ EditContactPage }) => ({ default: EditContactPage })))
const NewContactPage = lazy(() => import('./features/contacts/ContactFormPage').then(({ NewContactPage }) => ({ default: NewContactPage })))
const OpportunitiesPage = lazy(() => import('./features/opportunities/OpportunitiesPage').then(({ OpportunitiesPage }) => ({ default: OpportunitiesPage })))
const OpportunityDetailPage = lazy(() => import('./features/opportunities/OpportunityDetailPage').then(({ OpportunityDetailPage }) => ({ default: OpportunityDetailPage })))
const EditOpportunityPage = lazy(() => import('./features/opportunities/OpportunityFormPage').then(({ EditOpportunityPage }) => ({ default: EditOpportunityPage })))
const NewOpportunityPage = lazy(() => import('./features/opportunities/OpportunityFormPage').then(({ NewOpportunityPage }) => ({ default: NewOpportunityPage })))
const FunnelPage = lazy(() => import('./features/funnel/FunnelPage').then(({ FunnelPage }) => ({ default: FunnelPage })))

function RouteLoadingFallback() {
  const { pathname } = useLocation()
  const section = pathname.split('/')[1]
  const label = section === 'contactos' ? 'contactos' : section === 'oportunidades' || section === 'embudo' ? section : 'empresas'
  return <div className="companies-page" role="status" aria-label={`Cargando ${label}`}>Cargando sección…</div>
}

function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  )
}

export default App
