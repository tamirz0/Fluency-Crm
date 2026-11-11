import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core'
import { Add, Check, ChevronRight, Close, ExpandMore, PersonOutlined, Refresh, Search } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, MenuItem, Snackbar, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { getFunnel, listFunnels, moveOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { saveErrorMessage } from '../shared/formUtils'
import { CloseOpportunityDialog, type CloseResult } from '../opportunities/CloseOpportunityDialog'
import { money, stageToneClass } from '../opportunities/opportunityData'
import './funnel.css'

type Stage = { id: number | string; nombre: string }
const totals = (items: Oportunidad[]) => items.reduce((sum, item) => sum + Number(item.valor), 0)
const collisionDetection: CollisionDetection = args => {
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)
  const closeTarget = collisions.find(({ id }) => id === 'GANADA' || id === 'PERDIDA')
  return closeTarget ? [closeTarget] : collisions
}

function FunnelSkeleton() {
  return <div className="funnel-skeleton" role="status" aria-label="Cargando embudo">
    {[0, 1, 2, 3].map((column) => <div className="funnel-skeleton-column" key={column}><span /><span /><span /><span /></div>)}
  </div>
}

/** La tarjeta entera abre la ficha; empresa y contacto son texto para no llevar a otro perfil por error. */
const detailState = { from: { to: '/embudo', label: 'Volver al embudo' } }

function CardContent({ opportunity, overlay = false }: { opportunity: Oportunidad; overlay?: boolean }) {
  const client = [opportunity.empresaRazonSocial, opportunity.contactoNombre].filter(Boolean).join(' · ')
  return <>
    <div className="funnel-opportunity-heading">
      <h3>{overlay ? opportunity.tituloVisible : <RouterLink to={`/oportunidades/${opportunity.id}`} state={detailState}>{opportunity.tituloVisible}</RouterLink>}</h3>
      <span className="funnel-opportunity-value">{money(opportunity.valor)}</span>
    </div>
    {client && <p className="funnel-opportunity-client">{client}</p>}
    <div className="funnel-opportunity-meta">
      <span><PersonOutlined aria-hidden="true" />{opportunity.responsableNombre}</span>
      {opportunity.origenDescripcion && <span>{opportunity.origenDescripcion}</span>}
    </div>
  </>
}

function OpportunityCard({ opportunity }: { opportunity: Oportunidad }) {
  const draggable = opportunity.accionesPermitidas.mover || opportunity.accionesPermitidas.cerrar
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `opportunity-${opportunity.id}`, data: { opportunity }, disabled: !draggable, attributes: { roleDescription: 'oportunidad arrastrable' },
  })
  const navigate = useNavigate()
  /** Un clic en cualquier parte de la tarjeta abre la ficha; arrastrar no dispara el clic y el título sigue siendo un enlace normal. */
  const open = (event: React.MouseEvent) => { if (!(event.target as HTMLElement).closest('a')) navigate(`/oportunidades/${opportunity.id}`, { state: detailState }) }
  return <article ref={(node) => { setNodeRef(node); setActivatorNodeRef(node) }} onClick={open} className={`funnel-opportunity${draggable ? ' is-draggable' : ''}${isDragging ? ' is-dragging' : ''}`} {...(draggable ? { ...attributes, ...listeners } : {})}>
    <CardContent opportunity={opportunity} />
  </article>
}

