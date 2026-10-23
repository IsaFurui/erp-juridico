type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

// Mapa dos status do seed para a cor do selo. Encerramentos positivos em
// verde, negativos em vermelho, arquivado neutro; andamento em azul; esperas
// em amarelo.
const VARIANTS: Record<string, BadgeVariant> = {
  'Em andamento': 'info',
  'Em recurso': 'info',
  'Aguardando audiência': 'warning',
  'Aguardando prazo': 'warning',
  'Aguardando documento': 'warning',
  'Aguardando decisão judicial': 'warning',
  Suspenso: 'warning',
  Sobrestado: 'warning',
  'Encerrado com êxito': 'success',
  'Acordo celebrado': 'success',
  'Encerrado sem êxito': 'error',
  Prescrito: 'error',
  Arquivado: 'neutral',
}

export function statusVariant(description: string): BadgeVariant {
  return VARIANTS[description] ?? 'neutral'
}
