import { zodResolver } from '@hookform/resolvers/zod'
import { AttachMoneyOutlined, BusinessOutlined, CalendarMonthOutlined, Close, FilterAltOutlined, FlagOutlined, GroupsOutlined, NotesOutlined, PersonOutlineOutlined, SaveOutlined, SchoolOutlined, ScheduleOutlined, SellOutlined, SourceOutlined, TrackChangesOutlined, TrendingUp } from '@mui/icons-material'
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, TextField, Typography } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useLocation, useNavigate, useParams, useSearchParams, type Location } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, contactoQueryKeys, createOpportunity, empresaQueryKeys, getCatalogOptions, getCompany, getContact, getOpportunity, listContacts, listFunnels, listServices, listStages, opportunityQueryKeys, patchOpportunity, type CreateOportunidadRequest, type Oportunidad, type PatchOportunidadRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { ContactCompanySelect } from '../contacts/ContactCompanySelect'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeOptionalText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection } from '../shared/RecordForm'
import { commercialDateToIso, contactFullName, isoToCommercialDate, parsePositiveId } from '../shared/display'
import { ReadOnlyValue } from '../shared/ReadOnlyValue'
import '../shared/commercial-dialog.css'
import '../shared/recordForms.css'
import '../companies/company-edit-dialog.css'
import './opportunity-edit-dialog.css'

const maxValue = 9999999999.99
const parseValue = (text: string) => Number(text.trim().replace(',', '.'))
const valueField = z.string().optional().refine(value => !value?.trim() || (/^\d+([.,]\d{1,2})?$/.test(value.trim()) && parseValue(value) <= maxValue), 'Ingresá un importe no negativo, hasta 9999999999,99 y con hasta dos decimales.')
const dateField = z.string().optional().superRefine((value, context) => { const result = commercialDateToIso(value ?? ''); if (result.error) context.addIssue({ code: 'custom', message: result.error === 'format' ? 'Usá el formato DD/MM/AAAA.' : 'Ingresá una fecha válida.' }) })
const participantsField = z.string().optional().refine(value => !value?.trim() || /^[1-9]\d{0,8}$/.test(value.trim()), 'Ingresá un número entero mayor que cero.')
const opportunitySchema = z.object({
  titulo: z.string().trim().max(100, 'Máximo 100 caracteres.').optional(),
  idServicio: z.string().min(1, 'Seleccioná el servicio.'),
  idEmbudo: z.string().min(1, 'Seleccioná el embudo.'),
  idEtapa: z.string().optional(), idEmpresa: z.string().optional(), idContacto: z.string().optional(), idResponsable: z.string().optional(), idOrigen: z.string().optional(),
  valor: valueField, fechaEstimadaCierre: dateField,
  objetivoAprendizaje: z.string().optional(), disponibilidadHoraria: z.string().optional(), observaciones: z.string().optional(),
  cantidadParticipantes: participantsField,
}).superRefine((values, context) => { if (!values.idEmpresa && !values.idContacto) context.addIssue({ code: 'custom', path: ['root'], message: 'Seleccioná una empresa o un contacto.' }) })
type OpportunityFormValues = z.input<typeof opportunitySchema>
const invalidDateDraft = '99/99/9999'
const money = (value: number | string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))
const fieldIcon = (icon: ReactNode) => ({ input: { startAdornment: <InputAdornment position="start">{icon}</InputAdornment> } })

type CompanyOption = { id: number; razonSocial: string }
type ContactOption = { id: number; label: string; idEmpresa: number | null; empresa: string }
type Context = { company?: CompanyOption; contact?: ContactOption }

function OpportunityFormDialog({ title, description, background, onClose, children, onSubmit, submitLabel, submitting = false, disabled = false, error }: {
  title: string; description: string; background?: Location; onClose: () => void; children: ReactNode
  onSubmit?: () => void; submitLabel?: string; submitting?: boolean; disabled?: boolean; error?: string
}) {
  return <Dialog open onClose={onClose} disableRestoreFocus={!background} fullWidth maxWidth={false} aria-labelledby="opportunity-form-title"
    slotProps={{ paper: { className: 'commercial-dialog company-edit-dialog opportunity-edit-dialog' } }}>
    <header className="company-edit-heading">
      <div>
        <DialogTitle id="opportunity-form-title"><TrendingUp aria-hidden="true" />{title}</DialogTitle>
        <Typography className="commercial-dialog-context">{description}</Typography>
      </div>
      <IconButton onClick={onClose} disabled={submitting} aria-label="Cerrar formulario"><Close /></IconButton>
    </header>
    {onSubmit
      ? <form className="company-edit-form" noValidate onSubmit={event => { event.preventDefault(); onSubmit() }}>
          <DialogContent className="commercial-dialog-content">
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            {children}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={submitting || disabled} startIcon={<SaveOutlined />}>{submitting ? 'Guardando…' : submitLabel}</Button>
          </DialogActions>
        </form>
      : <DialogContent className="commercial-dialog-content">{children}</DialogContent>}
  </Dialog>
}

