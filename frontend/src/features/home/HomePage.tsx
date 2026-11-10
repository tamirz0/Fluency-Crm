import { Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Card, CardContent, Link, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { getHomeSummary } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import '../companies/companies.css'

const cards = [
  { key: 'alumnos', title: 'Alumnos', hint: 'Contactos activos en estado Cliente', to: '/contactos', link: 'Ver contactos' },
  { key: 'oportunidadesAbiertas', title: 'Oportunidades abiertas', hint: 'En curso, en cualquier embudo', to: '/oportunidades', link: 'Ver oportunidades' },
  { key: 'cerradasEsteMes', title: 'Cerradas este mes', hint: 'Ganadas o perdidas con cierre en el mes actual', to: '/oportunidades', link: 'Ver oportunidades' },
] as const

/** Inicio: saludo y tres cifras globales calculadas por el servidor. Se vuelve a consultar en cada visita para reflejar cierres y altas recientes. */
export function HomePage() {
  const { user } = useAuth()
  const summary = useQuery({ queryKey: ['inicio', 'resumen'], queryFn: getHomeSummary, refetchOnMount: 'always' })
  return <Box className="companies-page">
    <Typography component="h1" className="companies-page-title">Hola, {user?.nombre}</Typography>
    <Typography className="companies-page-description">Bienvenido a Fluency CRM.</Typography>
    {summary.isError && <Alert severity="warning" sx={{ mt: 3 }} action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void summary.refetch()}>Reintentar</Button>}>
      No pudimos cargar las cifras del inicio. {summary.error.message}
    </Alert>}
    <Box component="section" aria-label="Resumen comercial" sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
      {cards.map(card => <Card key={card.key} variant="outlined" sx={{ borderTop: 2, borderTopColor: 'primary.main' }}><CardContent>
        <Typography component="h2" variant="subtitle1" color="text.secondary">{card.title}</Typography>
        {summary.isPending
          ? <Skeleton variant="text" width={64} sx={{ fontSize: '2.5rem' }} aria-label={`Cargando ${card.title}`} />
          : summary.isError
            ? <Typography variant="h3" component="p" sx={{ fontVariantNumeric: 'tabular-nums', my: .5 }} color="text.disabled" aria-label={`${card.title}: no disponible`}>—</Typography>
            : <Typography variant="h3" component="p" sx={{ fontVariantNumeric: 'tabular-nums', my: .5 }} aria-label={`${card.title}: ${summary.data[card.key]}`}>{summary.data[card.key]}</Typography>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{card.hint}</Typography>
        <Link component={RouterLink} to={card.to} underline="hover">{card.link}</Link>
      </CardContent></Card>)}
    </Box>
  </Box>
}
