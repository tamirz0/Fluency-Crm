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
export type Empresa = components['schemas']['EmpresaResponse']
export type Contacto = components['schemas']['ContactoResponse']
export type OportunidadDetalle = LegacyComponents['schemas']['OportunidadResponse']
export type EtapaConOportunidades = LegacyComponents['schemas']['EtapaConOportunidadesResponse']
export type OportunidadResumenResponse = LegacyComponents['schemas']['OportunidadResumenResponse']
export type EtapaComercial = LegacyComponents['schemas']['EtapaComercialResponse']
export type UpdateEtapaOportunidadRequest = LegacyComponents['schemas']['UpdateEtapaOportunidadRequest']
export type CreateEmpresaRequest = components['schemas']['EmpresaRequest']
export type PatchEmpresaRequest = components['schemas']['EmpresaRequest']
export type ContactoRequest = components['schemas']['ContactoRequest']
export type CreateOportunidadRequest = LegacyComponents['schemas']['CreateOportunidadRequest']
export type PatchOportunidadRequest = LegacyComponents['schemas']['PatchOportunidadRequest']
export type EstadoCliente = LegacyComponents['schemas']['EstadoClienteResponse']
export type OrigenComercial = LegacyComponents['schemas']['OrigenComercialResponse']
export type Servicio = components['schemas']['ServicioResponse']
export type ServicioRequest = components['schemas']['ServicioRequest']

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

export type EmpresaQuery = { q?: string; idEstado?: number; idOrigen?: number; idResponsable?: number; page?: number; pageSize?: number }
export function listCompanies(query: EmpresaQuery = {}) {
  return getResponseData(() => api.GET('/empresas', { params: { query } }))
}
// Consumidores retirados de App conservan su adaptación hasta su propio incremento.
export async function getCompanies(): Promise<Empresa[]> { return (await listCompanies()).items }
export function getCompany(id: number): Promise<Empresa> {
  return getResponseData(() => api.GET('/empresas/{id}', { params: { path: { id } } }))
}

