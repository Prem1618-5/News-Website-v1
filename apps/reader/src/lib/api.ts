/** Thin fetch wrapper for the Platform API. Cookies carry the session (HttpOnly), so nothing sensitive is kept in JS. */
const env = import.meta.env as Record<string, string | undefined>
export const API_BASE = (env.VITE_API_URL ?? '').replace(/\/+$/, '') + '/api'

export class ApiError extends Error {
  readonly status: number
  readonly payload?: unknown
  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { credentials: env.VITE_API_URL ? 'include' : 'same-origin', ...init, headers })
  } catch {
    throw new ApiError('You appear to be offline.', 0)
  }
  let body: unknown = {}
  try {
    body = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const detail = (body as { detail?: unknown })?.detail
    const message =
      typeof detail === 'string' ? detail : res.status >= 500 ? 'The server had a problem. Try again in a moment.' : `Request failed (${res.status})`
    throw new ApiError(message, res.status, body)
  }
  return body as T
}

export const post = <T>(path: string, data?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
export const put = <T>(path: string, data: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(data) })
