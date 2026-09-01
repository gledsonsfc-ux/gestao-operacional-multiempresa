import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase/client'
import { isValidCPF, cleanCPF, formatCPF } from '@/lib/formatters'
import { Colaborador, Empresa } from '@/types/gestao'

export interface ParsedRowData {
  rowIndex: number
  sheetName: string
  rawValues: Record<string, any>
  codigo_rh?: string | null
  nome?: string | null
  cpf?: string | null
  cpfClean?: string | null
  data_nascimento?: string | null // YYYY-MM-DD
  telefone?: string | null
  email?: string | null
  empresaRaw?: string | null
  empresa_id?: string | null
  empresa_slug?: 'hammer-seguranca' | 'inteligencia-servicos' | null
  cargo?: string | null
  data_admissao?: string | null // YYYY-MM-DD
  carga_horaria_mensal?: number | null
  status?: string | null
  situacao_rh?: string | null
  observacoes?: string | null
  tipo?: string | null // 'Contato extra', 'Empregado', etc.
  isValid: boolean
  isPending: boolean
  pendingReason?: string
  action?: 'insert' | 'update' | 'skip'
  existingId?: string
}

export interface ImportPreviewSummary {
  totalRows: number
  validCount: number
  pendingCount: number
  hammerNew: number
  hammerUpdate: number
  inteligenciaNew: number
  inteligenciaUpdate: number
  rows: ParsedRowData[]
  pendingList: Array<{
    rowIndex: number
    sheetName: string
    nome?: string | null
    cpf?: string | null
    empresa?: string | null
    reason: string
  }>
}

export interface ImportExecutionReport {
  hammerCreated: number
  hammerUpdated: number
  inteligenciaCreated: number
  inteligenciaUpdated: number
  pendingCount: number
  failedCount: number
  pendingDetails: Array<{
    nome?: string | null
    cpf?: string | null
    empresa?: string | null
    reason: string
  }>
  failedDetails: Array<{
    nome?: string | null
    cpf?: string | null
    empresa?: string | null
    reason: string
  }>
}

