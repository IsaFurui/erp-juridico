/** Papéis dentro de um escritório. O root não é um deles — ver `Session`. */
export type UserRole = 'ADMIN' | 'FINANCEIRO' | 'OPERACIONAL'

/**
 * Duas sessões possíveis, espelhando o backend:
 *
 * - `tenant`   — usuário de um escritório, sempre com empresa.
 * - `platform` — dono da plataforma, nunca com empresa.
 *
 * É uma união discriminada de propósito: o TypeScript obriga a checar o
 * `scope` antes de ler `companyId`, que só existe num dos dois casos.
 */
export interface TenantSession {
  scope: 'tenant'
  sub: number
  login: string
  role: UserRole
  companyId: number
  companyName?: string
  /** Expiração em segundos desde a epoch, posta pelo @nestjs/jwt. */
  exp?: number
}

export interface PlatformSession {
  scope: 'platform'
  sub: number
  login: string
  exp?: number
}

export type Session = TenantSession | PlatformSession

export function isPlatform(session: Session): session is PlatformSession {
  return session.scope === 'platform'
}

export function isTenant(session: Session): session is TenantSession {
  return session.scope === 'tenant'
}

export function decodeJwt(token: string): Session | null {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '=',
    )
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder('utf-8').decode(bytes)
    const parsed = JSON.parse(json) as Session
    // Token sem escopo é de antes da separação plataforma/escritório: tratar
    // como ilegível derruba a sessão antiga em vez de deixá-la ambígua.
    if (parsed?.scope !== 'tenant' && parsed?.scope !== 'platform') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Só olha o exp — a assinatura quem valida é o backend. Serve para não
 * montar o app com um token vencido e só descobrir no primeiro 401.
 * Token sem exp é tratado como expirado: o backend sempre emite um.
 */
export function isTokenExpired(session: Session | null): boolean {
  if (!session || typeof session.exp !== 'number') return true
  return session.exp * 1000 <= Date.now()
}
