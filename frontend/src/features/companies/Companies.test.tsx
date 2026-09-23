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

const savedUser = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
const firstCompany = {
  id: 4,
  razonSocial: 'Acme Idiomas',
  cuit: '30-12345678-9',
  industria: 'Educación',
  correo: 'contacto@acme.com',
  telefono: '1144445555',
  direccion: 'Av. Siempre Viva 123',
  idEstado: 1,
  estadoDescripcion: 'Potencial',
  idOrigen: 2,
  origenDescripcion: 'Referido',
  observaciones: 'Primera línea\nSegunda línea',
}
const secondCompany = {
  id: 2,
  razonSocial: 'Beta Cursos',
  cuit: null,
  industria: null,
  correo: null,
  telefono: null,
  direccion: null,
  idEstado: null,
  estadoDescripcion: null,
  idOrigen: null,
  origenDescripcion: null,
  observaciones: null,
}

function renderApp(path = '/empresas') {
  window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return { queryClient, ...render(<App />, { wrapper: Wrapper }) }
}

function renderAuthenticated(path = '/empresas') {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(savedUser))
  return renderApp(path)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function requestUrl(call: unknown[]) {
  const request = call[0]
  const input = request && typeof request === 'object' && 'input' in request ? request.input : request
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  if (input && typeof input === 'object' && 'url' in input) return String(input.url)
  return ''
}

