import { useCallback, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { loginRequest, type AuthUser, type LoginCredentials } from '../api/client'
import { AuthContext } from './context'
import { clearSession, readSession, saveSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const login = useCallback(async (credentials: LoginCredentials) => { const loggedInUser = await loginRequest(credentials); saveSession(loggedInUser); setUser(loggedInUser) }, [])
  const logout = useCallback(() => { clearSession(); queryClient.clear(); setUser(null); navigate('/login', { replace: true }) }, [navigate, queryClient])
  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>{children}</AuthContext.Provider>
}
