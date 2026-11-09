import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { HomePage } from './HomePage'

const session = { usuario: { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: [] }, expiresAt: '2026-10-22T07:00:00Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let summary: () => Response
let summaryCalls = 0

beforeEach(() => {
  summaryCalls = 0
  summary = () => json({ alumnos: 12, oportunidadesAbiertas: 5, cerradasEsteMes: 0 })
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/inicio/resumen')) { summaryCalls++; return summary() }
    return json(session)
  }))
})

function mount(client = createQueryClient()) {
  render(<AppProviders queryClient={client}><MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter></AppProviders>)
  return client
}

describe('inicio', () => {
  it('muestra las tres cifras del servidor, el cero como valor válido y enlaces generales', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy()
    expect(await screen.findByLabelText('Alumnos: 12')).toBeTruthy()
    expect(screen.getByLabelText('Oportunidades abiertas: 5')).toBeTruthy()
    expect(screen.getByLabelText('Cerradas este mes: 0')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver contactos' }).getAttribute('href')).toBe('/contactos')
    expect(screen.getAllByRole('link', { name: 'Ver oportunidades' }).map(link => link.getAttribute('href'))).toEqual(['/oportunidades', '/oportunidades'])
  })

  it('ante un error no muestra ceros: avisa, deja las cifras no disponibles y permite reintentar', async () => {
    summary = () => json({ detail: 'Servicio no disponible' }, 500)
    mount()
    expect(await screen.findByText(/No pudimos cargar las cifras del inicio/)).toBeTruthy()
    expect(screen.getByLabelText('Alumnos: no disponible')).toBeTruthy()
    expect(screen.queryByLabelText(/Alumnos: \d/)).toBeNull()
    summary = () => json({ alumnos: 3, oportunidadesAbiertas: 1, cerradasEsteMes: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Alumnos: 3')).toBeTruthy()
    expect(screen.queryByText(/No pudimos cargar las cifras del inicio/)).toBeNull()
  })

  it('vuelve a consultar al regresar a la pantalla aunque el dato esté en caché', async () => {
    const client = mount()
    await screen.findByLabelText('Alumnos: 12')
    expect(summaryCalls).toBe(1)
    summary = () => json({ alumnos: 13, oportunidadesAbiertas: 4, cerradasEsteMes: 1 })
    render(<AppProviders queryClient={client}><MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter></AppProviders>)
    await waitFor(() => expect(summaryCalls).toBe(2))
  })
})
