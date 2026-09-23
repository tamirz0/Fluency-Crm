import { ArrowBack, Save } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material'
import { ApiRequestError } from '../../api/client'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export function FormFieldError({ message }: { message?: string }) {
  return message ? <Typography className="record-form-error" role="alert">{message}</Typography> : null
}

export function CatalogMessage({ error, onRetry, blocking = false }: { error: unknown; onRetry: () => void; blocking?: boolean }) {
  if (!error) return null
  return <Alert severity={blocking ? 'error' : 'warning'} action={<Button color="inherit" size="small" onClick={onRetry}>Reintentar</Button>}>
    {blocking ? 'No pudimos cargar un catálogo necesario para crear este registro. Reintentá antes de guardarlo.' : 'No pudimos cargar este catálogo. Podés continuar y reintentar cuando lo necesites.'}
  </Alert>
}

type RecordQueryStateProps = {
  noun: 'empresa' | 'contacto' | 'oportunidad'
  backLabel: string
  backTo: string
  loading: boolean
  invalid?: boolean
  error?: unknown
  onRetry: () => void
}

const recordTitles = {
  empresa: { notFound: 'No encontramos esa empresa', loadError: 'No pudimos cargar los datos de la empresa' },
  contacto: { notFound: 'No encontramos ese contacto', loadError: 'No pudimos cargar los datos del contacto' },
  oportunidad: { notFound: 'No encontramos esa oportunidad', loadError: 'No pudimos cargar los datos de la oportunidad' },
} as const

export function RecordQueryState({ noun, backLabel, backTo, loading, invalid = false, error, onRetry }: RecordQueryStateProps) {
  const titles = recordTitles[noun]
  const notFound = invalid || (error instanceof ApiRequestError && error.status === 404)

  if (loading && !notFound) return <div className="companies-page" role="status">Cargando {noun}…</div>

  return <Box className="companies-page company-result-page">
    <Link component={RouterLink} to={backTo} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{backLabel}</Link>
    <section className="company-feedback" aria-labelledby={`${noun}-query-state-title`}>
      <Typography id={`${noun}-query-state-title`} component="h1" className="company-feedback-title">{notFound ? titles.notFound : titles.loadError}</Typography>
      <Typography color="text.secondary">{notFound ? `El enlace puede estar vencido o ${noun} ya no estar disponible.` : 'Revisá la conexión e intentá de nuevo.'}</Typography>
      {!notFound && <div className="company-feedback-actions"><Button onClick={onRetry} variant="outlined">Reintentar</Button><Button component={RouterLink} to={backTo}>Volver al listado</Button></div>}
    </section>
  </Box>
}

export function RecordFormPage({
  backLabel,
  backTo,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  submitting,
  disabled,
  error,
}: {
  backLabel: string
  backTo: string
  title: string
  description: string
  children: ReactNode
  onSubmit: () => void
  submitLabel: string
  submitting: boolean
  disabled?: boolean
  error?: string
}) {
  return <Box className="companies-page company-result-page record-form-page">
    <Link component={RouterLink} to={backTo} className="company-back-link" underline="hover"><ArrowBack fontSize="small" />{backLabel}</Link>
    <header className="record-form-header"><Typography component="h1" className="companies-page-title">{title}</Typography><Typography className="companies-page-description">{description}</Typography></header>
    {error && <Alert severity="error" className="record-form-api-error" role="alert">{error}</Alert>}
    <Box component="form" className="record-form" noValidate onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
      {children}
      <div className="record-form-actions"><Button component={RouterLink} to={backTo} disabled={submitting}>Cancelar</Button><Button type="submit" variant="contained" disabled={submitting || disabled} startIcon={submitting ? <CircularProgress color="inherit" size={18} /> : <Save />}>{submitting ? 'Guardando…' : submitLabel}</Button></div>
    </Box>
  </Box>
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="record-form-section"><div className="record-form-section-heading"><Typography component="h2">{title}</Typography>{description && <Typography>{description}</Typography>}</div><div className="record-form-grid">{children}</div></section>
}
