import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, TextField } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useMutation, useQuery, useQueryClient, useQuery as useCatalogQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, createOpportunity, getCommercialOrigins, getCommercialStages, getCompanies, getContacts, getCustomerStates, getOpportunity, getServices, opportunityQueryKeys, patchOpportunity, type OportunidadDetalle, type Servicio } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage, RecordQueryState } from '../shared/RecordForm'
import { contactFullName, commercialDateToIso, isoToCommercialDate, parsePositiveId } from '../shared/display'
import { ReadOnlyValue } from '../shared/ReadOnlyValue'
import '../shared/recordForms.css'

const opportunitySchema = z.object({
  titulo: z.string().trim().min(1, 'Ingresá el título.').max(150, 'Máximo 150 caracteres.'),
  idEtapa: z.string().min(1, 'Seleccioná la etapa inicial.'),
  idEmpresa: z.string().optional(), idContacto: z.string().optional(), idServicio: z.string().optional(), fechaEstimadaCierre: z.string().optional().superRefine((value, context) => { const result = commercialDateToIso(value ?? ''); if (result.error) context.addIssue({ code: 'custom', message: result.error === 'format' ? 'Usá el formato DD/MM/AAAA.' : 'Ingresá una fecha válida.' }) }), idEstado: z.string().optional(), idOrigen: z.string().optional(), observaciones: z.string().optional(),
}).superRefine((values, context) => { if (!values.idEmpresa && !values.idContacto) context.addIssue({ code: 'custom', path: ['root'], message: 'Seleccioná una empresa o un contacto.' }) })
type OpportunityFormValues = z.input<typeof opportunitySchema>
const invalidDateDraft = '99/99/9999'

function initialOpportunityValues(opportunity: OportunidadDetalle | undefined): OpportunityFormValues {
  return { titulo: opportunity?.titulo ?? '', idEtapa: String(opportunity?.idEtapa ?? ''), idEmpresa: opportunity?.idEmpresa == null ? '' : String(opportunity.idEmpresa), idContacto: opportunity?.idContacto == null ? '' : String(opportunity.idContacto), idServicio: opportunity?.idServicio == null ? '' : String(opportunity.idServicio), fechaEstimadaCierre: isoToCommercialDate(opportunity?.fechaEstimadaCierre), idEstado: opportunity?.idEstado == null ? '' : String(opportunity.idEstado), idOrigen: opportunity?.idOrigen == null ? '' : String(opportunity.idOrigen), observaciones: opportunity?.observaciones ?? '' }
}

function OpportunityCatalogSelect({ label, value, onChange, options, error, disabled, required = false, emptyLabel = '-', className, describedBy, showErrorText = true }: { label: string; value: string; onChange: (value: string) => void; options: { id: number | string; label: string }[]; error?: string; disabled?: boolean; required?: boolean; emptyLabel?: string; className?: string; describedBy?: string; showErrorText?: boolean }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, label: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth className={className} label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required={required} error={Boolean(error)} helperText={showErrorText ? error : undefined} slotProps={describedBy ? { htmlInput: { 'aria-describedby': describedBy } } : undefined}><MenuItem value="">{emptyLabel}</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}</TextField>
}

