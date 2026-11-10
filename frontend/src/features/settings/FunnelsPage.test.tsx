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
const types = [{ id: 1, descripcion: 'Clases', activo: true, nivelObligatorio: true }, { id: 2, descripcion: 'Talleres', activo: true, nivelObligatorio: false }]
// Admite una selección puntual de Clases cuyo único servicio (que ya no se ofrece como opción) hoy está inactivo.
const funnel = { id: 1, nombre: 'Inscripciones', descripcion: null, tipos: [{ tipo: types[0], servicios: [{ id: 7, descripcion: 'Inglés viejo', activo: false }] }], activo: true }
const finals = [{ id: 1, nombre: 'Ganada', descripcion: null, orden: 1, idEmbudo: 1, estado: 'GANADA', activo: true }, { id: 2, nombre: 'Perdida', descripcion: null, orden: 2, idEmbudo: 1, estado: 'PERDIDA', activo: true }]
const openStage = (id: number, nombre: string, orden: number, activo = true) => ({ ...finals[0], id, nombre, orden, estado: 'ABIERTA', activo })
function arrangeStages() {
  stages = [{ ...finals[1], nombre: 'No confirmada', orden: 2 }, openStage(5, 'Inactiva', 1, false), openStage(4, 'Propuesta', 12), { ...finals[0], nombre: 'Inscripción', orden: 40 }, openStage(3, 'Consulta', 5)]
}
const openNames = () => within(screen.getByRole('table', { name: 'Etapas abiertas' })).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[1].textContent)
const orderCalls = () => vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'PUT')
let allowed = true, conflict = false, failList = false
let orderGate: Promise<void> | undefined
let funnels = [funnel], stages = [...finals]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  class TestPointerEvent extends MouseEvent {
    pointerId: number
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  allowed = true; conflict = false; failList = false; orderGate = undefined; funnels = [funnel]; stages = [...finals]
  vi.stubGlobal('fetch', vi.fn(async (r: Request) => {
    const url = new URL(r.url), path = url.pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf' })
    if (path.endsWith('/me')) return json({ usuario: allowed ? admin : { ...admin, roles: ['VENDEDOR'], permisos: [] } })
    if (path === '/api/servicios/tipos') return json(types)
    if (path === '/api/servicios') return json({ items: [service], totalCount: 1, page: 1, pageSize: 100 })
    if (r.method !== 'GET') {
      if (path.endsWith('/orden-etapas') && orderGate) await orderGate
      if (conflict) return json({ title: 'Los datos cambiaron. Recargue e intente nuevamente.', code: 'CONCURRENT_CHANGE' }, 409)
      const body = r.body ? await r.clone().json() : {}
      if (path.endsWith('/orden-etapas')) { stages = stages.map(s => ({ ...s, orden: body.etapas.find((e: { id: number }) => e.id === s.id)?.orden ?? s.orden })); return json(stages) }
      if (path.endsWith('/etapas')) { const saved = { ...finals[0], ...body, id: Math.max(...stages.map(s => s.id)) + 1, estado: 'ABIERTA' }; stages = [...stages, saved]; return json(saved, 201) }
      if (path === '/api/embudos') { const saved = { ...funnel, nombre: body.nombre, descripcion: body.descripcion, id: 2 }; funnels = [...funnels, saved]; return json(saved, 201) }
      if (path.startsWith('/api/etapas/')) { const id = Number(path.split('/')[3]); stages = stages.map(s => s.id === id ? { ...s, ...body, ...(path.endsWith('/desactivar') ? { activo: false } : path.endsWith('/reactivar') ? { activo: true, orden: 9 } : {}) } : s); return json(stages.find(s => s.id === id)) }
      const id = Number(path.split('/')[3]); funnels = funnels.map(f => f.id === id ? { ...f, ...body, tipos: f.tipos, ...(path.endsWith('/desactivar') ? { activo: false } : path.endsWith('/reactivar') ? { activo: true } : {}) } : f); return json(funnels.find(f => f.id === id))
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
  expect(d.queryByLabelText('Orden', { exact: false })).toBeNull()
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Consulta')
  const form = d.getByRole('button', { name: 'Guardar' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(await screen.findByRole('button', { name: 'Desactivar Consulta' })).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname.endsWith('/etapas'))).toHaveLength(1)
  const create = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname.endsWith('/etapas'))!
  expect(await (create[0] as Request).clone().json()).toEqual({ nombre: 'Consulta', descripcion: null, orden: 3 })
})
it('muestra conflicto de orden, recarga datos y no repite la mutación', async () => {
  arrangeStages()
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  const handle = await screen.findByRole('button', { name: 'Mover Consulta' })
  fireEvent.keyDown(handle, { key: 'ArrowDown' })
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
  conflict = true; await userEvent.click(screen.getByRole('button', { name: 'Guardar orden' }))
  expect(await screen.findByText('Los datos cambiaron. Recargue e intente nuevamente.')).toBeTruthy()
  await waitFor(() => expect(openNames()).toEqual(['Consulta', 'Propuesta', 'Inactiva']))
  expect(orderCalls()).toHaveLength(1)
  expect((screen.getByRole('button', { name: 'Guardar orden' }) as HTMLButtonElement).disabled).toBe(true)
})
it('deniega configuración y no consulta embudos para operadores', async () => {
  allowed = false; mount()
  expect(await screen.findByText('No tenés permiso para administrar embudos.')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Embudos y etapas' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).pathname === '/api/embudos')).toBe(false)
})
it('crea embudo admitiendo un tipo, edita conservando el servicio inactivo y muestra el bloqueo de baja', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Nuevo embudo' }))
  let d = within(screen.getByRole('dialog'))
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Nuevo proceso')
  expect(d.getByText(/Se crearán las etapas Consulta recibida, Necesidad relevada, Nivel de inglés evaluado y Presupuesto enviado/)).toBeTruthy()
  await userEvent.click(await d.findByRole('checkbox', { name: 'Clases' }))
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('Nuevo proceso')).toBeTruthy()
  const create = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/embudos')!
  expect(await (create[0] as Request).clone().json()).toEqual({ nombre: 'Nuevo proceso', descripcion: null, tipos: [{ idTipoServicio: 1, idServicios: null }] })
  await userEvent.click(screen.getByRole('button', { name: 'Editar Inscripciones' })); d = within(screen.getByRole('dialog'))
  // El servicio admitido sigue legible aunque hoy esté inactivo y no viaja si no cambia la admisión.
  expect(await d.findByText('Inglés viejo (Inactivo)')).toBeTruthy()
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
it('exige al menos un tipo y permite admitir todos los servicios de un tipo o solo algunos', async () => {
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Nuevo embudo' }))
  const d = within(screen.getByRole('dialog'))
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Solo algunos')
  const posts = () => vi.mocked(fetch).mock.calls.filter(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname === '/api/embudos')
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await d.findByText('Seleccioná al menos un tipo de servicio.')).toBeTruthy(); expect(posts()).toHaveLength(0)
  await userEvent.click(await d.findByRole('checkbox', { name: 'Clases' }))
  expect((d.getByRole('radio', { name: /Todos los servicios de este tipo/ }) as HTMLInputElement).checked).toBe(true)
  await userEvent.click(d.getByRole('radio', { name: 'Solo algunos' }))
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await d.findByText('Elegí al menos un servicio o admití todos los del tipo.')).toBeTruthy(); expect(posts()).toHaveLength(0)
  fireEvent.mouseDown(await d.findByRole('combobox', { name: /Servicios de Clases/ })); await userEvent.click(await screen.findByRole('option', { name: 'Inglés' }))
  await userEvent.keyboard('{Escape}')
  await userEvent.click(await d.findByRole('checkbox', { name: 'Talleres' }))
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(posts()).toHaveLength(1))
  expect(await (posts()[0][0] as Request).clone().json()).toEqual({ nombre: 'Solo algunos', descripcion: null, tipos: [{ idTipoServicio: 1, idServicios: [1] }, { idTipoServicio: 2, idServicios: null }] })
})
it('oculta embudo y estado en finales y permite desactivar/reactivar abiertas', async () => {
  stages = [...finals, { ...finals[0], id: 3, nombre: 'Consulta', estado: 'ABIERTA', orden: 3 }]
  mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Editar Ganada' }))
  let d = within(screen.getByRole('dialog'))
  expect(d.queryByLabelText('Embudo')).toBeNull(); expect(d.queryByLabelText('Estado')).toBeNull(); expect(d.queryByLabelText('Orden', { exact: false })).toBeNull()
  await userEvent.type(d.getByLabelText('Descripción'), 'Texto final')
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  const patch = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'PATCH')!
  expect(await (patch[0] as Request).clone().json()).toEqual({ descripcion: 'Texto final' })
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar Consulta' })); d = within(screen.getByRole('dialog'))
  await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Reactivar Consulta' })); d = within(screen.getByRole('dialog'))
  await userEvent.click(d.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('button', { name: 'Desactivar Consulta' })).toBeTruthy()
  expect(stages.find(s => s.nombre === 'Consulta')?.orden).toBe(9)
})
it('separa abiertas numeradas y finales fijas por estado aunque tengan nombres y órdenes diferentes', async () => {
  arrangeStages(); mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  const open = within(await screen.findByRole('table', { name: 'Etapas abiertas' }))
  expect(openNames()).toEqual(['Consulta', 'Propuesta', 'Inactiva'])
  expect(open.getAllByRole('row').slice(1).map(row => within(row).getByLabelText(/Posición visual/).textContent)).toEqual(['1', '2', '3'])
  expect((open.getByRole('button', { name: 'Mover Inactiva' }) as HTMLButtonElement).disabled).toBe(true)
  const system = within(screen.getByRole('table', { name: 'Etapas finales del sistema' }))
  expect(system.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent)).toEqual(['InscripciónSistema', 'No confirmadaSistema'])
  expect(system.queryByRole('columnheader', { name: 'Orden' })).toBeNull()
  expect(system.queryByRole('button', { name: /Mover|Desactivar|Reactivar/ })).toBeNull()
  expect(system.queryByLabelText(/Posición visual/)).toBeNull()
})
it('arrastra solo abiertas activas y guarda una vez conservando posiciones, huecos y finales', async () => {
  arrangeStages(); mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  const handle = await screen.findByRole('button', { name: 'Mover Consulta' })
  const rows = within(screen.getByRole('table', { name: 'Etapas abiertas' })).getAllByRole('row').slice(1)
  rows.forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: index * 50, bottom: index * 50 + 50 } as DOMRect))
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 25 })
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 125 })
  expect(openNames()).toEqual(['Consulta', 'Propuesta', 'Inactiva'])
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 75 })
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 75 })
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
  expect(orderCalls()).toHaveLength(0)
  const form = screen.getByRole('button', { name: 'Guardar orden' }).closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  await waitFor(() => expect(orderCalls()).toHaveLength(1))
  expect(await (orderCalls()[0][0] as Request).clone().json()).toEqual({ etapas: [{ id: 2, orden: 2 }, { id: 4, orden: 5 }, { id: 1, orden: 40 }, { id: 3, orden: 12 }] })
  expect(await screen.findByText('Orden guardado.')).toBeTruthy()
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
})
it('permite teclado, anuncia la posición y cancela un arrastre sin cambiar el borrador anterior', async () => {
  arrangeStages(); mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  const handle = await screen.findByRole('button', { name: 'Mover Consulta' })
  handle.focus(); fireEvent.keyDown(handle, { key: 'ArrowDown' })
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
  expect(screen.getByRole('status').textContent).toBe('Consulta, posición 2 de 2 etapas abiertas activas.')
  expect(document.activeElement).toBe(handle)
  const rows = within(screen.getByRole('table', { name: 'Etapas abiertas' })).getAllByRole('row').slice(1)
  rows.forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: index * 50, bottom: index * 50 + 50 } as DOMRect))
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 75 })
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 25 })
  fireEvent.pointerCancel(handle, { pointerId: 1 })
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
  fireEvent.keyDown(handle, { key: 'ArrowUp' })
  expect(openNames()).toEqual(['Consulta', 'Propuesta', 'Inactiva'])
  expect((screen.getByRole('button', { name: 'Guardar orden' }) as HTMLButtonElement).disabled).toBe(true)
  expect(orderCalls()).toHaveLength(0)
})
it('crea al máximo activo más uno aunque la numeración visual sea diferente', async () => {
  arrangeStages(); mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  await screen.findByRole('button', { name: 'Mover Consulta' })
  await userEvent.click(screen.getByRole('button', { name: 'Nueva etapa abierta' }))
  const d = within(screen.getByRole('dialog'))
  await userEvent.type(d.getByLabelText('Nombre', { exact: false }), 'Seguimiento')
  await userEvent.click(d.getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByRole('button', { name: 'Mover Seguimiento' })).toBeTruthy()
  const create = vi.mocked(fetch).mock.calls.find(([r]) => (r as Request).method === 'POST' && new URL((r as Request).url).pathname.endsWith('/etapas'))!
  expect(await (create[0] as Request).clone().json()).toEqual({ nombre: 'Seguimiento', descripcion: null, orden: 41 })
  expect(screen.getByLabelText('Posición visual de Seguimiento').textContent).toBe('3')
})
it('bloquea movimientos y doble envío mientras guarda el orden', async () => {
  arrangeStages(); mount(); await userEvent.click(await screen.findByRole('button', { name: 'Etapas de Inscripciones' }))
  const handle = await screen.findByRole('button', { name: 'Mover Consulta' })
  fireEvent.keyDown(handle, { key: 'ArrowDown' })
  let release!: () => void
  orderGate = new Promise<void>(resolve => { release = resolve })
  const form = screen.getByRole('button', { name: 'Guardar orden' }).closest('form')!
  fireEvent.submit(form)
  expect((await screen.findByRole('button', { name: 'Guardando…' }) as HTMLButtonElement).disabled).toBe(true)
  expect((handle as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Editar Inscripción' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.keyDown(handle, { key: 'ArrowUp' }); fireEvent.submit(form)
  expect(openNames()).toEqual(['Propuesta', 'Consulta', 'Inactiva'])
  release()
  expect(await screen.findByText('Orden guardado.')).toBeTruthy()
  expect(orderCalls()).toHaveLength(1)
})
it('permite reintentar carga y envía búsqueda al servidor', async () => {
  failList = true; mount(); expect(await screen.findByText('Error de carga.')).toBeTruthy()
  failList = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  await screen.findByText('Inscripciones')
  await userEvent.type(screen.getByLabelText('Buscar embudos'), 'Proceso'); await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([r]) => new URL((r as Request).url).searchParams.get('q') === 'Proceso')).toBe(true))
})
