import { ChevronRight, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Divider, Link, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import './home.css'

/** Bloques compartidos por los inicios (comercial y profesor): panel con enlace, lista de entradas, tarjetas de cifras y aviso de error. */
export function HomePanel({ title, link, to, children }: { title: string; link: string; to: string; children: ReactNode }) {
  return <Paper component="section" variant="outlined" className="home-panel" aria-label={title}>
    <Box className="home-panel-heading">
      <Typography component="h2" variant="h6">{title}</Typography>
      <Link component={RouterLink} to={to} underline="hover">{link}</Link>
    </Box>
    {children}
  </Paper>
}

export function HomeEntries({ children }: { children: ReactNode }) {
  return <Stack component="ul" divider={<Divider component="li" aria-hidden="true" />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
    {children}
  </Stack>
}

export function HomeEntry({ title, subtitle, to, course, from }: { title: string; subtitle: string; to: string; course?: string; from?: { to: string; label: string } }) {
  return <Box component="li">
    <Link component={RouterLink} to={to} state={from ? { from } : undefined} underline="none" className={course ? 'home-entry home-entry--class' : 'home-entry'}>
      <span className="home-entry-title">{title}</span>{' '}
      <span className="home-entry-meta">{subtitle}</span>{' '}
      {course ? <span className="home-entry-course">{course}</span> : <ChevronRight className="home-entry-arrow" />}
    </Link>
  </Box>
}

export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<Refresh />} onClick={retry}>Reintentar</Button>}>{message}</Alert>
}

export type HomeStat = {
  label: string
  value: string | number | undefined
  icon: ReactNode
  tone: 'blue' | 'mint' | 'neutral'
  /** El rótulo se vuelve enlace. */
  to?: string
  /** Enlace secundario debajo de la cifra. */
  link?: { to: string; label: string }
  /** Valor largo en texto (no un número): se muestra con letra más chica. */
  text?: boolean
}

export function HomeMetrics({ stats, pending, failed }: { stats: HomeStat[]; pending: boolean; failed: boolean }) {
  return <section aria-label="Resumen">
    <dl className="home-metrics">
      {stats.map(({ label, value, to, icon, tone, link, text }) => <div key={label} className={`home-metric home-metric--${tone}`}>
        <Typography component="dt" variant="body2" color="text.secondary">
          <span className="home-metric-icon" aria-hidden="true">{icon}</span>
          {to ? <Link component={RouterLink} to={to} underline="hover">{label}</Link> : label}
        </Typography>
        <Typography component="dd" className={`home-metric-number${text ? ' home-metric-number--text' : ''}`}
          aria-label={pending ? `Cargando ${label}` : `${label}: ${failed ? 'no disponible' : value ?? 'no disponible'}`}>
          {pending ? <Skeleton width={32} /> : failed ? '—' : value ?? '—'}
        </Typography>
        {link && <Typography component="dd" className="home-metric-hint" variant="body2" color="text.secondary">
          <Link component={RouterLink} to={link.to} underline="hover">{link.label}</Link>
        </Typography>}
      </div>)}
    </dl>
  </section>
}
