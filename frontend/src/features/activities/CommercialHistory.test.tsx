import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import type { CommercialHistoryKind } from '../../api/client'
import { CommercialHistory } from './CommercialHistory'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const pageOf = (items: unknown[], totalCount = items.length) => ({ items, page: 1, pageSize: 10, totalCount })

const transition = { tipo: 'TRANSICION', idOrigen: 9, fechaHora: '2026-11-06T12:00:00Z', idUsuario: 7, usuarioNombre: 'María Gómez', idOportunidad: 22, oportunidadTitulo: 'Renovación anual', etapaAnterior: 'Consulta', etapaNueva: 'Propuesta', observacion: 'Envió presupuesto' }
const allowed = { tipo: 'ACTIVIDAD', idOrigen: 31, fechaHora: '2026-11-04T15:30:00Z', fechaRegistro: '2026-11-06T09:00:00Z', idUsuario: 7, usuarioNombre: 'María Gómez', idOportunidad: 22, oportunidadTitulo: 'Renovación anual', idEmpresa: 4, idContacto: 14, tipoActividad: 'Llamada', descripcion: 'Llamada inicial', resultado: 'Pidió propuesta', accionesPermitidas: { editar: true, darDeBaja: true } }
const foreign = { ...allowed, idOrigen: 32, idOportunidad: 23, oportunidadTitulo: 'De otro vendedor', tipoActividad: 'Reunión', descripcion: 'Reunión ajena', resultado: null, accionesPermitidas: { editar: false, darDeBaja: false } }
const creation = { tipo: 'TRANSICION', idOrigen: 1, fechaHora: '2026-11-01T12:00:00Z', idUsuario: 8, usuarioNombre: 'Ana Ventas', idOportunidad: 22, oportunidadTitulo: 'Renovación anual', etapaAnterior: null, etapaNueva: 'Consulta' }
const fullActivity = { ...allowed, id: 31, idTipo: 3, tipoNombre: 'Llamada', tipoActivo: true, empresaRazonSocial: 'Acme', contactoNombre: 'Lucía Pérez', activo: true }

let requests: { method: string; url: URL; body?: unknown }[] = []
let history: () => Response = () => json(pageOf([transition, allowed, foreign, creation]))

beforeEach(() => {
  requests = []; history = () => json(pageOf([transition, allowed, foreign, creation]))
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    const body = input.method === 'PATCH' ? await input.clone().json() : undefined
    requests.push({ method: input.method, url, body })
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/historial-comercial')) return history()
    if (url.pathname.endsWith('/catalogos/tipos-actividad/opciones')) return json([{ id: 3, nombre: 'Llamada', descripcion: null, activo: true }])
    if (url.pathname === '/api/actividades/31' && input.method === 'GET') return json(fullActivity)
    if (url.pathname === '/api/actividades/31' && input.method === 'PATCH') return json({ ...fullActivity, ...(body as object) })
    if (url.pathname === '/api/actividades/31' && input.method === 'DELETE') return new Response(null, { status: 204 })
    return json([])
  }))
})

function show(kind: CommercialHistoryKind = 'empresas') {
  render(<AppProviders queryClient={createQueryClient()}><MemoryRouter><CommercialHistory kind={kind} id={4} /></MemoryRouter></AppProviders>)
}
const historyReads = () => requests.filter(r => r.url.pathname.endsWith('/historial-comercial') && r.method === 'GET')

describe('historial comercial compartido', () => {
  it('muestra una única proyección con actividades (ambas fechas y autor) y transiciones, y enlaza la oportunidad solo fuera de ella', async () => {
    show('empresas')
    const list = within(await screen.findByRole('list', { name: 'Historial comercial' }))
    const entries = list.getAllByRole('listitem')
    expect(entries.map(entry => entry.querySelector('h3')?.textContent)).toEqual(['Cambio de etapa: Consulta → Propuesta', 'Llamada', 'Reunión', 'Cambio de etapa: Alta de la oportunidad → Consulta'])
    expect(list.getAllByText(/Ocurrió el .* registrada por María Gómez el /, { selector: 'p' })).toHaveLength(2)
    expect(list.getByText('Pidió propuesta')).toBeTruthy()
    expect(list.getByText('Envió presupuesto')).toBeTruthy()
    expect(list.getAllByRole('link', { name: 'Renovación anual' })[0]!.getAttribute('href')).toBe('/oportunidades/22')
    expect(historyReads()).toHaveLength(1)
    expect(historyReads()[0]!.url.pathname).toBe('/api/empresas/4/historial-comercial')
  })

  it('en la ficha de la oportunidad no repite el enlace a sí misma', async () => {
    show('oportunidades')
    await screen.findByRole('list', { name: 'Historial comercial' })
    expect(screen.queryByRole('link', { name: 'Renovación anual' })).toBeNull()
    expect(historyReads()[0]!.url.pathname).toBe('/api/oportunidades/4/historial-comercial')
  })

  it('ofrece editar y dar de baja solo donde el servidor lo permite, sin ocultar la lectura ajena', async () => {
    show()
    const list = within(await screen.findByRole('list', { name: 'Historial comercial' }))
    expect(list.getByText('Reunión ajena')).toBeTruthy()
    expect(list.getAllByRole('button', { name: /^Editar actividad/ })).toHaveLength(1)
    expect(list.getAllByRole('button', { name: 'Dar de baja' })).toHaveLength(1)
  })

  it('edita una actividad con los datos vigentes, envía solo lo que cambió y recarga el historial', async () => {
    show()
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: /^Editar actividad/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Editar actividad' }))
    expect((dialog.getByRole('textbox', { name: /Descripción/ }) as HTMLTextAreaElement).value).toBe('Llamada inicial')
    await actor.type(dialog.getByRole('textbox', { name: /Descripción/ }), ' corregida')
    const before = historyReads().length
    await actor.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(requests.some(r => r.method === 'PATCH')).toBe(true))
    expect(requests.find(r => r.method === 'PATCH')!.body).toEqual({ descripcion: 'Llamada inicial corregida' })
    await waitFor(() => expect(historyReads().length).toBeGreaterThan(before))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('da de baja una actividad con confirmación y recarga el historial', async () => {
    show()
    const actor = userEvent.setup()
    await actor.click(await screen.findByRole('button', { name: 'Dar de baja' }))
    const before = historyReads().length
    await actor.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Dar de baja definitivamente' }))
    await waitFor(() => expect(requests.some(r => r.method === 'DELETE' && r.url.pathname === '/api/actividades/31')).toBe(true))
    await waitFor(() => expect(historyReads().length).toBeGreaterThan(before))
  })

  it('pagina contra el servidor, y muestra vacío y error con reintento', async () => {
    history = () => json(pageOf([transition], 25))
    show()
    const actor = userEvent.setup()
    await screen.findByRole('list', { name: 'Historial comercial' })
    await actor.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(historyReads().at(-1)!.url.searchParams.get('page')).toBe('2'))
    expect(historyReads().at(-1)!.url.searchParams.get('pageSize')).toBe('10')
  })

  it('informa cuando no hay registros y permite reintentar un error', async () => {
    let attempts = 0
    history = () => ++attempts === 1 ? json({ title: 'Error' }, 503) : json(pageOf([]))
    show()
    expect(await screen.findByText('No pudimos cargar el historial comercial.')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Todavía no hay actividades ni cambios de etapa.')).toBeTruthy()
    expect(attempts).toBe(2)
  })
})
