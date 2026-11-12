import { AccessTime, ArrowBack, BusinessOutlined, ContactsOutlined, InfoOutlined, MailOutlined, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, IconButton, Link, Skeleton, TablePagination, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, contactoQueryKeys, empresaQueryKeys, getCompany, listActivities, listContacts, type Empresa } from '../../api/client'
import { CompanyActions } from './CompanyActions'
import { CompanyStatus } from './CompanyStatus'
import { useAuth } from '../../auth/useAuth'
import { confirmationFor } from '../shared/formUtils'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { QuickOpportunityButton } from '../opportunities/QuickOpportunityButton'
import { ProfileRows } from '../shared/RecordProfile'
import { backTarget, cameFrom, initials, returnState } from '../shared/display'
import './companies.css'
import './company-detail.css'

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

function CompanyContacts({ id }: { id: number }) {
  const contactState = cameFrom(useLocation(), 'Volver a la empresa')
  const [page, setPage] = useState(0)
  const filters = { idEmpresa: id, page: page + 1, pageSize: 5 }
  const query = useQuery({ queryKey: [...contactoQueryKeys.all, 'list', filters], queryFn: () => listContacts(filters) })
  return <section className="company-fiche-card" aria-labelledby="company-contacts-heading">
    <header className="company-fiche-card-heading">
      <Typography component="h2" id="company-contacts-heading"><ContactsOutlined fontSize="small" />Contactos vinculados</Typography>
    </header>
    {query.isPending ? <Skeleton height={60} role="status" aria-label="Cargando contactos vinculados" /> : query.isError
      ? <Alert severity="warning" action={<Button onClick={() => void query.refetch()}>Reintentar</Button>}>No pudimos cargar los contactos.</Alert>
      : <>
        {query.data.items.length === 0 ? <Typography color="text.secondary">{page === 0 ? 'Todavía no hay contactos vinculados.' : 'No hay contactos vinculados en esta página.'}</Typography> :
          <ul className="company-fiche-contacts">
            {query.data.items.map(contact => {
              const name = `${contact.nombre} ${contact.apellido}`
              return <li key={contact.id}>
                <span className="company-fiche-contact-avatar" aria-hidden="true">{initials(name)}</span>
                <div>
                  <Link component={RouterLink} to={`/contactos/${contact.id}`} state={contactState} underline="hover">{name}</Link>
                  {contact.cargo && <span className="company-fiche-contact-role">{contact.cargo}</span>}
                </div>
                {contact.correo && <IconButton component="a" href={`mailto:${contact.correo}`} aria-label={`Enviar correo a ${name}`}><MailOutlined fontSize="small" /></IconButton>}
              </li>
            })}
          </ul>}
        {(Number(query.data.totalCount) > filters.pageSize || page > 0) &&
          <TablePagination component="div" count={Number(query.data.totalCount)} page={page} rowsPerPage={filters.pageSize} rowsPerPageOptions={[]}
            onPageChange={(_, next) => setPage(next)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />}
      </>}
  </section>
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
  const permissions = useAuth().user?.permisos
  const canCreateOpportunity = permissions?.includes('GestionarOportunidad')
  const canManage = permissions?.includes('GestionarClientes')
  const location = useLocation()
  const back = backTarget(location.state, { to: '/empresas', label: 'Volver a empresas' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activityRegistered, setActivityRegistered] = useState(false)
  const idEmpresa = parseCompanyId(routeId)
  const query = useQuery({
    queryKey: empresaQueryKeys.detail(idEmpresa ?? 0),
    queryFn: () => getCompany(idEmpresa as number),
    enabled: idEmpresa !== undefined,
  })
  const latestActivity = useQuery({
    queryKey: ['actividades', 'ultima-por-empresa', idEmpresa],
    queryFn: () => listActivities({ idEmpresa, page: 1, pageSize: 1 }),
    enabled: query.isSuccess,
    select: data => data.items[0],
  })

  if (idEmpresa === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) {
    return <Box className="companies-page company-result-page"><Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link><section className="company-feedback" aria-labelledby="company-not-found-title"><Typography id="company-not-found-title" component="h1" className="company-feedback-title">No encontramos esa empresa</Typography><Typography color="text.secondary">El enlace puede estar vencido o la empresa ya no está disponible.</Typography></section></Box>
  }

  if (query.isPending) return <Box className="companies-page company-result-page"><DetailSkeleton /></Box>

  if (query.isError) return <Box className="companies-page company-result-page">
    <Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>
    <section className="company-feedback" aria-labelledby="company-detail-error-title"><Typography id="company-detail-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la empresa</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/empresas">Volver al listado</Button></div></section>
  </Box>

  const company = query.data
  return <Box className="companies-page company-result-page company-fiche">
    <Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    {query.isFetching && query.isPlaceholderData && <Typography className="company-detail-loading" role="status">Actualizando ficha…</Typography>}
    <article aria-label={`Ficha de ${company.razonSocial}`}>
      <div className="company-fiche-summary">
        <header className="company-fiche-header">
          <span className="company-fiche-avatar" aria-hidden="true">{initials(company.razonSocial)}</span>
          <div className="company-fiche-identity">
            <div className="company-fiche-name">
              <h1>{company.razonSocial}</h1>
              <CompanyStatus value={company.estadoDescripcion} />
            </div>
            <div className="company-fiche-meta">
              {company.industria?.trim() && <span><BusinessOutlined />{company.industria.trim()}</span>}
              {company.cuit?.trim() && <span>CUIT {company.cuit.trim()}</span>}
              {latestActivity.data && <span><AccessTime />Última actividad registrada <time dateTime={latestActivity.data.fechaHora}>{new Date(latestActivity.data.fechaHora).toLocaleString('es-AR')}</time></span>}
            </div>
          </div>
          <div className="company-fiche-actions">
            <RegisterActivityButton context={{ label: company.razonSocial, idEmpresa }} onRegistered={() => setActivityRegistered(true)} showIcon />
            {canCreateOpportunity && <QuickOpportunityButton idEmpresa={idEmpresa} idOrigen={company.origenActivo === false ? null : company.idOrigen} label={company.razonSocial} primary />}
            <CompanyActions company={company} inDetail onRemoved={() => {
              navigate('/empresas', { state: { confirmation: confirmationFor('Empresa', 'dada de baja') } })
              void queryClient.invalidateQueries({ queryKey: empresaQueryKeys.all, refetchType: 'inactive' })
            }} />
          </div>
        </header>
      </div>
      <div className="company-fiche-grid">
        <div className="company-fiche-sidebar">
          <section className="company-fiche-card" aria-labelledby="company-info-heading">
            <header className="company-fiche-card-heading">
              <Typography component="h2" id="company-info-heading"><InfoOutlined fontSize="small" />Información general</Typography>
              {canManage && <Button component={RouterLink} to={`/empresas/${company.id}/editar`} state={{ companyFormBackground: location }} size="small" aria-label="Editar empresa">Modificar</Button>}
            </header>
            <ProfileRows rows={[
              { label: 'Responsable comercial', value: company.responsableNombre && <span className="company-fiche-owner"><span className="company-fiche-contact-avatar" aria-hidden="true">{initials(company.responsableNombre)}</span>{company.responsableNombre}{company.responsableActivo === false && ' (inactivo)'}</span> },
              { label: 'Contacto', value: <CompanyContactLinks company={company} /> },
              { label: 'Origen', value: company.origenDescripcion ? `${company.origenDescripcion}${company.origenActivo === false ? ' (inactivo)' : ''}` : undefined },
              { label: 'Dirección', value: company.direccion?.trim() },
              { label: 'Fecha de creación', value: company.fechaCreacion && <time className="company-fiche-created" dateTime={company.fechaCreacion}>{new Date(company.fechaCreacion).toLocaleString('es-AR')}</time> },
              ...(company.estadoActivo === false ? [{ label: 'Disponibilidad del estado', value: 'Estado inactivo para nuevas asignaciones' }] : []),
              { label: 'Observaciones internas', value: company.observaciones?.trim() },
            ]} />
          </section>
          <CompanyContacts key={idEmpresa} id={idEmpresa} />
        </div>
        <CommercialHistory key={idEmpresa} kind="empresas" id={idEmpresa} />
      </div>
    </article>
  </Box>
}
