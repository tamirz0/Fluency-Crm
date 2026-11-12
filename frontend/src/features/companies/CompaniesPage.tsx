import { Add, Refresh, Search, SearchOff } from '@mui/icons-material'
import { Alert, Box, Button, InputAdornment, Link, MenuItem, Skeleton, TablePagination, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { empresaQueryKeys, listCompanies, getCatalogOptions, type Empresa } from '../../api/client'
import { displayValue } from '../shared/display'
import { confirmationFor } from '../shared/formUtils'
import { CompanyActions } from './CompanyActions'
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

const companyHeadings = ['Razón social', 'Estado', 'Industria', 'Origen', 'Responsable', 'Contacto']

type CompanyListProps = { companies: Empresa[]; onOpen: (id: string | number) => void; onRemoved: () => void }

function DesktopRows({ companies, onOpen, onRemoved }: CompanyListProps) {
  return <TableContainer className="data-table-wrap">
    <Table aria-label="Empresas" size="small">
      <caption className="visually-hidden">Listado de empresas</caption>
      <TableHead><TableRow>
        {companyHeadings.map(heading => <TableCell key={heading} scope="col">{heading}</TableCell>)}
        <TableCell scope="col"><span className="visually-hidden">Acciones</span></TableCell>
      </TableRow></TableHead>
      <TableBody>{companies.map((company) => <TableRow key={company.id} className="company-clickable-row" onClick={() => onOpen(company.id)}>
        <TableCell className="company-name-cell"><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link><span className="company-cuit">{displayValue(company.cuit)}</span></TableCell>
        <TableCell><CompanyStatus value={company.estadoDescripcion} /></TableCell>
        <TableCell>{displayValue(company.industria)}</TableCell>
        <TableCell>{company.origenDescripcion ? <span className="company-origin">{company.origenDescripcion}</span> : '-'}</TableCell>
        <TableCell>{displayValue(company.responsableNombre)}{company.responsableActivo === false ? " (inactivo)" : ""}</TableCell>
        <TableCell><CompanyContact company={company} /></TableCell>
        <TableCell align="right"><CompanyActions company={company} onRemoved={onRemoved} /></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>
}

function MobileRecords({ companies, onOpen, onRemoved }: CompanyListProps) {
  return <ul className="company-record-list" aria-label="Empresas">
    {companies.map((company) => <li className="company-record company-clickable-record" key={company.id} onClick={() => onOpen(company.id)}>
      <div className="company-record-heading"><h2><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link></h2><CompanyStatus value={company.estadoDescripcion} /><CompanyActions company={company} onRemoved={onRemoved} /></div>
      <dl className="company-record-fields">
        <div><dt>CUIT</dt><dd>{displayValue(company.cuit)}</dd></div>
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
      <Table aria-hidden="true" size="small"><TableHead><TableRow>{companyHeadings.map(heading => <TableCell key={heading}>{heading}</TableCell>)}<TableCell /></TableRow></TableHead>
        <TableBody>{[0, 1, 2, 3].map(row => <TableRow key={row}>{companyHeadings.map(heading => <TableCell key={heading}><Skeleton width="75%" /></TableCell>)}<TableCell /></TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <ul className="company-record-list company-skeleton-list" aria-hidden="true">{[0, 1, 2].map((row) => <li className="company-record" key={row}><Skeleton width="62%" height={32} /><Skeleton width="44%" /><Skeleton width="76%" /><Skeleton width="36%" height={32} /></li>)}</ul>
  </div>
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [companyRemoved, setCompanyRemoved] = useState(false)
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
  const onRemoved = () => {
    setCompanyRemoved(true)
    if (data?.items.length === 1) setPage(current => Math.max(0, current - 1))
    void queryClient.invalidateQueries({ queryKey: empresaQueryKeys.all })
  }
  const clear = () => { setSearch(''); setQ(''); setState(''); setOrigin(''); setResponsible(''); setPage(0) }
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Empresas</Typography><Typography className="companies-page-description">Organizaciones compartidas por todo el equipo comercial.</Typography></div><Button component={RouterLink} to="/empresas/nueva" state={{ companyFormBackground: location }} variant="contained" className="company-new-button" startIcon={<Add />}>Nueva empresa</Button></header>
    {companyRemoved ? <Alert severity="success" className="record-form-confirmation" onClose={() => setCompanyRemoved(false)}>{confirmationFor('Empresa', 'dada de baja')}</Alert>
      : typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(0) }} className="record-filters">
      <TextField size="small" type="search" placeholder="Razón social, CUIT…" value={search} onChange={e => setSearch(e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': 'Buscar empresas' }, input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <TextField size="small" select label="Estado" value={state} onChange={e => { setState(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{states.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <TextField size="small" select label="Origen" value={origin} onChange={e => { setOrigin(e.target.value); setPage(0) }}><MenuItem value="">Todos</MenuItem>{origins.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}</TextField>
      <Box className="record-filter-lookup"><CompanyResponsibleSelect value={responsible} onChange={id => { setResponsible(id); setPage(0) }} size="small" /></Box>
      <Button type="submit">Buscar</Button><Button type="button" onClick={clear}>Limpiar filtros</Button>
    </Box>
    {(states.isError || origins.isError) && <Alert severity="warning" action={<Button onClick={() => { void states.refetch(); void origins.refetch() }}>Reintentar</Button>}>No pudimos cargar los filtros de catálogos.</Alert>}
    {isPending ? <CompanyListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="companies-error-title">
      <Typography id="companies-error-title" component="h2" className="company-feedback-title">No pudimos cargar las empresas</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : <>
      <Typography role="status" className="record-count">{data.totalCount} {data.totalCount === 1 ? 'empresa' : 'empresas'}</Typography>
      <div className="company-table-panel">
      {data.items.length === 0 ? <section className="company-feedback" aria-labelledby="companies-empty-title"><SearchOff className="company-empty-icon" /><Typography id="companies-empty-title" component="h2" className="company-feedback-title">{q || state || origin || responsible || page ? 'No hay empresas para estos filtros o página' : 'Todavía no hay empresas'}</Typography><Typography color="text.secondary">{q || state || origin || responsible ? 'Probá con otra búsqueda o limpiá los filtros.' : 'Las empresas registradas van a aparecer en este listado.'}</Typography></section> : <>
        <div className="company-list-desktop"><DesktopRows companies={data.items} onOpen={openCompany} onRemoved={onRemoved} /></div><div className="company-list-mobile"><MobileRecords companies={data.items} onOpen={openCompany} onRemoved={onRemoved} /></div>
      </>}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Empresas por página" labelDisplayedRows={({ from, to, count }) => `Mostrando ${from}–${to} de ${count}`} getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
      </div>
    </>}
  </Box></Box>
}