/** Busca contactos en el servidor, acotados a la empresa elegida cuando la hay. */
export function OpportunityContactSelect({ value, onChange, idEmpresa, current, disabled = false, optionsClassName }: { value: string; onChange: (contact: ContactOption | null) => void; idEmpresa?: string; current?: ContactOption; disabled?: boolean; optionsClassName?: string }) {
  const [search, setSearch] = useState('')
  const contacts = useQuery({ queryKey: [...contactoQueryKeys.all, 'opciones', idEmpresa ?? '', search], queryFn: () => listContacts({ q: search.trim() || undefined, idEmpresa: normalizeId(idEmpresa) ?? undefined, pageSize: 25 }) })
  const options: ContactOption[] = (contacts.data?.items ?? []).map(c => ({ id: Number(c.id), label: contactFullName(c), idEmpresa: c.idEmpresa == null ? null : Number(c.idEmpresa), empresa: c.empresaRazonSocial ?? '' }))
  if (current && String(current.id) === value && !options.some(o => o.id === current.id)) options.unshift(current)
  const total = Number(contacts.data?.totalCount ?? 0)
  return <Box>
    <Autocomplete options={options} value={options.find(o => String(o.id) === value) ?? null} loading={contacts.isPending} disabled={disabled} filterOptions={x => x} slotProps={{ paper: { className: optionsClassName } }}
      getOptionLabel={o => o.label} isOptionEqualToValue={(a, b) => a.id === b.id} onChange={(_, o) => onChange(o)}
      onInputChange={(_, input, reason) => { if (reason === 'input' || reason === 'clear') setSearch(input) }}
      noOptionsText="Sin contactos disponibles" loadingText="Cargando contactos…" clearText="Quitar contacto"
    renderInput={params => <TextField {...params} label="Contacto" slotProps={{ ...params.slotProps, input: {
      ...params.slotProps.input,
      startAdornment: <><InputAdornment position="start"><PersonOutlineOutlined /></InputAdornment>{params.slotProps.input.startAdornment}</>,
    }}} />} />
    {total > 25 && <p className="record-form-note">Se muestran 25 de {total} contactos. Escribí para acotar la búsqueda.</p>}
    {contacts.isError && <Alert severity="warning" action={<Button onClick={() => void contacts.refetch()}>Reintentar</Button>}>No pudimos cargar los contactos.</Alert>}
  </Box>
}

