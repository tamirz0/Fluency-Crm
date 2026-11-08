import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, contactoQueryKeys, createContact, getCatalogOptions, getContact, patchContact, type Contacto, type ContactoRequest } from '../../api/client'
import { CompanyResponsibleSelect } from '../companies/CompanyResponsibleSelect'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage, RecordQueryState } from '../shared/RecordForm'
import { parsePositiveId } from '../shared/display'
import { ContactCompanySelect } from './ContactCompanySelect'
import '../shared/recordForms.css'

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`).optional()
const contactSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá el nombre.').max(100, 'Máximo 100 caracteres.'),
  apellido: z.string().trim().min(1, 'Ingresá el apellido.').max(100, 'Máximo 100 caracteres.'),
  correo: z.string().trim().min(1, 'Ingresá el correo.').max(150, 'Máximo 150 caracteres.').refine((value) => z.email().safeParse(value).success, 'Ingresá un correo válido.'),
  documento: optionalText(20), cargo: optionalText(100), telefono: optionalText(50), idEstado: z.string().optional(), idOrigen: z.string().optional(), idEmpresa: z.string().optional(), idResponsable: z.string().optional(), observaciones: z.string().optional(),
})
type ContactFormValues = z.input<typeof contactSchema>

const contactPatchFields = ['nombre', 'apellido', 'correo', 'documento', 'cargo', 'telefono', 'idEstado', 'idOrigen', 'idEmpresa', 'idResponsable', 'observaciones'] as const
const contactPatchIdFields = ['idEstado', 'idOrigen', 'idEmpresa', 'idResponsable'] as const

function initialContactValues(contact?: Contacto): ContactFormValues {
  const id = (value: number | string | null | undefined) => value == null ? '' : String(value)
  return { nombre: contact?.nombre ?? '', apellido: contact?.apellido ?? '', correo: contact?.correo ?? '', documento: contact?.documento ?? '', cargo: contact?.cargo ?? '', telefono: contact?.telefono ?? '', idEstado: id(contact?.idEstado), idOrigen: id(contact?.idOrigen), idEmpresa: id(contact?.idEmpresa), idResponsable: id(contact?.idResponsable), observaciones: contact?.observaciones ?? '' }
}

function CatalogSelect({ label, name, value, onChange, options, error, className }: { label: string; name: string; value: string; onChange: (value: string) => void; options: { id: number | string; descripcion: string; activo?: boolean }[]; error?: string; className?: string }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, descripcion: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth className={className} label={label} name={name} value={value} onChange={(event) => onChange(event.target.value)} error={Boolean(error)} helperText={error}>
    <MenuItem value="">-</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)} disabled={option.activo === false && String(option.id) !== value}>{option.descripcion}</MenuItem>)}
  </TextField>
}

function ContactEditor({ contact, mode }: { contact?: Contacto; mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saving = useRef(false)
  const baseline = initialContactValues(contact)
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<ContactFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(contactSchema) })
  const currentValues = useWatch({ control })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: () => getCatalogOptions('estados-cliente') })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: () => getCatalogOptions('origenes-comerciales') })
  const mutation = useMutation({ mutationFn: (values: ContactFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { nombre: normalizeText(values.nombre), apellido: normalizeText(values.apellido), correo: normalizeText(values.correo) }
      const optional: Record<string, string | number | null | undefined> = { documento: values.documento, cargo: values.cargo, telefono: values.telefono, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), idEmpresa: normalizeId(values.idEmpresa), idResponsable: normalizeId(values.idResponsable), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createContact(payload as ContactoRequest)
    }
    const patch = buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...contactPatchFields], [...contactPatchIdFields])
    return patchContact(Number(contact?.id), patch as ContactoRequest)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(contactoQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: contactoQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    navigate(`/contactos/${saved.id}`, { state: { confirmation: confirmationFor('Contacto', mode === 'create' ? 'creado' : 'actualizado') } })
  }, onError: (error) => { saving.current = false; setError('root.serverError', { message: saveErrorMessage(error) }) } })
  useEffect(() => { reset(initialContactValues(contact)) }, [contact, reset])
  const differential = mode === 'edit' ? buildDifferentialPatch(baseline as Record<string, unknown>, currentValues as Record<string, unknown>, [...contactPatchFields], [...contactPatchIdFields]) : undefined
  const defaultState = stateQuery.data?.some(s => s.descripcion?.toLocaleLowerCase('es-AR') === 'potencial')
  const stateRequired = mode === 'create' && stateQuery.isSuccess && !defaultState && !currentValues.idEstado
  const stateOptions = [...(stateQuery.data ?? [])]
  if (contact && !stateOptions.some(s => String(s.id) === String(contact.idEstado))) stateOptions.unshift({ id: contact.idEstado, descripcion: contact.estadoDescripcion + (contact.estadoActivo ? '' : ' (inactivo)'), activo: contact.estadoActivo })
  const originOptions = [...(originQuery.data ?? [])]
  if (contact?.idOrigen && !originOptions.some(s => String(s.id) === String(contact.idOrigen))) originOptions.unshift({ id: contact.idOrigen, descripcion: (contact.origenDescripcion ?? '-') + (contact.origenActivo ? '' : ' (inactivo)'), activo: contact.origenActivo ?? false })
  const canSubmit = !stateRequired && (mode === 'create' || Boolean(differential && Object.keys(differential).length > 0))
  const submit: SubmitHandler<ContactFormValues> = (values) => {
    if (mode === 'edit' && (!values.idEstado || !values.idResponsable)) { setError('root.serverError', { message: 'Estado y responsable son obligatorios.' }); return }
    if (saving.current || mutation.isPending || (mode === 'edit' && !Object.keys(buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...contactPatchFields], [...contactPatchIdFields])).length)) return
    saving.current = true
    mutation.mutate(values)
  }
  return <RecordFormPage backLabel={mode === 'create' ? 'Volver a contactos' : 'Volver al contacto'} backTo={mode === 'create' ? '/contactos' : `/contactos/${contact?.id ?? ''}`} title={mode === 'create' ? 'Nuevo contacto' : 'Editar contacto'} description={mode === 'create' ? 'Registrá una persona para relacionarla con una organización y sus oportunidades.' : 'Actualizá los datos del contacto y conservá sus relaciones comerciales.'} onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel={mode === 'create' ? 'Crear contacto' : 'Guardar cambios'} submitting={mutation.isPending} disabled={!canSubmit} error={errors.root?.serverError?.message}>
    <FormSection title="Identificación" description="Usá los datos con los que el equipo reconoce a la persona.">
      <TextField {...register('nombre')} label="Nombre" required fullWidth error={Boolean(errors.nombre)} helperText={errors.nombre?.message} />
      <TextField {...register('apellido')} label="Apellido" required fullWidth error={Boolean(errors.apellido)} helperText={errors.apellido?.message} />
      <TextField {...register('documento')} label="Documento" fullWidth error={Boolean(errors.documento)} helperText={errors.documento?.message} />
      <TextField {...register('cargo')} label="Cargo" fullWidth error={Boolean(errors.cargo)} helperText={errors.cargo?.message} />
    </FormSection>
    <FormSection title="Contacto" description="Mantené a mano los datos para comunicarse con la persona.">
      <TextField {...register('correo')} label="Correo" required type="email" fullWidth error={Boolean(errors.correo)} helperText={errors.correo?.message} />
      <TextField {...register('telefono')} label="Teléfono" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} />
    </FormSection>
    <FormSection title="Relación comercial" description="Asociá el contacto a una empresa y completá los datos de origen.">
      <div><Controller name="idEmpresa" control={control} render={({ field }) => <ContactCompanySelect value={field.value ?? ''} onChange={field.onChange} disabled={mutation.isPending} current={contact?.idEmpresa == null ? undefined : { id: Number(contact.idEmpresa), razonSocial: contact.empresaRazonSocial ?? '-' }} />} />{mode === 'edit' && <p className="record-form-note" role="note">Cambiar o quitar la empresa solo actualiza este contacto. Las oportunidades y actividades anteriores conservan sus relaciones.</p>}</div>
      <div><Controller name="idEstado" control={control} render={({ field, fieldState }) => <CatalogSelect className="record-form-emphasis" label="Estado" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={stateOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message ?? (stateRequired ? 'Potencial no está disponible. Seleccioná un estado activo.' : undefined)} />} />{mode === 'create' && !currentValues.idEstado && defaultState && <p>Predeterminado: Potencial.</p>}{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}</div>
      <div><Controller name="idOrigen" control={control} render={({ field, fieldState }) => <CatalogSelect label="Origen" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={originOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message} />} />{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}</div>
    </FormSection>
    <FormSection title="Responsable" description="El contacto es compartido: todos los usuarios activos pueden consultarlo y editarlo.">
      <Controller name="idResponsable" control={control} render={({ field }) => <CompanyResponsibleSelect value={field.value ?? ''} onChange={field.onChange} disabled={mutation.isPending} current={contact ? { id: contact.idResponsable, nombre: contact.responsableNombre, activo: contact.responsableActivo } : undefined} helperText={mode === 'create' ? 'Si no elegís otro responsable, se asigna al usuario de la sesión.' : 'Conservá el responsable actual o elegí otro usuario activo.'} />} />
    </FormSection>
    <FormSection title="Observaciones"><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} /></FormSection>
  </RecordFormPage>
}

export function NewContactPage() { return <ContactEditor mode="create" /> }

export function EditContactPage() {
  const { idContacto } = useParams()
  const id = parsePositiveId(idContacto)
  const query = useQuery({ queryKey: contactoQueryKeys.detail(id ?? 0), queryFn: () => getContact(id as number), enabled: id !== undefined })
  if (id === undefined || query.isPending || query.isError || !query.data) return <RecordQueryState noun="contacto" backLabel="Volver a contactos" backTo="/contactos" loading={query.isPending} invalid={id === undefined} error={query.error} onRetry={() => void query.refetch()} />
  return <ContactEditor mode="edit" contact={query.data} />
}
