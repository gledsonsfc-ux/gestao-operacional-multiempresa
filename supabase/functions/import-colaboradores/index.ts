import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as XLSX from 'npm:xlsx@0.18.5'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cleanCPF = (value: string): string => {
  return String(value || '').replace(/\D/g, '')
}

const formatCPF = (value: string): string => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

const isValidCPF = (cpf: string): boolean => {
  const clean = String(cpf || '').replace(/\D/g, '')
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

function parseDateValue(val: any): string | null {
  if (val === null || val === undefined || val === '') return null

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    const year = val.getUTCFullYear()
    const month = String(val.getUTCMonth() + 1).padStart(2, '0')
    const day = String(val.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

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

  if (str.includes('GMT') || str.includes('Coordinated Universal Time') || str.includes('UTC')) {
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear()
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
      const day = String(parsed.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = isoMatch[2].padStart(2, '0')
    const d = isoMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const brMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0')
    const m = brMatch[2].padStart(2, '0')
    const y = brMatch[3]
    return `${y}-${m}-${d}`
  }

  const fallbackDate = new Date(str)
  if (!isNaN(fallbackDate.getTime())) {
    const year = fallbackDate.getFullYear()
    const month = String(fallbackDate.getMonth() + 1).padStart(2, '0')
    const day = String(fallbackDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null
  const str = String(val).trim()
  return str.length > 0 ? str : null
}

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

const HAMMER_ID = '11111111-1111-1111-1111-111111111111'
const INTELIGENCIA_ID = '22222222-2222-2222-2222-222222222222'

function mapEmpresa(
  val: any,
  sheetName: string,
): { id: string; slug: 'hammer-seguranca' | 'inteligencia-servicos'; nome: string } | null {
  const combined = `${val || ''} ${sheetName || ''}`.toLowerCase()

  if (
    combined.includes('hammer') ||
    combined.includes('seguranca') ||
    combined.includes('segurança')
  ) {
    return { id: HAMMER_ID, slug: 'hammer-seguranca', nome: 'Hammer Segurança' }
  }

  if (
    combined.includes('inteligencia') ||
    combined.includes('inteligência') ||
    combined.includes('servico') ||
    combined.includes('serviço')
  ) {
    return { id: INTELIGENCIA_ID, slug: 'inteligencia-servicos', nome: 'Inteligência e Serviços' }
  }

  return null
}

async function runImport() {
  console.log('STARTING_IMPORT_ROUTINE...')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Read local file or provided binary
  let workbook: XLSX.WorkBook
  try {
    const fileBytes = await Deno.readFile(
      './src/assets/cadastrocompletocolaboradoresparaskip-26f70.xlsx',
    )
    workbook = XLSX.read(fileBytes, { type: 'array', cellDates: true })
  } catch (_e) {
    // Fallback if needed
    const fileBytes = await Deno.readFile(
      'src/assets/cadastrocompletocolaboradoresparaskip-26f70.xlsx',
    )
    workbook = XLSX.read(fileBytes, { type: 'array', cellDates: true })
  }

  const { data: dbExisting, error: fetchErr } = await supabase.from('colaboradores').select('*')
  if (fetchErr) throw fetchErr

  const existingMap = new Map<string, any>()
  for (const c of dbExisting || []) {
    if (c.cpf) {
      existingMap.set(cleanCPF(c.cpf), c)
      existingMap.set(c.cpf.trim(), c)
      existingMap.set(formatCPF(c.cpf), c)
    }
  }

  const report = {
    hammerCreated: 0,
    hammerUpdated: 0,
    inteligenciaCreated: 0,
    inteligenciaUpdated: 0,
    pendingCount: 0,
    failedCount: 0,
    pendingDetails: [] as any[],
    failedDetails: [] as any[],
    sheetsParsed: workbook.SheetNames,
    insertedList: [] as any[],
    updatedList: [] as any[],
  }

  const parsedRows: any[] = []
  const seenCpfInFile = new Map<string, any>()

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue

    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: null,
      raw: true,
    })

    if (!rawData || rawData.length === 0) continue

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index]
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

      if (!nomeVal && !cpfVal && !cargoVal && !empresaVal) {
        continue
      }

      const tipoStr = cleanString(tipoVal)
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

      if (
        (sheetName.toLowerCase().includes('pend') &&
          tipoStr &&
          tipoStr.toLowerCase().includes('contato extra')) ||
        (tipoStr && tipoStr.toLowerCase().includes('contato extra'))
      ) {
        report.pendingCount++
        report.pendingDetails.push({
          nome: nome || 'Não informado',
          cpf: rawCpf || 'Não informado',
          empresa: cleanString(empresaVal) || sheetName,
          reason: observacoes || 'Registro classificado como Contato extra (permanece pendente)',
        })
        continue
      }

      if (sheetName.toLowerCase().includes('pend') && !tipoStr) {
        report.pendingCount++
        report.pendingDetails.push({
          nome: nome || 'Não informado',
          cpf: rawCpf || 'Não informado',
          empresa: cleanString(empresaVal) || sheetName,
          reason: observacoes || 'Registro na aba de Pendências',
        })
        continue
      }

      if (!nome) {
        report.failedCount++
        report.failedDetails.push({
          nome: null,
          cpf: rawCpf,
          empresa: cleanString(empresaVal) || sheetName,
          reason: 'Nome completo não informado',
        })
        continue
      }

      if (!cleanCpfVal || !isValidCPF(cleanCpfVal)) {
        report.failedCount++
        report.failedDetails.push({
          nome,
          cpf: rawCpf,
          empresa: cleanString(empresaVal) || sheetName,
          reason: !cleanCpfVal ? 'CPF não informado' : `CPF inválido (${rawCpf})`,
        })
        continue
      }

      const empresaMatched = mapEmpresa(empresaVal, sheetName)
      if (!empresaMatched) {
        report.failedCount++
        report.failedDetails.push({
          nome,
          cpf: rawCpf,
          empresa: cleanString(empresaVal) || sheetName,
          reason: `Empresa não identificada (${cleanString(empresaVal) || sheetName})`,
        })
        continue
      }

      let cargaHoraria: number | null = null
      if (cargaHorariaVal !== null && cargaHorariaVal !== undefined && cargaHorariaVal !== '') {
        const num = Number(String(cargaHorariaVal).replace(/\D/g, ''))
        if (!isNaN(num) && num > 0) {
          cargaHoraria = num
        }
      }

      const dataNascimento = parseDateValue(dtNascVal)
      const dataAdmissao = parseDateValue(dtAdmVal)

      if (seenCpfInFile.has(cleanCpfVal)) {
        const prev = seenCpfInFile.get(cleanCpfVal)
        if (observacoes && (!prev.observacoes || !prev.observacoes.includes(observacoes))) {
          prev.observacoes = prev.observacoes ? `${prev.observacoes} | ${observacoes}` : observacoes
        }
        continue
      }

      const parsedRow = {
        codigo_rh: codigoRh,
        nome,
        cpf: rawCpf,
        cpfClean: cleanCpfVal,
        data_nascimento: dataNascimento,
        telefone,
        email,
        empresa_id: empresaMatched.id,
        empresa_slug: empresaMatched.slug,
        empresa_nome: empresaMatched.nome,
        cargo: cargo || 'Colaborador',
        data_admissao: dataAdmissao,
        carga_horaria_mensal: cargaHoraria,
        status,
        situacao_rh: situacaoRh,
        observacoes,
      }

      seenCpfInFile.set(cleanCpfVal, parsedRow)
      parsedRows.push(parsedRow)
    }
  }

  for (const row of parsedRows) {
    const formattedCpf = formatCPF(row.cpfClean)
    const existing = existingMap.get(row.cpfClean)

    if (existing) {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (row.nome) updatePayload.nome = row.nome
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
        updatePayload.observacoes = existing.observacoes
          ? existing.observacoes.includes(row.observacoes)
            ? existing.observacoes
            : `${existing.observacoes} | ${row.observacoes}`
          : row.observacoes
      }
      updatePayload.empresa_id = row.empresa_id

      const { error: updateErr } = await supabase
        .from('colaboradores')
        .update(updatePayload)
        .eq('id', existing.id)

      if (updateErr) {
        report.failedCount++
        report.failedDetails.push({
          nome: row.nome,
          cpf: row.cpf,
          empresa: row.empresa_nome,
          reason: `Erro UPDATE: ${updateErr.message}`,
        })
      } else {
        if (row.empresa_slug === 'hammer-seguranca') {
          report.hammerUpdated++
        } else {
          report.inteligenciaUpdated++
        }
        report.updatedList.push({ nome: row.nome, cpf: formattedCpf, empresa: row.empresa_nome })
      }
    } else {
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

      const { data: inserted, error: insertErr } = await supabase
        .from('colaboradores')
        .insert(insertPayload)
        .select()
        .single()

      if (insertErr) {
        report.failedCount++
        report.failedDetails.push({
          nome: row.nome,
          cpf: row.cpf,
          empresa: row.empresa_nome,
          reason: `Erro INSERT: ${insertErr.message}`,
        })
      } else {
        existingMap.set(row.cpfClean, inserted)
        if (row.empresa_slug === 'hammer-seguranca') {
          report.hammerCreated++
        } else {
          report.inteligenciaCreated++
        }
        report.insertedList.push({ nome: row.nome, cpf: formattedCpf, empresa: row.empresa_nome })
      }
    }
  }

  // Update a row in an existing table alteracoes_historico
  await supabase.from('alteracoes_historico').insert({
    empresa_id: '11111111-1111-1111-1111-111111111111',
    tabela: 'colaboradores',
    registro_id: '11111111-1111-1111-1111-111111111111',
    campo: 'importacao_relatorio',
    valor_anterior: null,
    valor_novo: JSON.stringify(report),
    motivo: 'IMPORTACAO_EXCEL',
    usuario_nome: 'Sistema de Importação',
  })

  return report
}

Deno.serve(async (req: Request) => {
  try {
    const report = await runImport()
    return new Response(JSON.stringify(report, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
