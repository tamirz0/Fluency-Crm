import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { ApiRequestError, empresaQueryKeys, getCompany, type Empresa } from '../../api/client'
import { CompanyStatus } from './CompanyStatus'
import { displayValue } from '../shared/display'
import './companies.css'

function parseCompanyId(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined
  const idEmpresa = Number(value)
  return Number.isSafeInteger(idEmpresa) ? idEmpresa : undefined
}

function CompanyField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const shownValue = typeof children === 'string' ? displayValue(children) : children ?? '-'
  return <div className={className}><dt>{label}</dt><dd>{shownValue}</dd></div>
}

function CompanyContactLinks({ company }: { company: Empresa }) {
  return <span className="company-detail-contact">
    {company.correo?.trim() && <Link href={`mailto:${company.correo}`} underline="hover">{company.correo}</Link>}
    {company.telefono?.trim() && <Link href={`tel:${company.telefono}`} underline="hover">{company.telefono}</Link>}
    {!company.correo?.trim() && !company.telefono?.trim() && '-'}
  </span>
}

function DetailSkeleton() {
  return <div className="company-detail-skeleton" aria-label="Cargando detalle de la empresa" role="status">
    <Skeleton width={150} height={28} />
    <Skeleton className="company-detail-title-skeleton" width="54%" height={54} />
    {[0, 1, 2].map((section) => <section className="company-detail-section" key={section} aria-hidden="true"><Skeleton width={180} height={28} /><div className="company-detail-skeleton-fields"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></section>)}
  </div>
}

export function CompanyDetailPage() {
  const { idEmpresa: routeId } = useParams()
  const location = useLocation()
  const idEmpresa = parseCompanyId(routeId)
  const query = useQuery({
    queryKey: empresaQueryKeys.detail(idEmpresa ?? 0),
    queryFn: () => getCompany(idEmpresa as number),
    enabled: idEmpresa !== undefined,
  })

  if (idEmpresa === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) {
    return <Box className="companies-page company-result-page"><Link component={RouterLink} to="/empresas" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a empresas</Link><section className="company-feedback" aria-labelledby="company-not-found-title"><Typography id="company-not-found-title" component="h1" className="company-feedback-title">No encontramos esa empresa</Typography><Typography color="text.secondary">El enlace puede estar vencido o la empresa ya no está disponible.</Typography></section></Box>
  }

  if (query.isPending) return <Box className="companies-page company-result-page"><DetailSkeleton /></Box>

  if (query.isError) return <Box className="companies-page company-result-page">
    <Link component={RouterLink} to="/empresas" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a empresas</Link>
    <section className="company-feedback" aria-labelledby="company-detail-error-title"><Typography id="company-detail-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la empresa</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/empresas">Volver al listado</Button></div></section>
  </Box>

  const company = query.data
  const status = company.estadoDescripcion
  return <Box className="companies-page company-result-page">
    <Link component={RouterLink} to="/empresas" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a empresas</Link>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <header className="company-detail-header">
      <div><Typography component="h1" className="companies-page-title">{company.razonSocial}</Typography></div>
      <div className="company-detail-header-actions"><CompanyStatus value={status} /><Button component={RouterLink} to={`/empresas/${company.id}/editar`} variant="contained">Editar empresa</Button></div>
    </header>
    {query.isFetching && query.isPlaceholderData && <Typography className="company-detail-loading" role="status">Actualizando ficha…</Typography>}
    <article className="company-sheet" aria-label={`Ficha de ${company.razonSocial}`}>
      <section className="company-detail-section" aria-labelledby="company-commercial-heading">
        <Typography component="h2" id="company-commercial-heading" className="company-section-heading">Información comercial</Typography>
        <dl className="company-detail-fields">
          <CompanyField label="CUIT">{company.cuit?.trim()}</CompanyField>
          <CompanyField label="Industria">{company.industria?.trim()}</CompanyField>
          <CompanyField label="Estado" className="company-detail-commercial-field"><CompanyStatus value={status} /></CompanyField>
          <CompanyField label="Origen">{company.origenDescripcion?.trim()}</CompanyField>
        </dl>
      </section>
      <section className="company-detail-section" aria-labelledby="company-contact-heading">
        <Typography component="h2" id="company-contact-heading" className="company-section-heading">Contacto</Typography>
        <dl className="company-detail-fields">
          <CompanyField label="Correo y teléfono"><CompanyContactLinks company={company} /></CompanyField>
          <CompanyField label="Dirección" className="company-detail-field-wide">{company.direccion?.trim()}</CompanyField>
        </dl>
      </section>
      <section className="company-detail-section" aria-labelledby="company-notes-heading">
        <Typography component="h2" id="company-notes-heading" className="company-section-heading">Observaciones</Typography>
        <p className="company-observations">{displayValue(company.observaciones)}</p>
      </section>
    </article>
  </Box>
}
