import { CalendarMonth, CheckCircleOutlined, FilterAltOutlined, MonetizationOnOutlined, SchoolOutlined } from '@mui/icons-material'
import { Box, Button, MenuItem, Skeleton, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { getFunnel, getHomeSummary, lessonQueryKeys, listFunnels, listLessons, listOpportunities, opportunityQueryKeys, type Funnel, type OportunidadQuery } from '../../api/client'
import { canUseAcademy } from '../../app/navigation'
import { money } from '../opportunities/opportunityData'
import { useAuth } from '../../auth/useAuth'
import { HomeEntries, HomeEntry, HomeMetrics, HomePanel, LoadError, type HomeStat } from './homeParts'
import './home.css'

const previewSize = 3
const recentFilters = { estado: 'ABIERTA', page: 1, pageSize: previewSize } satisfies OportunidadQuery
const argentinaMonth = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })

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
  const closed = summary.data?.cerradasEsteMes
  const closures = closed === undefined ? undefined
    : `${closed} ${Number(closed) === 1 ? 'oportunidad' : 'oportunidades'} - ${money(summary.data?.valorGanadasEsteMes ?? 0)}`
  const stats: HomeStat[] = [
    { label: 'Oportunidades abiertas', value: summary.data?.oportunidadesAbiertas, icon: <MonetizationOnOutlined />, tone: 'blue', link: { to: '/oportunidades?estado=ABIERTA', label: 'Ver activas' } },
    { label: `Cierres de ${argentinaMonth.format(now.toDate())}`, value: closures, icon: <CheckCircleOutlined />, tone: 'mint', text: true },
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
    <HomeMetrics stats={stats} pending={summary.isPending} failed={summary.isError} />

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
              from={{ to: '/inicio', label: 'Volver al inicio' }}
              subtitle={[item.contactoNombre, item.empresaRazonSocial, item.etapaNombre].filter(Boolean).join(' · ')} />)}
          </HomeEntries> : <Typography color="text.secondary">No hay oportunidades abiertas.</Typography>}
    </HomePanel>
  </Box>
}
