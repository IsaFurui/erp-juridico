import type { UserRole } from './jwt'

export const API_BASE = '/api'

export interface LoginPayload {
  companyId: number
  login: string
  password: string
}

/** O root não pertence a empresa nenhuma, então não manda companyId. */
export interface PlatformLoginPayload {
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
  /**
   * Obrigatório na sessão da plataforma (que não tem empresa própria);
   * para um ADMIN, informar outra empresa devolve 403.
   */
  companyId?: number
}

export interface UpdateUserPayload {
  name?: string
  role?: UserRole
}

export interface Company {
  id: number
  name: string
  cnpj: string
  active: boolean
  createdAt: string
}

export interface CreateCompanyPayload {
  name: string
  cnpj: string
}

export interface UpdateCompanyPayload {
  name: string
}

export interface Client {
  id: number
  name: string
  cpfCnpj: string
  active: boolean
  createdAt: string
}

export interface CreateClientPayload {
  name: string
  cpfCnpj: string
}

export interface UpdateClientPayload {
  name?: string
  cpfCnpj?: string
}

/** Envelope das listagens paginadas — igual para todo módulo do backend. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export interface ListClientsParams {
  page?: number
  pageSize?: number
  search?: string
  /** Apenas ADMIN; o backend responde 403 para os demais. */
  includeInactive?: boolean
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

  const text = await res.text()
  let data: unknown = null
  if (text.trim()) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, buildErrorMessage(res.status, data))
  }

  if (res.status === 204 || data === null) {
    if (res.status === 204) return undefined as T
    throw new ApiError(
      res.status,
      'O servidor retornou uma resposta vazia. Tente novamente.',
    )
  }
  return data as T
}

const STATUS_HINTS: Record<number, string> = {
  400: 'Dados inválidos',
  401: 'Sessão inválida ou credenciais incorretas',
  403: 'Você não tem permissão para esta ação',
  404: 'Registro não encontrado',
  409: 'Conflito com dados existentes',
  422: 'Não foi possível processar os dados',
  500: 'Erro interno no servidor',
}

function buildErrorMessage(status: number, data: unknown): string {
  let raw = ''

  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string') raw = message
    else if (Array.isArray(message)) raw = message.join('\n')
  }

  const hint = STATUS_HINTS[status] ?? `Falha na requisição (${status})`

  if (raw.trim()) return formatErrorList(raw, hint)
  return hint
}

function formatErrorList(raw: string, hint: string): string {
  const items = Array.from(
    new Set(
      raw
        .split('\n')
        .map((e) => e.trim())
        .filter(Boolean),
    ),
  )

  if (items.length === 0) return hint

  const details = items.slice(0, 4).map((e) => `• ${e}`).join('\n')

  if (items.length === 1) {
    const single = items[0]
    const normalized = single.charAt(0).toLowerCase() + single.slice(1)
    return `${hint}: ${normalized}`
  }

  return `${hint}:\n${details}`
}

export const authApi = {
  login: (payload: LoginPayload): Promise<LoginResponse> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  loginPlatform: (payload: PlatformLoginPayload): Promise<LoginResponse> =>
    request('/auth/platform/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const usersApi = {
  // A empresa vem do token no backend. O companyId só é aceito (e exigido)
  // na sessão da plataforma, que não tem empresa própria.
  list: (companyId?: number): Promise<User[]> =>
    request(companyId ? `/users?companyId=${companyId}` : '/users'),
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

export const companyApi = {
  listAll: (): Promise<Company[]> => request('/company'),
  create: (payload: CreateCompanyPayload): Promise<Company> =>
    request('/company', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: UpdateCompanyPayload): Promise<Company> =>
    request(`/company/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deactivate: (id: number): Promise<void> =>
    request(`/company/${id}/deactivate`, { method: 'PATCH' }),
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const clientsApi = {
  listAll: (params: ListClientsParams = {}): Promise<Paginated<Client>> =>
    request(`/clients${toQuery({ ...params })}`),
  create: (payload: CreateClientPayload): Promise<Client> =>
    request('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: UpdateClientPayload): Promise<Client> =>
    request(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deactivate: (id: number): Promise<void> =>
    request(`/clients/${id}/deactivate`, { method: 'PATCH' }),
  activate: (id: number): Promise<Client> =>
    request(`/clients/${id}/activate`, { method: 'PATCH' }),
}