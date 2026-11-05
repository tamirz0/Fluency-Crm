import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { useState } from 'react'
import type { Actividad } from '../../api/client'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { ActivityDialog, RegisterActivityButton, type ActivityContext } from './ActivityForm'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const context: ActivityContext = { label: 'Renovación anual (cerrada)', idEmpresa: 4, idContacto: 14, idOportunidad: 22 }

let posts: { url: string; body: Record<string, unknown> }[] = []
let outcome: () => Response = () => json({ id: 1 }, 201)
let deletes: string[] = []
let removal: () => Response = () => new Response(null, { status: 204 })

beforeEach(() => {
  posts = []; deletes = []; outcome = () => json({ id: 1 }, 201); removal = () => new Response(null, { status: 204 })
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/catalogos/tipos-actividad/opciones')) return json([{ id: 3, descripcion: 'Llamada', activo: true }, { id: 4, descripcion: 'Reunión', activo: true }])
    if (input.method === 'POST' || input.method === 'PATCH') { posts.push({ url: url.pathname, body: await input.clone().json() }); return outcome() }
    if (input.method === 'DELETE') { deletes.push(url.pathname); return removal() }
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
  const activity = {
    id: 31, idTipo: 3, tipoNombre: 'Llamada', tipoActivo: true, idUsuario: 7, usuarioNombre: 'María Gómez', idEmpresa: 4, empresaRazonSocial: 'Acme', idContacto: 14, contactoNombre: 'Lucía Pérez',
    idOportunidad: 22, oportunidadTitulo: 'Renovación anual', fechaHora: '2026-11-04T15:30:00Z', fechaRegistro: '2026-11-05T09:00:00Z', descripcion: 'Llamada inicial', resultado: null, activo: true,
    accionesPermitidas: { editar: true, darDeBaja: true },
  } as Actividad

  function EditHost({ value, onDone }: { value: Actividad; onDone: () => void }) {
    const [isOpen, setIsOpen] = useState(false)
    return <><button onClick={() => setIsOpen(true)}>Editar actividad</button>
      <ActivityDialog context={{ label: 'Renovación anual' }} activity={value} open={isOpen} onClose={() => setIsOpen(false)} onDone={() => { setIsOpen(false); onDone() }} /></>
  }
  async function openEdit(value = activity) {
    const onDone = vi.fn()
    render(<AppProviders queryClient={createQueryClient()}><EditHost value={value} onDone={onDone} /></AppProviders>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Editar actividad' }))
    return { onDone, dialog: within(await screen.findByRole('dialog', { name: 'Editar actividad' })) }
  }

  it('edita enviando solo lo que cambió, sin asociaciones ni autor, y no llama a la API si no hay cambios', async () => {
    const { onDone, dialog } = await openEdit()
    const actor = userEvent.setup()
    expect((dialog.getByRole('textbox', { name: /Descripción/ }) as HTMLTextAreaElement).value).toBe('Llamada inicial')
    await actor.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts).toHaveLength(0)
  })

  it('al editar, cambia el texto y completa el resultado con un PATCH diferencial', async () => {
    const { onDone, dialog } = await openEdit()
    const actor = userEvent.setup()
    await actor.clear(dialog.getByRole('textbox', { name: /Descripción/ })); await actor.type(dialog.getByRole('textbox', { name: /Descripción/ }), '  Llamada de seguimiento ')
    await actor.type(dialog.getByRole('textbox', { name: 'Resultado' }), 'Pidió presupuesto')
    await actor.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts).toEqual([{ url: '/api/actividades/31', body: { descripcion: 'Llamada de seguimiento', resultado: 'Pidió presupuesto' } }])
  })

  it('da de baja una actividad con confirmación, muestra el rechazo del servidor y no deja marcador', async () => {
    removal = () => json({ title: 'Solo el responsable o un superior puede dar de baja actividades de esta oportunidad.', code: 'FORBIDDEN' }, 403)
    const onRemoved = vi.fn()
    render(<AppProviders queryClient={createQueryClient()}><RemoveRecordButton noun="actividad" name="Llamada inicial" remove={() => import('../../api/client').then(client => client.deleteActivity(31))} onRemoved={onRemoved} /></AppProviders>)
    const actor = userEvent.setup()
    await actor.click(screen.getByRole('button', { name: 'Dar de baja' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText(/No modifica la oportunidad ni los clientes asociados/)).toBeTruthy()
    await actor.click(dialog.getByRole('button', { name: 'Dar de baja definitivamente' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('puede dar de baja actividades')
    expect(onRemoved).not.toHaveBeenCalled()
    removal = () => new Response(null, { status: 204 })
    await actor.click(dialog.getByRole('button', { name: 'Dar de baja definitivamente' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1))
    expect(deletes).toEqual(['/api/actividades/31', '/api/actividades/31'])
  })
})
