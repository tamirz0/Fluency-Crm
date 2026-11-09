import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { canUseAcademy, canUseCommercial } from './navigation'

/** Guardas de navegación: solo mejoran la experiencia; la API valida el permiso en cada petición. */
export function RequireCommercial() {
  const { user } = useAuth()
  return canUseCommercial(user) ? <Outlet /> : <Navigate to="/inicio" replace />
}

/** Pestañas solo del administrador (Profesores). */
export function RequireAdmin() {
  const { user } = useAuth()
  return canUseAcademy(user) && user?.roles?.includes('ADMINISTRADOR') ? <Outlet /> : <Navigate to="/inicio" replace />
}

export function RequireAcademy() {
  const { user } = useAuth()
  return canUseAcademy(user) ? <Outlet /> : <Navigate to="/inicio" replace />
}
