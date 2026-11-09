import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const teacher = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const today = dayjs().format('YYYY-MM-DD')
const person = (id: number, nombre: string, apellido: string, esAlumno: boolean) => ({ idContacto: id, nombre, apellido, documento: null, esAlumno })
let enrolled = [person(1, 'Ana', 'Pérez', true)]
const workshop = () => ({ id: 7, titulo: 'Taller de conversación', fecha: today, horaInicio: '18:00:00', horaFin: '19:30:00', servicio: { id: 4, descripcion: 'Taller' }, cantidadInscriptos: enrolled.length })
let posted: { url: string; body: unknown }[] = []

beforeEach(() => {
  enrolled = [person(1, 'Ana', 'Pérez', true)]; posted = []
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname.replace(/^\/api/, '')
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (path.endsWith('/auth/me')) return json({ usuario: teacher, expiresAt: '2026-12-22T07:00:00Z' })
    if (request.method === 'POST') {
      const body = await request.clone().json(); posted.push({ url: `POST ${path}`, body })
      if (path === '/talleres') return json({ taller: workshop(), inscriptos: enrolled }, 201)
      enrolled = [...enrolled, person(2, 'Beto', 'Soto', false)]
      return json({ taller: workshop(), inscriptos: enrolled })
    }
    if (path === '/talleres') return json([workshop()])
    if (path === '/talleres/servicios') return json([{ id: 4, descripcion: 'Taller' }])
    if (path === '/talleres/7') return json({ taller: workshop(), inscriptos: enrolled })
    if (path === '/talleres/7/candidatos') return json([person(2, 'Beto', 'Soto', false)])
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('muestra los talleres en el calendario con su horario y permite pasar a la lista con la cantidad de anotados', async () => {
  mount('/talleres')
  const cell = (await screen.findByText('Taller de conversación')).closest('[role="gridcell"]') as HTMLElement
  expect(cell.getAttribute('data-date')).toBe(today)
  expect(within(cell).getByText('18:00 a 19:30')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
  const table = await screen.findByRole('table', { name: 'Lista de talleres' })
  expect(within(table).getByRole('button', { name: 'Taller de conversación' })).toBeTruthy()
  expect(within(table).getByText('1')).toBeTruthy()
})

it('crea un taller en un día a partir de un servicio de taller', async () => {
  mount('/talleres')
  await userEvent.click(await screen.findByRole('button', { name: /^Agregar un taller el 15 de/ }))
  const dialog = within(await screen.findByRole('dialog'))
  await userEvent.click(dialog.getByRole('button', { name: 'Crear taller' }))
  expect(await dialog.findByText('Ingresá el título.')).toBeTruthy()
  await userEvent.type(dialog.getByLabelText('Título', { exact: false }), 'Taller de pronunciación')
  await userEvent.click(dialog.getByLabelText('Servicio de taller', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'Taller' }))
  await userEvent.click(dialog.getByRole('button', { name: 'Crear taller' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0].body).toMatchObject({ titulo: 'Taller de pronunciación', idServicio: 4, horaInicio: '18:00:00', horaFin: '19:30:00' })
})

it('la ficha del taller lista a los anotados con su cantidad y anota a un candidato', async () => {
  mount('/talleres/7')
  expect(await screen.findByRole('heading', { name: 'Taller de conversación' })).toBeTruthy()
  expect(screen.getByLabelText('Anotados: 1')).toBeTruthy()
  expect(within(screen.getByRole('table', { name: 'Personas anotadas' })).getByText('Pérez, Ana')).toBeTruthy()
  await userEvent.click(screen.getByLabelText('Anotar a una persona'))
  await userEvent.click(await screen.findByRole('option', { name: 'Soto, Beto' }))
  await userEvent.click(screen.getByRole('button', { name: 'Anotar' }))
  await waitFor(() => expect(posted).toEqual([{ url: 'POST /talleres/7/inscripciones', body: { idContacto: 2 } }]))
  expect(await screen.findByLabelText('Anotados: 2')).toBeTruthy()
})
