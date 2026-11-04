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

const sessionUser = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }

function renderAuthenticated(path: string) {
  window.history.pushState({}, '', path)
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser))
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return render(<App />, { wrapper: Wrapper })
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('búsqueda de listados', () => {
  it('busca empresas en servidor y permite limpiar los filtros', async () => {
    const companies = [{ id: 1, razonSocial: 'Acme Idiomas', industria: 'Educación', idEstado: 1, estadoDescripcion: 'Potencial' }, { id: 2, razonSocial: 'Beta Cursos', industria: 'Tecnología', idEstado: 1, estadoDescripcion: 'Cliente' }]
    vi.mocked(fetch).mockImplementation(async input => {
      const request = input as Request; const url = new URL(request.url)
      if (url.pathname.endsWith('/usuarios/opciones')) return jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0 })
      if (url.pathname.includes('/catalogos/')) return jsonResponse([])
      const items = url.searchParams.get('q') ? [companies[0]] : companies
      return jsonResponse({ items, page: 1, pageSize: 25, totalCount: items.length })
    })
    renderAuthenticated('/empresas'); const actor = userEvent.setup()
    const search = await screen.findByRole('searchbox', { name: 'Buscar empresas' })
    await actor.type(search, 'acme'); await actor.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Empresas' })).queryByText('Beta Cursos')).toBeNull())
    expect(screen.getByText('1 empresa')).toBeTruthy()
    await actor.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await within(await screen.findByRole('table', { name: 'Empresas' })).findByText('Beta Cursos')).toBeTruthy()
    expect(screen.getByText('2 empresas')).toBeTruthy()
  })

  it('busca y filtra contactos en servidor, y permite limpiar los filtros', async () => {
    const base = { documento: null, cargo: 'Analista', idEstado: 1, estadoDescripcion: 'Potencial', estadoActivo: true, origenActivo: true, idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: null }
    const contacts = [
      { ...base, id: 1, nombre: 'Lucía', apellido: 'Pérez', correo: 'lucia@example.com', telefono: null, idOrigen: 1, origenDescripcion: 'Referido', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas' },
      { ...base, id: 2, nombre: 'Tomás', apellido: 'López', correo: 'tomas@example.com', telefono: '1122334455', idOrigen: 2, origenDescripcion: 'Web', idEmpresa: null, empresaRazonSocial: null },
    ]
    const requests: URL[] = []
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL((input as Request).url)
      if (url.pathname.endsWith('/usuarios/opciones') || url.pathname.endsWith('/empresas')) return jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0 })
      if (url.pathname.includes('/catalogos/')) return jsonResponse([{ id: 1, descripcion: 'Potencial', activo: true }])
      requests.push(url)
      const items = url.searchParams.get('q') ? [contacts[0]] : contacts
      return jsonResponse({ items, page: 1, pageSize: 25, totalCount: items.length })
    })
    renderAuthenticated('/contactos'); const actor = userEvent.setup()
    const table = within(await screen.findByRole('table', { name: 'Contactos' }))
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Nombre completo', 'Estado', 'Empresa', 'Cargo', 'Correo', 'Teléfono', 'Origen', 'Responsable'])
    const cells = Array.from(table.getByRole('row', { name: /Pérez, Lucía/ }).querySelectorAll('td'))
    expect(cells[4]?.textContent).toBe('lucia@example.com'); expect(cells[5]?.textContent).toBe('-'); expect(cells[7]?.textContent).toBe('María Gómez')
    expect(screen.getByText('2 contactos')).toBeTruthy()

    await actor.type(screen.getByRole('searchbox', { name: 'Buscar contactos' }), 'acme'); await actor.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Contactos' })).queryByText('López, Tomás')).toBeNull())
    expect(requests.at(-1)?.searchParams.get('q')).toBe('acme'); expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
    expect(screen.getByText('1 contacto')).toBeTruthy()

    await actor.click(screen.getByRole('combobox', { name: 'Estado' })); await actor.click(await screen.findByRole('option', { name: 'Potencial' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('idEstado')).toBe('1'))
    await actor.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await within(await screen.findByRole('table', { name: 'Contactos' })).findByText('López, Tomás')).toBeTruthy()
    expect(requests.at(-1)?.searchParams.get('q')).toBe(''); expect(requests.at(-1)?.searchParams.has('idEstado')).toBe(false)
    expect(screen.getByText('2 contactos')).toBeTruthy()
  })

  it('pide la página siguiente de contactos al servidor', async () => {
    const requests: URL[] = []
    vi.mocked(fetch).mockImplementation(async input => {
      const url = new URL((input as Request).url)
      if (url.pathname.endsWith('/usuarios/opciones') || url.pathname.endsWith('/empresas')) return jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0 })
      if (url.pathname.includes('/catalogos/')) return jsonResponse([])
      requests.push(url)
      return jsonResponse({ items: [{ id: 1, nombre: 'Lucía', apellido: 'Pérez', correo: 'lucia@example.com', idEstado: 1, estadoDescripcion: 'Potencial', estadoActivo: true, idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true }], page: Number(url.searchParams.get('page')), pageSize: 25, totalCount: 40 })
    })
    renderAuthenticated('/contactos'); const actor = userEvent.setup()
    await screen.findByRole('table', { name: 'Contactos' })
    await actor.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('page')).toBe('2'))
    expect(requests.at(-1)?.searchParams.get('pageSize')).toBe('25')
  })

  it('busca oportunidades por título, empresa y contacto sin consultar de nuevo la API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([
      { idEtapa: 3, nombre: 'Propuesta', orden: 2, oportunidades: [
        { id: 10, titulo: 'Renovación anual', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: null, contactoNombre: null, contactoApellido: null, idUsuario: null, usuarioNombre: 'Mateo', usuarioApellido: 'Paz', fechaEstimadaCierre: '2026-10-12' },
        { id: 11, titulo: 'Curso inicial', idEmpresa: null, empresaRazonSocial: null, idContacto: 2, contactoNombre: 'Lucía', contactoApellido: 'Pérez', idUsuario: null, usuarioNombre: null, usuarioApellido: null, fechaEstimadaCierre: null },
      ] },
    ]))
    renderAuthenticated('/oportunidades')

    const search = await screen.findByRole('searchbox', { name: 'Buscar en oportunidades' })
    await userEvent.setup().type(search, 'renovacion')
    const table = within(await screen.findByRole('table', { name: 'Oportunidades' }))
    expect(table.getByText('Renovación anual')).toBeTruthy()
    expect(table.queryByText('Curso inicial')).toBeNull()
    expect(screen.getByText('1 de 2 resultados')).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Empresa' })).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Contacto' })).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Cierre estimado' })).toBeTruthy()
    expect(table.getByRole('link', { name: 'Acme Idiomas' }).getAttribute('href')).toBe('/empresas/4')

    const actor = userEvent.setup()
    await actor.clear(search)
    await actor.type(search, 'acme')
    expect(await table.findByText('Renovación anual')).toBeTruthy()
    expect(table.queryByText('Curso inicial')).toBeNull()
    await actor.clear(search)
    await actor.type(search, 'perez')
    expect(await table.findByText('Curso inicial')).toBeTruthy()
    expect(table.getByRole('link', { name: 'Pérez, Lucía' }).getAttribute('href')).toBe('/contactos/2')
    expect(table.queryByText('Renovación anual')).toBeNull()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })

  it('abre una oportunidad al clicar la celda Empresa vacía', async () => {
    const opportunity = { id: 10, titulo: 'Renovación anual', idEmpresa: null, empresaRazonSocial: null, idContacto: null, contactoNombre: null, contactoApellido: null, idUsuario: null, usuarioNombre: null, usuarioApellido: null, fechaEstimadaCierre: null }
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([{ idEtapa: 3, nombre: 'Propuesta', orden: 2, oportunidades: [opportunity] }]))
      .mockResolvedValueOnce(jsonResponse({ ...opportunity, idServicio: null, servicioNombre: null, idEtapa: 3, etapaNombre: 'Propuesta', fechaCierre: null, idOrigen: null, origenDescripcion: null, idEstado: null, estadoDescripcion: null, observaciones: null }))
    renderAuthenticated('/oportunidades')

    const table = within(await screen.findByRole('table', { name: 'Oportunidades' }))
    await userEvent.setup().click(table.getAllByText('-')[0]!)
    expect(await screen.findByRole('heading', { name: 'Renovación anual' })).toBeTruthy()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('muestra etapas y vínculos ausentes con un guion de texto normal', async () => {
    const opportunity = { id: 12, titulo: 'Seguimiento pendiente', idEmpresa: null, empresaRazonSocial: 'Nombre sin vínculo', idContacto: null, contactoNombre: null, contactoApellido: null, idUsuario: null, usuarioNombre: null, usuarioApellido: null, fechaEstimadaCierre: null }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ idEtapa: 9, nombre: ' ', orden: 1, oportunidades: [opportunity] }]))
    renderAuthenticated('/oportunidades')

    const table = within(await screen.findByRole('table', { name: 'Oportunidades' }))
    const row = table.getByRole('row', { name: /Seguimiento pendiente/ })
    expect(Array.from(row.querySelectorAll('td')).slice(2, 5).map((cell) => cell.textContent)).toEqual(['-', '-', '-'])
    expect(row.querySelector('.MuiChip-root')).toBeNull()
    expect(within(row).queryByText('Nombre sin vínculo')).toBeNull()
  })
})