function OpportunityEditor({ context, background }: { context: Context; background?: Location }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const ownName = user ? `${user.nombre} ${user.apellido}`.trim() : ''
  const { register, handleSubmit, setError, setValue, control, formState: { errors } } = useForm<OpportunityFormValues>({
    defaultValues: { titulo: '', idServicio: '', idEmbudo: '', idEtapa: '', idEmpresa: context.company ? String(context.company.id) : '', idContacto: context.contact ? String(context.contact.id) : '', idResponsable: user ? String(user.id) : '', idOrigen: '', valor: '', fechaEstimadaCierre: '', objetivoAprendizaje: '', cantidadParticipantes: '', disponibilidadHoraria: '', observaciones: '' },
    mode: 'onBlur', resolver: zodResolver(opportunitySchema),
  })
  const [company, setCompany] = useState(context.company)
  const [contact, setContact] = useState(context.contact)
  const [notice, setNotice] = useState('')
  const [datePickerError, setDatePickerError] = useState<string>()
  const selectedCompany = useWatch({ control, name: 'idEmpresa' }) ?? ''
  const selectedContact = useWatch({ control, name: 'idContacto' }) ?? ''
  const selectedFunnel = useWatch({ control, name: 'idEmbudo' }) ?? ''
  const selectedService = useWatch({ control, name: 'idServicio' }) ?? ''
  const serviceId = normalizeId(selectedService)
  const services = useQuery({ queryKey: ['servicios', 'opciones', 'activos'], queryFn: () => listServices({ activo: 'true', pageSize: 100 }) })
  // Los embudos son los que admiten el servicio elegido.
  const funnels = useQuery({ queryKey: ['embudos', 'opciones', serviceId], queryFn: () => listFunnels({ idServicio: serviceId as number, pageSize: 100 }), enabled: serviceId !== null })
  const origins = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: () => getCatalogOptions('origenes-comerciales') })
  const service = services.data?.items.find(item => String(item.id) === selectedService)
  // Con un único servicio o embudo disponible no hay nada que elegir.
  const onlyService = services.data?.items.length === 1 ? String(services.data.items[0].id) : ''
  useEffect(() => { if (onlyService && !selectedService) setValue('idServicio', onlyService) }, [onlyService, selectedService, setValue])
  const onlyFunnel = funnels.data?.items.length === 1 ? String(funnels.data.items[0].id) : ''
  useEffect(() => { if (onlyFunnel && !selectedFunnel) setValue('idEmbudo', onlyFunnel) }, [onlyFunnel, selectedFunnel, setValue])
  const funnelId = normalizeId(selectedFunnel)
  const stages = useQuery({ queryKey: ['embudos', funnelId, 'etapas', 'true'], queryFn: () => listStages(funnelId as number), enabled: funnelId !== null })
  const openStages = useMemo(() => (stages.data ?? []).filter(stage => stage.estado === 'ABIERTA' && stage.activo).sort((a, b) => Number(a.orden) - Number(b.orden)), [stages.data])
  const noOpenStage = funnelId !== null && stages.isSuccess && openStages.length === 0
  const relationshipError = errors.root?.message as string | undefined

  const mutation = useMutation({ mutationFn: (values: OpportunityFormValues) => {
    const payload: CreateOportunidadRequest = { idEmbudo: Number(values.idEmbudo), idServicio: Number(values.idServicio) }
    const title = normalizeOptionalText(values.titulo)
    if (title) payload.titulo = title
    const ids = { idEmpresa: normalizeId(values.idEmpresa), idContacto: normalizeId(values.idContacto), idEtapa: normalizeId(values.idEtapa), idOrigen: normalizeId(values.idOrigen), cantidadParticipantes: normalizeId(values.cantidadParticipantes) }
    Object.entries(ids).forEach(([key, id]) => { if (id !== null) Object.assign(payload, { [key]: id }) })
    // Solo un superior elige a otra persona; el servidor asigna al actor cuando se omite.
    const responsible = normalizeId(values.idResponsable)
    if (isSuperior && responsible !== null && responsible !== Number(user?.id)) payload.idResponsable = responsible
    if (values.valor?.trim()) payload.valor = parseValue(values.valor)
    const date = commercialDateToIso(values.fechaEstimadaCierre ?? '').value
    if (date) payload.fechaEstimadaCierre = date
    for (const key of ['objetivoAprendizaje', 'disponibilidadHoraria', 'observaciones'] as const) { const text = normalizeOptionalText(values[key]); if (text) payload[key] = text }
    return createOpportunity(payload)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    navigate(`/oportunidades/${saved.id}`, { state: { confirmation: confirmationFor('Oportunidad', 'creada') } })
  }, onError: (error) => { saving.current = false; setError('root.serverError', { message: saveErrorMessage(error) }) } })
  const submit: SubmitHandler<OpportunityFormValues> = (values) => { if (saving.current || mutation.isPending) return; saving.current = true; mutation.mutate(values) }
  const canSubmit = !noOpenStage && !stages.isError && !funnels.isError && !services.isError && !datePickerError

  const changeCompany = (value: string) => {
    setValue('idEmpresa', value); setCompany(undefined)
    if (value && contact && contact.idEmpresa !== null && String(contact.idEmpresa) !== value) { setValue('idContacto', ''); setContact(undefined); setNotice('El contacto se quitó porque no pertenece a la empresa seleccionada.') } else setNotice('')
  }
  const changeContact = (option: ContactOption | null) => {
    setContact(option ?? undefined); setValue('idContacto', option ? String(option.id) : ''); setNotice('')
    if (option?.idEmpresa != null && !selectedCompany) { setValue('idEmpresa', String(option.idEmpresa)); setCompany({ id: option.idEmpresa, razonSocial: option.empresa }) }
  }
  const close = () => {
    if (saving.current || mutation.isPending) return
    if (background) void navigate(-1)
    else void navigate('/oportunidades', { replace: true })
  }

  return <OpportunityFormDialog background={background} onClose={close} title="Nueva oportunidad" description="Registrá una negociación sin perder el contexto comercial." onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel="Crear oportunidad" submitting={mutation.isPending} disabled={!canSubmit} error={errors.root?.serverError?.message}>
    <FormSection title="Datos principales" description="El título permite encontrar rápidamente la oportunidad.">
      <TextField {...register('titulo')} label="Título" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<SellOutlined />)} error={Boolean(errors.titulo)} helperText={errors.titulo?.message ?? 'Opcional. Si lo dejás vacío se muestra el nombre de la empresa y/o el contacto.'} />
      {isSuperior
        ? <Controller name="idResponsable" control={control} render={({ field }) => <CompanyResponsibleSelect value={field.value ?? ''} onChange={field.onChange} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" inputIcon={<PersonOutlineOutlined />} current={user ? { id: user.id, nombre: ownName, activo: true } : undefined} helperText="Por defecto, vos." />} />
        : <ReadOnlyValue label="Responsable" value={ownName} description="Se asignará a tu usuario." icon={<PersonOutlineOutlined />} />}
    </FormSection>
    <FormSection title="Relación comercial" description="Elegí una empresa, un contacto o ambos.">
      <Box><ContactCompanySelect value={selectedCompany} onChange={changeCompany} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" inputIcon={<BusinessOutlined />} current={company} /></Box>
      <OpportunityContactSelect value={selectedContact} onChange={changeContact} idEmpresa={selectedCompany} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" current={contact} />
      {relationshipError && <p id="opportunity-relationship-error" className="record-form-error" role="alert">{relationshipError}</p>}
      {notice && <p className="record-form-note record-form-note--warning">{notice}</p>}
    </FormSection>
    <FormSection title="Seguimiento" description="Elegí el servicio y el embudo que lo admite; el estado se deriva de la etapa.">
      <TextField select fullWidth required label="Servicio" value={selectedService} disabled={mutation.isPending} slotProps={fieldIcon(<SchoolOutlined />)} error={Boolean(errors.idServicio)} helperText={errors.idServicio?.message}
        onChange={event => { setValue('idServicio', event.target.value, { shouldValidate: true }); setValue('idEmbudo', ''); setValue('idEtapa', '') }}>
        <MenuItem value="">Seleccioná un servicio</MenuItem>
        {(services.data?.items ?? []).map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
      </TextField>
      {services.isError && <CatalogMessage error={services.error} blocking onRetry={() => void services.refetch()} />}
      <TextField select fullWidth required label="Embudo" value={selectedFunnel} error={Boolean(errors.idEmbudo)} disabled={serviceId === null || mutation.isPending} slotProps={fieldIcon(<FilterAltOutlined />)} helperText={errors.idEmbudo?.message ?? (serviceId === null ? 'Primero elegí el servicio.' : undefined)}
        onChange={event => { setValue('idEmbudo', event.target.value, { shouldValidate: true }); setValue('idEtapa', '') }}>
        <MenuItem value="">Seleccioná un embudo</MenuItem>
        {(funnels.data?.items ?? []).map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
      </TextField>
      {funnels.isError && <CatalogMessage error={funnels.error} blocking onRetry={() => void funnels.refetch()} />}
      {funnels.isSuccess && funnels.data.items.length === 0 && <Alert severity="warning" role="alert">Ningún embudo activo admite este servicio. Pedile a un administrador que lo configure.</Alert>}
      <Controller name="idEtapa" control={control} render={({ field }) => <TextField select fullWidth label="Etapa inicial" value={field.value ?? ''} onChange={field.onChange} disabled={funnelId === null || openStages.length === 0 || mutation.isPending} slotProps={{ ...fieldIcon(<FlagOutlined />), inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
        <MenuItem value="">{openStages[0] ? `${openStages[0].nombre} (por defecto)` : 'Primero elegí un embudo'}</MenuItem>
        {openStages.slice(1).map(stage => <MenuItem key={stage.id} value={String(stage.id)}>{stage.nombre}</MenuItem>)}
      </TextField>} />
      {noOpenStage && <Alert severity="error" role="alert">Este embudo no tiene una etapa abierta activa. Pedile a un administrador que la configure antes de crear oportunidades.</Alert>}
      {stages.isError && <CatalogMessage error={stages.error} blocking onRetry={() => void stages.refetch()} />}
      <TextField {...register('valor')} label="Valor" fullWidth disabled={mutation.isPending} slotProps={{ ...fieldIcon(<AttachMoneyOutlined />), htmlInput: { inputMode: 'decimal' } }} error={Boolean(errors.valor)}
        helperText={errors.valor?.message ?? (service ? `Si lo dejás vacío se usa el precio de referencia del servicio (${money(service.precioReferencia)}). Podés ingresar 0.` : 'Si lo dejás vacío se usa el precio de referencia del servicio.')} />
      <Controller name="fechaEstimadaCierre" control={control} render={({ field, fieldState }) => {
        const isoValue = commercialDateToIso(field.value ?? '').value
        return <DatePicker label="Fecha estimada de cierre" format="DD/MM/YYYY" value={isoValue ? dayjs(isoValue) : null}
          onChange={value => {
            if (value === null) { field.onChange(''); setDatePickerError(undefined) }
            else if (value.isValid()) { field.onChange(value.format('DD/MM/YYYY')); setDatePickerError(undefined) }
            else { field.onChange(invalidDateDraft); setDatePickerError('Ingresá una fecha válida.') }
          }}
          onError={reason => { if (reason) setDatePickerError('Ingresá una fecha válida.'); else if (field.value !== invalidDateDraft) setDatePickerError(undefined) }}
          slotProps={{ textField: { fullWidth: true, disabled: mutation.isPending, onBlur: field.onBlur, slotProps: fieldIcon(<CalendarMonthOutlined />), error: Boolean(fieldState.error || datePickerError), helperText: fieldState.error?.message ?? datePickerError } }} />
      }} />
      <Controller name="idOrigen" control={control} render={({ field }) => <TextField select fullWidth label="Origen" value={field.value ?? ''} disabled={mutation.isPending} slotProps={{ ...fieldIcon(<SourceOutlined />), select: { MenuProps: { slotProps: { paper: { className: 'commercial-dialog-options' } } } } }} onChange={field.onChange}>
        <MenuItem value="">-</MenuItem>
        {(origins.data ?? []).map(origin => <MenuItem key={origin.id} value={String(origin.id)}>{origin.descripcion}</MenuItem>)}
      </TextField>} />
      {origins.isError && <CatalogMessage error={origins.error} onRetry={() => void origins.refetch()} />}
    </FormSection>
    <FormSection title="Datos académicos" description="Opcionales: ayudan a preparar la propuesta.">
      <TextField {...register('objetivoAprendizaje')} className="record-form-wide" label="Objetivo de aprendizaje" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<TrackChangesOutlined />)} multiline minRows={2} />
      <TextField {...register('cantidadParticipantes')} label="Cantidad de participantes" fullWidth disabled={mutation.isPending} slotProps={{ ...fieldIcon(<GroupsOutlined />), htmlInput: { inputMode: 'numeric' } }} error={Boolean(errors.cantidadParticipantes)} helperText={errors.cantidadParticipantes?.message ?? 'No cambia el valor.'} />
      <TextField {...register('disponibilidadHoraria')} label="Disponibilidad horaria" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<ScheduleOutlined />)} />
    </FormSection>
    <FormSection title="Observaciones" description="Dejá contexto útil para la próxima conversación."><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<NotesOutlined />)} multiline minRows={4} /></FormSection>
  </OpportunityFormDialog>
}

