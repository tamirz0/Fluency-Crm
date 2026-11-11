import { ArrowBack, CheckOutlined, EventOutlined, FilterAltOutlined, InfoOutlined, RadioButtonChecked, Refresh, SchoolOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Chip, LinearProgress, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, getOpportunity, getOpportunityHistory, listStages, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { displayValue, formatCommercialDate, initials, parsePositiveId } from '../shared/display'
import { confirmationFor } from '../shared/formUtils'
import { ProfileRows, ProfileStats } from '../shared/RecordProfile'
import { clientLabel, money, opportunityStateClass, stateLabels } from './opportunityData'
import { CloseOpportunityDialog, type CloseResult } from './CloseOpportunityDialog'
import { MoveStageDialog } from './MoveStageDialog'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { ReassignDialog } from './ReassignDialog'
import { ReopenOpportunityDialog } from './ReopenOpportunityDialog'
import { OpportunityActions } from './OpportunityActions'
import '../contacts/records.css'
import '../companies/companies.css'
import '../companies/company-detail.css'
import './opportunities.css'
import './opportunity-detail.css'

const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('es-AR') : '-'
const inactive = (name: string, active: boolean | null | undefined) => active === false ? `${name} (inactivo)` : name

function OpportunityStages({ opportunity }: { opportunity: Oportunidad }) {
  const id = Number(opportunity.id)
  const funnelId = Number(opportunity.idEmbudo)
  const currentId = Number(opportunity.idEtapa)
  const stages = useQuery({
    queryKey: ['embudos', funnelId, 'etapas', 'todos'],
    queryFn: () => listStages(funnelId, 'todos'),
  })
  const history = useQuery({
    queryKey: ['oportunidades', 'etapas-recorridas', id],
    queryFn: async ({ signal }) => {
      const visited = new Set<number>()
      let page = 1
      while (true) {
        signal.throwIfAborted()
        const result = await getOpportunityHistory(id, page)
        for (const entry of result.items) visited.add(Number(entry.idNuevaEtapa))
        if (result.items.length === 0 || page * Number(result.pageSize) >= Number(result.totalCount)) return [...visited]
        page++
      }
    },
  })
  const visited = new Set(history.data)
  const rank = (state: string) => state === 'ABIERTA' ? 0 : state === 'GANADA' ? 1 : 2
  const available = (stages.data ?? []).filter(stage => stage.activo || visited.has(Number(stage.id)) || Number(stage.id) === currentId)
  if (!available.some(stage => Number(stage.id) === currentId)) {
    available.push({
      id: currentId, idEmbudo: funnelId, nombre: opportunity.etapaNombre, descripcion: null,
      orden: 0, estado: opportunity.estado, activo: opportunity.etapaActiva,
    })
  }
  available.sort((a, b) => rank(a.estado) - rank(b.estado) || Number(a.orden) - Number(b.orden))
  const openStages = available.filter(stage => stage.estado === 'ABIERTA' && (stage.activo || Number(stage.id) === currentId))
  const position = openStages.findIndex(stage => Number(stage.id) === currentId) + 1
  const progress = opportunity.estado === 'ABIERTA' ? position / (openStages.length + 1) * 100 : 100

  return <section className="company-fiche-card opportunity-fiche-stages" aria-labelledby="opportunity-stages-heading">
    <header className="company-fiche-card-heading"><h2 id="opportunity-stages-heading"><FilterAltOutlined />Etapas del embudo</h2></header>
    <ol className="opportunity-stage-list">
      {available.map(stage => {
        const current = Number(stage.id) === currentId
        const completed = visited.has(Number(stage.id))
        const marker = current ? 'Actual' : completed ? 'Recorrida' : null
        return <li key={stage.id} aria-current={current ? 'step' : undefined} data-visited={completed} data-state={stage.estado}>
          <strong>{inactive(stage.nombre, stage.activo)}</strong>
          {marker && <span>{current ? <RadioButtonChecked /> : <CheckOutlined />}{marker}</span>}
        </li>
      })}
    </ol>
    {stages.isSuccess && <LinearProgress
      className="opportunity-stage-progress" data-state={opportunity.estado} variant="determinate" value={progress}
      aria-label="Avance del embudo" aria-valuetext={opportunity.etapaNombre}
    />}
    {(stages.isError || history.isError) && <Alert severity="warning" action={<Button onClick={() => {
      if (stages.isError) void stages.refetch()
      if (history.isError) void history.refetch()
    }}>Reintentar</Button>}>{stages.isError ? 'No pudimos cargar las etapas del embudo.' : 'No pudimos cargar las etapas recorridas.'}</Alert>}
  </section>
}

function OpportunityProfile({ opportunity, actions, from }: { opportunity: Oportunidad; actions: ReactNode; from: { to: string; label: string } }) {
  const client = clientLabel(opportunity)
  const academicRows = [
    { label: 'Objetivo de aprendizaje', value: opportunity.objetivoAprendizaje?.trim() },
    { label: 'Participantes', value: opportunity.cantidadParticipantes?.toString() },
    { label: 'Disponibilidad horaria', value: opportunity.disponibilidadHoraria?.trim() },
  ].filter(row => row.value)
  return <article aria-label={`Ficha de ${opportunity.tituloVisible}`}>
    <div className="company-fiche-summary opportunity-summary" data-state={opportunity.estado}>
      <header className="company-fiche-header">
        <span className="company-fiche-avatar" aria-hidden="true">{initials(opportunity.tituloVisible)}</span>
        <div className="company-fiche-identity">
          <div className="company-fiche-name">
            <h1>{opportunity.tituloVisible}</h1>
            <Chip className={`company-status ${opportunityStateClass(opportunity.estado)}`} label={stateLabels[opportunity.estado] ?? opportunity.estado} size="small" />
          </div>
          <div className="company-fiche-meta">
            {client && client !== opportunity.tituloVisible && <span>{client}</span>}
            {opportunity.fechaCierre && <span><EventOutlined />Cierre <time dateTime={opportunity.fechaCierre}>{dateTime(opportunity.fechaCierre)}</time></span>}
          </div>
        </div>
        <div className="company-fiche-actions">{actions}</div>
      </header>
      <ProfileStats items={[
        { label: opportunity.estado === 'GANADA' ? 'Valor acordado' : 'Valor', value: <span className={opportunity.estado === 'GANADA' ? 'opportunity-fiche-won' : undefined}>{money(opportunity.valor)} ARS</span> },
        { label: 'Embudo comercial', value: <><FilterAltOutlined className="opportunity-summary-funnel" />{inactive(opportunity.embudoNombre, opportunity.embudoActivo)}</> },
        { label: 'Servicio educativo', value: <><SchoolOutlined className="opportunity-summary-service" />{inactive(opportunity.servicioNombre, opportunity.servicioActivo)}</> },
        { label: 'Responsable', value: <span className="company-fiche-owner"><span className="company-fiche-contact-avatar" aria-hidden="true">{initials(opportunity.responsableNombre)}</span>{inactive(opportunity.responsableNombre, opportunity.responsableActivo)}</span> },
      ]} />
    </div>
    <OpportunityStages opportunity={opportunity} />
    <div className="company-fiche-grid">
      <div className="company-fiche-sidebar">
        <section className="company-fiche-card" aria-labelledby="opportunity-commercial-heading">
          <header className="company-fiche-card-heading">
            <h2 id="opportunity-commercial-heading"><InfoOutlined />Datos comerciales</h2>
            {opportunity.accionesPermitidas.editar && <Button component={RouterLink} to={`/oportunidades/${opportunity.id}/editar`} state={{ from }} size="small">Modificar</Button>}
          </header>
          <ProfileRows rows={[
            { label: 'Empresa', value: opportunity.idEmpresa ? <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link> : undefined },
            { label: 'Contacto', value: opportunity.idContacto ? <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{displayValue(opportunity.contactoNombre)}</Link> : undefined },
            { label: 'Origen', value: opportunity.idOrigen ? inactive(opportunity.origenDescripcion ?? '', opportunity.origenActivo) : undefined },
            { label: 'Fecha de alta', value: <time dateTime={opportunity.fechaCreacion}>{dateTime(opportunity.fechaCreacion)}</time> },
            { label: 'Cierre estimado', value: formatCommercialDate(opportunity.fechaEstimadaCierre) },
            ...(opportunity.fechaCierre ? [{ label: 'Cierre real', value: dateTime(opportunity.fechaCierre) }] : []),
            ...(opportunity.estado === 'PERDIDA' && opportunity.motivoPerdidaDescripcion ? [{ label: 'Motivo de pérdida', value: opportunity.motivoPerdidaDescripcion }] : []),
            ...(opportunity.observaciones?.trim() ? [{ label: 'Observaciones', value: opportunity.observaciones.trim() }] : []),
          ]} />
        </section>
        {academicRows.length > 0 && <section className="company-fiche-card" aria-labelledby="opportunity-academic-heading">
          <header className="company-fiche-card-heading"><h2 id="opportunity-academic-heading"><SchoolOutlined />Enfoque académico</h2></header>
          <ProfileRows rows={academicRows} />
        </section>}
      </div>
      <CommercialHistory key={opportunity.id} kind="oportunidades" id={Number(opportunity.id)} />
    </div>
  </article>
}

export function OpportunityDetailPage() {
  const { idOportunidad: routeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const idOportunidad = parsePositiveId(routeId)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(idOportunidad ?? 0), queryFn: () => getOpportunity(idOportunidad as number), enabled: idOportunidad !== undefined })
  const opportunity = query.data
  const [reassigning, setReassigning] = useState(false)
  const [moving, setMoving] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [activityRegistered, setActivityRegistered] = useState(false)
  const [closing, setClosing] = useState<CloseResult | '' | null>(null)
  const [reassigned, setReassigned] = useState(false)
  const routeState = location.state as { from?: { to?: unknown; label?: unknown }; openActivity?: unknown } | null
  const from = routeState?.from
  const back = typeof from?.to === 'string' && typeof from.label === 'string'
    ? { to: from.to, label: from.label }
    : { to: '/oportunidades', label: 'Volver a oportunidades' }
  const backLink = <Link component={RouterLink} to={back.to} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>

  if (idOportunidad === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-not-found-title"><Typography id="opportunity-not-found-title" component="h1" className="company-feedback-title">No encontramos esa oportunidad</Typography><Typography color="text.secondary">El enlace puede estar vencido o la oportunidad ya no estar disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><div className="company-detail-skeleton" aria-label="Cargando detalle de la oportunidad" role="status"><Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} /><Skeleton height={160} /></div></Box>
  if (query.isError || !opportunity)
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-error-title"><Typography id="opportunity-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la oportunidad</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} variant="outlined" startIcon={<Refresh />}>Reintentar</Button></div></section></Box>

  const actions = opportunity.accionesPermitidas
  return <Box className="companies-page company-result-page company-fiche opportunity-fiche">
    {backLink}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {reassigned && <Alert severity="success" className="record-form-confirmation">Oportunidad reasignada. Podés consultarla, pero ya no editarla.</Alert>}
    <OpportunityProfile opportunity={opportunity} from={back} actions={<>
      {actions.gestionarActividades && <RegisterActivityButton
        context={{
          label: opportunity.tituloVisible, idOportunidad: Number(opportunity.id),
          ...(opportunity.idEmpresa == null ? {} : { idEmpresa: Number(opportunity.idEmpresa) }),
          ...(opportunity.idContacto == null ? {} : { idContacto: Number(opportunity.idContacto) }),
        }}
        onRegistered={() => setActivityRegistered(true)} openOnMount={routeState?.openActivity === true} variant="contained" showIcon
      />}
      <OpportunityActions opportunity={opportunity} detail={{
        move: () => setMoving(true),
        close: () => setClosing(''),
        reopen: () => setReopening(true),
        reassign: () => setReassigning(true),
      }} onRemoved={() => {
        queryClient.removeQueries({ queryKey: opportunityQueryKeys.detail(Number(opportunity.id)) })
        void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
        navigate('/oportunidades', { state: { confirmation: confirmationFor('Oportunidad', 'dada de baja') } })
      }} />
    </>} />
    <MoveStageDialog item={opportunity} open={moving} onClose={() => setMoving(false)} onDone={() => setMoving(false)} onCloseRequest={result => { setMoving(false); setClosing(result) }} />
    {closing !== null && <CloseOpportunityDialog item={opportunity} initialResult={closing || undefined} open onClose={() => setClosing(null)} onDone={() => setClosing(null)} />}
    <ReopenOpportunityDialog item={opportunity} open={reopening} onClose={() => setReopening(false)} onDone={() => setReopening(false)} />
    <ReassignDialog item={opportunity} open={reassigning} onClose={() => setReassigning(false)} onDone={() => { setReassigning(false); setReassigned(true) }} />
  </Box>
}
