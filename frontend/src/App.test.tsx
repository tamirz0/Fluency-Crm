import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers'
import { createQueryClient } from './app/queryClient'
import { AuthProvider } from './auth/AuthContext'
import { SESSION_KEY } from './auth/session'
import App from './App'
import { api } from './api/client'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: [] }
const session = { usuario: user, expiresAt: '2026-10-22T07:00:00Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let authenticated = false
beforeEach(() => {
  authenticated = false
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/login')) { authenticated = true; return json(session) }
    if (path.endsWith('/logout')) { authenticated = false; return new Response(null, { status: 204 }) }
    return authenticated ? json(session) : json({ detail: 'Sesión vencida' }, 401)
  }))
})
function mount(path = '/inicio') {
  window.history.pushState({}, '', path)
  const client = createQueryClient()
  render(<AppProviders queryClient={client}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
  return client
}
it('ignora y retira identidad local; valida campos obligatorios', async () => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  mount()
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(await screen.findByText('Ingresá tu usuario.')).toBeTruthy()
  expect(await screen.findByText('Ingresá tu contraseña.')).toBeTruthy()
})
it('login sin persistir credenciales y sin doble envío', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  await userEvent.type(screen.getByLabelText('Usuario'), ' maria ')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
  const form = screen.getByRole('button', { name: 'Ingresar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy()
  expect(sessionStorage.length).toBe(0)
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).url.endsWith('/login'))).toHaveLength(1)
})
it('recarga restaura desde /me; logout llama API y limpia caché', async () => {
  authenticated = true
  const client = mount('/login')
  await screen.findByRole('heading', { name: 'Hola, María' })
  client.setQueryData(['privado'], 'dato')
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  expect(authenticated).toBe(false)
  expect(client.getQueryData(['privado'])).toBeUndefined()
})
it('401 al recuperar foco limpia identidad y caché', async () => {
  authenticated = true
  const client = mount()
  await screen.findByRole('heading', { name: 'Hola, María' })
  client.setQueryData(['privado'], 'dato')
  authenticated = false
  fireEvent(window, new Event('focus'))
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  expect(client.getQueryData(['privado'])).toBeUndefined()
})
it('403 explica rechazo conservando sesión; 401 de otro request la elimina', async () => {
  authenticated = true
  mount()
  await screen.findByRole('heading', { name: 'Hola, María' })
  vi.mocked(fetch).mockResolvedValueOnce(json({ detail: 'Sin permiso.' }, 403))
  await expect(api.GET('/auth/me')).rejects.toMatchObject({ status: 403 })
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin permiso.')
  expect(screen.getByRole('heading', { name: 'Hola, María' })).toBeTruthy()
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 401))
  await expect(api.GET('/auth/me')).rejects.toMatchObject({ status: 401 })
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
})
it('credenciales inválidas conserva username y vacía password; red permite reintentar', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  await userEvent.type(screen.getByLabelText('Usuario'), 'maria')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta')
  vi.mocked(fetch).mockImplementation(async (r) => (r as Request).url.endsWith('/csrf') ? json({ requestToken: 't' }) : json({}, 401))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Usuario o contraseña incorrectos.'))
  expect((screen.getByLabelText('Usuario') as HTMLInputElement).value).toBe('maria')
  expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'otra')
  vi.mocked(fetch).mockRejectedValue(new TypeError('network'))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No pudimos conectar'))
})

it('foco durante login no descarta la identidad que devuelve el servidor', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  await userEvent.type(screen.getByLabelText('Usuario'), 'maria')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
  const normal = vi.mocked(fetch).getMockImplementation()!
  let finish: (response: Response) => void = () => {}
  vi.mocked(fetch).mockImplementation(async (r, init) => (r as Request).url.endsWith('/login') ? new Promise<Response>(resolve => { finish = resolve }) : normal(r, init))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).url.endsWith('/login'))).toBe(true))
  fireEvent(window, new Event('focus'))
  authenticated = true; finish(json(session))
  expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy()
})
it('logout 204 limpia identidad y caché aunque falle renovar CSRF', async () => {
  authenticated = true
  const client = mount()
  await screen.findByRole('heading', { name: 'Hola, María' })
  client.setQueryData(['privado'], 'dato')
  let signedOut = false
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => {
    if ((r as Request).url.endsWith('/logout')) { signedOut = true; return new Response(null, { status: 204 }) }
    if (signedOut && (r as Request).url.endsWith('/csrf')) throw new TypeError('network')
    return normal(r, init)
  })
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })
  expect(client.getQueryData(['privado'])).toBeUndefined()
})

it.each(['/empresas/nueva', '/contactos/1/editar', '/oportunidades/1', '/embudo'])('conserva retirado el módulo comercial %s', async path => {
  authenticated = true
  mount(path)
  await screen.findByRole('heading', { name: 'Hola, María' })
  expect(vi.mocked(fetch).mock.calls.every(([r]) => new URL((r as Request).url).pathname.startsWith('/api/auth/'))).toBe(true)
})
