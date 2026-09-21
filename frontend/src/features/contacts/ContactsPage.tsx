import { Refresh } from '@mui/icons-material'
import { Box, Button, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { contactoQueryKeys, getContacts, type Contacto } from '../../api/client'
import { CompanyStatus } from '../companies/CompanyStatus'
import { contactFullName, displayValue } from '../shared/display'
import '../companies/companies.css'
import './records.css'

function contactAddress(contact: Contacto) {
  return <span className="record-contact-links">
    {contact.correo?.trim() && <Link href={`mailto:${contact.correo}`} underline="hover">{contact.correo}</Link>}
    {contact.telefono?.trim() && <Link href={`tel:${contact.telefono}`} underline="hover">{contact.telefono}</Link>}
    {!contact.correo?.trim() && !contact.telefono?.trim() && <span className="company-muted">Sin informar</span>}
  </span>
}

function ContactRows({ contacts }: { contacts: Contacto[] }) {
  return <TableContainer className="company-table-wrap record-table-wrap"><Table aria-label="Contactos" className="company-table record-table contact-table">
    <caption className="visually-hidden">Listado de contactos</caption>
    <TableHead><TableRow><TableCell>Nombre completo</TableCell><TableCell>Empresa</TableCell><TableCell>Cargo</TableCell><TableCell>Estado</TableCell><TableCell>Correo y teléfono</TableCell><TableCell>Origen</TableCell><TableCell align="right">Acción</TableCell></TableRow></TableHead>
    <TableBody>{contacts.map((contact) => <TableRow key={contact.id}>
      <TableCell className="company-name-cell">{contactFullName(contact)}</TableCell>
      <TableCell>{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} underline="hover">{displayValue(contact.empresaRazonSocial)}</Link> : displayValue(contact.empresaRazonSocial)}</TableCell>
      <TableCell>{displayValue(contact.cargo)}</TableCell>
      <TableCell><CompanyStatus value={contact.estadoDescripcion} /></TableCell>
      <TableCell>{contactAddress(contact)}</TableCell>
      <TableCell>{displayValue(contact.origenDescripcion)}</TableCell>
      <TableCell align="right"><Link component={RouterLink} to={`/contactos/${contact.id}`} aria-label={`Ver detalle de ${contactFullName(contact)}`} underline="hover">Ver detalle</Link></TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function ContactListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando contactos">
    <TableContainer className="company-table-wrap record-table-wrap"><Table aria-hidden="true" className="company-table record-table contact-table">
      <TableHead><TableRow>{['Nombre completo', 'Empresa', 'Cargo', 'Estado', 'Correo y teléfono', 'Origen', 'Acción'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5, 6].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
    </Table></TableContainer>
  </div>
}

export function ContactsPage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: contactoQueryKeys.all, queryFn: getContacts })
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Contactos</Typography><Typography className="companies-page-description">Personas vinculadas a las relaciones comerciales.</Typography></div></header>
    {isPending ? <ContactListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="contacts-error-title">
      <Typography id="contacts-error-title" component="h2" className="company-feedback-title">No pudimos cargar los contactos</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : data.length === 0 ? <section className="company-feedback" aria-labelledby="contacts-empty-title">
      <Typography id="contacts-empty-title" component="h2" className="company-feedback-title">Todavía no hay contactos</Typography><Typography color="text.secondary">Los contactos registrados van a aparecer en este listado.</Typography>
    </section> : <ContactRows contacts={data} />}
  </Box>
}
