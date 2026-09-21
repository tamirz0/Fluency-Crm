import { Refresh } from '@mui/icons-material'
import { Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { getOpportunitiesByStage, opportunityQueryKeys, type OportunidadResumen } from '../../api/client'
import { displayValue, formatCommercialDate, opportunityContactName } from '../shared/display'
import { flattenOpportunitiesByStage } from './opportunityData'
import '../contacts/records.css'
import '../companies/companies.css'

function OpportunityClient({ opportunity }: { opportunity: OportunidadResumen }) {
  if (opportunity.idEmpresa) return <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link>
  if (opportunity.idContacto) return <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{opportunityContactName(opportunity)}</Link>
  return <>{opportunity.empresaRazonSocial?.trim() || opportunityContactName(opportunity)}</>
}

function responsibleName(opportunity: OportunidadResumen) {
  return [opportunity.usuarioNombre?.trim(), opportunity.usuarioApellido?.trim()].filter(Boolean).join(' ') || 'Sin informar'
}

function OpportunityRows({ opportunities }: { opportunities: OportunidadResumen[] }) {
  return <TableContainer className="company-table-wrap record-table-wrap"><Table aria-label="Oportunidades" className="company-table record-table opportunity-table">
    <caption className="visually-hidden">Listado de oportunidades</caption>
    <TableHead><TableRow><TableCell>Título</TableCell><TableCell>Etapa</TableCell><TableCell>Cliente</TableCell><TableCell>Responsable</TableCell><TableCell>Fecha estimada de cierre</TableCell><TableCell align="right">Acción</TableCell></TableRow></TableHead>
    <TableBody>{opportunities.map((opportunity) => <TableRow key={opportunity.id}>
      <TableCell className="company-name-cell">{displayValue(opportunity.titulo)}</TableCell>
      <TableCell><Chip className="company-status company-status--prospect" label={displayValue(opportunity.etapaNombre)} size="small" /></TableCell>
      <TableCell><OpportunityClient opportunity={opportunity} /></TableCell>
      <TableCell>{responsibleName(opportunity)}</TableCell>
      <TableCell>{formatCommercialDate(opportunity.fechaEstimadaCierre)}</TableCell>
      <TableCell align="right"><Link component={RouterLink} to={`/oportunidades/${opportunity.id}`} aria-label={`Ver detalle de ${opportunity.titulo}`} underline="hover">Ver detalle</Link></TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function OpportunityListSkeleton() {
  return <div role="status" aria-label="Cargando oportunidades"><TableContainer className="company-table-wrap record-table-wrap"><Table aria-hidden="true" className="company-table record-table opportunity-table">
    <TableHead><TableRow>{['Título', 'Etapa', 'Cliente', 'Responsable', 'Fecha estimada de cierre', 'Acción'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
  </Table></TableContainer></div>
}

export function OpportunitiesPage() {
  const query = useQuery({ queryKey: opportunityQueryKeys.pipeline, queryFn: getOpportunitiesByStage })
  const opportunities = query.data ? flattenOpportunitiesByStage(query.data) : []
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Oportunidades</Typography><Typography className="companies-page-description">Seguimiento de las conversaciones comerciales en curso.</Typography></div><Button component={RouterLink} to="/oportunidades/nueva" variant="contained">Nueva oportunidad</Button></header>
    {query.isPending ? <OpportunityListSkeleton /> : query.isError ? <section className="company-feedback" aria-labelledby="opportunities-error-title"><Typography component="h2" id="opportunities-error-title" className="company-feedback-title">No pudimos cargar las oportunidades</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : opportunities.length === 0 ? <section className="company-feedback" aria-labelledby="opportunities-empty-title"><Typography component="h2" id="opportunities-empty-title" className="company-feedback-title">Todavía no hay oportunidades</Typography><Typography color="text.secondary">Las oportunidades registradas van a aparecer en este listado.</Typography></section> : <OpportunityRows opportunities={opportunities} />}
  </Box>
}
