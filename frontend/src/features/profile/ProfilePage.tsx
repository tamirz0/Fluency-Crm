import { Box, Card, CardContent, Chip, Typography } from '@mui/material'
import { useAuth } from '../../auth/useAuth'

const roleLabels: Record<string, string> = { ADMINISTRADOR: 'Administrador', RESPONSABLE_COMERCIAL: 'Responsable comercial', VENDEDOR: 'Vendedor' }

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
  </Box>
}
