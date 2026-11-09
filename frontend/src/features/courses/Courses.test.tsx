import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const teacher = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const admin = { id: 1, nombre: 'Ada', apellido: 'Admin', correo: 'ada@example.com', username: 'ada', activo: true, roles: ['ADMINISTRADOR'], permisos: ['GestionarAcademia', 'ConsultarComercial'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const student = (id: number, nombre: string, apellido: string, curso: { id: number; descripcion: string } | null = null) => ({ id, idContacto: id, nombre, apellido, documento: '3000' + id, correo: `${nombre}@example.com`, telefono: null, nivel: { id: 2, descripcion: 'B1' }, curso, fechaAlta: '2026-11-09T12:00:00Z' })
const course = { id: 3, nombre: 'B1 mañana', nivel: { id: 2, descripcion: 'B1' }, profesor: { id: 9, descripcion: 'Paula Docente' }, cantidadAlumnos: 1, cantidadClases: 2 }
let me = teacher
let enrolled = [student(1, 'Ana', 'Pérez', { id: 3, descripcion: 'B1 mañana' })]
let candidates = [student(2, 'Beto', 'Soto'), student(3, 'Carla', 'Vega')]
let calls: { url: string; body: unknown }[] = []

beforeEach(() => {
  me = teacher; calls = []
  enrolled = [student(1, 'Ana', 'Pérez', { id: 3, descripcion: 'B1 mañana' })]
  candidates = [student(2, 'Beto', 'Soto'), student(3, 'Carla', 'Vega')]
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: me, expiresAt: '2026-12-22T07:00:00Z' })
    if (request.method === 'POST') {
      const body = await request.clone().json(); calls.push({ url: `POST ${path}`, body })
      if (path === '/cursos') return json({ curso: { ...course, id: 4, nombre: body.nombre }, alumnos: [] }, 201)
      enrolled = [...enrolled, ...candidates.filter(c => (body as { idAlumnos: number[] }).idAlumnos.includes(c.id))]
      return json({ curso: { ...course, cantidadAlumnos: enrolled.length }, alumnos: enrolled })
    }
    if (path === '/cursos') return json({ items: [course], page: 1, pageSize: 100, totalCount: 1 })
    if (path === '/cursos/3') return json({ curso: { ...course, cantidadAlumnos: enrolled.length }, alumnos: enrolled })
    if (path === '/cursos/4') return json({ curso: { ...course, id: 4, nombre: 'B1 tarde' }, alumnos: [] })
    if (path === '/alumnos') return json({ items: candidates, page: 1, pageSize: 100, totalCount: candidates.length })
    if (path === '/profesores/yo/niveles') return json({ disponibles: [{ id: 1, descripcion: 'A1' }, { id: 2, descripcion: 'B1' }], seleccionados: [2] })
    if (path === '/profesores') return json([{ id: 9, nombre: 'Paula', apellido: 'Docente', activo: true, niveles: [{ id: 2, descripcion: 'B1' }], cantidadCursos: 1, cantidadClases: 2 }])
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('muestra los cursos en grilla y al abrir uno su ficha con la cantidad y la lista de alumnos', async () => {
  mount('/cursos')
  const grid = await screen.findByRole('list', { name: 'Cursos' })
  expect(within(grid).getByText('B1 mañana')).toBeTruthy()
  expect(within(grid).getByText('1 alumno · 2 clases')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Abrir curso B1 mañana' }))
  expect(await screen.findByRole('article', { name: 'Ficha del curso B1 mañana' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Alumnos (1)' })).toBeTruthy()
  expect(within(screen.getByRole('table', { name: 'Alumnos del curso' })).getByText('Pérez, Ana')).toBeTruthy()
})

it('suma alumnos del mismo nivel y sin curso desde la ficha', async () => {
  mount('/cursos/3')
  await userEvent.click(await screen.findByRole('button', { name: 'Agregar alumnos' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect((dialog.getByRole('button', { name: 'Agregar' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(dialog.getByLabelText('Alumnos'))
  await userEvent.click(await screen.findByRole('option', { name: 'Soto, Beto' }))
  await userEvent.click(dialog.getByRole('button', { name: 'Agregar' }))
  await waitFor(() => expect(calls).toHaveLength(1))
  expect(calls[0]).toEqual({ url: 'POST /cursos/3/alumnos', body: { idAlumnos: [2] } })
  expect(await screen.findByRole('heading', { name: 'Alumnos (2)' })).toBeTruthy()
})

it('el profesor crea un curso de uno de sus niveles con alumnos opcionales', async () => {
  mount('/cursos')
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }))
  const dialog = within(await screen.findByRole('dialog'))
  await userEvent.click(dialog.getByRole('button', { name: 'Crear curso' }))
  expect(await dialog.findByText('Ingresá el nombre del curso.')).toBeTruthy()
  await userEvent.type(dialog.getByLabelText('Nombre del curso', { exact: false }), 'B1 tarde')
  await userEvent.click(dialog.getByLabelText('Nivel de inglés', { exact: false }))
  const options = await screen.findAllByRole('option')
  expect(options.map(o => o.textContent)).toEqual(['B1'])
  await userEvent.click(options[0])
  await userEvent.click(dialog.getByLabelText('Agregar alumnos', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'Vega, Carla' }))
  await userEvent.click(dialog.getByRole('button', { name: 'Crear curso' }))
  await waitFor(() => expect(calls).toHaveLength(1))
  expect(calls[0]).toEqual({ url: 'POST /cursos', body: { nombre: 'B1 tarde', idNivel: 2, idAlumnos: [3] } })
  expect(await screen.findByRole('article', { name: 'Ficha del curso B1 tarde' })).toBeTruthy()
})

it('el administrador elige un profesor y solo ve los niveles de ese profesor', async () => {
  me = admin
  mount('/cursos')
  await userEvent.click(await screen.findByRole('button', { name: 'Nuevo curso' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect((dialog.getByLabelText('Nivel de inglés', { exact: false }) as HTMLElement).getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(dialog.getByLabelText('Profesor', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'Docente, Paula' }))
  await userEvent.click(dialog.getByLabelText('Nivel de inglés', { exact: false }))
  expect((await screen.findAllByRole('option')).map(o => o.textContent)).toEqual(['B1'])
})
