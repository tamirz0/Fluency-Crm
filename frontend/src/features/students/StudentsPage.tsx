import { Refresh } from '@mui/icons-material'
import { Box, Button, Link, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { listStudents, studentQueryKeys } from '../../api/client'
import { displayValue } from '../shared/display'
import '../companies/companies.css'
import '../contacts/records.css'

const columns = ['Nombre completo', 'Documento', 'Correo', 'Nivel', 'Curso']

/** Alumnos: contactos que ganaron un servicio de clases. El profesor solo ve los de sus niveles (lo decide el servidor). */
export function StudentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const filters = { q, page: page + 1, pageSize }
  const { data, error, isPending, refetch } = useQuery({ queryKey: [...studentQueryKeys.all, 'list', filters], queryFn: () => listStudents(filters) })
  return <Box className="companies-page records-page">
    <header className="companies-page-header"><div><Typography component="h1" className="companies-page-title">Alumnos</Typography><Typography className="companies-page-description">Personas que ya contrataron un servicio de nivel de inglés.</Typography></div></header>
    <Box component="form" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(0) }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'start' }}>
      <TextField label="Buscar alumnos" type="search" value={search} onChange={e => setSearch(e.target.value)} helperText="Nombre, documento o correo" />
      <Button type="submit" variant="outlined">Buscar</Button><Button type="button" onClick={() => { setSearch(''); setQ(''); setPage(0) }}>Limpiar</Button>
    </Box>
    {isPending ? <div className="companies-loading" role="status" aria-label="Cargando alumnos"><Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} /></div> : error ? <section className="company-feedback" aria-labelledby="students-error-title">
      <Typography id="students-error-title" component="h2" className="company-feedback-title">No pudimos cargar los alumnos</Typography><Typography color="text.secondary">{error.message}</Typography><Button onClick={() => void refetch()} startIcon={<Refresh />} variant="outlined">Reintentar</Button>
    </section> : <>
      <Typography role="status" sx={{ mb: 2 }}>{data.totalCount} {data.totalCount === 1 ? 'alumno' : 'alumnos'}</Typography>
      {data.items.length === 0 ? <section className="company-feedback" aria-labelledby="students-empty-title">
        <Typography id="students-empty-title" component="h2" className="company-feedback-title">{q || page ? 'No hay alumnos para esta búsqueda' : 'Todavía no hay alumnos'}</Typography>
        <Typography color="text.secondary">Un contacto pasa a ser alumno cuando se gana una oportunidad de un servicio de tipo Clases (siempre asociado a un nivel de inglés). Si sos profesor, marcá tus niveles en Mi perfil.</Typography>
      </section> : <TableContainer className="data-table-wrap"><Table aria-label="Alumnos" size="small">
        <caption className="visually-hidden">Listado de alumnos</caption>
        <TableHead><TableRow>{columns.map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{data.items.map(student => <TableRow key={student.id} className="company-clickable-row" onClick={() => navigate(`/alumnos/${student.id}`)}>
          <TableCell className="company-name-cell"><Link component={RouterLink} to={`/alumnos/${student.id}`} underline="hover" onClick={event => event.stopPropagation()}>{student.apellido}, {student.nombre}</Link></TableCell>
          <TableCell>{displayValue(student.documento)}</TableCell><TableCell>{displayValue(student.correo)}</TableCell><TableCell>{student.nivel.descripcion}</TableCell><TableCell>{student.curso ? student.curso.descripcion : 'Sin curso'}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>}
      <TablePagination component="div" count={Number(data.totalCount)} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Alumnos por página" />
    </>}
  </Box>
}
