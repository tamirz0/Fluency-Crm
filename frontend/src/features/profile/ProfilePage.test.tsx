import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { ProfilePage } from './ProfilePage'

const session = { usuario: { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true, roles: ['RESPONSABLE_COMERCIAL'], permisos: [] }, expiresAt: '2026-10-22T07:00:00Z' }
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (request: Request) => json(new URL(request.url).pathname.endsWith('/csrf') ? { requestToken: 'csrf-test' } : session)))
})

it('muestra solo los datos de la sesión actual, sin campos editables', async () => {
  render(<AppProviders queryClient={createQueryClient()}><MemoryRouter><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter></AppProviders>)
  expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
  for (const text of ['María Gómez', 'maria', 'maria@example.com', 'Responsable comercial']) expect(screen.getByText(text)).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
})
