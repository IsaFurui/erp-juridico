import type { UserRole } from './jwt'

export const API_BASE = '/api'

export interface LoginPayload {
  companyId: number
  login: string
  password: string
}

export interface LoginResponse {
  access_token: string
}

export interface User {
  id: number
  name: string
  login: string
  role: UserRole
  companyId: number
}

export interface CreateUserPayload {
  name: string
  login: string
  password: string
  role?: UserRole
  companyId: number
}

export interface UpdateUserPayload {
  name?: string
  role?: UserRole
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })

  if (res.status === 401) {
    onUnauthorized?.()
  }

  if (!res.ok) {
    let message = `Erro ${res.status}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (typeof body.message === 'string') message = body.message
      else if (Array.isArray(body.message)) message = body.message.join(', ')
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const authApi = {
  login: (payload: LoginPayload): Promise<LoginResponse> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const usersApi = {
  listByCompany: (companyId: number): Promise<User[]> =>
    request(`/users/company/${companyId}`),
  create: (payload: CreateUserPayload): Promise<User> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: UpdateUserPayload): Promise<User> =>
    request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
}