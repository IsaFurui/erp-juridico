import type { ExpenseCategory } from '../../lib/api'

/** Rótulo legível de cada categoria (o enum guarda só o código). */
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ALUGUEL: 'Aluguel',
  CONTAS: 'Contas',
  PESSOAL: 'Pessoal',
  SOFTWARE: 'Software e assinaturas',
  IMPOSTOS: 'Impostos e taxas',
  MARKETING: 'Marketing',
  MATERIAL: 'Material de escritório',
  CUSTAS: 'Custas e diligências',
  OUTROS: 'Outros',
}

/** Ordem de exibição nos selects. */
export const CATEGORY_ORDER: ExpenseCategory[] = [
  'ALUGUEL',
  'CONTAS',
  'PESSOAL',
  'SOFTWARE',
  'IMPOSTOS',
  'MARKETING',
  'MATERIAL',
  'CUSTAS',
  'OUTROS',
]

export function categoryLabel(category: ExpenseCategory): string {
  return CATEGORY_LABELS[category] ?? category
}

/** Despesa de processo/judicial recebe cor diferente da operacional. */
export function categoryVariant(
  category: ExpenseCategory,
): 'info' | 'neutral' {
  return category === 'CUSTAS' ? 'info' : 'neutral'
}
