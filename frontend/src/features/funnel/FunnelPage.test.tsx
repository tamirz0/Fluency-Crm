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

const seller = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: ['GestionarOportunidad'] }
const manager = { ...seller, id: 8, nombre: 'Rocío', roles: ['RESPONSABLE_COMERCIAL'] }

const actions = { editar: false, reasignar: false, mover: false, cerrar: false, reabrir: false, darDeBaja: false, gestionarActividades: false }
const card = {
  id: 91, titulo: 'Renovación anual', tituloVisible: 'Renovación anual', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true,
  idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: 14, contactoNombre: 'Lucía Pérez', idEtapa: 3, etapaNombre: 'Propuesta', etapaActiva: true, estado: 'ABIERTA',
  idEmbudo: 1, embudoNombre: 'Embudo Inglés', embudoActivo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: true, valor: 150,
  fechaCreacion: '2026-11-05T12:00:00Z', fechaEstimadaCierre: '2026-12-31', activo: true, accionesPermitidas: actions,
}
const wonCard = { ...card, id: 92, titulo: null, tituloVisible: 'Acme Idiomas', idContacto: null, contactoNombre: null, idEtapa: 5, etapaNombre: 'Ganada', estado: 'GANADA' }
const funnelBody = (overrides: Record<string, unknown> = {}) => ({
  idEmbudo: 1, nombre: 'Embudo Inglés', activo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: true,
  etapas: [
    { id: 3, nombre: 'Propuesta', orden: 3, estado: 'ABIERTA', oportunidades: [card] },
    { id: 4, nombre: 'Negociación', orden: 4, estado: 'ABIERTA', oportunidades: [] },
    { id: 5, nombre: 'Ganada', orden: 1, estado: 'GANADA', oportunidades: [wonCard] },
    { id: 6, nombre: 'Perdida', orden: 2, estado: 'PERDIDA', oportunidades: [] },
  ],
  ...overrides,
})
const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderFunnel(sessionUser: typeof seller) {
  window.history.pushState({}, '', '/embudo')
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser))
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return render(<App />, { wrapper: Wrapper })
}

// Embudos disponibles y respuesta del funnel por embudo; devuelve las consultas de funnel recibidas.
function mockApi(funnels = [{ id: 1, nombre: 'Embudo Inglés', activo: true }, { id: 2, nombre: 'Embudo Viejo', activo: false }], funnel: (url: URL) => Response = () => jsonResponse(funnelBody())) {
  const requests: URL[] = []
  vi.mocked(fetch).mockImplementation(async input => {
    const url = new URL((input as Request).url)
    if (url.pathname.endsWith('/funnel')) { requests.push(url); return funnel(url) }
    if (url.pathname.endsWith('/embudos')) return jsonResponse(page(funnels))
    if (url.pathname.endsWith('/usuarios/opciones')) return jsonResponse(page([]))
    return jsonResponse([])
  })
  return requests
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('funnel por rol', () => {
  it('muestra las columnas del servidor, también vacías y finales, con tarjetas resumidas que se expanden', async () => {
    const requests = mockApi()
    renderFunnel(seller)
    expect(await screen.findByRole('heading', { name: 'Propuesta' })).toBeTruthy()
    expect(requests[0]!.pathname).toMatch(/\/embudos\/1\/funnel$/)
    // Sin selector de responsable para un vendedor: no puede sustituir su cartera.
    expect(screen.queryByRole('combobox', { name: 'Responsable' })).toBeNull()
    expect(requests[0]!.searchParams.has('idResponsable')).toBe(false)

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Propuesta', 'Negociación', 'Ganada', 'Perdida'])
    expect(screen.getAllByText('Sin oportunidades').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('1 oportunidad · Ganada')).toBeTruthy()
    expect(screen.getByText('Sin oportunidades · Perdida')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Renovación anual' }).getAttribute('href')).toBe('/oportunidades/91')
    expect(screen.getByRole('link', { name: 'Lucía Pérez' }).getAttribute('href')).toBe('/contactos/14')

    const actor = userEvent.setup()
    const details = document.getElementById('opportunity-details-91')!
    expect(details.hasAttribute('hidden')).toBe(true)
    await actor.click(screen.getByRole('button', { name: 'Expandir oportunidad Renovación anual' }))
    expect(details.hasAttribute('hidden')).toBe(false)
    expect(within(details).getByText('31/12/2026')).toBeTruthy()
    expect(within(details).getByText('María Gómez')).toBeTruthy()
    await actor.click(screen.getByRole('button', { name: 'Contraer etapa Propuesta' }))
    expect(document.getElementById('stage-content-3')!.hasAttribute('hidden')).toBe(true)
  })

  it('un superior filtra por responsable y el selector de embudo separa los procesos', async () => {
    const requests: URL[] = []
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL((input as Request).url)
      if (url.pathname.endsWith('/funnel')) { requests.push(url); return url.pathname.includes('/embudos/2/') ? jsonResponse(funnelBody({ idEmbudo: 2, nombre: 'Embudo Viejo', activo: false, etapas: [] })) : jsonResponse(funnelBody()) }
      if (url.pathname.endsWith('/embudos')) return jsonResponse(page([{ id: 1, nombre: 'Embudo Inglés', activo: true }, { id: 2, nombre: 'Embudo Viejo', activo: false }]))
      if (url.pathname.endsWith('/usuarios/opciones')) return jsonResponse(page([{ id: 7, nombre: 'María', apellido: 'Gómez' }]))
      return jsonResponse([])
    })
    renderFunnel(manager)
    expect(await screen.findByRole('heading', { name: 'Propuesta' })).toBeTruthy()
    const actor = userEvent.setup()

    await actor.click(screen.getByRole('combobox', { name: 'Responsable' }))
    await actor.click(await screen.findByRole('option', { name: 'María Gómez' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('idResponsable')).toBe('7'))

    await actor.click(screen.getByRole('combobox', { name: 'Embudo' }))
    await actor.click(await screen.findByRole('option', { name: 'Embudo Viejo (inactivo)' }))
    expect(await screen.findByText(/Este embudo está inactivo/)).toBeTruthy()
    expect(requests.at(-1)?.pathname).toMatch(/\/embudos\/2\/funnel$/)
    expect(screen.getByText('No hay etapas para mostrar')).toBeTruthy()
  })

  it('muestra error con reintento y el estado sin embudos', async () => {
    let attempts = 0
    mockApi(undefined, () => ++attempts === 1 ? jsonResponse({ title: 'Error' }, 503) : jsonResponse(funnelBody()))
    renderFunnel(seller)
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar el embudo' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Propuesta' })).toBeTruthy()
    expect(attempts).toBe(2)

    mockApi([])
    renderFunnel(seller)
    expect(await screen.findByRole('heading', { name: 'No hay embudos configurados' })).toBeTruthy()
  })
})
