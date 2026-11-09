import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import App from '../../App'

const teacher = { id: 9, nombre: 'Paula', apellido: 'Docente', correo: 'paula@example.com', username: 'paula', activo: true, roles: ['PROFESOR'], permisos: ['GestionarAcademia'] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const student: { id: number; idContacto: number; nombre: string; apellido: string; documento: string; correo: string; telefono: null; nivel: { id: number; descripcion: string }; curso: { id: number; descripcion: string } | null; fechaAlta: string } = { id: 4, idContacto: 11, nombre: 'Ana', apellido: 'Pérez', documento: '30111222', correo: 'ana@example.com', telefono: null, nivel: { id: 2, descripcion: 'A2' }, curso: null, fechaAlta: '2026-11-09T12:00:00Z' }
const seller = { id: 3, nombre: 'Vera', apellido: 'Ventas', correo: 'vera@example.com', username: 'vera', activo: true, roles: ['VENDEDOR'], permisos: ['ConsultarComercial'] }
const contact = { id: 11, nombre: 'Ana', apellido: 'Pérez', documento: '30111222', cargo: null, correo: 'ana@example.com', telefono: null, idEstado: 1, estadoDescripcion: 'Cliente', estadoActivo: true, idOrigen: null, origenDescripcion: null, origenActivo: null, idEmpresa: null, empresaRazonSocial: null, observaciones: null, idResponsable: 3, responsableNombre: 'Vera Ventas', responsableActivo: true, fechaCreacion: '2026-10-31T12:00:00Z', activo: true }
const attendance = { idAlumno: 4, nivel: { id: 2, descripcion: 'A2' }, curso: { id: 3, descripcion: 'A2 mañana' }, presentes: 13, clases: 33, items: [
  { idClase: 8, titulo: 'Unidad 5', fecha: '2026-11-05', horaInicio: '10:00:00', esExamen: false, presente: true, nota: null },
  { idClase: 7, titulo: 'Examen parcial', fecha: '2026-11-03', horaInicio: '10:00:00', esExamen: true, presente: false, nota: 7.5 },
  { idClase: 6, titulo: 'Unidad 4', fecha: '2026-11-01', horaInicio: '10:00:00', esExamen: false, presente: null, nota: null },
] }
let me: typeof teacher = teacher
let urls: string[] = []
let levels = [1]
let putBody: unknown
let assigned: unknown

beforeEach(() => {
  urls = []; levels = [1]; putBody = undefined; assigned = undefined; me = teacher; student.curso = null
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    urls.push(`${request.method} ${url.pathname}${url.search}`)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/auth/me')) return json({ usuario: me, expiresAt: '2026-12-22T07:00:00Z' })
    if (url.pathname.endsWith('/profesores/yo/niveles')) {
      if (request.method === 'PUT') { putBody = await request.json(); levels = (putBody as { idNiveles: number[] }).idNiveles }
      return json({ disponibles: [{ id: 1, descripcion: 'A1' }, { id: 2, descripcion: 'A2' }], seleccionados: levels })
    }
    if (request.method === 'POST' && url.pathname.endsWith('/cursos/3/alumnos')) { assigned = await request.json(); student.curso = { id: 3, descripcion: 'A2 mañana' }; return json({ curso: {}, alumnos: [] }) }
    if (url.pathname.endsWith('/cursos')) return json({ items: [{ id: 3, nombre: 'A2 mañana', nivel: { id: 2, descripcion: 'A2' }, profesor: { id: 9, descripcion: 'Paula Docente' }, cantidadAlumnos: 1, cantidadClases: 0 }], page: 1, pageSize: 100, totalCount: 1 })
    if (url.pathname.endsWith('/alumnos/4/asistencia')) return json(attendance)
    if (url.pathname.endsWith('/contactos/11/academico')) return json({ alumno: attendance })
    if (url.pathname.endsWith('/contactos/11/historial-comercial')) return json({ items: [], page: 1, pageSize: 25, totalCount: 0 })
    if (url.pathname.endsWith('/contactos/11')) return json(contact)
    if (url.pathname.endsWith('/alumnos/4')) return json(student)
    if (url.pathname.endsWith('/alumnos')) return json({ items: [student], page: 1, pageSize: 25, totalCount: 1 })
    return json({ detail: 'No autorizado' }, 403)
  }))
})

function mount(path: string) {
  window.history.pushState({}, '', path)
  render(<AppProviders queryClient={createQueryClient()}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></AppProviders>)
}

it('el profesor entra a Clases, ve su menú académico, no la parte comercial, y lista a sus alumnos', async () => {
  mount('/inicio')
  expect(await screen.findByRole('heading', { name: 'Clases' })).toBeTruthy()
  const nav = screen.getByRole('navigation', { name: 'Secciones de Fluency CRM' })
  for (const visible of ['Alumnos', 'Cursos', 'Clases']) expect(within(nav).getByRole('link', { name: visible })).toBeTruthy()
  for (const hidden of ['Empresas', 'Contactos', 'Oportunidades', 'Embudo', 'Usuarios']) expect(within(nav).queryByRole('link', { name: hidden })).toBeNull()
  await userEvent.click(within(nav).getByRole('link', { name: 'Alumnos' }))
  expect(await screen.findByText('Pérez, Ana')).toBeTruthy()
  expect(screen.getByText('A2')).toBeTruthy()
  expect(screen.getByText('Sin curso')).toBeTruthy()
  expect(urls.some(u => u.includes('/empresas') || u.includes('/inicio/resumen'))).toBe(false)
})

