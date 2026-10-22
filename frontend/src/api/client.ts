import createClient from 'openapi-fetch'
import type { components, paths } from './schema'
import type { components as LegacyComponents, paths as LegacyPaths } from './legacy-schema'

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
export const api = createClient<paths>({ baseUrl, credentials: 'include', fetch: (...args) => globalThis.fetch(...args) })
// Contratos históricos de componentes fuera de App; retirar al sustituir cada módulo.
const legacyApi = createClient<LegacyPaths>({ baseUrl, credentials: 'include', fetch: (...args) => globalThis.fetch(...args) })
export type AuthUser = components['schemas']['UsuarioResponse']
export type LoginCredentials = components['schemas']['LoginRequest']
export type SessionResponse = components['schemas']['SesionResponse']
export type Empresa = LegacyComponents['schemas']['EmpresaResponse']
export type Contacto = LegacyComponents['schemas']['ContactoResponse']
export type OportunidadDetalle = LegacyComponents['schemas']['OportunidadResponse']
export type EtapaConOportunidades = LegacyComponents['schemas']['EtapaConOportunidadesResponse']
export type OportunidadResumenResponse = LegacyComponents['schemas']['OportunidadResumenResponse']
export type EtapaComercial = LegacyComponents['schemas']['EtapaComercialResponse']
export type UpdateEtapaOportunidadRequest = LegacyComponents['schemas']['UpdateEtapaOportunidadRequest']
export type CreateEmpresaRequest = LegacyComponents['schemas']['CreateEmpresaRequest']
export type PatchEmpresaRequest = LegacyComponents['schemas']['PatchEmpresaRequest']
export type CreateContactoRequest = LegacyComponents['schemas']['CreateContactoRequest']
export type PatchContactoRequest = LegacyComponents['schemas']['PatchContactoRequest']
export type CreateOportunidadRequest = LegacyComponents['schemas']['CreateOportunidadRequest']
export type PatchOportunidadRequest = LegacyComponents['schemas']['PatchOportunidadRequest']
export type EstadoCliente = LegacyComponents['schemas']['EstadoClienteResponse']
export type OrigenComercial = LegacyComponents['schemas']['OrigenComercialResponse']
export type Servicio = LegacyComponents['schemas']['ServicioResponse']

let csrfToken: Promise<string> | undefined

export function refreshCsrfToken(): Promise<string> {
  const pending = getResponseData(() => api.GET('/auth/csrf')).then(data => {
    if (!data.requestToken) throw new ApiRequestError('La API no devolvió el token CSRF.')
    return data.requestToken
  }).catch(error => {
    if (csrfToken === pending) csrfToken = undefined
    throw error
  })
  csrfToken = pending
  return pending
}

api.use({
  async onRequest({ request }) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
      request.headers.set('X-CSRF-TOKEN', await (csrfToken ?? refreshCsrfToken()))
  },
  async onResponse({ response, schemaPath }) {
    if (response.status === 401 || response.status === 400 ||
        (response.ok && (schemaPath === '/auth/login' || schemaPath === '/auth/logout')))
      csrfToken = undefined
    if (!response.ok) {
      const problem: unknown = await response.clone().json().catch(() => undefined)
      if (response.status === 401 && schemaPath !== '/auth/login') window.dispatchEvent(new Event('fluency:session-ended'))
      if (response.status === 403) window.dispatchEvent(new CustomEvent('fluency:forbidden', { detail: getApiErrorMessage(problem, 403) }))
      throw new ApiRequestError(getApiErrorMessage(problem, response.status), response.status, problem)
    }
  },
  onError() { return new ApiRequestError('No pudimos conectar con la API.') },
})

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
  readonly code?: string
  readonly traceId?: string
  readonly errors?: Record<string, string[]>
  constructor(message: string, status?: number, problem?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    if (problem && typeof problem === 'object') {
      const data = problem as Record<string, unknown>
      if (typeof data.code === 'string') this.code = data.code
      if (typeof data.traceId === 'string') this.traceId = data.traceId
      if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors))
        this.errors = Object.fromEntries(Object.entries(data.errors).filter((entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every(message => typeof message === 'string')))
    }
  }
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
  return (await loginSession(credentials)).usuario
}

export async function loginSession(credentials: LoginCredentials): Promise<SessionResponse> {
  await refreshCsrfToken()
  const session = await getResponseData(() => api.POST('/auth/login', { body: credentials }))
  await refreshCsrfToken()
  return session
}

export function getSessionRequest(): Promise<SessionResponse> {
  return getResponseData(() => api.GET('/auth/me'))
}

export async function logoutRequest(): Promise<void> {
  await api.POST('/auth/logout')
  window.dispatchEvent(new Event('fluency:session-ended'))
  await refreshCsrfToken()
}

