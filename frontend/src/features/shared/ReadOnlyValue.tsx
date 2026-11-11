import { Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { displayValue } from './display'

export function ReadOnlyValue({ label, value, description, className, icon }: { label: string; value: string; description?: string; className?: string; icon?: ReactNode }) {
  return <div className={`readonly-value${className ? ` ${className}` : ''}`}><Typography component="h3">{label}</Typography><Typography className={icon ? 'readonly-value-content' : undefined}>{icon && <span className="readonly-value-icon" aria-hidden="true">{icon}</span>}<span>{displayValue(value)}</span></Typography>{description && <Typography color="text.secondary">{description}</Typography>}</div>
}
