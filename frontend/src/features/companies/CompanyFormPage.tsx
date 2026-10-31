import { MenuItem, TextField } from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, createCompany, empresaQueryKeys, getCatalogOptions, getCompany, patchCompany, type CreateEmpresaRequest, type PatchEmpresaRequest, type Empresa } from '../../api/client'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage, RecordQueryState } from '../shared/RecordForm'
import { parsePositiveId } from '../shared/display'
import { CompanyResponsibleSelect } from './CompanyResponsibleSelect'
import '../shared/recordForms.css'

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`).optional()
const emailText = z.string().max(150, 'Máximo 150 caracteres.').refine((value) => !value.trim() || z.email().safeParse(value.trim()).success, 'Ingresá un correo válido.').optional()
const companySchema = z.object({
  razonSocial: z.string().trim().min(1, 'Ingresá la razón social.').max(150, 'Máximo 150 caracteres.'),
  cuit: optionalText(20), industria: optionalText(100), correo: emailText, telefono: optionalText(50), direccion: z.string().optional(), idEstado: z.string().optional(), idOrigen: z.string().optional(), idResponsable: z.string().optional(), observaciones: z.string().optional(),
})
type CompanyFormValues = z.input<typeof companySchema>

const companyPatchFields = ['razonSocial', 'cuit', 'industria', 'correo', 'telefono', 'direccion', 'idEstado', 'idOrigen', 'idResponsable', 'observaciones'] as const
const companyPatchIdFields = ['idEstado', 'idOrigen', 'idResponsable'] as const

function initialCompanyValues(company?: Empresa): CompanyFormValues {
  return { razonSocial: company?.razonSocial ?? '', cuit: company?.cuit ?? '', industria: company?.industria ?? '', correo: company?.correo ?? '', telefono: company?.telefono ?? '', direccion: company?.direccion ?? '', idEstado: company?.idEstado == null ? '' : String(company.idEstado), idOrigen: company?.idOrigen == null ? '' : String(company.idOrigen), idResponsable: company?.idResponsable == null ? '' : String(company.idResponsable), observaciones: company?.observaciones ?? '' }
}

function CatalogSelect({ label, name, value, onChange, options, error, disabled, className }: { label: string; name: string; value: string; onChange: (value: string) => void; options: { id: number | string; descripcion: string; activo?: boolean }[]; error?: string; disabled?: boolean; className?: string }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, descripcion: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth className={className} label={label} name={name} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} error={Boolean(error)} helperText={error}>
    <MenuItem value="">-</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)} disabled={option.activo === false && String(option.id) !== value}>{option.descripcion}</MenuItem>)}
  </TextField>
}

function CompanyEditor({ company, mode }: { company?: Empresa; mode: 'create' | 'edit' }) {
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
    navigate(`/empresas/${saved.id}`, { state: { confirmation: confirmationFor('Empresa', mode === 'create' ? 'creada' : 'actualizada') } })
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
  return <RecordFormPage backLabel={mode === 'create' ? 'Volver a empresas' : 'Volver a la empresa'} backTo={mode === 'create' ? '/empresas' : `/empresas/${company?.id ?? ''}`} title={mode === 'create' ? 'Nueva empresa' : 'Editar empresa'} description={mode === 'create' ? 'Registrá una organización para sumarla a tu actividad comercial.' : 'Actualizá los datos de la organización sin perder el contexto comercial.'} onSubmit={() => { if (canSubmit) void handleSubmit(submit)() }} submitLabel={mode === 'create' ? 'Crear empresa' : 'Guardar cambios'} submitting={mutation.isPending} disabled={!canSubmit} error={formError}>
    <FormSection title="Identificación" description="Los datos que ayudan a reconocer la organización.">
      <TextField {...register('razonSocial')} label="Razón social" required fullWidth error={Boolean(errors.razonSocial)} helperText={errors.razonSocial?.message} />
      <TextField {...register('cuit')} label="CUIT" fullWidth error={Boolean(errors.cuit)} helperText={errors.cuit?.message} />
      <TextField {...register('industria')} label="Industria" fullWidth error={Boolean(errors.industria)} helperText={errors.industria?.message} />
      <TextField {...register('direccion')} className="record-form-wide" label="Dirección" fullWidth error={Boolean(errors.direccion)} helperText={errors.direccion?.message} />
    </FormSection>
    <FormSection title="Contacto" description="Elegí cómo se comunica el equipo con la organización.">
      <TextField {...register('correo')} label="Correo" type="email" fullWidth error={Boolean(errors.correo)} helperText={errors.correo?.message} />
      <TextField {...register('telefono')} label="Teléfono" fullWidth error={Boolean(errors.telefono)} helperText={errors.telefono?.message} />
    </FormSection>
    <FormSection title="Datos comerciales" description="Definí el estado y el origen de la relación.">
      <div><Controller name="idEstado" control={control} render={({ field, fieldState }) => <CatalogSelect className="record-form-emphasis" label="Estado" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={stateOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message ?? (stateRequired ? 'Potencial no está disponible. Seleccioná un estado activo.' : undefined)} />} />{mode === 'create' && !currentValues.idEstado && defaultState && <p>Predeterminado: Potencial.</p>}{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}</div>
      <div><Controller name="idOrigen" control={control} render={({ field, fieldState }) => <CatalogSelect label="Origen" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={originOptions.map(s => ({ ...s, descripcion: s.descripcion ?? '-' }))} error={fieldState.error?.message} />} />{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}</div>
    </FormSection>
    <FormSection title="Responsable" description="La empresa es compartida: todos los usuarios activos pueden consultarla y editarla.">
      <Controller name="idResponsable" control={control} render={({ field }) => <CompanyResponsibleSelect value={field.value ?? ''} onChange={field.onChange} disabled={mutation.isPending} current={company ? { id: company.idResponsable, nombre: company.responsableNombre, activo: company.responsableActivo } : undefined} helperText={mode === 'create' ? 'Si no elegís otro responsable, se asigna al usuario de la sesión.' : 'Conservá el responsable actual o elegí otro usuario activo.'} />} />
    </FormSection>
    <FormSection title="Observaciones"><TextField {...register('observaciones')} className="record-form-wide" label="Observaciones" fullWidth multiline minRows={4} /></FormSection>
  </RecordFormPage>
}

export function NewCompanyPage() { return <CompanyEditor mode="create" /> }

export function EditCompanyPage() {
  const { idEmpresa } = useParams()
  const id = parsePositiveId(idEmpresa)
  const query = useQuery({ queryKey: empresaQueryKeys.detail(id ?? 0), queryFn: () => getCompany(id as number), enabled: id !== undefined })
  if (id === undefined || query.isPending || query.isError || !query.data) return <RecordQueryState noun="empresa" backLabel="Volver a empresas" backTo="/empresas" loading={query.isPending} invalid={id === undefined} error={query.error} onRetry={() => void query.refetch()} />
  return <CompanyEditor mode="edit" company={query.data} />
}
