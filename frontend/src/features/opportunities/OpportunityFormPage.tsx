import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, MenuItem, TextField } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, contactoQueryKeys, createOpportunity, empresaQueryKeys, getCatalogOptions, getCompany, getContact, getService, listContacts, listFunnels, listStages, opportunityQueryKeys, type CreateOportunidadRequest } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { ContactCompanySelect } from '../contacts/ContactCompanySelect'
import { confirmationFor, normalizeId, normalizeOptionalText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage, RecordQueryState } from '../shared/RecordForm'
import { commercialDateToIso, contactFullName, parsePositiveId } from '../shared/display'
import { ReadOnlyValue } from '../shared/ReadOnlyValue'
import '../shared/recordForms.css'

const maxValue = 9999999999.99
const parseValue = (text: string) => Number(text.trim().replace(',', '.'))
const opportunitySchema = z.object({
  titulo: z.string().trim().max(100, 'Máximo 100 caracteres.').optional(),
  idEmbudo: z.string().min(1, 'Seleccioná el embudo.'),
  idEtapa: z.string().optional(), idEmpresa: z.string().optional(), idContacto: z.string().optional(), idResponsable: z.string().optional(), idOrigen: z.string().optional(),
  valor: z.string().optional().refine(value => !value?.trim() || (/^\d+([.,]\d{1,2})?$/.test(value.trim()) && parseValue(value) <= maxValue), 'Ingresá un importe no negativo, hasta 9999999999,99 y con hasta dos decimales.'),
  fechaEstimadaCierre: z.string().optional().superRefine((value, context) => { const result = commercialDateToIso(value ?? ''); if (result.error) context.addIssue({ code: 'custom', message: result.error === 'format' ? 'Usá el formato DD/MM/AAAA.' : 'Ingresá una fecha válida.' }) }),
  objetivoAprendizaje: z.string().optional(), disponibilidadHoraria: z.string().optional(), observaciones: z.string().optional(),
  cantidadParticipantes: z.string().optional().refine(value => !value?.trim() || /^[1-9]\d{0,8}$/.test(value.trim()), 'Ingresá un número entero mayor que cero.'),
}).superRefine((values, context) => { if (!values.idEmpresa && !values.idContacto) context.addIssue({ code: 'custom', path: ['root'], message: 'Seleccioná una empresa o un contacto.' }) })
type OpportunityFormValues = z.input<typeof opportunitySchema>
const invalidDateDraft = '99/99/9999'
const money = (value: number | string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value))

type CompanyOption = { id: number; razonSocial: string }
type ContactOption = { id: number; label: string; idEmpresa: number | null; empresa: string }
type Context = { company?: CompanyOption; contact?: ContactOption; idEmbudo: string }

/** Busca contactos en el servidor, acotados a la empresa elegida cuando la hay. */
function OpportunityContactSelect({ value, onChange, idEmpresa, current }: { value: string; onChange: (contact: ContactOption | null) => void; idEmpresa?: string; current?: ContactOption }) {
  const [search, setSearch] = useState('')
  const contacts = useQuery({ queryKey: [...contactoQueryKeys.all, 'opciones', idEmpresa ?? '', search], queryFn: () => listContacts({ q: search.trim() || undefined, idEmpresa: normalizeId(idEmpresa) ?? undefined, pageSize: 25 }) })
  const options: ContactOption[] = (contacts.data?.items ?? []).map(c => ({ id: Number(c.id), label: contactFullName(c), idEmpresa: c.idEmpresa == null ? null : Number(c.idEmpresa), empresa: c.empresaRazonSocial ?? '' }))
  if (current && String(current.id) === value && !options.some(o => o.id === current.id)) options.unshift(current)
  const total = Number(contacts.data?.totalCount ?? 0)
  return <Box>
    <Autocomplete options={options} value={options.find(o => String(o.id) === value) ?? null} loading={contacts.isPending} filterOptions={x => x}
      getOptionLabel={o => o.label} isOptionEqualToValue={(a, b) => a.id === b.id} onChange={(_, o) => onChange(o)}
      onInputChange={(_, input, reason) => { if (reason === 'input' || reason === 'clear') setSearch(input) }}
      noOptionsText="Sin contactos disponibles" loadingText="Cargando contactos…" clearText="Quitar contacto"
      renderInput={params => <TextField {...params} label="Contacto" />} />
    {total > 25 && <p className="record-form-note">Se muestran 25 de {total} contactos. Escribí para acotar la búsqueda.</p>}
    {contacts.isError && <Alert severity="warning" action={<Button onClick={() => void contacts.refetch()}>Reintentar</Button>}>No pudimos cargar los contactos.</Alert>}
  </Box>
}

