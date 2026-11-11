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
    if (path.endsWith('/inicio/resumen')) return json({ alumnos: 0, oportunidadesAbiertas: 0, cerradasEsteMes: 0 })
    if (path.endsWith('/oportunidades')) return json({ items: [], page: 1, pageSize: 5, totalCount: 0 })
    if (path.startsWith('/api/catalogos/')) return json([])
    if (path === '/api/empresas' || path === '/api/usuarios/opciones') return json({ items: [], page: 1, pageSize: 25, totalCount: 0 })
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
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar a Fluency' }))
  expect(await screen.findByText('Ingresá tu usuario.')).toBeTruthy()
  expect(await screen.findByText('Ingresá tu contraseña.')).toBeTruthy()
})
it('login sin persistir credenciales y sin doble envío', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  await userEvent.type(screen.getByLabelText('Usuario'), ' maria ')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
  const form = screen.getByRole('button', { name: 'Ingresar a Fluency' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
  expect(sessionStorage.length).toBe(0)
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).url.endsWith('/login'))).toHaveLength(1)
})
it('recarga restaura desde /me; logout llama API y limpia caché', async () => {
  authenticated = true
  const client = mount('/login')
  await screen.findByRole('heading', { name: 'Inicio' })
  client.setQueryData(['privado'], 'dato')
  await userEvent.click(screen.getByRole('button', { name: /^Cuenta de/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  expect(authenticated).toBe(false)
  expect(client.getQueryData(['privado'])).toBeUndefined()
})
it('401 al recuperar foco limpia identidad y caché', async () => {
  authenticated = true
  const client = mount()
  await screen.findByRole('heading', { name: 'Inicio' })
  client.setQueryData(['privado'], 'dato')
  authenticated = false
  fireEvent(window, new Event('focus'))
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  expect(client.getQueryData(['privado'])).toBeUndefined()
})
it('403 explica rechazo conservando sesión; 401 de otro request la elimina', async () => {
  authenticated = true
  mount()
  await screen.findByRole('heading', { name: 'Inicio' })
  vi.mocked(fetch).mockResolvedValueOnce(json({ detail: 'Sin permiso.' }, 403))
  await expect(api.GET('/auth/me')).rejects.toMatchObject({ status: 403 })
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin permiso.')
  expect(screen.getByRole('heading', { name: 'Inicio' })).toBeTruthy()
  vi.mocked(fetch).mockResolvedValueOnce(json({}, 401))
  await expect(api.GET('/auth/me')).rejects.toMatchObject({ status: 401 })
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
})
it('credenciales inválidas conserva username y vacía password; red permite reintentar', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  await userEvent.type(screen.getByLabelText('Usuario'), 'maria')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta')
  vi.mocked(fetch).mockImplementation(async (r) => (r as Request).url.endsWith('/csrf') ? json({ requestToken: 't' }) : json({}, 401))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar a Fluency' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Usuario o contraseña incorrectos.'))
  expect((screen.getByLabelText('Usuario') as HTMLInputElement).value).toBe('maria')
  expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'otra')
  vi.mocked(fetch).mockRejectedValue(new TypeError('network'))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar a Fluency' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No pudimos conectar'))
})

it('foco durante login no descarta la identidad que devuelve el servidor', async () => {
  mount('/login')
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  await userEvent.type(screen.getByLabelText('Usuario'), 'maria')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto')
  const normal = vi.mocked(fetch).getMockImplementation()!
  let finish: (response: Response) => void = () => {}
  vi.mocked(fetch).mockImplementation(async (r, init) => (r as Request).url.endsWith('/login') ? new Promise<Response>(resolve => { finish = resolve }) : normal(r, init))
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar a Fluency' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).url.endsWith('/login'))).toBe(true))
  fireEvent(window, new Event('focus'))
  authenticated = true; finish(json(session))
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
})
it('logout 204 limpia identidad y caché aunque falle renovar CSRF', async () => {
  authenticated = true
  const client = mount()
  await screen.findByRole('heading', { name: 'Inicio' })
  client.setQueryData(['privado'], 'dato')
  let signedOut = false
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => {
    if ((r as Request).url.endsWith('/logout')) { signedOut = true; return new Response(null, { status: 204 }) }
    if (signedOut && (r as Request).url.endsWith('/csrf')) throw new TypeError('network')
    return normal(r, init)
  })
  await userEvent.click(screen.getByRole('button', { name: /^Cuenta de/ }))
  await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
  await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })
  expect(client.getQueryData(['privado'])).toBeUndefined()
})

