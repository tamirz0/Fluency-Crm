import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Alert, Box, Button, Chip, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Check, Close, DragIndicator, EditOutlined, FiberManualRecord, LockOutlined } from '@mui/icons-material'
import { visuallyHidden } from '@mui/utils'
import { useQueryClient } from '@tanstack/react-query'
import { reorderStages, type Embudo, type EtapaConfiguracion } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

type StageId = EtapaConfiguracion['id']
const byOrder = (a: EtapaConfiguracion, b: EtapaConfiguracion) => Number(a.orden) - Number(b.orden) || Number(a.id) - Number(b.id)

export function StageOrderEditor({ funnel, stages, error, onError, onSaved, onEdit, onActive }: {
  funnel: Embudo; stages: EtapaConfiguracion[]; error: string; onError: (message: string) => void; onSaved: () => void;
  onEdit: (stage: EtapaConfiguracion) => void; onActive: (stage: EtapaConfiguracion) => void;
}) {
  const client = useQueryClient(), pending = useRef(false)
  const { isLoading } = useAuth()
  const initialOpen = stages.filter(s => s.estado === 'ABIERTA' && s.activo).sort(byOrder)
  const inactive = stages.filter(s => s.estado === 'ABIERTA' && !s.activo).sort(byOrder)
  const finals = stages.filter(s => s.estado !== 'ABIERTA').sort((a, b) => Number(a.estado !== 'GANADA') - Number(b.estado !== 'GANADA'))
  const [sequence, setSequence] = useState(initialOpen), [saving, setSaving] = useState(false)
  const [draggingId, setDraggingId] = useState<StageId | null>(null), [announcement, setAnnouncement] = useState('')
  const rows = useRef<HTMLTableSectionElement>(null)
  const drag = useRef<{ id: StageId; pointerId: number; startY: number; moved: boolean; before: EtapaConfiguracion[] } | null>(null)
  const focusAfterMove = useRef<StageId | null>(null)
  const previousTops = useRef<Map<HTMLTableRowElement, number> | null>(null)
  const animations = useRef(new WeakMap<HTMLTableRowElement, Animation>())
  const rememberPositions = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const openRows = rows.current?.querySelectorAll<HTMLTableRowElement>('tr[data-stage-id]') ?? []
    previousTops.current = new Map(Array.from(openRows, row => [row, row.getBoundingClientRect().top]))
  }
  useLayoutEffect(() => {
    const positions = previousTops.current
    previousTops.current = null
    if (positions) for (const [row, top] of positions) {
      animations.current.get(row)?.cancel()
      const delta = top - row.getBoundingClientRect().top
      if (delta && row.animate) animations.current.set(row, row.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(.2,.75,.25,1)' },
      ))
    }
    if (focusAfterMove.current === null) return
    rows.current?.querySelector<HTMLButtonElement>(`button[data-stage-handle-id="${focusAfterMove.current}"]`)?.focus({ preventScroll: true })
    focusAfterMove.current = null
  }, [sequence])
  const dirty = sequence.some((s, i) => s.id !== initialOpen[i].id)
  const disabled = saving || isLoading
  const move = (id: StageId, target: StageId) => {
    if (pending.current || isLoading || id === target) return
    const from = sequence.findIndex(s => s.id === id), to = sequence.findIndex(s => s.id === target)
    if (from < 0 || to < 0) return
    const next = [...sequence], [stage] = next.splice(from, 1)
    next.splice(to, 0, stage)
    rememberPositions()
    focusAfterMove.current = id
    setSequence(next)
    setAnnouncement(`${stage.nombre}, posición ${to + 1} de ${next.length} etapas abiertas activas.`)
  }
  const cancelDrag = () => {
    if (!drag.current) return
    rememberPositions()
    focusAfterMove.current = drag.current.id
    setSequence(drag.current.before); drag.current = null; setDraggingId(null)
    setAnnouncement('Arrastre cancelado.')
  }
  const startDrag = (event: PointerEvent<HTMLButtonElement>, stage: EtapaConfiguracion) => {
    if (pending.current || isLoading || !stage.activo || event.button !== 0 || !event.isPrimary) return
    event.currentTarget.focus()
    drag.current = { id: stage.id, pointerId: event.pointerId, startY: event.clientY, moved: false, before: [...sequence] }
    setDraggingId(stage.id)
    // Capture on the stationary tbody so moving a row cannot lose the pointer capture.
    rows.current?.setPointerCapture?.(event.pointerId)
  }
  const movePointer = (event: PointerEvent<HTMLTableSectionElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId || !current.moved && Math.abs(event.clientY - current.startY) < 5) return
    current.moved = true
    const target = Array.from(rows.current?.querySelectorAll<HTMLTableRowElement>('tr[data-stage-id]') ?? []).find(row => {
      const rect = row.getBoundingClientRect()
      // Drop targets follow the table order while the rows animate into place.
      const transform = animations.current.get(row)?.playState === 'running' ? getComputedStyle(row).transform : 'none'
      const offset = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0
      return event.clientY >= rect.top - offset && event.clientY < rect.bottom - offset
    })
    if (target) {
      const stage = sequence.find(s => String(s.id) === target.dataset.stageId)
      if (stage) move(current.id, stage.id)
    }
  }
  const finishDrag = (event: PointerEvent<HTMLTableSectionElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null; setDraggingId(null)
  }
  const save = async () => {
    if (pending.current || isLoading || !dirty || drag.current) return
    pending.current = true; setSaving(true); onError('')
    // Visual numbering is independent: permute only the open stages' existing active slots.
    const slots = initialOpen.map(s => Number(s.orden))
    const positions = new Map(sequence.map((s, index) => [s.id, slots[index]]))
    try {
      const data = await reorderStages(Number(funnel.id), { etapas: stages.filter(s => s.activo).map(s => ({ id: Number(s.id), orden: positions.get(s.id) ?? Number(s.orden) })) })
      client.setQueryData(['etapas', funnel.id], stages.map(s => data.find(updated => updated.id === s.id) ?? s))
      onSaved()
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'No pudimos guardar el orden.')
      await client.invalidateQueries({ queryKey: ['etapas', funnel.id] }); setSequence(initialOpen)
    } finally { pending.current = false; setSaving(false) }
  }
  return <>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); void save() }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box className="company-table-panel">
        <Stack className="funnel-stage-panel-heading" direction={{ xs: 'column', md: 'row' }} sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><FiberManualRecord sx={{ fontSize: 12, color: 'primary.light' }} /><Typography component="h3" variant="subtitle1">Etapas abiertas</Typography></Stack>
          <Typography id="stage-drag-help" variant="body2" color="text.secondary">Arrastrá desde el asa o usá las flechas ↑ y ↓. Las inactivas se reactivan al final.</Typography>
        </Stack>
        <Box role="status" aria-live="polite" sx={visuallyHidden}>{announcement}</Box>
        <TableContainer className="data-table-wrap"><Table aria-label="Etapas abiertas" size="small">
          <TableHead><TableRow><TableCell sx={{ width: 110 }}>Orden</TableCell><TableCell>Etapa</TableCell><TableCell>Estado</TableCell><TableCell>Disponibilidad</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
          <TableBody ref={rows} onPointerMove={movePointer} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}>
            {[...sequence, ...inactive].map((s, index) => <TableRow key={s.id} data-stage-id={s.activo ? String(s.id) : undefined} className={draggingId === s.id ? 'funnel-stage-row-dragging' : undefined}>
              <TableCell><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <IconButton type="button" size="small" data-stage-handle-id={String(s.id)} aria-label={`Mover ${s.nombre}`} aria-describedby="stage-drag-help" disabled={disabled || !s.activo} onPointerDown={event => startDrag(event, s)} onKeyDown={event => {
                  if (event.key === 'Escape') { cancelDrag(); return }
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                  event.preventDefault()
                  if (drag.current || pending.current || isLoading) return
                  const target = sequence[index + (event.key === 'ArrowUp' ? -1 : 1)]
                  if (target) move(s.id, target.id)
                }} sx={{ touchAction: 'none', cursor: draggingId === s.id ? 'grabbing' : 'grab' }}><DragIndicator fontSize="small" /></IconButton>
                <Box component="span" aria-label={`Posición visual de ${s.nombre}`} sx={{ px: .75, border: '1px solid', borderColor: 'divider', borderRadius: .5, color: s.activo ? 'primary.light' : 'text.secondary', bgcolor: 'action.selected', fontWeight: 700 }}>{index + 1}</Box>
              </Stack></TableCell>
              <TableCell className="company-name-cell">{s.nombre}</TableCell><TableCell>Abierta</TableCell><TableCell><Chip size="small" label={s.activo ? 'Activa' : 'Inactiva'} className={s.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
              <TableCell align="right" className="funnel-stage-actions">
                <IconButton disabled={disabled || draggingId !== null} aria-label={`Editar ${s.nombre}`} title="Editar" onClick={() => onEdit(s)}><EditOutlined fontSize="small" /></IconButton>
                <IconButton disabled={disabled || draggingId !== null} aria-label={`${s.activo ? 'Desactivar' : 'Reactivar'} ${s.nombre}`} title={s.activo ? 'Desactivar' : 'Reactivar'} color={s.activo ? 'error' : 'success'} onClick={() => onActive(s)}>{s.activo ? <Close fontSize="small" /> : <Check fontSize="small" />}</IconButton>
              </TableCell>
            </TableRow>)}
            {!sequence.length && !inactive.length && <TableRow><TableCell colSpan={5}>No hay etapas abiertas. Agregá una etapa según el proceso comercial.</TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
      </Box>
      <Button type="submit" variant="outlined" startIcon={<Check />} disabled={disabled || !dirty || draggingId !== null} sx={{ mt: 2, mb: 3 }}>{saving ? 'Guardando…' : 'Guardar orden'}</Button>
    </Box>
    <Box className="company-table-panel">
      <Stack className="funnel-stage-panel-heading" direction="row" spacing={1} sx={{ p: 2, alignItems: 'center' }}><LockOutlined color="warning" fontSize="small" /><Typography component="h3" variant="subtitle1">Etapas finales del sistema</Typography></Stack>
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>Ganada y Perdida son etapas del sistema. Se muestran en orden fijo y solo permiten editar nombre y descripción.</Typography>
      <TableContainer className="data-table-wrap"><Table aria-label="Etapas finales del sistema" size="small">
        <TableHead><TableRow><TableCell>Etapa</TableCell><TableCell>Estado</TableCell><TableCell>Disponibilidad</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
        <TableBody>{finals.map(s => <TableRow key={s.id}>
          <TableCell className="company-name-cell">{s.nombre}<Chip size="small" variant="outlined" color="warning" icon={<LockOutlined />} label="Sistema" sx={{ ml: 1 }} /></TableCell><TableCell>{s.estado === 'GANADA' ? 'Ganada' : 'Perdida'}</TableCell><TableCell><Chip size="small" label={s.activo ? 'Activa' : 'Inactiva'} className={s.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
          <TableCell align="right" className="funnel-stage-actions"><IconButton disabled={disabled || draggingId !== null} aria-label={`Editar ${s.nombre}`} title="Editar" onClick={() => onEdit(s)}><EditOutlined fontSize="small" /></IconButton></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Box>
  </>
}
