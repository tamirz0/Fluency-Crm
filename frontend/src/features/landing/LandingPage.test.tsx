import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const session = { usuario: { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: [] }, expiresAt: '2026-10-22T07:00:00Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let authenticated = false
beforeEach(() => {
  authenticated = false
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/inicio/resumen')) return json({ alumnos: 0, oportunidadesAbiertas: 0, cerradasEsteMes: 0 })
    if (path.endsWith('/oportunidades')) return json({ items: [], page: 1, pageSize: 5, totalCount: 0 })
    return authenticated ? json(session) : json({ detail: 'Sesión vencida' }, 401)
  }))
})
function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('la raíz es una landing pública con Contacto (mailto) e Ingresar (login)', async () => {
  mount('/')
  expect(await screen.findByRole('heading', { level: 1, name: 'El CRM para academias de inglés' })).toBeTruthy()
  const contact = screen.getByRole('link', { name: 'Contacto' })
  expect(contact.getAttribute('href')).toMatch(/^mailto:/)
  expect(screen.getByRole('link', { name: 'Ingresar' }).getAttribute('href')).toBe('/login')
  const demoLinks = screen.getAllByRole('link', { name: 'Solicitar una demo' })
  expect(demoLinks.map(link => link.getAttribute('href'))).toEqual([contact.getAttribute('href'), contact.getAttribute('href')])
  expect(screen.getByRole('figure', { name: /Embudo comercial Vista de ejemplo/ }).id).toBe('plataforma')
  expect(screen.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeTruthy()
})
it('una ruta desconocida vuelve a la landing', async () => {
  mount('/no-existe')
  expect(await screen.findByRole('heading', { level: 1, name: 'El CRM para academias de inglés' })).toBeTruthy()
})
it('con sesión activa la raíz lleva al inicio', async () => {
  authenticated = true
  mount('/')
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
})