function OpportunityEditor({ opportunity, mode }: { opportunity?: OportunidadDetalle; mode: 'create' | 'edit' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const baseline = initialOpportunityValues(opportunity)
  const { register, handleSubmit, reset, setError, setValue, control, formState: { errors } } = useForm<OpportunityFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(opportunitySchema) })
  const companyQuery = useQuery({ queryKey: ['empresas'], queryFn: getCompanies })
  const contactQuery = useQuery({ queryKey: ['contactos'], queryFn: getContacts })
  const stageQuery = useQuery({ queryKey: catalogQueryKeys.commercialStages, queryFn: getCommercialStages })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: getCustomerStates })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: getCommercialOrigins })
  const serviceQuery = useCatalogQuery({ queryKey: catalogQueryKeys.services, queryFn: getServices })
  const [contactClearedMessage, setContactClearedMessage] = useState('')
  const [datePickerError, setDatePickerError] = useState<string>()
  const selectedCompany = useWatch({ control, name: 'idEmpresa' }) ?? ''
  const selectedContact = useWatch({ control, name: 'idContacto' }) ?? ''
  const currentValues = useWatch({ control })
  const relationshipError = errors.root?.message as string | undefined
  const availableContacts = useMemo(() => (contactQuery.data ?? []).filter((contact) => !selectedCompany || String(contact.idEmpresa) === String(selectedCompany)), [contactQuery.data, selectedCompany])
  const services = useMemo(() => {
    const active = serviceQuery.data ?? []
    if (mode === 'edit' && opportunity?.idServicio != null && !active.some((service) => String(service.id) === String(opportunity.idServicio))) return [...active, { id: opportunity.idServicio, nombre: `${opportunity.servicioNombre ?? 'Servicio'} (No disponible)`, descripcion: null, precioReferencia: 0 } as Servicio]
    return active
  }, [mode, opportunity, serviceQuery.data])
  const relationshipCatalogsBlocked = mode === 'create' && companyQuery.isError && contactQuery.isError
  const requiredCatalogsReady = mode === 'edit' || (!stageQuery.isError && !relationshipCatalogsBlocked)
  const handleCompanyChange = (value: string) => {
    setValue('idEmpresa', value)
    const contact = (contactQuery.data ?? []).find((item) => String(item.id) === String(selectedContact))
    if (value && contact && String(contact.idEmpresa) !== String(value)) { setValue('idContacto', ''); setContactClearedMessage('El contacto se limpió porque no pertenece a la empresa seleccionada.') }
    else setContactClearedMessage('')
  }
  const mutation = useMutation({ mutationFn: (values: OpportunityFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { titulo: normalizeText(values.titulo), idUsuario: user?.id, idEtapa: normalizeId(values.idEtapa) }
      const optional: Record<string, string | number | null | undefined> = { idEmpresa: normalizeId(values.idEmpresa), idContacto: normalizeId(values.idContacto), idServicio: normalizeId(values.idServicio), fechaEstimadaCierre: commercialDateToIso(values.fechaEstimadaCierre ?? '').value, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createOpportunity(payload as never)
    }
    const patchValues = { ...values, fechaEstimadaCierre: commercialDateToIso(values.fechaEstimadaCierre ?? '').value ?? '' }
    const patchBaseline = { ...baseline, fechaEstimadaCierre: commercialDateToIso(baseline.fechaEstimadaCierre ?? '').value ?? '' }
    const patch = buildDifferentialPatch(patchBaseline, patchValues, ['titulo', 'idEmpresa', 'idContacto', 'idServicio', 'fechaEstimadaCierre', 'idOrigen', 'idEstado', 'observaciones'], ['idEmpresa', 'idContacto', 'idServicio', 'idOrigen', 'idEstado'])
    return patchOpportunity(Number(opportunity?.id), patch as never)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipeline })
    navigate(`/oportunidades/${saved.id}`, { state: { confirmation: confirmationFor('Oportunidad', mode === 'create' ? 'creada' : 'actualizada') } })
  }, onError: (error) => setError('root.serverError', { message: saveErrorMessage(error) }) })
  useEffect(() => { reset(initialOpportunityValues(opportunity)) }, [opportunity, reset])
  const submit: SubmitHandler<OpportunityFormValues> = (values) => { if (!mutation.isPending) mutation.mutate(values) }
  const differential = mode === 'edit' ? buildDifferentialPatch({ ...baseline, fechaEstimadaCierre: commercialDateToIso(baseline.fechaEstimadaCierre ?? '').value ?? '' }, { ...currentValues, fechaEstimadaCierre: commercialDateToIso(currentValues.fechaEstimadaCierre ?? '').value ?? '' }, ['titulo', 'idEmpresa', 'idContacto', 'idServicio', 'fechaEstimadaCierre', 'idOrigen', 'idEstado', 'observaciones'], ['idEmpresa', 'idContacto', 'idServicio', 'idOrigen', 'idEstado']) : undefined
  const canSubmit = (mode === 'create' || Boolean(differential && Object.keys(differential).length > 0)) && requiredCatalogsReady && !datePickerError
  return <RecordFormPage backLabel={mode === 'create' ? 'Volver a oportunidades' : 'Volver a la oportunidad'} backTo={mode === 'create' ? '/oportunidades' : `/oportunidades/${opportunity?.id ?? ''}`} title={mode === 'create' ? 'Nueva oportunidad' : 'Editar oportunidad'} description={mode === 'create' ? 'Registrá una oportunidad y definí su punto de partida en el embudo.' : 'Actualizá la información de la oportunidad; la etapa se gestiona desde el embudo.'} onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel={mode === 'create' ? 'Crear oportunidad' : 'Guardar cambios'} submitting={mutation.isPending} disabled={!canSubmit} error={errors.root?.serverError?.message}>
    <FormSection title="Datos principales" description="El título permite encontrar rápidamente la oportunidad.">
      <TextField {...register('titulo')} label="Título" required fullWidth error={Boolean(errors.titulo)} helperText={errors.titulo?.message} />
      <ReadOnlyValue label="Responsable" value={mode === 'edit' ? [opportunity?.usuarioNombre, opportunity?.usuarioApellido].filter(Boolean).join(' ').trim() : user ? `${user.nombre} ${user.apellido}`.trim() : ''} description={mode === 'edit' ? 'El responsable existente no se puede cambiar desde aquí.' : 'Se asignará al usuario autenticado.'} />
    </FormSection>
    <FormSection title="Relación comercial" description="Elegí una empresa, un contacto o ambos.">
      <Controller name="idEmpresa" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Empresa" value={field.value ?? ''} onChange={handleCompanyChange} options={(companyQuery.data ?? []).map((company) => ({ id: company.id, label: company.razonSocial }))} error={fieldState.error?.message ?? relationshipError} describedBy={relationshipError ? 'opportunity-relationship-error' : undefined} showErrorText={!relationshipError} />} />
      <Controller name="idContacto" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Contacto" value={field.value ?? ''} onChange={(value) => { field.onChange(value); setContactClearedMessage('') }} options={availableContacts.map((contact) => ({ id: contact.id, label: contactFullName(contact) }))} error={fieldState.error?.message ?? relationshipError} describedBy={relationshipError ? 'opportunity-relationship-error' : undefined} showErrorText={!relationshipError} />} />
      {relationshipError && <p id="opportunity-relationship-error" className="record-form-error" role="alert">{relationshipError}</p>}
      {contactClearedMessage && <p className="record-form-note record-form-note--warning">{contactClearedMessage}</p>}
      {relationshipCatalogsBlocked ? <CatalogMessage error={companyQuery.error ?? contactQuery.error} blocking onRetry={() => { void companyQuery.refetch(); void contactQuery.refetch() }} /> : <>{companyQuery.isError && <CatalogMessage error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />}{contactQuery.isError && <CatalogMessage error={contactQuery.error} onRetry={() => void contactQuery.refetch()} />}</>}
    </FormSection>
    <FormSection title="Seguimiento" description="Definí la etapa y los datos que ayudan a priorizar esta oportunidad.">
      {mode === 'create' ? <Controller name="idEtapa" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect className="record-form-emphasis" label="Etapa inicial" value={field.value ?? ''} onChange={field.onChange} options={(stageQuery.data ?? []).map((stage) => ({ id: stage.id, label: stage.nombre }))} error={fieldState.error?.message} required emptyLabel="Seleccioná una etapa" />} /> : <ReadOnlyValue className="readonly-value--commercial" label="Etapa actual" value={opportunity?.etapaNombre ?? ''} description="La etapa se cambia desde el Embudo." />}
      {stageQuery.isError && <CatalogMessage error={stageQuery.error} blocking={mode === 'create'} onRetry={() => void stageQuery.refetch()} />}
      <Controller name="idServicio" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect className="record-form-emphasis" label="Servicio" value={field.value ?? ''} onChange={field.onChange} options={services.map((service) => ({ id: service.id, label: service.nombre }))} error={fieldState.error?.message} />} />
      <Controller name="fechaEstimadaCierre" control={control} render={({ field, fieldState }) => {
        const isoValue = commercialDateToIso(field.value ?? '').value
        const pickerValue = isoValue ? dayjs(isoValue) : null
        return <DatePicker
          label="Fecha estimada de cierre"
          format="DD/MM/YYYY"
          value={pickerValue}
          onChange={(value) => {
            if (value === null) { field.onChange(''); setDatePickerError(undefined) }
            else if (value.isValid()) { field.onChange(value.format('DD/MM/YYYY')); setDatePickerError(undefined) }
            else { field.onChange(invalidDateDraft); setDatePickerError('Ingresá una fecha válida.') }
          }}
          onError={(reason) => {
            if (reason) setDatePickerError('Ingresá una fecha válida.')
            else if (field.value !== invalidDateDraft) setDatePickerError(undefined)
          }}
          slotProps={{ textField: { className: 'record-form-emphasis', fullWidth: true, onBlur: field.onBlur, error: Boolean(fieldState.error || datePickerError), helperText: fieldState.error?.message ?? datePickerError } }}
        />
      }} />
      <Controller name="idEstado" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect className="record-form-emphasis" label="Estado" value={field.value ?? ''} onChange={field.onChange} options={(stateQuery.data ?? []).map((state) => ({ id: state.id, label: state.descripcion }))} error={fieldState.error?.message} />} />
      <Controller name="idOrigen" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Origen" value={field.value ?? ''} onChange={field.onChange} options={(originQuery.data ?? []).map((origin) => ({ id: origin.id, label: origin.descripcion }))} error={fieldState.error?.message} />} />
      {serviceQuery.isSuccess && serviceQuery.data.length === 0 && <p className="record-form-note">No hay servicios disponibles. El campo sigue siendo opcional.</p>}{serviceQuery.isError && <CatalogMessage error={serviceQuery.error} onRetry={() => void serviceQuery.refetch()} />}{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}
    </FormSection>
    <FormSection title="Observaciones" description="Dejá contexto útil para la próxima conversación."><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} /></FormSection>
  </RecordFormPage>
}

export function NewOpportunityPage() { return <OpportunityEditor mode="create" /> }

export function EditOpportunityPage() {
  const { idOportunidad } = useParams()
  const id = parsePositiveId(idOportunidad)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(id ?? 0), queryFn: () => getOpportunity(id as number), enabled: id !== undefined })
  if (id === undefined || query.isPending || query.isError || !query.data) return <RecordQueryState noun="oportunidad" backLabel="Volver a oportunidades" backTo="/oportunidades" loading={query.isPending} invalid={id === undefined} error={query.error} onRetry={() => void query.refetch()} />
  return <OpportunityEditor mode="edit" opportunity={query.data} />
}
