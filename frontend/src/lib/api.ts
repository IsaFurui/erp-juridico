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
  /** Foto de perfil como data URL (base64); ausente quando não tem. */
  avatarUrl?: string | null
}

export interface UpdateProfilePayload {
  name?: string
  /** String vazia remove a foto. */
  avatarUrl?: string
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

/* ----------------------------- Processos ----------------------------- */

/** Catálogo global de status. `isFinal` marca os status de encerramento. */
export interface ProcessStatus {
  id: number
  description: string
  isFinal: boolean
}

/** Sigilo do processo. Espelha o enum `Confidentiality` do backend. */
export type Confidentiality = 'PUBLIC' | 'CONFIDENTIAL'

export interface ProcessType {
  id: number
  name: string
  /** Sigilo sugerido ao criar um processo deste tipo. */
  defaultConfidential: boolean
}

export interface ProcessSubtype {
  id: number
  name: string
  processTypeId: number
}

/** Referência enxuta (cliente, tipo, subtipo) embutida no processo. */
export interface ProcessRef {
  id: number
  name: string
}

export interface ProcessStatusRef {
  id: number
  description: string
  isFinal: boolean
}

/**
 * Item da listagem e corpo de create/update. Os valores são `Decimal` no
 * banco e chegam como **string** no JSON; `fixedAmount`/`expectedAmount` podem
 * ser nulos.
 */
export interface ProcessListItem {
  id: number
  name: string
  code: string
  fixedAmount: string | null
  expectedAmount: string | null
  totalAmount: string
  confidentiality: Confidentiality
  client: ProcessRef
  type: ProcessRef
  subtype: ProcessRef | null
  responsible: ProcessRef | null
  status: ProcessStatusRef
  createdAt: string
  updatedAt: string
}

export interface ProcessStatusHistoryItem {
  id: number
  changedAt: string
  note: string | null
  status: ProcessStatusRef
  user: { id: number; name: string }
}

/** Detalhe = item + a linha do tempo de status. */
export interface ProcessDetail extends ProcessListItem {
  statusHistory: ProcessStatusHistoryItem[]
}

export interface ListProcessesParams {
  page?: number
  pageSize?: number
  search?: string
  statusId?: number
  typeId?: number
  clientId?: number
}

export interface CreateProcessPayload {
  name: string
  code: string
  clientId: number
  typeId: number
  statusId: number
  subtypeId?: number | null
  responsibleId?: number | null
  fixedAmount?: number
  expectedAmount?: number
  confidentiality?: Confidentiality
}

export interface UpdateProcessPayload {
  name?: string
  code?: string
  clientId?: number
  typeId?: number
  subtypeId?: number | null
  responsibleId?: number | null
  fixedAmount?: number
  expectedAmount?: number
  confidentiality?: Confidentiality
}

/** Lista enxuta de colegas do escritório (para o picker de responsável). */
export interface Colleague {
  id: number
  name: string
  role: UserRole
}

export interface ChangeProcessStatusPayload {
  statusId: number
  /** Só é considerado quando o status alvo é de encerramento. */
  totalAmount?: number
  note?: string
}

/* ------------------------------ Despesas ----------------------------- */

/** Espelha o enum `ExpenseCategory` do backend. O rótulo vive no front. */
export type ExpenseCategory =
  | 'ALUGUEL'
  | 'CONTAS'
  | 'PESSOAL'
  | 'SOFTWARE'
  | 'IMPOSTOS'
  | 'MARKETING'
  | 'MATERIAL'
  | 'CUSTAS'
  | 'OUTROS'

/** `amount` é `Decimal` no banco e chega como **string** no JSON. */
export interface Expense {
  id: number
  name: string
  amount: string
  category: ExpenseCategory
  date: string
  createdAt: string
}

export interface ExpenseSummary {
  totalAmount: string
  count: number
  byCategory: {
    category: ExpenseCategory
    totalAmount: string
    count: number
  }[]
}

export interface CreateExpensePayload {
  name: string
  amount: number
  category: ExpenseCategory
  date?: string
}

export interface UpdateExpensePayload {
  name?: string
  amount?: number
  category?: ExpenseCategory
  date?: string
}

export interface ListExpensesParams {
  page?: number
  pageSize?: number
  search?: string
  category?: ExpenseCategory
  /** Intervalo de datas (ISO, inclusivo). */
  from?: string
  to?: string
}

/* ----------------------------- Dashboard ----------------------------- */

export interface DashboardStatusSlice {
  statusId: number
  description: string
  isFinal: boolean
  count: number
}

export interface DashboardActivity {
  id: number
  changedAt: string
  note: string | null
  status: { description: string; isFinal: boolean }
  process: { id: number; name: string; code: string }
  user: { name: string }
}

/** Só vem para ADMIN e FINANCEIRO; `null` para os demais. */
export interface DashboardFinance {
  expensesThisMonth: string
  byCategory: { category: ExpenseCategory; totalAmount: string }[]
}

export interface DashboardData {
  processesByStatus: DashboardStatusSlice[]
  openProcesses: number
  closedThisMonth: number
  /** Soma do Total dos processos encerrados no mês (o que entrou). */
  earnedThisMonth: string
  activeClients: number
  amountInProgress: string
  recentActivity: DashboardActivity[]
  finance: DashboardFinance | null
}

/* ---------------------------- Notificações --------------------------- */

export interface Notification {
  id: number
  type: 'PROCESS_CREATED' | 'STATUS_CHANGED'
  message: string
  processId: number | null
  read: boolean
  createdAt: string
}

export interface NotificationList {
  items: Notification[]
  unreadCount: number
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
  me: (): Promise<User> => request('/users/me'),
  colleagues: (): Promise<Colleague[]> => request('/users/colleagues'),
  updateProfile: (payload: UpdateProfilePayload): Promise<User> =>
    request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
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

export const processesApi = {
  listAll: (
    params: ListProcessesParams = {},
  ): Promise<Paginated<ProcessListItem>> =>
    request(`/processes${toQuery({ ...params })}`),
  getById: (id: number): Promise<ProcessDetail> => request(`/processes/${id}`),
  create: (payload: CreateProcessPayload): Promise<ProcessListItem> =>
    request('/processes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: UpdateProcessPayload,
  ): Promise<ProcessListItem> =>
    request(`/processes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  changeStatus: (
    id: number,
    payload: ChangeProcessStatusPayload,
  ): Promise<ProcessDetail> =>
    request(`/processes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
}

export const expensesApi = {
  listAll: (params: ListExpensesParams = {}): Promise<Paginated<Expense>> =>
    request(`/expenses${toQuery({ ...params })}`),
  summary: (params: ListExpensesParams = {}): Promise<ExpenseSummary> =>
    request(`/expenses/summary${toQuery({ ...params })}`),
  getById: (id: number): Promise<Expense> => request(`/expenses/${id}`),
  create: (payload: CreateExpensePayload): Promise<Expense> =>
    request('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: UpdateExpensePayload): Promise<Expense> =>
    request(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: number): Promise<void> =>
    request(`/expenses/${id}`, { method: 'DELETE' }),
}

export const dashboardApi = {
  get: (): Promise<DashboardData> => request('/dashboard'),
}

export const notificationsApi = {
  list: (): Promise<NotificationList> => request('/notifications'),
  markRead: (id: number): Promise<void> =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: (): Promise<void> =>
    request('/notifications/read-all', { method: 'PATCH' }),
}

export interface CreateProcessStatusPayload {
  description: string
  isFinal?: boolean
}

export interface UpdateProcessStatusPayload {
  description?: string
  isFinal?: boolean
}

export const processStatusApi = {
  listAll: (): Promise<ProcessStatus[]> => request('/process-status'),
  create: (payload: CreateProcessStatusPayload): Promise<ProcessStatus> =>
    request('/process-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: UpdateProcessStatusPayload,
  ): Promise<ProcessStatus> =>
    request(`/process-status/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: number): Promise<void> =>
    request(`/process-status/${id}`, { method: 'DELETE' }),
}

export const processTypeApi = {
  listAll: (): Promise<ProcessType[]> => request('/process-type'),
  listSubtypes: (id: number): Promise<ProcessSubtype[]> =>
    request(`/process-type/${id}/subtypes`),
  create: (payload: {
    name: string
    defaultConfidential?: boolean
  }): Promise<ProcessType> =>
    request('/process-type', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (
    id: number,
    payload: { name?: string; defaultConfidential?: boolean },
  ): Promise<ProcessType> =>
    request(`/process-type/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: number): Promise<void> =>
    request(`/process-type/${id}`, { method: 'DELETE' }),
  createSubtype: (
    typeId: number,
    payload: { name: string },
  ): Promise<ProcessSubtype> =>
    request(`/process-type/${typeId}/subtypes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSubtype: (
    typeId: number,
    subtypeId: number,
    payload: { name: string },
  ): Promise<ProcessSubtype> =>
    request(`/process-type/${typeId}/subtypes/${subtypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  removeSubtype: (typeId: number, subtypeId: number): Promise<void> =>
    request(`/process-type/${typeId}/subtypes/${subtypeId}`, {
      method: 'DELETE',
    }),
}