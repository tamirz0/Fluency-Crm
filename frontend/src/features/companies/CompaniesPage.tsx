import { Business, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Link, MenuItem, Skeleton, TablePagination, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { empresaQueryKeys, listCompanies, getCatalogOptions, type Empresa } from '../../api/client'
import { displayValue } from '../shared/display'
import { CompanyStatus } from './CompanyStatus'
import { CompanyResponsibleSelect } from './CompanyResponsibleSelect'
import './companies.css'

function CompanyContact({ company }: { company: Empresa }) {
  const hasEmail = Boolean(company.correo?.trim())
  const hasPhone = Boolean(company.telefono?.trim())
  if (!hasEmail && !hasPhone) return <span className="company-muted">-</span>
  return <span className="company-contact-links">
    {hasEmail && <Link href={`mailto:${company.correo}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.correo}</Link>}
    {hasPhone && <Link href={`tel:${company.telefono}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.telefono}</Link>}
  </span>
}

function CompanyEmail({ company }: { company: Empresa }) {
  return company.correo?.trim()
    ? <Link href={`mailto:${company.correo}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.correo}</Link>
    : <span className="company-muted">-</span>
}

function CompanyPhone({ company }: { company: Empresa }) {
  return company.telefono?.trim()
    ? <Link href={`tel:${company.telefono}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.telefono}</Link>
    : <span className="company-muted">-</span>
}

function DesktopRows({ companies, onOpen }: { companies: Empresa[]; onOpen: (id: string | number) => void }) {
  return <TableContainer className="data-table-wrap">
    <Table aria-label="Empresas" size="small">
      <caption className="visually-hidden">Listado de empresas</caption>
      <TableHead><TableRow>
        <TableCell>Razón social</TableCell><TableCell>Estado</TableCell><TableCell>Industria</TableCell><TableCell>Correo</TableCell><TableCell>Teléfono</TableCell><TableCell>Origen</TableCell><TableCell>Responsable</TableCell>
      </TableRow></TableHead>
      <TableBody>{companies.map((company) => <TableRow key={company.id} className="company-clickable-row" onClick={() => onOpen(company.id)}>
        <TableCell className="company-name-cell"><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link></TableCell>
        <TableCell><CompanyStatus value={company.estadoDescripcion} /></TableCell>
        <TableCell>{displayValue(company.industria)}</TableCell>
        <TableCell><CompanyEmail company={company} /></TableCell>
        <TableCell><CompanyPhone company={company} /></TableCell>
        <TableCell>{displayValue(company.origenDescripcion)}</TableCell><TableCell>{displayValue(company.responsableNombre)}{company.responsableActivo === false ? " (inactivo)" : ""}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>
}

function MobileRecords({ companies, onOpen }: { companies: Empresa[]; onOpen: (id: string | number) => void }) {
  return <ul className="company-record-list" aria-label="Empresas">
    {companies.map((company) => <li className="company-record company-clickable-record" key={company.id} onClick={() => onOpen(company.id)}>
      <div className="company-record-heading"><h2><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link></h2><CompanyStatus value={company.estadoDescripcion} /></div>
      <dl className="company-record-fields">
        <div><dt>Responsable</dt><dd>{displayValue(company.responsableNombre)}{company.responsableActivo === false ? " (inactivo)" : ""}</dd></div><div><dt>Industria</dt><dd>{displayValue(company.industria)}</dd></div>
        <div><dt>Origen</dt><dd>{displayValue(company.origenDescripcion)}</dd></div>
        <div className="company-record-contact"><dt>Contacto</dt><dd><CompanyContact company={company} /></dd></div>
      </dl>
    </li>)}
  </ul>
}

function CompanyListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando empresas">
    <TableContainer className="data-table-wrap company-skeleton-table">
      <Table aria-hidden="true" size="small"><TableHead><TableRow>{['Razón social', 'Estado', 'Industria', 'Correo', 'Teléfono', 'Origen'].map((heading) => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
        <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <ul className="company-record-list company-skeleton-list" aria-hidden="true">{[0, 1, 2].map((row) => <li className="company-record" key={row}><Skeleton width="62%" height={32} /><Skeleton width="44%" /><Skeleton width="76%" /><Skeleton width="36%" height={32} /></li>)}</ul>
  </div>
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [origin, setOrigin] = useState('')
  const [responsible, setResponsible] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const filters = { q, idEstado: state ? Number(state) : undefined, idOrigen: origin ? Number(origin) : undefined, idResponsable: responsible ? Number(responsible) : undefined, page: page + 1, pageSize }
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...empresaQueryKeys.all, 'list', filters], queryFn: () => listCompanies(filters) })
  const states = useQuery({ queryKey: ['catalogos', 'estados-cliente'], queryFn: () => getCatalogOptions('estados-cliente') })
  const origins = useQuery({ queryKey: ['catalogos', 'origenes-comerciales'], queryFn: () => getCatalogOptions('origenes-comerciales') })
  const openCompany = (id: string | number) => navigate('/empresas/' + id)
  const clear = () => { setSearch(''); setQ(''); setState(''); setOrigin(''); setResponsible(''); setPage(0) }
  return <Box className="companies-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Empresas</Typography><Typography className="companies-page-description">Organizaciones compartidas por todo el equipo comercial.</Typography></div><Button component={RouterLink} to="/empresas/nueva" variant="contained">Nueva empresa</Button></header>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(0) }} className="record-filters">
      <TextField label="Buscar empresas" type="search" value={search} onChange={e => setSearch(e.target.value)} helperText="Razón social, CUIT, correo o teléfono" />
      <TextField select label="Estado" value={state} onChange={e => { setState(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{states.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <TextField select label="Origen" value={origin} onChange={e => { setOrigin(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{origins.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <Box className="record-filter-lookup"><CompanyResponsibleSelect value={responsible} onChange={id => { setResponsible(id); setPage(0) }} helperText="Sin selección: todos los responsables" /></Box>
      <Button type="submit" variant="outlined">Buscar</Button><Button type="button" onClick={clear}>Limpiar filtros</Button>
    </Box>
    {(states.isError || origins.isError) && <Alert severity="warning" action={<Button onClick={() => { void states.refetch(); void origins.refetch() }}>Reintentar</Button>}>No pudimos cargar los filtros de catálogos.</Alert>}
    {isPending ? <CompanyListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="companies-error-title">
      <Typography id="companies-error-title" component="h2" className="company-feedback-title">No pudimos cargar las empresas</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : <>
      <Typography role="status" className="record-count">{data.totalCount} {data.totalCount === 1 ? 'empresa' : 'empresas'}</Typography>
      {data.items.length === 0 ? <section className="company-feedback" aria-labelledby="companies-empty-title"><Business className="company-empty-icon" aria-hidden="true" /><Typography id="companies-empty-title" component="h2" className="company-feedback-title">{q || state || origin || responsible || page ? 'No hay empresas para estos filtros o página' : 'Todavía no hay empresas'}</Typography><Typography color="text.secondary">Las empresas registradas van a aparecer en este listado.</Typography></section> : <>
        <div className="company-list-desktop"><DesktopRows companies={data.items} onOpen={openCompany} /></div><div className="company-list-mobile"><MobileRecords companies={data.items} onOpen={openCompany} /></div>
      </>}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Empresas por página" labelDisplayedRows={({ from, to, count }) => from + '–' + to + ' de ' + count} getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
    </>}
  </Box>
}
