import { ChevronRight, ExpandMore, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, MenuItem, Snackbar, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getFunnel, listFunnels, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { displayValue, formatCommercialDate } from '../shared/display'
import { MoveStageDialog } from '../opportunities/MoveStageDialog'
import { money, stageToneClass, stateLabels } from '../opportunities/opportunityData'
import './funnel.css'

function countLabel(count: number) {
  if (count === 0) return 'Sin oportunidades'
  return `${count} ${count === 1 ? 'oportunidad' : 'oportunidades'}`
}

function FunnelSkeleton() {
  return <div className="funnel-skeleton" role="status" aria-label="Cargando embudo">
    {[0, 1, 2, 3].map((column) => <div className="funnel-skeleton-column" key={column}><span /><span /><span /><span /></div>)}
  </div>
}

function OpportunityCard({ opportunity, onChangeStage }: { opportunity: Oportunidad; onChangeStage: (opportunity: Oportunidad) => void }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `opportunity-details-${opportunity.id}`
  return <article className={`funnel-opportunity${expanded ? ' is-expanded' : ''}`}>
    <div className="funnel-opportunity-summary">
      <div className="funnel-opportunity-main">
        <h3><RouterLink to={`/oportunidades/${opportunity.id}`}>{opportunity.tituloVisible}</RouterLink></h3>
        <dl className="funnel-card-fields funnel-card-fields--compact">
          <div><dt>Empresa</dt><dd>{opportunity.idEmpresa ? <RouterLink className="funnel-related-link" to={`/empresas/${opportunity.idEmpresa}`}>{displayValue(opportunity.empresaRazonSocial)}</RouterLink> : '-'}</dd></div>
          <div><dt>Contacto</dt><dd>{opportunity.idContacto ? <RouterLink className="funnel-related-link" to={`/contactos/${opportunity.idContacto}`}>{displayValue(opportunity.contactoNombre)}</RouterLink> : '-'}</dd></div>
        </dl>
      </div>
      <IconButton className="funnel-expand-button" aria-label={`${expanded ? 'Contraer' : 'Expandir'} oportunidad ${opportunity.tituloVisible}`} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((current) => !current)} size="small">
        {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
      </IconButton>
    </div>
    <div id={detailsId} className="funnel-opportunity-details" hidden={!expanded}>
      <dl className="funnel-card-fields funnel-card-fields--details">
        <div><dt>Valor</dt><dd>{money(opportunity.valor)}</dd></div>
        <div><dt>Cierre estimado</dt><dd>{formatCommercialDate(opportunity.fechaEstimadaCierre)}</dd></div>
        <div><dt>Responsable</dt><dd>{opportunity.responsableNombre}{opportunity.responsableActivo ? '' : ' (inactivo)'}</dd></div>
      </dl>
      {opportunity.accionesPermitidas.mover && <Button size="small" variant="outlined" onClick={() => onChangeStage(opportunity)}>Cambiar etapa</Button>}
    </div>
  </article>
}

/** Funnel por embudo: el servidor decide la cartera (la propia para un vendedor, todas para los superiores). */
export function FunnelPage() {
  const { user } = useAuth()
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const [selected, setSelected] = useState('')
  const [responsible, setResponsible] = useState('')
  const [moving, setMoving] = useState<Oportunidad | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [collapsedStages, setCollapsedStages] = useState<Set<number | string>>(() => new Set())
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const options = funnels.data?.items ?? []
  const funnelId = selected || String((options.find((item) => item.activo) ?? options[0])?.id ?? '')
  const owner = isSuperior && responsible ? Number(responsible) : undefined
  const funnel = useQuery({
    queryKey: opportunityQueryKeys.funnel(Number(funnelId), owner), queryFn: () => getFunnel(Number(funnelId), owner), enabled: funnelId !== '',
  })
  const stages = funnel.data?.etapas ?? []
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
        {stages.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay etapas para mostrar</Typography><Typography color="text.secondary">Cuando el embudo tenga etapas activas, van a aparecer acá.</Typography></section> : <div className="funnel-board-scroll" role="region" aria-label="Etapas del embudo comercial" tabIndex={0}><div className="funnel-board" style={{ gridTemplateColumns: stages.map((stage) => collapsedStages.has(stage.id) ? 'minmax(160px, .58fr)' : 'minmax(270px, 1fr)').join(' ') }}>
          {stages.map((stage, stageIndex) => {
            const collapsed = collapsedStages.has(stage.id)
            const stageContentId = `stage-content-${stage.id}`
            return <section className={`funnel-stage ${stageToneClass(stageIndex)}${collapsed ? ' is-collapsed' : ''}`} key={stage.id} aria-labelledby={`stage-${stage.id}`}>
              <header className="funnel-stage-heading">
                <div className="funnel-stage-copy"><h2 id={`stage-${stage.id}`}>{stage.nombre}</h2><p className="funnel-stage-count">{countLabel(stage.oportunidades.length)}{stage.estado === 'ABIERTA' ? '' : ` · ${stateLabels[stage.estado] ?? stage.estado}`}</p></div>
                <IconButton className="funnel-stage-collapse" type="button" size="small" aria-expanded={!collapsed} aria-controls={stageContentId} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} etapa ${stage.nombre}`} onClick={() => setCollapsedStages((current) => {
                  const next = new Set(current)
                  if (next.has(stage.id)) next.delete(stage.id)
                  else next.add(stage.id)
                  return next
                })}>
                  {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </header>
              <div id={stageContentId} className="funnel-stage-content" hidden={collapsed}>
                {stage.oportunidades.length === 0 ? <p className="funnel-stage-empty">Sin oportunidades</p> : <div className="funnel-stage-opportunities">{stage.oportunidades.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} onChangeStage={setMoving} />)}</div>}
              </div>
            </section>
          })}
        </div></div>}
      </>}
    </>}
    {moving && <MoveStageDialog item={moving} open onClose={() => setMoving(null)} onDone={() => { setMoving(null); setConfirmed(true) }} />}
    <Snackbar open={confirmed} autoHideDuration={4000} onClose={() => setConfirmed(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => setConfirmed(false)} severity="success" variant="filled">Etapa actualizada</Alert></Snackbar>
  </Box>
}
