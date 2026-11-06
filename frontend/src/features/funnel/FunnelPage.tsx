import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ChevronRight, ExpandMore, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, MenuItem, Snackbar, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getFunnel, listFunnels, moveOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { displayValue, initials } from '../shared/display'
import { saveErrorMessage } from '../shared/formUtils'
import { CloseOpportunityDialog, type CloseResult } from '../opportunities/CloseOpportunityDialog'
import { money, stageToneClass, stateLabels } from '../opportunities/opportunityData'
import './funnel.css'

type Stage = { id: number | string; nombre: string; estado: string }

function countLabel(count: number) {
  if (count === 0) return 'Sin oportunidades'
  return `${count} ${count === 1 ? 'oportunidad' : 'oportunidades'}`
}

function FunnelSkeleton() {
  return <div className="funnel-skeleton" role="status" aria-label="Cargando embudo">
    {[0, 1, 2, 3].map((column) => <div className="funnel-skeleton-column" key={column}><span /><span /><span /><span /></div>)}
  </div>
}

function CardContent({ opportunity }: { opportunity: Oportunidad }) {
  return <>
    <span className="funnel-avatar" aria-hidden="true">{initials(opportunity.tituloVisible)}</span>
    <div className="funnel-opportunity-main">
      <h3><RouterLink to={`/oportunidades/${opportunity.id}`}>{opportunity.tituloVisible}</RouterLink></h3>
      {(opportunity.idEmpresa || opportunity.idContacto) && <p className="funnel-opportunity-client">
        {opportunity.idEmpresa && <RouterLink className="funnel-related-link" to={`/empresas/${opportunity.idEmpresa}`}>{displayValue(opportunity.empresaRazonSocial)}</RouterLink>}
        {opportunity.idEmpresa && opportunity.idContacto && ' – '}
        {opportunity.idContacto && <RouterLink className="funnel-related-link" to={`/contactos/${opportunity.idContacto}`}>{displayValue(opportunity.contactoNombre)}</RouterLink>}
      </p>}
      <p className="funnel-opportunity-value">{money(opportunity.valor)}</p>
    </div>
  </>
}

function OpportunityCard({ opportunity, stage }: { opportunity: Oportunidad; stage: Stage }) {
  const draggable = Boolean(opportunity.accionesPermitidas.mover) && stage.estado === 'ABIERTA'
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `opportunity-${opportunity.id}`, data: { opportunity }, disabled: !draggable, attributes: { roleDescription: 'oportunidad arrastrable' },
  })
  return <article ref={(node) => { setNodeRef(node); setActivatorNodeRef(node) }} className={`funnel-opportunity${draggable ? ' is-draggable' : ''}${isDragging ? ' is-dragging' : ''}`} {...(draggable ? { ...attributes, ...listeners } : {})}>
    <CardContent opportunity={opportunity} />
  </article>
}

