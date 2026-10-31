import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Autocomplete, Box, Button, TextField } from '@mui/material'
import { getUserOptions } from '../../api/client'

export function CompanyResponsibleSelect({ value, onChange, current, helperText, disabled = false }: {
  value: string; onChange: (value: string) => void; current?: { id: number | string; nombre: string; activo: boolean }; helperText?: string; disabled?: boolean
}) {
  const [chosen, setChosen] = useState(current)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = { q: search, page, pageSize: 25 }
  const users = useQuery({ queryKey: ['usuarios-opciones', query], queryFn: () => getUserOptions(query) })
  const options = (users.data?.items ?? []).map(u => ({ id: u.id, nombre: `${u.nombre} ${u.apellido}`, activo: true }))
  if (current && !options.some(u => u.id === current.id)) options.unshift({ ...current, id: Number(current.id) })
  if (chosen && String(chosen.id) === value && !options.some(u => String(u.id) === value)) options.unshift({ ...chosen, id: Number(chosen.id) })
  const selected = options.find(u => String(u.id) === value) ?? null
  return <Box>
    <Autocomplete options={options} value={selected} disabled={disabled} loading={users.isPending} filterOptions={x => x}
      getOptionLabel={u => u.nombre + (u.activo ? '' : ' (inactivo)')} isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionDisabled={u => !u.activo} onChange={(_, u) => { setChosen(u ?? undefined); onChange(u ? String(u.id) : '') }}
      onInputChange={(_, input, reason) => { if (reason === 'input' || reason === 'clear') { setPage(1); setSearch(input) } }}
      noOptionsText="Sin responsables disponibles" loadingText="Cargando responsables…"
      renderInput={params => <TextField {...params} label="Responsable" helperText={helperText} />} />
    {users.isError && <Alert severity="warning" action={<Button onClick={() => void users.refetch()}>Reintentar</Button>}>No pudimos cargar responsables.</Alert>}
    {(page > 1 || Number(users.data?.totalCount ?? 0) > 25) && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button disabled={page === 1 || users.isFetching} onClick={() => setPage(p => p - 1)}>Responsables anteriores</Button>
      <span>Página {page}</span>
      <Button disabled={users.isFetching || page * 25 >= Number(users.data?.totalCount ?? 0)} onClick={() => setPage(p => p + 1)}>Más responsables</Button>
    </Box>}
  </Box>
}
