import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const admin = { id: 1, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@example.invalid', username: 'ana', activo: true, roles: ['ADMINISTRADOR'], permisos: ['AdministrarUsuarios'] }
let members = [admin]
let isAdmin = true
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  isAdmin = true; members = [admin]
  vi.stubGlobal('fetch', vi.fn(async (r: Request) => {
    const url = new URL(r.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf' })
    if (url.pathname.endsWith('/me')) return json({ usuario: isAdmin ? admin : { ...admin, roles: ['VENDEDOR'], permisos: [] }, expiresAt: '2026-10-22T07:00:00Z' })
    if (url.pathname.endsWith('/roles')) return json([{ codigo: 'ADMINISTRADOR', etiqueta: 'Administrador' }, { codigo: 'VENDEDOR', etiqueta: 'Vendedor' }, { codigo: 'RESPONSABLE_COMERCIAL', etiqueta: 'Responsable comercial' }])
    if (r.method === 'POST' && url.pathname === '/api/usuarios') { const body = await r.json(); const user = { ...body, id: 2, activo: true, permisos: [] }; members = [...members, user]; return json(user, 201) }
    if (r.method === 'PATCH') { const body = await r.json(); members = members.map(u => ({ ...u, ...body })); return json(members[0]) }
    if (r.method === 'PUT') return new Response(null, { status: 204 })
    if (url.pathname.endsWith('/desactivar') || url.pathname.endsWith('/reactivar')) { members = members.map(u => ({ ...u, activo: url.pathname.endsWith('/reactivar') })); return json(members[0]) }
    return json({ items: members, page: 1, pageSize: 25, totalCount: members.length })
  }))
})
function mount() {
  window.history.pushState({}, '', '/configuracion/usuarios')
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}
it('crea una cuenta con roles y evita doble envío', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
  const dialog = within(screen.getByRole('dialog'))
  for (const [label, value] of [['Nombre', 'Lucía'], ['Apellido', 'Gómez'], ['Correo', 'lucia@example.invalid'], ['Usuario', 'lucia'], ['Contraseña', 'Ficticia123!']]) await userEvent.type(dialog.getByLabelText(label, { exact: false }), value)
  await userEvent.click(dialog.getByLabelText('Vendedor'))
  const form = dialog.getByRole('button', { name: 'Guardar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByText('lucia')).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && (r as Request).url.endsWith('/usuarios'))).toHaveLength(1)
})
it('edita perfil y roles, cambia contraseña y desactiva/reactiva', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Editar ana' }))
  let dialog = within(screen.getByRole('dialog'))
  await userEvent.clear(dialog.getByLabelText('Nombre', { exact: false })); await userEvent.type(dialog.getByLabelText('Nombre', { exact: false }), 'María')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('María Pérez')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña ana' }))
  dialog = within(screen.getByRole('dialog'))
  await userEvent.type(dialog.getByLabelText('Nueva contraseña', { exact: false }), 'NuevaFicticia123!')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar ana' }))
  dialog = within(screen.getByRole('dialog')); await userEvent.click(dialog.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Reactivar ana' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Reactivar ana' }))
  dialog = within(screen.getByRole('dialog')); await userEvent.click(dialog.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Desactivar ana' })).toBeTruthy()
})
it('roles insuficientes no muestran administración ni consultan sus endpoints', async () => {
  isAdmin = false; mount()
  expect(await screen.findByText('No tenés permiso para administrar usuarios.')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Usuarios' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.map(([r]) => (r as Request).url).some(url => url.endsWith('/roles') || url.includes('/usuarios?'))).toBe(false)
})
it('duplicado se presenta en formulario sin cerrar ni reenviar', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Editar ana' }))
  vi.mocked(fetch).mockResolvedValueOnce(json({ title: 'El usuario o correo ya existe.', code: 'DUPLICATE_VALUE' }, 409))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'El usuario o correo ya existe.')
  expect(screen.getByRole('dialog')).toBeTruthy()
})

it('recuperar foco conserva formulario sin cambios de identidad', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
  await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Nombre', { exact: false }), 'Conservar')
  fireEvent(window, new Event('focus'))
  await waitFor(() => expect(screen.queryByText('Comprobando sesión…')).toBeNull())
  expect((within(screen.getByRole('dialog')).getByLabelText('Nombre', { exact: false }) as HTMLInputElement).value).toBe('Conservar')
})

it('bloquea envío del diálogo mientras comprueba sesión y ante fallo de comprobación', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Editar ana' }))
  const save = within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }) as HTMLButtonElement
  const form = save.closest('form')!
  let fail: (reason: Error) => void = () => {}
  const normal = vi.mocked(fetch).getMockImplementation()!
  vi.mocked(fetch).mockImplementation(async (r, init) => (r as Request).url.endsWith('/me') ? new Promise<Response>((_, reject) => { fail = reject }) : normal(r, init))
  fireEvent(window, new Event('focus'))
  await waitFor(() => expect(save.disabled).toBe(true))
  fireEvent.submit(form)
  expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).method === 'PATCH')).toBe(false)
  fail(new TypeError('network'))
  await screen.findByText('Necesitamos comprobar tu sesión antes de guardar. Podés cancelar y reintentar desde la pantalla.')
  expect(save.disabled).toBe(true)
  fireEvent.submit(form)
  expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).method === 'PATCH')).toBe(false)
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
  vi.mocked(fetch).mockImplementation(normal)
  await userEvent.click(await screen.findByRole('button', { name: 'Reintentar sesión' }))
  await waitFor(() => expect(screen.queryByText('Comprobando sesión…')).toBeNull())
  expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeTruthy()
})
