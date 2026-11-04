import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, MenuItem, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { contactoQueryKeys, getCatalogOptions, listContacts, type Contacto } from '../../api/client'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { CompanyStatus } from '../companies/CompanyStatus'
import { contactFullName, displayValue } from '../shared/display'
import { ContactCompanySelect } from './ContactCompanySelect'
import '../companies/companies.css'
import './records.css'

const columns = ['Nombre completo', 'Estado', 'Empresa', 'Cargo', 'Correo', 'Teléfono', 'Origen', 'Responsable']

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
    <TableHead><TableRow>{columns.map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{contacts.map((contact) => <TableRow key={contact.id} className="company-clickable-row" onClick={() => onOpen(contact.id)}>
      <TableCell className="company-name-cell"><Link component={RouterLink} to={`/contactos/${contact.id}`} aria-label={`Abrir ficha de ${contactFullName(contact)}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contactFullName(contact)}</Link></TableCell>
      <TableCell><CompanyStatus value={contact.estadoDescripcion} /></TableCell>
      <TableCell>{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(contact.empresaRazonSocial)}</Link> : displayValue(contact.empresaRazonSocial)}</TableCell>
      <TableCell>{displayValue(contact.cargo)}</TableCell>
      <TableCell><ContactEmail contact={contact} /></TableCell>
      <TableCell><ContactPhone contact={contact} /></TableCell>
      <TableCell>{displayValue(contact.origenDescripcion)}</TableCell>
      <TableCell>{displayValue(contact.responsableNombre)}{contact.responsableActivo === false ? ' (inactivo)' : ''}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function ContactListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando contactos">
    <TableContainer className="company-table-wrap record-table-wrap"><Table aria-hidden="true" className="company-table record-table contact-table">
      <TableHead><TableRow>{columns.map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{columns.map((label, cell) => <TableCell key={label}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
    </Table></TableContainer>
  </div>
}

export function ContactsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [origin, setOrigin] = useState('')
  const [responsible, setResponsible] = useState('')
  const [company, setCompany] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const filters = { q, idEstado: state ? Number(state) : undefined, idOrigen: origin ? Number(origin) : undefined, idResponsable: responsible ? Number(responsible) : undefined, idEmpresa: company ? Number(company) : undefined, page: page + 1, pageSize }
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...contactoQueryKeys.all, 'list', filters], queryFn: () => listContacts(filters) })
  const states = useQuery({ queryKey: ['catalogos', 'estados-cliente'], queryFn: () => getCatalogOptions('estados-cliente') })
  const origins = useQuery({ queryKey: ['catalogos', 'origenes-comerciales'], queryFn: () => getCatalogOptions('origenes-comerciales') })
  const clear = () => { setSearch(''); setQ(''); setState(''); setOrigin(''); setResponsible(''); setCompany(''); setPage(0) }
  const filtered = Boolean(q || state || origin || responsible || company)
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Contactos</Typography><Typography className="companies-page-description">Personas compartidas por todo el equipo comercial.</Typography></div><Button component={RouterLink} to="/contactos/nuevo" variant="contained">Nuevo contacto</Button></header>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(0) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'start' }}>
      <TextField label="Buscar contactos" type="search" value={search} onChange={e => setSearch(e.target.value)} helperText="Nombre, documento, correo, teléfono o empresa" />
      <TextField select label="Estado" value={state} onChange={e => { setState(e.target.value); setPage(0) }} sx={{ minWidth: 160 }}><MenuItem value="">Todos</MenuItem>{states.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <TextField select label="Origen" value={origin} onChange={e => { setOrigin(e.target.value); setPage(0) }} sx={{ minWidth: 160 }}><MenuItem value="">Todos</MenuItem>{origins.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <Box sx={{ minWidth: 240, flex: '1 1 240px' }}><ContactCompanySelect value={company} onChange={id => { setCompany(id); setPage(0) }} helperText="Sin selección: todas las empresas" /></Box>
      <Box sx={{ minWidth: 240, flex: '1 1 240px' }}><CompanyResponsibleSelect value={responsible} onChange={id => { setResponsible(id); setPage(0) }} helperText="Sin selección: todos los responsables" /></Box>
      <Button type="submit" variant="outlined">Buscar</Button><Button type="button" onClick={clear}>Limpiar filtros</Button>
    </Box>
    {(states.isError || origins.isError) && <Alert severity="warning" action={<Button onClick={() => { void states.refetch(); void origins.refetch() }}>Reintentar</Button>}>No pudimos cargar los filtros de catálogos.</Alert>}
    {isPending ? <ContactListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="contacts-error-title">
      <Typography id="contacts-error-title" component="h2" className="company-feedback-title">No pudimos cargar los contactos</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : <>
      <Typography role="status" sx={{ mb: 2 }}>{data.totalCount} {data.totalCount === 1 ? 'contacto' : 'contactos'}</Typography>
      {data.items.length === 0 ? <section className="company-feedback" aria-labelledby="contacts-empty-title">
        <Typography id="contacts-empty-title" component="h2" className="company-feedback-title">{filtered || page ? 'No hay contactos para estos filtros o página' : 'Todavía no hay contactos'}</Typography><Typography color="text.secondary">Los contactos registrados van a aparecer en este listado.</Typography>
      </section> : <ContactRows contacts={data.items} onOpen={(id) => navigate(`/contactos/${id}`)} />}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Contactos por página" labelDisplayedRows={({ from, to, count }) => from + '–' + to + ' de ' + count} getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
    </>}
  </Box>
}
