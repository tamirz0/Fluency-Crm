import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const admin = { id: 1, nombre: 'Ana', apellido: 'Prueba', roles: ['ADMINISTRADOR'], permisos: ['AdministrarConfiguracion'] }
const service = { id: 1, nombre: 'Inglés', activo: true }
const funnel = { id: 1, nombre: 'Inscripciones', descripcion: null, servicio: { id: 1, descripcion: 'Inglés', activo: false }, activo: true }
const finals = [{ id: 1, nombre: 'Ganada', descripcion: null, orden: 1, idEmbudo: 1, estado: 'GANADA', activo: true }, { id: 2, nombre: 'Perdida', descripcion: null, orden: 2, idEmbudo: 1, estado: 'PERDIDA', activo: true }]
let allowed = true, conflict = false, failList = false
let funnels = [funnel], stages = [...finals]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  allowed = true; conflict = false; failList = false; funnels = [funnel]; stages = [...finals]
  vi.stubGlobal('fetch', vi.fn(async (r: Request) => {
    const url = new URL(r.url), path = url.pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf' })
    if (path.endsWith('/me')) return json({ usuario: allowed ? admin : { ...admin, roles: ['VENDEDOR'], permisos: [] } })
    if (path === '/api/servicios') return json({ items: [service], totalCount: 1, page: 1, pageSize: 100 })
    if (r.method !== 'GET') {
      if (conflict) return json({ title: 'Los datos cambiaron. Recargue e intente nuevamente.', code: 'CONCURRENT_CHANGE' }, 409)
      const body = r.body ? await r.clone().json() : {}
      if (path.endsWith('/orden-etapas')) { stages = stages.map(s => ({ ...s, orden: body.etapas.find((e: { id: number }) => e.id === s.id)?.orden ?? s.orden })); return json(stages) }
      if (path.endsWith('/etapas')) { const saved = { ...finals[0], ...body, id: 3, estado: 'ABIERTA' }; stages = [...stages, saved]; return json(saved, 201) }
      if (path === '/api/embudos') { const saved = { ...funnel, ...body, id: 2 }; funnels = [...funnels, saved]; return json(saved, 201) }
      if (path.startsWith('/api/etapas/')) { const id = Number(path.split('/')[3]); stages = stages.map(s => s.id === id ? { ...s, ...body, ...(path.endsWith('/desactivar') ? { activo: false } : path.endsWith('/reactivar') ? { activo: true, orden: 9 } : {}) } : s); return json(stages.find(s => s.id === id)) }
      const id = Number(path.split('/')[3]); funnels = funnels.map(f => f.id === id ? { ...f, ...body, ...(path.endsWith('/desactivar') ? { activo: false } : path.endsWith('/reactivar') ? { activo: true } : {}) } : f); return json(funnels.find(f => f.id === id))
    }
    if (path.endsWith('/etapas')) return json(stages)
    if (failList) return json({ title: 'Error de carga.' }, 500)
    return json({ items: funnels, totalCount: funnels.length, page: 1, pageSize: 25 })
  }))
})
function mount() {
  window.history.pushState({}, '', '/configuracion/embudos')
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}
it('explica embudo sin abiertas, conserva finales y crea una abierta con un solo envío', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  expect(await screen.findByText(/no permite altas de oportunidades/i)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Desactivar Ganada' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Nueva etapa abierta' }))
  const d = within(screen.getByRole('dialog'))
  expect(d.queryByLabelText('Estado')).toBeNull()
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Consulta')
  const form = d.getByRole('button', { name: 'Guardar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByRole('button', { name: 'Desactivar Consulta' })).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname.endsWith('/etapas'))).toHaveLength(1)
})
it('muestra conflicto de orden, recarga datos y no repite la mutación', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  await screen.findByLabelText('Orden de Ganada')
  const order = screen.getByLabelText('Orden de Ganada'); fireEvent.change(order, { target: { value: '5' } })
  conflict = true; await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }))
  expect(await screen.findByText('Los datos cambiaron. Recargue e intente nuevamente.')).toBeTruthy()
  await waitFor(() => expect((screen.getByLabelText('Orden de Ganada') as HTMLInputElement).value).toBe('1'))
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'PUT')).toHaveLength(1)
})
it('deniega configuración y no consulta embudos para operadores', async () => {
  allowed = false; mount()
  expect(await screen.findByText('No tenés permiso para administrar embudos.')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Embudos y etapas' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname === '/api/embudos')).toBe(false)
})
it('crea embudo sin abiertas, edita conservando servicio inactivo y muestra el bloqueo de baja', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Nuevo embudo' }))
  let d = within(screen.getByRole('dialog'))
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Nuevo proceso')
  fireEvent.mouseDown(d.getByRole('combobox', { name: /Servicio/ })); await userEvent.click(await screen.findByRole('option', { name: 'Inglés' }))
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('Nuevo proceso')).toBeTruthy()
  const create = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/embudos')!
  expect(await (create[0] as Request).clone().json()).toEqual({ nombre: 'Nuevo proceso', descripcion: null, idServicio: 1 })
  await userEvent.click(screen.getByRole('button', { name: 'Editar Inscripciones' })); d = within(screen.getByRole('dialog'))
  // The current service stays readable even if no longer available for new assignments.
  await userEvent.type(d.getByLabelText('Descripción'), 'Actualizada')
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  const patch = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'PATCH')!
  expect(await (patch[0] as Request).clone().json()).toEqual({ descripcion: 'Actualizada' })
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar Inscripciones' })); d = within(screen.getByRole('dialog'))
  conflict = true; await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  expect(await d.findByText('Los datos cambiaron. Recargue e intente nuevamente.')).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => new URL((r as Request).url).pathname.endsWith('/desactivar'))).toHaveLength(1)
  conflict = false; await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Reactivar Inscripciones' })).toBeTruthy()
})
it('oculta embudo y estado en finales y permite desactivar/reactivar abiertas', async () => {
  stages = [...finals, { ...finals[0], id: 3, nombre: 'Consulta', estado: 'ABIERTA', orden: 3 }]
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Editar Ganada' }))
  let d = within(screen.getByRole('dialog'))
  expect(d.queryByLabelText('Embudo')).toBeNull(); expect(d.queryByLabelText('Estado')).toBeNull()
  await userEvent.click(d.getByRole('button', { name: 'Cancelar' }))
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar Consulta' })); d = within(screen.getByRole('dialog'))
  await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Reactivar Consulta' })); d = within(screen.getByRole('dialog'))
  await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  expect((await screen.findByLabelText('Orden de Consulta') as HTMLInputElement).value).toBe('9')
})
it('permite reintentar carga y envía búsqueda al servidor', async () => {
  failList = true; mount(); expect(await screen.findByText('Error de carga.')).toBeTruthy()
  failList = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await screen.findByText('Inscripciones')
  await userEvent.type(screen.getByLabelText('Buscar embudos'), 'Proceso'); await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).searchParams.get('q') === 'Proceso')).toBe(true))
})