export function NewOpportunityPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const background = location.state?.opportunityFormBackground as Location | undefined
  const [params] = useSearchParams()
  const idContacto = parsePositiveId(params.get('idContacto') ?? undefined)
  const explicitCompany = parsePositiveId(params.get('idEmpresa') ?? undefined)
  const contactQuery = useQuery({ queryKey: contactoQueryKeys.detail(idContacto ?? 0), queryFn: () => getContact(idContacto as number), enabled: idContacto !== undefined })
  const idEmpresa = explicitCompany ?? (contactQuery.data?.idEmpresa == null ? undefined : Number(contactQuery.data.idEmpresa))
  const companyQuery = useQuery({ queryKey: empresaQueryKeys.detail(idEmpresa ?? 0), queryFn: () => getCompany(idEmpresa as number), enabled: idEmpresa !== undefined })
  const contactBlocked = idContacto !== undefined && !contactQuery.isSuccess
  const companyBlocked = idEmpresa !== undefined && !companyQuery.isSuccess
  const close = () => background ? void navigate(-1) : void navigate('/oportunidades', { replace: true })
  if (contactBlocked) return <OpportunityFormDialog background={background} onClose={close} title="Nueva oportunidad" description="Registrá una negociación sin perder el contexto comercial.">
    {contactQuery.isPending ? <Typography role="status">Cargando contacto…</Typography> : <Alert severity="error" action={<Button onClick={() => void contactQuery.refetch()}>Reintentar</Button>}>No pudimos validar el contacto elegido. Revisá su disponibilidad e intentá de nuevo.</Alert>}
  </OpportunityFormDialog>
  if (companyBlocked) return <OpportunityFormDialog background={background} onClose={close} title="Nueva oportunidad" description="Registrá una negociación sin perder el contexto comercial.">
    {companyQuery.isPending ? <Typography role="status">Cargando empresa…</Typography> : <Alert severity="error" action={<Button onClick={() => void companyQuery.refetch()}>Reintentar</Button>}>No pudimos validar la empresa elegida. Revisá su disponibilidad e intentá de nuevo.</Alert>}
  </OpportunityFormDialog>
  const company = companyQuery.data
  const contact = contactQuery.data
  return <OpportunityEditor background={background} context={{
    company: company ? { id: Number(company.id), razonSocial: company.razonSocial } : undefined,
    contact: contact ? { id: Number(contact.id), label: contactFullName(contact), idEmpresa: contact.idEmpresa == null ? null : Number(contact.idEmpresa), empresa: contact.empresaRazonSocial ?? '' } : undefined,
  }} />
}

