import type { AuthUser } from '../api/client'
export const SESSION_KEY = 'fluency.auth.user.v1'
function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return (typeof user.id === 'number' || typeof user.id === 'string') && typeof user.nombre === 'string' && typeof user.apellido === 'string' && typeof user.correo === 'string' && typeof user.username === 'string' && (typeof user.activo === 'boolean' || user.activo === null)
}
export function readSession(): AuthUser | null {
  const storedUser = sessionStorage.getItem(SESSION_KEY)
  if (!storedUser) return null
  try { const user: unknown = JSON.parse(storedUser); if (isAuthUser(user)) return user } catch { /* malformed session */ }
  sessionStorage.removeItem(SESSION_KEY)
  return null
}
export function saveSession(user: AuthUser) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)) }
export function clearSession() { sessionStorage.removeItem(SESSION_KEY) }