// Normalizer for Excel / string dates to YYYY-MM-DD
export function parseDateValue(val: any): string | null {
  if (val === null || val === undefined || val === '') return null

  // If SheetJS already gave a JS Date instance
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    const year = val.getUTCFullYear()
    const month = String(val.getUTCMonth() + 1).padStart(2, '0')
    const day = String(val.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // If number (Excel serial date number)
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val)
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const y = dateObj.y
        const m = String(dateObj.m).padStart(2, '0')
        const d = String(dateObj.d).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
    } catch {
      // ignore
    }
  }

  const str = String(val).trim()
  if (!str) return null

  // Check if string contains standard Date toString like "Mon Oct 23 1989 00:00:00 GMT+0000"
  if (str.includes('GMT') || str.includes('Coordinated Universal Time') || str.includes('UTC')) {
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear()
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
      const day = String(parsed.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // Check ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = isoMatch[2].padStart(2, '0')
    const d = isoMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Check Brazilian format DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0')
    const m = brMatch[2].padStart(2, '0')
    const y = brMatch[3]
    return `${y}-${m}-${d}`
  }

  // Fallback try Date.parse
  const fallbackDate = new Date(str)
  if (!isNaN(fallbackDate.getTime())) {
    const year = fallbackDate.getFullYear()
    const month = String(fallbackDate.getMonth() + 1).padStart(2, '0')
    const day = String(fallbackDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

// Clean text
function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null
  const str = String(val).trim()
  return str.length > 0 ? str : null
}

// Normalize company names
export function mapEmpresa(
  val: any,
  empresas: Empresa[],
): { id: string; slug: 'hammer-seguranca' | 'inteligencia-servicos'; nome: string } | null {
  if (!val) return null
  const str = String(val).trim().toLowerCase()

  const hammerObj = empresas.find((e) => e.slug === 'hammer-seguranca')
  const inteligenciaObj = empresas.find((e) => e.slug === 'inteligencia-servicos')

  if (
    str.includes('hammer') ||
    str.includes('seguranca') ||
    str.includes('segurança') ||
    str.includes('hammer seguranca privada') ||
    str.includes('hammer segurança privada')
  ) {
    if (hammerObj) {
      return { id: hammerObj.id, slug: 'hammer-seguranca', nome: hammerObj.nome }
    }
  }

  if (
    str.includes('inteligencia') ||
    str.includes('inteligência') ||
    str.includes('servico') ||
    str.includes('serviço') ||
    str.includes('inteligencia e servicos') ||
    str.includes('inteligência e serviços')
  ) {
    if (inteligenciaObj) {
      return { id: inteligenciaObj.id, slug: 'inteligencia-servicos', nome: inteligenciaObj.nome }
    }
  }

  // Match by exact id if provided
  const direct = empresas.find((e) => e.id === val || e.nome.toLowerCase() === str)
  if (direct) {
    return {
      id: direct.id,
      slug: direct.slug as 'hammer-seguranca' | 'inteligencia-servicos',
      nome: direct.nome,
    }
  }

  return null
}

// Clean header keys for fuzzy matching
function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export async function parseColaboradoresFile(
  file: File,
  empresas: Empresa[],
  existingColaboradores: Colaborador[],
): Promise<ImportPreviewSummary> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  const allRows: ParsedRowData[] = []
  const pendingList: ImportPreviewSummary['pendingList'] = []

  // Map of existing colaboradores by clean CPF and formatted CPF
  const existingMap = new Map<string, Colaborador>()
  for (const c of existingColaboradores) {
    if (c.cpf) {
      existingMap.set(cleanCPF(c.cpf), c)
      existingMap.set(c.cpf.trim(), c)
      existingMap.set(formatCPF(c.cpf), c)
    }
  }

  // Iterate over sheets
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    // If sheet looks like a metadata or summary sheet, check if it has valid headers
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: null,
      raw: true,
    })

    if (!rawData || rawData.length === 0) continue

    // Parse each row
    rawData.forEach((row, index) => {
      const rowIndex = index + 2 // 1-based index + header row

      // Find value by checking headers
      const getVal = (possibleHeaders: string[]): any => {
        const normalizedCandidates = possibleHeaders.map(normalizeHeaderKey)
        for (const [key, value] of Object.entries(row)) {
          const normKey = normalizeHeaderKey(key)
          if (normalizedCandidates.includes(normKey)) {
            return value
          }
        }
        return null
      }

      const codigoRhVal = getVal(['Código RH', 'Codigo RH', 'codigo_rh', 'Codigo', 'Matricula'])
      const nomeVal = getVal([
        'Nome completo',
        'Nome Completo',
        'Nome',
        'nome',
        'Funcionario',
        'Colaborador',
      ])
      const cpfVal = getVal(['CPF', 'cpf', 'Cpf', 'Documento'])
      const dtNascVal = getVal([
        'Data de nascimento',
        'Data Nascimento',
        'Nascimento',
        'data_nascimento',
      ])
      const telVal = getVal([
        'Telefone / WhatsApp',
        'Telefone',
        'WhatsApp',
        'telefone',
        'Celular',
        'Contato',
      ])
      const emailVal = getVal(['E-mail', 'Email', 'email', 'Correio'])
      const empresaVal = getVal(['Empresa', 'empresa', 'Unidade'])
      const cargoVal = getVal([
        'Cargo / Função',
        'Cargo',
        'Função',
        'Funcao',
        'cargo',
        'cargo_funcao',
      ])
      const dtAdmVal = getVal(['Data de admissão', 'Data Admissao', 'Admissao', 'data_admissao'])
      const cargaHorariaVal = getVal([
        'Carga horária mensal',
        'Carga Horaria Mensal',
        'Carga Horaria',
        'carga_horaria_mensal',
        'CH Mensal',
      ])
      const statusVal = getVal(['Status', 'status', 'Situacao'])
      const situacaoRhVal = getVal(['Situação RH', 'Situacao RH', 'situacao_rh', 'Sit RH'])
      const obsVal = getVal([
        'Observações',
        'Observacoes',
        'observacoes',
        'Obs',
        'Pendência / Observação',
        'Pendencia / Observacao',
      ])
      const tipoVal = getVal(['Tipo', 'tipo'])

      // Skip row if it's completely empty or summary-like header row without name or CPF
      if (!nomeVal && !cpfVal && !cargoVal && !empresaVal) {
        return
      }

      // Check if this sheet is "Pendencias" and has "Tipo: Contato extra"
      const tipoStr = cleanString(tipoVal)
      if (tipoStr && tipoStr.toLowerCase().includes('contato extra')) {
        const item: ParsedRowData = {
          rowIndex,
          sheetName,
          rawValues: row,
          codigo_rh: cleanString(codigoRhVal),
          nome: cleanString(nomeVal),
          cpf: cleanString(cpfVal),
          cpfClean: cpfVal ? cleanCPF(String(cpfVal)) : null,
          empresaRaw: cleanString(empresaVal),
          isValid: false,
          isPending: true,
          pendingReason:
            cleanString(obsVal) ||
            'Registro marcado como Contato extra (não importar como empregado)',
          action: 'skip',
          tipo: tipoStr,
        }
        allRows.push(item)
        pendingList.push({
          rowIndex,
          sheetName,
          nome: item.nome,
          cpf: item.cpf,
          empresa: item.empresaRaw,
          reason: item.pendingReason || 'Contato extra',
        })
        return
      }

      // If sheetName is "Pendencias" and we already processed employees from "Hammer" or "Inteligencia", we can avoid duplicate reporting unless it's distinct
      // But let's process standard rows
      const nome = cleanString(nomeVal)
      const rawCpf = cleanString(cpfVal)
      const cleanCpfVal = rawCpf ? cleanCPF(rawCpf) : null
      const cargo = cleanString(cargoVal)
      const codigoRh = cleanString(codigoRhVal)
      const telefone = cleanString(telVal)
      const email = cleanString(emailVal)
      const status = cleanString(statusVal) || 'Ativo'
      const situacaoRh = cleanString(situacaoRhVal)
      const observacoes = cleanString(obsVal)

      let cargaHoraria: number | null = null
      if (cargaHorariaVal !== null && cargaHorariaVal !== undefined && cargaHorariaVal !== '') {
        const num = Number(String(cargaHorariaVal).replace(/\D/g, ''))
        if (!isNaN(num) && num > 0) {
          cargaHoraria = num
        }
      }

      const dataNascimento = parseDateValue(dtNascVal)
      const dataAdmissao = parseDateValue(dtAdmVal)

      // Resolve empresa: from row, or fallback to sheet name if sheet is Hammer or Inteligência
      let empresaMatched = mapEmpresa(empresaVal, empresas)
      if (!empresaMatched) {
        empresaMatched = mapEmpresa(sheetName, empresas)
      }

      // Validations:
      // 1. Must have valid name
      if (!nome) {
        const item: ParsedRowData = {
          rowIndex,
          sheetName,
          rawValues: row,
          cpf: rawCpf,
          empresaRaw: cleanString(empresaVal) || sheetName,
          isValid: false,
          isPending: true,
          pendingReason: 'Nome completo não informado',
          action: 'skip',
        }
        allRows.push(item)
        pendingList.push({
          rowIndex,
          sheetName,
          nome: null,
          cpf: rawCpf,
          empresa: item.empresaRaw,
          reason: 'Nome completo não informado',
        })
        return
      }

      // 2. Must have valid CPF
      if (!cleanCpfVal || !isValidCPF(cleanCpfVal)) {
        const item: ParsedRowData = {
          rowIndex,
          sheetName,
          rawValues: row,
          nome,
          cpf: rawCpf,
          empresaRaw: cleanString(empresaVal) || sheetName,
          isValid: false,
          isPending: true,
          pendingReason: !cleanCpfVal ? 'CPF não informado' : `CPF inválido (${rawCpf})`,
          action: 'skip',
        }
        allRows.push(item)
        pendingList.push({
          rowIndex,
          sheetName,
          nome,
          cpf: rawCpf,
          empresa: item.empresaRaw,
          reason: item.pendingReason || 'CPF inválido',
        })
        return
      }

      // 3. Must have identified empresa
      if (!empresaMatched) {
        const item: ParsedRowData = {
          rowIndex,
          sheetName,
          rawValues: row,
          nome,
          cpf: rawCpf,
          cpfClean: cleanCpfVal,
          empresaRaw: cleanString(empresaVal) || sheetName,
          isValid: false,
          isPending: true,
          pendingReason: `Empresa não identificada (${cleanString(empresaVal) || sheetName})`,
          action: 'skip',
        }
        allRows.push(item)
        pendingList.push({
          rowIndex,
          sheetName,
          nome,
          cpf: rawCpf,
          empresa: item.empresaRaw,
          reason: item.pendingReason || 'Empresa não identificada',
        })
        return
      }

      // Check if existing
      const existing = existingMap.get(cleanCpfVal)
      const action = existing ? 'update' : 'insert'

      const parsedRow: ParsedRowData = {
        rowIndex,
        sheetName,
        rawValues: row,
        codigo_rh: codigoRh,
        nome,
        cpf: rawCpf,
        cpfClean: cleanCpfVal,
        data_nascimento: dataNascimento,
        telefone,
        email,
        empresaRaw: cleanString(empresaVal) || empresaMatched.nome,
        empresa_id: empresaMatched.id,
        empresa_slug: empresaMatched.slug,
        cargo: cargo || 'Colaborador',
        data_admissao: dataAdmissao,
        carga_horaria_mensal: cargaHoraria,
        status,
        situacao_rh: situacaoRh,
        observacoes,
        tipo: tipoStr,
        isValid: true,
        isPending: false,
        action,
        existingId: existing?.id,
      }

      allRows.push(parsedRow)
    })
  }

  // Deduplicate rows if same CPF appears multiple times (e.g., across sheets)
  const uniqueCpfMap = new Map<string, ParsedRowData>()
  const finalRows: ParsedRowData[] = []

  for (const row of allRows) {
    if (!row.cpfClean || !row.isValid) {
      finalRows.push(row)
      continue
    }

    if (uniqueCpfMap.has(row.cpfClean)) {
      // Row already parsed (e.g. from main sheet vs pendencias sheet). Merge observations if needed.
      const prev = uniqueCpfMap.get(row.cpfClean)!
      if (row.observacoes && (!prev.observacoes || !prev.observacoes.includes(row.observacoes))) {
        prev.observacoes = prev.observacoes
          ? `${prev.observacoes}; ${row.observacoes}`
          : row.observacoes
      }
      continue
    }

    uniqueCpfMap.set(row.cpfClean, row)
    finalRows.push(row)
  }

  // Calculate summary counts
  let hammerNew = 0
  let hammerUpdate = 0
  let inteligenciaNew = 0
  let inteligenciaUpdate = 0
  let validCount = 0
  let pendingCount = 0

  for (const row of finalRows) {
    if (row.isValid) {
      validCount++
      if (row.empresa_slug === 'hammer-seguranca') {
        if (row.action === 'insert') hammerNew++
        else if (row.action === 'update') hammerUpdate++
      } else if (row.empresa_slug === 'inteligencia-servicos') {
        if (row.action === 'insert') inteligenciaNew++
        else if (row.action === 'update') inteligenciaUpdate++
      }
    } else {
      pendingCount++
    }
  }

  return {
    totalRows: finalRows.length,
    validCount,
    pendingCount,
    hammerNew,
    hammerUpdate,
    inteligenciaNew,
    inteligenciaUpdate,
    rows: finalRows,
    pendingList,
  }
}