const editSchema = z.object({
  titulo: z.string().trim().max(100, 'Máximo 100 caracteres.').optional(),
  idEmpresa: z.string().optional(), idContacto: z.string().optional(), idOrigen: z.string().optional(),
  valor: valueField.refine(value => Boolean(value?.trim()), 'Ingresá el valor (podés ingresar 0).'),
  fechaEstimadaCierre: dateField,
  objetivoAprendizaje: z.string().optional(), disponibilidadHoraria: z.string().optional(), observaciones: z.string().optional(),
  cantidadParticipantes: participantsField,
}).superRefine((values, context) => { if (!values.idEmpresa && !values.idContacto) context.addIssue({ code: 'custom', path: ['root'], message: 'Seleccioná una empresa o un contacto.' }) })
type EditValues = z.input<typeof editSchema>

function initialValues(item: Oportunidad): EditValues {
  return {
    titulo: item.titulo ?? '', idEmpresa: item.idEmpresa == null ? '' : String(item.idEmpresa), idContacto: item.idContacto == null ? '' : String(item.idContacto),
    idOrigen: item.idOrigen == null ? '' : String(item.idOrigen), valor: String(item.valor).replace('.', ','), fechaEstimadaCierre: isoToCommercialDate(item.fechaEstimadaCierre),
    objetivoAprendizaje: item.objetivoAprendizaje ?? '', cantidadParticipantes: item.cantidadParticipantes == null ? '' : String(item.cantidadParticipantes),
    disponibilidadHoraria: item.disponibilidadHoraria ?? '', observaciones: item.observaciones ?? '',
  }
}

