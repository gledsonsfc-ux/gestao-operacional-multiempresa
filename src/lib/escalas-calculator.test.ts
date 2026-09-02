import { describe, it, expect } from 'vitest'
import { calculateParidadeMes, getDaysInMonth } from './escalas-calculator'

describe('calculateParidadeMes - Regra de virada de mês 12x36', () => {
  it('deve validar corretamente o exemplo da especificação com base Par em Set/2026', () => {
    // Exemplo do requisito verbatim:
    // Base Par em set/2026:
    // - out/2026 -> Ímpar (set tem 31d)
    // - nov/2026 -> Par (out tem 31d)
    // - dez/2026 -> Par (nov tem 30d, não inverte)
    // - jan/2027 -> Ímpar (dez tem 31d)

    // Setembro 2026 (base)
    expect(calculateParidadeMes('par', 2026, 9)).toBe('par')

    // Outubro 2026 -> Ímpar
    expect(calculateParidadeMes('par', 2026, 10)).toBe('impar')

    // Novembro 2026 -> Par
    expect(calculateParidadeMes('par', 2026, 11)).toBe('par')

    // Dezembro 2026 -> Par (novembro tem 30 dias, logo não inverte)
    expect(calculateParidadeMes('par', 2026, 12)).toBe('par')

    // Janeiro 2027 -> Ímpar (dezembro tem 31 dias, inverte)
    expect(calculateParidadeMes('par', 2027, 1)).toBe('impar')
  })

  it('deve validar corretamente quando a base for Ímpar em Set/2026', () => {
    // Base Ímpar em set/2026:
    // - set/2026 -> Ímpar
    // - out/2026 -> Par (set tem 31d)
    // - nov/2026 -> Ímpar (out tem 31d)
    // - dez/2026 -> Ímpar (nov tem 30d)
    // - jan/2027 -> Par (dez tem 31d)

    expect(calculateParidadeMes('impar', 2026, 9)).toBe('impar')
    expect(calculateParidadeMes('impar', 2026, 10)).toBe('par')
    expect(calculateParidadeMes('impar', 2026, 11)).toBe('impar')
    expect(calculateParidadeMes('impar', 2026, 12)).toBe('impar')
    expect(calculateParidadeMes('impar', 2027, 1)).toBe('par')
  })

  it('deve retornar nao_se_aplica para escalas flexíveis ou não aplicáveis', () => {
    expect(calculateParidadeMes('nao_se_aplica', 2026, 10)).toBe('nao_se_aplica')
  })
})
