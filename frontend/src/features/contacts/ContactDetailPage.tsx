import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { Edit } from '@mui/icons-material'
import { ApiRequestError, contactoQueryKeys, getContact, type Contacto } from '../../api/client'
import { CompanyStatus } from '../companies/CompanyStatus'
import { contactFullName, displayValue, parsePositiveId } from '../shared/display'
import '../companies/companies.css'
import './records.css'

function ContactField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><dt>{label}</dt><dd>{children || <span className="company-muted">Sin informar</span>}</dd></div>
}

function ContactSkeleton() {
  return <div className="company-detail-skeleton" aria-label="Cargando detalle del contacto" role="status">
    <Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} />
    {[0, 1, 2].map((section) => <section className="company-detail-section" key={section} aria-hidden="true"><Skeleton width={180} height={28} /><div className="company-detail-skeleton-fields"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div></section>)}
  </div>
}

function ContactDetails({ contact }: { contact: Contacto }) {
  const hasEmail = Boolean(contact.correo?.trim())
  const hasPhone = Boolean(contact.telefono?.trim())
  return <article className="company-sheet" aria-label={`Ficha de ${contactFullName(contact)}`}>
    <section className="company-detail-section" aria-labelledby="contact-identification-heading">
      <Typography component="h2" id="contact-identification-heading" className="company-section-heading">Identificación</Typography>
      <dl className="company-detail-fields"><ContactField label="Documento">{contact.documento?.trim()}</ContactField><ContactField label="Cargo">{contact.cargo?.trim()}</ContactField></dl>
    </section>
    <section className="company-detail-section" aria-labelledby="contact-commercial-heading">
      <Typography component="h2" id="contact-commercial-heading" className="company-section-heading">Datos comerciales</Typography>
      <dl className="company-detail-fields"><ContactField label="Estado"><CompanyStatus value={contact.estadoDescripcion} /></ContactField><ContactField label="Origen">{contact.origenDescripcion?.trim()}</ContactField></dl>
    </section>
    <section className="company-detail-section" aria-labelledby="contact-method-heading">
      <Typography component="h2" id="contact-method-heading" className="company-section-heading">Contacto</Typography>
      <dl className="company-detail-fields"><ContactField label="Correo y teléfono"><span className="record-contact-links">{hasEmail && <Link href={`mailto:${contact.correo}`} underline="hover">{contact.correo}</Link>}{hasPhone && <Link href={`tel:${contact.telefono}`} underline="hover">{contact.telefono}</Link>}{!hasEmail && !hasPhone && 'Sin informar'}</span></ContactField></dl>
    </section>
    <section className="company-detail-section" aria-labelledby="contact-company-heading">
      <Typography component="h2" id="contact-company-heading" className="company-section-heading">Empresa relacionada</Typography>
      <dl className="company-detail-fields"><ContactField label="Empresa">{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} underline="hover">{displayValue(contact.empresaRazonSocial)}</Link> : contact.empresaRazonSocial?.trim()}</ContactField></dl>
    </section>
    <section className="company-detail-section" aria-labelledby="contact-notes-heading">
      <Typography component="h2" id="contact-notes-heading" className="company-section-heading">Observaciones</Typography>
      <p className="company-observations">{contact.observaciones?.trim() || <span className="company-muted">Sin informar</span>}</p>
    </section>
  </article>
}

export function ContactDetailPage() {
  const { idContacto: routeId } = useParams()
  const location = useLocation()
  const idContacto = parsePositiveId(routeId)
  const queryClient = useQueryClient()
  const cachedContact = idContacto === undefined ? undefined : queryClient.getQueryData<Contacto[]>(contactoQueryKeys.all)?.find((contact) => String(contact.id) === String(idContacto))
  const query = useQuery({ queryKey: contactoQueryKeys.detail(idContacto ?? 0), queryFn: () => getContact(idContacto as number), enabled: idContacto !== undefined, placeholderData: cachedContact })

  if (idContacto === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404)) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos ese contacto</Typography><Typography color="text.secondary">El enlace puede estar vencido o el contacto ya no está disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><ContactSkeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link><section className="company-feedback"><Typography component="h1" className="company-feedback-title">No pudimos cargar los datos del contacto</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button><Button component={RouterLink} to="/contactos">Volver al listado</Button></div></section></Box>

  const contact = query.data
  return <Box className="companies-page company-result-page records-page">
    <Link component={RouterLink} to="/contactos" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a contactos</Link>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <header className="company-detail-header"><div><Typography component="h1" className="companies-page-title">{contactFullName(contact)}</Typography></div><div className="company-detail-header-actions"><CompanyStatus value={contact.estadoDescripcion} /><Button component={RouterLink} to={`/contactos/${contact.id}/editar`} variant="contained" startIcon={<Edit />}>Editar contacto</Button></div></header>
    {query.isFetching && query.isPlaceholderData && <Typography className="company-detail-loading" role="status">Actualizando ficha…</Typography>}
    <ContactDetails contact={contact} />
  </Box>
}
