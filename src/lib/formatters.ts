// Formatters & mask helpers for Brazilian Portuguese documents and currency

export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export const cleanCPF = (value: string): string => {
  return value.replace(/\D/g, '')
}

export const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false

  let sum = 0
  let remainder: number

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false

  return true
}

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const formatCurrency = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export const formatDateTimeBR = (dateStr?: string | null): string => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return dateStr
  }
}

/**
 * Computes difference in decimal hours between two HH:mm times.
 * If saida < entrada (crosses midnight), adds 24 hours.
 */
export const calculateHoursDifference = (entrada: string, saida: string): number => {
  if (!entrada || !saida) return 0
  const [h1, m1] = entrada.split(':').map(Number)
  const [h2, m2] = saida.split(':').map(Number)
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0

  const t1 = h1 + m1 / 60
  let t2 = h2 + m2 / 60
  if (t2 < t1) {
    t2 += 24 // cruzou meia-noite
  }
  const diff = Math.max(0, t2 - t1)
  return Number(diff.toFixed(2))
}

/**
 * Calculates overtime total value and formula memory
 */
export const calculateOvertime = (
  horas: number,
  valorHora: number,
  percentual: number,
  regraNome: string = 'Regra Padrão',
): { valorCalculado: number; memoriaCalculo: string } => {
  const fator = 1 + percentual / 100
  const total = Number((horas * valorHora * fator).toFixed(2))
  const memoria = `${horas.toFixed(2)}h × ${formatCurrency(valorHora)} × (1 + ${percentual}% [${regraNome}]) = ${formatCurrency(total)}`
  return {
    valorCalculado: total,
    memoriaCalculo: memoria,
  }
}
