import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, FormControlLabel, FormGroup, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getTeacherLevels, setTeacherLevels } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

const roleLabels: Record<string, string> = { ADMINISTRADOR: 'Administrador', RESPONSABLE_COMERCIAL: 'Responsable comercial', VENDEDOR: 'Vendedor', PROFESOR: 'Profesor' }

/** El profesor marca los niveles de inglés con los que trabaja; solo puede abrir cursos de esos niveles. */
function TeacherLevels() {
  const client = useQueryClient()
  const levels = useQuery({ queryKey: ['profesor', 'niveles'], queryFn: getTeacherLevels })
  const [draft, setDraft] = useState<number[] | null>(null)
  const save = useMutation({ mutationFn: setTeacherLevels, onSuccess: data => { client.setQueryData(['profesor', 'niveles'], data); setDraft(null) } })
  if (levels.isPending) return <CircularProgress size={24} aria-label="Cargando niveles" />
  if (levels.isError) return <Alert severity="error">No pudimos cargar tus niveles. {levels.error.message}</Alert>
  const selected = draft ?? levels.data.seleccionados.map(Number)
  const toggle = (id: number) => setDraft(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  return <Card variant="outlined" sx={{ mt: 3 }}><CardContent>
    <Typography component="h2" variant="h6">Mis niveles de inglés</Typography>
    <Typography color="text.secondary" sx={{ mb: 1 }}>Marcá los niveles con los que trabajás. Solo podés abrir cursos de esos niveles.</Typography>
    <FormGroup row aria-label="Niveles de inglés">{levels.data.disponibles.map(level => <FormControlLabel key={level.id} label={level.descripcion} control={<Checkbox checked={selected.includes(Number(level.id))} onChange={() => toggle(Number(level.id))} />} />)}</FormGroup>
    {save.isError && <Alert severity="error" sx={{ mt: 1 }}>{save.error.message}</Alert>}
    {save.isSuccess && draft === null && <Alert severity="success" sx={{ mt: 1 }}>Niveles guardados.</Alert>}
    <Button sx={{ mt: 2 }} variant="contained" disabled={draft === null || save.isPending} onClick={() => save.mutate(selected)}>Guardar niveles</Button>
  </CardContent></Card>
}

/** Perfil de solo consulta: muestra los datos no sensibles de la sesión del servidor, sin edición. */
export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const rows: [string, string][] = [['Nombre', `${user.nombre} ${user.apellido}`.trim()], ['Usuario', user.username], ['Correo', user.correo]]
  return <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 720, mx: 'auto' }}>
    <Typography component="h1" className="companies-page-title">Mi perfil</Typography>
    <Typography className="companies-page-description">Datos de tu cuenta. Para cambiarlos, pedile a un administrador.</Typography>
    <Card variant="outlined" sx={{ mt: 3 }}><CardContent component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 3, rowGap: 1.5 }}>
      {rows.map(([label, value]) => [<Typography key={`${label}-t`} component="dt" color="text.secondary">{label}</Typography>, <Typography key={`${label}-d`} component="dd" sx={{ m: 0 }}>{value}</Typography>])}
      <Typography component="dt" color="text.secondary">Roles</Typography>
      <Box component="dd" sx={{ m: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{user.roles.map(role => <Chip key={role} size="small" label={roleLabels[role] ?? role} />)}</Box>
    </CardContent></Card>
    {user.roles.includes('PROFESOR') && <TeacherLevels />}
  </Box>
}
