import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { createQueryClient } from '../../app/queryClient'
import { ReopenOpportunityDialog } from './ReopenOpportunityDialog'

const item = {
  id: 22, titulo: 'Renovación anual', tituloVisible: 'Renovación anual', idResponsable: 7, responsableNombre: 'María Gómez', responsableActivo: false,
  idEmpresa: 4, empresaRazonSocial: 'Acme Idiomas', idContacto: null, contactoNombre: null, idEtapa: 5, etapaNombre: 'Ganada', etapaActiva: true, estado: 'GANADA',
  idEmbudo: 1, embudoNombre: 'Embudo Inglés', embudoActivo: true, idServicio: 2, servicioNombre: 'Capacitación', servicioActivo: false, valor: 150,
  fechaCreacion: '2026-11-05T12:00:00Z', fechaCierre: '2026-12-01T00:00:00Z', activo: true,
  accionesPermitidas: { editar: false, reasignar: false, mover: false, cerrar: false, reabrir: true, darDeBaja: true, gestionarActividades: true },
}
const stageOf = (id: number, nombre: string, orden: number, estado: string, activo = true) => ({ id, nombre, descripcion: null, orden, idEmbudo: 1, estado, activo })
const stages = [stageOf(5, 'Ganada', 1, 'GANADA'), stageOf(6, 'Perdida', 2, 'PERDIDA'), stageOf(3, 'Propuesta', 3, 'ABIERTA'), stageOf(4, 'Negociación', 4, 'ABIERTA'), stageOf(7, 'Retirada', 5, 'ABIERTA', false)]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let posts: { url: string; body: unknown }[] = []
let outcome: () => Response = () => json({ ...item, estado: 'ABIERTA' })

beforeEach(() => {
  posts = []; outcome = () => json({ ...item, estado: 'ABIERTA' })
  vi.stubGlobal('fetch', vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    if (url.pathname.endsWith('/csrf')) return json({ requestToken: 'csrf-test' })
    if (url.pathname.endsWith('/embudos/1/etapas')) return json(stages)
    if (input.method === 'POST') { posts.push({ url: url.pathname, body: await input.clone().json() }); return outcome() }
    return json([])
  }))
})

// Se abre desde un botón, como en la aplicación, para que MUI restaure el foco al cerrarse.
function Host({ value, onDone }: { value: typeof item; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Abrir reapertura</button><ReopenOpportunityDialog item={value as never} open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone() }} /></>
}
async function renderDialog(value = item) {
  const onDone = vi.fn()
  render(<AppProviders queryClient={createQueryClient()}><Host value={value} onDone={onDone} /></AppProviders>)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir reapertura' }))
  return { onDone, dialog: within(await screen.findByRole('dialog', { name: 'Reabrir oportunidad' })) }
}

describe('reapertura de oportunidades', () => {
  it('ofrece solo etapas abiertas activas, exige justificación y envía destino y justificación', async () => {
    const { onDone, dialog } = await renderDialog()
    const actor = userEvent.setup()
    expect(dialog.getByText(/no hace falta cambiarlos/)).toBeTruthy()
    await actor.click(dialog.getByRole('combobox', { name: /Etapa de destino/ }))
    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['Propuesta', 'Negociación'])
    await actor.click(screen.getByRole('option', { name: 'Negociación' }))
    await actor.click(dialog.getByRole('button', { name: 'Reabrir oportunidad' }))
    expect(await dialog.findByText('Escribí la justificación de la reapertura.')).toBeTruthy()
    expect(posts).toHaveLength(0)
    await actor.type(dialog.getByRole('textbox', { name: /Justificación/ }), '  Error de carga  ')
    await actor.click(dialog.getByRole('button', { name: 'Reabrir oportunidad' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts).toEqual([{ url: '/api/oportunidades/22/reabrir', body: { idEtapa: 4, justificacion: 'Error de carga' } }])
  })

  it('con el embudo inactivo explica el límite y no permite reabrir', async () => {
    const { dialog } = await renderDialog({ ...item, embudoActivo: false })
    expect(dialog.getByText(/está inactivo: reactivalo/)).toBeTruthy()
    expect((dialog.getByRole('button', { name: 'Reabrir oportunidad' }) as HTMLButtonElement).disabled).toBe(true)
    expect(posts).toHaveLength(0)
  })

  it('muestra el rechazo del servidor sin cerrar el diálogo ni duplicar el envío', async () => {
    outcome = () => json({ title: 'Solo un administrador o responsable comercial puede reabrir oportunidades.', code: 'FORBIDDEN' }, 403)
    const { onDone, dialog } = await renderDialog()
    const actor = userEvent.setup()
    await actor.click(dialog.getByRole('combobox', { name: /Etapa de destino/ })); await actor.click(await screen.findByRole('option', { name: 'Propuesta' }))
    await actor.type(dialog.getByRole('textbox', { name: /Justificación/ }), 'Motivo')
    await actor.click(dialog.getByRole('button', { name: 'Reabrir oportunidad' }))
    expect((await dialog.findByRole('alert')).textContent).toContain('puede reabrir oportunidades')
    expect(posts).toHaveLength(1)
    expect(onDone).not.toHaveBeenCalled()
  })
})
