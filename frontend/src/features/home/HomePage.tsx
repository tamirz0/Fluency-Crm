import { Alert, Box, Button, Skeleton, Typography } from '@mui/material'
import { BusinessOutlined, GroupsOutlined, ViewKanbanOutlined } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { contactoQueryKeys, empresaQueryKeys, getCompanies, getContacts, getOpportunitiesByStage, opportunityQueryKeys } from '../../api/client'
import { displayValue } from '../shared/display'
import { orderStagesByPosition, stageToneClass } from '../opportunities/opportunityData'
import './home.css'

type BreakdownItem = { label: string; count: number; tone?: string }
function countByLabel(values: Array<string | null | undefined>): BreakdownItem[] {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    const label = displayValue(value)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  })
  return [...counts].map(([label, count]) => ({ label, count })).sort((left, right) => left.label.localeCompare(right.label, 'es'))
}
function Pulse({ label, to, query, value, icon, tone, breakdownLabel, items }: { label: string; to: string; query: { isPending: boolean; isError: boolean }; value: number; icon: ReactNode; tone: 'teal' | 'blue' | 'amber'; breakdownLabel: string; items: BreakdownItem[] }) {
  return <article className={`home-pulse-card home-pulse-card--${tone}`}><Link to={to} className="home-pulse-item" aria-label={`${label}: ${query.isError ? 'no disponible' : value}`}><span className="home-pulse-icon" aria-hidden="true">{icon}</span><div className="home-pulse-copy"><Typography color="text.secondary" className="home-pulse-label">{label}</Typography><Typography className="home-pulse-value">{query.isPending ? <Skeleton width={42} /> : query.isError ? '-' : value}</Typography></div></Link><BreakdownList label={breakdownLabel} entity={label} query={query} items={items} /></article>
}
function BreakdownList({ label, entity, query, items }: { label: string; entity: string; query: { isPending: boolean; isError: boolean }; items: BreakdownItem[] }) {
  return <section className="home-pulse-breakdown" aria-label={`${entity} ${label.toLocaleLowerCase('es')}`}><Typography className="home-pulse-breakdown-title">{label}</Typography>
    {query.isPending ? <div className="home-pulse-breakdown-loading" aria-label={`Cargando ${label}`}><Skeleton width="84%" height={22} /><Skeleton width="68%" height={22} /></div> : query.isError ? <Typography className="home-pulse-breakdown-empty">No disponible</Typography> : items.length === 0 ? <Typography className="home-pulse-breakdown-empty">Sin datos para desglosar</Typography> : <ul className="home-pulse-breakdown-list">{items.map(({ label: itemLabel, count, tone }) => <li className={`home-pulse-breakdown-item${tone ? ` ${tone}` : ''}`} key={itemLabel}><span>{itemLabel}</span><strong>{count}</strong></li>)}</ul>}
  </section>
}
export function HomePage() {
  const { user } = useAuth()
  const companies = useQuery({ queryKey: empresaQueryKeys.all, queryFn: getCompanies })
  const contacts = useQuery({ queryKey: contactoQueryKeys.all, queryFn: getContacts })
  const opportunities = useQuery({ queryKey: opportunityQueryKeys.pipeline, queryFn: getOpportunitiesByStage })
  const failed = [companies, contacts, opportunities].filter((query) => query.isError)
  const opportunityBreakdown = orderStagesByPosition(opportunities.data ?? []).reduce<BreakdownItem[]>((items, stage) => {
    const label = displayValue(stage.nombre)
    const existing = items.find((item) => item.label === label)
    if (existing) existing.count += stage.oportunidades.length
    else items.push({ label, count: stage.oportunidades.length })
    return items
  }, [])
  const companyBreakdown = countByLabel((companies.data ?? []).map((company) => company.estadoDescripcion))
  const contactBreakdown = countByLabel((contacts.data ?? []).map((contact) => contact.estadoDescripcion))
  return <Box className="home-page"><Typography component="h1" className="home-title">Hola, {user?.nombre}</Typography><Typography className="home-description">Tu actividad comercial, en un vistazo.</Typography>
    <section className="home-pulse" aria-labelledby="pulse-title"><Typography id="pulse-title" className="home-pulse-title">Pulso comercial</Typography><Box className="home-pulse-grid">
      <Pulse label="Oportunidades" to="/oportunidades" query={opportunities} value={(opportunities.data ?? []).reduce((total, stage) => total + stage.oportunidades.length, 0)} icon={<ViewKanbanOutlined fontSize="small" />} tone="teal" breakdownLabel="Por etapa" items={opportunityBreakdown.map((item, index) => ({ ...item, tone: stageToneClass(index) }))} />
      <Pulse label="Empresas" to="/empresas" query={companies} value={(companies.data ?? []).length} icon={<BusinessOutlined fontSize="small" />} tone="blue" breakdownLabel="Por estado" items={companyBreakdown} />
      <Pulse label="Contactos" to="/contactos" query={contacts} value={(contacts.data ?? []).length} icon={<GroupsOutlined fontSize="small" />} tone="amber" breakdownLabel="Por estado" items={contactBreakdown} />
    </Box></section>
    {failed.length > 0 && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => failed.forEach((query) => void query.refetch())}>Reintentar</Button>}>No pudimos actualizar algunos indicadores</Alert>}
  </Box>
}
