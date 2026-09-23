import { Business, Refresh } from '@mui/icons-material'
import { Box, Button, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { empresaQueryKeys, getCompanies, type Empresa } from '../../api/client'
import { displayValue } from '../shared/display'
import { CompanyStatus } from './CompanyStatus'
import { ListSearch, NoSearchResults } from '../shared/ListSearch'
import { matchesSearch } from '../shared/searchText'
import { sortByStatus } from '../shared/sortByStatus'
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
  return <TableContainer className="company-table-wrap">
    <Table aria-label="Empresas" className="company-table company-list-table">
      <caption className="visually-hidden">Listado de empresas</caption>
      <TableHead><TableRow>
        <TableCell>Razón social</TableCell><TableCell>Estado</TableCell><TableCell>Industria</TableCell><TableCell>Correo</TableCell><TableCell>Teléfono</TableCell><TableCell>Origen</TableCell>
      </TableRow></TableHead>
      <TableBody>{companies.map((company) => <TableRow key={company.id} className="company-clickable-row" onClick={() => onOpen(company.id)}>
        <TableCell className="company-name-cell"><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link></TableCell>
        <TableCell><CompanyStatus value={company.estadoDescripcion} /></TableCell>
        <TableCell>{displayValue(company.industria)}</TableCell>
        <TableCell><CompanyEmail company={company} /></TableCell>
        <TableCell><CompanyPhone company={company} /></TableCell>
        <TableCell>{displayValue(company.origenDescripcion)}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>
}

function MobileRecords({ companies, onOpen }: { companies: Empresa[]; onOpen: (id: string | number) => void }) {
  return <ul className="company-record-list" aria-label="Empresas">
    {companies.map((company) => <li className="company-record company-clickable-record" key={company.id} onClick={() => onOpen(company.id)}>
      <div className="company-record-heading"><h2><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Abrir ficha de ${company.razonSocial}`} underline="hover" onClick={(event) => event.stopPropagation()}>{company.razonSocial}</Link></h2><CompanyStatus value={company.estadoDescripcion} /></div>
      <dl className="company-record-fields">
        <div><dt>Industria</dt><dd>{displayValue(company.industria)}</dd></div>
        <div><dt>Origen</dt><dd>{displayValue(company.origenDescripcion)}</dd></div>
        <div className="company-record-contact"><dt>Contacto</dt><dd><CompanyContact company={company} /></dd></div>
      </dl>
    </li>)}
  </ul>
}

function CompanyListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando empresas">
    <TableContainer className="company-table-wrap company-skeleton-table">
      <Table aria-hidden="true" className="company-list-table"><TableHead><TableRow>{['Razón social', 'Estado', 'Industria', 'Correo', 'Teléfono', 'Origen'].map((heading) => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
        <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <ul className="company-record-list company-skeleton-list" aria-hidden="true">{[0, 1, 2].map((row) => <li className="company-record" key={row}><Skeleton width="62%" height={32} /><Skeleton width="44%" /><Skeleton width="76%" /><Skeleton width="36%" height={32} /></li>)}</ul>
  </div>
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const openCompany = (id: string | number) => navigate(`/empresas/${id}`)
  const { data, error, isPending, refetch } = useQuery({ queryKey: empresaQueryKeys.all, queryFn: getCompanies })
  const [search, setSearch] = useState('')
  const filteredCompanies = useMemo(() => sortByStatus((data ?? []).filter((company) => matchesSearch([
    company.razonSocial, displayValue(company.estadoDescripcion), displayValue(company.industria),
    company.correo, company.telefono,
    displayValue(company.origenDescripcion),
  ], search))), [data, search])

  return <Box className="companies-page">
    <header className="companies-page-header">
      <div><Typography component="h1" className="companies-page-title">Empresas</Typography><Typography className="companies-page-description">Organizaciones vinculadas a la actividad comercial.</Typography></div><Button component={RouterLink} to="/empresas/nueva" variant="contained">Nueva empresa</Button>
    </header>

    {isPending ? <CompanyListSkeleton /> : error ? <section className="company-feedback" aria-labelledby="companies-error-title">
      <Typography id="companies-error-title" component="h2" className="company-feedback-title">No pudimos cargar las empresas</Typography>
      <Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography>
      <Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : data.length === 0 ? <section className="company-feedback" aria-labelledby="companies-empty-title">
      <Business className="company-empty-icon" aria-hidden="true" />
      <Typography id="companies-empty-title" component="h2" className="company-feedback-title">Todavía no hay empresas</Typography>
      <Typography color="text.secondary">Las empresas registradas van a aparecer en este listado.</Typography>
    </section> : <>
      <ListSearch label="empresas" query={search} onQueryChange={setSearch} resultCount={filteredCompanies.length} totalCount={data.length} />
      {filteredCompanies.length === 0 ? <NoSearchResults query={search} onClear={() => setSearch('')} /> : <>
        <div className="company-list-desktop"><DesktopRows companies={filteredCompanies} onOpen={openCompany} /></div>
        <div className="company-list-mobile"><MobileRecords companies={filteredCompanies} onOpen={openCompany} /></div>
      </>}
    </>}
  </Box>
}
