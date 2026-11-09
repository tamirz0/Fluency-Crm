import { type ReactNode } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import App from '../../test/LegacyApp'
import { AuthProvider } from '../../test/LegacyAuthProvider'
import { SESSION_KEY } from '../../auth/session'

const dnd = vi.hoisted(() => ({ onDragEnd: null as null | ((event: unknown) => void) }))
// jsdom no calcula geometría: se captura el manejador de DndContext y se simula el «soltar» con los datos que dnd-kit entrega.
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return { ...actual, DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => { dnd.onDragEnd = props.onDragEnd as typeof dnd.onDragEnd; return <actual.DndContext {...props} /> } }
})

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
    // El servidor ordena por `orden`: las finales (1 y 2) llegan primero y la pantalla debe mostrarlas al final.
    { id: 5, nombre: 'Ganada', orden: 1, estado: 'GANADA', oportunidades: [wonCard] },
    { id: 6, nombre: 'Perdida', orden: 2, estado: 'PERDIDA', oportunidades: [] },
    { id: 3, nombre: 'Propuesta', orden: 3, estado: 'ABIERTA', oportunidades: [card] },
    { id: 4, nombre: 'Negociación', orden: 4, estado: 'ABIERTA', oportunidades: [] },
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
  it('muestra las columnas del servidor, también vacías y finales, con tarjetas resumidas', async () => {
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
    // Empresa y contacto son texto: no llevan a otro perfil por error.
    expect(screen.getByText('Acme Idiomas – Lucía Pérez', { selector: '.funnel-opportunity-client' })).toBeTruthy()
    expect(document.querySelector('a[href^="/empresas/"], a[href^="/contactos/"]')).toBeNull()

    expect(screen.queryByRole('button', { name: 'Cambiar etapa' })).toBeNull()
    const actor = userEvent.setup()
    await actor.click(screen.getByRole('button', { name: 'Contraer etapa Propuesta' }))
    expect(document.getElementById('stage-content-3')!.hasAttribute('hidden')).toBe(true)
  })

  it('un clic en cualquier parte de la tarjeta abre la ficha de la oportunidad, recordando que se vuelve al embudo', async () => {
    mockApi()
    const funnelApi = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (input, init) => new URL((input as Request).url).pathname.endsWith('/oportunidades/91') ? jsonResponse(card) : funnelApi(input, init))
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    await userEvent.setup().click(screen.getByText('Acme Idiomas – Lucía Pérez'))
    // La ficha ofrece volver al embudo (y no a la empresa), aunque la oportunidad tenga empresa.
    const back = await screen.findByRole('link', { name: 'Volver al embudo' })
    expect(window.location.pathname).toBe('/oportunidades/91')
    expect(back.getAttribute('href')).toBe('/embudo')
    expect(screen.queryByRole('link', { name: 'Volver a la empresa' })).toBeNull()
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
  const movable = { ...card, accionesPermitidas: { ...actions, mover: true } }
  const stageOf = (id: number, nombre: string, orden: number, estado: string, activo = true) => ({ id, nombre, descripcion: null, orden, idEmbudo: 1, estado, activo })
  const embudoStages = [stageOf(5, 'Ganada', 1, 'GANADA'), stageOf(6, 'Perdida', 2, 'PERDIDA'), stageOf(3, 'Propuesta', 3, 'ABIERTA'), stageOf(4, 'Negociación', 4, 'ABIERTA'), stageOf(7, 'Retirada', 5, 'ABIERTA', false)]
  function mockMove(move: () => Response) {
    const posts: Request[] = []
    let funnelReads = 0
    vi.mocked(fetch).mockImplementation(async input => {
      const request = input as Request
      const url = new URL(request.url)
      if (url.pathname.endsWith('/csrf')) return jsonResponse({ requestToken: 'csrf-test' })
      if (url.pathname.endsWith('/mover')) { posts.push(request.clone()); return move() }
      if (url.pathname.endsWith('/funnel')) { funnelReads++; return jsonResponse(funnelBody({ etapas: [{ id: 3, nombre: 'Propuesta', orden: 3, estado: 'ABIERTA', oportunidades: [movable] }, { id: 4, nombre: 'Negociación', orden: 4, estado: 'ABIERTA', oportunidades: [] }] })) }
      if (url.pathname.endsWith('/embudos/1/etapas')) return jsonResponse(embudoStages)
      if (url.pathname.endsWith('/embudos')) return jsonResponse(page([{ id: 1, nombre: 'Embudo Inglés', activo: true }]))
      return jsonResponse([])
    })
    return { posts, reads: () => funnelReads }
  }

  const dropOn = (stage: { id: number; nombre: string; estado: string }, item = movable) => act(() => { screen.getByRole('link', { name: 'Renovación anual' }).focus(); dnd.onDragEnd!({ active: { data: { current: { opportunity: item } } }, over: { data: { current: { stage } } } }) })
  const negotiation = { id: 4, nombre: 'Negociación', estado: 'ABIERTA' }

  it('soltar la tarjeta en otra etapa abierta mueve la oportunidad y recarga el funnel', async () => {
    const { posts, reads } = mockMove(() => jsonResponse({ ...movable, idEtapa: 4, etapaNombre: 'Negociación' }))
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    const before = reads()
    await dropOn(negotiation)
    expect(await screen.findByText('Etapa actualizada')).toBeTruthy()
    expect(posts).toHaveLength(1)
    expect(posts[0]!.url).toMatch(/\/oportunidades\/91\/mover$/)
    expect(await posts[0]!.json()).toEqual({ idEtapa: 4 })
    await waitFor(() => expect(reads()).toBeGreaterThan(before))
  })

  it('soltar en una etapa final no mueve: abre el formulario de cierre con el resultado elegido', async () => {
    const { posts } = mockMove(() => jsonResponse(movable))
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    await dropOn({ id: 6, nombre: 'Perdida', estado: 'PERDIDA' })
    const closing = within(await screen.findByRole('dialog', { name: 'Cerrar oportunidad' }))
    expect(closing.getByText('Perdida')).toBeTruthy()
    expect(closing.queryByRole('combobox', { name: /Resultado/ })).toBeNull()
    expect(closing.getByRole('combobox', { name: /Motivo de pérdida/ })).toBeTruthy()
    expect(posts).toHaveLength(0)
  })

  it('soltar en la misma etapa no envía nada y el rechazo del servidor se muestra sin confirmar', async () => {
    const { posts } = mockMove(() => jsonResponse({ title: 'Los datos cambiaron. Recargue e intente nuevamente.', code: 'CONCURRENT_CHANGE' }, 409))
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    await dropOn({ id: 3, nombre: 'Propuesta', estado: 'ABIERTA' })
    expect(posts).toHaveLength(0)
    await dropOn(negotiation)
    expect(await screen.findByText(/Los datos cambiaron/)).toBeTruthy()
    expect(posts).toHaveLength(1)
    expect(screen.queryByText('Etapa actualizada')).toBeNull()
  })

  it('solo son arrastrables las tarjetas abiertas que el servidor permite mover', async () => {
    mockApi()
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    expect(document.querySelector('[aria-roledescription="oportunidad arrastrable"]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cambiar etapa' })).toBeNull()
  })

  it('con permiso de mover, la tarjeta abierta es arrastrable y la de una etapa final no', async () => {
    mockMove(() => jsonResponse(movable))
    renderFunnel(seller)
    await screen.findByRole('heading', { name: 'Propuesta' })
    expect(document.querySelectorAll('[aria-roledescription="oportunidad arrastrable"]')).toHaveLength(1)
  })
})
