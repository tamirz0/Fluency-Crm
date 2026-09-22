import { Chip } from '@mui/material'

function companyStatusTone(value: string | null | undefined) {
  const normalized = value?.toLocaleLowerCase('es') ?? ''
  if (normalized.trim() === 'inactivo') return 'inactive'
  if (['cliente', 'activo', 'ganado'].some((status) => normalized.includes(status))) return 'positive'
  if (['potencial', 'prospecto'].some((status) => normalized.includes(status))) return 'prospect'
  return 'neutral'
}

export function CompanyStatus({ value }: { value: string | null | undefined }) {
  const label = value?.trim() || 'Sin informar'
  const tone = companyStatusTone(value)
  return <Chip className={`company-status company-status--${tone}`} label={label} size="small" />
}
