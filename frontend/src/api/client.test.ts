import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const usuario = { id: 7, nombre: 'María', apellido: 'Gómez', correo: 'maria@example.invalid', username: 'maria', activo: true, roles: ['VENDEDOR'], permisos: ['ConsultarComercial'] }
const sesion = { usuario, expiresAt: '2026-10-13T07:00:00Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const requests = () => vi.mocked(fetch).mock.calls.map(([request]) => request as Request)

beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => vi.unstubAllEnvs())

describe('transporte de sesión', () => {
  it('usa cookies y CSRF, renueva el token tras login y conserva solo datos en memoria', async () => {
    const client = await import('./client')
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ requestToken: 'anonimo' }))
      .mockResolvedValueOnce(json(sesion))
      .mockResolvedValueOnce(json({ requestToken: 'autenticado' }))
    expect(await client.loginRequest({ username: 'maria', password: 'ficticia' })).toEqual(usuario)
    expect(requests().map(request => new URL(request.url).pathname)).toEqual(['/api/auth/csrf', '/api/auth/login', '/api/auth/csrf'])
    expect(requests().every(request => request.credentials === 'include')).toBe(true)
    expect(requests()[1].headers.get('X-CSRF-TOKEN')).toBe('anonimo')
    expect(await requests()[1].json()).toEqual({ username: 'maria', password: 'ficticia' })
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('distingue rechazo 401 y no reenvía el login fallido', async () => {
    const client = await import('./client')
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ requestToken: 'anonimo' }))
      .mockResolvedValueOnce(json({ title: 'Usuario o contraseña incorrectos.', code: 'UNAUTHENTICATED', traceId: 'trace-test' }, 401))
    await expect(client.loginRequest({ username: 'maria', password: 'incorrecta' })).rejects.toMatchObject({ status: 401, message: 'Usuario o contraseña incorrectos.', code: 'UNAUTHENTICATED', traceId: 'trace-test' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('consulta me sin CSRF y cierra sesión con el token de la identidad vigente', async () => {
    const client = await import('./client')
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ requestToken: 'anonimo' }))
      .mockResolvedValueOnce(json(sesion))
      .mockResolvedValueOnce(json({ requestToken: 'autenticado' }))
      .mockResolvedValueOnce(json(sesion))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ requestToken: 'nuevo-anonimo' }))
      .mockResolvedValueOnce(json({ title: 'Sesión requerida', code: 'UNAUTHENTICATED' }, 401))
    expect(await client.loginSession({ username: 'maria', password: 'ficticia' })).toEqual(sesion)
    expect(await client.getSessionRequest()).toEqual(sesion)
    expect(requests()[3].method).toBe('GET')
    expect(requests()[3].headers.has('X-CSRF-TOKEN')).toBe(false)
    await client.logoutRequest()
    expect(new URL(requests()[4].url).pathname).toBe('/api/auth/logout')
    expect(requests()[4].headers.get('X-CSRF-TOKEN')).toBe('autenticado')
    expect(await requests()[4].text()).toBe('')
    await expect(client.getSessionRequest()).rejects.toMatchObject({ status: 401 })
    expect(requests()).toHaveLength(7)
  })

  it.each([400, 403])('conserva ProblemDetails y no reenvía una mutación rechazada con %s', async status => {
    const client = await import('./client')
    const errors = { username: ['Campo inválido.'] }
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ requestToken: 'token' }))
      .mockResolvedValueOnce(json({ title: 'Solicitud rechazada', errors, code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_FAILED', traceId: 'trace-test' }, status))
    await expect(client.logoutRequest()).rejects.toMatchObject({ status, code: status === 403 ? 'FORBIDDEN' : 'VALIDATION_FAILED', traceId: 'trace-test', errors, message: 'Campo inválido.' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('descarta el CSRF de una sesión vencida para la siguiente acción explícita', async () => {
    const client = await import('./client')
    vi.mocked(fetch)
      .mockResolvedValueOnce(json({ requestToken: 'anterior' }))
      .mockResolvedValueOnce(json({ code: 'UNAUTHENTICATED' }, 401))
      .mockResolvedValueOnce(json({ requestToken: 'actual' }))
      .mockResolvedValueOnce(json({ code: 'FORBIDDEN' }, 403))
    await client.refreshCsrfToken()
    await expect(client.getSessionRequest()).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(2)
    await expect(client.logoutRequest()).rejects.toMatchObject({ status: 403 })
    expect(requests()[3].headers.get('X-CSRF-TOKEN')).toBe('actual')
  })

  it('si falla obtener CSRF no envía la mutación y permite un nuevo intento explícito', async () => {
    const client = await import('./client')
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Network error'))
    await expect(client.loginRequest({ username: 'maria', password: 'ficticia' })).rejects.toMatchObject({ message: 'No pudimos conectar con la API.', status: undefined })
    expect(requests().every(request => request.method === 'GET')).toBe(true)
    vi.mocked(fetch).mockResolvedValueOnce(json({ requestToken: 'recuperado' }))
    expect(await client.refreshCsrfToken()).toBe('recuperado')
  })

  it('reutiliza una sola obtención CSRF para requests simultáneos', async () => {
    const client = await import('./client')
    vi.mocked(fetch).mockImplementation(async request => new URL((request as Request).url).pathname.endsWith('/csrf')
      ? json({ requestToken: 'compartido' }) : json({ code: 'FORBIDDEN' }, 403))
    const results = await Promise.allSettled([client.api.POST('/auth/logout'), client.api.POST('/auth/logout')])
    expect(results.every(result => result.status === 'rejected')).toBe(true)
    expect(requests().filter(request => request.method === 'GET')).toHaveLength(1)
    expect(requests().filter(request => request.method === 'POST')).toHaveLength(2)
    expect(requests().filter(request => request.method === 'POST').every(request => request.headers.get('X-CSRF-TOKEN') === 'compartido')).toBe(true)
  })

  it('admite una URL explícita de API y conserva el envío de cookies', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.invalid')
    const client = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(json(sesion))
    expect(await client.getSessionRequest()).toEqual(sesion)
    expect(requests()[0].url).toBe('https://api.example.invalid/auth/me')
    expect(requests()[0].credentials).toBe('include')
  })
})
