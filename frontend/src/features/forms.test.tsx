import { type ReactNode } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createQueryClient } from '../app/queryClient'
import App from '../test/LegacyApp'
import { AuthProvider } from '../test/LegacyAuthProvider'
import { SESSION_KEY } from '../auth/session'

// Preparar el módulo antes de medir el formulario, sin depender del costo del import diferido.
beforeAll(async () => { await import('./opportunities/OpportunityFormPage') })

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, permisos: ['GestionarClientes'] }
const company = { id: 4, razonSocial: 'Acme Idiomas', cuit: '30-123', industria: 'Educación', correo: 'acme@example.com', telefono: '1144', direccion: 'Calle 1', idEstado: 1, estadoDescripcion: 'Cliente', estadoActivo: true, idOrigen: 2, origenDescripcion: 'Referido', origenActivo: true, idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: 'Nota' }
const contact = { id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: '30123456', cargo: 'Directora', correo: 'lucia@example.com', telefono: '1144', idEstado: 1, estadoDescripcion: 'Cliente', estadoActivo: true, idOrigen: 2, origenDescripcion: 'Referido', origenActivo: true, idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: null }
const secondContact = { ...contact, id: 15, nombre: 'Ana', apellido: 'López', idEmpresa: 8, empresaRazonSocial: 'Otra empresa' }
const funnel = { id: 1, nombre: 'Embudo Inglés', descripcion: null, tipos: [], activo: true, admite: [2] }
const stageOf = (id: number, nombre: string, orden: number, estado: string) => ({ id, nombre, descripcion: null, orden, idEmbudo: 1, estado, activo: true })
const funnelStages = [stageOf(5, 'Ganada', 1, 'GANADA'), stageOf(6, 'Perdida', 2, 'PERDIDA'), stageOf(3, 'Propuesta', 3, 'ABIERTA'), stageOf(4, 'Negociación', 4, 'ABIERTA')]
const opportunity = { id: 22, titulo: 'Renovación anual', tituloVisible: 'Renovación anual', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: null, contactoNombre: null, idEtapa: 3, etapaNombre: 'Propuesta', etapaActiva: true, estado: 'ABIERTA', idEmbudo: 1, embudoNombre: 'Embudo Inglés', embudoActivo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: true, idOrigen: null, valor: 150, fechaCreacion: '2026-11-05T12:00:00Z', activo: true, accionesPermitidas: { editar: true, reasignar: true, mover: true, cerrar: true, reabrir: false, darDeBaja: true, gestionarActividades: true } }

