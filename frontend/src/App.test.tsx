import { type ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { createQueryClient } from './app/queryClient'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { SESSION_KEY } from './auth/session'
import { AuthenticatedShell } from './app/AuthenticatedShell'
import { ProtectedRoute } from './app/ProtectedRoute'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/login/LoginPage'

// Keep the existing component checks while these legacy routes are absent from App.
function LegacyAccessRoutes() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AuthenticatedShell />}>
        <Route path="/inicio" element={<HomePage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/inicio" replace />} />
  </Routes>
}

const savedUser = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
function renderApp(path = '/login') { window.history.pushState({}, '', path); const queryClient = createQueryClient(); const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>; return { queryClient, ...render(<LegacyAccessRoutes />, { wrapper: Wrapper }) } }
const savedSession = { usuario: savedUser, expiresAt: '2026-10-13T07:00:00Z' }
function csrfResponse() { return jsonResponse({ requestToken: 'token-test' }) }
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
async function fillLogin(actor: ReturnType<typeof userEvent.setup>) { await actor.type(screen.getByLabelText('Usuario'), ' maria '); await actor.type(screen.getByLabelText('Contraseña'), 'secreto') }
beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })

describe('componentes de acceso anteriores, fuera de la navegación real', () => {
  it('muestra el formulario y valida campos obligatorios', async () => { const actor = userEvent.setup(); renderApp(); await actor.click(screen.getByRole('button', { name: 'Ingresar' })); expect(await screen.findByText('Ingresá tu usuario.')).toBeTruthy(); expect(await screen.findByText('Ingresá tu contraseña.')).toBeTruthy() })
  it('inicia sesión, guarda sólo el usuario y navega a inicio', async () => { vi.mocked(fetch).mockResolvedValueOnce(csrfResponse()).mockResolvedValueOnce(jsonResponse(savedSession)).mockResolvedValueOnce(csrfResponse()); const actor = userEvent.setup(); renderApp(); await fillLogin(actor); await actor.click(screen.getByRole('button', { name: 'Ingresar' })); expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy(); expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '')).toEqual(savedUser); expect(sessionStorage.getItem(SESSION_KEY)).not.toContain('secreto') })
  it('muestra credenciales inválidas, conserva el usuario y limpia la contraseña', async () => { vi.mocked(fetch).mockResolvedValueOnce(csrfResponse()).mockResolvedValueOnce(new Response('Usuario o contraseña incorrectos.', { status: 401 })); const actor = userEvent.setup(); renderApp(); await fillLogin(actor); await actor.click(screen.getByRole('button', { name: 'Ingresar' })); expect((await screen.findByRole('alert')).textContent).toContain('Usuario o contraseña incorrectos.'); expect((screen.getByLabelText('Usuario') as HTMLInputElement).value).toBe(' maria '); expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('') })
  it('muestra un error accionable cuando no hay conexión', async () => { vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Network error')); const actor = userEvent.setup(); renderApp(); await fillLogin(actor); await actor.click(screen.getByRole('button', { name: 'Ingresar' })); expect((await screen.findByRole('alert')).textContent).toContain('No pudimos conectar con la API. Verificá que esté en ejecución e intentá de nuevo.') })
  it('restaura una sesión válida y elimina una corrupta', async () => { sessionStorage.setItem(SESSION_KEY, JSON.stringify(savedUser)); renderApp('/inicio'); expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy(); sessionStorage.setItem(SESSION_KEY, '{roto'); renderApp('/inicio'); expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy(); expect(sessionStorage.getItem(SESSION_KEY)).toBeNull() })
  it('protege inicio y no permite volver a login con sesión', async () => { renderApp('/inicio'); expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy(); sessionStorage.setItem(SESSION_KEY, JSON.stringify(savedUser)); renderApp('/login'); expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy() })
  it('cierra sesión, limpia la caché y redirige a login', async () => { sessionStorage.setItem(SESSION_KEY, JSON.stringify(savedUser)); const { queryClient } = renderApp('/inicio'); await screen.findByRole('heading', { name: 'Hola, María' }); queryClient.setQueryData(['prueba'], 'dato'); await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' })); expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy(); expect(sessionStorage.getItem(SESSION_KEY)).toBeNull(); expect(queryClient.getQueryData(['prueba'])).toBeUndefined() })
  it('bloquea envíos duplicados', async () => { let resolveRequest: (response: Response) => void; vi.mocked(fetch).mockResolvedValueOnce(csrfResponse()).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRequest = resolve })).mockResolvedValueOnce(csrfResponse()); const actor = userEvent.setup(); renderApp(); await fillLogin(actor); const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form'); if (!form) throw new Error('No se encontró el formulario de acceso.'); fireEvent.submit(form); fireEvent.submit(form); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); resolveRequest!(jsonResponse(savedSession)); expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy() })
})

describe('corte de rutas de T07', () => {
  it.each(['/login', '/inicio', '/empresas/nueva', '/contactos/1/editar', '/oportunidades/1', '/embudo'])(
    'no monta pantallas anteriores ni consulta API desde %s', (path) => {
      window.history.pushState({}, '', path)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(savedUser))
      const { container } = render(<BrowserRouter><App /></BrowserRouter>)
      expect(container.childElementCount).toBe(0)
      expect(fetch).not.toHaveBeenCalled()
    },
  )
})