function OpportunityEditor({ context }: { context: Context }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const isSuperior = Boolean(user?.roles?.includes('ADMINISTRADOR') || user?.roles?.includes('RESPONSABLE_COMERCIAL'))
  const ownName = user ? `${user.nombre} ${user.apellido}`.trim() : ''
  const { register, handleSubmit, setError, setValue, control, formState: { errors } } = useForm<OpportunityFormValues>({
    defaultValues: { titulo: '', idEmbudo: context.idEmbudo, idEtapa: '', idEmpresa: context.company ? String(context.company.id) : '', idContacto: context.contact ? String(context.contact.id) : '', idResponsable: user ? String(user.id) : '', idOrigen: '', valor: '', fechaEstimadaCierre: '', objetivoAprendizaje: '', cantidadParticipantes: '', disponibilidadHoraria: '', observaciones: '' },
    mode: 'onBlur', resolver: zodResolver(opportunitySchema),
  })
  const [company, setCompany] = useState(context.company)
  const [contact, setContact] = useState(context.contact)
  const [notice, setNotice] = useState('')
  const [datePickerError, setDatePickerError] = useState<string>()
  const selectedCompany = useWatch({ control, name: 'idEmpresa' }) ?? ''
  const selectedContact = useWatch({ control, name: 'idContacto' }) ?? ''
  const selectedFunnel = useWatch({ control, name: 'idEmbudo' }) ?? ''
  const funnels = useQuery({ queryKey: ['embudos', 'opciones'], queryFn: () => listFunnels({ pageSize: 100 }) })
  const origins = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: () => getCatalogOptions('origenes-comerciales') })
  const funnel = funnels.data?.items.find(item => String(item.id) === selectedFunnel)
  // Con un único embudo disponible no hay nada que elegir.
  const onlyFunnel = funnels.data?.items.length === 1 ? String(funnels.data.items[0].id) : ''
  useEffect(() => { if (onlyFunnel && !selectedFunnel) setValue('idEmbudo', onlyFunnel) }, [onlyFunnel, selectedFunnel, setValue])
  const funnelId = normalizeId(selectedFunnel)
  const stages = useQuery({ queryKey: ['embudos', funnelId, 'etapas', 'true'], queryFn: () => listStages(funnelId as number), enabled: funnelId !== null })
  const service = useQuery({ queryKey: [...catalogQueryKeys.services, funnel?.servicio.id], queryFn: () => getService(funnel!.servicio.id), enabled: funnel !== undefined })
  const openStages = useMemo(() => (stages.data ?? []).filter(stage => stage.estado === 'ABIERTA' && stage.activo).sort((a, b) => Number(a.orden) - Number(b.orden)), [stages.data])
  const noOpenStage = funnelId !== null && stages.isSuccess && openStages.length === 0
  const relationshipError = errors.root?.message as string | undefined

  const mutation = useMutation({ mutationFn: (values: OpportunityFormValues) => {
    const payload: CreateOportunidadRequest = { idEmbudo: Number(values.idEmbudo) }
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
  const canSubmit = !noOpenStage && !stages.isError && !funnels.isError && !datePickerError

  const changeCompany = (value: string) => {
    setValue('idEmpresa', value); setCompany(undefined)
    if (value && contact && contact.idEmpresa !== null && String(contact.idEmpresa) !== value) { setValue('idContacto', ''); setContact(undefined); setNotice('El contacto se quitó porque no pertenece a la empresa seleccionada.') } else setNotice('')
  }
  const changeContact = (option: ContactOption | null) => {
    setContact(option ?? undefined); setValue('idContacto', option ? String(option.id) : ''); setNotice('')
    if (option?.idEmpresa != null && !selectedCompany) { setValue('idEmpresa', String(option.idEmpresa)); setCompany({ id: option.idEmpresa, razonSocial: option.empresa }) }
  }
  const backTo = context.company ? `/empresas/${context.company.id}` : context.contact ? `/contactos/${context.contact.id}` : '/inicio'

  return <RecordFormPage backLabel={context.company ? 'Volver a la empresa' : context.contact ? 'Volver al contacto' : 'Volver al inicio'} backTo={backTo} title="Nueva oportunidad" description="Registrá una negociación. La etapa inicial, el valor y el responsable se completan por defecto." onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel="Crear oportunidad" submitting={mutation.isPending} disabled={!canSubmit} error={errors.root?.serverError?.message}>
    <FormSection title="Datos principales" description="El título permite encontrar rápidamente la oportunidad.">
      <TextField {...register('titulo')} label="Título" fullWidth error={Boolean(errors.titulo)} helperText={errors.titulo?.message ?? 'Opcional. Si lo dejás vacío se muestra el nombre de la empresa y/o el contacto.'} />
      {isSuperior
        ? <Controller name="idResponsable" control={control} render={({ field }) => <CompanyResponsibleSelect value={field.value ?? ''} onChange={field.onChange} current={user ? { id: user.id, nombre: ownName, activo: true } : undefined} helperText="Por defecto, vos." />} />
        : <ReadOnlyValue label="Responsable" value={ownName} description="Se asignará a tu usuario." />}
    </FormSection>
    <FormSection title="Relación comercial" description="Elegí una empresa, un contacto o ambos.">
      <Box><ContactCompanySelect value={selectedCompany} onChange={changeCompany} current={company} /></Box>
      <OpportunityContactSelect value={selectedContact} onChange={changeContact} idEmpresa={selectedCompany} current={contact} />
      {relationshipError && <p id="opportunity-relationship-error" className="record-form-error" role="alert">{relationshipError}</p>}
      {notice && <p className="record-form-note record-form-note--warning">{notice}</p>}
    </FormSection>
    <FormSection title="Seguimiento" description="El servicio y el estado se derivan del embudo y la etapa; no hace falta elegirlos.">
      <TextField select fullWidth required label="Embudo" value={selectedFunnel} error={Boolean(errors.idEmbudo)} helperText={errors.idEmbudo?.message}
        onChange={event => { setValue('idEmbudo', event.target.value, { shouldValidate: true }); setValue('idEtapa', '') }}>
        <MenuItem value="">Seleccioná un embudo</MenuItem>
        {(funnels.data?.items ?? []).map(item => <MenuItem key={item.id} value={String(item.id)}>{item.nombre}</MenuItem>)}
      </TextField>
      {funnels.isError && <CatalogMessage error={funnels.error} blocking onRetry={() => void funnels.refetch()} />}
      {funnel && <ReadOnlyValue className="readonly-value--commercial" label="Servicio" value={(funnel.servicio.nombre ?? funnel.servicio.descripcion ?? '') + (funnel.servicio.activo ? '' : ' (inactivo)')} description="Se deriva del embudo." />}
      <Controller name="idEtapa" control={control} render={({ field }) => <TextField select fullWidth label="Etapa inicial" value={field.value ?? ''} onChange={field.onChange} disabled={funnelId === null || openStages.length === 0} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
        <MenuItem value="">{openStages[0] ? `${openStages[0].nombre} (por defecto)` : 'Primero elegí un embudo'}</MenuItem>
        {openStages.slice(1).map(stage => <MenuItem key={stage.id} value={String(stage.id)}>{stage.nombre}</MenuItem>)}
      </TextField>} />
      {noOpenStage && <Alert severity="error" role="alert">Este embudo no tiene una etapa abierta activa. Pedile a un administrador que la configure antes de crear oportunidades.</Alert>}
      {stages.isError && <CatalogMessage error={stages.error} blocking onRetry={() => void stages.refetch()} />}
      <TextField {...register('valor')} label="Valor" fullWidth slotProps={{ htmlInput: { inputMode: 'decimal' } }} error={Boolean(errors.valor)}
        helperText={errors.valor?.message ?? (service.data ? `Si lo dejás vacío se usa el precio de referencia del servicio (${money(service.data.precioReferencia)}). Podés ingresar 0.` : 'Si lo dejás vacío se usa el precio de referencia del servicio.')} />
      <Controller name="fechaEstimadaCierre" control={control} render={({ field, fieldState }) => {
        const isoValue = commercialDateToIso(field.value ?? '').value
        return <DatePicker label="Fecha estimada de cierre" format="DD/MM/YYYY" value={isoValue ? dayjs(isoValue) : null}
          onChange={value => {
            if (value === null) { field.onChange(''); setDatePickerError(undefined) }
            else if (value.isValid()) { field.onChange(value.format('DD/MM/YYYY')); setDatePickerError(undefined) }
            else { field.onChange(invalidDateDraft); setDatePickerError('Ingresá una fecha válida.') }
          }}
          onError={reason => { if (reason) setDatePickerError('Ingresá una fecha válida.'); else if (field.value !== invalidDateDraft) setDatePickerError(undefined) }}
          slotProps={{ textField: { fullWidth: true, onBlur: field.onBlur, error: Boolean(fieldState.error || datePickerError), helperText: fieldState.error?.message ?? datePickerError } }} />
      }} />
      <Controller name="idOrigen" control={control} render={({ field }) => <TextField select fullWidth label="Origen" value={field.value ?? ''} onChange={field.onChange}>
        <MenuItem value="">-</MenuItem>
        {(origins.data ?? []).map(origin => <MenuItem key={origin.id} value={String(origin.id)}>{origin.descripcion}</MenuItem>)}
      </TextField>} />
      {origins.isError && <CatalogMessage error={origins.error} onRetry={() => void origins.refetch()} />}
    </FormSection>
    <FormSection title="Datos académicos" description="Opcionales: ayudan a preparar la propuesta.">
      <TextField {...register('objetivoAprendizaje')} className="record-form-wide" label="Objetivo de aprendizaje" fullWidth multiline minRows={2} />
      <TextField {...register('cantidadParticipantes')} label="Cantidad de participantes" fullWidth slotProps={{ htmlInput: { inputMode: 'numeric' } }} error={Boolean(errors.cantidadParticipantes)} helperText={errors.cantidadParticipantes?.message ?? 'No modifica el valor de la oportunidad.'} />
      <TextField {...register('disponibilidadHoraria')} label="Disponibilidad horaria" fullWidth />
    </FormSection>
    <FormSection title="Observaciones" description="Dejá contexto útil para la próxima conversación."><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} /></FormSection>
  </RecordFormPage>
}

export function NewOpportunityPage() {
  const [params] = useSearchParams()
  const idContacto = parsePositiveId(params.get('idContacto') ?? undefined)
  const explicitCompany = parsePositiveId(params.get('idEmpresa') ?? undefined)
  const contactQuery = useQuery({ queryKey: contactoQueryKeys.detail(idContacto ?? 0), queryFn: () => getContact(idContacto as number), enabled: idContacto !== undefined })
  const idEmpresa = explicitCompany ?? (contactQuery.data?.idEmpresa == null ? undefined : Number(contactQuery.data.idEmpresa))
  const companyQuery = useQuery({ queryKey: empresaQueryKeys.detail(idEmpresa ?? 0), queryFn: () => getCompany(idEmpresa as number), enabled: idEmpresa !== undefined })
  const contactBlocked = idContacto !== undefined && !contactQuery.isSuccess
  const companyBlocked = idEmpresa !== undefined && !companyQuery.isSuccess
  if (contactBlocked) return <RecordQueryState noun="contacto" backLabel="Volver a contactos" backTo="/contactos" loading={contactQuery.isPending} error={contactQuery.error} onRetry={() => void contactQuery.refetch()} />
  if (companyBlocked) return <RecordQueryState noun="empresa" backLabel="Volver a empresas" backTo="/empresas" loading={companyQuery.isPending} error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
  const company = companyQuery.data
  const contact = contactQuery.data
  return <OpportunityEditor context={{
    idEmbudo: params.get('idEmbudo') ?? '',
    company: company ? { id: Number(company.id), razonSocial: company.razonSocial } : undefined,
    contact: contact ? { id: Number(contact.id), label: contactFullName(contact), idEmpresa: contact.idEmpresa == null ? null : Number(contact.idEmpresa), empresa: contact.empresaRazonSocial ?? '' } : undefined,
  }} />
}
