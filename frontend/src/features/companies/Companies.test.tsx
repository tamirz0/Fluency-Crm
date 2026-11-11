import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import App from '../../App'
import { AuthProvider } from '../../auth/AuthContext'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.invalid', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: ['ConsultarComercial', 'GestionarClientes', 'GestionarOportunidad'] }
const firstCompany = { id: 4, razonSocial: 'Acme Idiomas', cuit: '30-12345678-9', industria: 'Educación', correo: 'contacto@acme.com', telefono: '1144445555', direccion: 'Calle 1', idEstado: 1, estadoDescripcion: 'Potencial', estadoActivo: true, idOrigen: 2, origenDescripcion: 'Referido', origenActivo: true, idResponsable: 8, responsableNombre: 'Otro Usuario', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: 'Primera línea\nSegunda línea' }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function page(items: unknown[], totalCount = items.length, page = 1) { return { items, totalCount, page, pageSize: 25 } }
let company = { ...firstCompany }
let states: { id: number; descripcion: string; activo: boolean }[]
let listHandler: (request: Request) => Response | Promise<Response>
let writeHandler: (request: Request) => Response | Promise<Response>
let removeHandler: () => Response
let permissions: string[]
let authenticated = true
function renderApp(path = '/empresas') {
  window.history.pushState({}, '', path)
  return render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}
function requestCalls(method: string) { return vi.mocked(fetch).mock.calls.map(([input]) => input as Request).filter(r => r.method === method && new URL(r.url).pathname.includes('/empresas')) }
beforeEach(() => {
  sessionStorage.clear(); authenticated = true; company = { ...firstCompany }
  permissions = [...user.permisos]
  removeHandler = () => { listHandler = () => json(page([])); return new Response(null, { status: 204 }) }
  states = [{ id: 1, descripcion: 'Potencial', activo: true }, { id: 2, descripcion: 'Cliente', activo: true }]
  listHandler = () => json(page([company]))
  writeHandler = async request => { company = { ...company, ...await request.clone().json() }; return json(company, request.method === 'POST' ? 201 : 200) }
  vi.stubGlobal('fetch', vi.fn(async input => {
    const request = input as Request; const url = new URL(request.url); const path = url.pathname.replace('/api', '')
    if (path === '/auth/me') return authenticated ? json({ usuario: { ...user, permisos: permissions } }) : json({ title: 'Sin sesión' }, 401)
    if (path === '/auth/csrf') return json({ requestToken: 'fixture-csrf' })
    if (path === '/catalogos/estados-cliente/opciones') return json(states)
    if (path === '/catalogos/origenes-comerciales/opciones') return json([{ id: 2, descripcion: 'Referido', activo: true }])
    if (path === '/usuarios/opciones') return json(page([{ id: 8, nombre: 'Otro', apellido: 'Usuario', roles: ['RESPONSABLE_COMERCIAL'] }]))
    if (path === '/empresas' && request.method === 'GET') return listHandler(request)
    if ((path === '/empresas' && request.method === 'POST') || (path === '/empresas/4' && request.method === 'PATCH')) return writeHandler(request)
    if (path === '/empresas/4' && request.method === 'DELETE') return removeHandler()
    if (path === '/empresas/4') return json(company)
    return json({ title: 'No existe la empresa.' }, 404)
  }))
})

