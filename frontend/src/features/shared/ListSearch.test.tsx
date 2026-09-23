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
  it('filtra empresas por industria ignorando acentos, cuenta resultados y permite limpiar', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([
      { id: 1, razonSocial: 'Acme Idiomas', cuit: null, industria: 'Educación', correo: 'hola@acme.com', telefono: null, direccion: null, idEstado: 1, estadoDescripcion: 'Potencial', idOrigen: 1, origenDescripcion: 'Referido', observaciones: null },
      { id: 2, razonSocial: 'Beta Cursos', cuit: null, industria: 'Tecnología', correo: 'beta@cursos.com', telefono: null, direccion: null, idEstado: 1, estadoDescripcion: 'Activa', idOrigen: 2, origenDescripcion: 'Web', observaciones: null },
    ]))
    renderAuthenticated('/empresas')

    const search = await screen.findByRole('searchbox', { name: 'Buscar en empresas' })
    await userEvent.setup().type(search, 'educacion')
    const table = within(await screen.findByRole('table', { name: 'Empresas' }))
    expect(table.getByText('Acme Idiomas')).toBeTruthy()
    expect(table.queryByText('Beta Cursos')).toBeNull()
    expect(screen.getByText('1 de 2 resultados')).toBeTruthy()

    await userEvent.setup().clear(search)
    expect(await table.findByText('Beta Cursos')).toBeTruthy()
    expect(screen.getByText('2 de 2 resultados')).toBeTruthy()
  })

  it('filtra contactos por campos visibles y ofrece limpiar cuando no hay coincidencias', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([
      { id: 1, nombre: 'Lucía', apellido: 'Pérez', documento: null, cargo: 'Directora', correo: 'lucia@example.com', telefono: null, idEstado: 1, estadoDescripcion: 'Inactivo', idOrigen: 1, origenDescripcion: 'Referido', idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', observaciones: null },
      { id: 2, nombre: 'Tomás', apellido: 'López', documento: null, cargo: 'Analista', correo: 'tomas@example.com', telefono: '1122334455', idEstado: 1, estadoDescripcion: 'Activo', idOrigen: 2, origenDescripcion: 'Web', idEmpresa: null, empresaRazonSocial: null, observaciones: null },
    ]))
    renderAuthenticated('/contactos')

    const search = await screen.findByRole('searchbox', { name: 'Buscar en contactos' })
    const table = within(await screen.findByRole('table', { name: 'Contactos' }))
    expect(table.getByRole('columnheader', { name: 'Correo' })).toBeTruthy()
    expect(table.getByRole('columnheader', { name: 'Teléfono' })).toBeTruthy()
    expect(table.getAllByRole('columnheader')[1]?.textContent).toBe('Estado')
    expect(Array.from(table.getAllByRole('row')).slice(1).map((row) => row.textContent?.includes('Tomás'))).toEqual([true, false])
    const contactRow = table.getByRole('row', { name: /Pérez, Lucía/ })
    const contactCells = Array.from(contactRow.querySelectorAll('td'))
    expect(contactCells[4]?.textContent).toBe('lucia@example.com')
    expect(contactCells[5]?.textContent).toBe('-')
    const actor = userEvent.setup()
    await actor.type(search, 'perez')
    expect(await screen.findByText('Pérez, Lucía')).toBeTruthy()
    expect(screen.queryByText('López, Tomás')).toBeNull()
    expect(screen.getByText('1 de 2 resultados')).toBeTruthy()

    await actor.clear(search)
    await actor.type(search, 'no-existe')
    expect((await screen.findByRole('status')).textContent).toContain('No hay resultados para “no-existe”.')
    await actor.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(await screen.findByText('López, Tomás')).toBeTruthy()
    await actor.clear(search)
    await actor.type(search, '1122334455')
    expect(await screen.findByText('López, Tomás')).toBeTruthy()
    expect(screen.queryByText('Pérez, Lucía')).toBeNull()
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
