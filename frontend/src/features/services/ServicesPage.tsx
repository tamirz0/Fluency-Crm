import { useState } from 'react'
import { Alert, Box, Button, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { Add, Refresh } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { listServices, type Servicio } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { ServiceDialog, type ServiceAction } from './ServiceDialog'

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
  return <Box sx={{ p: { xs: 2.5, md: 5 }, maxWidth: 1600 }}>
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
      <Typography component="h1" variant="h4">Servicios</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => setAction({ mode: 'create' })}>Nuevo servicio</Button>
    </Stack>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Precio de referencia total, sin multiplicaciones. Desactivar un servicio conserva sus embudos.</Typography>
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(q.trim()) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <TextField label="Buscar servicios" type="search" size="small" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: '1 1 220px' }} />
      <TextField select label="Estado" size="small" value={active} onChange={e => { setPage(0); setActive(e.target.value as typeof active) }} sx={{ minWidth: 150 }}><MenuItem value="todos">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar servicios" onClick={() => void items.refetch()}><Refresh /></Button>
    </Box>
    {items.isPending ? <Box role="status">Cargando servicios…</Box> : items.error ? <Alert severity="error" action={<Button onClick={() => void items.refetch()}>Reintentar</Button>}>{items.error.message}</Alert> : <>
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Table aria-label="Servicios" size="small">
        <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Precio de referencia</TableCell><TableCell>Nivel / Modalidad</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead>
        <TableBody>{items.data.items.map(item => <TableRow key={item.id}>
          <TableCell>{item.nombre}</TableCell><TableCell>{Number(item.precioReferencia).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
          <TableCell>{[item.nivel, item.modalidad].filter(x => x != null).map(x => `${x.descripcion}${x.activo ? '' : ' (Inactivo)'}`).join(' / ') || 'Sin especificar'}</TableCell>
          <TableCell><Chip size="small" label={item.activo ? 'Activo' : 'Inactivo'} color={item.activo ? 'success' : 'default'} variant="outlined" /></TableCell>
          <TableCell><Stack direction="row" sx={{ flexWrap: 'wrap' }}><Button size="small" aria-label={`Editar ${item.nombre}`} onClick={() => setAction({ mode: 'edit', item })}>Editar</Button><Button size="small" color={item.activo ? 'warning' : 'primary'} aria-label={`${item.activo ? 'Desactivar' : 'Reactivar'} ${item.nombre}`} onClick={() => setAction({ mode: 'active', item })}>{item.activo ? 'Desactivar' : 'Reactivar'}</Button></Stack></TableCell>
        </TableRow>)}{!items.data.items.length && <TableRow><TableCell colSpan={5}>No hay servicios para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(items.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </>}
    {action && <ServiceDialog mode={action.mode} item={action.item} onClose={() => setAction(null)} onSaved={() => { setAction(null); setMessage('Cambios guardados.') }} />}
  </Box>
}