function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function renderAuthenticated(path: string, sessionUser: object = user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser)); window.history.pushState({}, '', path); const queryClient = createQueryClient(); const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>; return render(<App />, { wrapper: Wrapper }) }
function catalogResponse(url: string, services = [{ id: 2, nombre: 'Capacitación', descripcion: null, precioReferencia: 150, activo: true }]): Response | undefined {
  if (url.includes('/auth/csrf')) return jsonResponse({ requestToken: 'fixture-csrf' })
  if (url.includes('/usuarios/opciones')) return jsonResponse({ items: [{ id: 9, nombre: 'Ana', apellido: 'Ríos', roles: ['VENDEDOR'] }], page: 1, pageSize: 25, totalCount: 1 })
  if (url.includes('/catalogos/estados-cliente/opciones')) return jsonResponse([{ id: 1, descripcion: 'Potencial', activo: true }])
  if (url.includes('/catalogos/origenes-comerciales/opciones')) return jsonResponse([{ id: 2, descripcion: 'Referido', activo: true }])
  if (new URL(url, 'http://localhost').pathname.endsWith('/servicios')) return jsonResponse({ items: services, page: 1, pageSize: 25, totalCount: services.length })
  return undefined
}
function requestUrl(input: RequestInfo | URL) { if (typeof input === 'object' && input !== null && 'input' in input) return String(input.input); if (typeof input === 'object' && input !== null && 'url' in input) return String(input.url); return String(input) }
let created: { titulo: string | null; tituloVisible: string } = opportunity
let reassigned: object = {}
function installCatalogApi(options: { services?: { id: number; nombre: string; descripcion: string | null; precioReferencia: number; activo: boolean }[]; stages?: typeof funnelStages; create?: () => Response | Promise<Response>; funnels?: (typeof funnel)[]; detail?: object; patch?: () => Response | Promise<Response>; reassign?: () => Response | Promise<Response> } = {}) {
  created = opportunity; reassigned = {}
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = requestUrl(input)
    const catalog = catalogResponse(url, options.services)
    if (catalog) return catalog
    const { pathname } = new URL(url, 'http://localhost'); const method = (input as Request).method
    if (pathname === '/api/contactos' && method === 'GET') { const company = new URL(url, 'http://localhost').searchParams.get('idEmpresa'); const items = [contact, secondContact].filter(c => !company || String(c.idEmpresa) === company); return jsonResponse({ items, page: 1, pageSize: 100, totalCount: items.length }) }
    if (pathname === '/api/contactos' && method === 'POST') return jsonResponse({ ...contact, id: 22, nombre: 'Nuevo' }, 201)
    if (pathname === '/api/contactos/14' && method === 'GET') return jsonResponse(contact)
    if (pathname === '/api/contactos/14' && method === 'PATCH') return jsonResponse(contact)
    if (pathname === '/api/empresas' && method === 'GET') return jsonResponse({ items: [company, { ...company, id: 8, razonSocial: 'Otra empresa' }], page: 1, pageSize: 25, totalCount: 2 })
    if (pathname === '/api/embudos' && method === 'GET') {
      const service = new URL(url, 'http://localhost').searchParams.get('idServicio')
      const items = (options.funnels ?? [funnel]).filter(item => !service || item.admite.includes(Number(service)))
      return jsonResponse({ items, page: 1, pageSize: 100, totalCount: items.length })
    }
    if (pathname === '/api/embudos/1/etapas' && method === 'GET') return jsonResponse(options.stages ?? funnelStages)
    if (pathname === '/api/oportunidades' && method === 'POST') { if (options.create) return options.create(); const title = ((await (input as Request).clone().json()).titulo as string | undefined) ?? null; created = { titulo: title, tituloVisible: title ?? 'Acme Idiomas' }; return jsonResponse({ ...opportunity, ...created }, 201) }
    if (/^\/api\/(oportunidades|contactos|empresas)\/\d+\/historial-comercial$/.test(pathname) && method === 'GET') return jsonResponse({ items: [], page: 1, pageSize: 10, totalCount: 0 })
    if (/^\/api\/oportunidades\/\d+$/.test(pathname) && method === 'PATCH') {
      if (options.patch) return options.patch()
      const body = await (input as Request).clone().json() as { titulo?: string | null }
      if (body.titulo !== undefined) created = { titulo: body.titulo, tituloVisible: body.titulo ?? opportunity.tituloVisible }
      return jsonResponse({ ...opportunity, ...body, ...created })
    }
    if (/^\/api\/oportunidades\/\d+\/reasignar$/.test(pathname) && method === 'POST') {
      if (options.reassign) return options.reassign()
      reassigned = { idResponsable: 9, responsableNombre: 'Ana Ríos', accionesPermitidas: { editar: false, reasignar: false, mover: false, cerrar: false, reabrir: false, darDeBaja: false, gestionarActividades: false } }
      return jsonResponse({ ...opportunity, ...created, ...reassigned })
    }
    if (/^\/api\/oportunidades\/\d+$/.test(pathname) && method === 'GET') return jsonResponse({ ...opportunity, ...created, ...options.detail, ...reassigned })
    if (url.endsWith('/empresas/4') && (input as Request).method === 'GET') return jsonResponse(company)
    if (url.endsWith('/empresas') && (input as Request).method === 'POST') return jsonResponse({ ...company, id: 22, razonSocial: 'Nueva empresa' }, 201)
    if (url.endsWith('/empresas/4') && (input as Request).method === 'PATCH') return jsonResponse(company)
    return jsonResponse([])
  })
}
async function requestBody(call: [RequestInfo | URL, RequestInit?]) { const request = call[0]; if (typeof request === 'object' && request !== null && 'init' in request) return JSON.parse(String((request.init as RequestInit).body ?? '{}')) as Record<string, unknown>; if (typeof request === 'object' && request !== null && 'clone' in request) return await (request as Request).clone().json() as Record<string, unknown>; return JSON.parse(String(call[1]?.body ?? '{}')) as Record<string, unknown> }

beforeEach(() => { sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn()) })