async function loadedCompanyTable() {
  return within(await screen.findByRole('table', { name: 'Empresas' }))
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('consulta de empresas', () => {
  it('muestra esqueletos mientras carga el listado', async () => {
    let resolveRequest: (response: Response) => void = () => undefined
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRequest = resolve }))
    renderAuthenticated()

    expect(screen.getByRole('status', { name: 'Cargando empresas' })).toBeTruthy()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    resolveRequest(jsonResponse([firstCompany]))
    expect(await (await loadedCompanyTable()).findByText('Acme Idiomas')).toBeTruthy()
  })

  it('permite al usuario autenticado abrir Empresas y consume el listado de la API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([firstCompany, secondCompany]))
    renderAuthenticated()

    expect(await screen.findByRole('heading', { name: 'Empresas' })).toBeTruthy()
    const table = await loadedCompanyTable()
    expect(await table.findByText('Acme Idiomas')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBe('page')
    expect(requestUrl(vi.mocked(fetch).mock.calls[0] ?? [])).toContain('/api/Empresa/ListadoEmpresas')
  })

  it('ubica Estado en la segunda columna, ordena por estado y deja los vacíos al final', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([secondCompany, firstCompany]))
    renderAuthenticated()

    const table = await loadedCompanyTable()
    const first = await table.findByText('Acme Idiomas')
    const second = table.getByText('Beta Cursos')
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(table.getByText('Potencial')).toBeTruthy()
    expect(table.getByText('Educación')).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Correo' })).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Teléfono' })).toBeTruthy()
    expect(table.getByRole('link', { name: 'contacto@acme.com' }).getAttribute('href')).toBe('mailto:contacto@acme.com')
    expect(table.getByRole('link', { name: '1144445555' }).getAttribute('href')).toBe('tel:1144445555')
    const companyRow = table.getByRole('row', { name: /Acme Idiomas/ })
    const companyCells = Array.from(companyRow.querySelectorAll('td'))
    expect(companyCells[1]?.textContent).toContain('Potencial')
    expect(companyCells[3]?.textContent).toBe('contacto@acme.com')
    expect(companyCells[4]?.textContent).toBe('1144445555')
    expect(Array.from(table.getAllByRole('row')).slice(1).map((row) => row.textContent?.includes('Beta Cursos'))).toEqual([false, true])
    expect(table.getByText('Referido')).toBeTruthy()
    expect(table.getByRole('link', { name: 'Abrir ficha de Acme Idiomas' })).toBeTruthy()
    expect(table.queryByRole('columnheader', { name: 'Acción' })).toBeNull()
  })

  it('representa los valores nulos con guiones', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([secondCompany]))
    renderAuthenticated()

    const table = await loadedCompanyTable()
    await table.findByText('Beta Cursos')
    expect(table.getAllByText('-').length).toBeGreaterThanOrEqual(4)
  })

  it('explica el estado vacío sin ofrecer un alta todavía', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    renderAuthenticated()

    expect(await screen.findByRole('heading', { name: 'Todavía no hay empresas' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /nueva|crear|alta/i })).toBeNull()
  })

  it('permite reintentar el listado después de un error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ title: 'Error' }, 500))
      .mockResolvedValueOnce(jsonResponse([firstCompany]))
    renderAuthenticated()

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar las empresas' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await (await loadedCompanyTable()).findByText('Acme Idiomas')).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('abre la ficha al seleccionar una celda de la fila y consulta el id solicitado', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([firstCompany]))
      .mockResolvedValueOnce(jsonResponse(firstCompany))
    renderAuthenticated()

    const table = await loadedCompanyTable()
    await userEvent.setup().click(await table.findByText('Potencial'))
    expect(await screen.findByRole('heading', { name: 'Acme Idiomas' })).toBeTruthy()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(requestUrl(vi.mocked(fetch).mock.calls[1] ?? [])).toContain('/api/Empresa/DatosEmpresa/4')
    expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Volver a empresas' })).toBeTruthy()
  })

  it('muestra los grupos del detalle y preserva los saltos de línea de observaciones', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(firstCompany))
    renderAuthenticated('/empresas/4')

    expect(await screen.findByRole('heading', { name: 'Información comercial' })).toBeTruthy()
    expect(screen.getByText('30-12345678-9')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Contacto' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'contacto@acme.com' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1144445555' })).toBeTruthy()
    expect(screen.getByText('Av. Siempre Viva 123')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Observaciones' })).toBeTruthy()
    expect(screen.getByText(/Primera línea\s+Segunda línea/)).toBeTruthy()
  })

  it('muestra el esqueleto mientras carga el detalle', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(() => undefined))
    renderAuthenticated('/empresas/4')

    expect(screen.getByRole('status', { name: 'Cargando detalle de la empresa' })).toBeTruthy()
  })

  it('vuelve al listado desde la ficha', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(firstCompany))
      .mockResolvedValueOnce(jsonResponse([firstCompany]))
    renderAuthenticated('/empresas/4')

    await screen.findByRole('heading', { name: 'Acme Idiomas' })
    await userEvent.setup().click(screen.getByRole('link', { name: 'Volver a empresas' }))
    expect(await (await loadedCompanyTable()).findByRole('link', { name: 'Abrir ficha de Acme Idiomas' })).toBeTruthy()
    expect(requestUrl(vi.mocked(fetch).mock.calls[1] ?? [])).toContain('/api/Empresa/ListadoEmpresas')
  })

  it('no consulta ids inválidos y los representa como empresa inexistente', async () => {
    renderAuthenticated('/empresas/0')

    expect(await screen.findByRole('heading', { name: 'No encontramos esa empresa' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('representa un 404 como empresa inexistente', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('No existe la empresa.', { status: 404, headers: { 'Content-Type': 'text/plain' } }))
    renderAuthenticated('/empresas/99')

    expect(await screen.findByRole('heading', { name: 'No encontramos esa empresa' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a empresas' })).toBeTruthy()
  })

  it('permite reintentar un error general del detalle', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ title: 'Error' }, 500))
      .mockResolvedValueOnce(jsonResponse(firstCompany))
    renderAuthenticated('/empresas/4')

    expect(await screen.findByRole('heading', { name: 'No pudimos cargar los datos de la empresa' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Acme Idiomas' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('mantiene protegidas las rutas nuevas y refleja Empresas como sección activa', async () => {
    renderApp('/empresas')
    expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([firstCompany]))
    renderAuthenticated('/empresas')
    await (await loadedCompanyTable()).findByText('Acme Idiomas')
    expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBe('page')
  })

  it('protege también el acceso directo a una ficha', async () => {
    renderApp('/empresas/4')

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu espacio comercial' })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('marca Inicio como sección activa en su ruta', async () => {
    renderAuthenticated('/inicio')
    expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Empresas' }).getAttribute('aria-current')).toBeNull()
  })

  it('permite llegar con Tab al nombre enlazado de la empresa', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([firstCompany]))
    renderAuthenticated()
    const detailLink = await (await loadedCompanyTable()).findByRole('link', { name: 'Abrir ficha de Acme Idiomas' })
    const actor = userEvent.setup()
    for (let index = 0; index < 16 && document.activeElement !== detailLink; index += 1) await actor.tab()
    await waitFor(() => expect(document.activeElement).toBe(detailLink))
  })
})
