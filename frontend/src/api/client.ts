import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export const api = createClient<paths>({ baseUrl: '/api', fetch: (...args) => globalThis.fetch(...args) })
export type AuthUser = components['schemas']['UsuarioResponse']
export type LoginCredentials = components['schemas']['LoginRequest']
export type Empresa = components['schemas']['EmpresaResponse']
export type Contacto = components['schemas']['ContactoResponse']
export type OportunidadDetalle = components['schemas']['OportunidadResponse']
export type EtapaConOportunidades = components['schemas']['EtapaConOportunidadesResponse']
export type OportunidadResumenResponse = components['schemas']['OportunidadResumenResponse']
export type EtapaComercial = components['schemas']['EtapaComercialResponse']
export type UpdateEtapaOportunidadRequest = components['schemas']['UpdateEtapaOportunidadRequest']
export type CreateEmpresaRequest = components['schemas']['CreateEmpresaRequest']
export type PatchEmpresaRequest = components['schemas']['PatchEmpresaRequest']
export type CreateContactoRequest = components['schemas']['CreateContactoRequest']
export type PatchContactoRequest = components['schemas']['PatchContactoRequest']
export type CreateOportunidadRequest = components['schemas']['CreateOportunidadRequest']
export type PatchOportunidadRequest = components['schemas']['PatchOportunidadRequest']
export type EstadoCliente = components['schemas']['EstadoClienteResponse']
export type OrigenComercial = components['schemas']['OrigenComercialResponse']
export type Servicio = components['schemas']['ServicioResponse']

export type OportunidadResumen = OportunidadResumenResponse & {
  idEtapa: EtapaConOportunidades['idEtapa']
  etapaNombre: EtapaConOportunidades['nombre']
  etapaOrden: EtapaConOportunidades['orden']
}

export const empresaQueryKeys = {
  all: ['empresas'] as const,
  detail: (idEmpresa: number) => ['empresas', idEmpresa] as const,
}

export const contactoQueryKeys = {
  all: ['contactos'] as const,
  detail: (idContacto: number) => ['contactos', idContacto] as const,
}

export const opportunityQueryKeys = {
  pipeline: ['oportunidades', 'por-etapa'] as const,
  detail: (idOportunidad: number) => ['oportunidades', idOportunidad] as const,
}

export const catalogQueryKeys = {
  commercialStages: ['catalogos', 'etapas-comerciales'] as const,
  customerStates: ['catalogos', 'estados-cliente'] as const,
  commercialOrigins: ['catalogos', 'origenes-comerciales'] as const,
  services: ['catalogos', 'servicios'] as const,
}

export class ApiRequestError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) { super(message); this.name = 'ApiRequestError'; this.status = status }
}

function messageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (!payload || typeof payload !== 'object') return undefined
  const data = payload as Record<string, unknown>
  if (Array.isArray(data.errors)) {
    const messages = data.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (messages.length > 0) return messages.join(' ')
  }
  if (data.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flatMap((item) => Array.isArray(item) ? item : [item]).filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (messages.length > 0) return messages.join(' ')
  }
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim()
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim()
  return undefined
}

export function getApiErrorMessage(payload: unknown, status?: number): string {
  return messageFromPayload(payload) ?? (status ? `La API respondió con estado ${status}.` : 'No pudimos conectar con la API.')
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthUser> {
  try {
    const { data, error, response } = await api.POST('/Login/Login', { body: credentials })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getCompanies(): Promise<Empresa[]> {
  try {
    const { data, error, response } = await api.GET('/Empresa/ListadoEmpresas')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getCompany(idEmpresa: number): Promise<Empresa> {
  try {
    const { data, error, response } = await api.GET('/Empresa/DatosEmpresa/{idEmpresa}', { params: { path: { idEmpresa } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getContacts(): Promise<Contacto[]> {
  try {
    const { data, error, response } = await api.GET('/Contacto/ListadoContactos')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getContact(idContacto: number): Promise<Contacto> {
  try {
    const { data, error, response } = await api.GET('/Contacto/DatosContacto/{idContacto}', { params: { path: { idContacto } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getOpportunitiesByStage(): Promise<EtapaConOportunidades[]> {
  try {
    const { data, error, response } = await api.GET('/Oportunidades/OportunidadesPorEtapa')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getOpportunity(idOportunidad: number): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await api.GET('/Oportunidades/DatosOportunidad/{idOportunidad}', { params: { path: { idOportunidad } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getCommercialStages(): Promise<EtapaComercial[]> {
  try {
    const { data, error, response } = await api.GET('/EtapasComerciales/ListadoEtapasComerciales')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

async function getCatalog<T>(request: () => Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  try {
    const { data, error, response } = await request()
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export function getCustomerStates(): Promise<EstadoCliente[]> {
  return getCatalog(() => api.GET('/EstadosCliente/ListadoEstadosCliente'))
}

export function getCommercialOrigins(): Promise<OrigenComercial[]> {
  return getCatalog(() => api.GET('/OrigenesComerciales/ListadoOrigenesComerciales'))
}

export function getServices(): Promise<Servicio[]> {
  return getCatalog(() => api.GET('/Servicios/ListadoServicios'))
}

export async function createCompany(body: CreateEmpresaRequest): Promise<Empresa> {
  try {
    const { data, error, response } = await api.POST('/Empresa/AltaEmpresa', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchCompany(idEmpresa: number, body: PatchEmpresaRequest): Promise<Empresa> {
  try {
    const { data, error, response } = await api.PATCH('/Empresa/ModificarEmpresa/{idEmpresa}', { params: { path: { idEmpresa } }, body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function createContact(body: CreateContactoRequest): Promise<Contacto> {
  try {
    const { data, error, response } = await api.POST('/Contacto/AltaContacto', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchContact(idContacto: number, body: PatchContactoRequest): Promise<Contacto> {
  try {
    const { data, error, response } = await api.PATCH('/Contacto/ModificarContacto/{idContacto}', { params: { path: { idContacto } }, body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function createOpportunity(body: CreateOportunidadRequest): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await api.POST('/Oportunidades/AltaOportunidad', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchOpportunity(idOportunidad: number, body: PatchOportunidadRequest): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await api.PATCH('/Oportunidades/ModificarOportunidad/{idOportunidad}', { params: { path: { idOportunidad } }, body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function updateOpportunityStage(
  idOportunidad: number,
  body: UpdateEtapaOportunidadRequest & { idUsuario: number | string },
): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await api.POST('/Oportunidades/UpdateEtapaOportunidad/{idOportunidad}', {
      params: { path: { idOportunidad } },
      body,
    })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}
