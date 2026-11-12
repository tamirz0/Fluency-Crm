import { useState } from 'react'
import { Alert, Box, Button, InputAdornment, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { Add, Refresh, Search } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { getRoles, getUsers, usuarioQueryKeys, type AuthUser } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { UserDialog, type UserAction } from './UserDialog'
import { RecordActionsMenu } from '../shared/RecordActionsMenu'
import '../companies/companies.css'

export function UsersPage() {
  const { user } = useAuth()
  if (!user?.permisos.includes('AdministrarUsuarios')) return <Alert severity="error">No tenés permiso para administrar usuarios.</Alert>
  return <UsersList />
}
function UsersList() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(0)
  const [action, setAction] = useState<{ mode: UserAction; user?: AuthUser } | null>(null)
  const [message, setMessage] = useState('')
  const query = { q: search, activo: active === '' ? undefined : active === 'true', rol: role || undefined, page: page + 1, pageSize: 25 }
  const users = useQuery({ queryKey: [...usuarioQueryKeys.all, query], queryFn: () => getUsers(query) })
  const roles = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  return <Box className="companies-list-surface"><Box className="companies-page companies-list-page fluency-shell-type">
    <header className="companies-page-header">
      <Box><Typography component="h1" className="companies-page-title">Usuarios</Typography><Typography className="companies-page-description">Cuentas y roles del equipo comercial.</Typography></Box>
      <Button className="company-new-button" variant="contained" startIcon={<Add />} disabled={!roles.data} onClick={() => setAction({ mode: 'create' })}>Nuevo usuario</Button>
    </header>
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    {roles.error && <Alert severity="error" action={<Button onClick={() => void roles.refetch()}>Reintentar roles</Button>}>{roles.error.message}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(q.trim()) }} className="record-filters">
      <TextField label="Buscar usuarios" type="search" size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} value={q} onChange={e => setQ(e.target.value)} sx={{ flex: '1 1 220px' }} />
      <TextField select label="Estado" size="small" value={active} onChange={e => { setPage(0); setActive(e.target.value) }} sx={{ minWidth: 150 }}><MenuItem value="">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <TextField select label="Rol" size="small" value={role} onChange={e => { setPage(0); setRole(e.target.value) }} sx={{ minWidth: 200 }}><MenuItem value="">Todos los roles</MenuItem>{roles.data?.map(r => <MenuItem key={r.codigo} value={r.codigo}>{r.etiqueta}</MenuItem>)}</TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar usuarios" onClick={() => void users.refetch()}><Refresh /></Button>
    </Box>
    {users.isPending ? <Box role="status">Cargando usuarios…</Box> : users.error ? <Alert severity="error" action={<Button onClick={() => void users.refetch()}>Reintentar</Button>}>{users.error.message}</Alert> : <div className="company-table-panel">
      <TableContainer className="data-table-wrap"><Table aria-label="Usuarios" size="small">
        <TableHead><TableRow>{['Nombre', 'Usuario / correo', 'Roles', 'Estado', 'Acciones'].map(label => <TableCell key={label} align={label === 'Acciones' ? 'right' : 'left'}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{users.data.items.map(u => <TableRow key={u.id}>
          <TableCell className="company-name-cell">{u.nombre} {u.apellido}</TableCell><TableCell>{u.username}<Typography variant="body2" color="text.secondary">{u.correo}</Typography></TableCell>
          <TableCell><Stack direction="row" sx={{ gap: .5, flexWrap: 'wrap' }}>{u.roles.map(r => <Chip key={r} size="small" label={roles.data?.find(role => role.codigo === r)?.etiqueta ?? r} />)}</Stack></TableCell>
          <TableCell><Chip size="small" label={u.activo ? 'Activo' : 'Inactivo'} className={u.activo ? 'company-status company-status--positive' : 'company-status company-status--inactive'} /></TableCell>
          <TableCell align="right" className="record-actions-cell"><RecordActionsMenu name={u.username} active={u.activo} editDisabled={!roles.data} onPassword={() => setAction({ mode: 'password', user: u })} onEdit={() => setAction({ mode: 'edit', user: u })} onToggleActive={() => setAction({ mode: 'active', user: u })} /></TableCell>
        </TableRow>)}{!users.data.items.length && <TableRow><TableCell colSpan={5}>No hay usuarios para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(users.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </div>}
    {action && <UserDialog mode={action.mode} user={action.user} roles={roles.data ?? []} onClose={() => setAction(null)} onSaved={() => { setAction(null); setMessage('Cambios guardados.'); void users.refetch() }} />}
  </Box></Box>
}