/** Edición de datos de una abierta: solo viaja lo que cambió, así las referencias históricas no se revalidan sin motivo. */
function OpportunityEditEditor({ item, background }: { item: Oportunidad; background?: Location }) {
  const navigate = useNavigate()
  const location = useLocation()
  const backState = { from: location.state?.from }
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const initial = useMemo(() => initialValues(item), [item])
  const { register, handleSubmit, setError, setValue, control, formState: { errors } } = useForm<EditValues>({ defaultValues: initial, mode: 'onBlur', resolver: zodResolver(editSchema) })
  const [company, setCompany] = useState<CompanyOption | undefined>(item.idEmpresa == null ? undefined : { id: Number(item.idEmpresa), razonSocial: item.empresaRazonSocial ?? '' })
  const [contact, setContact] = useState<ContactOption | undefined>(item.idContacto == null ? undefined : { id: Number(item.idContacto), label: item.contactoNombre ?? '', idEmpresa: null, empresa: '' })
  const [notice, setNotice] = useState('')
  const [datePickerError, setDatePickerError] = useState<string>()
  const selectedCompany = useWatch({ control, name: 'idEmpresa' }) ?? ''
  const selectedContact = useWatch({ control, name: 'idContacto' }) ?? ''
  const origins = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: () => getCatalogOptions('origenes-comerciales') })
  const relationshipError = errors.root?.message as string | undefined
  const back = `/oportunidades/${item.id}`
  const close = () => {
    if (saving.current || mutation.isPending) return
    if (background) void navigate(-1)
    else void navigate(back, { replace: true })
  }

  const mutation = useMutation({ mutationFn: (values: EditValues) => {
    const payload: PatchOportunidadRequest = { ...buildDifferentialPatch(initial, values, ['titulo', 'objetivoAprendizaje', 'disponibilidadHoraria', 'observaciones', 'idEmpresa', 'idContacto', 'idOrigen', 'cantidadParticipantes'], ['idEmpresa', 'idContacto', 'idOrigen', 'cantidadParticipantes']) }
    const value = parseValue(values.valor ?? '')
    if (value !== parseValue(initial.valor ?? '')) payload.valor = value
    const date = commercialDateToIso(values.fechaEstimadaCierre ?? '').value ?? null
    if (date !== (commercialDateToIso(initial.fechaEstimadaCierre ?? '').value ?? null)) payload.fechaEstimadaCierre = date
    if (Object.keys(payload).length === 0) return Promise.resolve(item)
    return patchOpportunity(Number(item.id), payload)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    const destination = background ? { pathname: background.pathname, search: background.search, hash: background.hash } : back
    navigate(destination, { replace: Boolean(background), state: { ...backState, confirmation: confirmationFor('Oportunidad', 'actualizada') } })
  }, onError: (error) => { saving.current = false; setError('root.serverError', { message: saveErrorMessage(error) }) } })
  const submit: SubmitHandler<EditValues> = (values) => { if (saving.current || mutation.isPending) return; saving.current = true; mutation.mutate(values) }

  const changeCompany = (value: string) => {
    setValue('idEmpresa', value); setCompany(undefined)
    if (value && contact && contact.idEmpresa !== null && String(contact.idEmpresa) !== value) { setValue('idContacto', ''); setContact(undefined); setNotice('El contacto se quitó porque no pertenece a la empresa seleccionada.') } else setNotice('')
  }
  const changeContact = (option: ContactOption | null) => {
    setContact(option ?? undefined); setValue('idContacto', option ? String(option.id) : ''); setNotice('')
    if (option?.idEmpresa != null && !selectedCompany) { setValue('idEmpresa', String(option.idEmpresa)); setCompany({ id: option.idEmpresa, razonSocial: option.empresa }) }
  }
  const inactive = (name: string, active: boolean) => name + (active ? '' : ' (inactivo)')

  return <OpportunityFormDialog background={background} onClose={close} title="Editar oportunidad" description="Editá los datos de esta negociación." onSubmit={() => { if (!datePickerError) void handleSubmit(submit)() }} submitLabel="Guardar cambios" submitting={mutation.isPending} disabled={Boolean(datePickerError)} error={errors.root?.serverError?.message}>
    <FormSection title="Datos principales">
      <TextField {...register('titulo')} label="Título" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<SellOutlined />)} error={Boolean(errors.titulo)} helperText={errors.titulo?.message ?? 'Opcional. Si lo dejás vacío, se muestra la empresa y/o el contacto.'} />
      <ReadOnlyValue className="readonly-value--commercial" label="Responsable · solo lectura" value={inactive(item.responsableNombre, item.responsableActivo)} icon={<PersonOutlineOutlined />} />
    </FormSection>
    <FormSection title="Relación comercial">
      <Alert severity="info" variant="outlined" className="opportunity-edit-note" style={{ gridColumn: '1 / -1' }}>Las actividades y el historial conservan sus relaciones originales.</Alert>
      <Box><ContactCompanySelect value={selectedCompany} onChange={changeCompany} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" inputIcon={<BusinessOutlined />} current={company} /></Box>
      <OpportunityContactSelect value={selectedContact} onChange={changeContact} idEmpresa={selectedCompany} disabled={mutation.isPending} optionsClassName="commercial-dialog-options" current={contact} />
      {relationshipError && <p id="opportunity-relationship-error" className="record-form-error" role="alert">{relationshipError}</p>}
      {notice && <p className="record-form-note record-form-note--warning">{notice}</p>}
    </FormSection>
    <FormSection title="Embudo y etapa · solo lectura">
      <ReadOnlyValue className="readonly-value--commercial" label="Embudo" value={inactive(item.embudoNombre, item.embudoActivo)} icon={<FilterAltOutlined />} />
      <ReadOnlyValue className="readonly-value--commercial" label="Etapa" value={inactive(item.etapaNombre, item.etapaActiva)} icon={<FlagOutlined />} />
      <TextField {...register('valor')} label="Valor" required fullWidth disabled={mutation.isPending} slotProps={{ ...fieldIcon(<AttachMoneyOutlined />), htmlInput: { inputMode: 'decimal' } }} error={Boolean(errors.valor)} helperText={errors.valor?.message ?? 'Obligatorio; podés ingresar 0.'} />
      <Controller name="fechaEstimadaCierre" control={control} render={({ field, fieldState }) => {
        const isoValue = commercialDateToIso(field.value ?? '').value
        return <DatePicker label="Fecha estimada de cierre" format="DD/MM/YYYY" value={isoValue ? dayjs(isoValue) : null}
          onChange={value => {
            if (value === null) { field.onChange(''); setDatePickerError(undefined) }
            else if (value.isValid()) { field.onChange(value.format('DD/MM/YYYY')); setDatePickerError(undefined) }
            else { field.onChange(invalidDateDraft); setDatePickerError('Ingresá una fecha válida.') }
          }}
          onError={reason => { if (reason) setDatePickerError('Ingresá una fecha válida.'); else if (field.value !== invalidDateDraft) setDatePickerError(undefined) }}
          slotProps={{ textField: { fullWidth: true, disabled: mutation.isPending, onBlur: field.onBlur, slotProps: fieldIcon(<CalendarMonthOutlined />), error: Boolean(fieldState.error || datePickerError), helperText: fieldState.error?.message ?? datePickerError } }} />
      }} />
      <Controller name="idOrigen" control={control} render={({ field }) => <TextField select fullWidth label="Origen" value={field.value ?? ''} disabled={mutation.isPending} slotProps={{ ...fieldIcon(<SourceOutlined />), select: { MenuProps: { slotProps: { paper: { className: 'commercial-dialog-options' } } } } }} onChange={field.onChange}>
        <MenuItem value="">-</MenuItem>
        {item.idOrigen != null && !(origins.data ?? []).some(origin => origin.id === item.idOrigen) && <MenuItem value={String(item.idOrigen)}>{inactive(item.origenDescripcion ?? '', item.origenActivo !== false)}</MenuItem>}
        {(origins.data ?? []).map(origin => <MenuItem key={origin.id} value={String(origin.id)}>{origin.descripcion}</MenuItem>)}
      </TextField>} />
      {origins.isError && <CatalogMessage error={origins.error} onRetry={() => void origins.refetch()} />}
    </FormSection>
    <FormSection title="Datos académicos">
      <TextField {...register('objetivoAprendizaje')} className="record-form-wide" label="Objetivo de aprendizaje" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<TrackChangesOutlined />)} multiline minRows={2} />
      <TextField {...register('cantidadParticipantes')} label="Cantidad de participantes" fullWidth disabled={mutation.isPending} slotProps={{ ...fieldIcon(<GroupsOutlined />), htmlInput: { inputMode: 'numeric' } }} error={Boolean(errors.cantidadParticipantes)} helperText={errors.cantidadParticipantes?.message ?? 'No cambia el valor.'} />
      <TextField {...register('disponibilidadHoraria')} label="Disponibilidad horaria" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<ScheduleOutlined />)} />
    </FormSection>
    <FormSection title="Observaciones"><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth disabled={mutation.isPending} slotProps={fieldIcon(<NotesOutlined />)} multiline minRows={4} /></FormSection>
  </OpportunityFormDialog>
}

