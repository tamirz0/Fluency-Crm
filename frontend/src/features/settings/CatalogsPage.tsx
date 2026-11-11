import { useState } from 'react'
import { Alert, Box, Button, InputAdornment, Chip, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { Add, Refresh, Search } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { configurableCatalogs, getCatalog, getOpportunityStates, type CatalogOption, type ConfigurableCatalog } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CatalogDialog, type CatalogAction } from './CatalogDialog'
import { RecordActionsMenu } from '../shared/RecordActionsMenu'
import '../companies/companies.css'

export function CatalogsPage() {
  const { user } = useAuth()
  if (!user?.roles.includes('ADMINISTRADOR') || !user.permisos.includes('AdministrarConfiguracion')) return <Alert severity="error">No tenés permiso para administrar catálogos.</Alert>
  return <CatalogSettings />
}
function CatalogSettings() {
  const [catalog, setCatalog] = useState<ConfigurableCatalog | 'estados-oportunidad'>('origenes-comerciales')
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Catálogos</Typography>
    <Typography className="companies-page-description">Opciones del circuito comercial. Desactivarlas conserva sus referencias y etiquetas.</Typography></div></header>
    <div className="record-filters"><TextField select label="Catálogo" size="small" value={catalog} onChange={e => setCatalog(e.target.value as typeof catalog)} sx={{ maxWidth: 360 }}>
      {configurableCatalogs.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
      <MenuItem value="estados-oportunidad">Estados de oportunidad</MenuItem>
    </TextField></div>
    {catalog === 'estados-oportunidad' ? <FixedStates /> : <CatalogList key={catalog} catalog={catalog} />}
  </Box></Box>
}
function FixedStates() {
  const states = useQuery({ queryKey: ['catalogos', 'estados-oportunidad'], queryFn: getOpportunityStates })
  return <>
    <Alert severity="info" sx={{ mb: 2 }}>Los estados de oportunidad son fijos y de solo lectura.</Alert>
    {states.isPending ? <Box role="status">Cargando estados…</Box> : states.error ? <Alert severity="error" action={<Button onClick={() => void states.refetch()}>Reintentar</Button>}>{states.error.message}</Alert> :
      <div className="company-table-panel"><TableContainer className="data-table-wrap"><Table aria-label="Estados de oportunidad" size="small"><TableHead><TableRow><TableCell>Código</TableCell><TableCell>Descripción</TableCell></TableRow></TableHead>
        <TableBody>{states.data.map(state => <TableRow key={state.id}><TableCell>{state.codigo}</TableCell><TableCell>{state.descripcion}</TableCell></TableRow>)}</TableBody>
      </Table></TableContainer></div>}
  </>
}
function CatalogList({ catalog }: { catalog: ConfigurableCatalog }) {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<'todos' | 'true' | 'false'>('todos')
  const [page, setPage] = useState(0)
  const [action, setAction] = useState<{ mode: CatalogAction; item?: CatalogOption } | null>(null)
  const [message, setMessage] = useState('')
  const query = { q: search, activo: active, page: page + 1, pageSize: 25 }
  const items = useQuery({ queryKey: ['catalogos', catalog, query], queryFn: () => getCatalog(catalog, query) })
  return <>
    <header className="companies-page-header">
      <Typography component="h2" variant="h6">{configurableCatalogs.find(c => c.id === catalog)!.label}</Typography>
      <Button className="company-new-button" variant="contained" startIcon={<Add />} onClick={() => setAction({ mode: 'create' })}>Nueva opción</Button>
    </header>
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(q.trim()) }} className="record-filters">
      <TextField label="Buscar opciones" type="search" size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} value={q} onChange={e => setQ(e.target.value)} sx={{ flex: '1 1 220px' }} />
      <TextField select label="Estado" size="small" value={active} onChange={e => { setPage(0); setActive(e.target.value as typeof active) }} sx={{ minWidth: 150 }}><MenuItem value="todos">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar catálogo" onClick={() => void items.refetch()}><Refresh /></Button>
    </Box>
    {items.isPending ? <Box role="status">Cargando opciones…</Box> : items.error ? <Alert severity="error" action={<Button onClick={() => void items.refetch()}>Reintentar</Button>}>{items.error.message}</Alert> : <div className="company-table-panel">
      <TableContainer className="data-table-wrap"><Table aria-label="Opciones del catálogo" size="small">
        <TableHead><TableRow><TableCell>{catalog === 'tipos-actividad' ? 'Nombre' : 'Descripción'}</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
        <TableBody>{items.data.items.map(item => {
          const label = item.descripcion ?? item.nombre
          return <TableRow key={item.id}><TableCell className="company-name-cell">{label}</TableCell><TableCell><Chip size="small" label={item.activo ? 'Activo' : 'Inactivo'} className={item.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
            <TableCell align="right" className="record-actions-cell"><RecordActionsMenu name={label} active={item.activo} onEdit={() => setAction({ mode: 'edit', item })} onToggleActive={() => setAction({ mode: 'active', item })} /></TableCell>
          </TableRow>
        })}{!items.data.items.length && <TableRow><TableCell colSpan={3}>No hay opciones para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(items.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </div>}
    {action && <CatalogDialog catalog={catalog} mode={action.mode} item={action.item} onClose={() => setAction(null)} onSaved={() => { setAction(null); setMessage('Cambios guardados.') }} />}
  </>
}
