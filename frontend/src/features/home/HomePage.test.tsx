import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
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
let isAdmin = false
let requested: URL[]

beforeEach(() => {
  summaryCalls = 0
  isAdmin = false
  requested = []
  summary = () => json({ alumnos: 12, oportunidadesAbiertas: 5, cerradasEsteMes: 0 })
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname
    requested.push(url)
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/inicio/resumen')) { summaryCalls++; return summary() }
    if (path.endsWith('/embudos')) return json({ items: [{ id: 3, nombre: 'Inscripciones', activo: true }] })
    if (path.endsWith('/embudos/3/funnel')) return json({ etapas: [
      { id: 1, nombre: 'Consulta', estado: 'ABIERTA', oportunidades: [{ id: 8 }, { id: 10 }, { id: 20 }] },
      { id: 2, nombre: 'Propuesta', estado: 'ABIERTA', oportunidades: [{ id: 11 }] },
      { id: 3, nombre: 'Ganada', estado: 'GANADA', oportunidades: [{ id: 30 }] },
    ] })
    if (path.endsWith('/oportunidades')) return json({
      items: [
        { id: 8, tituloVisible: 'Inglés para equipos', contactoNombre: 'Ana Ruiz', etapaNombre: 'Consulta' },
        { id: 10, tituloVisible: 'Inglés para viajes', etapaNombre: 'Consulta' },
        { id: 11, tituloVisible: 'Curso B2', etapaNombre: 'Propuesta' },
      ],
    })
    if (path.endsWith('/clases')) return json([
      { id: 9, titulo: 'Speaking', fecha: dayjs().add(1, 'day').format('YYYY-MM-DD'), horaInicio: '09:00:00', horaFin: '10:00:00', curso: { descripcion: 'Inglés B1' }, profesor: { descripcion: 'Paula Ruiz' } },
    ])
    return json(isAdmin ? { ...session, usuario: { ...session.usuario, roles: ['ADMINISTRADOR'], permisos: ['GestionarAcademia'] } } : session)
  }))
})

function mount(client = createQueryClient()) {
  render(<AppProviders queryClient={client}><MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter></AppProviders>)
  return client
}

describe('inicio', () => {
  it('muestra los conteos y permite retomar las oportunidades abiertas más recientes', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(await screen.findByLabelText('Alumnos activos: 12')).toBeTruthy()
    expect(screen.getByLabelText('Oportunidades abiertas: 5')).toBeTruthy()
    expect(screen.getByLabelText(/^Cierres de .+: 0$/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ir al embudo/ }).getAttribute('href')).toBe('/embudo')
    expect((await screen.findByRole('link', { name: /Inglés para equipos Ana Ruiz · Consulta/ })).getAttribute('href')).toBe('/oportunidades/8')
    const chart = (await screen.findByText('4 oportunidades abiertas en este embudo')).closest('figure')
    expect(Array.from(chart?.querySelectorAll('li') ?? [], row => row.textContent)).toEqual(['Consulta3', 'Propuesta1'])
    expect(screen.getByRole('link', { name: 'Ver embudo completo' }).getAttribute('href')).toBe('/embudo?idEmbudo=3')
    const query = requested.find(url => url.pathname.endsWith('/oportunidades'))?.searchParams
    expect(query?.get('estado')).toBe('ABIERTA')
    expect(query?.get('pageSize')).toBe('3')
    expect(requested.some(url => url.pathname.endsWith('/clases'))).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Próximas clases' })).toBeNull()
  })

  it('muestra clases próximas y el acceso a Alumnos para Administrador', async () => {
    isAdmin = true
    mount()
    expect((await screen.findByRole('link', { name: /Speaking.*09:00.*Inglés B1/ })).getAttribute('href')).toBe('/clases/9')
    expect(screen.getByRole('link', { name: 'Alumnos activos' }).getAttribute('href')).toBe('/alumnos')
    expect(screen.getByRole('link', { name: 'Ver calendario' }).getAttribute('href')).toBe('/clases')
  })

  it('ante un error no muestra ceros: avisa, deja las cifras no disponibles y permite reintentar', async () => {
    summary = () => json({ detail: 'Servicio no disponible' }, 500)
    mount()
    expect(await screen.findByText(/No pudimos cargar las cifras del inicio/)).toBeTruthy()
    expect(screen.getByLabelText('Alumnos activos: no disponible')).toBeTruthy()
    expect(screen.queryByLabelText(/Alumnos activos: \d/)).toBeNull()
    summary = () => json({ alumnos: 3, oportunidadesAbiertas: 1, cerradasEsteMes: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Alumnos activos: 3')).toBeTruthy()
    expect(screen.queryByText(/No pudimos cargar las cifras del inicio/)).toBeNull()
  })

  it('vuelve a consultar al regresar a la pantalla aunque el dato esté en caché', async () => {
    const client = mount()
    await screen.findByLabelText('Alumnos activos: 12')
    expect(summaryCalls).toBe(1)
    summary = () => json({ alumnos: 13, oportunidadesAbiertas: 4, cerradasEsteMes: 1 })
    render(<AppProviders queryClient={client}><MemoryRouter><AuthProvider><HomePage /></AuthProvider></MemoryRouter></AppProviders>)
    await waitFor(() => expect(summaryCalls).toBe(2))
  })
})
