import { useState } from 'react'
import { Alert, Box, Button, Chip, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, MenuItem } from '@mui/material'
import { Add, ChevronRight, Refresh, Search } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { listFunnels, listStages, type Embudo, type EtapaConfiguracion } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { RecordActionsMenu } from '../shared/RecordActionsMenu'
import { FunnelDialog } from './FunnelDialog'
import { StageEditor } from './StageEditor'
import { StageOrderEditor } from './StageOrderEditor'
import '../companies/companies.css'
import './funnel-settings.css'

export function FunnelsPage() {
  const { user } = useAuth()
  if (!user?.roles?.includes('ADMINISTRADOR') || !user.permisos?.includes('AdministrarConfiguracion')) return <Alert severity="error">No tenés permiso para administrar embudos.</Alert>
  return <FunnelList />
}
function FunnelList() {
  const [q, setQ] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0)
  const [active, setActive] = useState<'true' | 'false' | 'todos'>('todos')
  const [action, setAction] = useState<{ item?: Embudo; active?: boolean } | null>(null), [selected, setSelected] = useState<Embudo | null>(null)
  const query = { q: search, activo: active, page: page + 1, pageSize: 25 }
  const funnels = useQuery({ queryKey: ['embudos', query], queryFn: () => listFunnels(query) })
  const current = funnels.data?.items.find(f => f.id === selected?.id) ?? selected
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type">
    <header className="companies-page-header">
      <div><Typography component="h1" className="companies-page-title">Embudos y etapas</Typography>
        <Typography className="companies-page-description">Configurá qué servicios admite cada embudo y cómo se organizan sus etapas.</Typography></div>
      <Button className="company-new-button" variant="contained" startIcon={<Add />} onClick={() => setAction({})}>Nuevo embudo</Button>
    </header>
    <Box component="form" onSubmit={e => { e.preventDefault(); setSearch(q.trim()); setPage(0) }} className="record-filters">
      <TextField label="Buscar embudos" type="search" value={q} onChange={e => setQ(e.target.value)} size="small"
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
      <TextField select label="Estado de embudos" value={active} onChange={e => { setActive(e.target.value as typeof active); setPage(0) }} size="small"><MenuItem value="todos">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar embudos" onClick={() => void funnels.refetch()}><Refresh /></Button>
    </Box>
    {funnels.isPending ? <Box role="status">Cargando embudos…</Box> : funnels.error ? <Alert severity="error" action={<Button onClick={() => void funnels.refetch()}>Reintentar</Button>}>{funnels.error.message}</Alert> : <div className="company-table-panel">
      <TableContainer className="data-table-wrap"><Table size="small" aria-label="Embudos"><TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Servicios que admite</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead>
        <TableBody>{funnels.data.items.map(f => <TableRow key={f.id} className="company-clickable-row funnel-settings-row" selected={f.id === current?.id} onClick={event => {
          const target = event.target as Element
          if (event.currentTarget.contains(target) && !target.closest('button')) setSelected(f)
        }}>
          <TableCell className="company-name-cell">
            <Button className="funnel-settings-name" endIcon={<ChevronRight fontSize="small" />} aria-label={`Etapas de ${f.nombre}`}
              aria-expanded={f.id === current?.id} aria-controls={f.id === current?.id ? 'selected-funnel-stages' : undefined} onClick={() => setSelected(f)}>{f.nombre}</Button>
          </TableCell>
          <TableCell>{f.tipos.map(t => `${t.tipo.descripcion}${t.tipo.activo ? '' : ' (Inactivo)'}${t.servicios.length ? `: ${t.servicios.map(s => s.descripcion).join(', ')}` : ' (todos)'}`).join(' · ')}</TableCell>
          <TableCell><Chip size="small" label={f.activo ? 'Activo' : 'Inactivo'} className={f.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
          <TableCell align="right" className="record-actions-cell"><RecordActionsMenu name={f.nombre} active={f.activo} onEdit={() => setAction({ item: f })} onToggleActive={() => setAction({ item: f, active: true })} /></TableCell>
        </TableRow>)}{!funnels.data.items.length && <TableRow><TableCell colSpan={4}>No hay embudos para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(funnels.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPage(p)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </div>}
    {current && <Stages key={current.id} funnel={current} />}
    {action && <FunnelDialog {...action} onClose={() => setAction(null)} />}
  </Box></Box>
}
function Stages({ funnel }: { funnel: Embudo }) {
  const [action, setAction] = useState<{ item?: EtapaConfiguracion; active?: boolean } | null>(null)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const stages = useQuery({ queryKey: ['etapas', funnel.id], queryFn: () => listStages(Number(funnel.id), 'todos') })
  const active = stages.data?.filter(s => s.activo) ?? []
  const nextOrder = active.length ? Math.max(...active.map(s => Number(s.orden))) + 1 : 1
  return <Box component="section" id="selected-funnel-stages" aria-label={`Etapas de ${funnel.nombre}`} sx={{ mt: 4 }}>
    <header className="companies-page-header"><Typography component="h2" variant="h5">Etapas de {funnel.nombre}</Typography><Button className="company-new-button" variant="contained" startIcon={<Add />} onClick={() => setAction({})}>Nueva etapa abierta</Button></header>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Organizá el flujo comercial. Arrastrá las etapas abiertas activas para cambiar su secuencia y guardá el orden.</Typography>
    {!funnel.activo && <Alert severity="info" sx={{ mb: 2 }}>Embudo inactivo: conserva sus etapas y no recibe nuevas oportunidades ni reaperturas.</Alert>}
    {stages.isPending ? <Box role="status">Cargando etapas…</Box> : stages.error ? <Alert severity="error" action={<Button onClick={() => void stages.refetch()}>Reintentar etapas</Button>}>{stages.error.message}</Alert> : <>
      {!active.some(s => s.estado === 'ABIERTA') && <Alert severity="info" sx={{ mb: 2 }}>Este embudo no permite altas de oportunidades hasta que tenga una etapa abierta activa.</Alert>}
      {orderSuccess && <Alert severity="success" sx={{ mb: 2 }}>Orden guardado.</Alert>}
      <StageOrderEditor key={JSON.stringify(stages.data)} funnel={funnel} stages={stages.data} error={orderError} onError={message => { setOrderError(message); setOrderSuccess(false) }} onSaved={() => setOrderSuccess(true)} onEdit={item => setAction({ item })} onActive={item => setAction({ item, active: true })} />
    </>}
    {action && <StageEditor {...action} funnel={funnel} nextOrder={nextOrder} onClose={() => setAction(null)} />}
  </Box>
}
