import { useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { createCatalogOption, patchCatalogOption, setCatalogOptionActive, type CatalogOption, type ConfigurableCatalog } from '../../api/client'
import { useAuth } from '../../auth/useAuth'

export type CatalogAction = 'create' | 'edit' | 'active'
const schema = z.object({ label: z.string().trim().min(1, 'El campo es obligatorio.').max(100, 'Máximo 100 caracteres.') })
export function CatalogDialog({ catalog, mode, item, onClose, onSaved }: { catalog: ConfigurableCatalog; mode: CatalogAction; item?: CatalogOption; onClose: () => void; onSaved: () => void }) {
  const { isLoading } = useAuth()
  const client = useQueryClient()
  const pending = useRef(false)
  const [error, setError] = useState('')
  const label = item?.descripcion ?? item?.nombre ?? ''
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { label: mode === 'create' ? '' : label } })
  const title = mode === 'create' ? 'Nueva opción' : mode === 'edit' ? 'Editar opción' : item?.activo ? 'Desactivar opción' : 'Reactivar opción'
  const save = async (values: { label: string }) => {
    if (pending.current || isLoading) return
    pending.current = true; setError('')
    try {
      const body = catalog === 'tipos-actividad' ? { nombre: values.label } : { descripcion: values.label }
      const saved = mode === 'create' ? await createCatalogOption(catalog, body) : mode === 'edit' ? await patchCatalogOption(catalog, item!.id, body) : await setCatalogOptionActive(catalog, item!.id, !item!.activo)
      client.setQueryData(['catalogos', catalog, 'detalle', saved.id], saved)
      await client.invalidateQueries({ queryKey: ['catalogos', catalog] })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.') }
    finally { pending.current = false }
  }
  return <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="catalog-dialog-title">
    <DialogTitle id="catalog-dialog-title">{title}</DialogTitle>
    <Box component="form" noValidate onSubmit={event => { void handleSubmit(save)(event) }}>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {isLoading && <Alert severity="warning">Necesitamos comprobar tu sesión antes de guardar. Podés cancelar y reintentar desde la pantalla.</Alert>}
        {mode === 'active' ? <Typography>¿Confirmás {item?.activo ? 'desactivar' : 'reactivar'} «{label}»? Sus referencias y etiquetas se conservan; reactivarla no restaura otros registros.</Typography> :
          <TextField {...register('label')} label={catalog === 'tipos-actividad' ? 'Nombre' : 'Descripción'} required fullWidth autoFocus disabled={isSubmitting || isLoading} error={!!errors.label} helperText={errors.label?.message} />}
      </DialogContent>
      <DialogActions><Button disabled={isSubmitting} onClick={onClose}>Cancelar</Button><Button disabled={isSubmitting || isLoading} type="submit" variant="contained">{isSubmitting ? 'Guardando…' : mode === 'active' ? 'Confirmar' : 'Guardar'}</Button></DialogActions>
    </Box>
  </Dialog>
}
