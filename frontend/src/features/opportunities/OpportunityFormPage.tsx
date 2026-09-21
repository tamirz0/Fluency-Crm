import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient, useQuery as useCatalogQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, createOpportunity, getCommercialOrigins, getCommercialStages, getCompanies, getContacts, getCustomerStates, getOpportunity, getServices, opportunityQueryKeys, patchOpportunity, type OportunidadDetalle, type Servicio } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage } from '../shared/RecordForm'
import { contactFullName } from '../shared/display'
import '../shared/recordForms.css'

const opportunitySchema = z.object({
  titulo: z.string().trim().min(1, 'Ingresá el título.').max(150, 'Máximo 150 caracteres.'),
  idUsuario: z.string().min(1, 'No hay un usuario autenticado.'), idEtapa: z.string().min(1, 'Seleccioná la etapa inicial.'),
  idEmpresa: z.string().optional(), idContacto: z.string().optional(), idServicio: z.string().optional(), fechaEstimadaCierre: z.string().optional(), idEstado: z.string().optional(), idOrigen: z.string().optional(), observaciones: z.string().optional(),
}).superRefine((values, context) => { if (!values.idEmpresa && !values.idContacto) context.addIssue({ code: 'custom', path: ['root'], message: 'Seleccioná una empresa o un contacto.' }) })
type OpportunityFormValues = z.input<typeof opportunitySchema>

function initialOpportunityValues(opportunity: OportunidadDetalle | undefined, userId: number | string | undefined): OpportunityFormValues {
  return { titulo: opportunity?.titulo ?? '', idUsuario: String(opportunity?.idUsuario ?? userId ?? ''), idEtapa: String(opportunity?.idEtapa ?? ''), idEmpresa: opportunity?.idEmpresa == null ? '' : String(opportunity.idEmpresa), idContacto: opportunity?.idContacto == null ? '' : String(opportunity.idContacto), idServicio: opportunity?.idServicio == null ? '' : String(opportunity.idServicio), fechaEstimadaCierre: opportunity?.fechaEstimadaCierre ?? '', idEstado: opportunity?.idEstado == null ? '' : String(opportunity.idEstado), idOrigen: opportunity?.idOrigen == null ? '' : String(opportunity.idOrigen), observaciones: opportunity?.observaciones ?? '' }
}

function OpportunityCatalogSelect({ label, value, onChange, options, error, disabled, emptyLabel = 'Sin informar' }: { label: string; value: string; onChange: (value: string) => void; options: { id: number | string; label: string }[]; error?: string; disabled?: boolean; emptyLabel?: string }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, label: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} error={Boolean(error)} helperText={error}><MenuItem value="">{emptyLabel}</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}</TextField>
}

