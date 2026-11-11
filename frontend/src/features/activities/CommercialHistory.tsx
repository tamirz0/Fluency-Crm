import { CallOutlined, EditNoteOutlined, HistoryOutlined, PublishedWithChangesOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Link, Skeleton, TablePagination, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { deleteActivity, getActivity, getCommercialHistory, type CommercialHistoryKind, type HistorialComercialItem } from '../../api/client'
import { displayValue } from '../shared/display'
import { RemoveRecordButton } from '../shared/RemoveRecordButton'
import { ActivityDialog } from './ActivityForm'

const dateTime = (value: string) => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

/** Carga la actividad completa y abre su editor; así el editor trabaja con los datos vigentes y no con el resumen del historial. */
function EditActivity({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const query = useQuery({ queryKey: ['actividades', id], queryFn: () => getActivity(id) })
  if (query.isError) return <Alert severity="error" action={<Button color="inherit" size="small" onClick={onClose}>Cerrar</Button>}>No pudimos cargar la actividad para editarla.</Alert>
  if (!query.data) return null
  return <ActivityDialog context={{ label: query.data.oportunidadTitulo ?? query.data.contactoNombre ?? query.data.empresaRazonSocial ?? '' }} activity={query.data} open onClose={onClose} onDone={onDone} />
}

function HistoryEntry({ item, from, showIcon, onEdit, onChanged }: { item: HistorialComercialItem; from?: { to: string; label: string }; showIcon: boolean; onEdit: (id: number) => void; onChanged: () => void }) {
  const opportunity = from && item.idOportunidad != null
    ? <> · <Link component={RouterLink} to={`/oportunidades/${item.idOportunidad}`} state={{ from }} underline="hover">{displayValue(item.oportunidadTitulo)}</Link></> : null
  if (item.tipo === 'TRANSICION') {
    return <li className="commercial-history-entry commercial-history-entry--transition">
      {showIcon && <span className="commercial-history-icon" aria-hidden="true"><PublishedWithChangesOutlined /></span>}
      <Typography component="h3" className="commercial-history-title">Cambio de etapa: {item.etapaAnterior ?? 'Alta de la oportunidad'} → {item.etapaNueva}</Typography>
      <Typography className="commercial-history-meta">{dateTime(item.fechaHora)} · {item.usuarioNombre}{opportunity}</Typography>
      {item.observacion && <Typography className="commercial-history-text">{item.observacion}</Typography>}
    </li>
  }
  const actions = item.accionesPermitidas
  const isCall = item.tipoActividad?.trim().toLocaleLowerCase('es') === 'llamada'
  return <li className="commercial-history-entry">
    {showIcon && <span className={`commercial-history-icon${isCall ? ' commercial-history-icon--call' : ''}`} aria-hidden="true">{isCall ? <CallOutlined /> : <EditNoteOutlined />}</span>}
    <Typography component="h3" className="commercial-history-title">{displayValue(item.tipoActividad)}</Typography>
    <Typography className="commercial-history-meta">Ocurrió el {dateTime(item.fechaHora)} · registrada por {item.usuarioNombre} el {item.fechaRegistro ? dateTime(item.fechaRegistro) : '-'}{opportunity}</Typography>
    <Typography className="commercial-history-text">{item.descripcion}</Typography>
    {item.resultado && <Typography className="commercial-history-text"><strong>Resultado:</strong> {item.resultado}</Typography>}
    {(actions?.editar || actions?.darDeBaja) && <Box className="commercial-history-actions">
      {actions.editar && <Button size="small" variant="outlined" aria-label={`Editar actividad ${item.tipoActividad ?? ''} del ${dateTime(item.fechaHora)}`} onClick={() => onEdit(Number(item.idOrigen))}>Editar</Button>}
      {actions.darDeBaja && <RemoveRecordButton noun="actividad" name={item.descripcion ?? 'actividad'} remove={() => deleteActivity(Number(item.idOrigen))} onRemoved={onChanged} />}
    </Box>}
  </li>
}

/**
 * Historial comercial combinado (actividades y transiciones de etapa) de una empresa, un contacto o una oportunidad. Una sola proyección
 * paginada por el servidor; las acciones de cada actividad dependen de lo que el servidor permite, no de ocultar botones.
 */
export function CommercialHistory({ kind, id }: { kind: CommercialHistoryKind; id: number }) {
  const queryClient = useQueryClient()
  const { pathname } = useLocation()
  const from = kind === 'oportunidades' ? undefined : { to: pathname, label: kind === 'empresas' ? 'Volver a la empresa' : 'Volver al contacto' }
  const showTimeline = true
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['oportunidades', 'historial-comercial', kind, id, page + 1, pageSize], queryFn: () => getCommercialHistory(kind, id, page + 1, pageSize) })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['oportunidades'] }); void queryClient.invalidateQueries({ queryKey: ['actividades'] }) }
  return <section className="company-detail-section commercial-history" aria-labelledby={`commercial-history-heading-${kind}`}>
    <Typography component="h2" id={`commercial-history-heading-${kind}`} className="company-section-heading">{showTimeline && <HistoryOutlined fontSize="small" />}Historial comercial</Typography>
    {query.isPending ? <Skeleton height={90} role="status" aria-label="Cargando historial comercial" /> : query.isError
      ? <Alert severity="warning" action={<Button onClick={() => void query.refetch()}>Reintentar</Button>}>No pudimos cargar el historial comercial.</Alert>
      : query.data.items.length === 0 ? <Typography color="text.secondary">Todavía no hay actividades ni cambios de etapa.</Typography> : <>
        <ul className="commercial-history-list" aria-label="Historial comercial">
          {query.data.items.map(item => <HistoryEntry key={`${item.tipo}-${item.idOrigen}`} item={item} from={from} showIcon={showTimeline} onEdit={setEditing} onChanged={refresh} />)}
        </ul>
        <TablePagination component="div" count={Number(query.data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50]} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={event => { setPageSize(Number(event.target.value)); setPage(0) }}
          labelRowsPerPage="Registros por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => ({ first: 'Primera página', last: 'Última página', next: 'Página siguiente', previous: 'Página anterior' })[type]} />
      </>}
    {editing !== null && <EditActivity id={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh() }} />}
  </section>
}
