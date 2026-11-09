import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { ProfilePage } from './ProfilePage'

const baseUser = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['ADMINISTRADOR'], permisos: [] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let current = baseUser
let patched: unknown[] = []
let conflict = false

beforeEach(() => {
  current = baseUser; patched = []; conflict = false
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (request.method === 'PATCH') {
      if (conflict) return json({ title: 'El usuario o correo ya existe.' }, 409)
      const body = await request.clone().json(); patched.push(body)
      current = { ...current, ...body }
      return json({ usuario: current, expiresAt: '2026-10-22T07:00:00Z' })
    }
    return json({ usuario: current, expiresAt: '2026-10-22T07:00:00Z' })
  }))
})

function mount() {
  render(<AppProviders queryClient={createQueryClient()}><MemoryRouter><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter></AppProviders>)
}

it('muestra los datos de la sesión y los roles, que no se editan desde acá', async () => {
  mount()
  expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
  for (const text of ['María Gómez', 'maria', 'maria@example.com', 'Administrador']) expect(screen.getByText(text)).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByText(/pedile a un administrador\.$/)).toBeNull()
})

it('cualquier usuario, también el administrador, edita sus datos y se actualiza la sesión', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Editar mis datos' }))
  const name = screen.getByLabelText('Nombre', { exact: false })
  await userEvent.clear(name); await userEvent.type(name, 'Mariana')
  await userEvent.clear(screen.getByLabelText('Correo', { exact: false })); await userEvent.type(screen.getByLabelText('Correo', { exact: false }), 'mariana@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(patched).toEqual([{ nombre: 'Mariana', apellido: 'Gómez', correo: 'mariana@example.com', username: 'maria' }]))
  expect(await screen.findByText('Mariana Gómez')).toBeTruthy()
  expect(screen.getByText('mariana@example.com')).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
})

it('valida los campos y muestra el rechazo del servidor sin perder lo escrito', async () => {
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Editar mis datos' }))
  const mail = screen.getByLabelText('Correo', { exact: false })
  await userEvent.clear(mail); await userEvent.type(mail, 'no-es-correo')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('Ingresá un correo válido.')).toBeTruthy()
  expect(patched).toHaveLength(0)
  conflict = true
  await userEvent.clear(mail); await userEvent.type(mail, 'otra@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('El usuario o correo ya existe.')).toBeTruthy()
  expect((screen.getByLabelText('Correo', { exact: false }) as HTMLInputElement).value).toBe('otra@example.com')
})