function OpportunityEditor({ opportunity, mode }: { opportunity?: OportunidadDetalle; mode: 'create' | 'edit' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const baseline = initialOpportunityValues(opportunity, user?.id)
  const { register, handleSubmit, reset, setError, setValue, control, formState: { errors } } = useForm<OpportunityFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(opportunitySchema) })
  const companyQuery = useQuery({ queryKey: ['empresas'], queryFn: getCompanies })
  const contactQuery = useQuery({ queryKey: ['contactos'], queryFn: getContacts })
  const stageQuery = useQuery({ queryKey: catalogQueryKeys.commercialStages, queryFn: getCommercialStages })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: getCustomerStates })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: getCommercialOrigins })
  const serviceQuery = useCatalogQuery({ queryKey: catalogQueryKeys.services, queryFn: getServices })
  const [contactClearedMessage, setContactClearedMessage] = useState('')
  const selectedCompany = useWatch({ control, name: 'idEmpresa' }) ?? ''
  const selectedContact = useWatch({ control, name: 'idContacto' }) ?? ''
  const currentValues = useWatch({ control })
  const availableContacts = useMemo(() => (contactQuery.data ?? []).filter((contact) => !selectedCompany || String(contact.idEmpresa) === String(selectedCompany)), [contactQuery.data, selectedCompany])
  const services = useMemo(() => {
    const active = serviceQuery.data ?? []
    if (mode === 'edit' && opportunity?.idServicio != null && !active.some((service) => String(service.id) === String(opportunity.idServicio))) return [...active, { id: opportunity.idServicio, nombre: `${opportunity.servicioNombre ?? 'Servicio'} (No disponible)`, descripcion: null, precioReferencia: 0 } as Servicio]
    return active
  }, [mode, opportunity, serviceQuery.data])
  const handleCompanyChange = (value: string) => {
    setValue('idEmpresa', value)
    const contact = (contactQuery.data ?? []).find((item) => String(item.id) === String(selectedContact))
    if (value && contact && String(contact.idEmpresa) !== String(value)) { setValue('idContacto', ''); setContactClearedMessage('El contacto se limpió porque no pertenece a la empresa seleccionada.') }
    else setContactClearedMessage('')
  }
  const mutation = useMutation({ mutationFn: (values: OpportunityFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { titulo: normalizeText(values.titulo), idUsuario: normalizeId(values.idUsuario), idEtapa: normalizeId(values.idEtapa) }
      const optional: Record<string, string | number | null | undefined> = { idEmpresa: normalizeId(values.idEmpresa), idContacto: normalizeId(values.idContacto), idServicio: normalizeId(values.idServicio), fechaEstimadaCierre: values.fechaEstimadaCierre, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createOpportunity(payload as never)
    }
    const patch = buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, ['titulo', 'idEmpresa', 'idContacto', 'idServicio', 'fechaEstimadaCierre', 'idOrigen', 'idEstado', 'observaciones'], ['idEmpresa', 'idContacto', 'idServicio', 'idOrigen', 'idEstado'])
    return patchOpportunity(Number(opportunity?.id), patch as never)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(opportunityQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipeline })
    navigate(`/oportunidades/${saved.id}`, { state: { confirmation: confirmationFor('Oportunidad', mode === 'create' ? 'creada' : 'actualizada') } })
  }, onError: (error) => setError('root.serverError', { message: saveErrorMessage(error) }) })
  useEffect(() => { reset(initialOpportunityValues(opportunity, user?.id)) }, [opportunity, reset, user?.id])
  const submit: SubmitHandler<OpportunityFormValues> = (values) => { if (!mutation.isPending) mutation.mutate(values) }
  const differential = mode === 'edit' ? buildDifferentialPatch(baseline as Record<string, unknown>, currentValues as Record<string, unknown>, ['titulo', 'idEmpresa', 'idContacto', 'idServicio', 'fechaEstimadaCierre', 'idOrigen', 'idEstado', 'observaciones'], ['idEmpresa', 'idContacto', 'idServicio', 'idOrigen', 'idEstado']) : undefined
  const canSubmit = mode === 'create' || Boolean(differential && Object.keys(differential).length > 0)
  return <RecordFormPage backLabel={mode === 'create' ? 'Volver a oportunidades' : 'Volver a la oportunidad'} backTo={mode === 'create' ? '/oportunidades' : `/oportunidades/${opportunity?.id ?? ''}`} title={mode === 'create' ? 'Nueva oportunidad' : 'Editar oportunidad'} description={mode === 'create' ? 'Registrá una oportunidad y definí su punto de partida en el embudo.' : 'Actualizá la información de la oportunidad; la etapa se gestiona desde el embudo.'} onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel={mode === 'create' ? 'Crear oportunidad' : 'Guardar cambios'} submitting={mutation.isPending} disabled={!canSubmit} error={errors.root?.serverError?.message ?? (errors.root?.message as string | undefined)}>
    <FormSection title="Datos principales" description="El título permite encontrar rápidamente la oportunidad.">
      <TextField {...register('titulo')} label="Título" required fullWidth error={Boolean(errors.titulo)} helperText={errors.titulo?.message} />
      <TextField label="Responsable" fullWidth value={mode === 'edit' ? [opportunity?.usuarioNombre, opportunity?.usuarioApellido].filter(Boolean).join(' ').trim() || 'Sin informar' : user ? `${user.nombre} ${user.apellido}`.trim() : 'Sin informar'} slotProps={{ input: { readOnly: true } }} helperText={mode === 'edit' ? 'El responsable existente no se puede cambiar desde aquí.' : 'Se asignará al usuario autenticado.'} />
      {mode === 'create' ? <Controller name="idEtapa" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Etapa inicial" value={field.value ?? ''} onChange={field.onChange} options={(stageQuery.data ?? []).map((stage) => ({ id: stage.id, label: stage.nombre }))} error={fieldState.error?.message} emptyLabel="Seleccioná una etapa" />} /> : <TextField label="Etapa actual" fullWidth value={opportunity?.etapaNombre ?? 'Sin informar'} slotProps={{ input: { readOnly: true } }} helperText="La etapa se cambia desde el Embudo." />}
      {stageQuery.isError && <CatalogMessage error={stageQuery.error} onRetry={() => void stageQuery.refetch()} />}
    </FormSection>
    <FormSection title="Relación comercial" description="Una oportunidad debe conservar al menos una empresa o un contacto.">
      <Controller name="idEmpresa" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Empresa" value={field.value ?? ''} onChange={handleCompanyChange} options={(companyQuery.data ?? []).map((company) => ({ id: company.id, label: company.razonSocial }))} error={fieldState.error?.message} />} />
      <Controller name="idContacto" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Contacto" value={field.value ?? ''} onChange={(value) => { field.onChange(value); setContactClearedMessage('') }} options={availableContacts.map((contact) => ({ id: contact.id, label: contactFullName(contact) }))} error={fieldState.error?.message} />} />
      {contactClearedMessage && <p className="record-form-note record-form-note--warning">{contactClearedMessage}</p>}
      {companyQuery.isError && <CatalogMessage error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />}{contactQuery.isError && <CatalogMessage error={contactQuery.error} onRetry={() => void contactQuery.refetch()} />}
    </FormSection>
    <FormSection title="Seguimiento" description="Los catálogos se mantienen sincronizados con la API.">
      <Controller name="idServicio" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Servicio" value={field.value ?? ''} onChange={field.onChange} options={services.map((service) => ({ id: service.id, label: service.nombre }))} error={fieldState.error?.message} />} />
      <TextField {...register('fechaEstimadaCierre')} label="Fecha estimada de cierre" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <Controller name="idEstado" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Estado" value={field.value ?? ''} onChange={field.onChange} options={(stateQuery.data ?? []).map((state) => ({ id: state.id, label: state.descripcion }))} error={fieldState.error?.message} />} />
      <Controller name="idOrigen" control={control} render={({ field, fieldState }) => <OpportunityCatalogSelect label="Origen" value={field.value ?? ''} onChange={field.onChange} options={(originQuery.data ?? []).map((origin) => ({ id: origin.id, label: origin.descripcion }))} error={fieldState.error?.message} />} />
      {serviceQuery.isSuccess && serviceQuery.data.length === 0 && <p className="record-form-note">No hay servicios disponibles. El campo sigue siendo opcional.</p>}{serviceQuery.isError && <CatalogMessage error={serviceQuery.error} onRetry={() => void serviceQuery.refetch()} />}{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}
      <TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} />
    </FormSection>
  </RecordFormPage>
}

export function NewOpportunityPage() { return <OpportunityEditor mode="create" /> }

export function EditOpportunityPage() {
  const { idOportunidad } = useParams()
  const id = Number(idOportunidad)
  const query = useQuery({ queryKey: opportunityQueryKeys.detail(id), queryFn: () => getOpportunity(id), enabled: Number.isSafeInteger(id) && id > 0 })
  if (query.isPending) return <div className="companies-page" role="status">Cargando oportunidad…</div>
  if (query.isError || !query.data) return <div className="companies-page"><p>No pudimos cargar la oportunidad.</p></div>
  return <OpportunityEditor mode="edit" opportunity={query.data} />
}
