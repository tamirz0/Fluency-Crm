import { useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createWorkshop, listWorkshopServices, workshopQueryKeys } from '../../api/client'

/** Alta de un taller de fecha única en el día elegido, a partir de un servicio de tipo Talleres. */
export function WorkshopDialog({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: (id: number) => void }) {
  const client = useQueryClient()
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('19:30')
  const [service, setService] = useState('')
  const [touched, setTouched] = useState(false)
  const services = useQuery({ queryKey: [...workshopQueryKeys.all, 'servicios'], queryFn: listWorkshopServices })
  const save = useMutation({
    mutationFn: () => createWorkshop({ titulo: title.trim(), idServicio: Number(service), fecha: date, horaInicio: `${start}:00`, horaFin: `${end}:00` }),
    onSuccess: async result => { await client.invalidateQueries({ queryKey: workshopQueryKeys.all }); onSaved(Number(result.taller.id)) },
  })
  const errors = { title: title.trim() ? '' : 'Ingresá el título.', service: service ? '' : 'Elegí el servicio de taller.', time: end > start ? '' : 'El fin debe ser posterior al inicio.' }
  const invalid = Object.values(errors).some(Boolean)
  const submit = () => { setTouched(true); if (!invalid && !save.isPending) save.mutate() }
  return <Dialog open onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="workshop-dialog-title" slotProps={{ paper: { className: 'record-dialog fluency-shell-type' } }}>
    <DialogTitle id="workshop-dialog-title">Nuevo taller · {dayjs(date).locale('es').format('dddd D [de] MMMM')}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { event.preventDefault(); submit() }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        <TextField label="Título" value={title} onChange={e => setTitle(e.target.value)} required autoFocus error={touched && !!errors.title} helperText={touched ? errors.title : undefined} />
        <TextField select slotProps={{ select: { MenuProps: { slotProps: { paper: { className: 'record-dialog-options fluency-shell-type' } } } } }} label="Servicio de taller" value={service} onChange={e => setService(e.target.value)} required error={touched && !!errors.service}
          helperText={touched && errors.service ? errors.service : services.isError ? services.error.message : services.data?.length === 0 ? 'No hay servicios de taller. Creá uno de tipo Talleres en Servicios.' : 'Los anotados salen de quienes compraron este servicio.'}>
          {services.data?.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.descripcion}</MenuItem>)}
        </TextField>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Hora de inicio" type="time" value={start} onChange={e => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField label="Hora de fin" type="time" value={end} onChange={e => setEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} required error={touched && !!errors.time} helperText={touched ? errors.time : undefined} />
        </Box>
      </DialogContent>
      <DialogActions><Button disabled={save.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" variant="contained" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Crear taller'}</Button></DialogActions>
    </Box>
  </Dialog>
}
