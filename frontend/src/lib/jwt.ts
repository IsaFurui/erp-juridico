export type UserRole = 'ADMIN' | 'FINANCEIRO' | 'OPERACIONAL'

export interface JwtPayload {
  sub: number
  login: string
  role: UserRole
  companyId: number
  companyName?: string
}

export function decodeJwt(token: string): JwtPayload | null {
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
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}