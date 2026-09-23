import { Refresh } from '@mui/icons-material'
import { Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { getOpportunitiesByStage, opportunityQueryKeys, type OportunidadResumen } from '../../api/client'
import { displayValue, formatCommercialDate, opportunityContactName } from '../shared/display'
import { flattenOpportunitiesByStage, stageToneClass } from './opportunityData'
import { ListSearch, NoSearchResults } from '../shared/ListSearch'
import { matchesSearch } from '../shared/searchText'
import '../contacts/records.css'
import '../companies/companies.css'

function OpportunityCompany({ opportunity }: { opportunity: OportunidadResumen }) {
  if (!opportunity.idEmpresa) return <>-</>
  return <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(opportunity.empresaRazonSocial)}</Link>
}

function OpportunityContact({ opportunity }: { opportunity: OportunidadResumen }) {
  if (!opportunity.idContacto) return <>-</>
  return <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover" onClick={(event) => event.stopPropagation()}>{opportunityContactName(opportunity)}</Link>
}

function responsibleName(opportunity: OportunidadResumen) {
  return [opportunity.usuarioNombre?.trim(), opportunity.usuarioApellido?.trim()].filter(Boolean).join(' ') || '-'
}

function OpportunityRows({ opportunities, onOpen }: { opportunities: OportunidadResumen[]; onOpen: (id: string | number) => void }) {
  return <TableContainer className="company-table-wrap record-table-wrap"><Table aria-label="Oportunidades" className="company-table record-table opportunity-table">
    <caption className="visually-hidden">Listado de oportunidades</caption>
    <TableHead><TableRow><TableCell>Título</TableCell><TableCell>Etapa</TableCell><TableCell>Empresa</TableCell><TableCell>Contacto</TableCell><TableCell>Responsable</TableCell><TableCell>Cierre estimado</TableCell></TableRow></TableHead>
    <TableBody>{opportunities.map((opportunity) => <TableRow key={opportunity.id} className="company-clickable-row" onClick={() => onOpen(opportunity.id)}>
      <TableCell className="company-name-cell"><Link component={RouterLink} to={`/oportunidades/${opportunity.id}`} aria-label={`Abrir ficha de ${displayValue(opportunity.titulo)}`} underline="hover" onClick={(event) => event.stopPropagation()}>{displayValue(opportunity.titulo)}</Link></TableCell>
      <TableCell>{opportunity.etapaNombre?.trim() ? <Chip className={`company-status company-stage-chip ${stageToneClass(Math.max(0, Number(opportunity.etapaOrden ?? 1) - 1))}`} label={opportunity.etapaNombre} size="small" /> : '-'}</TableCell>
      <TableCell><OpportunityCompany opportunity={opportunity} /></TableCell>
      <TableCell><OpportunityContact opportunity={opportunity} /></TableCell>
      <TableCell>{responsibleName(opportunity)}</TableCell>
      <TableCell>{formatCommercialDate(opportunity.fechaEstimadaCierre)}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer>
}

function OpportunityListSkeleton() {
  return <div role="status" aria-label="Cargando oportunidades"><TableContainer className="company-table-wrap record-table-wrap"><Table aria-hidden="true" className="company-table record-table opportunity-table">
    <TableHead><TableRow>{['Título', 'Etapa', 'Empresa', 'Contacto', 'Responsable', 'Cierre estimado'].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
    <TableBody>{[0, 1, 2, 3].map((row) => <TableRow key={row}>{[0, 1, 2, 3, 4, 5].map((cell) => <TableCell key={cell}><Skeleton width={cell === 0 ? '85%' : '70%'} /></TableCell>)}</TableRow>)}</TableBody>
  </Table></TableContainer></div>
}

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const openOpportunity = (id: string | number) => navigate(`/oportunidades/${id}`)
  const query = useQuery({ queryKey: opportunityQueryKeys.pipeline, queryFn: getOpportunitiesByStage })
  const opportunities = useMemo(() => query.data ? flattenOpportunitiesByStage(query.data) : [], [query.data])
  const [search, setSearch] = useState('')
  const filteredOpportunities = useMemo(() => opportunities.filter((opportunity) => matchesSearch([
    opportunity.titulo, displayValue(opportunity.etapaNombre),
    opportunity.empresaRazonSocial, opportunityContactName(opportunity),
    responsibleName(opportunity), formatCommercialDate(opportunity.fechaEstimadaCierre),
  ], search)), [opportunities, search])
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Oportunidades</Typography><Typography className="companies-page-description">Seguimiento de las conversaciones comerciales en curso.</Typography></div><Button component={RouterLink} to="/oportunidades/nueva" variant="contained">Nueva oportunidad</Button></header>
    {query.isPending ? <OpportunityListSkeleton /> : query.isError ? <section className="company-feedback" aria-labelledby="opportunities-error-title"><Typography component="h2" id="opportunities-error-title" className="company-feedback-title">No pudimos cargar las oportunidades</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><Button onClick={() => void query.refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button></section> : opportunities.length === 0 ? <section className="company-feedback" aria-labelledby="opportunities-empty-title"><Typography component="h2" id="opportunities-empty-title" className="company-feedback-title">Todavía no hay oportunidades</Typography><Typography color="text.secondary">Las oportunidades registradas van a aparecer en este listado.</Typography></section> : <>
      <ListSearch label="oportunidades" query={search} onQueryChange={setSearch} resultCount={filteredOpportunities.length} totalCount={opportunities.length} />
      {filteredOpportunities.length === 0 ? <NoSearchResults query={search} onClear={() => setSearch('')} /> : <OpportunityRows opportunities={filteredOpportunities} onOpen={openOpportunity} />}
    </>}
  </Box>
}
