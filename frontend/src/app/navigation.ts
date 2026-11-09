import type { AuthUser } from '../api/client'

/** Destino de inicio de quien no tiene acceso comercial (Profesor). */
export const ACADEMY_HOME = '/clases'

export const canUseAcademy = (user: AuthUser | null | undefined) => !!user?.permisos?.includes('GestionarAcademia')
/** Comercial salvo para quien solo tiene la parte académica (Profesor): la API es la autoridad, esto solo evita pantallas sin acceso. */
export const canUseCommercial = (user: AuthUser | null | undefined) => !!user && (!!user.permisos?.includes('ConsultarComercial') || !canUseAcademy(user))
