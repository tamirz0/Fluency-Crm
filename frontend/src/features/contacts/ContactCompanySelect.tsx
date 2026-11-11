import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Autocomplete, Box, Button, TextField } from '@mui/material'
import { listCompanies } from '../../api/client'

type CompanyOption = { id: number; razonSocial: string }

/** Busca empresas en el servidor; `current` conserva la etiqueta de la empresa ya vinculada aunque no aparezca en la búsqueda. */
export function ContactCompanySelect({ value, onChange, current, helperText, disabled = false, size, optionsClassName }: {
  value: string; onChange: (value: string) => void; current?: CompanyOption; helperText?: string; disabled?: boolean; size?: 'small'; optionsClassName?: string
}) {
  const [chosen, setChosen] = useState(current)
  const [search, setSearch] = useState('')
  const companies = useQuery({ queryKey: ['empresas', 'opciones', search], queryFn: () => listCompanies({ q: search.trim() || undefined, pageSize: 25 }) })
  const options: CompanyOption[] = (companies.data?.items ?? []).map(c => ({ id: Number(c.id), razonSocial: c.razonSocial }))
  for (const extra of [current, chosen]) if (extra && String(extra.id) === value && !options.some(o => o.id === extra.id)) options.unshift(extra)
  const selected = options.find(o => String(o.id) === value) ?? null
  const total = Number(companies.data?.totalCount ?? 0)
  return <Box>
    <Autocomplete size={size} options={options} value={selected} disabled={disabled} loading={companies.isPending} filterOptions={x => x}
      slotProps={{ paper: { className: optionsClassName } }}
      getOptionLabel={o => o.razonSocial} isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, o) => { setChosen(o ?? undefined); onChange(o ? String(o.id) : '') }}
      onInputChange={(_, input, reason) => { if (reason === 'input' || reason === 'clear') setSearch(input) }}
      noOptionsText="Sin empresas disponibles" loadingText="Cargando empresas…" clearText="Quitar empresa"
      renderInput={params => <TextField {...params} label="Empresa" helperText={helperText} />} />
    {total > 25 && <p className="record-form-note">Se muestran 25 de {total} empresas. Escribí para acotar la búsqueda.</p>}
    {companies.isError && <Alert severity="warning" action={<Button onClick={() => void companies.refetch()}>Reintentar</Button>}>No pudimos cargar las empresas.</Alert>}
  </Box>
}
