// Formata o número CNJ (20 dígitos) no padrão NNNNNNN-DD.AAAA.J.TR.OOOO.
// Códigos fora do padrão (ex.: numeração antiga) voltam sem alteração.
export function formatProcessCode(code: string): string {
  const digits = code.replace(/\D/g, '')
  if (digits.length !== 20) return code
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`
}
