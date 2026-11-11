import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, deleteOpportunity, getOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { displayValue, formatCommercialDate, parsePositiveId } from '../shared/display'
import { confirmationFor } from '../shared/formUtils'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import { clientLabel, money, opportunityStateClass, stateLabels } from './opportunityData'
import { CloseOpportunityDialog, type CloseResult } from './CloseOpportunityDialog'
import { MoveStageDialog } from './MoveStageDialog'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { ReassignDialog } from './ReassignDialog'
import { ReopenOpportunityDialog } from './ReopenOpportunityDialog'
import '../contacts/records.css'
import '../companies/companies.css'
import './opportunities.css'

const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('es-AR') : '-'
const inactive = (name: string, active: boolean | null | undefined) => active === false ? `${name} (inactivo)` : name

function OpportunityProfile({ opportunity, actions }: { opportunity: Oportunidad; actions: ReactNode }) {
  return <article className="profile-sheet" aria-label={`Ficha de ${opportunity.tituloVisible}`}>
    <ProfileHeader name={opportunity.tituloVisible} subtitle={opportunity.titulo ? clientLabel(opportunity) : undefined} status={<Chip className={`company-status ${opportunityStateClass(opportunity.estado)}`} label={stateLabels[opportunity.estado] ?? opportunity.estado} size="small" />} actions={actions} />
    <ProfileStats items={[
      { label: 'Etapa', value: inactive(opportunity.etapaNombre, opportunity.etapaActiva) },
      { label: 'Valor', value: money(opportunity.valor) },
      { label: 'Responsable', value: inactive(opportunity.responsableNombre, opportunity.responsableActivo) },
      { label: 'Cierre estimado', value: formatCommercialDate(opportunity.fechaEstimadaCierre) },
    ]} />
    <ProfileRows rows={[
      { label: 'Empresa', value: opportunity.idEmpresa ? <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link> : undefined },
      { label: 'Contacto', value: opportunity.idContacto ? <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{displayValue(opportunity.contactoNombre)}</Link> : undefined },
      { label: 'Embudo', value: inactive(opportunity.embudoNombre, opportunity.embudoActivo) },
      { label: 'Servicio', value: inactive(opportunity.servicioNombre, opportunity.servicioActivo) },
      { label: 'Origen', value: opportunity.idOrigen ? inactive(opportunity.origenDescripcion ?? '', opportunity.origenActivo) : undefined },
      { label: 'Creación', value: dateTime(opportunity.fechaCreacion) },
      { label: 'Cierre real', value: dateTime(opportunity.fechaCierre) },
      { label: 'Objetivo de aprendizaje', value: opportunity.objetivoAprendizaje?.trim() },
      { label: 'Participantes', value: opportunity.cantidadParticipantes == null ? undefined : String(opportunity.cantidadParticipantes) },
      { label: 'Disponibilidad horaria', value: opportunity.disponibilidadHoraria?.trim() },
      { label: 'Observaciones', value: opportunity.observaciones?.trim() },
    ]} />
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
  const back = typeof from?.to === 'string' && typeof from.label === 'string' ? { to: from.to, label: from.label } : opportunity?.idEmpresa ?{ to: `/empresas/${opportunity.idEmpresa}`, label: 'Volver a la empresa' } : opportunity?.idContacto ? { to: `/contactos/${opportunity.idContacto}`, label: 'Volver al contacto' } : { to: '/inicio', label: 'Volver al inicio' }
  const backLink = <Link component={RouterLink} to={back.to} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>

  if (idOportunidad === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-not-found-title"><Typography id="opportunity-not-found-title" component="h1" className="company-feedback-title">No encontramos esa oportunidad</Typography><Typography color="text.secondary">El enlace puede estar vencido o la oportunidad ya no estar disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><div className="company-detail-skeleton" aria-label="Cargando detalle de la oportunidad" role="status"><Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} /><Skeleton height={160} /></div></Box>
  if (query.isError || !opportunity)
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-error-title"><Typography id="opportunity-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la oportunidad</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} variant="outlined" startIcon={<Refresh />}>Reintentar</Button></div></section></Box>

  return <Box className="companies-page company-result-page records-page">
    {backLink}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {reassigned && <Alert severity="success" className="record-form-confirmation">Oportunidad reasignada. Podés consultarla, pero ya no editarla.</Alert>}
    <OpportunityProfile opportunity={opportunity} actions={<>{opportunity.accionesPermitidas.editar && <Button component={RouterLink} to={`/oportunidades/${opportunity.id}/editar`} variant="outlined">Editar</Button>}{opportunity.accionesPermitidas.mover && <Button variant="outlined" onClick={() => setMoving(true)}>Cambiar etapa</Button>}{opportunity.accionesPermitidas.cerrar && <Button variant="outlined" onClick={() => setClosing('')}>Cerrar</Button>}{opportunity.accionesPermitidas.reabrir && <Button variant="outlined" onClick={() => setReopening(true)}>Reabrir</Button>}{opportunity.accionesPermitidas.gestionarActividades && <RegisterActivityButton context={{ label: opportunity.tituloVisible, idOportunidad: Number(opportunity.id), ...(opportunity.idEmpresa == null ? {} : { idEmpresa: Number(opportunity.idEmpresa) }), ...(opportunity.idContacto == null ? {} : { idContacto: Number(opportunity.idContacto) }) }} onRegistered={() => setActivityRegistered(true)} openOnMount={routeState?.openActivity === true} />}{opportunity.accionesPermitidas.darDeBaja && <RemoveRecordButton noun="oportunidad" name={opportunity.tituloVisible} remove={() => deleteOpportunity(Number(opportunity.id))} onRemoved={() => {
      queryClient.removeQueries({ queryKey: opportunityQueryKeys.detail(Number(opportunity.id)) })
      void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      navigate('/oportunidades', { state: { confirmation: confirmationFor('Oportunidad', 'dada de baja') } })
    }} />}{opportunity.accionesPermitidas.reasignar && <Button variant="outlined" onClick={() => setReassigning(true)}>Reasignar</Button>}</>} />
    <MoveStageDialog item={opportunity} open={moving} onClose={() => setMoving(false)} onDone={() => setMoving(false)} onCloseRequest={result => { setMoving(false); setClosing(result) }} />
    {closing !== null && <CloseOpportunityDialog item={opportunity} initialResult={closing || undefined} open onClose={() => setClosing(null)} onDone={() => setClosing(null)} />}
    <ReopenOpportunityDialog item={opportunity} open={reopening} onClose={() => setReopening(false)} onDone={() => setReopening(false)} />
    <ReassignDialog item={opportunity} open={reassigning} onClose={() => setReassigning(false)} onDone={() => { setReassigning(false); setReassigned(true) }} />
    <CommercialHistory kind="oportunidades" id={Number(opportunity.id)} />
  </Box>
}
