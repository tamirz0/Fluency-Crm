import { useState } from 'react'
import { Alert, Box, Button, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { Add, Refresh } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { getRoles, getUsers, usuarioQueryKeys, type AuthUser } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { UserDialog, type UserAction } from './UserDialog'

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
  return <Box sx={{ p: { xs: 2.5, md: 5 }, maxWidth: 1600 }}>
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box><Typography component="h1" variant="h4">Usuarios</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Cuentas y roles del equipo comercial.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} disabled={!roles.data} onClick={() => setAction({ mode: 'create' })}>Nuevo usuario</Button>
    </Stack>
    {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    {roles.error && <Alert severity="error" action={<Button onClick={() => void roles.refetch()}>Reintentar roles</Button>}>{roles.error.message}</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setPage(0); setSearch(q.trim()) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <TextField label="Buscar usuarios" type="search" size="small" value={q} onChange={e => setQ(e.target.value)} sx={{ flex: '1 1 220px' }} />
      <TextField select label="Estado" size="small" value={active} onChange={e => { setPage(0); setActive(e.target.value) }} sx={{ minWidth: 150 }}><MenuItem value="">Todos</MenuItem><MenuItem value="true">Activos</MenuItem><MenuItem value="false">Inactivos</MenuItem></TextField>
      <TextField select label="Rol" size="small" value={role} onChange={e => { setPage(0); setRole(e.target.value) }} sx={{ minWidth: 200 }}><MenuItem value="">Todos los roles</MenuItem>{roles.data?.map(r => <MenuItem key={r.codigo} value={r.codigo}>{r.etiqueta}</MenuItem>)}</TextField>
      <Button type="submit" variant="outlined">Buscar</Button><Button aria-label="Actualizar usuarios" onClick={() => void users.refetch()}><Refresh /></Button>
    </Box>
    {users.isPending ? <Box role="status">Cargando usuarios…</Box> : users.error ? <Alert severity="error" action={<Button onClick={() => void users.refetch()}>Reintentar</Button>}>{users.error.message}</Alert> : <>
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Table aria-label="Usuarios" size="small">
        <TableHead><TableRow>{['Nombre', 'Usuario / correo', 'Roles', 'Estado', 'Acciones'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{users.data.items.map(u => <TableRow key={u.id}>
          <TableCell>{u.nombre} {u.apellido}</TableCell><TableCell>{u.username}<Typography variant="body2" color="text.secondary">{u.correo}</Typography></TableCell>
          <TableCell><Stack direction="row" sx={{ gap: .5, flexWrap: 'wrap' }}>{u.roles.map(r => <Chip key={r} size="small" label={roles.data?.find(role => role.codigo === r)?.etiqueta ?? r} />)}</Stack></TableCell>
          <TableCell><Chip size="small" label={u.activo ? 'Activo' : 'Inactivo'} color={u.activo ? 'success' : 'default'} variant="outlined" /></TableCell>
          <TableCell><Stack direction="row" sx={{ flexWrap: 'wrap' }}><Button size="small" disabled={!roles.data} aria-label={`Editar ${u.username}`} onClick={() => setAction({ mode: 'edit', user: u })}>Editar</Button><Button size="small" aria-label={`Cambiar contraseña ${u.username}`} onClick={() => setAction({ mode: 'password', user: u })}>Contraseña</Button><Button size="small" color={u.activo ? 'warning' : 'primary'} aria-label={`${u.activo ? 'Desactivar' : 'Reactivar'} ${u.username}`} onClick={() => setAction({ mode: 'active', user: u })}>{u.activo ? 'Desactivar' : 'Reactivar'}</Button></Stack></TableCell>
        </TableRow>)}{!users.data.items.length && <TableRow><TableCell colSpan={5}>No hay usuarios para estos filtros.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
      <TablePagination component="div" count={Number(users.data.totalCount)} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, next) => setPage(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} getItemAriaLabel={type => type === 'next' ? 'Página siguiente' : 'Página anterior'} />
    </>}
    {action && <UserDialog mode={action.mode} user={action.user} roles={roles.data ?? []} onClose={() => setAction(null)} onSaved={() => { setAction(null); setMessage('Cambios guardados.'); void users.refetch() }} />}
  </Box>
}
