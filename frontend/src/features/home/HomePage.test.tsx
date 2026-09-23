import { type ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { SESSION_KEY } from '../../auth/session'
import { HomePage } from './HomePage'

const activeUser = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.com', username: 'maria', activo: true }

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function renderHome() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(activeUser))
  const queryClient = createQueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => <AppProviders queryClient={queryClient}><BrowserRouter><AuthProvider>{children}</AuthProvider></BrowserRouter></AppProviders>
  return render(<HomePage />, { wrapper: Wrapper })
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('desglose del pulso comercial', () => {
  it('integra cada total con su desglose e incluye etapas y estados nulos como guion', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([
        { id: 1, razonSocial: 'A', estadoDescripcion: 'Potencial' },
        { id: 2, razonSocial: 'B', estadoDescripcion: 'Cliente' },
        { id: 3, razonSocial: 'C', estadoDescripcion: 'Inactivo' },
        { id: 4, razonSocial: 'D', estadoDescripcion: null },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { id: 1, nombre: 'Ana', apellido: 'Paz', estadoDescripcion: 'Potencial' },
        { id: 2, nombre: 'Luis', apellido: 'Sol', estadoDescripcion: 'Inactivo' },
        { id: 3, nombre: 'Eva', apellido: 'Mar', estadoDescripcion: null },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { idEtapa: 1, nombre: 'Consulta recibida', orden: 1, oportunidades: [{ id: 11 }, { id: 12 }] },
        { idEtapa: 2, nombre: 'Propuesta', orden: 2, oportunidades: [{ id: 13 }] },
        { idEtapa: 3, nombre: '  ', orden: 3, oportunidades: [{ id: 14 }] },
      ]))

    renderHome()

    expect(await screen.findByRole('heading', { name: 'Hola, María' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: 'Empresas: 4' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: 'Contactos: 3' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: 'Oportunidades: 4' })).toBeTruthy()
    const opportunityBreakdown = await screen.findByLabelText('Oportunidades por etapa')
    expect(screen.getByRole('region', { name: 'Pulso comercial' }).contains(opportunityBreakdown)).toBe(true)
    expect(within(opportunityBreakdown).getByText('Consulta recibida')).toBeTruthy()
    expect(within(opportunityBreakdown).getByText('Propuesta')).toBeTruthy()
    expect(within(opportunityBreakdown).getByText('-', { exact: true })).toBeTruthy()
    expect(within(opportunityBreakdown).getByText('2')).toBeTruthy()
    expect(within(opportunityBreakdown).getAllByText('1')).toHaveLength(2)
    const opportunityCounts = within(opportunityBreakdown).getAllByRole('listitem').reduce((sum, item) => sum + Number(item.querySelector('strong')?.textContent), 0)
    expect(opportunityCounts).toBe(4)

    const companyBreakdown = screen.getByLabelText('Empresas por estado')
    expect(within(companyBreakdown).getByText('-', { exact: true })).toBeTruthy()
    expect(within(companyBreakdown).getByText('Cliente')).toBeTruthy()
    expect(within(companyBreakdown).getByText('Inactivo')).toBeTruthy()
    expect(within(companyBreakdown).getByText('Potencial')).toBeTruthy()
    expect(within(companyBreakdown).getAllByRole('listitem').reduce((sum, item) => sum + Number(item.querySelector('strong')?.textContent), 0)).toBe(4)

    const contactBreakdown = screen.getByLabelText('Contactos por estado')
    expect(within(contactBreakdown).getByText('-', { exact: true })).toBeTruthy()
    expect(within(contactBreakdown).getByText('Inactivo')).toBeTruthy()
    expect(within(contactBreakdown).getByText('Potencial')).toBeTruthy()
    expect(within(contactBreakdown).getAllByRole('listitem').reduce((sum, item) => sum + Number(item.querySelector('strong')?.textContent), 0)).toBe(3)
  })
})
