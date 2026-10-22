import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const admin = { id: 1, nombre: 'Ana', apellido: 'Pérez', correo: 'ana@example.invalid', username: 'ana', activo: true, roles: ['ADMINISTRADOR'], permisos: ['AdministrarConfiguracion'] }
let isAdmin = true
let failList = false
let failSave = false
let items = [{ id: 1, descripcion: 'Sitio Web', nombre: null as string | null, activo: true }]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  isAdmin = true; failList = false; failSave = false; items = [{ id: 1, descripcion: 'Sitio Web', nombre: null, activo: true }]
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf' })
    if (url.pathname.endsWith('/me')) return json({ usuario: isAdmin ? admin : { ...admin, roles: ['VENDEDOR'], permisos: [] }, expiresAt: '2026-10-23T07:00:00Z' })
    if (url.pathname === '/api/estados-oportunidad') return json(['ABIERTA', 'GANADA', 'PERDIDA'].map((codigo, i) => ({ id: i + 1, codigo, descripcion: ["Abierta", "Ganada", "Perdida"][i] })))
    if (request.method === 'POST' && !url.pathname.endsWith('activar')) {
      if (failSave) return json({ title: 'La etiqueta ya existe.', code: 'DUPLICATE_VALUE' }, 409)
      const body = await request.json(); const item = { ...body, id: 2, activo: true }; items = [...items, item]; return json(item, 201)
    }
    if (request.method === 'PATCH') { const body = await request.json(); items = items.map(item => item.id === 2 ? { ...item, ...body } : item); return json(items[1]) }
    if (request.method === 'POST') { const id = Number(url.pathname.split('/').at(-2)); items = items.map(item => item.id === id ? { ...item, activo: url.pathname.endsWith('/reactivar') } : item); return json(items.find(item => item.id === id)) }
    if (failList) return json({ title: 'No pudimos cargar el catálogo.' }, 500)
    const active = url.searchParams.get('activo'); const q = url.searchParams.get('q') ?? ''
    const filtered = items.filter(item => (active === 'todos' || active === null || item.activo === (active === 'true')) && (item.descripcion ?? item.nombre ?? "").toLowerCase().includes(q.toLowerCase()))
    return json({ items: filtered, page: 1, pageSize: 25, totalCount: filtered.length })
  }))
})
function mount() {
  window.history.pushState({}, '', '/configuracion/catalogos')
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}
async function choose(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}
it('crea, edita, desactiva y reactiva conservando etiqueta y evitando doble envío', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva opción' }))
  let dialog = within(screen.getByRole('dialog'))
  await userEvent.type(dialog.getByLabelText('Descripción', { exact: false }), 'Referido CP05')
  const form = dialog.getByRole('button', { name: 'Guardar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByText('Referido CP05')).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/catalogos/origenes-comerciales')).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Editar Referido CP05' }))
  dialog = within(screen.getByRole('dialog'))
  await userEvent.clear(dialog.getByLabelText('Descripción', { exact: false }))
  await userEvent.type(dialog.getByLabelText('Descripción', { exact: false }), 'Referencia CP05')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Desactivar Referencia CP05' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Reactivar Referencia CP05' })).toBeTruthy()
  expect(screen.getByText('Referencia CP05')).toBeTruthy()
  await choose('Estado', 'Inactivos')
  await waitFor(() => expect(screen.queryByText('Sitio Web')).toBeNull())
  await choose('Estado', 'Todos')
  await userEvent.click(screen.getByRole('button', { name: 'Reactivar Referencia CP05' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Desactivar Referencia CP05' })).toBeTruthy()
})
it('muestra estados fijos sin acciones y usa nombre para tipos de actividad', async () => {
  mount(); await screen.findByRole('heading', { name: 'Catálogos' })
  await choose('Catálogo', 'Estados de oportunidad')
  expect(await screen.findByText('ABIERTA')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Nueva opción' })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()
  expect(screen.queryByRole('button', { name: /^Desactivar / })).toBeNull()
  await choose('Catálogo', 'Tipos de actividad')
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva opción' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.type(dialog.getByLabelText('Nombre', { exact: false }), 'Llamada CP05')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/catalogos/tipos-actividad')).toBe(true))
})
it('permite reintentar carga, muestra vacío y conserva el formulario cuando falla guardar', async () => {
  failList = true; mount()
  expect(await screen.findByText('No pudimos cargar el catálogo.')).toBeTruthy()
  failList = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await screen.findByText('Sitio Web')
  await userEvent.type(screen.getByLabelText('Buscar opciones'), 'ausente')
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(await screen.findByText('No hay opciones para estos filtros.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Nueva opción' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  expect(await dialog.findByText('El campo es obligatorio.')).toBeTruthy()
  await userEvent.type(dialog.getByLabelText('Descripción', { exact: false }), 'Sitio Web')
  failSave = true; await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  expect(await dialog.findByText('La etiqueta ya existe.')).toBeTruthy()
  expect((dialog.getByLabelText('Descripción', { exact: false }) as HTMLInputElement).value).toBe('Sitio Web')
  expect((dialog.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(false)
})
it('impide entrar por URL y oculta navegación administrativa a vendedores', async () => {
  isAdmin = false; mount()
  expect(await screen.findByText('No tenés permiso para administrar catálogos.')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Catálogos' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname.includes('/catalogos/'))).toBe(false)
})
