import { type ReactNode } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createQueryClient } from '../app/queryClient'
import App from '../App'
import { AuthProvider } from '../auth/AuthContext'
import { SESSION_KEY } from '../auth/session'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
const company = { id: 4, razonSocial: 'Acme Idiomas', cuit: '30-123', industria: 'Educación', correo: 'acme@example.com', telefono: '1144', direccion: 'Calle 1', idEstado: 1, estadoDescripcion: 'Cliente', idOrigen: 2, origenDescripcion: 'Referido', observaciones: 'Nota' }
const contact = { id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: '30123456', cargo: 'Directora', correo: 'lucia@example.com', telefono: '1144', idEstado: 1, estadoDescripcion: 'Cliente', idOrigen: 2, origenDescripcion: 'Referido', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', observaciones: null }
const secondContact = { ...contact, id: 15, nombre: 'Ana', apellido: 'López', idEmpresa: 8, empresaRazonSocial: 'Otra empresa' }
const opportunity = { id: 91, titulo: 'Renovación anual', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: 14, contactoNombre: 'Lucía', contactoApellido: 'Pérez', idUsuario: 7, usuarioNombre: 'María', usuarioApellido: 'Gómez', idServicio: 2, servicioNombre: 'Capacitación', idEtapa: 3, etapaNombre: 'Propuesta', fechaEstimadaCierre: '2026-12-31', fechaCierre: null, idOrigen: 2, origenDescripcion: 'Referido', idEstado: 1, estadoDescripcion: 'Activa', observaciones: 'Nota' }
const stages = [{ id: 3, nombre: 'Propuesta', descripcion: null, orden: 3 }]

function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function renderAuthenticated(path: string) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); window.history.pushState({}, '', path); const queryClient = createQueryClient(); const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>; return render(<App />, { wrapper: Wrapper }) }
function catalogResponse(url: string, services = [{ id: 2, nombre: 'Capacitación', descripcion: null, precioReferencia: 10 }]): Response | undefined {
  if (url.includes('ListadoEstadosCliente')) return jsonResponse([{ id: 1, descripcion: 'Cliente' }])
  if (url.includes('ListadoOrigenesComerciales')) return jsonResponse([{ id: 2, descripcion: 'Referido' }])
  if (url.includes('ListadoEtapasComerciales')) return jsonResponse(stages)
  if (url.includes('ListadoServicios')) return jsonResponse(services)
  return undefined
}
function requestUrl(input: RequestInfo | URL) { if (typeof input === 'object' && input !== null && 'input' in input) return String(input.input); if (typeof input === 'object' && input !== null && 'url' in input) return String(input.url); return String(input) }
function installCatalogApi(options: { services?: { id: number; nombre: string; descripcion: string | null; precioReferencia: number }[] } = {}) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = requestUrl(input)
    const catalog = catalogResponse(url, options.services)
    if (catalog) return catalog
    if (url.includes('ListadoEmpresas')) return jsonResponse([company, { ...company, id: 8, razonSocial: 'Otra empresa' }])
    if (url.includes('ListadoContactos')) return jsonResponse([contact, secondContact])
    if (url.includes('OportunidadesPorEtapa')) return jsonResponse([{ idEtapa: 3, nombre: 'Propuesta', orden: 3, oportunidades: [] }])
    if (url.includes('DatosEmpresa')) return jsonResponse(company)
    if (url.includes('DatosContacto')) return jsonResponse(contact)
    if (url.includes('DatosOportunidad')) return jsonResponse(opportunity)
    if (url.includes('AltaEmpresa')) return jsonResponse({ ...company, id: 22, razonSocial: 'Nueva empresa' }, 201)
    if (url.includes('AltaContacto')) return jsonResponse({ ...contact, id: 22, nombre: 'Nuevo' }, 201)
    if (url.includes('AltaOportunidad')) return jsonResponse({ ...opportunity, id: 22, titulo: 'Nueva oportunidad' }, 201)
    if (url.includes('ModificarEmpresa')) return jsonResponse(company)
    if (url.includes('ModificarContacto')) return jsonResponse(contact)
    if (url.includes('ModificarOportunidad')) return jsonResponse(opportunity)
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
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaEmpresa'))
    expect(call).toBeTruthy(); expect(await requestBody(call!)).toEqual({ razonSocial: 'Nueva empresa' })
  })

  it('usa PATCH diferencial al editar empresa y conserva el formulario si la API rechaza', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/4/editar')
    await screen.findByRole('heading', { name: 'Editar empresa' })
    await actor.clear(screen.getByRole('textbox', { name: 'Industria' })); await actor.type(screen.getByRole('textbox', { name: 'Industria' }), 'Servicios')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Empresa actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarEmpresa'))
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
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('ModificarEmpresa'))).toBe(false)
  })

  it('envía null al limpiar un opcional de empresa', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/empresas/4/editar')
    await screen.findByRole('heading', { name: 'Editar empresa' })
    await actor.clear(screen.getByRole('textbox', { name: 'CUIT' })); await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Empresa actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarEmpresa'))
    expect(await requestBody(call!)).toEqual({ cuit: null })
  })

  it('conserva los valores al recibir un error de API', async () => {
    installCatalogApi(); vi.mocked(fetch).mockImplementation(async (input) => requestUrl(input).includes('AltaEmpresa') ? jsonResponse({ detail: 'La empresa ya existe.' }, 400) : catalogResponse(requestUrl(input)) ?? jsonResponse([]))
    const actor = userEvent.setup(); renderAuthenticated('/empresas/nueva'); await screen.findByRole('heading', { name: 'Nueva empresa' })
    const field = screen.getByRole('textbox', { name: 'Razón social' }); await actor.type(field, 'Empresa repetida'); await actor.click(screen.getByRole('button', { name: 'Crear empresa' }))
    expect(await screen.findByText('La empresa ya existe.')).toBeTruthy(); expect((field as HTMLInputElement).value).toBe('Empresa repetida')
  })

  it('crea un contacto sin empresa y omite la asociación', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/nuevo'); await screen.findByRole('heading', { name: 'Nuevo contacto' })
    await actor.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Ana'); await actor.type(screen.getByRole('textbox', { name: 'Apellido' }), 'García'); await actor.type(screen.getByRole('textbox', { name: 'Correo' }), 'ana@example.com'); await actor.click(screen.getByRole('button', { name: 'Crear contacto' }))
    await screen.findByText('Contacto creado'); const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaContacto'))
    expect(call).toBeTruthy(); expect(await requestBody(call!)).toEqual({ nombre: 'Ana', apellido: 'García', correo: 'ana@example.com' })
  })

  it('deshabilita una edición de contacto limpia y envía null al limpiar un opcional', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/contactos/14/editar')
    await screen.findByRole('heading', { name: 'Editar contacto' })
    const save = screen.getByRole('button', { name: 'Guardar cambios' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    await actor.clear(screen.getByRole('textbox', { name: 'Documento' })); expect((save as HTMLButtonElement).disabled).toBe(false)
    await actor.click(save); await screen.findByText('Contacto actualizado')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarContacto'))
    expect(await requestBody(call!)).toEqual({ documento: null })
  })

  it('bloquea el selector de empresa del contacto cuando tiene oportunidades', async () => {
    installCatalogApi(); vi.mocked(fetch).mockImplementation(async (input) => requestUrl(input).includes('OportunidadesPorEtapa') ? jsonResponse([{ idEtapa: 3, nombre: 'Propuesta', orden: 3, oportunidades: [{ id: 91, titulo: 'Oportunidad', idEmpresa: 4, empresaRazonSocial: 'Acme', idContacto: 14, contactoNombre: 'Lucía', contactoApellido: 'Pérez', idUsuario: 7, usuarioNombre: 'María', usuarioApellido: 'Gómez', fechaEstimadaCierre: null }] }]) : catalogResponse(requestUrl(input)) ?? jsonResponse(requestUrl(input).includes('DatosContacto') ? contact : []))
    renderAuthenticated('/contactos/14/editar'); await screen.findByRole('heading', { name: 'Editar contacto' }); const select = await screen.findByRole('combobox', { name: 'Empresa' })
    await waitFor(() => expect(select.getAttribute('aria-disabled')).toBe('true')); expect(screen.getByText('La empresa no puede cambiarse porque el contacto tiene oportunidades asociadas.')).toBeTruthy()
  })

  it('filtra contactos por empresa y crea una oportunidad con responsable y etapa', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), '  Nueva venta  ')
    await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' }))
    await actor.click(screen.getByRole('combobox', { name: 'Contacto' })); expect(screen.getByRole('option', { name: 'Pérez, Lucía' })).toBeTruthy(); expect(screen.queryByRole('option', { name: 'López, Ana' })).toBeNull(); await actor.click(screen.getByRole('option', { name: 'Pérez, Lucía' }))
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaOportunidad')); expect(call).toBeTruthy(); expect(await requestBody(call!)).toMatchObject({ titulo: 'Nueva venta', idUsuario: 7, idEtapa: 3, idEmpresa: 4, idContacto: 14 })
  })

  it('acepta el cierre escrito DD/MM/AAAA y envía una fecha ISO', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Cierre escrito')
    await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' }))
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.type(date.getByRole('spinbutton', { name: 'Dia' }), '15')
    await actor.type(date.getByRole('spinbutton', { name: 'Mes' }), '08')
    await actor.type(date.getByRole('spinbutton', { name: 'Año' }), '2027')
    expect(date.getByRole('spinbutton', { name: 'Dia' }).getAttribute('aria-valuenow')).toBe('15')
    expect(date.getByRole('spinbutton', { name: 'Mes' }).getAttribute('aria-valuenow')).toBe('8')
    expect(date.getByRole('spinbutton', { name: 'Año' }).getAttribute('aria-valuenow')).toBe('2027')
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaOportunidad'))
    expect(await requestBody(call!)).toMatchObject({ fechaEstimadaCierre: '2027-08-15' })
  })

  it('permite elegir el cierre en calendario y envía una fecha ISO', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Cierre por calendario')
    await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' }))
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.click(date.getByRole('button', { name: 'Elige fecha' }))
    const calendar = within(await screen.findByRole('dialog', { name: 'Fecha estimada de cierre' }))
    await actor.click(calendar.getByRole('gridcell', { name: /^1$/ }))
    expect(date.getByRole('spinbutton', { name: 'Dia' }).getAttribute('aria-valuenow')).toBe('1')
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaOportunidad'))
    expect(await requestBody(call!)).toMatchObject({ fechaEstimadaCierre: /^\d{4}-\d{2}-01$/ })
  })

  it('bloquea una fecha imposible ingresada manualmente', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Fecha inválida')
    await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' }))
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.type(date.getByRole('spinbutton', { name: 'Dia' }), '31')
    await actor.type(date.getByRole('spinbutton', { name: 'Mes' }), '02')
    await actor.type(date.getByRole('spinbutton', { name: 'Año' }), '2026')
    expect(await screen.findByText('Ingresá una fecha válida.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('AltaOportunidad'))).toBe(false)
  })

  it('no permite crear una oportunidad sin empresa ni contacto', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' }); await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Sin relación'); await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); expect(await screen.findByText('Seleccioná una empresa o un contacto.')).toBeTruthy(); expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('AltaOportunidad'))).toBe(false)
  })

  it('exige la etapa inicial antes de crear una oportunidad', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Sin etapa')
    await actor.click(screen.getByRole('combobox', { name: 'Empresa' })); await actor.click(await screen.findByRole('option', { name: 'Acme Idiomas' }))
    await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' }))
    expect(await screen.findByText('Seleccioná la etapa inicial.')).toBeTruthy()
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('AltaOportunidad'))).toBe(false)
  })

  it('crea una oportunidad con solo empresa o solo contacto', async () => {
    for (const relation of ['Empresa', 'Contacto'] as const) {
      cleanup(); vi.mocked(fetch).mockClear(); installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' })
      await actor.type(screen.getByRole('textbox', { name: 'Título' }), `Solo ${relation}`)
      await actor.click(screen.getByRole('combobox', { name: 'Etapa inicial' })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
      await actor.click(screen.getByRole('combobox', { name: relation })); await actor.click(await screen.findByRole('option', { name: relation === 'Empresa' ? 'Acme Idiomas' : 'Pérez, Lucía' }))
      await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); await screen.findByText('Oportunidad creada')
      const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('AltaOportunidad')); expect(call).toBeTruthy()
      const body = await requestBody(call!); expect(body.idEmpresa).toBe(relation === 'Empresa' ? 4 : undefined); expect(body.idContacto).toBe(relation === 'Contacto' ? 14 : undefined)
    }
  })

  it('envía un PATCH exacto de oportunidad sin responsable ni etapa y no envía el servicio sin cambios', async () => {
    installCatalogApi({ services: [{ id: 3, nombre: 'Consultoría', descripcion: null, precioReferencia: 10 }] }); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/91/editar')
    await screen.findByRole('heading', { name: 'Editar oportunidad' })
    expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(true)
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    expect(date.getByRole('spinbutton', { name: 'Dia' }).getAttribute('aria-valuenow')).toBe('31')
    expect(date.getByRole('spinbutton', { name: 'Mes' }).getAttribute('aria-valuenow')).toBe('12')
    expect(date.getByRole('spinbutton', { name: 'Año' }).getAttribute('aria-valuenow')).toBe('2026')
    await actor.clear(screen.getByRole('textbox', { name: 'Título' })); await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Renovación extendida'); await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Oportunidad actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarOportunidad'))
    expect(await requestBody(call!)).toEqual({ titulo: 'Renovación extendida' })
  })

  it('envía en ISO una fecha de cierre modificada en una oportunidad existente', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/91/editar')
    await screen.findByRole('heading', { name: 'Editar oportunidad' })
    const date = within(screen.getByRole('group', { name: 'Fecha estimada de cierre' }))
    await actor.click(date.getByRole('button', { name: /Elige fecha/ }))
    const calendar = within(await screen.findByRole('dialog', { name: 'Fecha estimada de cierre' }))
    await actor.click(calendar.getByRole('gridcell', { name: /^30$/ }))
    expect(date.getByRole('spinbutton', { name: 'Dia' }).getAttribute('aria-valuenow')).toBe('30')
    await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Oportunidad actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarOportunidad'))
    expect(await requestBody(call!)).toEqual({ fechaEstimadaCierre: '2026-12-30' })
  })

  it('permite quitar un servicio inactivo de una oportunidad enviando null', async () => {
    installCatalogApi({ services: [{ id: 3, nombre: 'Consultoría', descripcion: null, precioReferencia: 10 }] }); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/91/editar')
    await screen.findByRole('heading', { name: 'Editar oportunidad' })
    const service = screen.getByRole('combobox', { name: 'Servicio' })
    expect(within(service).getByText(/Capacitación \(No disponible\)/)).toBeTruthy()
    await actor.click(service); await actor.click(screen.getByRole('option', { name: '-' })); await actor.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Oportunidad actualizada')
    const call = vi.mocked(fetch).mock.calls.find(([input]) => requestUrl(input).includes('ModificarOportunidad'))
    expect(await requestBody(call!)).toEqual({ idServicio: null })
  })

  it('bloquea el alta de oportunidad cuando fallan los catálogos indispensables', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Network error')); renderAuthenticated('/oportunidades/nueva')
    await screen.findByRole('heading', { name: 'Nueva oportunidad' })
    expect((await screen.findAllByText(/catálogo necesario para crear este registro/i)).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: 'Crear oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('AltaOportunidad'))).toBe(false)
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
