import { MenuItem, TextField } from '@mui/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { catalogQueryKeys, createCompany, empresaQueryKeys, getCommercialOrigins, getCompany, getCustomerStates, patchCompany, type Empresa } from '../../api/client'
import { buildDifferentialPatch, confirmationFor, normalizeId, normalizeText, saveErrorMessage } from '../shared/formUtils'
import { CatalogMessage, FormSection, RecordFormPage, RecordQueryState } from '../shared/RecordForm'
import { parsePositiveId } from '../shared/display'
import '../shared/recordForms.css'

const optionalText = (max: number) => z.string().max(max, `Máximo ${max} caracteres.`).optional()
const emailText = z.string().max(150, 'Máximo 150 caracteres.').refine((value) => !value.trim() || z.email().safeParse(value.trim()).success, 'Ingresá un correo válido.').optional()
const companySchema = z.object({
  razonSocial: z.string().trim().min(1, 'Ingresá la razón social.').max(150, 'Máximo 150 caracteres.'),
  cuit: optionalText(20), industria: optionalText(100), correo: emailText, telefono: optionalText(50), direccion: z.string().optional(), idEstado: z.string().optional(), idOrigen: z.string().optional(), observaciones: z.string().optional(),
})
type CompanyFormValues = z.input<typeof companySchema>

const companyPatchFields = ['razonSocial', 'cuit', 'industria', 'correo', 'telefono', 'direccion', 'idEstado', 'idOrigen', 'observaciones'] as const
const companyPatchIdFields = ['idEstado', 'idOrigen'] as const

function initialCompanyValues(company?: Empresa): CompanyFormValues {
  return { razonSocial: company?.razonSocial ?? '', cuit: company?.cuit ?? '', industria: company?.industria ?? '', correo: company?.correo ?? '', telefono: company?.telefono ?? '', direccion: company?.direccion ?? '', idEstado: company?.idEstado == null ? '' : String(company.idEstado), idOrigen: company?.idOrigen == null ? '' : String(company.idOrigen), observaciones: company?.observaciones ?? '' }
}

function CatalogSelect({ label, name, value, onChange, options, error, disabled, className }: { label: string; name: string; value: string; onChange: (value: string) => void; options: { id: number | string; descripcion: string }[]; error?: string; disabled?: boolean; className?: string }) {
  const displayOptions = value && !options.some((option) => String(option.id) === value) ? [{ id: value, descripcion: 'Cargando…' }, ...options] : options
  return <TextField select fullWidth className={className} label={label} name={name} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} error={Boolean(error)} helperText={error}>
    <MenuItem value="">-</MenuItem>{displayOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.descripcion}</MenuItem>)}
  </TextField>
}

function CompanyEditor({ company, mode }: { company?: Empresa; mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const baseline = initialCompanyValues(company)
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<CompanyFormValues>({ defaultValues: baseline, mode: 'onBlur', resolver: zodResolver(companySchema) })
  const currentValues = useWatch({ control })
  const stateQuery = useQuery({ queryKey: catalogQueryKeys.customerStates, queryFn: getCustomerStates })
  const originQuery = useQuery({ queryKey: catalogQueryKeys.commercialOrigins, queryFn: getCommercialOrigins })
  const mutation = useMutation({ mutationFn: (values: CompanyFormValues) => {
    if (mode === 'create') {
      const payload: Record<string, unknown> = { razonSocial: normalizeText(values.razonSocial) }
      const optional: Record<string, string | number | null | undefined> = { cuit: values.cuit, industria: values.industria, correo: values.correo, telefono: values.telefono, direccion: values.direccion, idEstado: normalizeId(values.idEstado), idOrigen: normalizeId(values.idOrigen), observaciones: values.observaciones }
      Object.entries(optional).forEach(([key, value]) => { if (key.startsWith('id')) { if (value !== null) payload[key] = value } else if (normalizeText(value as string)) payload[key] = normalizeText(value as string) })
      return createCompany(payload as never)
    }
    const patch = buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields])
    return patchCompany(Number(company?.id), patch as never)
  }, onSuccess: (saved) => {
    queryClient.setQueryData(empresaQueryKeys.detail(Number(saved.id)), saved)
    void queryClient.invalidateQueries({ queryKey: empresaQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['contactos'] })
    void queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
    navigate(`/empresas/${saved.id}`, { state: { confirmation: confirmationFor('Empresa', mode === 'create' ? 'creada' : 'actualizada') } })
  }, onError: (error) => setError('root.serverError', { message: saveErrorMessage(error) }) })
  useEffect(() => { reset(initialCompanyValues(company)) }, [company, reset])
  const differential = mode === 'edit' ? buildDifferentialPatch(baseline as Record<string, unknown>, currentValues as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields]) : undefined
  const canSubmit = mode === 'create' || Boolean(differential && Object.keys(differential).length > 0)
  const submit: SubmitHandler<CompanyFormValues> = (values) => {
    if (mutation.isPending || (mode === 'edit' && !Object.keys(buildDifferentialPatch(baseline as Record<string, unknown>, values as Record<string, unknown>, [...companyPatchFields], [...companyPatchIdFields])).length)) return
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
      <div><Controller name="idEstado" control={control} render={({ field, fieldState }) => <CatalogSelect className="record-form-emphasis" label="Estado" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={stateQuery.data ?? []} error={fieldState.error?.message} />} />{stateQuery.isError && <CatalogMessage error={stateQuery.error} onRetry={() => void stateQuery.refetch()} />}</div>
      <div><Controller name="idOrigen" control={control} render={({ field, fieldState }) => <CatalogSelect label="Origen" name={field.name} value={field.value ?? ''} onChange={field.onChange} options={originQuery.data ?? []} error={fieldState.error?.message} />} />{originQuery.isError && <CatalogMessage error={originQuery.error} onRetry={() => void originQuery.refetch()} />}</div>
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
