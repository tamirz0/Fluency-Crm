import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export const api = createClient<paths>({ baseUrl: '/api', fetch: (...args) => globalThis.fetch(...args) })
export type AuthUser = components['schemas']['UsuarioResponse']
export type LoginCredentials = components['schemas']['LoginRequest']

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