describe('empresas CP08 con sesión real', () => {
  async function openCompanyActions() {
    const table = within(await screen.findByRole('table', { name: 'Empresas' }))
    await userEvent.setup().click(table.getByRole('button', { name: 'Opciones de Acme Idiomas' }))
    return within(await screen.findByRole('menu'))
  }

  it('muestra acciones autorizadas para una empresa ajena y conserva el contexto del alta comercial', async () => {
    renderApp()
    const menu = await openCompanyActions()
    expect(window.location.pathname).toBe('/empresas')
    expect(menu.getByRole('menuitem', { name: 'Ver ficha completa' }).getAttribute('href')).toBe('/empresas/4')
    expect(menu.getByRole('menuitem', { name: 'Editar datos de empresa' }).getAttribute('href')).toBe('/empresas/4/editar')
    expect(menu.getByRole('menuitem', { name: 'Crear oportunidad comercial' }).getAttribute('href')).toBe('/oportunidades/nueva?idEmpresa=4')
    expect(menu.queryByRole('menuitem', { name: 'Asignar responsable' })).toBeNull()
  })

  it('oculta las acciones de escritura cuando la sesión solo permite consultar', async () => {
    permissions = ['ConsultarComercial']
    renderApp()
    const menu = await openCompanyActions()
    expect(menu.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Ver ficha completa'])
  })

  it('pide confirmación, conserva la empresa ante un conflicto y actualiza la lista cuando la baja se completa', async () => {
    removeHandler = () => json({ title: 'Tiene contactos activos.' }, 409)
    renderApp()
    const actor = userEvent.setup()
    await actor.click((await openCompanyActions()).getByRole('menuitem', { name: 'Dar de baja' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Dar de baja la empresa' }))
    expect(requestCalls('DELETE')).toHaveLength(0)
    const confirm = dialog.getByRole('button', { name: 'Dar de baja definitivamente' })
    await actor.click(confirm)
    expect(await dialog.findByText('Tiene contactos activos.')).toBeTruthy()
    removeHandler = () => { listHandler = () => json(page([])); return new Response(null, { status: 204 }) }
    await actor.click(confirm)
    expect(await screen.findByText('Empresa dada de baja')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Todavía no hay empresas' })).toBeTruthy()
  })

  it('protege listado y ficha sin sesión; no confía en sessionStorage', async () => {
    authenticated = false; sessionStorage.setItem('fluency.auth.user.v1', JSON.stringify(user)); renderApp('/empresas/4')
    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeTruthy()
    expect(requestCalls('GET')).toHaveLength(0)
  })
  it('conserva tabla, segunda columna Estado, enlaces, responsable y navegación por teclado', async () => {
    renderApp(); const table = within(await screen.findByRole('table', { name: 'Empresas' }))
    expect(table.getAllByRole('columnheader')[1].textContent).toBe('Estado')
    expect(table.getByRole('link', { name: 'contacto@acme.com' }).getAttribute('href')).toBe('mailto:contacto@acme.com')
    expect(table.getByRole('link', { name: '1144445555' }).getAttribute('href')).toBe('tel:1144445555')
    expect(table.getByText('Otro Usuario')).toBeTruthy()
    const link = table.getByRole('link', { name: 'Abrir ficha de Acme Idiomas' }); link.focus(); await userEvent.setup().keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Acme Idiomas' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBe('page')
  })
  it('muestra carga y vacío sin perder filtros ni el alta', async () => {
    let resolve!: (response: Response) => void
    listHandler = () => new Promise<Response>(r => { resolve = r }); renderApp()
    expect(await screen.findByRole('status', { name: 'Cargando empresas' })).toBeTruthy()
    resolve(json(page([])))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay empresas' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Nueva empresa' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Buscar empresas' })).toBeTruthy()
  })
  it('reintenta errores de listado y representa valores vacíos con guiones', async () => {
    listHandler = () => json({ title: 'Fallo de listado' }, 500); renderApp()
    await screen.findByRole('heading', { name: 'No pudimos cargar las empresas' })
    listHandler = () => json(page([{ ...company, cuit: null, industria: null, correo: null, telefono: null, origenDescripcion: null }]))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    const table = within(await screen.findByRole('table', { name: 'Empresas' })); expect(table.getAllByText('-').length).toBeGreaterThanOrEqual(4)
  })
  it('envía búsqueda, filtros y página al servidor y respeta su orden y conteo', async () => {
    listHandler = request => json(page([{ ...company, razonSocial: new URL(request.url).searchParams.get('page') === '2' ? 'Segunda página' : 'Primera página' }], 26))
    renderApp(); await screen.findByRole('table', { name: 'Empresas' }); const actor = userEvent.setup()
    await actor.type(screen.getByRole('searchbox', { name: 'Buscar empresas' }), 'acme'); await actor.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(requestCalls('GET').at(-1)?.url).toContain('q=acme'))
    await actor.click(screen.getByRole('combobox', { name: 'Estado' })); await actor.click(screen.getByRole('option', { name: 'Cliente' }))
    await waitFor(() => expect(requestCalls('GET').at(-1)?.url).toContain('idEstado=2'))
    await actor.click(screen.getByRole('combobox', { name: 'Origen' })); await actor.click(screen.getByRole('option', { name: 'Referido' }))
    await actor.click(screen.getByRole('combobox', { name: 'Responsable' })); await actor.click(await screen.findByRole('option', { name: 'Otro Usuario' }))
    await waitFor(() => expect(requestCalls('GET').at(-1)?.url).toContain('idResponsable=8'))
    await actor.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(requestCalls('GET').at(-1)?.url).toContain('page=2'))
    expect(within(await screen.findByRole('table', { name: 'Empresas' })).getByText('Segunda página')).toBeTruthy()
    expect(requestCalls('GET').at(-1)?.url).toContain('idOrigen=2')
    await actor.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(requestCalls('GET').at(-1)?.url).not.toContain('idEstado='))
    expect(requestCalls('GET').at(-1)?.url).toContain('page=1')
  })
  it('muestra ficha con fecha local, etiquetas históricas, notas y edición compartida', async () => {
    company = { ...company, responsableActivo: false, estadoActivo: false, origenActivo: false }; renderApp('/empresas/4')
    await screen.findByRole('heading', { name: 'Acme Idiomas' })
    expect(screen.getByText('Otro Usuario (inactivo)')).toBeTruthy(); expect(screen.getByText('Referido (inactivo)')).toBeTruthy()
    expect(screen.getByText(new Date(company.fechaCreacion).toLocaleString('es-AR'))).toBeTruthy()
    expect(screen.getByText(/Primera línea\s+Segunda línea/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Editar empresa' })).toBeTruthy()
  })
  it('no consulta IDs inválidos y muestra 404 como registro inexistente', async () => {
    renderApp('/empresas/0'); expect(await screen.findByRole('heading', { name: 'No encontramos esa empresa' })).toBeTruthy(); expect(requestCalls('GET')).toHaveLength(0)
  })
  it('muestra una ficha 404 como registro inexistente y permite volver', async () => {
    renderApp('/empresas/99')
    expect(await screen.findByRole('heading', { name: 'No encontramos esa empresa' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver a empresas' }))
    expect(await screen.findByRole('table', { name: 'Empresas' })).toBeTruthy()
  })
  it('conserva carga y reintento de la ficha ante errores de API', async () => {
    const handler = vi.mocked(fetch).getMockImplementation()!
    let resolve!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(input => (input as Request).url.endsWith('/empresas/4') ? new Promise<Response>(r => { resolve = r }) : handler(input))
    renderApp('/empresas/4')
    expect(await screen.findByRole('status', { name: 'Cargando detalle de la empresa' })).toBeTruthy()
    resolve(json({ title: 'Fallo' }, 500))
    await screen.findByRole('heading', { name: 'No pudimos cargar los datos de la empresa' })
    vi.mocked(fetch).mockImplementation(handler)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Acme Idiomas' })).toBeTruthy()
  })
  it('crea con defaults omitidos o responsable diferente y previene doble envío', async () => {
    renderApp('/empresas/nueva'); await screen.findByRole('heading', { name: 'Nueva empresa' }); const actor = userEvent.setup()
    await screen.findByText('Predeterminado: Potencial.')
    await actor.type(screen.getByRole('textbox', { name: 'Razón social' }), '  Empresa nueva  ')
    await actor.click(screen.getByRole('combobox', { name: 'Responsable' })); await actor.click(await screen.findByRole('option', { name: 'Otro Usuario' }))
    await actor.dblClick(screen.getByRole('button', { name: 'Crear empresa' }))
    await screen.findByText('Empresa creada'); expect(requestCalls('POST')).toHaveLength(1)
    expect(await requestCalls('POST')[0].clone().json()).toEqual({ razonSocial: 'Empresa nueva', idResponsable: 8 })
  })
  it('exige elegir estado si Potencial no está disponible', async () => {
    states = [{ id: 2, descripcion: 'Cliente', activo: true }]; renderApp('/empresas/nueva')
    await screen.findByText('Potencial no está disponible. Seleccioná un estado activo.')
    expect((screen.getByRole('button', { name: 'Crear empresa' }) as HTMLButtonElement).disabled).toBe(true)
    const actor = userEvent.setup()
    await actor.type(screen.getByRole('textbox', { name: 'Razón social' }), 'Estado explícito')
    await actor.click(screen.getByRole('combobox', { name: 'Estado' })); await actor.click(screen.getByRole('option', { name: 'Cliente' }))
    await actor.click(screen.getByRole('button', { name: 'Crear empresa' })); await screen.findByText('Empresa creada')
    expect(await requestCalls('POST')[0].clone().json()).toEqual({ razonSocial: 'Estado explícito', idEstado: 2 })
  })
  it('edita ajena con PATCH diferencial, limpia opcionales y conserva referencias inactivas', async () => {
    company = { ...company, responsableActivo: false, estadoActivo: false, origenActivo: false }; states = []
    renderApp('/empresas/4/editar'); await screen.findByRole('heading', { name: 'Editar empresa' }); const actor = userEvent.setup()
    const button = screen.getByRole('button', { name: 'Guardar cambios' }); expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Responsable' }).getAttribute('value')).toBe('Otro Usuario (inactivo)')
    await actor.clear(screen.getByRole('textbox', { name: 'CUIT' })); await actor.click(button)
    await screen.findByText('Empresa actualizada'); expect(await requestCalls('PATCH')[0].clone().json()).toEqual({ cuit: null })
  })
  it('mantiene valores y permite reintentar después de 409 sin escribir campos ocultos', async () => {
    writeHandler = () => json({ code: 'CONCURRENT_CHANGE', title: 'Los datos cambiaron. Recargue e intente nuevamente.' }, 409)
    renderApp('/empresas/4/editar'); await screen.findByRole('heading', { name: 'Editar empresa' }); const actor = userEvent.setup()
    const industry = screen.getByRole('textbox', { name: 'Industria' }); await actor.clear(industry); await actor.type(industry, 'Servicios'); await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Los datos cambiaron. Recargue e intente nuevamente.'); expect((industry as HTMLInputElement).value).toBe('Servicios')
    expect(await requestCalls('PATCH')[0].clone().json()).toEqual({ industria: 'Servicios' })
    expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
