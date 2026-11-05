import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { RegisterActivityButton, type ActivityContext } from './ActivityForm'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const context: ActivityContext = { label: 'Renovación anual (cerrada)', idEmpresa: 4, idContacto: 14, idOportunidad: 22 }

let posts: { url: string; body: Record<string, unknown> }[] = []
let outcome: () => Response = () => json({ id: 1 }, 201)

beforeEach(() => {
  posts = []; outcome = () => json({ id: 1 }, 201)
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/catalogos/tipos-actividad/opciones')) return json([{ id: 3, descripcion: 'Llamada', activo: true }, { id: 4, descripcion: 'Reunión', activo: true }])
    if (input.method === 'POST') { posts.push({ url: url.pathname, body: await input.clone().json() }); return outcome() }
    return json([])
  }))
})

async function open(onRegistered = vi.fn(), value = context) {
  render(<AppProviders queryClient={createQueryClient()}><RegisterActivityButton context={value} onRegistered={onRegistered} /></AppProviders>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Registrar actividad' }))
  return { onRegistered, dialog: within(await screen.findByRole('dialog', { name: 'Registrar actividad' })) }
}
const localValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

describe('registro de actividades desde las fichas', () => {
  it('registra desde una oportunidad cerrada enviando sus asociaciones sin pedirlas y solo los campos editables', async () => {
    const { onRegistered, dialog } = await open()
    const actor = userEvent.setup()
    expect(dialog.getByText('Renovación anual (cerrada)')).toBeTruthy()
    expect(dialog.queryByRole('combobox', { name: /Empresa|Contacto|Oportunidad/ })).toBeNull()
    await actor.click(dialog.getByRole('combobox', { name: /Tipo de actividad/ })); await actor.click(await screen.findByRole('option', { name: 'Llamada' }))
    const yesterday = new Date(Date.now() - 24 * 3600_000)
    fireEvent.change(dialog.getByLabelText(/Cuándo ocurrió/), { target: { value: localValue(yesterday) } })
    await actor.type(dialog.getByRole('textbox', { name: /Descripción/ }), '  Llamó para pedir presupuesto  ')
    await actor.type(dialog.getByRole('textbox', { name: 'Resultado' }), ' Enviar propuesta ')
    await actor.click(dialog.getByRole('button', { name: 'Registrar actividad' }))
    await waitFor(() => expect(onRegistered).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(1)
    expect(posts[0]!.url).toBe('/api/actividades')
    expect(Object.keys(posts[0]!.body).sort()).toEqual(['descripcion', 'fechaHora', 'idContacto', 'idEmpresa', 'idOportunidad', 'idTipo', 'resultado'])
    expect(posts[0]!.body).toMatchObject({ idTipo: 3, idEmpresa: 4, idContacto: 14, idOportunidad: 22, descripcion: 'Llamó para pedir presupuesto', resultado: 'Enviar propuesta' })
    expect(new Date(posts[0]!.body.fechaHora as string).getTime()).toBeCloseTo(new Date(localValue(yesterday)).getTime(), -3)
  })

  it('valida tipo, descripción y fecha futura antes de enviar y omite el resultado vacío', async () => {
    const { dialog } = await open(vi.fn(), { label: 'Lucía Pérez', idContacto: 14 })
    const actor = userEvent.setup()
    await actor.click(dialog.getByRole('button', { name: 'Registrar actividad' }))
    expect(await dialog.findByText('Elegí el tipo de actividad.')).toBeTruthy()
    expect(dialog.getByText('Describí qué pasó.')).toBeTruthy()
    await actor.click(dialog.getByRole('combobox', { name: /Tipo de actividad/ })); await actor.click(await screen.findByRole('option', { name: 'Reunión' }))
    await actor.type(dialog.getByRole('textbox', { name: /Descripción/ }), 'Visita')
    fireEvent.change(dialog.getByLabelText(/Cuándo ocurrió/), { target: { value: localValue(new Date(Date.now() + 3 * 24 * 3600_000)) } })
    await actor.click(dialog.getByRole('button', { name: 'Registrar actividad' }))
    expect(await dialog.findByText(/no puede ser futura/)).toBeTruthy()
    expect(posts).toHaveLength(0)
    fireEvent.change(dialog.getByLabelText(/Cuándo ocurrió/), { target: { value: localValue(new Date()) } })
    await actor.click(dialog.getByRole('button', { name: 'Registrar actividad' }))
    await waitFor(() => expect(posts).toHaveLength(1))
    expect(Object.keys(posts[0]!.body).sort()).toEqual(['descripcion', 'fechaHora', 'idContacto', 'idTipo'])
  })

  it('muestra el rechazo del servidor sin cerrar el editor ni duplicar el envío', async () => {
    outcome = () => json({ title: 'Solo el responsable o un superior puede registrar actividades de esta oportunidad.', code: 'FORBIDDEN' }, 403)
    const { onRegistered, dialog } = await open()
    const actor = userEvent.setup()
    await actor.click(dialog.getByRole('combobox', { name: /Tipo de actividad/ })); await actor.click(await screen.findByRole('option', { name: 'Llamada' }))
    await actor.type(dialog.getByRole('textbox', { name: /Descripción/ }), 'Llamada')
    await actor.click(dialog.getByRole('button', { name: 'Registrar actividad' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('puede registrar actividades')
    expect(posts).toHaveLength(1)
    expect(onRegistered).not.toHaveBeenCalled()
    expect((dialog.getByRole('textbox', { name: /Descripción/ }) as HTMLTextAreaElement).value).toBe('Llamada')
  })
})
