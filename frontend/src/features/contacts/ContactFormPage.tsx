import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, contactoQueryKeys, createContact, getCommercialOrigins, getContact, getCompanies, getCustomerStates, getOpportunitiesByStage, patchContact, type Contacto } from '../../api/client'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage } from '../shared/RecordForm'
import '../shared/recordForms.css'
import { flattenOpportunitiesByStage } from '../opportunities/opportunityData'

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`).optional()
const contactSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre.').max(100, 'Máximo 100 caracteres.'),
  apellido: z.string().trim().min(1, 'Ingresá el apellido.').max(100, 'Máximo 100 caracteres.'),
  correo: z.string().trim().min(1, 'Ingresá el correo.').max(150, 'Máximo 150 caracteres.').refine((value) => z.email().safeParse(value).success, 'Ingresá un correo válido.'),
  documento: optionalText(20), cargo: optionalText(100), telefono: optionalText(50), idEstado: z.string().optional(), idOrigen: z.string().optional(), idEmpresa: z.string().optional(), observaciones: z.string().optional(),
})
type ContactFormValues = z.input<typeof contactSchema>

function initialContactValues(contact?: Contacto): ContactFormValues {
  return { nombre: contact?.nombre ?? '', apellido: contact?.apellido ?? '', correo: contact?.correo ?? '', documento: contact?.documento ?? '', cargo: contact?.cargo ?? '', telefono: contact?.telefono ?? '', idEstado: contact?.idEstado == null ? '' : String(contact.idEstado), idOrigen: contact?.idOrigen == null ? '' : String(contact.idOrigen), idEmpresa: contact?.idEmpresa == null ? '' : String(contact.idEmpresa), observaciones: contact?.observaciones ?? '' }
}

function ContactCatalogSelect({ label, field, options, error, disabled }: { label: string; field: { name: string; value?: unknown; onChange: (...event: never[]) => void; onBlur: () => void; ref: (element: HTMLInputElement | null) => void }; options: { id: number | string; descripcion: string }[]; error?: string; disabled?: boolean }) {
  const value = typeof field.value === 'string' ? field.value : ''
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, descripcion: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth label={label} name={field.name} value={value} onBlur={field.onBlur} inputRef={field.ref} onChange={(event) => field.onChange(event.target.value as never)} disabled={disabled} error={Boolean(error)} helperText={error}><MenuItem value="">Sin informar</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.descripcion}</MenuItem>)}</TextField>
}

function ContactEditor({ contact, mode }: { contact?: Contacto; mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const baseline = initialContactValues(contact)
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<ContactFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(contactSchema) })
  const companiesQuery = useQuery({ queryKey: ['empresas'], queryFn: getCompanies })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: getCustomerStates })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: getCommercialOrigins })
  const funnelQuery = useQuery({ queryKey: ['oportunidades', 'por-etapa'], queryFn: getOpportunitiesByStage, enabled: mode === 'edit' })
  const relatedOpportunity = mode === 'edit' && funnelQuery.data ? flattenOpportunitiesByStage(funnelQuery.data).some((opportunity) => String(opportunity.idContacto) === String(contact?.id)) : false
  const mutation = useMutation({ mutationFn: (values: ContactFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { nombre: normalizeText(values.nombre), apellido: normalizeText(values.apellido), correo: normalizeText(values.correo) }
      const optional: Record<string, string | number | null | undefined> = { documento: values.documento, cargo: values.cargo, telefono: values.telefono, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), idEmpresa: normalizeId(values.idEmpresa), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createContact(payload as never)
    }
    const patch = buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, ['nombre', 'apellido', 'correo', 'documento', 'cargo', 'telefono', 'idEstado', 'idOrigen', 'idEmpresa', 'observaciones'], ['idEstado', 'idOrigen', 'idEmpresa'])
    return patchContact(Number(contact?.id), patch as never)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(contactoQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: contactoQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    navigate(`/contactos/${saved.id}`, { state: { confirmation: confirmationFor('Contacto', mode === 'create' ? 'creado' : 'actualizado') } })
  }, onError: (error) => setError('root.serverError', { message: saveErrorMessage(error) }) })
  useEffect(() => { reset(initialContactValues(contact)) }, [contact, reset])
  const submit: SubmitHandler<ContactFormValues> = (values) => { if (!mutation.isPending) mutation.mutate(values) }
  const companyDisabled = mode === 'edit' && (funnelQuery.isPending || funnelQuery.isError || relatedOpportunity)
  const companyMessage = relatedOpportunity ? 'La empresa no puede cambiarse porque el contacto tiene oportunidades asociadas.' : funnelQuery.isError ? 'No se pudo verificar si tiene oportunidades asociadas. El selector queda bloqueado; reintentá para habilitar la verificación.' : funnelQuery.isPending ? 'Verificando oportunidades asociadas…' : undefined
  return <RecordFormPage backLabel={mode === 'create' ? 'Volver a contactos' : 'Volver al contacto'} backTo={mode === 'create' ? '/contactos' : `/contactos/${contact?.id ?? ''}`} title={mode === 'create' ? 'Nuevo contacto' : 'Editar contacto'} description={mode === 'create' ? 'Registrá una persona para relacionarla con una organización y sus oportunidades.' : 'Actualizá los datos del contacto y conservá sus relaciones comerciales.'} onSubmit={() => { void handleSubmit(submit)() }} submitLabel={mode === 'create' ? 'Crear contacto' : 'Guardar cambios'} submitting={mutation.isPending} error={errors.root?.serverError?.message}>
    <FormSection title="Identificación" description="Usá el nombre con el que el equipo reconoce a la persona.">
      <TextField {...register('nombre')} label="Nombre" required fullWidth error={Boolean(errors.nombre)} helperText={errors.nombre?.message} />
      <TextField {...register('apellido')} label="Apellido" required fullWidth error={Boolean(errors.apellido)} helperText={errors.apellido?.message} />
      <TextField {...register('correo')} label="Correo" required type="email" fullWidth error={Boolean(errors.correo)} helperText={errors.correo?.message} />
      <TextField {...register('documento')} label="Documento" fullWidth error={Boolean(errors.documento)} helperText={errors.documento?.message} />
      <TextField {...register('cargo')} label="Cargo" fullWidth error={Boolean(errors.cargo)} helperText={errors.cargo?.message} />
      <TextField {...register('telefono')} label="Teléfono" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} />
    </FormSection>
    <FormSection title="Relación comercial" description="Asociá el contacto a una empresa y completá los datos de origen.">
      <div><Controller name="idEmpresa" control={control} render={({ field }) => <ContactCatalogSelect label="Empresa" field={field} disabled={companyDisabled} options={(companiesQuery.data ?? []).map((company) => ({ id: company.id, descripcion: company.razonSocial }))} error={errors.idEmpresa?.message} />} />{companyMessage && <p className={`record-form-note ${relatedOpportunity ? 'record-form-note--warning' : ''}`}>{companyMessage}</p>}{funnelQuery.isError && <CatalogMessage error={funnelQuery.error} onRetry={() => void funnelQuery.refetch()} />}{companiesQuery.isError && <CatalogMessage error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />}</div>
      <div><Controller name="idEstado" control={control} render={({ field, fieldState }) => <ContactCatalogSelect label="Estado" field={field} options={stateQuery.data ?? []} error={fieldState.error?.message} />} />{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}</div>
      <div><Controller name="idOrigen" control={control} render={({ field, fieldState }) => <ContactCatalogSelect label="Origen" field={field} options={originQuery.data ?? []} error={fieldState.error?.message} />} />{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}</div>
    </FormSection>
    <FormSection title="Observaciones"><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} /></FormSection>
  </RecordFormPage>
}

export function NewContactPage() { return <ContactEditor mode="create" /> }

export function EditContactPage() {
  const { idContacto } = useParams()
  const id = Number(idContacto)
  const query = useQuery({ queryKey: contactoQueryKeys.detail(id), queryFn: () => getContact(id), enabled: Number.isSafeInteger(id) && id > 0 })
  if (query.isPending) return <div className="companies-page" role="status">Cargando contacto…</div>
  if (query.isError || !query.data) return <div className="companies-page"><p>No pudimos cargar el contacto.</p></div>
  return <ContactEditor mode="edit" contact={query.data} />
}
