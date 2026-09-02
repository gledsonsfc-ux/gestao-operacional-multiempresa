import { ParImparTipo } from '@/types/gestao'

/**
 * Retorna a quantidade de dias em um mês e ano específicos.
 * @param year Ano (ex: 2026)
 * @param month Mês (1 = Janeiro ... 12 = Dezembro)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Helper puro de cálculo de paridade 12x36 para virada de mês.
 *
 * Regra do negócio:
 * Em um trabalho 12x36, a escala no mês base (setembro/2026, 31 dias conforme especificado)
 * alterna dia sim, dia não.
 *
 * Ao virar de um mês com 31 dias para o mês seguinte, a paridade do colaborador se inverte
 * automaticamente (quem estava em 'impar' passa para 'par', e vice-versa).
 * Já em meses com 28, 29 ou 30 dias, a paridade se mantém igual no mês seguinte.
 *
 * Exemplo de validação da paridade (base 'par' em set/2026):
 * - out/2026 -> 'impar' (setembro tem 31d -> inverte)
 * - nov/2026 -> 'par'   (outubro tem 31d -> inverte)
 * - dez/2026 -> 'par'   (novembro tem 30d -> NÃO inverte)
 * - jan/2027 -> 'impar' (dezembro tem 31d -> inverte)
 *
 * @param baseParImpar Paridade no mês base ('par' | 'impar' | 'nao_se_aplica')
 * @param targetYear Ano alvo (ex: 2026)
 * @param targetMonth Mês alvo (1 a 12, ex: 10 para out)
 * @param baseYear Ano base (padrão: 2026)
 * @param baseMonth Mês base (padrão: 9 para setembro)
 * @returns Paridade calculada para o mês alvo
 */
export function calculateParidadeMes(
  baseParImpar: ParImparTipo,
  targetYear: number,
  targetMonth: number,
  baseYear = 2026,
  baseMonth = 9,
): ParImparTipo {
  if (baseParImpar === 'nao_se_aplica' || !baseParImpar) {
    return 'nao_se_aplica'
  }

  // Mapeia data base e data alvo em meses absolutos
  const baseIndex = baseYear * 12 + (baseMonth - 1)
  const targetIndex = targetYear * 12 + (targetMonth - 1)

  if (targetIndex === baseIndex) {
    return baseParImpar
  }

  let currentParidade: 'par' | 'impar' = baseParImpar === 'par' ? 'par' : 'impar'

  // Caso 1: Avançando no tempo (target > base)
  // Cada mês encerrado m (de baseIndex até targetIndex - 1) com 31 dias inverte a paridade
  if (targetIndex > baseIndex) {
    for (let idx = baseIndex; idx < targetIndex; idx++) {
      const y = Math.floor(idx / 12)
      const m = (idx % 12) + 1 // 1 a 12
      // Se for setembro/2026, o requisito especifica explicitamente: "setembro/2026 (31 dias) como mês base"
      const days = y === 2026 && m === 9 ? 31 : getDaysInMonth(y, m)
      if (days === 31) {
        currentParidade = currentParidade === 'par' ? 'impar' : 'par'
      }
    }
  } else {
    // Caso 2: Retrocedendo no tempo (target < base)
    for (let idx = baseIndex - 1; idx >= targetIndex; idx--) {
      const y = Math.floor(idx / 12)
      const m = (idx % 12) + 1
      const days = y === 2026 && m === 9 ? 31 : getDaysInMonth(y, m)
      if (days === 31) {
        currentParidade = currentParidade === 'par' ? 'impar' : 'par'
      }
    }
  }

  return currentParidade
}

/**
 * Retorna os nomes dos meses em português
 */
export const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
