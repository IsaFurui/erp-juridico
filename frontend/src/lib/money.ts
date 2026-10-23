/**
 * Formata um valor monetário em BRL. Os valores vêm do backend como `Decimal`,
 * ou seja, **string** (ex.: "28000"), e podem ser nulos — então trata string,
 * número, null e undefined, caindo para "—" quando não há valor.
 */
export function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Converte o texto digitado num campo de valor em número (ou null se vazio).
 * Aceita tanto "1.234,56" (pt-BR) quanto "1234.56".
 */
export function parseBRLInput(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const cleaned = trimmed.replace(/[^\d.,-]/g, '')
  // Se há vírgula, ela é o separador decimal e os pontos são de milhar.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned

  const n = Number(normalized)
  return Number.isNaN(n) ? null : n
}
