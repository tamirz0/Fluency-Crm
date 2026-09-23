import { Refresh } from '@mui/icons-material'
import { Box, Button, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { contactoQueryKeys, getContacts, type Contacto } from '../../api/client'
import { CompanyStatus } from '../companies/CompanyStatus'
import { contactFullName, displayValue } from '../shared/display'
import { ListSearch, NoSearchResults } from '../shared/ListSearch'
import { matchesSearch } from '../shared/searchText'
import { sortByStatus } from '../shared/sortByStatus'
import '../companies/companies.css'
import './records.css'

function ContactEmail({ contact }: { contact: Contacto }) {
  return contact.correo?.trim()
    ? <Link href={`mailto:${contact.correo}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contact.correo}</Link>
    : <span className="company-muted">-</span>
}

function ContactPhone({ contact }: { contact: Contacto }) {
  return contact.telefono?.trim()
    ? <Link href={`tel:${contact.telefono}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contact.telefono}</Link>
    : <span className="company-muted">-</span>
}

function ContactRows({ contacts, onOpen }: { contacts: Contacto[]; onOpen: (id: string | number) => void }) {
  return <TableContainer className="company-table-wrap record-table-wrap"><Table aria-label="Contactos" className="company-table record-table contact-table">
    <caption className="visually-hidden">Listado de contactos</caption>
    <TableHead><TableRow><TableCell>Nombre completo</TableCell><TableCell>Estado</TableCell><TableCell>Empresa</TableCell><TableCell>Cargo</TableCell><TableCell>Correo</TableCell><TableCell>Teléfono</TableCell><TableCell>Origen</TableCell></TableRow></TableHead>
    <TableBody>{contacts.map((contact) => <TableRow key={contact.id} className="company-clickable-row" onClick={() => onOpen(contact.id)}>
      <TableCell className="company-name-cell"><Link component={RouterLink} to={`/contactos/${contact.id}`} aria-label={`Abrir ficha de ${contactFullName(contact)}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contactFullName(contact)}</Link></TableCell>
      <TableCell><CompanyStatus value={contact.estadoDescripcion} /></TableCell>
      <TableCell>{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(contact.empresaRazonSocial)}</Link> : displayValue(contact.empresaRazonSocial)}</TableCell>
      <TableCell>{displayValue(contact.cargo)}</TableCell>
      <TableCell><ContactEmail contact={contact} /></TableCell>
      <TableCell><ContactPhone contact={contact} /></TableCell>
      <TableCell>{displayValue(contact.origenDescripcion)}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function ContactListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando contactos">
    <TableContainer className="company-table-wrap record-table-wrap"><Table aria-hidden="true" className="company-table record-table contact-table">
      <TableHead><TableRow>{['Nombre completo', 'Estado', 'Empresa', 'Cargo', 'Correo', 'Teléfono', 'Origen'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5, 6].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
    </Table></TableContainer>
  </div>
}

export function ContactsPage() {
  const navigate = useNavigate()
  const openContact = (id: string | number) => navigate(`/contactos/${id}`)
  const { data, error, isPending, refetch } = useQuery({ queryKey: contactoQueryKeys.all, queryFn: getContacts })
  const [search, setSearch] = useState('')
  const filteredContacts = useMemo(() => sortByStatus((data ?? []).filter((contact) => matchesSearch([
    contactFullName(contact), displayValue(contact.empresaRazonSocial), displayValue(contact.cargo), displayValue(contact.estadoDescripcion),
    contact.correo, contact.telefono, displayValue(contact.origenDescripcion),
  ], search))), [data, search])
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Contactos</Typography><Typography className="companies-page-description">Personas vinculadas a las relaciones comerciales.</Typography></div><Button component={RouterLink} to="/contactos/nuevo" variant="contained">Nuevo contacto</Button></header>
    {isPending ? <ContactListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="contacts-error-title">
      <Typography id="contacts-error-title" component="h2" className="company-feedback-title">No pudimos cargar los contactos</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : data.length === 0 ? <section className="company-feedback" aria-labelledby="contacts-empty-title">
      <Typography id="contacts-empty-title" component="h2" className="company-feedback-title">Todavía no hay contactos</Typography><Typography color="text.secondary">Los contactos registrados van a aparecer en este listado.</Typography>
    </section> : <>
      <ListSearch label="contactos" query={search} onQueryChange={setSearch} resultCount={filteredContacts.length} totalCount={data.length} />
      {filteredContacts.length === 0 ? <NoSearchResults query={search} onClear={() => setSearch('')} /> : <ContactRows contacts={filteredContacts} onOpen={openContact} />}
    </>}
  </Box>
}
