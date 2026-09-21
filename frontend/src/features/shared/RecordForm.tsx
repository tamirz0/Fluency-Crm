import { ArrowBack, Save } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

export function FormFieldError({ message }: { message?: string }) {
  return message ? <Typography className="record-form-error" role="alert">{message}</Typography> : null
}

export function CatalogMessage({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!error) return null
  return <Alert severity="warning" action={<Button color="inherit" size="small" onClick={onRetry}>Reintentar</Button>}>No pudimos cargar este catálogo. Podés reintentar o guardar el resto del formulario.</Alert>
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
