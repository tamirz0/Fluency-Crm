import { render, screen, waitFor, within } from '@testing-library/react'
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
let levelsPut: unknown
let userPatch: unknown
const teacherUser = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const teachers = [
  { id: 9, nombre: 'Paula', apellido: 'Docente', activo: true, niveles: [{ id: 1, descripcion: 'A1' }, { id: 2, descripcion: 'B1' }], cantidadCursos: 2, cantidadClases: 5 },
  { id: 10, nombre: 'Raúl', apellido: 'Sin niveles', activo: true, niveles: [], cantidadCursos: 0, cantidadClases: 0 },
]

beforeEach(() => {
  me = admin; levelsPut = undefined; userPatch = undefined
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: me, expiresAt: '2026-12-22T07:00:00Z' })
    if (request.method === 'PUT' && path === '/profesores/9/niveles') { levelsPut = await request.json(); return json({ disponibles: [], seleccionados: [] }) }
    if (request.method === 'PATCH' && path === '/usuarios/9') { userPatch = await request.json(); return json({ ...teacherUser, ...(userPatch as object) }) }
    if (path === '/usuarios/9') return json(teacherUser)
    if (path === '/roles') return json([{ codigo: 'PROFESOR', etiqueta: 'Profesor' }, { codigo: 'VENDEDOR', etiqueta: 'Vendedor' }])
    if (path.startsWith('/catalogos/niveles-ingles')) return json([{ id: 1, descripcion: 'A1', activo: true }, { id: 2, descripcion: 'B1', activo: true }, { id: 3, descripcion: 'C1', activo: true }])
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

it('el administrador edita los datos del profesor y sus niveles desde la pestaña', async () => {
  mount('/profesores')
  await userEvent.click(await screen.findByRole('button', { name: /Docente, Paula/ }))
  await userEvent.click(await screen.findByRole('button', { name: 'Editar datos' }))
  const dialog = within(await screen.findByRole('dialog'))
  const last = await dialog.findByLabelText('Apellido', { exact: false })
  await userEvent.clear(last); await userEvent.type(last, 'Docente Nueva')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(userPatch).toMatchObject({ apellido: 'Docente Nueva', roles: ['PROFESOR'] }))
  const levels = await screen.findByRole('group', { name: 'Niveles de Paula Docente' })
  expect((within(levels).getByRole('checkbox', { name: 'A1' }) as HTMLInputElement).checked).toBe(true)
  expect((within(levels).getByRole('checkbox', { name: 'C1' }) as HTMLInputElement).checked).toBe(false)
  await userEvent.click(within(levels).getByRole('checkbox', { name: 'C1' }))
  await userEvent.click(screen.getByRole('button', { name: 'Guardar niveles' }))
  await waitFor(() => expect(levelsPut).toEqual({ idNiveles: [1, 2, 3] }))
})
