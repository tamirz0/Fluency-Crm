import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, deleteCompany, empresaQueryKeys, getCompany, type Empresa } from '../../api/client'
import { CompanyStatus } from './CompanyStatus'
import { useAuth } from '../../auth/useAuth'
import { confirmationFor } from '../shared/formUtils'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import './companies.css'

function parseCompanyId(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined
  const idEmpresa = Number(value)
  return Number.isSafeInteger(idEmpresa) ? idEmpresa : undefined
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
  const canCreateOpportunity = Boolean(useAuth().user?.permisos?.includes('GestionarOportunidad'))
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activityRegistered, setActivityRegistered] = useState(false)
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
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    {query.isFetching && query.isPlaceholderData && <Typography className="company-detail-loading" role="status">Actualizando ficha…</Typography>}
    <article className="profile-sheet" aria-label={`Ficha de ${company.razonSocial}`}>
      <ProfileHeader name={company.razonSocial} subtitle={[company.cuit?.trim() && `CUIT ${company.cuit.trim()}`, company.industria?.trim()].filter(Boolean).join(' · ')} status={<CompanyStatus value={status} />} actions={<>{canCreateOpportunity && <Button component={RouterLink} to={`/oportunidades/nueva?idEmpresa=${company.id}`} variant="outlined">Nueva oportunidad</Button>}<RegisterActivityButton context={{ label: company.razonSocial, idEmpresa: Number(company.id) }} onRegistered={() => setActivityRegistered(true)} /><Button component={RouterLink} to={`/empresas/${company.id}/editar`} variant="contained">Editar empresa</Button>
        <RemoveRecordButton noun="empresa" name={company.razonSocial} remove={() => deleteCompany(Number(company.id))} onRemoved={() => {
          navigate('/empresas', { state: { confirmation: confirmationFor('Empresa', 'dada de baja') } })
          void queryClient.invalidateQueries({ queryKey: empresaQueryKeys.all, refetchType: 'inactive' })
        }} /></>} />
      <ProfileStats items={[
        { label: 'Responsable', value: company.responsableNombre ? company.responsableNombre + (company.responsableActivo === false ? ' (inactivo)' : '') : undefined },
        { label: 'Origen', value: company.origenDescripcion ? `${company.origenDescripcion}${company.origenActivo === false ? ' (inactivo)' : ''}` : undefined },
        { label: 'Fecha de creación', value: company.fechaCreacion ? new Date(company.fechaCreacion).toLocaleString('es-AR') : undefined },
      ]} />
      <ProfileRows rows={[
        { label: 'Contacto', value: (company.correo?.trim() || company.telefono?.trim()) && <CompanyContactLinks company={company} /> },
        { label: 'Dirección', value: company.direccion?.trim() },
        ...(company.estadoActivo === false ? [{ label: 'Disponibilidad del estado', value: 'Estado inactivo para nuevas asignaciones' }] : []),
        { label: 'Observaciones', value: company.observaciones?.trim() },
      ]} />
    </article>
    <CommercialHistory kind="empresas" id={Number(company.id)} />
  </Box>
}
