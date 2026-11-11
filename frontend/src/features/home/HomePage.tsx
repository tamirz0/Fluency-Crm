import { CalendarMonth, CheckCircleOutlined, ChevronRight, FilterAltOutlined, MonetizationOnOutlined, Refresh, SchoolOutlined } from '@mui/icons-material'
import { Alert, Box, Button, Divider, Link, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getFunnel, getHomeSummary, lessonQueryKeys, listFunnels, listLessons, listOpportunities, opportunityQueryKeys, type Funnel, type OportunidadQuery } from '../../api/client'
import { canUseAcademy } from '../../app/navigation'
import { useAuth } from '../../auth/useAuth'
import './home.css'

const previewSize = 3
const recentFilters = { estado: 'ABIERTA', page: 1, pageSize: previewSize } satisfies OportunidadQuery
const argentinaMonth = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })

function HomePanel({ title, link, to, children }: { title: string; link: string; to: string; children: ReactNode }) {
  return <Paper component="section" variant="outlined" className="home-panel">
    <Box className="home-panel-heading">
      <Typography component="h2" variant="h6">{title}</Typography>
      <Link component={RouterLink} to={to} underline="hover">{link}</Link>
    </Box>
    {children}
  </Paper>
}

const stageTones = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1']

function StageChart({ stages }: { stages: Funnel['etapas'] }) {
  const open = stages.filter(stage => stage.estado === 'ABIERTA')
  const total = open.reduce((count, stage) => count + stage.oportunidades.length, 0)

  return <figure className="home-chart">
    {total ? <>
      <figcaption>{total} {total === 1 ? 'oportunidad abierta' : 'oportunidades abiertas'} en este embudo</figcaption>
      <ul>
        {open.map((stage, index) => <li key={stage.id}>
          <span>{stage.nombre}</span><strong>{stage.oportunidades.length}</strong>
          <div className="home-chart-track" aria-hidden="true">
            <div style={{ width: `${stage.oportunidades.length / total * 100}%`, backgroundColor: stageTones[index % stageTones.length] }} />
          </div>
        </li>)}
      </ul>
    </> : <figcaption>No hay oportunidades abiertas en este embudo.</figcaption>}
  </figure>
}

function HomeEntries({ children }: { children: ReactNode }) {
  return <Stack component="ul" divider={<Divider component="li" aria-hidden="true" />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
    {children}
  </Stack>
}

function HomeEntry({ title, subtitle, to, course }: { title: string; subtitle: string; to: string; course?: string }) {
  return <Box component="li">
    <Link component={RouterLink} to={to} underline="none" className={course ? 'home-entry home-entry--class' : 'home-entry'}>
      <span className="home-entry-title">{title}</span>{' '}
      <span className="home-entry-meta">{subtitle}</span>{' '}
      {course ? <span className="home-entry-course">{course}</span> : <ChevronRight className="home-entry-arrow" />}
    </Link>
  </Box>
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={retry}>Reintentar</Button>}>{message}</Alert>
}

