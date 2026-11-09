import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { CloseOpportunityDialog } from './CloseOpportunityDialog'

const item = {
  id: 22, titulo: 'Renovación anual', tituloVisible: 'Renovación anual', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: true,
  idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: null, contactoNombre: null, idEtapa: 3, etapaNombre: 'Propuesta', etapaActiva: true, estado: 'ABIERTA',
  idEmbudo: 1, embudoNombre: 'Embudo Inglés', embudoActivo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: true, valor: 150,
  fechaCreacion: '2026-11-05T12:00:00Z', activo: true,
  accionesPermitidas: { editar: true, reasignar: true, mover: true, cerrar: true, reabrir: false, darDeBaja: true, gestionarActividades: true },
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let posts: { url: string; body: unknown }[] = []
let outcome: () => Response = () => json({ ...item, estado: 'GANADA' })

beforeEach(() => {
  posts = []; outcome = () => json({ ...item, estado: 'GANADA' })
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/catalogos/motivos-perdida/opciones')) return json([{ id: 3, descripcion: 'Precio', activo: true }, { id: 4, descripcion: 'Competencia', activo: true }])
    if (input.method === 'POST') { posts.push({ url: url.pathname, body: await input.clone().json() }); return outcome() }
    return json([])
  }))
})

// El diálogo se abre desde un botón, como en la aplicación, para que MUI restaure el foco al cerrarse.
function Host({ initialResult, onDone, onClose }: { initialResult?: 'GANADA' | 'PERDIDA'; onDone: () => void; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Abrir cierre</button>
    <CloseOpportunityDialog item={item as never} initialResult={initialResult} open={open} onClose={() => { setOpen(false); onClose() }} onDone={() => { setOpen(false); onDone() }} /></>
}
async function renderDialog(initialResult?: 'GANADA' | 'PERDIDA') {
  const onDone = vi.fn(); const onClose = vi.fn()
  render(<AppProviders queryClient={createQueryClient()}><Host initialResult={initialResult} onDone={onDone} onClose={onClose} /></AppProviders>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir cierre' }))
  await screen.findByRole('dialog', { name: 'Cerrar oportunidad' })
  return { onDone, onClose }
}
const setDate = (value: string) => fireEvent.change(screen.getByLabelText(/Fecha de cierre/), { target: { value } })

describe('cierre de oportunidades', () => {
  it('gana con fecha y valor final, acepta cero y envía solo los datos del cierre', async () => {
    const { onDone } = await renderDialog('GANADA')
    expect(screen.queryByRole('combobox', { name: /Resultado/ })).toBeNull()
    expect(screen.getByText('Ganada')).toBeTruthy()
    const actor = userEvent.setup()
    expect((screen.getByLabelText(/Valor final/) as HTMLInputElement).value).toBe('150')
    setDate('2026-12-01')
    await actor.clear(screen.getByLabelText(/Valor final/)); await actor.type(screen.getByLabelText(/Valor final/), '0')
    await actor.type(screen.getByRole('textbox', { name: 'Observación' }), '  Firmó  ')
    await actor.click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts).toEqual([{ url: '/api/oportunidades/22/ganar', body: { fechaCierre: '2026-12-01', valor: 0, observacion: 'Firmó' } }])
  })

  it('pierde solo con un motivo y conserva el valor: no lo envía', async () => {
    const { onDone } = await renderDialog('PERDIDA')
    const actor = userEvent.setup()
    setDate('2026-12-02')
    await actor.click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    expect(await screen.findByText('Elegí el motivo de pérdida.')).toBeTruthy()
    expect(posts).toHaveLength(0)
    await actor.click(screen.getByRole('combobox', { name: /Motivo de pérdida/ })); await actor.click(await screen.findByRole('option', { name: 'Precio' }))
    await actor.click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts).toEqual([{ url: '/api/oportunidades/22/perder', body: { fechaCierre: '2026-12-02', idMotivoPerdida: 3 } }])
  })

  it('exige elegir el resultado, la fecha y un valor válido antes de enviar', async () => {
    await renderDialog()
    const actor = userEvent.setup()
    expect((screen.getByRole('button', { name: 'Cerrar oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    await actor.click(screen.getByRole('combobox', { name: /Resultado/ })); await actor.click(await screen.findByRole('option', { name: 'Ganada' }))
    await actor.clear(screen.getByLabelText(/Valor final/)); await actor.type(screen.getByLabelText(/Valor final/), '-5')
    await actor.click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    expect(await screen.findByText(/Ingresá un importe entre 0 y 9999999999,99/)).toBeTruthy()
    await actor.clear(screen.getByLabelText(/Valor final/)); await actor.type(screen.getByLabelText(/Valor final/), '10,5')
    setDate('')
    await actor.click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    expect(await screen.findByText('Ingresá la fecha de cierre.')).toBeTruthy()
    expect(posts).toHaveLength(0)
  })

  it('muestra el rechazo del servidor sin cerrar el diálogo ni duplicar el envío', async () => {
    outcome = () => json({ title: 'La oportunidad ya está cerrada. Para cambiar su resultado, reábrala primero.', code: 'BUSINESS_CONFLICT' }, 409)
    const { onDone, onClose } = await renderDialog('GANADA')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar oportunidad' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Cerrar oportunidad' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('ya está cerrada')
    expect(posts).toHaveLength(1)
    expect(onDone).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled()
  })
})