export async function executeColaboradoresImport(
  rowsToImport: ParsedRowData[],
  pendingRows: ParsedRowData[],
): Promise<ImportExecutionReport> {
  const report: ImportExecutionReport = {
    hammerCreated: 0,
    hammerUpdated: 0,
    inteligenciaCreated: 0,
    inteligenciaUpdated: 0,
    pendingCount: pendingRows.length,
    failedCount: 0,
    pendingDetails: pendingRows.map((r) => ({
      nome: r.nome || null,
      cpf: r.cpf || null,
      empresa: r.empresaRaw || null,
      reason: r.pendingReason || 'Ignorado / Pendência',
    })),
    failedDetails: [],
  }

  // Query latest state of existing colaboradores to be completely up to date
  const { data: currentColabs } = await supabase.from('colaboradores').select('*')
  const currentMap = new Map<string, Colaborador>()
  if (currentColabs) {
    for (const c of currentColabs as Colaborador[]) {
      if (c.cpf) {
        currentMap.set(cleanCPF(c.cpf), c)
      }
    }
  }

  for (const row of rowsToImport) {
    if (!row.isValid || !row.cpfClean || !row.empresa_id || !row.nome) {
      continue
    }

    try {
      const existing = currentMap.get(row.cpfClean)

      // Normalize CPF to formatted string (e.g. 000.000.000-00) for clean uniformity
      const formattedCpf = formatCPF(row.cpfClean)

      if (existing) {
        // UPDATE existing record: ONLY update fields provided in the file, keeping existing unprovided fields untouched
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        }

        if (row.nome) updatePayload.nome = row.nome
        // Keep CPF formatted
        updatePayload.cpf = formattedCpf
        if (row.codigo_rh !== null && row.codigo_rh !== undefined)
          updatePayload.codigo_rh = row.codigo_rh
        if (row.data_nascimento) updatePayload.data_nascimento = row.data_nascimento
        if (row.telefone) updatePayload.telefone = row.telefone
        if (row.email) updatePayload.email = row.email
        if (row.cargo) updatePayload.cargo = row.cargo
        if (row.data_admissao) updatePayload.data_admissao = row.data_admissao
        if (row.carga_horaria_mensal !== null && row.carga_horaria_mensal !== undefined) {
          updatePayload.carga_horaria_mensal = row.carga_horaria_mensal
        }
        if (row.status) updatePayload.status = row.status
        if (row.situacao_rh) updatePayload.situacao_rh = row.situacao_rh
        if (row.observacoes) {
          // If existing had observations, combine or update
          updatePayload.observacoes = existing.observacoes
            ? existing.observacoes.includes(row.observacoes)
              ? existing.observacoes
              : `${existing.observacoes} | ${row.observacoes}`
            : row.observacoes
        }

        // Keep empresa_id consistent with the mapped company
        updatePayload.empresa_id = row.empresa_id

        const { error: updateErr } = await (
          supabase.from('colaboradores').update(updatePayload as any) as any
        ).eq('id', existing.id)

        if (updateErr) throw updateErr

        if (row.empresa_slug === 'hammer-seguranca') {
          report.hammerUpdated++
        } else {
          report.inteligenciaUpdated++
        }
      } else {
        // INSERT new record
        const insertPayload: Record<string, any> = {
          empresa_id: row.empresa_id,
          nome: row.nome,
          cpf: formattedCpf,
          cargo: row.cargo || 'Colaborador',
          status: row.status || 'Ativo',
          turno: 'Diurno',
          valor_hora_base: 15.0,
          exige_vigilancia:
            row.empresa_slug === 'hammer-seguranca' &&
            (row.cargo?.toLowerCase().includes('vigilante') ?? false),
          data_admissao: row.data_admissao || new Date().toISOString().split('T')[0],
        }

        if (row.codigo_rh) insertPayload.codigo_rh = row.codigo_rh
        if (row.data_nascimento) insertPayload.data_nascimento = row.data_nascimento
        if (row.telefone) insertPayload.telefone = row.telefone
        if (row.email) insertPayload.email = row.email
        if (row.carga_horaria_mensal) insertPayload.carga_horaria_mensal = row.carga_horaria_mensal
        if (row.situacao_rh) insertPayload.situacao_rh = row.situacao_rh
        if (row.observacoes) insertPayload.observacoes = row.observacoes

        const { data: inserted, error: insertErr } = await (
          supabase.from('colaboradores').insert(insertPayload as any) as any
        )
          .select()
          .single()

        if (insertErr) throw insertErr

        // Add to map so subsequent rows with same CPF in file don't fail
        if (inserted) {
          currentMap.set(row.cpfClean, inserted as Colaborador)
        }

        if (row.empresa_slug === 'hammer-seguranca') {
          report.hammerCreated++
        } else {
          report.inteligenciaCreated++
        }
      }
    } catch (err: any) {
      console.error(`Erro ao importar colaborador ${row.nome} (${row.cpf}):`, err)
      report.failedCount++
      report.failedDetails.push({
        nome: row.nome,
        cpf: row.cpf,
        empresa: row.empresaRaw,
        reason: err.message || 'Falha na persistência no banco de dados',
      })
    }
  }

  return report
}
