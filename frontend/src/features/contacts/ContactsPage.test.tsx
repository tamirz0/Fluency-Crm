import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthContext } from '../../auth/context'
import { ContactsPage } from './ContactsPage'

const user = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.invalid', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: ['ConsultarComercial', 'GestionarClientes', 'GestionarOportunidad'] }
const firstContact = { id: 14, nombre: 'Lucía', apellido: 'Pérez', documento: '12345678', cargo: 'Coordinadora', correo: 'lucia@example.invalid', telefono: '1144445555', idEstado: 1, estadoDescripcion: 'Potencial', estadoActivo: true, idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idOrigen: 2, origenDescripcion: 'Referido', origenActivo: true, idResponsable: 8, responsableNombre: 'Otro Usuario', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true, observaciones: null }
const company = { id: 4, razonSocial: 'Acme Idiomas' }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
function page(items: unknown[], totalCount = items.length) { return { items, totalCount, page: 1, pageSize: 25 } }
let contacts: typeof firstContact[]
let removeHandler: () => Response
let permissions: string[]

function renderApp() {
  window.history.pushState({}, '', '/contactos')
  const auth = { user: { ...user, permisos: permissions }, isAuthenticated: true, isLoading: false, refresh: async () => {}, login: async () => {}, logout: async () => {} }
  return render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthContext.Provider value={auth}><ContactsPage /></AuthContext.Provider></BrowserRouter></AppProviders>)
}

function requestCalls(method: string) {
  return vi.mocked(fetch).mock.calls.map(([input]) => input as Request).filter(request => request.method === method && new URL(request.url).pathname.includes('/contactos'))
}

async function openContactActions() {
  const table = within(await screen.findByRole('table', { name: 'Contactos' }))
  await userEvent.setup().click(table.getByRole('button', { name: 'Opciones de Pérez, Lucía' }))
  return within(await screen.findByRole('menu'))
}

beforeEach(() => {
  sessionStorage.clear()
  contacts = [{ ...firstContact }]
  permissions = [...user.permisos]
  removeHandler = () => { contacts = []; return new Response(null, { status: 204 }) }
  vi.stubGlobal('fetch', vi.fn(async input => {
    const request = input as Request
    const path = new URL(request.url).pathname.replace('/api', '')
    if (path === '/auth/csrf') return json({ requestToken: 'fixture-csrf' })
    if (path === '/catalogos/estados-cliente/opciones') return json([{ id: 1, descripcion: 'Potencial', activo: true }])
    if (path === '/catalogos/origenes-comerciales/opciones') return json([{ id: 2, descripcion: 'Referido', activo: true }])
    if (path === '/contactos' && request.method === 'GET') return json(page(contacts))
    if (path === '/contactos/14' && request.method === 'DELETE') return removeHandler()
    if (path === '/empresas' && request.method === 'GET') return json(page([company]))
    if (path === '/usuarios/opciones') return json(page([]))
    return json({ title: 'No existe el contacto.' }, 404)
  }))
})

describe('listado de contactos', () => {
  it('ofrece las mismas acciones contextuales con rutas y datos del contacto', async () => {
    renderApp()
    const menu = await openContactActions()
    expect(menu.getByRole('menuitem', { name: 'Ver ficha completa' }).getAttribute('href')).toBe('/contactos/14')
    expect(menu.getByRole('menuitem', { name: 'Editar datos del contacto' }).getAttribute('href')).toBe('/contactos/14/editar')
    expect(menu.getByRole('menuitem', { name: 'Crear oportunidad comercial' })).toBeTruthy()
    expect(menu.getByRole('menuitem', { name: 'Dar de baja' })).toBeTruthy()
    await userEvent.setup().click(menu.getByRole('menuitem', { name: 'Crear oportunidad comercial' }))
    expect(await screen.findByRole('dialog', { name: 'Nueva oportunidad' })).toBeTruthy()
    expect(window.location.pathname).toBe('/contactos')
  })

  it('limita el menú a ver la ficha cuando la sesión solo permite consultar', async () => {
    permissions = ['ConsultarComercial']
    renderApp()
    const menu = await openContactActions()
    expect(menu.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Ver ficha completa'])
  })

  it('confirma la baja, muestra conflictos y actualiza el listado al completarla', async () => {
    removeHandler = () => json({ title: 'Tiene oportunidades activas.' }, 409)
    renderApp()
    const actor = userEvent.setup()
    await actor.click((await openContactActions()).getByRole('menuitem', { name: 'Dar de baja' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Dar de baja el contacto' }))
    expect(requestCalls('DELETE')).toHaveLength(0)
    const confirm = dialog.getByRole('button', { name: 'Dar de baja definitivamente' })
    await actor.click(confirm)
    expect(await dialog.findByText('Tiene oportunidades activas.')).toBeTruthy()
    removeHandler = () => { contacts = []; return new Response(null, { status: 204 }) }
    await actor.click(confirm)
    expect(await screen.findByText('Contacto dado de baja')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Todavía no hay contactos' })).toBeTruthy()
  })
})
