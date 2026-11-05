import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Alert, Box, Button } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { ApiRequestError, getSessionRequest, loginRequest, logoutRequest, type AuthUser, type LoginCredentials } from '../api/client'
import { AuthContext } from './context'
import { clearSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const revision = useRef(0)
  const identityChange = useRef(false)
  const snapshot = useRef('')
  const invalidate = useCallback(() => { revision.current++ }, [])
  const forget = useCallback(() => {
    revision.current++
    snapshot.current = ''
    clearSession(); queryClient.clear(); setUser(null); setError(''); setLoading(false); setInitialized(true); setUnavailable(false)
  }, [queryClient])
  const refresh = useCallback(async () => {
    const current = ++revision.current
    setLoading(true); setError('')
    try {
      const session = await getSessionRequest()
      if (current !== revision.current) return
      const next = JSON.stringify(session.usuario)
      if (snapshot.current !== next) queryClient.clear()
      snapshot.current = next
      setUnavailable(false)
      setUser(session.usuario)
    } catch (cause) {
      if (current !== revision.current) return
      if (cause instanceof ApiRequestError && cause.status === 401) forget()
      else { setUnavailable(true); setError(cause instanceof Error ? cause.message : 'No pudimos comprobar la sesión.') }
    } finally { if (current === revision.current) { setLoading(false); setInitialized(true) } }
  }, [forget, queryClient])
  useEffect(() => {
    clearSession()
    const unauthorized = () => forget()
    const forbidden = (event: Event) => setError((event as CustomEvent<string>).detail)
    const focus = () => { if (!identityChange.current) void refresh() }
    window.addEventListener('fluency:session-ended', unauthorized)
    window.addEventListener('fluency:forbidden', forbidden)
    window.addEventListener('focus', focus)
    void Promise.resolve().then(refresh)
    return () => {
      invalidate()
      window.removeEventListener('fluency:session-ended', unauthorized)
      window.removeEventListener('fluency:forbidden', forbidden)
      window.removeEventListener('focus', focus)
    }
  }, [forget, refresh, invalidate])
  const login = useCallback(async (credentials: LoginCredentials) => {
    const current = ++revision.current
    identityChange.current = true
    try {
      const loggedIn = await loginRequest(credentials)
      if (current !== revision.current) return
      snapshot.current = JSON.stringify(loggedIn)
      queryClient.clear(); setUser(loggedIn); setError(''); setUnavailable(false); setLoading(false)
    } catch (cause) {
      if (!(cause instanceof ApiRequestError && cause.status === 401)) await refresh()
      throw cause
    } finally { identityChange.current = false }
  }, [queryClient, refresh])
  const logout = useCallback(async () => {
    identityChange.current = true
    try { await logoutRequest(); forget() }
    catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) forget()
      else setError(cause instanceof Error ? cause.message : 'No pudimos cerrar la sesión.')
    } finally { identityChange.current = false }
  }, [forget])
  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading: isLoading || unavailable, refresh, login, logout }}>
    {/* Los avisos de sesión flotan sobre la pantalla: no empujan ni reordenan el contenido. */}
    {(error || isLoading || unavailable) && <Box sx={{ position: 'fixed', top: 16, left: '50%', zIndex: 'tooltip', display: 'flex', width: 'min(92vw, 560px)', transform: 'translateX(-50%)', flexDirection: 'column', gap: 1, filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, .45))' }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {isLoading && <Alert severity="info" role="status" icon={false}>Comprobando sesión…</Alert>}
      {unavailable && <Button variant="contained" onClick={() => void refresh()}>Reintentar sesión</Button>}
    </Box>}
    {initialized && <Box key={JSON.stringify(user)} inert={isLoading || unavailable || undefined}>{children}</Box>}
  </AuthContext.Provider>
}
