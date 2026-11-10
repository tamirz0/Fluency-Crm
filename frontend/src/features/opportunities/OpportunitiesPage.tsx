import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, MenuItem, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { getCatalogOptions, listFunnels, listOpportunities, opportunityQueryKeys, type Oportunidad, type OportunidadQuery } from '../../api/client'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { displayValue, formatCommercialDate } from '../shared/display'
import { money, stateLabels } from './opportunityData'
import '../contacts/records.css'
import '../companies/companies.css'

const columns = ['Título', 'Embudo', 'Etapa', 'Empresa', 'Contacto', 'Responsable', 'Valor', 'Cierre estimado']
const nowrapColumns = ['Valor', 'Cierre estimado']

function Rows({ items, onOpen }: { items: Oportunidad[]; onOpen: (id: number | string) => void }) {
  return <TableContainer className="data-table-wrap"><Table aria-label="Oportunidades" size="small">
    <caption className="visually-hidden">Listado de oportunidades</caption>
    <TableHead><TableRow>{columns.map((column) => <TableCell key={column} className={nowrapColumns.includes(column) ? 'nowrap' : undefined}>{column}</TableCell>)}</TableRow></TableHead>
    <TableBody>{items.map((item) => <TableRow key={item.id} className="company-clickable-row" onClick={() => onOpen(item.id)}>
      <TableCell className="company-name-cell"><Link component={RouterLink} to={`/oportunidades/${item.id}`} aria-label={`Abrir ficha de ${item.tituloVisible}`} underline="hover" onClick={(event) => event.stopPropagation()}>{item.tituloVisible}</Link></TableCell>
      <TableCell>{item.embudoNombre}{item.embudoActivo ? '' : ' (inactivo)'}</TableCell>
      <TableCell><Chip className="company-status company-stage-chip" label={`${item.etapaNombre} · ${stateLabels[item.estado] ?? item.estado}`} size="small" /></TableCell>
      <TableCell><CompanyLink item={item} /></TableCell>
      <TableCell><ContactLink item={item} /></TableCell>
      <TableCell>{item.responsableNombre}{item.responsableActivo ? '' : ' (inactivo)'}</TableCell>
      <TableCell className="nowrap">{money(item.valor)}</TableCell>
      <TableCell className="nowrap">{formatCommercialDate(item.fechaEstimadaCierre)}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function CompanyLink({ item }: { item: Oportunidad }) {
  return item.idEmpresa ? <Link component={RouterLink} to={`/empresas/${item.idEmpresa}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(item.empresaRazonSocial)}</Link> : <>-</>
}

function ContactLink({ item }: { item: Oportunidad }) {
  return item.idContacto ? <Link component={RouterLink} to={`/contactos/${item.idContacto}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(item.contactoNombre)}</Link> : <>-</>
}

function Cards({ items, onOpen }: { items: Oportunidad[]; onOpen: (id: number | string) => void }) {
  return <ul className="company-record-list" aria-label="Oportunidades">
    {items.map((item) => <li className="company-record company-clickable-record" key={item.id} onClick={() => onOpen(item.id)}>
      <div className="company-record-heading"><h2><Link component={RouterLink} to={`/oportunidades/${item.id}`} aria-label={`Abrir ficha de ${item.tituloVisible}`} underline="hover" onClick={(event) => event.stopPropagation()}>{item.tituloVisible}</Link></h2><Chip className="company-status company-stage-chip" label={`${item.etapaNombre} · ${stateLabels[item.estado] ?? item.estado}`} size="small" /></div>
      <dl className="company-record-fields">
        <div><dt>Embudo</dt><dd>{item.embudoNombre}{item.embudoActivo ? '' : ' (inactivo)'}</dd></div>
        <div><dt>Responsable</dt><dd>{item.responsableNombre}{item.responsableActivo ? '' : ' (inactivo)'}</dd></div>
        <div><dt>Empresa</dt><dd><CompanyLink item={item} /></dd></div>
        <div><dt>Contacto</dt><dd><ContactLink item={item} /></dd></div>
        <div><dt>Valor</dt><dd>{money(item.valor)}</dd></div>
        <div><dt>Cierre estimado</dt><dd>{formatCommercialDate(item.fechaEstimadaCierre)}</dd></div>
      </dl>
    </li>)}
  </ul>
}

function OpportunityListSkeleton() {
  return <div role="status" aria-label="Cargando oportunidades"><TableContainer className="data-table-wrap"><Table aria-hidden="true" size="small">
    <TableHead><TableRow>{columns.map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{columns.map((label, cell) => <TableCell key={label}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
  </Table></TableContainer></div>
}

/** Listado compartido: todas las oportunidades vigentes, con filtros y paginación del servidor. */
export function OpportunitiesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [state, setState] = useState('')
  const [origin, setOrigin] = useState('')
  const [funnel, setFunnel] = useState('')
  const [responsible, setResponsible] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const filters: OportunidadQuery = {
    ...(q ? { q } : {}), ...(state ? { estado: state as OportunidadQuery['estado'] } : {}), ...(origin ? { idOrigen: Number(origin) } : {}),
    ...(funnel ? { idEmbudo: Number(funnel) } : {}), ...(responsible ? { idResponsable: Number(responsible) } : {}), page: page + 1, pageSize,
  }
  const { data, error, isPending, refetch } = useQuery({ queryKey: opportunityQueryKeys.list(filters), queryFn: () => listOpportunities(filters) })
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const origins = useQuery({ queryKey: ['catalogos', 'origenes-comerciales'], queryFn: () => getCatalogOptions('origenes-comerciales') })
  const filtered = Boolean(q || state || origin || funnel || responsible)
  const clear = () => { setSearch(''); setQ(''); setState(''); setOrigin(''); setFunnel(''); setResponsible(''); setPage(0) }
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Oportunidades</Typography><Typography className="companies-page-description">Negociaciones compartidas por todo el equipo comercial.</Typography></div><Button component={RouterLink} to="/oportunidades/nueva" variant="contained">Nueva oportunidad</Button></header>
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <Box component="form" onSubmit={(event) => { event.preventDefault(); setQ(search.trim()); setPage(0) }} className="record-filters">
      <TextField label="Buscar oportunidades" type="search" value={search} onChange={(event) => setSearch(event.target.value)} helperText="Título, empresa o contacto" />
      <TextField select label="Estado" value={state} onChange={(event) => { setState(event.target.value); setPage(0) }}>
        <MenuItem value="">Todos</MenuItem>{Object.entries(stateLabels).map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
      </TextField>
      <TextField select label="Embudo" value={funnel} onChange={(event) => { setFunnel(event.target.value); setPage(0) }}>
        <MenuItem value="">Todos</MenuItem>{funnels.data?.items.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}{item.activo ? '' : ' (inactivo)'}</MenuItem>)}
      </TextField>
      <TextField select label="Origen" value={origin} onChange={(event) => { setOrigin(event.target.value); setPage(0) }}>
        <MenuItem value="">Todos</MenuItem>{origins.data?.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.descripcion}</MenuItem>)}
      </TextField>
      <Box className="record-filter-lookup"><CompanyResponsibleSelect value={responsible} onChange={(id) => { setResponsible(id); setPage(0) }} helperText="Sin selección: todos los responsables" /></Box>
      <Button type="submit" variant="outlined">Buscar</Button><Button type="button" onClick={clear}>Limpiar filtros</Button>
    </Box>
    {(funnels.isError || origins.isError) && <Alert severity="warning" action={<Button onClick={() => { void funnels.refetch(); void origins.refetch() }}>Reintentar</Button>}>No pudimos cargar los filtros de embudos u orígenes.</Alert>}
    {isPending ? <OpportunityListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="opportunities-error-title"><Typography component="h2" id="opportunities-error-title" className="company-feedback-title">No pudimos cargar las oportunidades</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : <>
      <Typography role="status" className="record-count">{data.totalCount} {Number(data.totalCount) === 1 ? 'oportunidad' : 'oportunidades'}</Typography>
      {data.items.length === 0
        ? <section className="company-feedback" aria-labelledby="opportunities-empty-title"><Typography component="h2" id="opportunities-empty-title" className="company-feedback-title">{filtered || page ? 'No hay oportunidades para estos filtros o página' : 'Todavía no hay oportunidades'}</Typography><Typography color="text.secondary">Las oportunidades registradas van a aparecer en este listado.</Typography></section>
        : <><div className="company-list-desktop"><Rows items={data.items} onOpen={(id) => navigate(`/oportunidades/${id}`)} /></div><div className="company-list-mobile"><Cards items={data.items} onOpen={(id) => navigate(`/oportunidades/${id}`)} /></div></>}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Oportunidades por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={(type) => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
    </>}
  </Box>
}