export type ContactoQuery = { q?: string; idEstado?: number; idOrigen?: number; idResponsable?: number; idEmpresa?: number; page?: number; pageSize?: number }
export function listContacts(query: ContactoQuery = {}) {
  return getResponseData(() => api.GET('/contactos', { params: { query } }))
}
// Consumidores de oportunidades e inicio conservan esta adaptación hasta su propio incremento.
export async function getContacts(): Promise<Contacto[]> { return (await listContacts({ pageSize: 100 })).items }
export function getContact(id: number): Promise<Contacto> {
  return getResponseData(() => api.GET('/contactos/{id}', { params: { path: { id } } }))
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

export async function getServices(): Promise<Servicio[]> {
  return (await listServices()).items
}

export function createCompany(body: CreateEmpresaRequest): Promise<Empresa> {
  return getResponseData(() => api.POST('/empresas', { body }))
}
export function patchCompany(id: number, body: PatchEmpresaRequest): Promise<Empresa> {
  return getResponseData(() => api.PATCH('/empresas/{id}', { params: { path: { id } }, body }))
}
export async function deleteCompany(id: number): Promise<void> {
  await api.DELETE('/empresas/{id}', { params: { path: { id } } })
}

export function createContact(body: ContactoRequest): Promise<Contacto> {
  return getResponseData(() => api.POST('/contactos', { body }))
}
export function patchContact(id: number, body: ContactoRequest): Promise<Contacto> {
  return getResponseData(() => api.PATCH('/contactos/{id}', { params: { path: { id } }, body }))
}
export async function deleteContact(id: number): Promise<void> {
  await api.DELETE('/contactos/{id}', { params: { path: { id } } })
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

export type CatalogOption = components['schemas']['CatalogoResponse']
export type CatalogRequest = components['schemas']['CatalogoRequest']
export type CatalogQuery = { q?: string; activo?: 'true' | 'false' | 'todos'; page?: number; pageSize?: number }
export const configurableCatalogs = [
  { id: 'estados-cliente', label: 'Estados de cliente' },
  { id: 'origenes-comerciales', label: 'Orígenes comerciales' },
  { id: 'niveles-ingles', label: 'Niveles de inglés' },
  { id: 'modalidades', label: 'Modalidades' },
  { id: 'motivos-perdida', label: 'Motivos de pérdida' },
  { id: 'tipos-actividad', label: 'Tipos de actividad' },
] as const
export type ConfigurableCatalog = typeof configurableCatalogs[number]['id']
export function getCatalog(catalogo: ConfigurableCatalog, query: CatalogQuery = {}) {
  return getResponseData(() => api.GET('/catalogos/{catalogo}', { params: { path: { catalogo }, query } }))
}
export function getCatalogOptions(catalogo: ConfigurableCatalog, q?: string) {
  return getResponseData(() => api.GET('/catalogos/{catalogo}/opciones', { params: { path: { catalogo }, query: { q } } }))
}
export function getCatalogOption(catalogo: ConfigurableCatalog, id: CatalogOption['id']) {
  return getResponseData(() => api.GET('/catalogos/{catalogo}/{id}', { params: { path: { catalogo, id: Number(id) } } }))
}
export function createCatalogOption(catalogo: ConfigurableCatalog, body: CatalogRequest) {
  return getResponseData(() => api.POST('/catalogos/{catalogo}', { params: { path: { catalogo } }, body }))
}
export function patchCatalogOption(catalogo: ConfigurableCatalog, id: CatalogOption['id'], body: CatalogRequest) {
  return getResponseData(() => api.PATCH('/catalogos/{catalogo}/{id}', { params: { path: { catalogo, id: Number(id) } }, body }))
}
export function setCatalogOptionActive(catalogo: ConfigurableCatalog, id: CatalogOption['id'], active: boolean) {
  const path = { catalogo, id: Number(id) }
  return active
    ? getResponseData(() => api.POST('/catalogos/{catalogo}/{id}/reactivar', { params: { path } }))
    : getResponseData(() => api.POST('/catalogos/{catalogo}/{id}/desactivar', { params: { path } }))
}
export function getOpportunityStates() { return getResponseData(() => api.GET('/estados-oportunidad')) }

export function listServices(query: CatalogQuery = {}) {
  return getResponseData(() => api.GET('/servicios', { params: { query } }))
}
export function createService(body: ServicioRequest) {
  return getResponseData(() => api.POST('/servicios', { body }))
}
export function patchService(id: Servicio['id'], body: ServicioRequest) {
  return getResponseData(() => api.PATCH('/servicios/{id}', { params: { path: { id: Number(id) } }, body }))
}
export function setServiceActive(id: Servicio['id'], active: boolean) {
  const path = { id: Number(id) }
  return active
    ? getResponseData(() => api.POST('/servicios/{id}/reactivar', { params: { path } }))
    : getResponseData(() => api.POST('/servicios/{id}/desactivar', { params: { path } }))
}

export type Embudo = components['schemas']['EmbudoResponse']
export type EmbudoRequest = components['schemas']['EmbudoRequest']
export type EtapaConfiguracion = components['schemas']['EtapaComercialResponse']
export type EtapaRequest = components['schemas']['EtapaComercialRequest']
export function listFunnels(query: CatalogQuery = {}) { return getResponseData(() => api.GET('/embudos', { params: { query } })) }
export function createFunnel(body: EmbudoRequest) { return getResponseData(() => api.POST('/embudos', { body })) }
export function patchFunnel(id: number, body: EmbudoRequest) { return getResponseData(() => api.PATCH('/embudos/{id}', { params: { path: { id } }, body })) }
export function setFunnelActive(id: number, active: boolean) {
  return active ? getResponseData(() => api.POST('/embudos/{id}/reactivar', { params: { path: { id } } }))
    : getResponseData(() => api.POST('/embudos/{id}/desactivar', { params: { path: { id } } }))
}
export function listStages(id: number, activo: 'true' | 'false' | 'todos' = 'true') { return getResponseData(() => api.GET('/embudos/{id}/etapas', { params: { path: { id }, query: { activo } } })) }
export function createStage(id: number, body: EtapaRequest) { return getResponseData(() => api.POST('/embudos/{id}/etapas', { params: { path: { id } }, body })) }
export function patchStage(id: number, body: EtapaRequest) { return getResponseData(() => api.PATCH('/etapas/{id}', { params: { path: { id } }, body })) }
export function setStageActive(id: number, active: boolean) {
  return active ? getResponseData(() => api.POST('/etapas/{id}/reactivar', { params: { path: { id } } }))
    : getResponseData(() => api.POST('/etapas/{id}/desactivar', { params: { path: { id } } }))
}
export function reorderStages(id: number, body: components['schemas']['OrdenEtapasRequest']) { return getResponseData(() => api.PUT('/embudos/{id}/orden-etapas', { params: { path: { id } }, body })) }
