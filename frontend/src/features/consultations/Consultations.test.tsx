import { type ReactNode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import App from '../../test/LegacyApp'
import { AuthProvider } from '../../test/LegacyAuthProvider'
import { SESSION_KEY } from '../../auth/session'
import { formatCommercialDate } from '../shared/display'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
const contact = {
  id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: '30123456', cargo: 'Directora', correo: 'lucia@example.com', telefono: '1144556677',
  idEstado: 1, estadoDescripcion: 'Cliente', estadoActivo: true, idOrigen: 2, origenDescripcion: 'Referido', origenActivo: true, idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', observaciones: 'Primera línea\nSegunda línea',
  idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: false, fechaCreacion: '2026-10-31T12:00:00Z', activo: true,
}
const blankContact = { ...contact, id: 15, nombre: 'Ana', apellido: 'Álvarez', documento: null, cargo: null, correo: 'ana@example.com', telefono: null, estadoDescripcion: 'Inactivo', idOrigen: null, origenDescripcion: null, origenActivo: null, idEmpresa: null, empresaRazonSocial: null, observaciones: null }
function renderApp(path = '/contactos') {
  window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return { queryClient, ...render(<App />, { wrapper: Wrapper }) }
}

function renderAuthenticated(path = '/contactos') {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  return renderApp(path)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// El listado de contactos también consulta catálogos, empresas y responsables para sus filtros.
function mockContactsApi(list: () => Response) {
  vi.mocked(fetch).mockImplementation(async input => {
    const { pathname } = new URL((input as Request).url)
    if (pathname.endsWith('/contactos')) return list()
    if (pathname.endsWith('/empresas') || pathname.endsWith('/usuarios/opciones')) return jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0 })
    return jsonResponse([])
  })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('consultas comerciales', () => {
  it('lista contactos en el orden recibido, con valores opcionales y navegación activa', async () => {
    mockContactsApi(() => jsonResponse({ items: [contact, blankContact], page: 1, pageSize: 25, totalCount: 2 }))
    renderAuthenticated()
    const table = within(await screen.findByRole('table', { name: 'Contactos' }))
    const first = await table.findByText('Pérez, Lucía')
    const second = table.getByText('Álvarez, Ana')
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(table.getByText('Acme Idiomas')).toBeTruthy()
    expect(table.getByText('Directora')).toBeTruthy()
    expect(table.getByText('Cliente')).toBeTruthy()
    expect(table.getByRole('link', { name: 'lucia@example.com' }).getAttribute('href')).toBe('mailto:lucia@example.com')
    expect(table.getByRole('link', { name: '1144556677' }).getAttribute('href')).toBe('tel:1144556677')
    expect(table.getByRole('link', { name: 'Abrir ficha de Pérez, Lucía' })).toBeTruthy()
    expect(table.getAllByText('-').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole('link', { name: 'Contactos' }).getAttribute('aria-current')).toBe('page')
  })

  it('muestra vacío y permite reintentar un listado de contactos', async () => {
    let attempts = 0
    mockContactsApi(() => ++attempts === 1 ? jsonResponse({ title: 'Error' }, 503) : jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0 }))
    renderAuthenticated()
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar los contactos' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay contactos' })).toBeTruthy()
    expect(attempts).toBe(2)
  })

  it('muestra el detalle del contacto, sus observaciones y el enlace correcto a empresa', async () => {
    vi.mocked(fetch).mockImplementation(async input => new URL((input as Request).url).pathname.endsWith('/historial-comercial') ? jsonResponse(page([])) : jsonResponse(contact))
    renderAuthenticated('/contactos/14')
    expect(await screen.findByRole('heading', { name: 'Pérez, Lucía' })).toBeTruthy()
    expect(await screen.findByText('Todavía no hay actividades ni cambios de etapa.')).toBeTruthy()
    expect(screen.getByText('30123456')).toBeTruthy()
    expect(screen.getByText('Directora')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(screen.getByText('María Gómez (inactivo)')).toBeTruthy()
    expect(screen.getByText('Fecha de creación', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByText(/Primera línea\s+Segunda línea/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a contactos' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('no consulta un id inválido y representa el 404 como contacto inexistente', async () => {
    renderAuthenticated('/contactos/0')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    vi.mocked(fetch).mockResolvedValueOnce(new Response('No existe el contacto', { status: 404, headers: { 'Content-Type': 'text/plain' } }))
    renderAuthenticated('/contactos/999')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
  })

  const actions = { editar: false, reasignar: false, mover: false, cerrar: false, reabrir: false, darDeBaja: false, gestionarActividades: false }
  const listed = {
    id: 91, titulo: 'Renovación anual', tituloVisible: 'Renovación anual', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: false,
    idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: null, contactoNombre: null, idEtapa: 3, etapaNombre: 'Propuesta', etapaActiva: true, estado: 'ABIERTA',
    idEmbudo: 1, embudoNombre: 'Embudo Inglés', embudoActivo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: true, valor: 150,
    fechaCreacion: '2026-11-05T12:00:00Z', fechaEstimadaCierre: '2026-12-31', activo: true, accionesPermitidas: actions,
  }
  const closedListed = {
    ...listed, id: 92, titulo: null, tituloVisible: 'Lucía Pérez', idEmpresa: null, empresaRazonSocial: null, idContacto: 14, contactoNombre: 'Lucía Pérez',
    responsableActivo: true, estado: 'GANADA', etapaNombre: 'Ganada', embudoActivo: false, fechaEstimadaCierre: null,
  }
  const page = <T,>(items: T[], totalCount = items.length) => ({ items, page: 1, pageSize: 25, totalCount })

  // El listado también consulta embudos, orígenes y responsables para sus filtros.
  function mockOpportunitiesApi(list: (url: URL) => Response) {
    const requests: URL[] = []
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL((input as Request).url)
      if (url.pathname.endsWith('/oportunidades')) { requests.push(url); return list(url) }
      if (url.pathname.endsWith('/embudos')) return jsonResponse(page([{ id: 1, nombre: 'Embudo Inglés', activo: true }]))
      if (url.pathname.endsWith('/usuarios/opciones')) return jsonResponse(page([]))
      return jsonResponse([])
    })
    return requests
  }

  it('lista todas las oportunidades vigentes con el contrato nuevo, referencias inactivas y fechas es-AR', async () => {
    const requests = mockOpportunitiesApi(() => jsonResponse(page([listed, closedListed])))
    renderAuthenticated('/oportunidades')
    const table = within(await screen.findByRole('table', { name: 'Oportunidades' }))
    expect(table.getByRole('link', { name: 'Abrir ficha de Renovación anual' }).getAttribute('href')).toBe('/oportunidades/91')
    expect(table.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(table.getByRole('link', { name: 'Lucía Pérez' }).getAttribute('href')).toBe('/contactos/14')
    expect(table.getByRole('link', { name: 'Abrir ficha de Lucía Pérez' }).getAttribute('href')).toBe('/oportunidades/92')
    expect(table.getByText('María Gómez (inactivo)')).toBeTruthy()
    expect(table.getByText('Embudo Inglés (inactivo)')).toBeTruthy()
    expect(table.getByText('Propuesta · Abierta')).toBeTruthy()
    expect(table.getByText('Ganada · Ganada')).toBeTruthy()
    expect(table.getByText('31/12/2026')).toBeTruthy()
    expect(screen.getByText('2 oportunidades')).toBeTruthy()
    expect(requests).toHaveLength(1)
    expect(requests[0]!.searchParams.get('page')).toBe('1')
    expect(requests[0]!.searchParams.get('pageSize')).toBe('25')
    expect(requests[0]!.searchParams.has('q')).toBe(false)
    expect(formatCommercialDate('2026-01-01')).toBe('01/01/2026')
  })

  it('envía búsqueda, filtros y página al servidor sin filtrar en el cliente, y permite limpiarlos', async () => {
    const requests = mockOpportunitiesApi(() => jsonResponse(page([listed], 60)))
    renderAuthenticated('/oportunidades')
    await screen.findByRole('table', { name: 'Oportunidades' })
    const actor = userEvent.setup()

    await actor.type(screen.getByRole('searchbox', { name: 'Buscar oportunidades' }), 'renov')
    await actor.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('q')).toBe('renov'))

    await actor.click(screen.getByRole('combobox', { name: 'Estado' }))
    await actor.click(await screen.findByRole('option', { name: 'Ganada' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('estado')).toBe('GANADA'))
    expect(requests.at(-1)?.searchParams.get('q')).toBe('renov')
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1')

    await actor.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('page')).toBe('2'))
    expect(requests.at(-1)?.searchParams.get('estado')).toBe('GANADA')

    await actor.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.has('estado')).toBe(false))
    expect(requests.at(-1)?.searchParams.has('q')).toBe(false)
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
  })

  it('muestra vacío y permite reintentar un listado de oportunidades', async () => {
    let attempts = 0
    mockOpportunitiesApi(() => ++attempts === 1 ? jsonResponse({ title: 'Error' }, 503) : jsonResponse(page([])))
    renderAuthenticated('/oportunidades')
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar las oportunidades' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay oportunidades' })).toBeTruthy()
    expect(attempts).toBe(2)
  })

  it('muestra detalle, enlaces e historial de etapas de solo lectura; un 404 representa oportunidad inexistente', async () => {
    const detail = { ...listed, responsableActivo: true, idContacto: 14, contactoNombre: 'Lucía Pérez' }
    const history = page([
      { tipo: 'TRANSICION', idOrigen: 2, fechaHora: '2026-11-06T12:00:00Z', idUsuario: 7, usuarioNombre: 'María Gómez', idOportunidad: 91, etapaAnterior: 'Consulta', etapaNueva: 'Propuesta', observacion: 'Envió presupuesto' },
      { tipo: 'ACTIVIDAD', idOrigen: 5, fechaHora: '2026-11-05T15:00:00Z', fechaRegistro: '2026-11-06T09:00:00Z', idUsuario: 8, usuarioNombre: 'Ana Ventas', idOportunidad: 91, tipoActividad: 'Llamada', descripcion: 'Llamó para pedir presupuesto', resultado: 'Enviar propuesta', accionesPermitidas: { editar: false, darDeBaja: false } },
      { tipo: 'TRANSICION', idOrigen: 1, fechaHora: '2026-11-05T12:00:00Z', idUsuario: 8, usuarioNombre: 'Ana Ventas', idOportunidad: 91, etapaAnterior: null, etapaNueva: 'Consulta' },
    ])
    const requests: URL[] = []
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL((input as Request).url)
      requests.push(url)
      if (url.pathname.endsWith('/oportunidades/92')) return new Response('No existe', { status: 404, headers: { 'Content-Type': 'text/plain' } })
      if (url.pathname.endsWith('/oportunidades/91/historial-comercial')) return jsonResponse(history)
      if (url.pathname.endsWith('/oportunidades/91')) return jsonResponse(detail)
      return jsonResponse([])
    })
    renderAuthenticated('/oportunidades/91')
    expect(await screen.findByRole('heading', { name: 'Renovación anual' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(screen.getByRole('link', { name: 'Lucía Pérez' }).getAttribute('href')).toBe('/contactos/14')
    expect(screen.getByText('Capacitación')).toBeTruthy()
    expect(screen.getByText('31/12/2026')).toBeTruthy()
    const timeline = within(await screen.findByRole('list', { name: 'Historial comercial' }))
    expect(timeline.getByText('Cambio de etapa: Alta de la oportunidad → Consulta')).toBeTruthy()
    expect(timeline.getByText('Cambio de etapa: Consulta → Propuesta')).toBeTruthy()
    expect(timeline.getByText('Envió presupuesto')).toBeTruthy()
    expect(timeline.getByText('Llamó para pedir presupuesto')).toBeTruthy()
    expect(timeline.getByText(/registrada por Ana Ventas el/)).toBeTruthy()
    // Una actividad de oportunidad ajena se lee sin acciones.
    expect(timeline.queryByRole('button', { name: /Editar actividad/ })).toBeNull()
    expect(timeline.queryByRole('button', { name: 'Dar de baja' })).toBeNull()
    // Solo lectura: ninguna acción de edición aunque la oportunidad sea consultable.
    expect(screen.queryByRole('button', { name: /^(editar|mover|reasignar|cerrar oportunidad|reabrir|eliminar)/i })).toBeNull()
    expect(requests.every((url) => !url.pathname.includes('/historial-comercial') || url.searchParams.get('page') === '1')).toBe(true)

    renderAuthenticated('/oportunidades/92')
    expect(await screen.findByRole('heading', { name: 'No encontramos esa oportunidad' })).toBeTruthy()
  })

  it('protege las nuevas rutas y no consulta contactos con un id inválido', async () => {
    renderApp('/oportunidades')
    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    renderAuthenticated('/contactos/no-es-id')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })
})
