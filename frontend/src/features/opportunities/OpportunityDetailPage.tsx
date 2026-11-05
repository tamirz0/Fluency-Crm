import { ArrowBack, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { ApiRequestError, getOpportunity, getOpportunityHistory, opportunityQueryKeys, type Oportunidad } from '../../api/client'
import { displayValue, formatCommercialDate, parsePositiveId } from '../shared/display'
import { clientLabel, money, stateLabels } from './opportunityData'
import { CloseOpportunityDialog, type CloseResult } from './CloseOpportunityDialog'
import { MoveStageDialog } from './MoveStageDialog'
import { ReassignDialog } from './ReassignDialog'
import { ReopenOpportunityDialog } from './ReopenOpportunityDialog'
import '../contacts/records.css'
import '../companies/companies.css'

const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('es-AR') : '-'
const inactive = (name: string, active: boolean | null | undefined) => active === false ? `${name} (inactivo)` : name

function OpportunityField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{typeof children === 'string' ? displayValue(children) : children ?? '-'}</dd></div>
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="company-detail-section" aria-labelledby={id}><Typography component="h2" id={id} className="company-section-heading">{title}</Typography><dl className="company-detail-fields">{children}</dl></section>
}

function OpportunityDetails({ opportunity }: { opportunity: Oportunidad }) {
  return <article className="company-sheet" aria-label={`Ficha de ${opportunity.tituloVisible}`}>
    <Section id="opportunity-relations-heading" title="Relación comercial">
      <OpportunityField label="Empresa">{opportunity.idEmpresa ? <Link component={RouterLink} to={`/empresas/${opportunity.idEmpresa}`} underline="hover">{displayValue(opportunity.empresaRazonSocial)}</Link> : '-'}</OpportunityField>
      <OpportunityField label="Contacto">{opportunity.idContacto ? <Link component={RouterLink} to={`/contactos/${opportunity.idContacto}`} underline="hover">{displayValue(opportunity.contactoNombre)}</Link> : '-'}</OpportunityField>
    </Section>
    <Section id="opportunity-management-heading" title="Gestión">
      <OpportunityField label="Responsable">{inactive(opportunity.responsableNombre, opportunity.responsableActivo)}</OpportunityField>
      <OpportunityField label="Embudo">{inactive(opportunity.embudoNombre, opportunity.embudoActivo)}</OpportunityField>
      <OpportunityField label="Servicio">{inactive(opportunity.servicioNombre, opportunity.servicioActivo)}</OpportunityField>
      <OpportunityField label="Etapa">{inactive(opportunity.etapaNombre, opportunity.etapaActiva)}</OpportunityField>
      <OpportunityField label="Valor">{money(opportunity.valor)}</OpportunityField>
      <OpportunityField label="Origen">{opportunity.idOrigen ? inactive(opportunity.origenDescripcion ?? '', opportunity.origenActivo) : '-'}</OpportunityField>
    </Section>
    <Section id="opportunity-dates-heading" title="Fechas">
      <OpportunityField label="Creación">{dateTime(opportunity.fechaCreacion)}</OpportunityField>
      <OpportunityField label="Cierre estimado">{formatCommercialDate(opportunity.fechaEstimadaCierre)}</OpportunityField>
      <OpportunityField label="Cierre real">{dateTime(opportunity.fechaCierre)}</OpportunityField>
    </Section>
    <Section id="opportunity-academic-heading" title="Datos académicos">
      <OpportunityField label="Objetivo de aprendizaje">{opportunity.objetivoAprendizaje ?? ''}</OpportunityField>
      <OpportunityField label="Participantes">{opportunity.cantidadParticipantes == null ? '' : String(opportunity.cantidadParticipantes)}</OpportunityField>
      <OpportunityField label="Disponibilidad horaria">{opportunity.disponibilidadHoraria ?? ''}</OpportunityField>
    </Section>
    <section className="company-detail-section" aria-labelledby="opportunity-notes-heading"><Typography component="h2" id="opportunity-notes-heading" className="company-section-heading">Observaciones</Typography><p className="company-observations">{displayValue(opportunity.observaciones)}</p></section>
  </article>
}

const historyDate = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