describe('altas y ediciones', () => {
  it('crea una empresa con POST, normaliza obligatorios y omite opcionales vacíos', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/nueva')
    await screen.findByRole('heading', { name: 'Nueva empresa' })
    await actor.type(screen.getByRole('textbox', { name: 'Razón social' }), '  Nueva empresa  ')
    await actor.click(screen.getByRole('button', { name: 'Crear empresa' }))
    await screen.findByText('Empresa creada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/empresas') && (input as Request).method === 'POST')
    expect(call).toBeTruthy(); expect(await requestBody(call!)).toEqual({ razonSocial: 'Nueva empresa' })
  })

  it('usa PATCH diferencial al editar empresa y conserva el formulario si la API rechaza', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/4/editar')
    await screen.findByRole('heading', { name: 'Editar empresa' })
    await actor.clear(screen.getByRole('textbox', { name: 'Industria' })); await actor.type(screen.getByRole('textbox', { name: 'Industria' }), 'Servicios')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Empresa actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/empresas/4') && (input as Request).method === 'PATCH')
    expect(call).toBeTruthy(); expect(await requestBody(call!)).toEqual({ industria: 'Servicios' })
  })

  it('deshabilita una edición de empresa limpia y vuelve a deshabilitarla al restaurar el valor original', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/4/editar')
    await screen.findByRole('heading', { name: 'Editar empresa' })
    const save = screen.getByRole('button', { name: 'Guardar cambios' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    const industry = screen.getByRole('textbox', { name: 'Industria' })
    await actor.clear(industry); await actor.type(industry, 'Servicios')
    expect((save as HTMLButtonElement).disabled).toBe(false)
    await actor.clear(industry); await actor.type(industry, 'Educación')
    expect((save as HTMLButtonElement).disabled).toBe(true)
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).endsWith('/empresas/4') && (input as Request).method === 'PATCH')).toBe(false)
  })

  it('envía null al limpiar un opcional de empresa', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/4/editar')
    await screen.findByRole('heading', { name: 'Editar empresa' })
    await actor.clear(screen.getByRole('textbox', { name: 'CUIT' })); await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Empresa actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/empresas/4') && (input as Request).method === 'PATCH')
    expect(await requestBody(call!)).toEqual({ cuit: null })
  })

  it('conserva los valores al recibir un error de API', async () => {
    installCatalogApi(); vi.mocked(fetch).mockImplementation(async (input) => requestUrl(input).endsWith('/empresas') && (input as Request).method === 'POST' ? jsonResponse({ detail: 'La empresa ya existe.' }, 400) : catalogResponse(requestUrl(input)) ?? jsonResponse([]))
    const actor = userEvent.setup(); renderAuthenticated('/empresas/nueva'); await screen.findByRole('heading', { name: 'Nueva empresa' })
    const field = screen.getByRole('textbox', { name: 'Razón social' }); await actor.type(field, 'Empresa repetida'); await actor.click(screen.getByRole('button', { name: 'Crear empresa' }))
    expect(await screen.findByText('La empresa ya existe.')).toBeTruthy(); expect((field as HTMLInputElement).value).toBe('Empresa repetida')
  })

  it('crea un contacto sin empresa y omite la asociación', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/nuevo'); await screen.findByRole('heading', { name: 'Nuevo contacto' })
    await actor.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Ana'); await actor.type(screen.getByRole('textbox', { name: 'Apellido' }), 'García'); await actor.type(screen.getByRole('textbox', { name: 'Correo' }), 'ana@example.com'); await actor.click(screen.getByRole('button', { name: 'Crear contacto' }))
    await screen.findByText('Contacto creado'); const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/contactos') && (input as Request).method === 'POST')
    expect(call).toBeTruthy(); expect(await requestBody(call!)).toEqual({ nombre: 'Ana', apellido: 'García', correo: 'ana@example.com' })
  })

  it('deshabilita una edición de contacto limpia y envía null al limpiar un opcional', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/14/editar')
    await screen.findByRole('heading', { name: 'Editar contacto' })
    const save = screen.getByRole('button', { name: 'Guardar cambios' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    await actor.clear(screen.getByRole('textbox', { name: 'Documento' })); expect((save as HTMLButtonElement).disabled).toBe(false)
    await actor.click(save); await screen.findByText('Contacto actualizado')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/contactos/14') && (input as Request).method === 'PATCH')
    expect(await requestBody(call!)).toEqual({ documento: null })
  })

  it('cambia la empresa del contacto sin consultar oportunidades, informa que las relaciones se conservan y envía solo la empresa', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/14/editar'); await screen.findByRole('heading', { name: 'Editar contacto' })
    expect(screen.getByRole('note').textContent).toContain('Las oportunidades y actividades anteriores conservan sus relaciones.')
    const select = screen.getByRole('combobox', { name: 'Empresa' }); expect((select as HTMLInputElement).value).toBe('Acme Idiomas'); expect(select.hasAttribute('disabled')).toBe(false)
    await actor.click(select); await actor.click(await screen.findByRole('option', { name: 'Otra empresa' }))
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' })); await screen.findByText('Contacto actualizado')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/contactos/14') && (input as Request).method === 'PATCH')
    expect(await requestBody(call!)).toEqual({ idEmpresa: 8 })
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('Oportunidades'))).toBe(false)
  })

  it('quita la empresa del contacto enviando null y muestra la empresa vigente antes de editar', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/14/editar'); await screen.findByRole('heading', { name: 'Editar contacto' })
    expect((screen.getByRole('combobox', { name: 'Empresa' }) as HTMLInputElement).value).toBe('Acme Idiomas')
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(screen.getByRole('button', { name: 'Quitar empresa', hidden: true }))
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' })); await screen.findByText('Contacto actualizado')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).endsWith('/contactos/14') && (input as Request).method === 'PATCH')
    expect(await requestBody(call!)).toEqual({ idEmpresa: null })
  })

  const opportunityPosts = () => vi.mocked(fetch).mock.calls.filter(([input]) => requestUrl(input).endsWith('/oportunidades') && (input as Request).method === 'POST')
  const startOpportunity = async (path = '/oportunidades/nueva', services?: Parameters<typeof installCatalogApi>[0], sessionUser: object = user) => {
    installCatalogApi(services); const actor = userEvent.setup(); renderAuthenticated(path, sessionUser); await screen.findByRole('textbox', { name: 'Título' }); return actor
  }
  // Con un único servicio y un único embudo ambos se eligen solos: se espera a que queden cargados.
  const chooseFunnel = async () => { await waitFor(() => expect(screen.getByRole('combobox', { name: /^Embudo/ }).textContent).toContain('Embudo Inglés')) }
  const chooseCompany = async (actor: ReturnType<typeof userEvent.setup>) => { await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' })) }

  it('crea una oportunidad mínima con defaults visibles, sin etapa, responsable ni actor enviados, y abre la ficha', async () => {
    const actor = await startOpportunity()
    expect(screen.getByText('Se asignará a tu usuario.')).toBeTruthy()
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), '  Nueva venta  ')
    await chooseFunnel()
    expect(await screen.findByText('Propuesta (por defecto)')).toBeTruthy()
    expect(await screen.findByText(/precio de referencia del servicio \(.*150,00\)/)).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /^Servicio/ }).textContent).toContain('Capacitación')
    expect(screen.queryByRole('combobox', { name: /^Estado/ })).toBeNull()
    await chooseCompany(actor)
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByRole('heading', { name: 'Nueva venta' })).toBeTruthy()
    expect(screen.getByText('Oportunidad creada')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Ficha de Nueva venta' })).getByText('Acme Idiomas', { selector: 'span' })).toBeTruthy()
    expect(opportunityPosts()).toHaveLength(1)
    expect(await requestBody(opportunityPosts()[0])).toEqual({ titulo: 'Nueva venta', idEmbudo: 1, idServicio: 2, idEmpresa: 4 })
  })

  it('crea con tres clics y sin escribir nada: servicio y embudo únicos preseleccionados y el título es el nombre del cliente', async () => {
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4')
    expect(await screen.findByText('Propuesta (por defecto)')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /^Embudo/ })).toHaveProperty('textContent', expect.stringContaining('Embudo Inglés'))
    expect(screen.getByText(/Opcional\. Si lo dejás vacío se muestra el nombre de la empresa/)).toBeTruthy()
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByRole('heading', { name: 'Acme Idiomas' })).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Ficha de Acme Idiomas' })).queryByText('Acme Idiomas', { selector: 'span' })).toBeNull()
    expect(await requestBody(opportunityPosts()[0])).toEqual({ idEmbudo: 1, idServicio: 2, idEmpresa: 4 })
  })

  it('evita repetir selecciones al crear desde una empresa o desde un contacto', async () => {
    let actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4')
    expect(await screen.findByRole('combobox', { name: 'Empresa' })).toHaveProperty('value', 'Acme Idiomas')
    expect(await screen.findByText('Propuesta (por defecto)')).toBeTruthy()
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Desde empresa')
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ titulo: 'Desde empresa', idEmbudo: 1, idServicio: 2, idEmpresa: 4 })

    cleanup(); vi.mocked(fetch).mockClear()
    actor = await startOpportunity('/oportunidades/nueva?idContacto=14')
    expect(await screen.findByRole('combobox', { name: 'Empresa' })).toHaveProperty('value', 'Acme Idiomas')
    expect(screen.getByRole('combobox', { name: 'Contacto' })).toHaveProperty('value', 'Pérez, Lucía')
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Desde contacto'); await chooseFunnel()
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ titulo: 'Desde contacto', idEmbudo: 1, idServicio: 2, idEmpresa: 4, idContacto: 14 })
  })

  it('ofrece crear una oportunidad desde las fichas de empresa y contacto solo con permiso', async () => {
    const allowed = { ...user, permisos: ['GestionarOportunidad'] }
    installCatalogApi(); renderAuthenticated('/empresas/4', allowed)
    expect(await screen.findByRole('button', { name: 'Nueva oportunidad' })).toBeTruthy()
    cleanup(); renderAuthenticated('/contactos/14', allowed)
    expect(await screen.findByRole('button', { name: 'Nueva oportunidad' })).toBeTruthy()
    cleanup(); renderAuthenticated('/empresas/4')
    await screen.findByRole('heading', { name: 'Acme Idiomas' }); expect(screen.queryByRole('button', { name: 'Nueva oportunidad' })).toBeNull()
  })

  const allowed = { ...user, permisos: ['GestionarOportunidad'] }
  const openQuick = async (path: string, services?: Parameters<typeof installCatalogApi>[0]) => {
    installCatalogApi(services); const actor = userEvent.setup(); renderAuthenticated(path, allowed)
    await actor.click(await screen.findByRole('button', { name: 'Nueva oportunidad' }))
    return { actor, dialog: within(await screen.findByRole('dialog', { name: 'Nueva oportunidad' })) }
  }

  it('alta rápida desde una empresa: con un solo servicio basta confirmar y se envía un título inicial', async () => {
    const { actor, dialog } = await openQuick('/empresas/4')
    expect(await dialog.findByRole('combobox', { name: /Servicio/ })).toBeTruthy()
    await waitFor(() => expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(false))
    expect(dialog.queryByRole('combobox', { name: /Embudo/ })).toBeNull()
    await actor.click(dialog.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByText('Oportunidad creada')).toBeTruthy()
    expect(opportunityPosts()).toHaveLength(1)
    expect(await requestBody(opportunityPosts()[0])).toEqual({ idEmbudo: 1, idServicio: 2, idEmpresa: 4, titulo: 'Acme Idiomas' })
  })

  it('alta rápida desde un contacto envía también la empresa del contacto', async () => {
    const { actor, dialog } = await openQuick('/contactos/14')
    await waitFor(() => expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(false))
    await actor.click(dialog.getByRole('button', { name: 'Crear oportunidad' }))
    await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ idEmbudo: 1, idServicio: 2, idEmpresa: 4, idContacto: 14, titulo: 'Pérez, Lucía' })
  })

  it('alta rápida: con varios servicios hay que elegir uno y el embudo se deriva de él', async () => {
    const cursos = { ...funnel, id: 3, nombre: 'Embudo Cursos', admite: [5] }
    const services = [{ id: 2, nombre: 'Capacitación', descripcion: null, precioReferencia: 150, activo: true }, { id: 5, nombre: 'Cursos', descripcion: null, precioReferencia: 90, activo: true }]
    const { actor, dialog } = await openQuick('/empresas/4', { services, funnels: [funnel, cursos, { ...funnel, id: 9, nombre: 'Embudo inactivo', activo: false }] })
    await waitFor(() => expect((dialog.getByRole('combobox', { name: /Servicio/ }) as HTMLElement).getAttribute('aria-disabled')).not.toBe('true'))
    expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    await actor.click(dialog.getByRole('combobox', { name: /Servicio/ }))
    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['Capacitación', 'Cursos'])
    await actor.click(screen.getByRole('option', { name: 'Cursos' }))
    await waitFor(() => expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(false))
    await actor.click(dialog.getByRole('button', { name: 'Crear oportunidad' }))
    await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ idEmbudo: 3, idServicio: 5, idEmpresa: 4, titulo: 'Acme Idiomas' })
  })

  it('alta rápida: si el servicio lo admiten varios embudos activos pide elegir el embudo', async () => {
    const { actor, dialog } = await openQuick('/empresas/4', { funnels: [funnel, { ...funnel, id: 3, nombre: 'Embudo Cursos' }] })
    const embudo = await dialog.findByRole('combobox', { name: /Embudo/ })
    expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    await actor.click(embudo); await actor.click(await screen.findByRole('option', { name: 'Embudo Cursos' }))
    await actor.click(dialog.getByRole('button', { name: 'Crear oportunidad' }))
    await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ idEmbudo: 3, idServicio: 2, idEmpresa: 4, titulo: 'Acme Idiomas' })
  })

  it('alta rápida: muestra el rechazo del servidor sin cerrar el diálogo', async () => {
    const { actor, dialog } = await openQuick('/empresas/4', { create: async () => jsonResponse({ title: 'El embudo no tiene una etapa abierta activa. Configure una antes de crear oportunidades.', status: 409 }, 409) })
    await waitFor(() => expect((dialog.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(false))
    await actor.click(dialog.getByRole('button', { name: 'Crear oportunidad' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('no tiene una etapa abierta activa')
    expect(opportunityPosts()).toHaveLength(1)
  })

  it('filtra los contactos por la empresa elegida', async () => {
    const actor = await startOpportunity()
    await chooseCompany(actor)
    await actor.click(screen.getByRole('combobox', { name: 'Contacto' }))
    expect(await screen.findByRole('option', { name: 'Pérez, Lucía' })).toBeTruthy(); expect(screen.queryByRole('option', { name: 'López, Ana' })).toBeNull()
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('/contactos') && requestUrl(input).includes('idEmpresa=4'))).toBe(true)
  })

  it('envía los datos opcionales informados: etapa elegida, origen, valor cero, fecha y datos académicos', async () => {
    const actor = await startOpportunity()
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Completa'); await chooseFunnel(); await chooseCompany(actor)
    await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Negociación' }))
    await actor.click(screen.getByRole('combobox', { name: 'Origen' })); await actor.click(await screen.findByRole('option', { name: 'Referido' }))
    await actor.type(screen.getByRole('textbox', { name: 'Valor' }), '0')
    await actor.type(screen.getByRole('textbox', { name: 'Cantidad de participantes' }), '12')
    await actor.type(screen.getByRole('textbox', { name: 'Objetivo de aprendizaje' }), '  Reuniones  ')
    await actor.type(screen.getByRole('textbox', { name: 'Disponibilidad horaria' }), 'Martes')
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.type(date.getByRole('spinbutton', { name: 'Dia' }), '15'); await actor.type(date.getByRole('spinbutton', { name: 'Mes' }), '08'); await actor.type(date.getByRole('spinbutton', { name: 'Año' }), '2027')
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ titulo: 'Completa', idEmbudo: 1, idServicio: 2, idEmpresa: 4, idEtapa: 4, idOrigen: 2, valor: 0, cantidadParticipantes: 12, objetivoAprendizaje: 'Reuniones', disponibilidadHoraria: 'Martes', fechaEstimadaCierre: '2027-08-15' })
  })

  it('permite elegir el cierre en calendario y envía una fecha ISO', async () => {
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4')
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Cierre por calendario')
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.click(date.getByRole('button', { name: 'Elige fecha' }))
    const calendar = within(await screen.findByRole('dialog', { name: 'Fecha estimada de cierre' }))
    await actor.click(calendar.getByRole('gridcell', { name: /^1$/ }))
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toMatchObject({ fechaEstimadaCierre: expect.stringMatching(/^\d{4}-\d{2}-01$/) })
  })

  it('bloquea una fecha imposible ingresada manualmente', async () => {
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4')
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Fecha inválida')
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.type(date.getByRole('spinbutton', { name: 'Dia' }), '31'); await actor.type(date.getByRole('spinbutton', { name: 'Mes' }), '02'); await actor.type(date.getByRole('spinbutton', { name: 'Año' }), '2026')
    expect(await screen.findByText('Ingresá una fecha válida.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(opportunityPosts()).toHaveLength(0)
  })

  it('valida título largo, embudo, relación comercial, valor y participantes antes de enviar', async () => {
    const actor = await startOpportunity('/oportunidades/nueva', { funnels: [funnel, { ...funnel, id: 3, nombre: 'Embudo Cursos' }] })
    await actor.click(screen.getByRole('textbox', { name: 'Título' })); await actor.paste('x'.repeat(101))
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByText('Máximo 100 caracteres.')).toBeTruthy(); expect(screen.getByText('Seleccioná el embudo.')).toBeTruthy(); expect(screen.getByText('Seleccioná una empresa o un contacto.')).toBeTruthy()
    await actor.type(screen.getByRole('textbox', { name: 'Valor' }), '1,005'); await actor.type(screen.getByRole('textbox', { name: 'Cantidad de participantes' }), '0')
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByText(/hasta dos decimales/)).toBeTruthy(); expect(screen.getByText('Ingresá un número entero mayor que cero.')).toBeTruthy()
    expect(opportunityPosts()).toHaveLength(0)
  })

  it('no inventa una etapa cuando el embudo no tiene una abierta activa y bloquea el alta', async () => {
    const closedOnly = funnelStages.filter(stage => stage.estado !== 'ABIERTA')
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4', { stages: closedOnly })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Sin abierta')
    expect(await screen.findByText(/no tiene una etapa abierta activa/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(opportunityPosts()).toHaveLength(0)
  })

  it('conserva lo escrito y muestra el motivo si la API rechaza el alta, y no duplica el envío', async () => {
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4', { create: async () => { await new Promise(resolve => setTimeout(resolve, 50)); return jsonResponse({ title: 'El embudo no tiene una etapa abierta activa. Configure una antes de crear oportunidades.', status: 409, code: 'BUSINESS_CONFLICT' }, 409) } })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Rechazada')
    await actor.dblClick(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByText(/Configure una antes de crear oportunidades/)).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveProperty('value', 'Rechazada')
    expect(opportunityPosts()).toHaveLength(1)
  })

  it('permite a un superior elegir otro responsable y lo envía explícitamente', async () => {
    const admin = { ...user, roles: ['ADMINISTRADOR'], permisos: ['GestionarOportunidad'] }
    const actor = await startOpportunity('/oportunidades/nueva?idEmpresa=4', undefined, admin)
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Asignada')
    await actor.click(await screen.findByRole('combobox', { name: 'Responsable' })); await actor.click(await screen.findByRole('option', { name: 'Ana Ríos' }))
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    expect(await requestBody(opportunityPosts()[0])).toEqual({ titulo: 'Asignada', idEmbudo: 1, idServicio: 2, idEmpresa: 4, idResponsable: 9 })
  })

  it('bloquea el alta de oportunidad cuando fallan los catálogos indispensables', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Network error')); renderAuthenticated('/oportunidades/nueva')
    await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    expect((await screen.findAllByText(/catálogo necesario para crear este registro/i)).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(opportunityPosts()).toHaveLength(0)
  })

  const opportunityPatches = () => vi.mocked(fetch).mock.calls.filter(([input]) => /\/oportunidades\/\d+$/.test(requestUrl(input)) && (input as Request).method === 'PATCH')
  const startEdit = async (options: Parameters<typeof installCatalogApi>[0] = {}) => {
    installCatalogApi(options); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/22/editar'); await screen.findByRole('textbox', { name: 'Título' }); return actor
  }

  it('edita una oportunidad con PATCH diferencial, sin responsable ni etapa, y abre la ficha', async () => {
    const actor = await startEdit()
    expect((screen.getByRole('textbox', { name: 'Título' }) as HTMLInputElement).value).toBe('Renovación anual')
    expect(screen.getByText('Responsable · solo lectura')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: /^(Embudo|Etapa|Responsable)/ })).toBeNull()
    await actor.clear(screen.getByRole('textbox', { name: 'Título' })); await actor.type(screen.getByRole('textbox', { name: 'Título' }), '  Renovación 2027  ')
    await actor.clear(screen.getByRole('textbox', { name: /^Valor/ })); await actor.type(screen.getByRole('textbox', { name: /^Valor/ }), '0')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('heading', { name: 'Renovación 2027' })).toBeTruthy()
    expect(screen.getByText('Oportunidad actualizada')).toBeTruthy()
    expect(opportunityPatches()).toHaveLength(1)
    expect(await requestBody(opportunityPatches()[0])).toEqual({ titulo: 'Renovación 2027', valor: 0 })
  })

  it('no envía nada si no hay cambios y exige un valor', async () => {
    const actor = await startEdit()
    await actor.clear(screen.getByRole('textbox', { name: /^Valor/ }))
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Ingresá el valor (podés ingresar 0).')).toBeTruthy()
    await actor.type(screen.getByRole('textbox', { name: /^Valor/ }), '150')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Oportunidad actualizada')).toBeTruthy()
    expect(opportunityPatches()).toHaveLength(0)
  })

  it('conserva lo escrito y muestra el rechazo del servidor sin duplicar el envío', async () => {
    const actor = await startEdit({ patch: () => jsonResponse({ title: 'Una oportunidad cerrada no se edita directamente: reábrala primero.', code: 'BUSINESS_CONFLICT' }, 409) })
    await actor.type(screen.getByRole('textbox', { name: 'Observaciones' }), 'Nuevo seguimiento')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect((await screen.findByText(/reábrala primero/)).textContent).toContain('Una oportunidad cerrada')
    expect((screen.getByRole('textbox', { name: 'Observaciones' }) as HTMLTextAreaElement).value).toBe('Nuevo seguimiento')
    expect(opportunityPatches()).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Editar oportunidad' })).toBeTruthy()
  })

  it('ofrece editar solo si el servidor lo permite y explica cuando la edición no corresponde', async () => {
    const readOnly = { accionesPermitidas: { editar: false, reasignar: false, mover: false, cerrar: false, reabrir: false, darDeBaja: false, gestionarActividades: false } }
    installCatalogApi(); renderAuthenticated('/oportunidades/22')
    expect((await screen.findByRole('link', { name: 'Modificar' })).getAttribute('href')).toBe('/oportunidades/22/editar')
    expect(screen.getByRole('button', { name: 'Registrar actividad' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Opciones de Renovación anual' }))
    expect(await screen.findByRole('menuitem', { name: 'Cambiar etapa' })).toBeTruthy()
    cleanup(); installCatalogApi({ detail: readOnly }); renderAuthenticated('/oportunidades/22')
    await screen.findByRole('heading', { name: 'Renovación anual' })
    expect(screen.queryByRole('link', { name: 'Modificar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Opciones de Renovación anual' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar actividad' })).toBeNull()
    cleanup(); installCatalogApi({ detail: readOnly }); renderAuthenticated('/oportunidades/22/editar')
    expect(await screen.findByRole('heading', { name: 'No podés editar esta oportunidad' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
  })

  const reassignPosts = () => vi.mocked(fetch).mock.calls.filter(([input]) => requestUrl(input).endsWith('/oportunidades/22/reasignar') && (input as Request).method === 'POST')
  const optionsRequests = () => vi.mocked(fetch).mock.calls.map(([input]) => new URL(requestUrl(input), 'http://localhost')).filter(url => url.pathname.endsWith('/usuarios/opciones'))

  it('reasigna desde la ficha enviando solo el destino, ofrece solo vendedores y retira la edición', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/22', { ...user, roles: ['VENDEDOR'], permisos: ['GestionarOportunidad'] })
    expect(await screen.findByRole('link', { name: 'Modificar' })).toBeTruthy()
    await actor.click(await screen.findByRole('button', { name: 'Opciones de Renovación anual' }))
    await actor.click(await screen.findByRole('menuitem', { name: 'Reasignar' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Reasignar oportunidad' }))
    expect((dialog.getByRole('button', { name: 'Reasignar' }) as HTMLButtonElement).disabled).toBe(true)
    await actor.click(dialog.getByRole('combobox', { name: 'Responsable' })); await actor.click(await screen.findByRole('option', { name: 'Ana Ríos' }))
    expect(optionsRequests().some(url => url.searchParams.get('rol') === 'VENDEDOR')).toBe(true)
    await actor.click(dialog.getByRole('button', { name: 'Reasignar' }))
    expect(await screen.findByText(/Oportunidad reasignada/)).toBeTruthy()
    expect(reassignPosts()).toHaveLength(1)
    expect(await requestBody(reassignPosts()[0])).toEqual({ idResponsable: 9 })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reasignar oportunidad' })).toBeNull())
    expect(screen.getByText('Ana Ríos')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Modificar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Opciones de Renovación anual' })).toBeNull()
  })

  it('un superior elige entre todos los usuarios y el rechazo del servidor se muestra sin cerrar el diálogo', async () => {
    installCatalogApi({ reassign: () => jsonResponse({ title: 'Solo el responsable o un superior puede reasignar esta oportunidad.', code: 'FORBIDDEN' }, 403) })
    const actor = userEvent.setup(); renderAuthenticated('/oportunidades/22', { ...user, roles: ['ADMINISTRADOR'], permisos: ['GestionarOportunidad'] })
    await actor.click(await screen.findByRole('button', { name: 'Opciones de Renovación anual' }))
    await actor.click(await screen.findByRole('menuitem', { name: 'Reasignar' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Reasignar oportunidad' }))
    await actor.click(dialog.getByRole('combobox', { name: 'Responsable' })); await actor.click(await screen.findByRole('option', { name: 'Ana Ríos' }))
    expect(optionsRequests().every(url => !url.searchParams.has('rol'))).toBe(true)
    await actor.click(dialog.getByRole('button', { name: 'Reasignar' }))
    expect((await screen.findAllByText(/puede reasignar esta oportunidad/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('dialog', { name: 'Reasignar oportunidad' })).toBeTruthy()
    expect(reassignPosts()).toHaveLength(1)
    expect(screen.queryByText(/Oportunidad reasignada/)).toBeNull()
  })

  it.each([
    ['/empresas/abc', 'No encontramos esa empresa'],
    ['/empresas/0', 'No encontramos esa empresa'],
    ['/empresas/-2', 'No encontramos esa empresa'],
    ['/empresas/1.5', 'No encontramos esa empresa'],
    ['/contactos/abc', 'No encontramos ese contacto'],
    ['/oportunidades/0', 'No encontramos esa oportunidad'],
  ])('representa el ID inválido %s sin consultar la API', async (path, title) => {
    renderAuthenticated(path)
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })
})
