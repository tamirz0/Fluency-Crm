// Identidad ficticia sólo para regresiones de componentes comerciales retirados de App.
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { SESSION_KEY } from '../auth/session'
export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = sessionStorage.getItem(SESSION_KEY)
  const user = stored ? JSON.parse(stored) : null
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading: false, refresh: async () => {}, login: async () => {}, logout: async () => {} }}>{children}</AuthContext.Provider>
}
