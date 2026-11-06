import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Edit } from '@mui/icons-material'
import { ApiRequestError, contactoQueryKeys, deleteContact, getContact, type Contacto } from '../../api/client'
import { CompanyStatus } from '../companies/CompanyStatus'
import { contactFullName, displayValue, parsePositiveId } from '../shared/display'
import { useAuth } from '../../auth/useAuth'
import { confirmationFor } from '../shared/formUtils'
import { CommercialHistory } from '../activities/CommercialHistory'
import { RegisterActivityButton } from '../activities/ActivityForm'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { ProfileHeader, ProfileRows, ProfileStats } from '../shared/RecordProfile'
import '../companies/companies.css'
import './records.css'

function ContactSkeleton() {
  return <div className="company-detail-skeleton" aria-label="Cargando detalle del contacto" role="status">
    <Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} />
    {[0, 1, 2].map((section) => <section className="company-detail-section" key={section} aria-hidden="true"><Skeleton width={180} height={28} /><div className="company-detail-skeleton-fields"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></section>)}
  </div>
}

function ContactProfile({ contact, actions }: { contact: Contacto; actions: ReactNode }) {
  const name = contactFullName(contact)
  const hasEmail = Boolean(contact.correo?.trim())
  const hasPhone = Boolean(contact.telefono?.trim())
  return <article className="profile-sheet" aria-label={`Ficha de ${name}`}>
    <ProfileHeader name={name} subtitle={contact.cargo} status={<CompanyStatus value={contact.estadoDescripcion} />} actions={actions} />
    <ProfileStats items={[
      { label: 'Responsable', value: contact.responsableNombre + (contact.responsableActivo ? '' : ' (inactivo)') },
      { label: 'Origen', value: contact.origenDescripcion ? contact.origenDescripcion + (contact.origenActivo === false ? ' (inactivo)' : '') : undefined },
      { label: 'Fecha de creación', value: new Date(contact.fechaCreacion).toLocaleString('es-AR') },
    ]} />
    <ProfileRows rows={[
      { label: 'Contacto', value: (hasEmail || hasPhone) && <span className="record-contact-links">{hasEmail && <Link href={`mailto:${contact.correo}`} underline="hover">{contact.correo}</Link>}{hasPhone && <Link href={`tel:${contact.telefono}`} underline="hover">{contact.telefono}</Link>}</span> },
      { label: 'Empresa', value: contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} underline="hover">{displayValue(contact.empresaRazonSocial)}</Link> : contact.empresaRazonSocial?.trim() },
      { label: 'Documento', value: contact.documento?.trim() },
      ...(contact.estadoActivo === false ? [{ label: 'Disponibilidad del estado', value: 'Estado inactivo para nuevas asignaciones' }] : []),
      { label: 'Observaciones', value: contact.observaciones?.trim() },
    ]} />
  </article>
}

export function ContactDetailPage() {
  const { idContacto: routeId } = useParams()
  const canCreateOpportunity = Boolean(useAuth().user?.permisos?.includes('GestionarOportunidad'))
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activityRegistered, setActivityRegistered] = useState(false)
  const idContacto = parsePositiveId(routeId)
  const query = useQuery({ queryKey: contactoQueryKeys.detail(idContacto ?? 0), queryFn: () => getContact(idContacto as number), enabled: idContacto !== undefined })

  if (idContacto === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos ese contacto</Typography><Typography color="text.secondary">El enlace puede estar vencido o el contacto ya no está disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><ContactSkeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar los datos del contacto</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/contactos">Volver al listado</Button></div></section></Box>

  const contact = query.data
  return <Box className="companies-page company-result-page records-page">
    <Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link>
    {activityRegistered && <Alert severity="success" className="record-form-confirmation">Actividad registrada.</Alert>}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <ContactProfile contact={contact} actions={<>{canCreateOpportunity && <Button component={RouterLink} to={`/oportunidades/nueva?idContacto=${contact.id}`} variant="outlined">Nueva oportunidad</Button>}<RegisterActivityButton context={{ label: contactFullName(contact), idContacto: Number(contact.id) }} onRegistered={() => setActivityRegistered(true)} /><Button component={RouterLink} to={`/contactos/${contact.id}/editar`} variant="contained" startIcon={<Edit />}>Editar contacto</Button>
      <RemoveRecordButton noun="contacto" name={contactFullName(contact)} remove={() => deleteContact(Number(contact.id))} onRemoved={() => {
        navigate('/contactos', { state: { confirmation: confirmationFor('Contacto', 'dado de baja') } })
        void queryClient.invalidateQueries({ queryKey: contactoQueryKeys.all, refetchType: 'inactive' })
      }} /></>} />
    <CommercialHistory kind="contactos" id={Number(contact.id)} />
  </Box>
}
