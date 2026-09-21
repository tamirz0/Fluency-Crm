import { type ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
function catalogResponse(url: string): Response | undefined {
  if (url.includes('ListadoEstadosCliente')) return jsonResponse([{ id: 1, descripcion: 'Cliente' }])
  if (url.includes('ListadoOrigenesComerciales')) return jsonResponse([{ id: 2, descripcion: 'Referido' }])
  if (url.includes('ListadoEtapasComerciales')) return jsonResponse(stages)
  if (url.includes('ListadoServicios')) return jsonResponse([{ id: 2, nombre: 'Capacitación', descripcion: null, precioReferencia: 10 }])
  return undefined
}
function requestUrl(input: RequestInfo | URL) { if (typeof input === 'object' && input !== null && 'input' in input) return String(input.input); if (typeof input === 'object' && input !== null && 'url' in input) return String(input.url); return String(input) }
function installCatalogApi() {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = requestUrl(input)
    const catalog = catalogResponse(url)
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

  it('no permite crear una oportunidad sin empresa ni contacto', async () => {
    installCatalogApi(); const actor = userEvent.setup(); renderAuthenticated('/oportunidades/nueva'); await screen.findByRole('heading', { name: 'Nueva oportunidad' }); await actor.type(screen.getByRole('textbox', { name: 'Título' }), 'Sin relación'); await actor.click(screen.getByRole('button', { name: 'Crear oportunidad' })); expect(await screen.findByText('Seleccioná una empresa o un contacto.')).toBeTruthy(); expect(vi.mocked(fetch).mock.calls.some(([input]) => requestUrl(input).includes('AltaOportunidad'))).toBe(false)
  })
})