/** Historial de etapas de solo lectura, más antiguo primero. */
function StageHistory({ idOportunidad }: { idOportunidad: number }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const history = useQuery({ queryKey: opportunityQueryKeys.history(idOportunidad, page + 1, pageSize), queryFn: () => getOpportunityHistory(idOportunidad, page + 1, pageSize) })
  return <section className="company-detail-section" aria-labelledby="opportunity-history-heading">
    <Typography component="h2" id="opportunity-history-heading" className="company-section-heading">Historial de etapas</Typography>
    {history.isPending ? <Skeleton height={80} aria-label="Cargando historial de etapas" role="status" /> : history.isError
      ? <Alert severity="warning" action={<Button onClick={() => void history.refetch()}>Reintentar</Button>}>No pudimos cargar el historial de etapas.</Alert>
      : history.data.items.length === 0 ? <Typography color="text.secondary">Sin movimientos registrados.</Typography> : <>
        <TableContainer><Table size="small" aria-label="Historial de etapas">
          <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Desde</TableCell><TableCell>Hacia</TableCell><TableCell>Autor</TableCell><TableCell>Observación</TableCell></TableRow></TableHead>
          <TableBody>{history.data.items.map((entry) => <TableRow key={entry.id}>
            <TableCell>{historyDate(entry.fechaHora)}</TableCell>
            <TableCell>{entry.etapaAnteriorNombre ?? 'Alta de la oportunidad'}</TableCell>
            <TableCell>{entry.etapaNuevaNombre}</TableCell>
            <TableCell>{entry.usuarioNombre}</TableCell>
            <TableCell>{displayValue(entry.observacion)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={Number(history.data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }} labelRowsPerPage="Movimientos por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={(type) => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
      </>}
  </section>
}

export function OpportunityDetailPage() {
  const { idOportunidad: routeId } = useParams()
  const location = useLocation()
  const idOportunidad = parsePositiveId(routeId)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(idOportunidad ?? 0), queryFn: () => getOpportunity(idOportunidad as number), enabled: idOportunidad !== undefined })
  const opportunity = query.data
  const [reassigning, setReassigning] = useState(false)
  const [moving, setMoving] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [closing, setClosing] = useState<CloseResult | '' | null>(null)
  const [reassigned, setReassigned] = useState(false)
  const back = opportunity?.idEmpresa ? { to: `/empresas/${opportunity.idEmpresa}`, label: 'Volver a la empresa' } : opportunity?.idContacto ? { to: `/contactos/${opportunity.idContacto}`, label: 'Volver al contacto' } : { to: '/inicio', label: 'Volver al inicio' }
  const backLink = <Link component={RouterLink} to={back.to} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{back.label}</Link>

  if (idOportunidad === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-not-found-title"><Typography id="opportunity-not-found-title" component="h1" className="company-feedback-title">No encontramos esa oportunidad</Typography><Typography color="text.secondary">El enlace puede estar vencido o la oportunidad ya no estar disponible.</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page"><div className="company-detail-skeleton" aria-label="Cargando detalle de la oportunidad" role="status"><Skeleton width={150} height={28} /><Skeleton className="company-detail-title-skeleton" width="54%" height={54} /><Skeleton height={160} /></div></Box>
  if (query.isError || !opportunity)
    return <Box className="companies-page company-result-page records-page"><Link component={RouterLink} to="/inicio" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver al inicio</Link><section className="company-feedback" aria-labelledby="opportunity-error-title"><Typography id="opportunity-error-title" component="h1" className="company-feedback-title">No pudimos cargar los datos de la oportunidad</Typography><Typography color="text.secondary">Revisá la conexión e intentá de nuevo.</Typography><div className="company-feedback-actions"><Button onClick={() => void query.refetch()} variant="outlined" startIcon={<Refresh />}>Reintentar</Button></div></section></Box>

  return <Box className="companies-page company-result-page records-page">
    {backLink}
    {typeof location.state === 'object' && location.state !== null && 'confirmation' in location.state && <Alert severity="success" className="record-form-confirmation">{String(location.state.confirmation)}</Alert>}
    <header className="company-detail-header"><div><Typography component="h1" className="companies-page-title">{opportunity.tituloVisible}</Typography>{opportunity.titulo && <Typography className="companies-page-description opportunity-subtitle">{clientLabel(opportunity)}</Typography>}</div><div className="company-detail-header-actions">{opportunity.accionesPermitidas.editar && <Button component={RouterLink} to={`/oportunidades/${opportunity.id}/editar`} variant="outlined">Editar</Button>}{opportunity.accionesPermitidas.mover && <Button variant="outlined" onClick={() => setMoving(true)}>Cambiar etapa</Button>}{opportunity.accionesPermitidas.cerrar && <Button variant="outlined" onClick={() => setClosing('')}>Cerrar</Button>}{opportunity.accionesPermitidas.reabrir && <Button variant="outlined" onClick={() => setReopening(true)}>Reabrir</Button>}{opportunity.accionesPermitidas.reasignar && <Button variant="outlined" onClick={() => setReassigning(true)}>Reasignar</Button>}<Chip className="company-status company-status--prospect" label={stateLabels[opportunity.estado] ?? opportunity.estado} size="small" /></div></header>
    {reassigned && <Alert severity="success" className="record-form-confirmation">Oportunidad reasignada. Podés consultarla, pero ya no editarla.</Alert>}
    <OpportunityDetails opportunity={opportunity} />
    <MoveStageDialog item={opportunity} open={moving} onClose={() => setMoving(false)} onDone={() => setMoving(false)} onCloseRequest={result => { setMoving(false); setClosing(result) }} />
    {closing !== null && <CloseOpportunityDialog item={opportunity} initialResult={closing || undefined} open onClose={() => setClosing(null)} onDone={() => setClosing(null)} />}
    <ReopenOpportunityDialog item={opportunity} open={reopening} onClose={() => setReopening(false)} onDone={() => setReopening(false)} />
    <ReassignDialog item={opportunity} open={reassigning} onClose={() => setReassigning(false)} onDone={() => { setReassigning(false); setReassigned(true) }} />
    <StageHistory idOportunidad={opportunity.id as number} />
  </Box>
}