export async function getCompanies(): Promise<Empresa[]> {
  try {
    const { data, error, response } = await legacyApi.GET('/Empresa/ListadoEmpresas')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getCompany(idEmpresa: number): Promise<Empresa> {
  try {
    const { data, error, response } = await legacyApi.GET('/Empresa/DatosEmpresa/{idEmpresa}', { params: { path: { idEmpresa } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getContacts(): Promise<Contacto[]> {
  try {
    const { data, error, response } = await legacyApi.GET('/Contacto/ListadoContactos')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getContact(idContacto: number): Promise<Contacto> {
  try {
    const { data, error, response } = await legacyApi.GET('/Contacto/DatosContacto/{idContacto}', { params: { path: { idContacto } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getOpportunitiesByStage(): Promise<EtapaConOportunidades[]> {
  try {
    const { data, error, response } = await legacyApi.GET('/Oportunidades/OportunidadesPorEtapa')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getOpportunity(idOportunidad: number): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await legacyApi.GET('/Oportunidades/DatosOportunidad/{idOportunidad}', { params: { path: { idOportunidad } } })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function getCommercialStages(): Promise<EtapaComercial[]> {
  try {
    const { data, error, response } = await legacyApi.GET('/EtapasComerciales/ListadoEtapasComerciales')
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

async function getResponseData<T>(request: () => Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
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
  return getResponseData(() => legacyApi.GET('/EstadosCliente/ListadoEstadosCliente'))
}

export function getCommercialOrigins(): Promise<OrigenComercial[]> {
  return getResponseData(() => legacyApi.GET('/OrigenesComerciales/ListadoOrigenesComerciales'))
}

export function getServices(): Promise<Servicio[]> {
  return getResponseData(() => legacyApi.GET('/Servicios/ListadoServicios'))
}

export async function createCompany(body: CreateEmpresaRequest): Promise<Empresa> {
  try {
    const { data, error, response } = await legacyApi.POST('/Empresa/AltaEmpresa', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchCompany(idEmpresa: number, body: PatchEmpresaRequest): Promise<Empresa> {
  try {
    const { data, error, response } = await legacyApi.PATCH('/Empresa/ModificarEmpresa/{idEmpresa}', { params: { path: { idEmpresa } }, body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function createContact(body: CreateContactoRequest): Promise<Contacto> {
  try {
    const { data, error, response } = await legacyApi.POST('/Contacto/AltaContacto', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchContact(idContacto: number, body: PatchContactoRequest): Promise<Contacto> {
  try {
    const { data, error, response } = await legacyApi.PATCH('/Contacto/ModificarContacto/{idContacto}', { params: { path: { idContacto } }, body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function createOpportunity(body: CreateOportunidadRequest): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await legacyApi.POST('/Oportunidades/AltaOportunidad', { body })
    if (!response.ok || !data) throw new ApiRequestError(getApiErrorMessage(error, response.status), response.status)
    return data
  } catch (error) {
    if (error instanceof ApiRequestError) throw error
    throw new ApiRequestError('No pudimos conectar con la API.')
  }
}

export async function patchOpportunity(idOportunidad: number, body: PatchOportunidadRequest): Promise<OportunidadDetalle> {
  try {
    const { data, error, response } = await legacyApi.PATCH('/Oportunidades/ModificarOportunidad/{idOportunidad}', { params: { path: { idOportunidad } }, body })
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
    const { data, error, response } = await legacyApi.POST('/Oportunidades/UpdateEtapaOportunidad/{idOportunidad}', {
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

export type CreateUsuarioRequest = components['schemas']['CreateUsuarioRequest']
export type PatchUsuarioRequest = components['schemas']['PatchUsuarioRequest']
export type UsuarioQuery = { q?: string; activo?: boolean; rol?: string; page?: number; pageSize?: number }
export type UsuarioOpcion = components['schemas']['UsuarioOpcionResponse']
export const usuarioQueryKeys = { all: ['usuarios'] as const, options: ['usuarios-opciones'] as const }
export function getUsers(query: UsuarioQuery = {}) {
  return getResponseData(() => api.GET('/usuarios', { params: { query } }))
}
export function getUserOptions(query: Omit<UsuarioQuery, 'activo'> = {}) {
  return getResponseData(() => api.GET('/usuarios/opciones', { params: { query } }))
}
export function getRoles() { return getResponseData(() => api.GET('/roles')) }
export function createUser(body: CreateUsuarioRequest) { return getResponseData(() => api.POST('/usuarios', { body })) }
export function patchUser(id: AuthUser['id'], body: PatchUsuarioRequest) {
  return getResponseData(() => api.PATCH('/usuarios/{id}', { params: { path: { id: Number(id) } }, body }))
}
export async function changeUserPassword(id: AuthUser['id'], password: string) {
  await api.PUT('/usuarios/{id}/password', { params: { path: { id: Number(id) } }, body: { password } })
}
export function setUserActive(id: AuthUser['id'], active: boolean) {
  return active
    ? getResponseData(() => api.POST('/usuarios/{id}/reactivar', { params: { path: { id: Number(id) } } }))
    : getResponseData(() => api.POST('/usuarios/{id}/desactivar', { params: { path: { id: Number(id) } } }))
}
