import { AccessTime, ArrowBack, BadgeOutlined, BusinessOutlined, InfoOutlined, Refresh, WorkOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, contactoQueryKeys, getContact, getContactAcademic, listActivities, type Asistencia, type Contacto } from '../../api/client'
import { AttendanceSummary } from '../students/AttendanceSummary'
import { CompanyStatus } from '../companies/CompanyStatus'
import { backTarget, cameFrom, contactFullName, contactNaturalName, displayValue, initials, parsePositiveId, returnState } from '../shared/display'
import { useAuth } from '../../auth/useAuth'
import { confirmationFor } from '../shared/formUtils'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { QuickOpportunityButton } from '../opportunities/QuickOpportunityButton'
import { ProfileRows } from '../shared/RecordProfile'
import { ContactActions } from './ContactActions'
import '../companies/companies.css'
import '../companies/company-detail.css'
import './records.css'

function ContactSkeleton() {
  return <div className="company-detail-skeleton" aria-label="Cargando detalle del contacto" role="status">
    <Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} />
    {[0, 1, 2].map((section) => <section className="company-detail-section" key={section} aria-hidden="true"><Skeleton width={180} height={28} /><div className="company-detail-skeleton-fields"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></section>)}
  </div>
}

function ContactProfile({ contact, actions, attendance, latestActivity, onEdit }: { contact: Contacto; actions: ReactNode; attendance?: Asistencia; latestActivity?: { fechaHora: string }; onEdit: ReactNode }) {
  const name = contactFullName(contact)
  const companyState = cameFrom(useLocation(), 'Volver al contacto')
  const hasEmail = Boolean(contact.correo?.trim())
  const hasPhone = Boolean(contact.telefono?.trim())
  return <article aria-label={`Ficha de ${name}`}>
    <div className="company-fiche-summary">
      <header className="company-fiche-header">
        <span className="company-fiche-avatar" aria-hidden="true">{initials(name)}</span>
        <div className="company-fiche-identity">
          <div className="company-fiche-name"><h1>{name}</h1><CompanyStatus value={contact.estadoDescripcion} /></div>
          <div className="company-fiche-meta">
            {contact.cargo?.trim() && <span><WorkOutlined />{contact.cargo.trim()}</span>}
            {contact.idEmpresa && <span><BusinessOutlined /><Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} state={companyState} underline="hover">{displayValue(contact.empresaRazonSocial)}</Link></span>}
            {contact.documento?.trim() && <span><BadgeOutlined />{contact.documento.trim()}</span>}
            {latestActivity && <span><AccessTime />Última actividad registrada <time dateTime={latestActivity.fechaHora}>{new Date(latestActivity.fechaHora).toLocaleString('es-AR')}</time></span>}
          </div>
        </div>
        <div className="company-fiche-actions">{actions}</div>
      </header>
    </div>
    <div className="company-fiche-grid">
      <div className="company-fiche-sidebar">
        <section className="company-fiche-card" aria-labelledby="contact-info-heading">
          <header className="company-fiche-card-heading">
            <Typography component="h2" id="contact-info-heading"><InfoOutlined fontSize="small" />Información general</Typography>
            {onEdit}
          </header>
          <ProfileRows rows={[
            { label: 'Responsable comercial', value: contact.responsableNombre && <span className="company-fiche-owner"><span className="company-fiche-contact-avatar" aria-hidden="true">{initials(contact.responsableNombre)}</span>{contact.responsableNombre}{contact.responsableActivo === false && ' (inactivo)'}</span> },
            { label: 'Contacto', value: (hasEmail || hasPhone) && <span className="record-contact-links">{hasEmail && <Link href={`mailto:${contact.correo}`} underline="hover">{contact.correo}</Link>}{hasPhone && <Link href={`tel:${contact.telefono}`} underline="hover">{contact.telefono}</Link>}</span> },
            { label: 'Empresa', value: contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} state={companyState} underline="hover">{displayValue(contact.empresaRazonSocial)}</Link> : contact.empresaRazonSocial?.trim() },
            { label: 'Documento', value: contact.documento?.trim() },
            { label: 'Cargo', value: contact.cargo?.trim() },
            { label: 'Origen', value: contact.origenDescripcion ? contact.origenDescripcion + (contact.origenActivo === false ? ' (inactivo)' : '') : undefined },
            { label: 'Fecha de creación', value: <time className="company-fiche-created" dateTime={contact.fechaCreacion}>{new Date(contact.fechaCreacion).toLocaleString('es-AR')}</time> },
            ...(contact.estadoActivo === false ? [{ label: 'Disponibilidad del estado', value: 'Estado inactivo para nuevas asignaciones' }] : []),
            { label: 'Observaciones', value: contact.observaciones?.trim() },
          ]} />
        </section>
        {attendance && <section className="company-fiche-card contact-attendance"><AttendanceSummary data={attendance} /></section>}
      </div>
      <CommercialHistory kind="contactos" id={Number(contact.id)} />
    </div>
  </article>
}

export function ContactDetailPage() {
  const { idContacto: routeId } = useParams()
  const canCreateOpportunity = Boolean(useAuth().user?.permisos?.includes('GestionarOportunidad'))
  const canManage = Boolean(useAuth().user?.permisos?.includes('GestionarClientes'))
  const location = useLocation()
  const back = backTarget(location.state, { to: '/contactos', label: 'Volver a contactos' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activityRegistered, setActivityRegistered] = useState(false)
  const idContacto = parsePositiveId(routeId)
  const query = useQuery({ queryKey: contactoQueryKeys.detail(idContacto ?? 0), queryFn: () => getContact(idContacto as number), enabled: idContacto !== undefined })

  const academic = useQuery({ queryKey: [...contactoQueryKeys.detail(idContacto ?? 0), 'academico'], queryFn: () => getContactAcademic(idContacto as number), enabled: idContacto !== undefined, retry: false })
  const latestActivity = useQuery({ queryKey: ['actividades', 'ultima-por-contacto', idContacto], queryFn: () => listActivities({ idContacto, page: 1, pageSize: 1 }), enabled: query.isSuccess, select: data => data.items[0] })
  if (idContacto === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos ese contacto</Typography><Typography color="text.secondary">El enlace puede estar vencido o el contacto ya no está disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><ContactSkeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar los datos del contacto</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/contactos">Volver al listado</Button></div></section></Box>

  const contact = query.data
  return <Box className="companies-page company-result-page records-page company-fiche contact-fiche">
    <Link component={RouterLink} to={back.to} state={returnState(back)} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <ContactProfile contact={contact} attendance={academic.data?.alumno} latestActivity={latestActivity.data} onEdit={canManage && <Button component={RouterLink} to={`/contactos/${contact.id}/editar`} state={{ contactFormBackground: location }} size="small" aria-label="Editar contacto">Modificar</Button>} actions={<><RegisterActivityButton context={{ label: contactFullName(contact), idContacto: Number(contact.id) }} onRegistered={() => setActivityRegistered(true)} showIcon />{canCreateOpportunity && <QuickOpportunityButton idContacto={Number(contact.id)} {...(contact.idEmpresa == null ? {} : { idEmpresa: Number(contact.idEmpresa) })} idOrigen={contact.origenActivo === false ? null : contact.idOrigen} label={contactNaturalName(contact)} primary />}
      <ContactActions contact={contact} inDetail onRemoved={() => {
        navigate('/contactos', { state: { confirmation: confirmationFor('Contacto', 'dado de baja') } })
        void queryClient.invalidateQueries({ queryKey: contactoQueryKeys.all, refetchType: 'inactive' })
      }} /></>} />
  </Box>
}
