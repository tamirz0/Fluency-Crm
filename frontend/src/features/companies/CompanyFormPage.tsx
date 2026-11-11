import { AlternateEmail, BusinessOutlined, Close, LocationOnOutlined, PhoneOutlined, SaveOutlined } from '@mui/icons-material'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, TextField, Typography } from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { Navigate, useLocation, useNavigate, useParams, type Location } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, createCompany, empresaQueryKeys, getCatalogOptions, getCompany, patchCompany, type CreateEmpresaRequest, type PatchEmpresaRequest, type Empresa } from '../../api/client'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordQueryState } from '../shared/RecordForm'
import { parsePositiveId } from '../shared/display'
import { CompanyResponsibleSelect } from './CompanyResponsibleSelect'
import { useAuth } from '../../auth/useAuth'
import '../shared/recordForms.css'
import '../shared/commercial-dialog.css'
import './company-edit-dialog.css'

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`).optional()
const emailText = z.string().max(150, 'Máximo 150 caracteres.').refine((value) => !value.trim() || z.email().safeParse(value.trim()).success, 'Ingresá un correo válido.').optional()
const companySchema = z.object({
  razonSocial: z.string().trim().min(1, 'Ingresá la razón social.').max(150, 'Máximo 150 caracteres.'),
  cuit: optionalText(20), industria: optionalText(100), correo: emailText, telefono: optionalText(50), direccion: z.string().optional(), idEstado: z.string().optional(), idOrigen: z.string().optional(), idResponsable: z.string().optional(), observaciones: z.string().optional(),
})
type CompanyFormValues = z.input<typeof companySchema>

const companyPatchFields = ['razonSocial', 'cuit', 'industria', 'correo', 'telefono', 'direccion', 'idEstado', 'idOrigen', 'idResponsable', 'observaciones'] as const
const companyPatchIdFields = ['idEstado', 'idOrigen', 'idResponsable'] as const
const fieldIcon = (icon: ReactNode) => ({ input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> } })

function initialCompanyValues(company?: Empresa): CompanyFormValues {
  return { razonSocial: company?.razonSocial ?? '', cuit: company?.cuit ?? '', industria: company?.industria ?? '', correo: company?.correo ?? '', telefono: company?.telefono ?? '', direccion: company?.direccion ?? '', idEstado: company?.idEstado == null ? '' : String(company.idEstado), idOrigen: company?.idOrigen == null ? '' : String(company.idOrigen), idResponsable: company?.idResponsable == null ? '' : String(company.idResponsable), observaciones: company?.observaciones ?? '' }
}

function CatalogSelect({ label, name, value, onChange, options, error, className }: { label: string; name: string; value: string; onChange: (value: string) => void; options: { id: number | string; descripcion: string; activo?: boolean }[]; error?: string; className?: string }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, descripcion: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth className={className} label={label} name={name} value={value} onChange={(event) => onChange(event.target.value)} error={Boolean(error)} helperText={error}
    slotProps={{ select: { displayEmpty: true, MenuProps: { slotProps: { paper: { className: 'commercial-dialog-options' } } } } }}>
    <MenuItem value="">-</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)} disabled={option.activo === false && String(option.id) !== value}>{option.descripcion}</MenuItem>)}
  </TextField>
}

function CompanyEditor({ company, mode, background }: { company?: Empresa; mode: 'create' | 'edit'; background?: Location }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const baseline = initialCompanyValues(company)
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<CompanyFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(companySchema) })
  const currentValues = useWatch({ control })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: () => getCatalogOptions('estados-cliente') })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: () => getCatalogOptions('origenes-comerciales') })
  const mutation = useMutation({ mutationFn: (values: CompanyFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { razonSocial: normalizeText(values.razonSocial) }
      const optional: Record<string, string | number | null | undefined> = { cuit: values.cuit, industria: values.industria, correo: values.correo, telefono: values.telefono, direccion: values.direccion, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), idResponsable: normalizeId(values.idResponsable), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createCompany(payload as CreateEmpresaRequest)
    }
    const patch = buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields])
    return patchCompany(Number(company?.id), patch as PatchEmpresaRequest)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(empresaQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: empresaQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['contactos'] })
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    const destination = mode === 'edit' && background ? { pathname: background.pathname, search: background.search, hash: background.hash } : `/empresas/${saved.id}`
    navigate(destination, { replace: true, state: { confirmation: confirmationFor('Empresa', mode === 'create' ? 'creada' : 'actualizada') } })
  }, onError: (error) => { saving.current = false; setError('root.serverError', { message: saveErrorMessage(error) }) } })
  useEffect(() => { reset(initialCompanyValues(company)) }, [company, reset])
  const differential = mode === 'edit' ? buildDifferentialPatch(baseline as Record<string, unknown>, currentValues as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields]) : undefined
  const defaultState = stateQuery.data?.some(s => s.descripcion?.toLocaleLowerCase('es-AR') === 'potencial')
  const stateRequired = mode === 'create' && stateQuery.isSuccess && !defaultState && !currentValues.idEstado
  const stateOptions = [...(stateQuery.data ?? [])]
  if (company && !stateOptions.some(s => s.id === company.idEstado)) stateOptions.unshift({ id: company.idEstado, descripcion: company.estadoDescripcion + (company.estadoActivo ? '' : ' (inactivo)'), activo: company.estadoActivo })
  const originOptions = [...(originQuery.data ?? [])]
  if (company?.idOrigen && !originOptions.some(s => s.id === company.idOrigen)) originOptions.unshift({ id: company.idOrigen, descripcion: (company.origenDescripcion ?? '-') + (company.origenActivo ? '' : ' (inactivo)'), activo: company.origenActivo ?? false })
  const canSubmit = !stateRequired && (mode === 'create' || Boolean(differential && Object.keys(differential).length > 0))
  const submit: SubmitHandler<CompanyFormValues> = (values) => {
    if (mode === 'edit' && (!values.idEstado || !values.idResponsable)) { setError('root.serverError', { message: 'Estado y responsable son obligatorios.' }); return }
    if (saving.current || mutation.isPending || (mode === 'edit' && !Object.keys(buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields])).length)) return
    saving.current = true
    mutation.mutate(values)
  }
  const formError = errors.root?.serverError?.message
  const editing = mode === 'edit'
  const submitForm = () => { if (canSubmit) void handleSubmit(submit)() }
  const close = () => {
    if (saving.current || mutation.isPending) return
    if (background) void navigate(-1)
    else void navigate(company ? `/empresas/${company.id}` : '/empresas', { replace: true })
  }
  const identification = <FormSection title="Identificación">
      <TextField {...register('razonSocial')} label="Razón social" required fullWidth error={Boolean(errors.razonSocial)} helperText={errors.razonSocial?.message} slotProps={fieldIcon(<BusinessOutlined />)} />
      <TextField {...register('cuit')} label="CUIT" fullWidth error={Boolean(errors.cuit)} helperText={errors.cuit?.message} />
      <TextField {...register('industria')} label="Industria" fullWidth error={Boolean(errors.industria)} helperText={errors.industria?.message} />
      <TextField {...register('direccion')} label="Dirección" fullWidth error={Boolean(errors.direccion)} helperText={errors.direccion?.message} slotProps={fieldIcon(<LocationOnOutlined />)} />
    </FormSection>
  const contactFields = <>
      <TextField {...register('correo')} label="Correo" type="email" fullWidth error={Boolean(errors.correo)} helperText={errors.correo?.message} slotProps={fieldIcon(<AlternateEmail />)} />
      <TextField {...register('telefono')} label="Teléfono" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} slotProps={fieldIcon(<PhoneOutlined />)} />
    </>
  const commercialFields = <>
      <div><Controller name="idEstado" control={control} render={({ field, fieldState }) => <CatalogSelect className="record-form-emphasis" label="Estado" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={stateOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message ?? (stateRequired ? 'Potencial no está disponible. Seleccioná un estado activo.' : undefined)} />} />{mode === 'create' && !currentValues.idEstado && defaultState && <p>Predeterminado: Potencial.</p>}{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}</div>
      <div><Controller name="idOrigen" control={control} render={({ field, fieldState }) => <CatalogSelect label="Origen" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={originOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message} />} />{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}</div>
    </>
  const responsible = (
      <Controller name="idResponsable" control={control} render={({ field }) => <CompanyResponsibleSelect value={field.value ?? ''} onChange={field.onChange} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" current={company ? { id: company.idResponsable, nombre: company.responsableNombre, activo: company.responsableActivo } : undefined} helperText={mode === 'create' ? 'Si no elegís otro responsable, se asigna al usuario de la sesión.' : 'Conservá el responsable actual o elegí otro usuario activo.'} />} />
  )
  const notes = <FormSection title="Notas"><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones internas" fullWidth multiline minRows={3} /></FormSection>
  const title = editing ? 'Editar empresa' : 'Nueva empresa'
  return <Dialog open onClose={close} disableRestoreFocus={!background} fullWidth maxWidth={false} aria-labelledby="company-form-title" slotProps={{ paper: { className: 'commercial-dialog company-edit-dialog' } }}>
    <header className="company-edit-heading">
      <div>
        <DialogTitle id="company-form-title"><BusinessOutlined aria-hidden="true" />{title}</DialogTitle>
        <Typography className="commercial-dialog-context">{editing ? 'Actualizá los datos de la organización sin perder el contexto comercial.' : 'Registrá una organización para sumarla a tu actividad comercial.'}</Typography>
      </div>
      <IconButton onClick={close} disabled={mutation.isPending} aria-label="Cerrar formulario"><Close /></IconButton>
    </header>
    <form className="company-edit-form" noValidate onSubmit={event => { event.preventDefault(); submitForm() }}>
      <DialogContent className="commercial-dialog-content">
        {formError && <Alert severity="error" role="alert">{formError}</Alert>}
        {identification}
        <FormSection title="Contacto y datos comerciales">{contactFields}{commercialFields}{responsible}</FormSection>
        {notes}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={mutation.isPending || !canSubmit} startIcon={<SaveOutlined />}>{mutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear empresa'}</Button>
      </DialogActions>
    </form>
  </Dialog>
}

export function NewCompanyPage() {
  const location = useLocation()
  return <CompanyEditor mode="create" background={location.state?.companyFormBackground} />
}

export function EditCompanyPage() {
  const { idEmpresa } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const background = location.state?.companyFormBackground as Location | undefined
  const canManage = useAuth().user?.permisos?.includes('GestionarClientes')
  const id = parsePositiveId(idEmpresa)
  const query = useQuery({ queryKey: empresaQueryKeys.detail(id ?? 0), queryFn: () => getCompany(id as number), enabled: Boolean(canManage && id !== undefined) })
  if (!canManage) return <Navigate replace to={id === undefined ? '/empresas' : `/empresas/${id}`} />
  if (id !== undefined && query.isPending) return <Typography role="status" className="companies-page">Cargando empresa…</Typography>
  if (id === undefined || query.isError || !query.data) return <Dialog open disableRestoreFocus={!background} fullWidth maxWidth="sm" aria-label="Editar empresa"
    onClose={() => { if (background) void navigate(-1); else void navigate(id === undefined ? '/empresas' : `/empresas/${id}`, { replace: true }) }}
    slotProps={{ paper: { className: 'commercial-dialog' } }}>
    <RecordQueryState noun="empresa" backLabel="Volver a empresas" backTo="/empresas" loading={false} invalid={id === undefined} error={query.error} onRetry={() => void query.refetch()} />
  </Dialog>
  return <CompanyEditor key={id} mode="edit" company={query.data} background={background} />
}
