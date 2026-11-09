import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const admin = { id: 1, nombre: 'Ada', apellido: 'Admin', correo: 'ada@example.com', username: 'ada', activo: true, roles: ['ADMINISTRADOR'], permisos: ['GestionarAcademia', 'ConsultarComercial', 'AdministrarUsuarios'] }
const teacher = { ...admin, id: 9, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let me = admin
const teachers = [
  { id: 9, nombre: 'Paula', apellido: 'Docente', activo: true, niveles: [{ id: 1, descripcion: 'A1' }, { id: 2, descripcion: 'B1' }], cantidadCursos: 2, cantidadClases: 5 },
  { id: 10, nombre: 'Raúl', apellido: 'Sin niveles', activo: true, niveles: [], cantidadCursos: 0, cantidadClases: 0 },
]

beforeEach(() => {
  me = admin
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: me, expiresAt: '2026-12-22T07:00:00Z' })
    if (path === '/profesores') return json(teachers)
    if (path === '/clases') return json([{ id: 5, titulo: 'Unidad 4', fecha: '2026-11-20', horaInicio: '10:00:00', horaFin: '11:00:00', esExamen: false, temasExamen: null, curso: { id: 3, descripcion: 'B1 mañana' }, profesor: { id: 9, descripcion: 'Paula Docente' } }])
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('el administrador ve cada profesor con sus niveles, cursos y clases, y consulta las clases asignadas', async () => {
  mount('/profesores')
  expect(await screen.findByRole('heading', { name: 'Docente, Paula' })).toBeTruthy()
  expect(screen.getByText('A1')).toBeTruthy()
  expect(screen.getByText('B1')).toBeTruthy()
  expect(screen.getByText('2 cursos · 5 clases')).toBeTruthy()
  expect(screen.getByText('Sin niveles marcados')).toBeTruthy()
  expect(within(screen.getByRole('navigation', { name: 'Secciones de Fluency CRM' })).getByRole('link', { name: 'Profesores' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: /Docente, Paula/ }))
  expect(await screen.findByRole('link', { name: 'Unidad 4' })).toBeTruthy()
})

it('un profesor no ve la pestaña ni accede a Profesores', async () => {
  me = teacher
  mount('/profesores')
  expect(await screen.findByRole('heading', { name: 'Clases' })).toBeTruthy()
  expect(within(screen.getByRole('navigation', { name: 'Secciones de Fluency CRM' })).queryByRole('link', { name: 'Profesores' })).toBeNull()
})
