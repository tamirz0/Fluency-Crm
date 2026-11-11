import { Navigate, Route, Routes, useLocation, useMatch, type Location } from 'react-router-dom'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { RequireAcademy, RequireAdmin, RequireCommercial } from './app/RequirePermission'
import { useAuth } from './auth/useAuth'
import { canUseCommercial } from './app/navigation'
import { TeacherHomePage } from './features/home/TeacherHomePage'
import { StudentsPage } from './features/students/StudentsPage'
import { StudentDetailPage } from './features/students/StudentDetailPage'
import { CoursesPage } from './features/courses/CoursesPage'
import { CourseDetailPage } from './features/courses/CourseDetailPage'
import { ClassesPage } from './features/classes/ClassesPage'
import { ClassDetailPage } from './features/classes/ClassDetailPage'
import { TeachersPage } from './features/teachers/TeachersPage'
import { WorkshopsPage } from './features/workshops/WorkshopsPage'
import { WorkshopDetailPage } from './features/workshops/WorkshopDetailPage'
import { LandingPage } from './features/landing/LandingPage'
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
// El Profesor no tiene resumen comercial: tiene su propio inicio.
function HomeEntry() {
  const { user } = useAuth()
  return canUseCommercial(user) ? <HomePage /> : <TeacherHomePage />
}
function App() {
  const location = useLocation()
  const editingCompany = useMatch('/empresas/:idEmpresa/editar')
  const creatingCompany = useMatch('/empresas/nueva')
  const editingContact = useMatch('/contactos/:idContacto/editar')
  const creatingContact = useMatch('/contactos/nuevo')
  const background = editingCompany || creatingCompany
    ? location.state?.companyFormBackground as Location | undefined
    : editingContact || creatingContact ? location.state?.contactFormBackground as Location | undefined : undefined
  return <><Routes location={background ?? location}>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AuthenticatedShell />}>
      <Route path="/inicio" element={<HomeEntry />} />
      <Route path="/perfil" element={<ProfilePage />} />
      <Route element={<RequireAcademy />}>
      <Route path="/alumnos" element={<StudentsPage />} />
      <Route path="/alumnos/:idAlumno" element={<StudentDetailPage />} />
      <Route path="/cursos" element={<CoursesPage />} />
      <Route path="/cursos/:idCurso" element={<CourseDetailPage />} />
      <Route path="/clases" element={<ClassesPage />} />
      <Route path="/clases/:idClase" element={<ClassDetailPage />} />
      <Route path="/talleres" element={<WorkshopsPage />} />
      <Route path="/talleres/:idTaller" element={<WorkshopDetailPage />} />
      </Route>
      <Route element={<RequireAdmin />}>
      <Route path="/profesores" element={<TeachersPage />} />
      </Route>
      <Route element={<RequireCommercial />}>
      <Route path="/empresas" element={<CompaniesPage />} />
      <Route path="/empresas/nueva" element={<><CompaniesPage /><NewCompanyPage /></>} />
      <Route path="/empresas/:idEmpresa" element={<CompanyDetailPage />} />
      <Route path="/empresas/:idEmpresa/editar" element={<><CompanyDetailPage /><EditCompanyPage /></>} />
      <Route path="/contactos" element={<ContactsPage />} />
      <Route path="/contactos/nuevo" element={<><ContactsPage /><NewContactPage /></>} />
      <Route path="/contactos/:idContacto" element={<ContactDetailPage />} />
      <Route path="/contactos/:idContacto/editar" element={<><ContactDetailPage /><EditContactPage /></>} />
      <Route path="/oportunidades" element={<OpportunitiesPage />} />
      <Route path="/oportunidades/nueva" element={<NewOpportunityPage />} />
      <Route path="/oportunidades/:idOportunidad" element={<OpportunityDetailPage />} />
      <Route path="/oportunidades/:idOportunidad/editar" element={<EditOpportunityPage />} />
      <Route path="/embudo" element={<FunnelPage />} />
      <Route path="/configuracion/usuarios" element={<UsersPage />} />
      <Route path="/configuracion/catalogos" element={<CatalogsPage />} />
      <Route path="/configuracion/servicios" element={<ServicesPage />} />
      <Route path="/configuracion/embudos" element={<FunnelsPage />} />
      </Route>
    </Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
    {background && <Routes><Route element={<ProtectedRoute />}><Route element={<RequireCommercial />}>
      <Route path="/empresas/nueva" element={<NewCompanyPage />} />
      <Route path="/empresas/:idEmpresa/editar" element={<EditCompanyPage />} />
      <Route path="/contactos/nuevo" element={<NewContactPage />} />
      <Route path="/contactos/:idContacto/editar" element={<EditContactPage />} />
    </Route></Route></Routes>}
  </>
}
export default App
