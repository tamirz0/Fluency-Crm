import { Chip } from '@mui/material'

function companyStatusTone(value: string | null | undefined) {
  const normalized = value?.toLocaleLowerCase('es') ?? ''
  return /cliente|activo|ganad/.test(normalized) ? 'positive' : /potencial|prospect/.test(normalized) ? 'prospect' : 'neutral'
}

export function CompanyStatus({ value }: { value: string | null | undefined }) {
  const label = value?.trim() || 'Sin informar'
  const tone = companyStatusTone(value)
  return <Chip className={`company-status company-status--${tone}`} label={label} size="small" />
}
