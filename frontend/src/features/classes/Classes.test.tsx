import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'
import { monthGrid } from '../shared/calendar'

const teacher = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const admin = { id: 1, nombre: 'Ada', apellido: 'Admin', correo: 'ada@example.com', username: 'ada', activo: true, roles: ['ADMINISTRADOR'], permisos: ['GestionarAcademia', 'ConsultarComercial'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const today = dayjs().format('YYYY-MM-DD')
const course = { id: 3, nombre: 'B1 mañana', nivel: { id: 2, descripcion: 'B1' }, profesor: { id: 9, descripcion: 'Paula Docente' }, cantidadAlumnos: 2, cantidadClases: 1 }
const lesson = (over = {}) => ({ id: 5, titulo: 'Unidad 4', fecha: today, horaInicio: '10:00:00', horaFin: '11:30:00', esExamen: false, temasExamen: null, curso: { id: 3, descripcion: 'B1 mañana' }, profesor: { id: 9, descripcion: 'Paula Docente' }, ...over })
const students = [
  { idAlumno: 1, idContacto: 1, nombre: 'Ana', apellido: 'Pérez', documento: '30111222', presente: null, nota: null },
  { idAlumno: 2, idContacto: 2, nombre: 'Beto', apellido: 'Soto', documento: null, presente: false, nota: 7 },
]
let me = teacher
let lessons: ReturnType<typeof lesson>[] = []
let detail = { clase: lesson(), alumnos: students }
let posted: { url: string; body: unknown }[] = []

beforeEach(() => {
  me = teacher; lessons = [lesson()]; detail = { clase: lesson(), alumnos: students }; posted = []
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: me, expiresAt: '2026-12-22T07:00:00Z' })
    if (request.method !== 'GET') {
      const body = await request.clone().json(); posted.push({ url: `${request.method} ${path}`, body })
      if (path === '/clases') return json({ clase: lesson({ id: 6 }), alumnos: [] }, 201)
      if (path === '/clases/5' && request.method === 'PUT') { detail = { ...detail, clase: lesson(body as object) }; return json(detail) }
      return json(detail)
    }
    if (path === '/clases') return json(lessons)
    if (path === '/clases/5') return json(detail)
    if (path === '/cursos') return json({ items: [course], page: 1, pageSize: 100, totalCount: 1 })
    if (path === '/profesores') return json([{ id: 9, nombre: 'Paula', apellido: 'Docente', activo: true, niveles: [], cantidadCursos: 1, cantidadClases: 1 }])
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('arma la grilla mensual de lunes a domingo con semanas completas', () => {
  const days = monthGrid(dayjs('2026-11-09'))
  expect(days.length % 7).toBe(0)
  expect(days[0].day()).toBe(1)
  expect(days[0].format('YYYY-MM-DD')).toBe('2026-10-26')
  expect(days.at(-1)?.format('YYYY-MM-DD')).toBe('2026-12-06')
})

it('muestra cada clase en su día con el título y, debajo, el horario, y permite pasar a la lista', async () => {
  mount('/clases')
  const cell = (await screen.findByText('Unidad 4')).closest('[role="gridcell"]') as HTMLElement
  expect(cell.getAttribute('data-date')).toBe(today)
  expect(within(cell).getByText('10:00 a 11:30')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
  const table = await screen.findByRole('table', { name: 'Lista de clases' })
  expect(within(table).getByText('Unidad 4')).toBeTruthy()
  expect(within(table).getByText('B1 mañana')).toBeTruthy()
})

it('al hacer clic en un día el profesor carga una clase de uno de sus cursos', async () => {
  mount('/clases')
  await userEvent.click(await screen.findByRole('button', { name: /^Agregar una clase el 15 de/ }))
  const dialog = within(await screen.findByRole('dialog'))
  await userEvent.click(dialog.getByRole('button', { name: 'Crear clase' }))
  expect(await dialog.findByText('Ingresá el título.')).toBeTruthy()
  expect(posted).toHaveLength(0)
  await userEvent.type(dialog.getByLabelText('Título', { exact: false }), 'Repaso')
  await userEvent.click(dialog.getByLabelText('Curso', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'B1 mañana · B1' }))
  await userEvent.click(dialog.getByLabelText('Es un examen'))
  await userEvent.type(dialog.getByLabelText('Temas del examen', { exact: false }), 'Unidades 1 a 3')
  await userEvent.click(dialog.getByRole('button', { name: 'Crear clase' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0].url).toBe('POST /clases')
  expect(posted[0].body).toMatchObject({ titulo: 'Repaso', idCurso: 3, horaInicio: '09:00:00', horaFin: '10:00:00', esExamen: true, temasExamen: 'Unidades 1 a 3' })
  expect((posted[0].body as { fecha: string }).fecha).toMatch(/^\d{4}-\d{2}-15$/)
})

it('el administrador elige primero el profesor y después uno de sus cursos', async () => {
  me = admin
  mount('/clases')
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva clase' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect((dialog.getByLabelText('Curso', { exact: false }) as HTMLElement).getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(dialog.getByLabelText('Profesor', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'Docente, Paula' }))
  await userEvent.click(dialog.getByLabelText('Curso', { exact: false }))
  expect(await screen.findByRole('option', { name: 'B1 mañana · B1' })).toBeTruthy()
})

it('la planilla marca presentes y ausentes y guarda solo lo modificado', async () => {
  mount('/clases/5')
  expect(await screen.findByRole('heading', { name: 'Unidad 4' })).toBeTruthy()
  await userEvent.click(within(screen.getByRole('group', { name: 'Asistencia de Pérez, Ana' })).getByRole('button', { name: 'Presente' }))
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0]).toEqual({ url: 'PUT /clases/5/asistencia', body: { items: [{ idAlumno: 1, presente: true }] } })
  expect(screen.queryByLabelText('Nota de Pérez, Ana')).toBeNull()
})

it('en un examen carga las notas por alumno y rechaza valores fuera de rango', async () => {
  detail = { clase: lesson({ esExamen: true, temasExamen: 'Unidades 1 a 3' }), alumnos: students }
  mount('/clases/5')
  expect(await screen.findByText('Unidades 1 a 3')).toBeTruthy()
  const note = screen.getByLabelText('Nota de Pérez, Ana')
  await userEvent.type(note, '11')
  expect(await screen.findByText(/de 0 a 10/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.clear(note); await userEvent.type(note, '8,5')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0]).toEqual({ url: 'PUT /clases/5/notas', body: { items: [{ idAlumno: 1, nota: 8.5 }] } })
})

it('al elegir el curso sugiere el título «Curso · Clase N» y respeta el que el usuario escribió', async () => {
  mount('/clases')
  await userEvent.click(await screen.findByRole('button', { name: /^Agregar una clase el 15 de/ }))
  const dialog = within(await screen.findByRole('dialog'))
  await userEvent.click(dialog.getByLabelText('Curso', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'B1 mañana · B1' }))
  expect((dialog.getByLabelText('Título', { exact: false }) as HTMLInputElement).value).toBe('B1 mañana · Clase 2')
  await userEvent.clear(dialog.getByLabelText('Título', { exact: false })); await userEvent.type(dialog.getByLabelText('Título', { exact: false }), 'Mi título')
  await userEvent.click(dialog.getByLabelText('Curso', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'B1 mañana · B1' }))
  expect((dialog.getByLabelText('Título', { exact: false }) as HTMLInputElement).value).toBe('Mi título')
})

it('al entrar en una clase se pueden editar sus datos, con el curso fijo, y se ve el cambio', async () => {
  mount('/clases/5')
  await userEvent.click(await screen.findByRole('button', { name: 'Editar clase' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByText('B1 mañana')).toBeTruthy()
  expect(dialog.queryByLabelText('Curso', { exact: false })).toBeNull()
  const title = dialog.getByLabelText('Título', { exact: false })
  expect((title as HTMLInputElement).value).toBe('Unidad 4')
  await userEvent.clear(title); await userEvent.type(title, 'Unidad 4 (repaso)')
  await userEvent.clear(dialog.getByLabelText('Hora de fin', { exact: false })); await userEvent.type(dialog.getByLabelText('Hora de fin', { exact: false }), '12:00')
  await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0].url).toBe('PUT /clases/5')
  expect(posted[0].body).toMatchObject({ titulo: 'Unidad 4 (repaso)', horaInicio: '10:00:00', horaFin: '12:00:00', esExamen: false })
  expect(await screen.findByRole('heading', { name: 'Unidad 4 (repaso)' })).toBeTruthy()
})
