import { type ReactNode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createQueryClient } from '../app/queryClient'
import App from '../test/LegacyApp'
import { AuthProvider } from '../test/LegacyAuthProvider'
import { SESSION_KEY } from '../auth/session'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }
const common = { estadoDescripcion: 'Cliente', estadoActivo: true, idEstado: 1, origenActivo: true, idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: null }
const company = { ...common, id: 4, razonSocial: 'Acme Idiomas', cuit: null, industria: null, correo: null, telefono: null, direccion: null, idOrigen: null }
const contact = { ...common, id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: null, cargo: null, correo: 'lucia@example.com', telefono: null, idOrigen: null, idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas' }
const emptyPage = { items: [], page: 1, pageSize: 25, totalCount: 0 }

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }

/** Responde la ficha y, por la ruta de baja, 204 o el conflicto indicado; todo lo demás queda vacío. */
function mockApi(resource: 'empresas' | 'contactos', record: unknown, removal: () => Response) {
  vi.mocked(fetch).mockImplementation(async input => {
    const request = input as Request; const { pathname } = new URL(request.url)
    if (pathname === '/api/auth/csrf') return json({ requestToken: 'fixture-csrf' })
    if (pathname === `/api/${resource}/${(record as { id: number }).id}`) return request.method === 'DELETE' ? removal() : json(record)
    if (pathname.startsWith('/api/catalogos/')) return json([])
    return json(emptyPage)
  })
}

function renderAuthenticated(path: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return render(<App />, { wrapper: Wrapper })
}

beforeEach(() => { sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn()) })

describe.each([
  { resource: 'empresas' as const, record: company, path: '/empresas/4', ficha: 'Acme Idiomas', list: 'Empresas', done: 'Empresa dada de baja', blocked: 'No se puede dar de baja la empresa porque tiene 1 contacto activo y 1 oportunidad activa.' },
  { resource: 'contactos' as const, record: contact, path: '/contactos/14', ficha: 'Pérez, Lucía', list: 'Contactos', done: 'Contacto dado de baja', blocked: 'No se puede dar de baja el contacto porque tiene 2 oportunidades activas.' },
])('baja definitiva de $resource', ({ resource, record, path, ficha, list, done, blocked }) => {
  it('pide confirmación, da de baja y vuelve al listado con el aviso', async () => {
    mockApi(resource, record, () => new Response(null, { status: 204 }))
    const actor = userEvent.setup(); renderAuthenticated(path)
    await screen.findByRole('heading', { name: ficha })
    await actor.click(screen.getByRole('button', { name: 'Dar de baja' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText(/La baja es definitiva y no se puede restaurar/)).toBeTruthy()
    expect(vi.mocked(fetch).mock.calls.some(([input]) => (input as Request).method === 'DELETE')).toBe(false)
    await actor.click(dialog.getByRole('button', { name: 'Dar de baja definitivamente' }))
    await screen.findByRole('heading', { name: list })
    expect(screen.getByText(done)).toBeTruthy()
    const call = vi.mocked(fetch).mock.calls.find(([input]) => (input as Request).method === 'DELETE')
    expect(new URL((call![0] as Request).url).pathname).toBe(`/api/${resource}/${(record as { id: number }).id}`)
  })

  it('muestra las causas del bloqueo 409, conserva la ficha y permite cancelar', async () => {
    mockApi(resource, record, () => json({ title: blocked, status: 409, code: 'BUSINESS_CONFLICT' }, 409))
    const actor = userEvent.setup(); renderAuthenticated(path)
    await screen.findByRole('heading', { name: ficha })
    await actor.click(screen.getByRole('button', { name: 'Dar de baja' }))
    await actor.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja definitivamente' }))
    expect((await screen.findByRole('alert')).textContent).toBe(blocked)
    await actor.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: ficha })).toBeTruthy()
    expect(screen.queryByText(done)).toBeNull()
  })
})
