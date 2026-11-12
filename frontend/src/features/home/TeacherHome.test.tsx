import { render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const teacher = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const lesson = (id: number, titulo: string, fecha: string, esExamen = false) => ({ id, titulo, fecha, horaInicio: '10:00:00', horaFin: '11:30:00', esExamen, temasExamen: null, curso: { id: 3, descripcion: 'B1 mañana' }, profesor: { id: 9, descripcion: 'Paula Docente' } })
let summary: () => Response
let calls = 0

beforeEach(() => {
  calls = 0
  summary = () => json({ cantidadNiveles: 2, cantidadCursos: 3, cantidadAlumnos: 17, clasesHoy: [lesson(1, 'Unidad 4', '2026-11-09')], proximasClases: [lesson(2, 'Unidad 5', '2026-11-11')], proximosExamenes: [lesson(3, 'Examen parcial', '2026-11-13', true)] })
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: teacher, expiresAt: '2026-12-22T07:00:00Z' })
    if (path === '/profesores/yo/resumen') { calls++; return summary() }
    if (path === '/profesores/yo/niveles') return json({ disponibles: [{ id: 1, descripcion: 'A1' }, { id: 2, descripcion: 'A2' }, { id: 3, descripcion: 'B1' }], seleccionados: [1, 3] })
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount() {
  window.history.pushState({}, '', '/inicio')
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('muestra al profesor sus cursos, alumnos, clases de hoy y de la semana y próximos exámenes, con enlaces a cada clase', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Hola, Paula' })).toBeTruthy()
  expect(await screen.findByLabelText('Cursos a cargo: 3')).toBeTruthy()
  expect(screen.getByLabelText('Alumnos en tus cursos: 17')).toBeTruthy()
  expect(await screen.findByLabelText('Mis niveles de inglés: A1, B1')).toBeTruthy()
  const today = within(screen.getByRole('region', { name: 'Clases de hoy' }))
  expect(today.getByRole('link', { name: /^Unidad 4/ }).getAttribute('href')).toBe('/clases/1')
  expect(today.getByText('10:00–11:30')).toBeTruthy()
  expect(today.getByText('B1 mañana')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: 'Próximos 7 días' })).getByRole('link', { name: /^Unidad 5/ })).toBeTruthy()
  const exams = within(screen.getByRole('region', { name: 'Próximos exámenes' }))
  expect(exams.getByRole('link', { name: /^Examen parcial/ })).toBeTruthy()
  expect(exams.getByText(/^Examen · /)).toBeTruthy()
  expect(screen.queryByText(/Marcalos en Mi perfil/)).toBeNull()
})

it('avisa si todavía no marcó niveles, muestra vacíos como cero y permite reintentar un error', async () => {
  summary = () => json({ cantidadNiveles: 0, cantidadCursos: 0, cantidadAlumnos: 0, clasesHoy: [], proximasClases: [], proximosExamenes: [] })
  mount()
  expect(await screen.findByText('Marcalos en Mi perfil')).toBeTruthy()
  expect(screen.getByLabelText('Cursos a cargo: 0')).toBeTruthy()
  expect(screen.getByText('No tenés clases hoy.')).toBeTruthy()
})

it('un error de carga no se presenta como cero y se puede reintentar', async () => {
  summary = () => json({ title: 'Falló' }, 500)
  mount()
  expect(await screen.findByText(/No pudimos cargar tu resumen/)).toBeTruthy()
  expect(screen.getByLabelText('Cursos a cargo: no disponible')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  expect(calls).toBeGreaterThan(0)
})
