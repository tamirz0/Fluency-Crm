import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const admin = { id: 1, nombre: 'Ana', apellido: 'Prueba', roles: ['ADMINISTRADOR'], permisos: ['AdministrarConfiguracion'] }
let allowed = true, failList = false, failSave = false
const initial = { id: 1, nombre: 'Inglés B1', descripcion: 'Curso', precioReferencia: 10.25, duracionHoras: 20, activo: true, nivel: { id: 1, descripcion: 'B1', activo: false }, modalidad: { id: 1, descripcion: 'Virtual', activo: false } }
let items = [initial]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  allowed = true; failList = false; failSave = false; items = [initial]
  vi.stubGlobal('fetch', vi.fn(async (r: Request) => {
    const url = new URL(r.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf' })
    if (url.pathname.endsWith('/me')) return json({ usuario: allowed ? admin : { ...admin, roles: ['VENDEDOR'], permisos: [] } })
    if (url.pathname.includes('/catalogos/')) return json([{ id: 2, descripcion: 'Otra opción', activo: true }])
    if (r.method === 'POST' && url.pathname === '/api/servicios') {
      if (failSave) return json({ title: 'No se pudo guardar el servicio.' }, 409)
      const body = await r.clone().json(); const saved = { ...initial, ...body, id: 2, nivel: null, modalidad: null }; items = [...items, saved]; return json(saved, 201)
    }
    if (r.method === 'PATCH') {
      if (failSave) return json({ title: 'La referencia no está disponible.' }, 400)
      const body = await r.clone().json(); items = items.map(x => x.id === 1 ? { ...x, ...body } : x); return json(items[0])
    }
    if (r.method === 'POST') { const id = Number(url.pathname.split('/').at(-2)); items = items.map(x => x.id === id ? { ...x, activo: url.pathname.endsWith('/reactivar') } : x); return json(items.find(x => x.id === id)) }
    if (failList) return json({ title: 'Error de carga.' }, 500)
    const active = url.searchParams.get('activo'); const filtered = items.filter(x => active === 'todos' || x.activo === (active === 'true'))
    return json({ items: filtered, totalCount: filtered.length, page: 1, pageSize: 25 })
  }))
})
function mount() {
  window.history.pushState({}, '', '/configuracion/servicios')
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}
it('crea precio cero sin duplicar envíos y desactiva/reactiva', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Nuevo servicio' }))
  const d = within(screen.getByRole('dialog'))
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Curso CP06')
  await userEvent.type(d.getByLabelText('Precio de referencia', { exact: false }), '0')
  const form = d.getByRole('button', { name: 'Guardar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByText('Curso CP06')).toBeTruthy()
  const calls = vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/servicios')
  expect(calls).toHaveLength(1); expect(await (calls[0][0] as Request).clone().json()).toMatchObject({ precioReferencia: 0 })
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar Curso CP06' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Reactivar Curso CP06' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Desactivar Curso CP06' })).toBeTruthy()
})
it('conserva referencias inactivas y precio decimal al editar otro campo; muestra rechazo sin cerrar', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Editar Inglés B1' }))
  const d = within(screen.getByRole('dialog'))
  expect(d.getByText('B1 (Inactivo)')).toBeTruthy(); expect(d.getByText('Virtual (Inactivo)')).toBeTruthy()
  await userEvent.clear(d.getByLabelText('Nombre', { exact: false })); await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Curso editado')
  failSave = true; await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await d.findByText('La referencia no está disponible.')).toBeTruthy()
  expect((d.getByLabelText('Nombre', { exact: false }) as HTMLInputElement).value).toBe('Curso editado')
  failSave = false; await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('Curso editado')).toBeTruthy()
  const call = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'PATCH')!
  expect(await (call[0] as Request).clone().json()).toEqual({ nombre: 'Curso editado' })
})
it('rechaza decimales extra y conserva el precio sin redondear', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Editar Inglés B1' }))
  const d = within(screen.getByRole('dialog')); const price = d.getByLabelText('Precio de referencia', { exact: false })
  await userEvent.clear(price); await userEvent.type(price, '1.005'); await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await d.findByText(/hasta dos decimales/)).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.some(([r]) => (r as Request).method === 'PATCH')).toBe(false)
  await userEvent.clear(price); await userEvent.type(price, '123.45'); await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  const call = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'PATCH')!
  expect(await (call[0] as Request).clone().json()).toEqual({ precioReferencia: 123.45 })
})
it('envía búsqueda/filtro/página al servidor y permite reintentar carga', async () => {
  failList = true; mount(); expect(await screen.findByText('Error de carga.')).toBeTruthy()
  failList = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await screen.findByText('Inglés B1')
  await userEvent.type(screen.getByLabelText('Buscar servicios'), 'B1'); await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).searchParams.get('q') === 'B1')).toBe(true))
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Estado' })); await userEvent.click(await screen.findByRole('option', { name: 'Inactivos' }))
  expect(await screen.findByText('No hay servicios para estos filtros.')).toBeTruthy()
})
it('deniega la pantalla y oculta el enlace a operadores', async () => {
  allowed = false; mount(); expect(await screen.findByText('No tenés permiso para administrar servicios.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Nuevo servicio' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Servicios' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname === '/api/servicios')).toBe(false)
})
