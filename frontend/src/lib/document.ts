import { onlyDigits, formatCnpj } from './cnpj'

export { onlyDigits }

function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9)}`
}

/**
 * Formata como CPF (até 11 dígitos) ou CNPJ (12+ dígitos), acompanhando a
 * digitação. Aceita valor já formatado ou apenas dígitos.
 */
export function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value)
  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits)
}

/** CPF tem 11 dígitos, CNPJ tem 14. */
export function isValidCpfCnpj(value: string): boolean {
  const len = onlyDigits(value).length
  return len === 11 || len === 14
}

export function documentKind(value: string): 'CPF' | 'CNPJ' | null {
  const len = onlyDigits(value).length
  if (len === 11) return 'CPF'
  if (len === 14) return 'CNPJ'
  return null
}
