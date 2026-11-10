import { ArrowBack } from '@mui/icons-material'
import { Alert, Autocomplete, Box, Button, Chip, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ApiRequestError, enrollInWorkshop, getWorkshop, getWorkshopCandidates, workshopQueryKeys } from '../../api/client'
import { parsePositiveId } from '../shared/display'
import '../companies/companies.css'
import '../contacts/records.css'

function Enroll({ id }: { id: number }) {
  const client = useQueryClient()
  const [selected, setSelected] = useState<{ id: number; label: string } | null>(null)
  const candidates = useQuery({ queryKey: [...workshopQueryKeys.detail(id), 'candidatos'], queryFn: () => getWorkshopCandidates(id) })
  const save = useMutation({
    mutationFn: (contact: number) => enrollInWorkshop(id, contact),
    onSuccess: async data => { client.setQueryData(workshopQueryKeys.detail(id), data); setSelected(null); await client.invalidateQueries({ queryKey: workshopQueryKeys.all }) },
  })
  return <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
    <Autocomplete sx={{ minWidth: 280, flex: '1 1 280px', maxWidth: 480 }} value={selected} onChange={(_, value) => setSelected(value)} isOptionEqualToValue={(a, b) => a.id === b.id} loading={candidates.isPending}
      options={(candidates.data ?? []).map(p => ({ id: Number(p.idContacto), label: `${p.apellido}, ${p.nombre}${p.esAlumno ? ' · alumno' : ''}` }))} noOptionsText="No hay personas para anotar"
      renderInput={params => <TextField {...params} label="Anotar a una persona" helperText={candidates.isError ? candidates.error.message : 'Alumnos y clientes a quienes se les vendió este taller.'} error={candidates.isError} />} />
    <Button variant="contained" sx={{ mt: .5 }} disabled={!selected || save.isPending} onClick={() => selected && save.mutate(selected.id)}>{save.isPending ? 'Anotando…' : 'Anotar'}</Button>
    {save.isError && <Alert severity="error" sx={{ width: '100%' }}>{save.error.message}</Alert>}
  </Box>
}

/** Taller: lista de las personas anotadas y su cantidad. */
export function WorkshopDetailPage() {
  const { idTaller: routeId } = useParams()
  const id = parsePositiveId(routeId)
  const query = useQuery({ queryKey: workshopQueryKeys.detail(id ?? 0), queryFn: () => getWorkshop(id as number), enabled: id !== undefined })
  const back = <Link component={RouterLink} to="/talleres" className="company-back-link" underline="hover"><ArrowBack fontSize="small" />Volver a talleres</Link>
  if (id === undefined || (query.isError && query.error instanceof ApiRequestError && query.error.status === 404))
    return <Box className="companies-page company-result-page records-page">{back}<section className="company-feedback"><Typography component="h1" className="company-feedback-title">No encontramos el taller</Typography></section></Box>
  if (query.isPending) return <Box className="companies-page company-result-page records-page" role="status" aria-label="Cargando taller"><Skeleton width="54%" height={54} /><Skeleton /><Skeleton /></Box>
  if (query.isError) return <Box className="companies-page company-result-page records-page">{back}<Alert severity="error">No pudimos cargar el taller. {query.error.message}</Alert></Box>
  const { taller, inscriptos } = query.data
  return <Box className="companies-page company-result-page records-page">
    {back}
    <Typography component="h1" className="companies-page-title">{taller.titulo}</Typography>
    <Typography className="companies-page-description">{dayjs(taller.fecha).locale('es').format('dddd D [de] MMMM [de] YYYY')} · {taller.horaInicio.slice(0, 5)} a {taller.horaFin.slice(0, 5)} · {taller.servicio.descripcion}</Typography>
    <Typography component="p" sx={{ mt: 3, fontSize: 40, fontWeight: 800, color: 'primary.light' }} aria-label={`Anotados: ${taller.cantidadInscriptos}`}>{taller.cantidadInscriptos} <Typography component="span" color="text.secondary">{taller.cantidadInscriptos === 1 ? 'persona anotada' : 'personas anotadas'}</Typography></Typography>
    {inscriptos.length === 0 ? <section className="company-feedback"><Typography color="text.secondary">Todavía no hay personas anotadas.</Typography></section>
      : <TableContainer className="data-table-wrap"><Table size="small" aria-label="Personas anotadas"><TableHead><TableRow><TableCell>Apellido y nombre</TableCell><TableCell>Documento</TableCell><TableCell>Tipo</TableCell></TableRow></TableHead>
        <TableBody>{inscriptos.map(p => <TableRow key={p.idContacto}><TableCell>{p.apellido}, {p.nombre}</TableCell><TableCell>{p.documento?.trim() || '-'}</TableCell><TableCell>{p.esAlumno ? <Chip size="small" color="primary" variant="outlined" label="Alumno" /> : <Chip size="small" variant="outlined" label="Cliente" />}</TableCell></TableRow>)}</TableBody></Table></TableContainer>}
    <Enroll id={id} />
  </Box>
}