export function EditOpportunityPage() {
  const { idOportunidad } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const background = location.state?.opportunityFormBackground as Location | undefined
  const id = parsePositiveId(idOportunidad)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(id ?? 0), queryFn: () => getOpportunity(id as number), enabled: id !== undefined })
  const close = () => background ? void navigate(-1) : void navigate(id === undefined ? '/oportunidades' : `/oportunidades/${id}`, { replace: true })
  if (id === undefined || query.isPending || query.isError || !query.data) return <OpportunityFormDialog background={background} onClose={close} title="Editar oportunidad" description="Actualizá los datos permitidos sin perder el contexto comercial.">
    {query.isPending && id !== undefined
      ? <Typography role="status">Cargando oportunidad…</Typography>
      : <Alert severity="error" action={id !== undefined ? <Button onClick={() => void query.refetch()}>Reintentar</Button> : undefined}>{id === undefined ? 'El identificador de la oportunidad no es válido.' : 'No pudimos cargar los datos de la oportunidad. Revisá la conexión e intentá de nuevo.'}</Alert>}
  </OpportunityFormDialog>
  // Ocultar el formulario no es autorización: el servidor vuelve a comprobar propiedad y estado al guardar.
  if (!query.data.accionesPermitidas.editar) return <OpportunityFormDialog background={background} onClose={close} title="Editar oportunidad" description="Actualizá los datos permitidos sin perder el contexto comercial.">
    <div className="opportunity-edit-unavailable">
      <Typography component="h2">No podés editar esta oportunidad</Typography>
      <Alert severity="info">Solo el responsable o un superior puede editar una oportunidad abierta. Una cerrada se edita después de reabrirla.</Alert>
    </div>
  </OpportunityFormDialog>
  return <OpportunityEditEditor item={query.data} background={background} />
}
