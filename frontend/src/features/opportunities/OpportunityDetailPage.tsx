import { ArrowBack, Edit, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { ApiRequestError, getOpportunity, opportunityQueryKeys, type OportunidadDetalle } from '../../api/client'
import { CompanyStatus } from '../companies/CompanyStatus'
import { displayValue, formatCommercialDate, parsePositiveId } from '../shared/display'
import '../contacts/records.css'
import '../companies/companies.css'

function OpportunityField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const shownValue = typeof children === 'string' ? displayValue(children) : children ?? '-'
  return <div className={className}><dt>{label}</dt><dd>{shownValue}</dd></div>
}

function OpportunitySkeleton() {
  return <div className="company-detail-skeleton" aria-label="Cargando detalle de la oportunidad" role="status"><Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} />{[0, 1, 2].map((section) => <section className="company-detail-section" key={section} aria-hidden="true"><Skeleton width={180} height={28} /><div className="company-detail-skeleton-fields"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></section>)}</div>
}

function OpportunityDetails({ opportunity }: { opportunity: OportunidadDetalle }) {
  const responsible = [opportunity.usuarioNombre?.trim(), opportunity.usuarioApellido?.trim()].filter(Boolean).join(' ')
  return <article className="company-sheet" aria-label={`Ficha de ${opportunity.titulo}`}>
    <section className="company-detail-section" aria-labelledby="opportunity-relations-heading"><Typography component="h2" id="opportunity-relations-heading" className="company-section-heading">Relación comercial</Typography>
      <dl className="company-detail-fields">
        <OpportunityField label="Empresa">{opportunity.idEmpresa ? <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link> : opportunity.empresaRazonSocial?.trim()}</OpportunityField>
        <OpportunityField label="Contacto">{opportunity.idContacto ? <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{[opportunity.contactoApellido?.trim(), opportunity.contactoNombre?.trim()].filter(Boolean).join(', ') || '-'}</Link> : [opportunity.contactoApellido?.trim(), opportunity.contactoNombre?.trim()].filter(Boolean).join(', ')}</OpportunityField>
      </dl>
    </section>
    <section className="company-detail-section" aria-labelledby="opportunity-management-heading"><Typography component="h2" id="opportunity-management-heading" className="company-section-heading">Gestión</Typography>
      <dl className="company-detail-fields">
        <OpportunityField label="Responsable">{responsible}</OpportunityField><OpportunityField className="company-detail-commercial-field" label="Servicio">{opportunity.servicioNombre?.trim()}</OpportunityField>
        <OpportunityField className="company-detail-commercial-field" label="Etapa"><Chip className="company-status company-status--prospect" label={displayValue(opportunity.etapaNombre)} size="small" /></OpportunityField><OpportunityField className="company-detail-commercial-field" label="Estado"><CompanyStatus value={opportunity.estadoDescripcion} /></OpportunityField>
        <OpportunityField label="Origen">{opportunity.origenDescripcion?.trim()}</OpportunityField>
      </dl>
    </section>
    <section className="company-detail-section" aria-labelledby="opportunity-dates-heading"><Typography component="h2" id="opportunity-dates-heading" className="company-section-heading">Fechas</Typography>
      <dl className="company-detail-fields"><OpportunityField label="Cierre estimado">{formatCommercialDate(opportunity.fechaEstimadaCierre)}</OpportunityField><OpportunityField label="Cierre real">{formatCommercialDate(opportunity.fechaCierre)}</OpportunityField></dl>
    </section>
    <section className="company-detail-section" aria-labelledby="opportunity-notes-heading"><Typography component="h2" id="opportunity-notes-heading" className="company-section-heading">Observaciones</Typography><p className="company-observations">{displayValue(opportunity.observaciones)}</p></section>
  </article>
}

export function OpportunityDetailPage() {
  const { idOportunidad: routeId } = useParams()
  const location = useLocation()
  const idOportunidad = parsePositiveId(routeId)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(idOportunidad ?? 0), queryFn: () => getOpportunity(idOportunidad as number), enabled: idOportunidad !== undefined })

  if (idOportunidad === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/oportunidades" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a oportunidades</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos esa oportunidad</Typography><Typography color="text.secondary">El enlace puede estar vencido o la oportunidad ya no está disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><OpportunitySkeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/oportunidades" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a oportunidades</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar los datos de la oportunidad</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/oportunidades">Volver al listado</Button></div></section></Box>

  const opportunity = query.data
  return <Box className="companies-page company-result-page records-page">
    <Link component={RouterLink} to="/oportunidades" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a oportunidades</Link>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <header className="company-detail-header"><div><Typography component="h1" className="companies-page-title">{opportunity.titulo}</Typography></div><div className="company-detail-header-actions"><Chip className="company-status company-status--prospect" label={displayValue(opportunity.etapaNombre)} size="small" /><Button component={RouterLink} to={`/oportunidades/${opportunity.id}/editar`} variant="contained" startIcon={<Edit />}>Editar oportunidad</Button></div></header>
    <OpportunityDetails opportunity={opportunity} />
  </Box>
}
