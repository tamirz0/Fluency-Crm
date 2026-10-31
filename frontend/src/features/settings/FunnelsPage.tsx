import { useState } from 'react'
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, MenuItem } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { listFunnels, listStages, type Embudo, type EtapaConfiguracion } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { FunnelDialog } from './FunnelDialog'
import { StageEditor } from './StageEditor'
import { StageOrderEditor } from './StageOrderEditor'

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
  return <Box sx={{ p: { xs: 2.5, md: 5 }, maxWidth: 1600 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 2 }}><Typography component="h1" variant="h4">Embudos y etapas</Typography><Button variant="contained" onClick={() => setAction({})}>Nuevo embudo</Button></Stack>
    <Typography sx={{ mb: 3 }} color="text.secondary">Cada embudo pertenece a un servicio. Ganada y Perdida se crean automáticamente; las etapas abiertas se agregan según el proceso.</Typography>
    <Box component="form" onSubmit={e => { e.preventDefault(); setSearch(q.trim()); setPage(0) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <TextField label="Buscar embudos" value={q} onChange={e => setQ(e.target.value)} size="small" />
      <TextField select label="Estado de embudos" value={active} onChange={e => { setActive(e.target.value as typeof active); setPage(0) }} size="small"><MenuItem value="todos">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <Button type="submit">Buscar</Button><Button onClick={() => void funnels.refetch()}>Actualizar embudos</Button>
    </Box>
    {funnels.isPending ? <Box role="status">Cargando embudos…</Box> : funnels.error ? <Alert severity="error" action={<Button onClick={() => void funnels.refetch()}>Reintentar</Button>}>{funnels.error.message}</Alert> : <>
      <TableContainer><Table size="small" aria-label="Embudos"><TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Servicio</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead>
        <TableBody>{funnels.data.items.map(f => <TableRow key={f.id} selected={f.id === current?.id}>
          <TableCell>{f.nombre}</TableCell><TableCell>{f.servicio.descripcion}{!f.servicio.activo && ' (Inactivo)'}</TableCell><TableCell><Chip size="small" variant="outlined" label={f.activo ? 'Activo' : 'Inactivo'} color={f.activo ? 'success' : 'default'} /></TableCell>
          <TableCell><Button aria-label={`Etapas de ${f.nombre}`} onClick={() => setSelected(f)}>Etapas</Button><Button aria-label={`Editar ${f.nombre}`} onClick={() => setAction({ item: f })}>Editar</Button><Button aria-label={`${f.activo ? 'Desactivar' : 'Reactivar'} ${f.nombre}`} onClick={() => setAction({ item: f, active: true })}>{f.activo ? 'Desactivar' : 'Reactivar'}</Button></TableCell>
        </TableRow>)}{!funnels.data.items.length && <TableRow><TableCell colSpan={4}>No hay embudos para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(funnels.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, p) => setPage(p)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </>}
    {current && <Stages key={current.id} funnel={current} />}
    {action && <FunnelDialog {...action} onClose={() => setAction(null)} />}
  </Box>
}
function Stages({ funnel }: { funnel: Embudo }) {
  const [action, setAction] = useState<{ item?: EtapaConfiguracion; active?: boolean } | null>(null)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const stages = useQuery({ queryKey: ['etapas', funnel.id], queryFn: () => listStages(Number(funnel.id), 'todos') })
  const active = stages.data?.filter(s => s.activo) ?? []
  const nextOrder = active.length ? Math.max(...active.map(s => Number(s.orden))) + 1 : 1
  return <Box component="section" aria-label={`Etapas de ${funnel.nombre}`} sx={{ mt: 4, borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 2 }}><Typography component="h2" variant="h5">Etapas de {funnel.nombre}</Typography><Button variant="outlined" onClick={() => setAction({})}>Nueva etapa abierta</Button></Stack>
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