export function HomePage() {
  const { user } = useAuth()
  const academy = canUseAcademy(user)
  const showClasses = academy && !!user?.roles?.includes('ADMINISTRADOR')
  const [selected, setSelected] = useState('')
  const now = dayjs()
  const range = { desde: now.format('YYYY-MM-DD'), hasta: now.add(29, 'day').format('YYYY-MM-DD') }
  const summary = useQuery({ queryKey: ['inicio', 'resumen'], queryFn: getHomeSummary, refetchOnMount: 'always' })
  const recent = useQuery({ queryKey: opportunityQueryKeys.list(recentFilters), queryFn: () => listOpportunities(recentFilters) })
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const activeFunnels = funnels.data?.items?.filter(item => item.activo) ?? []
  const funnelId = activeFunnels.find(item => String(item.id) === selected)?.id ?? activeFunnels[0]?.id
  const funnel = useQuery({
    queryKey: opportunityQueryKeys.funnel(Number(funnelId ?? 0)),
    queryFn: () => getFunnel(Number(funnelId)),
    enabled: funnelId !== undefined,
  })
  const classes = useQuery({
    queryKey: [...lessonQueryKeys.all, 'rango', range],
    queryFn: () => listLessons(range),
    enabled: showClasses,
  })
  const lessons = classes.data?.filter(lesson =>
    lesson.fecha > range.desde || lesson.horaInicio.slice(0, 8) >= now.format('HH:mm:ss')).slice(0, previewSize) ?? []
  const stats = [
    { label: 'Oportunidades abiertas', value: summary.data?.oportunidadesAbiertas, icon: <MonetizationOnOutlined />, tone: 'blue', link: { to: '/oportunidades?estado=ABIERTA', label: 'Ver activas' } },
    { label: `Cierres de ${argentinaMonth.format(now.toDate())}`, value: summary.data?.cerradasEsteMes, icon: <CheckCircleOutlined />, tone: 'mint' },
    { label: 'Alumnos activos', value: summary.data?.alumnos, to: academy ? '/alumnos' : undefined, icon: <SchoolOutlined />, tone: 'neutral' },
  ]

  return <Box className="home-page fluency-shell-type">
    <header className="home-overview">
      <div className="home-overview-intro">
        <Typography component="h1">Inicio</Typography>
        <Typography component="p">Resumen comercial{showClasses ? ' y académico' : ''}</Typography>
      </div>
      <Button component={RouterLink} to="/embudo" variant="contained" startIcon={<FilterAltOutlined />}>Ir al embudo</Button>
    </header>
    {summary.isError && <LoadError message="No pudimos cargar las cifras del inicio." retry={() => void summary.refetch()} />}
    <section aria-label="Resumen">
      <dl className="home-metrics">
        {stats.map(({ label, value, to, icon, tone, link }) => <div key={label} className={`home-metric home-metric--${tone}`}>
          <Typography component="dt" variant="body2" color="text.secondary">
            <span className="home-metric-icon" aria-hidden="true">{icon}</span>
            {to ? <Link component={RouterLink} to={to} underline="hover">{label}</Link> : label}
          </Typography>
          <Typography component="dd" className="home-metric-number"
            aria-label={summary.isPending ? `Cargando ${label}` : `${label}: ${summary.isError ? 'no disponible' : value ?? 'no disponible'}`}>
            {summary.isPending ? <Skeleton width={32} /> : summary.isError ? '—' : value ?? '—'}
          </Typography>
          {link && <Typography component="dd" className="home-metric-hint" variant="body2" color="text.secondary">
            <Link component={RouterLink} to={link.to} underline="hover">{link.label}</Link>
          </Typography>}
        </div>)}
      </dl>
    </section>

    <div className={`home-work${showClasses ? ' home-work--academy' : ''}`}>
      <HomePanel title="Oportunidades por etapa" to={funnelId === undefined ? '/embudo' : `/embudo?idEmbudo=${funnelId}`} link="Ver embudo completo">
        {activeFunnels.length > 1 && <TextField select label="Embudo" size="small" value={String(funnelId)} onChange={event => setSelected(event.target.value)} className="home-funnel-select">
          {activeFunnels.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
        </TextField>}
        {funnels.isError || funnel.isError ? <LoadError message="No pudimos cargar el embudo." retry={() => void (funnels.isError ? funnels.refetch() : funnel.refetch())} />
          : funnels.isPending || (funnelId !== undefined && funnel.isPending) ? <Skeleton variant="rounded" height={116} aria-label="Cargando gráfico" />
            : funnel.data ? <StageChart stages={funnel.data.etapas} /> : <Typography color="text.secondary">No hay embudos activos.</Typography>}
      </HomePanel>
      {showClasses && <HomePanel title="Próximas clases" to="/clases" link="Ver calendario">
        {classes.isPending ? <Typography role="status" color="text.secondary">Cargando clases…</Typography>
          : classes.isError ? <LoadError message="No pudimos cargar las clases." retry={() => void classes.refetch()} />
            : lessons.length ? <ul className="home-agenda">
              {lessons.map(lesson => {
                const date = dayjs(lesson.fecha).locale('es')
                const day = date.isSame(now, 'day') ? 'Hoy' : date.isSame(now.add(1, 'day'), 'day') ? 'Mañana' : date.format('D [de] MMMM')
                const time = `${lesson.horaInicio.slice(0, 5)}–${lesson.horaFin.slice(0, 5)}`
                return <HomeEntry key={lesson.id} title={lesson.titulo} to={`/clases/${lesson.id}`} course={lesson.curso.descripcion}
                  subtitle={`${day} ${time} · ${lesson.profesor.descripcion}`} />
              })}
            </ul> : <Box className="home-agenda-empty"><CalendarMonth aria-hidden="true" /><Typography color="text.secondary">No hay clases programadas para los próximos 30 días.</Typography></Box>}
      </HomePanel>}
    </div>
    <HomePanel title="Oportunidades recientes" to="/oportunidades?estado=ABIERTA" link="Ver activas">
      {recent.isPending ? <Typography role="status" color="text.secondary">Cargando oportunidades…</Typography>
        : recent.isError ? <LoadError message="No pudimos cargar las oportunidades." retry={() => void recent.refetch()} />
          : recent.data.items.length ? <HomeEntries>
            {recent.data.items.map(item => <HomeEntry key={item.id} title={item.tituloVisible} to={`/oportunidades/${item.id}`}
              subtitle={[item.contactoNombre, item.empresaRazonSocial, item.etapaNombre].filter(Boolean).join(' · ')} />)}
          </HomeEntries> : <Typography color="text.secondary">No hay oportunidades abiertas.</Typography>}
    </HomePanel>
  </Box>
}
