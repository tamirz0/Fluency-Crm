import { Alert, Box, Button, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { contactoQueryKeys, empresaQueryKeys, getCompanies, getContacts, getOpportunitiesByStage, opportunityQueryKeys } from '../../api/client'
import './home.css'

function isActive(value: string | null | undefined) { return ['cliente', 'potencial'].includes(value?.trim().toLocaleLowerCase('es') ?? '') }
function Pulse({ label, to, query, value }: { label: string; to: string; query: { isPending: boolean; isError: boolean }; value: number }) {
  return <Box component={Link} to={to} className="home-pulse-item" aria-label={`${label}: ${query.isError ? 'no disponible' : value}`}><Typography className="home-pulse-value">{query.isPending ? <Skeleton width={42} /> : query.isError ? '—' : value}</Typography><Typography color="text.secondary">{label}</Typography></Box>
}
export function HomePage() {
  const { user } = useAuth()
  const companies = useQuery({ queryKey: empresaQueryKeys.all, queryFn: getCompanies })
  const contacts = useQuery({ queryKey: contactoQueryKeys.all, queryFn: getContacts })
  const opportunities = useQuery({ queryKey: opportunityQueryKeys.pipeline, queryFn: getOpportunitiesByStage })
  const failed = [companies, contacts, opportunities].filter((query) => query.isError)
  return <Box className="home-page"><Typography component="h1" className="home-title">Hola, {user?.nombre}</Typography><Typography className="home-description">Tu actividad comercial, en un vistazo.</Typography>
    <section className="home-pulse" aria-labelledby="pulse-title"><Typography id="pulse-title" className="home-pulse-title">Pulso comercial</Typography><Box className="home-pulse-grid">
      <Pulse label="Oportunidades" to="/oportunidades" query={opportunities} value={(opportunities.data ?? []).reduce((total, stage) => total + stage.oportunidades.length, 0)} />
      <Pulse label="Empresas activas" to="/empresas" query={companies} value={(companies.data ?? []).filter((company) => isActive(company.estadoDescripcion)).length} />
      <Pulse label="Contactos activos" to="/contactos" query={contacts} value={(contacts.data ?? []).filter((contact) => isActive(contact.estadoDescripcion)).length} />
    </Box></section>
    {failed.length > 0 && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => failed.forEach((query) => void query.refetch())}>Reintentar</Button>}>No pudimos actualizar algunos indicadores</Alert>}
  </Box>
}
