import { useRef, useState } from 'react'
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, MenuItem } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { listFunnels, listStages, reorderStages, type Embudo, type EtapaConfiguracion } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { FunnelDialog } from './FunnelDialog'
import { StageEditor } from './StageEditor'

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
  const stages = useQuery({ queryKey: ['etapas', funnel.id], queryFn: () => listStages(Number(funnel.id), 'todos') })
  const active = stages.data?.filter(s => s.activo) ?? []
  const nextOrder = active.length ? Math.max(...active.map(s => Number(s.orden))) + 1 : 1
  return <Box component="section" aria-label={`Etapas de ${funnel.nombre}`} sx={{ mt: 4, borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, mb: 2 }}><Typography component="h2" variant="h5">Etapas de {funnel.nombre}</Typography><Button variant="outlined" onClick={() => setAction({})}>Nueva etapa abierta</Button></Stack>
    {!funnel.activo && <Alert severity="info" sx={{ mb: 2 }}>Embudo inactivo: conserva sus etapas y no recibe nuevas oportunidades ni reaperturas.</Alert>}
    {stages.isPending ? <Box role="status">Cargando etapas…</Box> : stages.error ? <Alert severity="error" action={<Button onClick={() => void stages.refetch()}>Reintentar etapas</Button>}>{stages.error.message}</Alert> : <>
      {!active.some(s => s.estado === 'ABIERTA') && <Alert severity="info" sx={{ mb: 2 }}>Este embudo no permite altas de oportunidades hasta que tenga una etapa abierta activa.</Alert>}
      <OrderEditor key={JSON.stringify(stages.data)} funnel={funnel} stages={stages.data} error={orderError} onError={setOrderError} onEdit={item => setAction({ item })} onActive={item => setAction({ item, active: true })} />
    </>}
    {action && <StageEditor {...action} funnel={funnel} nextOrder={nextOrder} onClose={() => setAction(null)} />}
  </Box>
}
const orderSchema = z.object({ posiciones: z.record(z.string(), z.string().trim().refine(v => /^-?\d+$/.test(v) && Number(v) >= -2147483648 && Number(v) <= 2147483647, 'Ingresá un orden entero válido.')) })
function OrderEditor({ funnel, stages, error, onError, onEdit, onActive }: { funnel: Embudo; stages: EtapaConfiguracion[]; error: string; onError: (message: string) => void; onEdit: (s: EtapaConfiguracion) => void; onActive: (s: EtapaConfiguracion) => void }) {
  const client = useQueryClient(), pending = useRef(false)
  const { isLoading } = useAuth()
  const [success, setSuccess] = useState(false)
  const defaults = { posiciones: Object.fromEntries(stages.filter(s => s.activo).map(s => [String(s.id), String(s.orden)])) }
  const { register, reset, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(orderSchema), defaultValues: defaults })
  const save = async (v: z.infer<typeof orderSchema>) => {
    if (pending.current || isLoading || !isDirty) return
    pending.current = true; onError(''); setSuccess(false)
    try {
      const data = await reorderStages(Number(funnel.id), { etapas: Object.entries(v.posiciones).map(([id, orden]) => ({ id: Number(id), orden: Number(orden) })) })
      client.setQueryData(['etapas', funnel.id], stages.map(s => data.find(updated => updated.id === s.id) ?? s)); reset(v); setSuccess(true)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'No pudimos guardar el orden.')
      await client.invalidateQueries({ queryKey: ['etapas', funnel.id] }); reset(defaults)
    } finally { pending.current = false }
  }
  return <Box component="form" noValidate onSubmit={e => { void handleSubmit(save)(e) }}>
    {error && <Alert severity="error">{error}</Alert>}{success && <Alert severity="success">Orden guardado.</Alert>}
    <TableContainer><Table aria-label="Etapas" size="small"><TableHead><TableRow><TableCell>Etapa</TableCell><TableCell>Estado</TableCell><TableCell>Orden</TableCell><TableCell>Disponibilidad</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead>
      <TableBody>{stages.map(s => <TableRow key={s.id}><TableCell>{s.nombre}</TableCell><TableCell>{s.estado === 'ABIERTA' ? 'Abierta' : s.estado === 'GANADA' ? 'Ganada' : 'Perdida'}</TableCell>
        <TableCell>{s.activo ? <TextField {...register(`posiciones.${s.id}`)} size="small" label={`Orden de ${s.nombre}`} disabled={isSubmitting || isLoading} error={!!errors.posiciones?.[String(s.id)]} helperText={errors.posiciones?.[String(s.id)]?.message} sx={{ width: 160 }} /> : s.orden}</TableCell>
        <TableCell>{s.activo ? 'Activa' : 'Inactiva'}</TableCell><TableCell><Button disabled={isSubmitting} aria-label={`Editar ${s.nombre}`} onClick={() => onEdit(s)}>Editar</Button>{s.estado === 'ABIERTA' && <Button disabled={isSubmitting} aria-label={`${s.activo ? 'Desactivar' : 'Reactivar'} ${s.nombre}`} onClick={() => onActive(s)}>{s.activo ? 'Desactivar' : 'Reactivar'}</Button>}</TableCell>
      </TableRow>)}</TableBody>
    </Table></TableContainer>
    <Button type="submit" variant="contained" disabled={isSubmitting || isLoading || !isDirty} sx={{ mt: 2 }}>{isSubmitting ? 'Guardando…' : 'Guardar orden'}</Button>
  </Box>
}
