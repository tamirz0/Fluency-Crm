import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Box, Button } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { ApiRequestError, getSessionRequest, loginRequest, logoutRequest, type AuthUser, type LoginCredentials } from '../api/client'
import { AuthContext } from './context'
import { clearSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const revision = useRef(0)
  const invalidate = useCallback(() => { revision.current++ }, [])
  const forget = useCallback(() => {
    revision.current++
    clearSession(); queryClient.clear(); setUser(null); setError(''); setLoading(false)
  }, [queryClient])
  const refresh = useCallback(async () => {
    const current = ++revision.current
    setLoading(true); setError('')
    try {
      const session = await getSessionRequest()
      if (current !== revision.current) return
      queryClient.clear()
      setUser(session.usuario)
    } catch (cause) {
      if (current !== revision.current) return
      if (cause instanceof ApiRequestError && cause.status === 401) forget()
      else setError(cause instanceof Error ? cause.message : 'No pudimos comprobar la sesión.')
    } finally { if (current === revision.current) setLoading(false) }
  }, [forget, queryClient])
  useEffect(() => {
    clearSession()
    const unauthorized = () => forget()
    const forbidden = (event: Event) => setError((event as CustomEvent<string>).detail)
    const focus = () => { void refresh() }
    window.addEventListener('fluency:unauthorized', unauthorized)
    window.addEventListener('fluency:forbidden', forbidden)
    window.addEventListener('focus', focus)
    void Promise.resolve().then(refresh)
    return () => {
      invalidate()
      window.removeEventListener('fluency:unauthorized', unauthorized)
      window.removeEventListener('fluency:forbidden', forbidden)
      window.removeEventListener('focus', focus)
    }
  }, [forget, refresh, invalidate])
  const login = useCallback(async (credentials: LoginCredentials) => {
    const current = ++revision.current
    const loggedIn = await loginRequest(credentials)
    if (current !== revision.current) return
    queryClient.clear(); setUser(loggedIn); setError('')
  }, [queryClient])
  const logout = useCallback(async () => {
    try { await logoutRequest(); forget() }
    catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) forget()
      else setError(cause instanceof Error ? cause.message : 'No pudimos cerrar la sesión.')
    }
  }, [forget])
  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, refresh, login, logout }}>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {isLoading ? <Box role="status" sx={{ p: 3 }}>Comprobando sesión…</Box> : error && !user ? <Button onClick={() => void refresh()}>Reintentar sesión</Button> : children}
  </AuthContext.Provider>
}
