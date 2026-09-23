import { Typography } from '@mui/material'
import { displayValue } from './display'

export function ReadOnlyValue({ label, value, description, className }: { label: string; value: string; description: string; className?: string }) {
  return <div className={`readonly-value${className ? ` ${className}` : ''}`}><Typography component="h3">{label}</Typography><Typography>{displayValue(value)}</Typography><Typography color="text.secondary">{description}</Typography></div>
}
