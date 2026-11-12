import { Add, Refresh, Search, SearchOff } from '@mui/icons-material'
import { Alert, Box, Button, InputAdornment, Link, MenuItem, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { contactoQueryKeys, getCatalogOptions, listContacts, type Contacto } from '../../api/client'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { CompanyStatus } from '../companies/CompanyStatus'
import { cameFrom, contactFullName, displayValue } from '../shared/display'
import { confirmationFor } from '../shared/formUtils'
import { ContactCompanySelect } from './ContactCompanySelect'
import { ContactActions } from './ContactActions'
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

function ContactRows({ contacts, onOpen, onRemoved }: { contacts: Contacto[]; onOpen: (id: string | number) => void; onRemoved: () => void }) {
  const companyState = cameFrom(useLocation(), 'Volver a contactos')
  return <TableContainer className="data-table-wrap"><Table aria-label="Contactos" size="small">
    <caption className="visually-hidden">Listado de contactos</caption>
    <TableHead><TableRow>{columns.map((label) => <TableCell key={label} scope="col">{label}</TableCell>)}<TableCell scope="col"><span className="visually-hidden">Acciones</span></TableCell></TableRow></TableHead>
    <TableBody>{contacts.map((contact) => <TableRow key={contact.id} className="company-clickable-row" onClick={() => onOpen(contact.id)}>
      <TableCell className="company-name-cell"><Link component={RouterLink} to={`/contactos/${contact.id}`} aria-label={`Abrir ficha de ${contactFullName(contact)}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contactFullName(contact)}</Link></TableCell>
      <TableCell><CompanyStatus value={contact.estadoDescripcion} /></TableCell>
      <TableCell>{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} state={companyState} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(contact.empresaRazonSocial)}</Link> : displayValue(contact.empresaRazonSocial)}</TableCell>
      <TableCell>{displayValue(contact.cargo)}</TableCell>
      <TableCell><ContactEmail contact={contact} /></TableCell>
      <TableCell><ContactPhone contact={contact} /></TableCell>
      <TableCell>{displayValue(contact.origenDescripcion)}</TableCell>
      <TableCell>{displayValue(contact.responsableNombre)}{contact.responsableActivo === false ? ' (inactivo)' : ''}</TableCell>
      <TableCell align="right"><ContactActions contact={contact} onRemoved={onRemoved} /></TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function ContactCards({ contacts, onOpen, onRemoved }: { contacts: Contacto[]; onOpen: (id: string | number) => void; onRemoved: () => void }) {
  const companyState = cameFrom(useLocation(), 'Volver a contactos')
  return <ul className="company-record-list" aria-label="Contactos">
    {contacts.map((contact) => <li className="company-record company-clickable-record" key={contact.id} onClick={() => onOpen(contact.id)}>
      <div className="company-record-heading"><h2><Link component={RouterLink} to={`/contactos/${contact.id}`} aria-label={`Abrir ficha de ${contactFullName(contact)}`} underline="hover" onClick={(event) => event.stopPropagation()}>{contactFullName(contact)}</Link></h2><CompanyStatus value={contact.estadoDescripcion} /><ContactActions contact={contact} onRemoved={onRemoved} /></div>
      <dl className="company-record-fields">
        <div><dt>Empresa</dt><dd>{contact.idEmpresa ? <Link component={RouterLink} to={`/empresas/${contact.idEmpresa}`} state={companyState} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(contact.empresaRazonSocial)}</Link> : displayValue(contact.empresaRazonSocial)}</dd></div>
        <div><dt>Cargo</dt><dd>{displayValue(contact.cargo)}</dd></div>
        <div><dt>Correo</dt><dd><ContactEmail contact={contact} /></dd></div>
        <div><dt>Teléfono</dt><dd><ContactPhone contact={contact} /></dd></div>
        <div><dt>Origen</dt><dd>{displayValue(contact.origenDescripcion)}</dd></div>
        <div><dt>Responsable</dt><dd>{displayValue(contact.responsableNombre)}{contact.responsableActivo === false ? ' (inactivo)' : ''}</dd></div>
      </dl>
    </li>)}
  </ul>
}

function ContactListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando contactos">
    <TableContainer className="data-table-wrap company-skeleton-table"><Table aria-hidden="true" size="small">
      <TableHead><TableRow>{columns.map((label) => <TableCell key={label}>{label}</TableCell>)}<TableCell /></TableRow></TableHead>
      <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{columns.map((label, cell) => <TableCell key={label}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}<TableCell /></TableRow>)}</TableBody>
    </Table></TableContainer>
    <ul className="company-record-list company-skeleton-list" aria-hidden="true">{[0, 1, 2].map(row => <li className="company-record" key={row}><Skeleton width="62%" height={32} /><Skeleton width="44%" /><Skeleton width="76%" /><Skeleton width="36%" height={32} /></li>)}</ul>
  </div>
}

export function ContactsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [contactRemoved, setContactRemoved] = useState(false)
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
  const onRemoved = () => {
    setContactRemoved(true)
    if (data?.items.length === 1) setPage(current => Math.max(0, current - 1))
    void queryClient.invalidateQueries({ queryKey: contactoQueryKeys.all })
  }
  const filtered = Boolean(q || state || origin || responsible || company)
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Contactos</Typography><Typography className="companies-page-description">Personas compartidas por todo el equipo comercial.</Typography></div><Button component={RouterLink} to="/contactos/nuevo" state={{ contactFormBackground: location }} variant="contained" className="company-new-button" startIcon={<Add />}>Nuevo contacto</Button></header>
    {contactRemoved ? <Alert severity="success" className="record-form-confirmation" onClose={() => setContactRemoved(false)}>{confirmationFor('Contacto', 'dado de baja')}</Alert>
      : typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(0) }} className="record-filters">
      <TextField size="small" type="search" placeholder="Nombre, documento, correo…" value={search} onChange={e => setSearch(e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': 'Buscar contactos' }, input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <TextField size="small" select label="Estado" value={state} onChange={e => { setState(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{states.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <TextField size="small" select label="Origen" value={origin} onChange={e => { setOrigin(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{origins.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <Box className="record-filter-lookup"><ContactCompanySelect value={company} onChange={id => { setCompany(id); setPage(0) }} size="small" /></Box>
      <Box className="record-filter-lookup"><CompanyResponsibleSelect value={responsible} onChange={id => { setResponsible(id); setPage(0) }} size="small" /></Box>
      <Button type="submit">Buscar</Button><Button type="button" onClick={clear}>Limpiar filtros</Button>
    </Box>
    {(states.isError || origins.isError) && <Alert severity="warning" action={<Button onClick={() => { void states.refetch(); void origins.refetch() }}>Reintentar</Button>}>No pudimos cargar los filtros de catálogos.</Alert>}
    {isPending ? <ContactListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="contacts-error-title">
      <Typography id="contacts-error-title" component="h2" className="company-feedback-title">No pudimos cargar los contactos</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : <>
      <Typography role="status" className="record-count">{data.totalCount} {data.totalCount === 1 ? 'contacto' : 'contactos'}</Typography>
      <div className="company-table-panel">
      {data.items.length === 0 ? <section className="company-feedback" aria-labelledby="contacts-empty-title"><SearchOff className="company-empty-icon" /><Typography id="contacts-empty-title" component="h2" className="company-feedback-title">{filtered || page ? 'No hay contactos para estos filtros o página' : 'Todavía no hay contactos'}</Typography><Typography color="text.secondary">{filtered ? 'Probá con otra búsqueda o limpiá los filtros.' : 'Los contactos registrados van a aparecer en este listado.'}</Typography></section> : <>
        <div className="company-list-desktop"><ContactRows contacts={data.items} onOpen={(id) => navigate(`/contactos/${id}`)} onRemoved={onRemoved} /></div>
        <div className="company-list-mobile"><ContactCards contacts={data.items} onOpen={(id) => navigate(`/contactos/${id}`)} onRemoved={onRemoved} /></div>
      </>}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Contactos por página" labelDisplayedRows={({ from, to, count }) => `Mostrando ${from}–${to} de ${count}`} getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
      </div>
    </>}
  </Box></Box>
}