function StageColumn({ stage, index, collapsed, onToggle, children, items, canDrop }: { stage: Stage; index: number; collapsed: boolean; onToggle: () => void; children: React.ReactNode; items: Oportunidad[]; canDrop: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, data: { stage }, disabled: !canDrop })
  const stageContentId = `stage-content-${stage.id}`
  return <section ref={setNodeRef} className={`funnel-stage ${stageToneClass(index)}${collapsed ? ' is-collapsed' : ''}${isOver ? ' is-over' : ''}`} aria-labelledby={`stage-${stage.id}`}>
    <header className="funnel-stage-heading">
      <div className="funnel-stage-copy">
        <h2 id={`stage-${stage.id}`}>{stage.nombre}</h2>
        <span className="funnel-stage-count" aria-label={`${items.length} oportunidades`}>{items.length}</span>
      </div>
      <IconButton className="funnel-stage-collapse" type="button" size="small" aria-expanded={!collapsed} aria-controls={stageContentId} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} etapa ${stage.nombre}`} onClick={onToggle}>
        {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
      </IconButton>
    </header>
    {!collapsed && items.length > 0 && <p className="funnel-stage-total">{money(totals(items))}</p>}
    <div id={stageContentId} className="funnel-stage-content" hidden={collapsed}>{children}</div>
  </section>
}

function CloseDropZone({ result }: { result: CloseResult }) {
  const won = result === 'GANADA'
  const label = won ? 'Marcar como ganada' : 'Marcar como perdida'
  const { setNodeRef, isOver } = useDroppable({ id: result, data: { result, label } })
  return <div ref={setNodeRef} className={`funnel-close-target ${won ? 'is-won' : 'is-lost'}${isOver ? ' is-over' : ''}`}>
    <span className="funnel-close-icon">{won ? <Check /> : <Close />}</span>
    <span><strong>{label}</strong><small>Soltá la oportunidad acá</small></span>
  </div>
}

const titleOf = (data: unknown) => (data as { opportunity?: Oportunidad } | undefined)?.opportunity?.tituloVisible ?? 'La oportunidad'
const destinationOf = (value: unknown) => {
  const data = value as { stage?: Stage; label?: string } | undefined
  return data?.label ?? data?.stage?.nombre ?? ''
}
const announcements = {
  onDragStart: ({ active }: { active: { data: { current?: unknown } } }) => `${titleOf(active.data.current)}: tomada. Elegí el destino con las flechas.`,
  onDragOver: ({ active, over }: { active: { data: { current?: unknown } }; over: { data: { current?: Parameters<typeof destinationOf>[0] } } | null }) => over ? `${titleOf(active.data.current)} sobre ${destinationOf(over.data.current)}.` : `${titleOf(active.data.current)} fuera de un destino.`,
  onDragEnd: ({ active, over }: { active: { data: { current?: unknown } }; over: { data: { current?: Parameters<typeof destinationOf>[0] } } | null }) => over ? `${titleOf(active.data.current)} soltada en ${destinationOf(over.data.current)}.` : `${titleOf(active.data.current)} no se movió.`,
  onDragCancel: ({ active }: { active: { data: { current?: unknown } } }) => `Movimiento de ${titleOf(active.data.current)} cancelado.`,
}

/** Funnel por embudo: el servidor decide la cartera (la propia para un vendedor, todas para los superiores). */
export function FunnelPage() {
  const { user } = useAuth()
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const [params, setParams] = useSearchParams()
  const selected = params.get('idEmbudo')
  const [responsible, setResponsible] = useState('')
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState('')
  const [dragging, setDragging] = useState<Oportunidad | null>(null)
  const queryClient = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [closing, setClosing] = useState<{ item: Oportunidad; result: CloseResult } | null>(null)
  const [collapsedStages, setCollapsedStages] = useState<Set<number | string>>(() => new Set())
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const options = funnels.data?.items ?? []
  const funnelId = String((options.find(item => String(item.id) === selected) ?? options.find(item => item.activo) ?? options[0])?.id ?? '')
  const owner = isSuperior && responsible ? Number(responsible) : undefined
  const funnel = useQuery({
    queryKey: opportunityQueryKeys.funnel(Number(funnelId), owner), queryFn: () => getFunnel(Number(funnelId), owner), enabled: funnelId !== '',
  })
  const openStages = (funnel.data?.etapas ?? []).filter(stage => stage.estado === 'ABIERTA')
  const allItems = openStages.flatMap(stage => stage.oportunidades)
  const origins = [...new Set(allItems.flatMap(item => item.origenDescripcion ? [item.origenDescripcion] : []))].sort((a, b) => a.localeCompare(b, 'es'))
  const currentOrigin = origins.includes(origin) ? origin : ''
  const term = search.trim().toLocaleLowerCase('es')
  const stages = openStages.map(stage => ({
    ...stage,
    oportunidades: stage.oportunidades.filter(item =>
      (!currentOrigin || item.origenDescripcion === currentOrigin) &&
      [item.tituloVisible, item.empresaRazonSocial, item.contactoNombre].some(value => value?.toLocaleLowerCase('es').includes(term)),
    ),
  }))
  const visibleItems = stages.flatMap(stage => stage.oportunidades)
  const canCreate = Boolean(user?.permisos?.includes('GestionarOportunidad'))
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(KeyboardSensor))
  const move = useMutation({
    mutationFn: ({ item, stage }: { item: Oportunidad; stage: Stage }) => moveOpportunity(Number(item.id), Number(stage.id)),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['oportunidades'] }); setConfirmed(true) },
  })
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const item = active.data.current?.opportunity as Oportunidad | undefined
    const target = over?.data.current as { stage?: Stage; result?: CloseResult } | undefined
    if (!item || !target) return
    if (target.result && item.accionesPermitidas.cerrar) setClosing({ item, result: target.result })
    if (target.stage && item.accionesPermitidas.mover && Number(target.stage.id) !== Number(item.idEtapa)) move.mutate({ item, stage: target.stage })
  }

  return <Box className="companies-page funnel-page">
    <header className="companies-page-header">
      <div className="funnel-heading">
        <Typography component="h1" className="companies-page-title">Embudo comercial</Typography>
        {funnel.isSuccess && <p className="funnel-summary">{visibleItems.length} {visibleItems.length === 1 ? 'oportunidad abierta' : 'oportunidades abiertas'} <span>·</span> {money(totals(visibleItems))}</p>}
      </div>
      {canCreate && <Button className="funnel-primary" component={RouterLink} to="/oportunidades/nueva" startIcon={<Add />} variant="contained">Nueva oportunidad</Button>}
    </header>
    {funnels.isPending ? <FunnelSkeleton /> : funnels.isError ? <section className="company-feedback" aria-labelledby="funnel-error-title"><Typography component="h2" id="funnel-error-title" className="company-feedback-title">No pudimos cargar los embudos</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void funnels.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : options.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay embudos configurados</Typography><Typography color="text.secondary">Cuando se configure un embudo, sus oportunidades van a aparecer acá.</Typography></section> : <>
      <div className="funnel-filters">
        <TextField className="funnel-search" size="small" label="Buscar oportunidad, empresa o contacto" type="search" value={search} onChange={event => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <Search fontSize="small" /> } }} />
        <TextField select size="small" label="Embudo" value={funnelId} onChange={(event) => { setParams({ idEmbudo: event.target.value }, { replace: true }); setCollapsedStages(new Set()); setOrigin('') }}>
          {options.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}{item.activo ? '' : ' (inactivo)'}</MenuItem>)}
        </TextField>
        {isSuperior && <CompanyResponsibleSelect size="small" value={responsible} onChange={value => { setResponsible(value); setOrigin('') }} />}
        {origins.length > 0 && <TextField select size="small" label="Origen" value={currentOrigin} onChange={event => setOrigin(event.target.value)}>
          <MenuItem value="">Cualquiera</MenuItem>
          {origins.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>}
        <Button size="small" startIcon={<Refresh />} disabled={!search && !responsible && !currentOrigin} onClick={() => { setSearch(''); setResponsible(''); setOrigin('') }}>Restablecer filtros</Button>
      </div>
      {funnel.isPending ? <FunnelSkeleton /> : funnel.isError ? <section className="company-feedback" aria-labelledby="funnel-load-error-title"><Typography component="h2" id="funnel-load-error-title" className="company-feedback-title">No pudimos cargar el embudo</Typography><Typography color="text.secondary">{funnel.error.message}</Typography><Button onClick={() => void funnel.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : <>
        {!funnel.data.activo && <Alert className="funnel-catalog-message" severity="info">Este embudo está inactivo: se puede consultar, pero no admite oportunidades nuevas.</Alert>}
        {visibleItems.length === 0 && stages.length > 0 && <p className="funnel-empty-summary">{allItems.length > 0 ? 'No hay oportunidades para estos filtros.' : 'No hay oportunidades abiertas para esta selección.'}</p>}
        {stages.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay etapas para mostrar</Typography><Typography color="text.secondary">Cuando el embudo tenga etapas abiertas, van a aparecer acá.</Typography></section> : <DndContext sensors={sensors} collisionDetection={collisionDetection} accessibility={{ announcements, screenReaderInstructions: { draggable: 'Presioná espacio para tomar la oportunidad, usá las flechas para moverla y presioná espacio para soltarla. Escape cancela.' } }} onDragStart={({ active }) => setDragging(active.data.current?.opportunity ?? null)} onDragCancel={() => setDragging(null)} onDragEnd={onDragEnd}><div className="funnel-board-scroll" role="region" aria-label="Etapas del embudo comercial" tabIndex={0}><div className="funnel-board" style={{ gridTemplateColumns: stages.map((stage) => collapsedStages.has(stage.id) ? 'minmax(145px, .5fr)' : 'minmax(235px, 1fr)').join(' ') }}>
          {stages.map((stage, stageIndex) => <StageColumn key={stage.id} stage={stage} index={stageIndex} items={stage.oportunidades} canDrop={dragging?.accionesPermitidas.mover ?? true} collapsed={collapsedStages.has(stage.id)} onToggle={() => setCollapsedStages((current) => {
            const next = new Set(current)
            if (next.has(stage.id)) next.delete(stage.id)
            else next.add(stage.id)
            return next
          })}>
            {stage.oportunidades.length === 0 ? <p className="funnel-stage-empty">Sin oportunidades</p> : <div className="funnel-stage-opportunities">{stage.oportunidades.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div>}
          </StageColumn>)}
        </div></div>
        {dragging?.accionesPermitidas.cerrar && <div className="funnel-close-dock"><CloseDropZone result="GANADA" /><CloseDropZone result="PERDIDA" /></div>}
        <DragOverlay dropAnimation={null}>{dragging && <article className="funnel-opportunity is-overlay" aria-hidden="true"><CardContent opportunity={dragging} overlay /></article>}</DragOverlay></DndContext>}
      </>}
    </>}
    {closing && <CloseOpportunityDialog item={closing.item} initialResult={closing.result} open onClose={() => setClosing(null)} onDone={() => { setClosing(null); setConfirmed(true) }} />}
    <Snackbar open={confirmed} autoHideDuration={4000} onClose={() => setConfirmed(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => setConfirmed(false)} severity="success" variant="filled">Etapa actualizada</Alert></Snackbar>
    <Snackbar open={move.isError} autoHideDuration={6000} onClose={() => move.reset()} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => move.reset()} severity="error" variant="filled">{saveErrorMessage(move.error)}</Alert></Snackbar>
  </Box>
}
