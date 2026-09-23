import { ChevronRight, ExpandMore, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { catalogQueryKeys, getCommercialStages, getOpportunitiesByStage, opportunityQueryKeys, updateOpportunityStage, type EtapaConOportunidades, type OportunidadResumen } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { displayValue, formatCommercialDate, opportunityContactName } from '../shared/display'
import { orderStagesByPosition, stageToneClass } from '../opportunities/opportunityData'
import './funnel.css'

function opportunityCustomer(opportunity: OportunidadResumen) {
  return opportunity.idEmpresa ? displayValue(opportunity.empresaRazonSocial) : '-'
}

function opportunityResponsible(opportunity: OportunidadResumen) {
  return displayValue([opportunity.usuarioNombre?.trim(), opportunity.usuarioApellido?.trim()].filter(Boolean).join(' '))
}

function countLabel(count: number) {
  if (count === 0) return 'Sin oportunidades'
  return `${count} ${count === 1 ? 'oportunidad' : 'oportunidades'}`
}

function FunnelSkeleton() {
  return <div className="funnel-skeleton" role="status" aria-label="Cargando embudo">
    {[0, 1, 2, 3].map((column) => <div className="funnel-skeleton-column" key={column}><span /><span /><span /><span /></div>)}
  </div>
}

function OpportunityCard({ opportunity, disabled, disabledReason, onChangeStage }: {
  opportunity: OportunidadResumen
  disabled: boolean
  disabledReason: string
  onChangeStage: (opportunity: OportunidadResumen) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `opportunity-details-${opportunity.id}`
  const contactName = opportunityContactName(opportunity)

  return <article className={`funnel-opportunity${expanded ? ' is-expanded' : ''}`}>
    <div className="funnel-opportunity-summary">
      <div className="funnel-opportunity-main">
        <h3><RouterLink to={`/oportunidades/${opportunity.id}`}>{displayValue(opportunity.titulo)}</RouterLink></h3>
        <dl className="funnel-card-fields funnel-card-fields--compact">
          <div><dt>Empresa</dt><dd>{opportunity.idEmpresa ? <RouterLink className="funnel-related-link" to={`/empresas/${opportunity.idEmpresa}`}>{opportunityCustomer(opportunity)}</RouterLink> : '-'}</dd></div>
          <div><dt>Contacto</dt><dd>{opportunity.idContacto ? <RouterLink className="funnel-related-link" to={`/contactos/${opportunity.idContacto}`}>{contactName}</RouterLink> : '-'}</dd></div>
        </dl>
      </div>
      <IconButton className="funnel-expand-button" aria-label={`${expanded ? 'Contraer' : 'Expandir'} oportunidad ${displayValue(opportunity.titulo)}`} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((current) => !current)} size="small">
        {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
      </IconButton>
    </div>
    <div id={detailsId} className="funnel-opportunity-details" hidden={!expanded}>
      <dl className="funnel-card-fields funnel-card-fields--details">
        <div><dt>Cierre estimado</dt><dd>{formatCommercialDate(opportunity.fechaEstimadaCierre)}</dd></div>
        <div><dt>Responsable</dt><dd>{opportunityResponsible(opportunity)}</dd></div>
      </dl>
      <Button size="small" variant="outlined" disabled={disabled} title={disabled ? disabledReason : undefined} onClick={() => onChangeStage(opportunity)}>Cambiar etapa</Button>
    </div>
  </article>
}

export function FunnelPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const pipelineQuery = useQuery({ queryKey: opportunityQueryKeys.pipeline, queryFn: getOpportunitiesByStage })
  const stagesQuery = useQuery({ queryKey: catalogQueryKeys.commercialStages, queryFn: getCommercialStages })
  const [selectedOpportunity, setSelectedOpportunity] = useState<OportunidadResumen | null>(null)
  const [newStageId, setNewStageId] = useState('')
  const [observation, setObservation] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [collapsedStages, setCollapsedStages] = useState<Set<number | string>>(() => new Set())

  const mutation = useMutation({
    mutationFn: (input: { idOportunidad: number; idNuevaEtapa: number | string; observacion?: string }) => updateOpportunityStage(input.idOportunidad, {
      idNuevaEtapa: input.idNuevaEtapa,
      idUsuario: user!.id,
      ...(input.observacion ? { observacion: input.observacion } : {}),
    }),
    onSuccess: async (updated, input) => {
      queryClient.setQueryData(opportunityQueryKeys.detail(input.idOportunidad), updated)
      await queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipeline })
      setSelectedOpportunity(null)
      setNewStageId('')
      setObservation('')
      setConfirmed(true)
    },
  })

  const groupedStages = pipelineQuery.data ?? []
  const catalogStages = stagesQuery.data ?? []
  const stages: EtapaConOportunidades[] = groupedStages.length > 0
    ? orderStagesByPosition(groupedStages)
    : catalogStages.map((stage) => ({ idEtapa: stage.id, nombre: stage.nombre, orden: stage.orden, oportunidades: [] }))
  const totalOpportunities = groupedStages.reduce((total, stage) => total + stage.oportunidades.length, 0)
  const alternatives = selectedOpportunity ? catalogStages.filter((stage) => String(stage.id) !== String(selectedOpportunity.idEtapa)) : []
  const selectedStage = alternatives.find((stage) => String(stage.id) === newStageId)
  const catalogUnavailable = stagesQuery.isError || catalogStages.length === 0
  const actionDisabledReason = stagesQuery.isError ? 'No pudimos cargar las etapas comerciales.' : stagesQuery.isPending ? 'Cargando las etapas comerciales.' : catalogStages.length === 0 ? 'No hay etapas comerciales disponibles.' : ''

  const openDialog = (opportunity: OportunidadResumen) => {
    mutation.reset()
    setSelectedOpportunity(opportunity)
    setNewStageId('')
    setObservation('')
  }

  const closeDialog = () => {
    setSelectedOpportunity(null)
    setNewStageId('')
    setObservation('')
    mutation.reset()
  }

  const saveStageChange = () => {
    if (mutation.isPending || !selectedOpportunity || !selectedStage || user?.id === undefined) return
    mutation.mutate({
      idOportunidad: Number(selectedOpportunity.id),
      idNuevaEtapa: selectedStage.id,
      ...(observation.trim() ? { observacion: observation.trim() } : {}),
    })
  }

  return <Box className="companies-page funnel-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Embudo comercial</Typography><Typography className="companies-page-description">Oportunidades organizadas por etapa.</Typography></div></header>
    {pipelineQuery.isPending ? <FunnelSkeleton /> : pipelineQuery.isError ? <section className="company-feedback" aria-labelledby="funnel-error-title"><Typography component="h2" id="funnel-error-title" className="company-feedback-title">No pudimos cargar el embudo</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void pipelineQuery.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : <>
      {stagesQuery.isError && <Alert className="funnel-catalog-message" severity="warning" action={<Button color="inherit" size="small" onClick={() => void stagesQuery.refetch()}>Reintentar</Button>}>No pudimos cargar las etapas comerciales. El embudo está disponible, pero no se pueden cambiar etapas por ahora.</Alert>}
      {!stagesQuery.isError && !stagesQuery.isPending && catalogStages.length === 0 && <Alert className="funnel-catalog-message" severity="info">No hay etapas comerciales disponibles. El embudo está disponible, pero no se pueden cambiar etapas.</Alert>}
      {totalOpportunities === 0 && <p className="funnel-empty-summary">No hay oportunidades en el embudo.</p>}
      {stages.length === 0 ? <section className="company-feedback"><Typography component="h2" className="company-feedback-title">No hay etapas para mostrar</Typography><Typography color="text.secondary">Cuando haya etapas comerciales, van a aparecer en este embudo.</Typography></section> : <div className="funnel-board-scroll" role="region" aria-label="Etapas del embudo comercial" tabIndex={0}><div className="funnel-board" style={{ gridTemplateColumns: stages.map((stage) => collapsedStages.has(stage.idEtapa) ? 'minmax(160px, .58fr)' : 'minmax(270px, 1fr)').join(' ') }}>
        {stages.map((stage, stageIndex) => {
          const collapsed = collapsedStages.has(stage.idEtapa)
          const stageContentId = `stage-content-${stage.idEtapa}`
          return <section className={`funnel-stage ${stageToneClass(stageIndex)}${collapsed ? ' is-collapsed' : ''}`} key={stage.idEtapa} aria-labelledby={`stage-${stage.idEtapa}`}>
            <header className="funnel-stage-heading">
              <div className="funnel-stage-copy"><h2 id={`stage-${stage.idEtapa}`}>{displayValue(stage.nombre)}</h2><p className="funnel-stage-count">{countLabel(stage.oportunidades.length)}</p></div>
              <IconButton className="funnel-stage-collapse" type="button" size="small" aria-expanded={!collapsed} aria-controls={stageContentId} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} etapa ${stage.nombre}`} onClick={() => setCollapsedStages((current) => {
                const next = new Set(current)
                if (next.has(stage.idEtapa)) next.delete(stage.idEtapa)
                else next.add(stage.idEtapa)
                return next
              })}>
                {collapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </header>
            <div id={stageContentId} className="funnel-stage-content" hidden={collapsed}>
              {stage.oportunidades.length === 0 ? <p className="funnel-stage-empty">Sin oportunidades</p> : <div className="funnel-stage-opportunities">{stage.oportunidades.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={{ ...opportunity, idEtapa: stage.idEtapa, etapaNombre: stage.nombre, etapaOrden: stage.orden }} disabled={catalogUnavailable || stagesQuery.isPending || mutation.isPending} disabledReason={actionDisabledReason} onChangeStage={openDialog} />)}</div>}
            </div>
          </section>
        })}
      </div></div>}
    </>}

    <Dialog open={selectedOpportunity !== null} onClose={closeDialog} fullWidth maxWidth="sm" aria-labelledby="change-stage-title">
      <DialogTitle id="change-stage-title">Cambiar etapa</DialogTitle>
      <DialogContent className="funnel-dialog-content">
        {selectedOpportunity && <Typography className="funnel-selected-title">{selectedOpportunity.titulo}</Typography>}
        <FormControl fullWidth required disabled={stagesQuery.isPending || stagesQuery.isError || alternatives.length === 0}>
          <InputLabel id="new-stage-label">Nueva etapa</InputLabel>
          <Select labelId="new-stage-label" label="Nueva etapa" value={newStageId} onChange={(event) => setNewStageId(event.target.value)}>
            {alternatives.map((stage) => <MenuItem value={String(stage.id)} key={stage.id}>{stage.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        {alternatives.length === 0 && !stagesQuery.isPending && !stagesQuery.isError && <Typography className="funnel-no-alternatives">No hay otras etapas disponibles para esta oportunidad.</Typography>}
        <TextField label="Observación" value={observation} onChange={(event) => setObservation(event.target.value)} multiline minRows={3} fullWidth />
        {mutation.isError && <Alert severity="error" role="alert">{mutation.error.message}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={closeDialog} disabled={mutation.isPending}>Cancelar</Button><Button onClick={saveStageChange} variant="contained" disabled={mutation.isPending || !selectedStage || stagesQuery.isError || !user}>{mutation.isPending ? 'Guardando…' : 'Guardar cambio'}</Button></DialogActions>
    </Dialog>
    <Snackbar open={confirmed} autoHideDuration={4000} onClose={() => setConfirmed(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert onClose={() => setConfirmed(false)} severity="success" variant="filled">Etapa actualizada</Alert></Snackbar>
  </Box>
}
