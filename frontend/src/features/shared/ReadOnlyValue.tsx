import { Typography } from '@mui/material'

export function ReadOnlyValue({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="readonly-value"><Typography component="h3">{label}</Typography><Typography>{value || 'Sin informar'}</Typography><Typography color="text.secondary">{description}</Typography></div>
}
