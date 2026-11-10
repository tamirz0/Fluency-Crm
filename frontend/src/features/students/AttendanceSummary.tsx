import { Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import dayjs from 'dayjs'
import type { Asistencia } from '../../api/client'

/** Asistencia del alumno: en grande «presentes/clases» y el detalle por clase. Compartido por la ficha del alumno y la del contacto. */
export function AttendanceSummary({ data }: { data: Asistencia }) {
  return <Box component="section" aria-label="Asistencia" sx={{ mt: 4 }}>
    <Typography component="h2" variant="h6" sx={{ mb: 1 }}>Asistencia</Typography>
    {!data.curso ? <Typography color="text.secondary">Todavía no está en un curso, por eso no tiene clases para asistir.</Typography> : <>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography component="p" aria-label={`Asistencias: ${data.presentes} de ${data.clases} clases`} sx={{ fontSize: { xs: 48, md: 64 }, fontWeight: 800, lineHeight: 1, color: 'primary.light' }}>{data.presentes}/{data.clases}</Typography>
        <Typography color="text.secondary">asistencias a las clases de {data.curso.descripcion} dictadas hasta hoy</Typography>
      </Box>
      {data.items.length === 0 ? <Typography color="text.secondary">El curso todavía no tiene clases dictadas.</Typography>
        : <TableContainer className="data-table-wrap"><Table size="small" aria-label="Asistencia por clase">
          <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Clase</TableCell><TableCell>Asistencia</TableCell><TableCell>Nota</TableCell></TableRow></TableHead>
          <TableBody>{data.items.map(item => <TableRow key={item.idClase}>
            <TableCell>{dayjs(item.fecha).format('DD/MM/YYYY')} {item.horaInicio.slice(0, 5)}</TableCell>
            <TableCell>{item.titulo}{item.esExamen && <Chip size="small" color="warning" label="Examen" sx={{ ml: 1 }} />}</TableCell>
            <TableCell>{item.presente === true ? <Chip size="small" color="success" label="Presente" /> : item.presente === false ? <Chip size="small" color="error" label="Ausente" /> : <Chip size="small" variant="outlined" label="Sin registrar" />}</TableCell>
            <TableCell>{item.esExamen ? (item.nota ?? '-') : ''}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>}
    </>}
  </Box>
}
