import { Business, Refresh } from '@mui/icons-material'
import { Box, Button, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { empresaQueryKeys, getCompanies, type Empresa } from '../../api/client'
import { CompanyStatus } from './CompanyStatus'
import './companies.css'

function displayValue(value: string | null | undefined) {
  return value?.trim() ? value : 'Sin informar'
}

function CompanyContact({ company }: { company: Empresa }) {
  const hasEmail = Boolean(company.correo?.trim())
  const hasPhone = Boolean(company.telefono?.trim())
  if (!hasEmail && !hasPhone) return <span className="company-muted">Sin informar</span>
  return <span className="company-contact-links">
    {hasEmail && <Link href={`mailto:${company.correo}`} underline="hover">{company.correo}</Link>}
    {hasPhone && <Link href={`tel:${company.telefono}`} underline="hover">{company.telefono}</Link>}
  </span>
}

function DesktopRows({ companies }: { companies: Empresa[] }) {
  return <TableContainer className="company-table-wrap">
    <Table aria-label="Empresas" className="company-table">
      <caption className="visually-hidden">Listado de empresas</caption>
      <TableHead><TableRow>
        <TableCell>Razón social</TableCell><TableCell>Estado</TableCell><TableCell>Industria</TableCell><TableCell>Contacto</TableCell><TableCell>Origen</TableCell><TableCell align="right">Acción</TableCell>
      </TableRow></TableHead>
      <TableBody>{companies.map((company) => <TableRow key={company.id}>
        <TableCell className="company-name-cell">{company.razonSocial}</TableCell>
        <TableCell><CompanyStatus value={company.estadoDescripcion} /></TableCell>
        <TableCell>{displayValue(company.industria)}</TableCell>
        <TableCell><CompanyContact company={company} /></TableCell>
        <TableCell>{displayValue(company.origenDescripcion)}</TableCell>
        <TableCell align="right"><Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Ver detalle de ${company.razonSocial}`} underline="hover">Ver detalle</Link></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>
}

function MobileRecords({ companies }: { companies: Empresa[] }) {
  return <ul className="company-record-list" aria-label="Empresas">
    {companies.map((company) => <li className="company-record" key={company.id}>
      <div className="company-record-heading"><h2>{company.razonSocial}</h2><CompanyStatus value={company.estadoDescripcion} /></div>
      <dl className="company-record-fields">
        <div><dt>Industria</dt><dd>{displayValue(company.industria)}</dd></div>
        <div><dt>Origen</dt><dd>{displayValue(company.origenDescripcion)}</dd></div>
        <div className="company-record-contact"><dt>Contacto</dt><dd><CompanyContact company={company} /></dd></div>
      </dl>
      <Link component={RouterLink} to={`/empresas/${company.id}`} aria-label={`Ver detalle de ${company.razonSocial}`} underline="hover" className="company-record-action">Ver detalle</Link>
    </li>)}
  </ul>
}

function CompanyListSkeleton() {
  return <div className="companies-loading" role="status" aria-label="Cargando empresas">
    <TableContainer className="company-table-wrap company-skeleton-table">
      <Table aria-hidden="true"><TableHead><TableRow>{['Razón social', 'Estado', 'Industria', 'Contacto', 'Origen', 'Acción'].map((heading) => <TableCell key={heading}>{heading}</TableCell>)}</TableRow></TableHead>
        <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <ul className="company-record-list company-skeleton-list" aria-hidden="true">{[0, 1, 2].map((row) => <li className="company-record" key={row}><Skeleton width="62%" height={32} /><Skeleton width="44%" /><Skeleton width="76%" /><Skeleton width="36%" height={32} /></li>)}</ul>
  </div>
}

export function CompaniesPage() {
  const { data, error, isPending, refetch } = useQuery({ queryKey: empresaQueryKeys.all, queryFn: getCompanies })

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
      <div className="company-list-desktop"><DesktopRows companies={data} /></div>
      <div className="company-list-mobile"><MobileRecords companies={data} /></div>
    </>}
  </Box>
}