it('abre la ficha del alumno sin historial comercial', async () => {
  mount('/alumnos')
  await userEvent.click(await screen.findByRole('link', { name: 'Pérez, Ana' }))
  expect(await screen.findByRole('article', { name: 'Ficha de Ana Pérez' })).toBeTruthy()
  expect(screen.getByText('30111222')).toBeTruthy()
  expect(screen.queryByText(/historial/i)).toBeNull()
})

it('la parte comercial redirige al profesor y su perfil guarda los niveles marcados', async () => {
  mount('/empresas')
  expect(await screen.findByRole('heading', { name: 'Clases' })).toBeTruthy()
  expect(urls.some(u => u.includes('/empresas'))).toBe(false)
  await userEvent.click(screen.getAllByRole('link', { name: /Mi perfil/ })[0])
  const a2 = await screen.findByRole('checkbox', { name: 'A2' })
  expect((screen.getByRole('checkbox', { name: 'A1' }) as HTMLInputElement).checked).toBe(true)
  expect((a2 as HTMLInputElement).checked).toBe(false)
  await userEvent.click(a2)
  await userEvent.click(screen.getByRole('button', { name: 'Guardar niveles' }))
  await waitFor(() => expect(putBody).toEqual({ idNiveles: [1, 2] }))
  expect(await screen.findByText('Niveles guardados.')).toBeTruthy()
})

it('la ficha del alumno muestra en grande las asistencias contra las clases y el detalle por clase', async () => {
  mount('/alumnos/4')
  expect(await screen.findByLabelText('Asistencias: 13 de 33 clases')).toBeTruthy()
  expect(screen.getByText('13/33')).toBeTruthy()
  const table = screen.getByRole('table', { name: 'Asistencia por clase' })
  expect(within(table).getByText('Presente')).toBeTruthy()
  expect(within(table).getByText('Ausente')).toBeTruthy()
  expect(within(table).getByText('Sin registrar')).toBeTruthy()
  expect(within(table).getByText('7.5')).toBeTruthy()
})

it('un vendedor ve la asistencia del alumno en la ficha del contacto, sin entrar a la parte académica', async () => {
  me = seller as unknown as typeof teacher
  mount('/contactos/11')
  expect(await screen.findByText('13/33')).toBeTruthy()
  expect(within(screen.getByRole('navigation', { name: 'Secciones de Fluency CRM' })).queryByRole('link', { name: 'Alumnos' })).toBeNull()
})

it('desde la ficha del alumno sin curso se le asigna uno de su nivel', async () => {
  mount('/alumnos/4')
  await userEvent.click(await screen.findByRole('button', { name: 'Asignar curso' }))
  const dialog = within(await screen.findByRole('dialog'))
  await userEvent.click(dialog.getByLabelText('Curso', { exact: false }))
  await userEvent.click(await screen.findByRole('option', { name: 'A2 mañana · Paula Docente' }))
  await userEvent.click(dialog.getByRole('button', { name: 'Asignar' }))
  await waitFor(() => expect(assigned).toEqual({ idAlumnos: [4] }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Asignar curso' })).toBeNull())
})

it('el menú separa por tipo, con el inicio arriba y sin tipos vacíos', async () => {
  me = { ...teacher, roles: ['ADMINISTRADOR'], permisos: ['GestionarAcademia', 'ConsultarComercial', 'AdministrarUsuarios', 'AdministrarConfiguracion'] } as typeof teacher
  mount('/alumnos')
  const nav = await screen.findByRole('navigation', { name: 'Secciones de Fluency CRM' })
  const labels = Array.from(nav.querySelectorAll('li[role="presentation"], a')).map(item => item.getAttribute('aria-label') ?? item.textContent).filter(label => !label?.startsWith('Mi perfil'))
  expect(labels).toEqual(['Inicio', 'Comercial', 'Empresas', 'Contactos', 'Oportunidades', 'Embudo', 'Academia', 'Alumnos', 'Cursos', 'Clases', 'Talleres', 'Profesores', 'Gestión', 'Usuarios', 'Catálogos', 'Servicios', 'Embudos y etapas'])
})

it('un profesor solo ve el tipo Academia', async () => {
  mount('/alumnos')
  const nav = await screen.findByRole('navigation', { name: 'Secciones de Fluency CRM' })
  expect(Array.from(nav.querySelectorAll('li[role="presentation"], a')).map(item => item.getAttribute('aria-label') ?? item.textContent).filter(label => !label?.startsWith('Mi perfil'))).toEqual(['Academia', 'Alumnos', 'Cursos', 'Clases', 'Talleres'])
})