it.each(['/empresas', '/empresas/nueva'])('habilita empresas compartidas desde %s', async path => {
  authenticated = true
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => {
    const url = new URL((r as Request).url)
    if (url.pathname === '/api/empresas' || url.pathname === '/api/usuarios/opciones')
      return json({ items: [], page: 1, pageSize: 25, totalCount: 0 })
    if (url.pathname.includes('/api/catalogos/')) return json([])
    return normal(r, init)
  })
  mount(path)
  if (path.endsWith('/nueva')) {
    await screen.findByRole('dialog', { name: 'Nueva empresa' })
    expect(screen.queryByRole('link', { name: 'Empresas' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  }
  await screen.findByRole('heading', { name: 'Empresas' })
  expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBe('page')
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname.startsWith('/api/catalogos/'))).toBe(true)
})

it.each(['/contactos', '/contactos/nuevo'])('habilita contactos compartidos desde %s', async path => {
  authenticated = true
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => {
    const url = new URL((r as Request).url)
    if (['/api/contactos', '/api/empresas', '/api/usuarios/opciones'].includes(url.pathname))
      return json({ items: [], page: 1, pageSize: 25, totalCount: 0 })
    if (url.pathname.includes('/api/catalogos/')) return json([])
    return normal(r, init)
  })
  mount(path)
  if (path.endsWith('/nuevo')) {
    await screen.findByRole('dialog', { name: 'Nuevo contacto' })
    expect(screen.queryByRole('link', { name: 'Contactos' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  }
  await screen.findByRole('heading', { name: 'Contactos' })
  expect(screen.getByRole('link', { name: 'Contactos' }).getAttribute('aria-current')).toBe('page')
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname.startsWith('/api/catalogos/'))).toBe(true)
})

it.each([['/oportunidades', 'Oportunidades', 'Oportunidades'], ['/embudo', 'Embudo comercial', 'Embudo']])('habilita la consulta comercial compartida desde %s', async (path, heading, link) => {
  authenticated = true
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => {
    const url = new URL((r as Request).url)
    if (['/api/oportunidades', '/api/embudos', '/api/usuarios/opciones'].includes(url.pathname))
      return json({ items: [], page: 1, pageSize: 25, totalCount: 0 })
    if (url.pathname.includes('/api/catalogos/')) return json([])
    return normal(r, init)
  })
  mount(path)
  await screen.findByRole('heading', { name: heading })
  expect(screen.getByRole('link', { name: link }).getAttribute('aria-current')).toBe('page')
})
it('al volver a la ventana el aviso de revalidación flota y no empuja el contenido', async () => {
  authenticated = true
  mount()
  await screen.findByRole('heading', { name: 'Inicio' })
  const normal = vi.mocked(fetch).getMockImplementation()!
  let finish: (response: Response) => void = () => {}
  vi.mocked(fetch).mockImplementation(async (r, init) => (r as Request).url.endsWith('/auth/me') ? new Promise<Response>(resolve => { finish = resolve }) : normal(r, init))
  fireEvent(window, new Event('focus'))
  const notice = await screen.findByText('Comprobando sesión…')
  expect(getComputedStyle(notice).position).toBe('fixed')
  finish(json(session))
  await waitFor(() => expect(screen.queryByText('Comprobando sesión…')).toBeNull())
})

it('permite plegar el grupo activo y cerrar el menú de cuenta con el teclado', async () => {
  authenticated = true
  mount('/empresas')
  await screen.findByRole('heading', { name: 'Todavía no hay empresas' })
  const actor = userEvent.setup()
  const group = await screen.findByRole('button', { name: 'Comercial' })
  expect(group.getAttribute('aria-expanded')).toBe('true')
  group.focus()
  await actor.keyboard('{Enter}')
  expect(group.getAttribute('aria-expanded')).toBe('false')
  await actor.keyboard(' ')
  expect(group.getAttribute('aria-expanded')).toBe('true')
  const account = screen.getByRole('button', { name: /^Cuenta de/ })
  account.focus()
  await actor.keyboard('{Enter}')
  expect(await screen.findByRole('menuitem', { name: 'Mi perfil' })).toBeTruthy()
  await actor.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  expect(document.activeElement).toBe(account)
})
