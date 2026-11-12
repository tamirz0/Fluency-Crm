import type { AuthUser } from '../api/client'

export const roleLabels: Record<string, string> = {
  ADMINISTRADOR: 'Administrador', RESPONSABLE_COMERCIAL: 'Responsable comercial', VENDEDOR: 'Vendedor', PROFESOR: 'Profesor',
}

export const canUseAcademy = (user: AuthUser | null | undefined) => !!user?.permisos?.includes('GestionarAcademia')
/** Comercial salvo para quien solo tiene la parte académica (Profesor): la API es la autoridad, esto solo evita pantallas sin acceso. */
export const canUseCommercial = (user: AuthUser | null | undefined) => !!user && (!!user.permisos?.includes('ConsultarComercial') || !canUseAcademy(user))
