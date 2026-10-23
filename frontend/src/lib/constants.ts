export const STORAGE_KEYS = {
  authToken: 'erp_juridico_token',
} as const

export const APP_ROUTES = {
  login: '/login',
  dashboard: '/',
  users: '/admin/users',
  companies: '/admin/empresas',
  clients: '/clientes',
  processes: '/processos',
  finance: '/financeiro',
  settings: '/admin/configuracoes',
} as const

/** Caminho da página de um processo específico. */
export function processDetailPath(id: number): string {
  return `${APP_ROUTES.processes}/${id}`
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FINANCEIRO: 'Financeiro',
  OPERACIONAL: 'Operacional',
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}