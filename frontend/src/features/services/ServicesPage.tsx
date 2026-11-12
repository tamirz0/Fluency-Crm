import { useState } from 'react'
import { Alert, Box, Button, InputAdornment, Chip, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { Add, Refresh, Search } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { listServices, type Servicio } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { ServiceDialog, type ServiceAction } from './ServiceDialog'
import { RecordActionsMenu } from '../shared/RecordActionsMenu'
import '../companies/companies.css'

export function ServicesPage() {
  const { user } = useAuth()
  if (!user?.roles?.includes('ADMINISTRADOR') || !user.permisos?.includes('AdministrarConfiguracion')) return <Alert severity="error">No tenés permiso para administrar servicios.</Alert>
  return <ServiceList />
}
function ServiceList() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<'todos' | 'true' | 'false'>('todos')
  const [page, setPage] = useState(0)
  const [action, setAction] = useState<{ mode: ServiceAction; item?: Servicio } | null>(null)
  const [message, setMessage] = useState('')
  const query = { q: search, activo: active, page: page + 1, pageSize: 25 }
  const items = useQuery({ queryKey: ['servicios', query], queryFn: () => listServices(query) })
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type">
    <header className="companies-page-header">
      <div><Typography component="h1" className="companies-page-title">Servicios</Typography>
        <Typography className="companies-page-description">Precio de referencia total, sin multiplicaciones. Desactivar un servicio conserva sus embudos.</Typography></div>
      <Button className="company-new-button" variant="contained" startIcon={<Add />} onClick={() => setAction({ mode: 'create' })}>Nuevo servicio</Button>
    </header>
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(q.trim()) }} className="record-filters">
      <TextField label="Buscar servicios" type="search" size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} value={q} onChange={e => setQ(e.target.value)} sx={{ flex: '1 1 220px' }} />
      <TextField select label="Estado" size="small" value={active} onChange={e => { setPage(0); setActive(e.target.value as typeof active) }} sx={{ minWidth: 150 }}><MenuItem value="todos">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar servicios" onClick={() => void items.refetch()}><Refresh /></Button>
    </Box>
    {items.isPending ? <Box role="status">Cargando servicios…</Box> : items.error ? <Alert severity="error" action={<Button onClick={() => void items.refetch()}>Reintentar</Button>}>{items.error.message}</Alert> : <div className="company-table-panel">
      <TableContainer className="data-table-wrap"><Table aria-label="Servicios" size="small">
        <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Precio de referencia</TableCell><TableCell>Tipo / Nivel / Modalidad</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
        <TableBody>{items.data.items.map(item => <TableRow key={item.id}>
          <TableCell className="company-name-cell">{item.nombre}</TableCell><TableCell>{Number(item.precioReferencia).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
          <TableCell>{[item.tipo, item.nivel, item.modalidad].filter(x => x != null).map(x => `${x.descripcion}${x.activo ? '' : ' (Inactivo)'}`).join(' / ')}</TableCell>
          <TableCell><Chip size="small" label={item.activo ? 'Activo' : 'Inactivo'} className={item.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
          <TableCell align="right" className="record-actions-cell"><RecordActionsMenu name={item.nombre} active={item.activo} onEdit={() => setAction({ mode: 'edit', item })} onToggleActive={() => setAction({ mode: 'active', item })} /></TableCell>
        </TableRow>)}{!items.data.items.length && <TableRow><TableCell colSpan={5}>No hay servicios para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(items.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </div>}
    {action && <ServiceDialog mode={action.mode} item={action.item} onClose={() => setAction(null)} onSaved={() => { setAction(null); setMessage('Cambios guardados.') }} />}
  </Box></Box>
}