function StageColumn({ stage, index, collapsed, onToggle, children, count }: { stage: Stage; index: number; collapsed: boolean; onToggle: () => void; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, data: { stage } })
  const stageContentId = `stage-content-${stage.id}`
  return <section ref={setNodeRef} className={`funnel-stage ${stageToneClass(index)}${collapsed ? ' is-collapsed' : ''}${isOver ? ' is-over' : ''}`} aria-labelledby={`stage-${stage.id}`}>
    <header className="funnel-stage-heading">
      <div className="funnel-stage-copy"><h2 id={`stage-${stage.id}`}>{stage.nombre}</h2><p className="funnel-stage-count">{countLabel(count)}{stage.estado === 'ABIERTA' ? '' : ` · ${stateLabels[stage.estado] ?? stage.estado}`}</p></div>
      <IconButton className="funnel-stage-collapse" type="button" size="small" aria-expanded={!collapsed} aria-controls={stageContentId} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} etapa ${stage.nombre}`} onClick={onToggle}>
        {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
      </IconButton>
    </header>
    <div id={stageContentId} className="funnel-stage-content" hidden={collapsed}>{children}</div>
  </section>
}

const titleOf = (data: unknown) => (data as { opportunity?: Oportunidad } | undefined)?.opportunity?.tituloVisible ?? 'La oportunidad'
const stageNameOf = (data: unknown) => (data as { stage?: Stage } | undefined)?.stage?.nombre ?? ''
const announcements = {
  onDragStart: ({ active }: { active: { data: { current?: unknown } } }) => `${titleOf(active.data.current)}: tomada. Elegí la etapa con las flechas.`,
  onDragOver: ({ active, over }: { active: { data: { current?: unknown } }; over: { data: { current?: unknown } } | null }) => over ? `${titleOf(active.data.current)} sobre la etapa ${stageNameOf(over.data.current)}.` : `${titleOf(active.data.current)} fuera de una etapa.`,
  onDragEnd: ({ active, over }: { active: { data: { current?: unknown } }; over: { data: { current?: unknown } } | null }) => over ? `${titleOf(active.data.current)} soltada en ${stageNameOf(over.data.current)}.` : `${titleOf(active.data.current)} no se movió.`,
  onDragCancel: ({ active }: { active: { data: { current?: unknown } } }) => `Movimiento de ${titleOf(active.data.current)} cancelado.`,
}

/** Funnel por embudo: el servidor decide la cartera (la propia para un vendedor, todas para los superiores). */
export function FunnelPage() {
  const { user } = useAuth()
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const [selected, setSelected] = useState('')
  const [responsible, setResponsible] = useState('')
  const [dragging, setDragging] = useState<Oportunidad | null>(null)
  const queryClient = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [closing, setClosing] = useState<{ item: Oportunidad; result: CloseResult } | null>(null)
  const [collapsedStages, setCollapsedStages] = useState<Set<number | string>>(() => new Set())
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const options = funnels.data?.items ?? []
  const funnelId = selected || String((options.find((item) => item.activo) ?? options[0])?.id ?? '')
  const owner = isSuperior && responsible ? Number(responsible) : undefined
  const funnel = useQuery({
    queryKey: opportunityQueryKeys.funnel(Number(funnelId), owner), queryFn: () => getFunnel(Number(funnelId), owner), enabled: funnelId !== '',
  })
  const stages = funnel.data?.etapas ?? []
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(KeyboardSensor))
  const move = useMutation({
    mutationFn: ({ item, stage }: { item: Oportunidad; stage: Stage }) => moveOpportunity(Number(item.id), Number(stage.id)),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['oportunidades'] }); setConfirmed(true) },
  })
  /** Soltar en una etapa abierta mueve; soltar en Ganada/Perdida abre el cierre, que pide los datos obligatorios. */
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const item = active.data.current?.opportunity as Oportunidad | undefined
    const stage = over?.data.current?.stage as Stage | undefined
    if (!item || !stage || Number(stage.id) === Number(item.idEtapa)) return
    if (stage.estado === 'ABIERTA') move.mutate({ item, stage })
    else setClosing({ item, result: stage.estado as CloseResult })
  }
  const total = stages.reduce((sum, stage) => sum + stage.oportunidades.length, 0)

  return <Box className="companies-page funnel-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Embudo comercial</Typography><Typography className="companies-page-description">{isSuperior ? 'Oportunidades de todo el equipo organizadas por etapa.' : 'Tus oportunidades organizadas por etapa. Las del resto del equipo están en el listado de oportunidades.'}</Typography></div></header>
    {funnels.isPending ? <FunnelSkeleton /> : funnels.isError ? <section className="company-feedback" aria-labelledby="funnel-error-title"><Typography component="h2" id="funnel-error-title" className="company-feedback-title">No pudimos cargar los embudos</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void funnels.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : options.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay embudos configurados</Typography><Typography color="text.secondary">Cuando se configure un embudo, sus oportunidades van a aparecer acá.</Typography></section> : <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'start' }}>
        <TextField select label="Embudo" value={funnelId} onChange={(event) => { setSelected(event.target.value); setCollapsedStages(new Set()) }} sx={{ minWidth: 240 }}>
          {options.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}{item.activo ? '' : ' (inactivo)'}</MenuItem>)}
        </TextField>
        {isSuperior && <Box sx={{ minWidth: 240, flex: '1 1 240px', maxWidth: 360 }}><CompanyResponsibleSelect value={responsible} onChange={setResponsible} helperText="Sin selección: todos los responsables" /></Box>}
      </Box>
      {funnel.isPending ? <FunnelSkeleton /> : funnel.isError ? <section className="company-feedback" aria-labelledby="funnel-load-error-title"><Typography component="h2" id="funnel-load-error-title" className="company-feedback-title">No pudimos cargar el embudo</Typography><Typography color="text.secondary">{funnel.error.message}</Typography><Button onClick={() => void funnel.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : <>
        {!funnel.data.activo && <Alert className="funnel-catalog-message" severity="info">Este embudo está inactivo: se puede consultar, pero no admite oportunidades nuevas.</Alert>}
        {total === 0 && <p className="funnel-empty-summary">No hay oportunidades en este embudo{owner || !isSuperior ? ' para tu selección' : ''}.</p>}
        {stages.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay etapas para mostrar</Typography><Typography color="text.secondary">Cuando el embudo tenga etapas activas, van a aparecer acá.</Typography></section> : <DndContext sensors={sensors} accessibility={{ announcements, screenReaderInstructions: { draggable: 'Para mover la oportunidad a otra etapa, presioná espacio, elegí la etapa con las flechas y presioná espacio otra vez para soltarla. Escape cancela.' } }} onDragStart={({ active }) => setDragging(active.data.current?.opportunity ?? null)} onDragCancel={() => setDragging(null)} onDragEnd={onDragEnd}><div className="funnel-board-scroll" role="region" aria-label="Etapas del embudo comercial" tabIndex={0}><div className="funnel-board" style={{ gridTemplateColumns: stages.map((stage) => collapsedStages.has(stage.id) ? 'minmax(160px, .58fr)' : 'minmax(270px, 1fr)').join(' ') }}>
          {stages.map((stage, stageIndex) => <StageColumn key={stage.id} stage={stage} index={stageIndex} count={stage.oportunidades.length} collapsed={collapsedStages.has(stage.id)} onToggle={() => setCollapsedStages((current) => {
            const next = new Set(current)
            if (next.has(stage.id)) next.delete(stage.id)
            else next.add(stage.id)
            return next
          })}>
            {stage.oportunidades.length === 0 ? <p className="funnel-stage-empty">Sin oportunidades</p> : <div className="funnel-stage-opportunities">{stage.oportunidades.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} stage={stage} />)}</div>}
          </StageColumn>)}
        </div></div><DragOverlay>{dragging && <article className="funnel-opportunity is-overlay"><CardContent opportunity={dragging} /></article>}</DragOverlay></DndContext>}
      </>}
    </>}
    {closing && <CloseOpportunityDialog item={closing.item} initialResult={closing.result} open onClose={() => setClosing(null)} onDone={() => { setClosing(null); setConfirmed(true) }} />}
    <Snackbar open={confirmed} autoHideDuration={4000} onClose={() => setConfirmed(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => setConfirmed(false)} severity="success" variant="filled">Etapa actualizada</Alert></Snackbar>
    <Snackbar open={move.isError} autoHideDuration={6000} onClose={() => move.reset()} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => move.reset()} severity="error" variant="filled">{saveErrorMessage(move.error)}</Alert></Snackbar>
  </Box>
}
