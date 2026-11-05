import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { ApiRequestError, getOpportunity, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { displayValue, formatCommercialDate, parsePositiveId } from '../shared/display'
import '../contacts/records.css'
import '../companies/companies.css'

const stateLabels: Record<string, string> = { ABIERTA: 'Abierta', GANADA: 'Ganada', PERDIDA: 'Perdida' }
const money = (value: number | string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('es-AR') : '-'
const inactive = (name: string, active: boolean | null | undefined) => active === false ? `${name} (inactivo)` : name

function OpportunityField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{typeof children === 'string' ? displayValue(children) : children ?? '-'}</dd></div>
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="company-detail-section" aria-labelledby={id}><Typography component="h2" id={id} className="company-section-heading">{title}</Typography><dl className="company-detail-fields">{children}</dl></section>
}

function OpportunityDetails({ opportunity }: { opportunity: Oportunidad }) {
  return <article className="company-sheet" aria-label={`Ficha de ${opportunity.titulo}`}>
    <Section id="opportunity-relations-heading" title="Relación comercial">
      <OpportunityField label="Empresa">{opportunity.idEmpresa ? <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link> : '-'}</OpportunityField>
      <OpportunityField label="Contacto">{opportunity.idContacto ? <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{displayValue(opportunity.contactoNombre)}</Link> : '-'}</OpportunityField>
    </Section>
    <Section id="opportunity-management-heading" title="Gestión">
      <OpportunityField label="Responsable">{inactive(opportunity.responsableNombre, opportunity.responsableActivo)}</OpportunityField>
      <OpportunityField label="Embudo">{inactive(opportunity.embudoNombre, opportunity.embudoActivo)}</OpportunityField>
      <OpportunityField label="Servicio">{inactive(opportunity.servicioNombre, opportunity.servicioActivo)}</OpportunityField>
      <OpportunityField label="Etapa">{inactive(opportunity.etapaNombre, opportunity.etapaActiva)}</OpportunityField>
      <OpportunityField label="Valor">{money(opportunity.valor)}</OpportunityField>
      <OpportunityField label="Origen">{opportunity.idOrigen ? inactive(opportunity.origenDescripcion ?? '', opportunity.origenActivo) : '-'}</OpportunityField>
    </Section>
    <Section id="opportunity-dates-heading" title="Fechas">
      <OpportunityField label="Creación">{dateTime(opportunity.fechaCreacion)}</OpportunityField>
      <OpportunityField label="Cierre estimado">{formatCommercialDate(opportunity.fechaEstimadaCierre)}</OpportunityField>
      <OpportunityField label="Cierre real">{dateTime(opportunity.fechaCierre)}</OpportunityField>
    </Section>
    <Section id="opportunity-academic-heading" title="Datos académicos">
      <OpportunityField label="Objetivo de aprendizaje">{opportunity.objetivoAprendizaje ?? ''}</OpportunityField>
      <OpportunityField label="Participantes">{opportunity.cantidadParticipantes == null ? '' : String(opportunity.cantidadParticipantes)}</OpportunityField>
      <OpportunityField label="Disponibilidad horaria">{opportunity.disponibilidadHoraria ?? ''}</OpportunityField>
    </Section>
    <section className="company-detail-section" aria-labelledby="opportunity-notes-heading"><Typography component="h2" id="opportunity-notes-heading" className="company-section-heading">Observaciones</Typography><p className="company-observations">{displayValue(opportunity.observaciones)}</p></section>
  </article>
}

export function OpportunityDetailPage() {
  const { idOportunidad: routeId } = useParams()
  const location = useLocation()
  const idOportunidad = parsePositiveId(routeId)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(idOportunidad ?? 0), queryFn: () => getOpportunity(idOportunidad as number), enabled: idOportunidad !== undefined })
  const opportunity = query.data
  const back = opportunity?.idEmpresa ? { to: `/empresas/${opportunity.idEmpresa}`, label: 'Volver a la empresa' } : opportunity?.idContacto ? { to: `/contactos/${opportunity.idContacto}`, label: 'Volver al contacto' } : { to: '/inicio', label: 'Volver al inicio' }
  const backLink = <Link component={RouterLink} to={back.to} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>

  if (idOportunidad === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-not-found-title"><Typography id="opportunity-not-found-title" component="h1" className="company-feedback-title">No encontramos esa oportunidad</Typography><Typography color="text.secondary">El enlace puede estar vencido o la oportunidad ya no estar disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><div className="company-detail-skeleton" aria-label="Cargando detalle de la oportunidad" role="status"><Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} /><Skeleton height={160} /></div></Box>
  if (query.isError || !opportunity)
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-error-title"><Typography id="opportunity-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la oportunidad</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} variant="outlined" startIcon={<Refresh />}>Reintentar</Button></div></section></Box>

  return <Box className="companies-page company-result-page records-page">
    {backLink}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <header className="company-detail-header"><div><Typography component="h1" className="companies-page-title">{opportunity.titulo}</Typography></div><div className="company-detail-header-actions"><Chip className="company-status company-status--prospect" label={stateLabels[opportunity.estado] ?? opportunity.estado} size="small" /></div></header>
    <OpportunityDetails opportunity={opportunity} />
  </Box>
}
