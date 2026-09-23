import { type ReactNode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import App from '../../App'
import { AuthProvider } from '../../auth/AuthContext'
import { SESSION_KEY } from '../../auth/session'
import { flattenOpportunitiesByStage, orderStagesByPosition } from '../opportunities/opportunityData'
import { formatCommercialDate } from '../shared/display'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
const contact = {
  id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: '30123456', cargo: 'Directora', correo: 'lucia@example.com', telefono: '1144556677',
  idEstado: 1, estadoDescripcion: 'Cliente', idOrigen: 2, origenDescripcion: 'Referido', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', observaciones: 'Primera línea\nSegunda línea',
}
const blankContact = { ...contact, id: 15, nombre: 'Ana', apellido: 'Álvarez', documento: null, cargo: null, correo: '', telefono: null, idEstado: null, estadoDescripcion: null, idOrigen: null, origenDescripcion: null, idEmpresa: null, empresaRazonSocial: null, observaciones: null }
const opportunity = {
  id: 91, titulo: 'Renovación anual', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: 14, contactoNombre: 'Lucía', contactoApellido: 'Pérez',
  idUsuario: 7, usuarioNombre: 'María', usuarioApellido: 'Gómez', idServicio: 2, servicioNombre: 'Capacitación', idEtapa: 3, etapaNombre: 'Propuesta',
  fechaEstimadaCierre: '2026-12-31', fechaCierre: null, idOrigen: 2, origenDescripcion: 'Referido', idEstado: 1, estadoDescripcion: 'Activa', observaciones: 'Seguimiento pendiente',
}
const summary = {
  id: 91, titulo: 'Renovación anual', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: 14, contactoNombre: 'Lucía', contactoApellido: 'Pérez',
  idUsuario: 7, usuarioNombre: 'María', usuarioApellido: 'Gómez', fechaEstimadaCierre: '2026-12-31',
}
const stages = [
  { idEtapa: 3, nombre: 'Propuesta', orden: 3, oportunidades: [summary] },
  { idEtapa: 1, nombre: 'Consulta recibida', orden: 1, oportunidades: [] },
  { idEtapa: 2, nombre: 'Nivelación', orden: 2, oportunidades: [] },
]

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

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('consultas comerciales', () => {
  it('lista contactos en el orden recibido, con valores opcionales y navegación activa', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([contact, blankContact]))
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
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ title: 'Error' }, 503)).mockResolvedValueOnce(jsonResponse([]))
    renderAuthenticated()
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar los contactos' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay contactos' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('muestra el detalle del contacto, sus observaciones y el enlace correcto a empresa', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(contact))
    renderAuthenticated('/contactos/14')
    expect(await screen.findByRole('heading', { name: 'Pérez, Lucía' })).toBeTruthy()
    expect(screen.getByText('30123456')).toBeTruthy()
    expect(screen.getByText('Directora')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(screen.getByText(/Primera línea\s+Segunda línea/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a contactos' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('no consulta un id inválido y representa el 404 como contacto inexistente', async () => {
    renderAuthenticated('/contactos/0')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    vi.mocked(fetch).mockResolvedValueOnce(new Response('No existe el contacto', { status: 404, headers: { 'Content-Type': 'text/plain' } }))
    renderAuthenticated('/contactos/999')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
  })

  it('aplana oportunidades conservando el orden, las etapas y el orden interno', () => {
    const flat = flattenOpportunitiesByStage([
      { ...stages[0], oportunidades: [summary, { ...summary, id: 92, titulo: 'Segunda' }] },
      { ...stages[1], oportunidades: [{ ...summary, id: 93, titulo: 'Tercera' }] },
    ])
    expect(flat.map((item) => `${item.id}:${item.etapaNombre}`)).toEqual(['91:Propuesta', '92:Propuesta', '93:Consulta recibida'])
    expect(orderStagesByPosition(stages).map((stage) => stage.nombre)).toEqual(['Consulta recibida', 'Nivelación', 'Propuesta'])
  })

  it('lista oportunidades usando empresa primero, contacto alternativo y fechas es-AR sin mover el día', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(stages))
    renderAuthenticated('/oportunidades')
    const table = within(await screen.findByRole('table', { name: 'Oportunidades' }))
    expect(await table.findByText('Renovación anual')).toBeTruthy()
    expect(table.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(table.getByText('Propuesta')).toBeTruthy()
    expect(table.getByText('María Gómez')).toBeTruthy()
    expect(table.getByText('31/12/2026')).toBeTruthy()
    expect(formatCommercialDate('2026-01-01')).toBe('01/01/2026')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('muestra el listado de oportunidades vacío cuando todas las etapas están vacías', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(stages.map((stage) => ({ ...stage, oportunidades: [] }))))
    renderAuthenticated('/oportunidades')
    expect(await screen.findByRole('heading', { name: 'Todavía no hay oportunidades' })).toBeTruthy()
  })

  it('muestra detalle y enlaces de empresa y contacto; un 404 representa oportunidad inexistente', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(opportunity))
    renderAuthenticated('/oportunidades/91')
    expect(await screen.findByRole('heading', { name: 'Renovación anual' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(screen.getByRole('link', { name: 'Pérez, Lucía' }).getAttribute('href')).toBe('/contactos/14')
    expect(screen.getByText('Capacitación')).toBeTruthy()
    expect(screen.getByText('31/12/2026')).toBeTruthy()

    vi.mocked(fetch).mockResolvedValueOnce(new Response('No existe', { status: 404, headers: { 'Content-Type': 'text/plain' } }))
    renderAuthenticated('/oportunidades/92')
    expect(await screen.findByRole('heading', { name: 'No encontramos esa oportunidad' })).toBeTruthy()
  })

  it('mantiene visibles las columnas vacías, ordenadas por catálogo y permite cambiar etapa persistente', async () => {
    const stagePayload = stages.map((stage) => ({ ...stage, id: stage.idEtapa, descripcion: null }))
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(stagePayload))
      .mockResolvedValueOnce(jsonResponse(stagePayload))
      .mockResolvedValueOnce(jsonResponse({ ...opportunity, idEtapa: 2, etapaNombre: 'Nivelación' }))
      .mockResolvedValueOnce(jsonResponse([{ ...stages[0], oportunidades: [] }, { ...stages[1], oportunidades: [{ ...summary, id: 91 }] }, { ...stages[2], oportunidades: [] }]))
    renderAuthenticated('/embudo')
    const cardTitle = await screen.findByRole('link', { name: 'Renovación anual' })
    expect(cardTitle.getAttribute('href')).toBe('/oportunidades/91')
    expect(screen.getByText('Empresa', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')
    expect(screen.getByText('Contacto', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Pérez, Lucía' }).getAttribute('href')).toBe('/contactos/14')
    const cardDetails = cardTitle.closest('article')?.querySelector('.funnel-opportunity-details')
    expect(cardDetails?.hasAttribute('hidden')).toBe(true)
    expect(within(cardTitle.closest('article') as HTMLElement).getByText('Cierre estimado', { selector: 'dt' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cambiar etapa' })).toBeNull()
    const columnHeadings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(columnHeadings).toEqual(['Consulta recibida', 'Nivelación', 'Propuesta'])
    expect(screen.getAllByText('Sin oportunidades')).toHaveLength(4)

    const user = userEvent.setup()
    const stageToggle = screen.getByRole('button', { name: 'Contraer etapa Propuesta' })
    stageToggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Expandir etapa Propuesta' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('1 oportunidad')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Propuesta' })).toBeTruthy()
    expect(document.querySelector('.funnel-board')?.getAttribute('style')).toContain('minmax(160px, .58fr)')
    expect(screen.queryByRole('link', { name: 'Renovación anual' })).toBeNull()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Contraer etapa Propuesta' }).getAttribute('aria-expanded')).toBe('true')

    const cardToggle = screen.getByRole('button', { name: 'Expandir oportunidad Renovación anual' })
    cardToggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Contacto', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByText('Pérez, Lucía')).toBeTruthy()
    expect(screen.getByText('Cierre estimado', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByText('31/12/2026')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cambiar etapa' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Cambiar etapa' }))
    expect(await screen.findByRole('dialog', { name: 'Cambiar etapa' })).toBeTruthy()
    const selector = screen.getByRole('combobox', { name: 'Nueva etapa' })
    expect(within(selector).queryByText('Propuesta')).toBeNull()
    await user.click(selector)
    await user.click(await screen.findByRole('option', { name: 'Nivelación' }))
    await user.type(screen.getByRole('textbox', { name: 'Observación' }), '  Reunión realizada  ')
    await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    expect(await screen.findByText('Etapa actualizada')).toBeTruthy()
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Consulta recibida', 'Nivelación', 'Propuesta']))
    expect(screen.getAllByRole('link', { name: 'Renovación anual' })).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('muestra un guion para el contacto vacío en la tarjeta compacta', async () => {
    const stagePayload = stages.map((stage) => ({ ...stage, id: stage.idEtapa, descripcion: null }))
    const withoutContact = { ...summary, idContacto: null, contactoNombre: null, contactoApellido: null }
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([{ ...stages[0], oportunidades: [withoutContact] }, ...stages.slice(1)]))
      .mockResolvedValueOnce(jsonResponse(stagePayload))
    renderAuthenticated('/embudo')

    await screen.findByRole('link', { name: 'Renovación anual' })
    const user = userEvent.setup()
    expect(screen.queryByRole('button', { name: 'Cambiar etapa' })).toBeNull()
    expect(screen.getByText('Contacto', { selector: 'dt' })).toBeTruthy()
    expect(screen.getByText('-', { selector: 'dd' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '-' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Expandir oportunidad Renovación anual' }))
    expect(screen.getByRole('button', { name: 'Cambiar etapa' })).toBeTruthy()
  })

  it('conserva el diálogo y la etapa original si el cambio falla; el catálogo permite reintentar', async () => {
    const stagePayload = stages.map((stage) => ({ ...stage, id: stage.idEtapa, descripcion: null }))
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(stagePayload))
      .mockResolvedValueOnce(jsonResponse(stagePayload))
      .mockResolvedValueOnce(jsonResponse({ detail: 'No se puede cambiar esta oportunidad.' }, 400))
    renderAuthenticated('/embudo')
    const user = userEvent.setup()
    await screen.findByRole('button', { name: 'Expandir oportunidad Renovación anual' })
    await user.click(screen.getByRole('button', { name: 'Expandir oportunidad Renovación anual' }))
    await user.click(screen.getByRole('button', { name: 'Cambiar etapa' }))
    const selector = screen.getByRole('combobox', { name: 'Nueva etapa' })
    await userEvent.setup().click(selector)
    await userEvent.setup().click(await screen.findByRole('option', { name: 'Nivelación' }))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar cambio' }))
    expect((await screen.findByRole('alert')).textContent).toContain('No se puede cambiar esta oportunidad.')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText('Renovación anual')).toHaveLength(2)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('protege las nuevas rutas y no consulta contactos con un id inválido', async () => {
    renderApp('/oportunidades')
    expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    renderAuthenticated('/contactos/no-es-id')
    expect(await screen.findByRole('heading', { name: 'No encontramos ese contacto' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })
})
