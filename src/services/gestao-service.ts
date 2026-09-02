import { supabase } from '@/lib/supabase/client'
import {
  Colaborador,
  Posto,
  Escala,
  HoraExtra,
  TrocaPlantao,
  ValeTransporte,
  UniformeEPI,
  DocumentoItem,
  HoraExtraConfig,
  Feriado,
  FormularioPublico,
  AlteracaoHistorico,
  UserProfile,
} from '@/types/gestao'

// Colaboradores Service
export const colaboradoresService = {
  async list(
    empresaId?: string | 'consolidado',
    options?: { postoId?: string; status?: string; search?: string },
  ) {
    let query = supabase
      .from('colaboradores')
      .select(
        '*, empresa:empresas(*), posto:postos(*), escala:escalas(*), colaboradores_postos(id, posto_id, posto:postos(*))',
      )
      .order('nome', { ascending: true })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (options?.status && options.status !== 'todos') {
      query = query.eq('status', options.status)
    }
    if (options?.search) {
      query = query.or(
        `nome.ilike.%${options.search}%,cpf.ilike.%${options.search}%,cargo.ilike.%${options.search}%,codigo_rh.ilike.%${options.search}%`,
      )
    }

    const { data, error } = await query
    if (error) throw error

    let colabs = ((data as any[]) || []).map((c) => {
      const vinculados: Posto[] = (c.colaboradores_postos || [])
        .map((cp: any) => cp.posto)
        .filter(Boolean)

      // Se não há postos na junção mas tem c.posto, adiciona para compatibilidade
      if (vinculados.length === 0 && c.posto) {
        vinculados.push(c.posto)
      }

      return {
        ...c,
        postos_vinculados: vinculados,
      } as Colaborador
    })

    if (options?.postoId && options.postoId !== 'todos') {
      const pid = options.postoId
      colabs = colabs.filter(
        (c) =>
          c.posto_id === pid ||
          (c.postos_vinculados && c.postos_vinculados.some((p) => p.id === pid)),
      )
    }

    return colabs
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('colaboradores')
      .select(
        '*, empresa:empresas(*), posto:postos(*), escala:escalas(*), colaboradores_postos(id, posto_id, posto:postos(*))',
      )
      .eq('id', id)
      .single()
    if (error) throw error

    const c = data as any
    const vinculados: Posto[] = (c.colaboradores_postos || [])
      .map((cp: any) => cp.posto)
      .filter(Boolean)

    if (vinculados.length === 0 && c.posto) {
      vinculados.push(c.posto)
    }

    return {
      ...c,
      postos_vinculados: vinculados,
    } as Colaborador
  },

  async create(payload: Partial<Colaborador> & { postos_ids?: string[] }) {
    const cleanPayload = { ...payload }
    const postosIds = cleanPayload.postos_ids
    delete cleanPayload.postos_ids
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).posto
    delete (cleanPayload as any).postos_vinculados
    delete (cleanPayload as any).colaboradores_postos
    delete (cleanPayload as any).escala

    // Se postosIds foi enviado, garante que posto_id principal seja o primeiro ou o existente
    if (postosIds && postosIds.length > 0 && !cleanPayload.posto_id) {
      cleanPayload.posto_id = postosIds[0]
    }

    const { data, error } = await supabase
      .from('colaboradores')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error

    // Sincroniza vínculos na tabela de junção
    const finalPostoIds = postosIds !== undefined ? postosIds : data.posto_id ? [data.posto_id] : []
    if (finalPostoIds.length > 0) {
      const rows = finalPostoIds.map((pid) => ({
        colaborador_id: data.id,
        posto_id: pid,
      }))
      await supabase
        .from('colaboradores_postos')
        .upsert(rows, { onConflict: 'colaborador_id,posto_id' })
    }

    return data as Colaborador
  },

  async update(
    id: string,
    payload: Partial<Colaborador> & { postos_ids?: string[] },
    auditInfo?: {
      previous: Partial<Colaborador>
      userId?: string
      userName?: string
      motivo?: string
    },
  ) {
    const cleanPayload = { ...payload }
    const postosIds = cleanPayload.postos_ids
    delete cleanPayload.postos_ids
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).posto
    delete (cleanPayload as any).postos_vinculados
    delete (cleanPayload as any).colaboradores_postos
    delete (cleanPayload as any).escala

    if (postosIds !== undefined) {
      if (postosIds.length > 0) {
        // Se o posto_id atual não está entre os selecionados, define o primeiro como principal
        if (!cleanPayload.posto_id || !postosIds.includes(cleanPayload.posto_id)) {
          cleanPayload.posto_id = postosIds[0]
        }
      } else {
        cleanPayload.posto_id = null
      }
    }

    const { data, error } = await supabase
      .from('colaboradores')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Sincroniza postos_ids se fornecido
    if (postosIds !== undefined) {
      // 1. Remove os que não estão mais na lista
      if (postosIds.length === 0) {
        await supabase.from('colaboradores_postos').delete().eq('colaborador_id', id)
      } else {
        await supabase
          .from('colaboradores_postos')
          .delete()
          .eq('colaborador_id', id)
          .not('posto_id', 'in', `(${postosIds.join(',')})`)

        // 2. Insere os novos
        const rows = postosIds.map((pid) => ({
          colaborador_id: id,
          posto_id: pid,
        }))
        await supabase
          .from('colaboradores_postos')
          .upsert(rows, { onConflict: 'colaborador_id,posto_id' })
      }
    }

    // Record audit history if changes are provided
    if (auditInfo && auditInfo.previous) {
      const keyFields: (keyof Colaborador)[] = [
        'nome',
        'cpf',
        'cargo',
        'posto_id',
        'status',
        'escala_id',
        'valor_hora_base',
        'numero_cartao_vt',
        'tipo_transporte',
        'valor_diario_vt',
        'exige_vigilancia',
        'cnv_numero',
        'cnv_validade',
        'reciclagem',
        'data_ultima_reciclagem',
        'codigo_rh',
        'carga_horaria_mensal',
        'situacao_rh',
      ]
      for (const field of keyFields) {
        const prevVal = String(auditInfo.previous[field] ?? '')
        const newVal = String(payload[field] ?? '')
        if (payload[field] !== undefined && prevVal !== newVal) {
          await historicoService.log({
            empresa_id: data.empresa_id,
            tabela: 'colaboradores',
            registro_id: id,
            campo: String(field),
            valor_anterior: prevVal,
            valor_novo: newVal,
            motivo: auditInfo.motivo || 'Atualização cadastral',
            usuario_id: auditInfo.userId,
            usuario_nome: auditInfo.userName || 'Administrador',
          })
        }
      }
    }

    return data as Colaborador
  },

  async uploadPhoto(file: File, colaboradorId: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const filePath = `fotos/${colaboradorId}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('colaboradores')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('colaboradores').getPublicUrl(filePath)

    return data.publicUrl
  },
}

// Postos Service
export const postosService = {
  async list(empresaId?: string | 'consolidado') {
    let query = supabase
      .from('postos')
      .select('*, empresa:empresas(*)')
      .order('nome', { ascending: true })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    const { data, error } = await query
    if (error) throw error
    return (data as Posto[]) || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('postos')
      .select('*, empresa:empresas(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Posto
  },

  async create(payload: Partial<Posto>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any)._count_colaboradores

    const { data, error } = await supabase
      .from('postos')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as Posto
  },

  async update(
    id: string,
    payload: Partial<Posto>,
    auditInfo?: { previous?: Partial<Posto>; userId?: string; userName?: string },
  ) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any)._count_colaboradores

    const { data, error } = await supabase
      .from('postos')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    if (auditInfo?.previous) {
      for (const field of [
        'nome',
        'cliente',
        'endereco',
        'responsavel',
        'ativo',
      ] as (keyof Posto)[]) {
        const prev = String(auditInfo.previous[field] ?? '')
        const current = String(payload[field] ?? '')
        if (payload[field] !== undefined && prev !== current) {
          await historicoService.log({
            empresa_id: data.empresa_id,
            tabela: 'postos',
            registro_id: id,
            campo: String(field),
            valor_anterior: prev,
            valor_novo: current,
            usuario_id: auditInfo.userId,
            usuario_nome: auditInfo.userName,
          })
        }
      }
    }
    return data as Posto
  },
}

// Escalas Service
export const escalasService = {
  async list(empresaId?: string | 'consolidado') {
    let query = supabase
      .from('escalas')
      .select('*, empresa:empresas(*), posto:postos(*)')
      .order('nome', { ascending: true })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as Escala[]) || []
  },

  async create(payload: Partial<Escala>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('escalas')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as Escala
  },

  async update(
    id: string,
    payload: Partial<Escala>,
    auditInfo?: {
      previous: Partial<Escala>
      userId?: string
      userName?: string
      motivo?: string
    },
  ) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('escalas')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Registro no histórico de auditoria se houver alteração
    if (auditInfo && auditInfo.previous) {
      const keyFields: (keyof Escala)[] = [
        'nome',
        'tipo',
        'par_impar',
        'periodo',
        'hora_entrada',
        'hora_saida',
        'observacoes',
      ]
      for (const field of keyFields) {
        const prevVal = String(auditInfo.previous[field] ?? '')
        const newVal = String(payload[field] ?? '')
        if (payload[field] !== undefined && prevVal !== newVal) {
          await historicoService.log({
            empresa_id: data.empresa_id,
            tabela: 'escalas',
            registro_id: id,
            campo: String(field),
            valor_anterior: prevVal,
            valor_novo: newVal,
            motivo: auditInfo.motivo || 'Alteração de escala / paridade base',
            usuario_id: auditInfo.userId,
            usuario_nome: auditInfo.userName || 'Administrador',
          })
        }
      }
    }

    return data as Escala
  },
}

// Horas Extras Service
export const horasExtrasService = {
  async list(
    empresaId?: string | 'consolidado',
    filters?: {
      postoId?: string
      colaboradorId?: string
      dataInicio?: string
      dataFim?: string
      status?: string
    },
  ) {
    let query = supabase
      .from('horas_extras')
      .select('*, colaborador:colaboradores(*), posto:postos(*), empresa:empresas(*)')
      .order('data', { ascending: false })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (filters?.postoId && filters.postoId !== 'todos') {
      query = query.eq('posto_id', filters.postoId)
    }
    if (filters?.colaboradorId && filters.colaboradorId !== 'todos') {
      query = query.eq('colaborador_id', filters.colaboradorId)
    }
    if (filters?.status && filters.status !== 'todos') {
      query = query.eq('status', filters.status)
    }
    if (filters?.dataInicio) {
      query = query.gte('data', filters.dataInicio)
    }
    if (filters?.dataFim) {
      query = query.lte('data', filters.dataFim)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as HoraExtra[]) || []
  },

  async create(payload: Partial<HoraExtra>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('horas_extras')
      .insert(cleanPayload as any)
      .select('*, colaborador:colaboradores(*), posto:postos(*), empresa:empresas(*)')
      .single()
    if (error) throw error
    return data as HoraExtra
  },

  async update(
    id: string,
    payload: Partial<HoraExtra>,
    auditInfo?: {
      previous?: Partial<HoraExtra>
      userId?: string
      userName?: string
      motivo?: string
    },
  ) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('horas_extras')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select('*, colaborador:colaboradores(*), posto:postos(*), empresa:empresas(*)')
      .single()
    if (error) throw error

    if (auditInfo?.previous && auditInfo.motivo) {
      const keys: (keyof HoraExtra)[] = [
        'quantidade_horas',
        'percentual',
        'valor_hora',
        'valor_calculado',
        'status',
      ]
      for (const k of keys) {
        const prev = String(auditInfo.previous[k] ?? '')
        const current = String(payload[k] ?? '')
        if (payload[k] !== undefined && prev !== current) {
          await historicoService.log({
            empresa_id: data.empresa_id,
            tabela: 'horas_extras',
            registro_id: id,
            campo: String(k),
            valor_anterior: prev,
            valor_novo: current,
            motivo: auditInfo.motivo,
            usuario_id: auditInfo.userId,
            usuario_nome: auditInfo.userName,
          })
        }
      }
    }

    return data as HoraExtra
  },

  async batchDecide(
    items: HoraExtra[],
    decision: {
      status: 'Aprovado' | 'Recusado'
      motivo_recusa?: string
      userId?: string
      userName?: string
    },
  ) {
    const results: HoraExtra[] = []
    const nowIso = new Date().toISOString()

    for (const item of items) {
      const updated = await this.update(
        item.id,
        {
          status: decision.status,
          motivo_recusa: decision.status === 'Recusado' ? decision.motivo_recusa : null,
          aprovado_por: decision.userId,
          aprovado_em: nowIso,
        },
        {
          previous: item,
          userId: decision.userId,
          userName: decision.userName,
          motivo: `Aprovação/Decisão em lote para ${decision.status}: ${decision.motivo_recusa || 'Ação em lote'}`,
        },
      )
      results.push(updated)
    }

    return results
  },

  async delete(id: string) {
    const { error } = await supabase.from('horas_extras').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// Hora Extra Configs & Feriados
export const horaExtraConfigsService = {
  async getConfigs(empresaId: string) {
    const { data, error } = await supabase
      .from('hora_extra_configs')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
    if (error) throw error
    return (data as HoraExtraConfig[]) || []
  },

  async listAllConfigs() {
    const { data, error } = await supabase
      .from('hora_extra_configs')
      .select('*, empresa:empresas(*)')
      .order('empresa_id')
    if (error) throw error
    return (data as (HoraExtraConfig & { empresa: any })[]) || []
  },

  async saveConfig(payload: Partial<HoraExtraConfig>) {
    if (payload.id) {
      const { data, error } = await supabase
        .from('hora_extra_configs')
        .update({
          nome: payload.nome,
          percentual: payload.percentual,
          tipo_dia: payload.tipo_dia,
          ativo: payload.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error
      return data as HoraExtraConfig
    } else {
      const cleanPayload = { ...payload }
      delete (cleanPayload as any).empresa

      const { data, error } = await supabase
        .from('hora_extra_configs')
        .insert(cleanPayload as any)
        .select()
        .single()
      if (error) throw error
      return data as HoraExtraConfig
    }
  },

  async listFeriados() {
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .order('data', { ascending: true })
    if (error) throw error
    return (data as Feriado[]) || []
  },

  async saveFeriado(payload: Partial<Feriado>) {
    const { data, error } = await supabase
      .from('feriados')
      .insert(payload as any)
      .select()
      .single()
    if (error) throw error
    return data as Feriado
  },

  async deleteFeriado(id: string) {
    const { error } = await supabase.from('feriados').delete().eq('id', id)
    if (error) throw error
    return true
  },

  /**
   * Helper to detect day type given a date string YYYY-MM-DD and feriados list
   */
  detectDayType(
    dateStr: string,
    feriados: Feriado[],
  ): { tipo: 'normal' | 'domingo' | 'feriado'; descricao: string } {
    if (!dateStr) return { tipo: 'normal', descricao: 'Dia normal' }
    const matchingFeriado = feriados.find((f) => f.data === dateStr)
    if (matchingFeriado) {
      return { tipo: 'feriado', descricao: `Feriado: ${matchingFeriado.descricao}` }
    }

    // Check if Sunday (use local date components to avoid timezone shift)
    const [year, month, day] = dateStr.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    if (dateObj.getDay() === 0) {
      return { tipo: 'domingo', descricao: 'Domingo' }
    }

    return { tipo: 'normal', descricao: 'Dia normal' }
  },
}

// Troca de Plantão Service
export const trocasService = {
  async list(empresaId?: string | 'consolidado', filters?: { status?: string; postoId?: string }) {
    let query = supabase
      .from('trocas_plantao')
      .select(
        '*, solicitante:colaboradores!trocas_plantao_solicitante_id_fkey(*), substituto:colaboradores!trocas_plantao_substituto_id_fkey(*), posto:postos(*), empresa:empresas(*)',
      )
      .order('created_at', { ascending: false })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (filters?.status && filters.status !== 'todas') {
      query = query.eq('status', filters.status)
    }
    if (filters?.postoId && filters.postoId !== 'todos') {
      query = query.eq('posto_id', filters.postoId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as TrocaPlantao[]) || []
  },

  async create(payload: Partial<TrocaPlantao>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).solicitante
    delete (cleanPayload as any).substituto
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('trocas_plantao')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as TrocaPlantao
  },

  async decide(
    id: string,
    decision: {
      status: 'Autorizada' | 'Recusada'
      motivo_recusa?: string
      decidido_por: string
      decidido_por_nome: string
    },
  ) {
    const { data, error } = await supabase
      .from('trocas_plantao')
      .update({
        status: decision.status,
        motivo_recusa: decision.motivo_recusa || null,
        decidido_por: decision.decidido_por,
        decidido_por_nome: decision.decidido_por_nome,
        decidido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as TrocaPlantao
  },

  async batchDecide(
    ids: string[],
    decision: {
      status: 'Autorizada' | 'Recusada'
      motivo_recusa?: string
      decidido_por: string
      decidido_por_nome: string
    },
  ) {
    const results: TrocaPlantao[] = []
    for (const id of ids) {
      const res = await this.decide(id, decision)
      results.push(res)
    }
    return results
  },
}

// Vale Transporte Service
export const valeTransporteService = {
  async list(
    empresaId?: string | 'consolidado',
    options?: {
      competencia?: string
      colaboradorId?: string
    },
  ) {
    let query = supabase
      .from('vale_transporte')
      .select('*, colaborador:colaboradores(*), empresa:empresas(*)')
      .order('competencia', { ascending: false })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (options?.competencia) {
      query = query.eq('competencia', options.competencia)
    }
    if (options?.colaboradorId && options.colaboradorId !== 'todos') {
      query = query.eq('colaborador_id', options.colaboradorId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as ValeTransporte[]) || []
  },

  async save(
    payload: Partial<ValeTransporte>,
    auditInfo?: {
      previous?: Partial<ValeTransporte>
      userId?: string
      userName?: string
      motivo?: string
    },
  ) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador

    if (payload.id) {
      const { data, error } = await supabase
        .from('vale_transporte')
        .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
        .eq('id', payload.id)
        .select()
        .single()
      if (error) throw error

      if (auditInfo?.motivo) {
        await historicoService.log({
          empresa_id: data.empresa_id,
          tabela: 'vale_transporte',
          registro_id: data.id,
          campo: 'valor_depositado / previsto',
          valor_anterior: String(auditInfo.previous?.valor_depositado ?? 0),
          valor_novo: String(payload.valor_depositado ?? 0),
          motivo: auditInfo.motivo,
          usuario_id: auditInfo.userId,
          usuario_nome: auditInfo.userName,
        })
      }
      return data as ValeTransporte
    } else {
      const { data, error } = await supabase
        .from('vale_transporte')
        .insert(cleanPayload as any)
        .select()
        .single()
      if (error) throw error
      return data as ValeTransporte
    }
  },
}

// Uniformes e EPIs Service
export const uniformesService = {
  async list(empresaId?: string | 'consolidado', colaboradorId?: string) {
    let query = supabase
      .from('uniformes_epis')
      .select('*, colaborador:colaboradores(*), empresa:empresas(*)')
      .order('data_movimentacao', { ascending: false })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (colaboradorId) {
      query = query.eq('colaborador_id', colaboradorId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as UniformeEPI[]) || []
  },

  async create(payload: Partial<UniformeEPI>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador

    const { data, error } = await supabase
      .from('uniformes_epis')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as UniformeEPI
  },

  async update(id: string, payload: Partial<UniformeEPI>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador

    const { data, error } = await supabase
      .from('uniformes_epis')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as UniformeEPI
  },
}

// Documentos Service
export const documentosService = {
  async list(empresaId?: string | 'consolidado', colaboradorId?: string) {
    let query = supabase
      .from('documentos')
      .select('*, colaborador:colaboradores(*), posto:postos(*), empresa:empresas(*)')
      .order('data_vencimento', { ascending: true })

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    if (colaboradorId) {
      query = query.eq('colaborador_id', colaboradorId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data as DocumentoItem[]) || []
  },

  async create(payload: Partial<DocumentoItem>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('documentos')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as DocumentoItem
  },

  async update(id: string, payload: Partial<DocumentoItem>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa
    delete (cleanPayload as any).colaborador
    delete (cleanPayload as any).posto

    const { data, error } = await supabase
      .from('documentos')
      .update({ ...cleanPayload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DocumentoItem
  },
}

// Formulários Públicos Service
export const formulariosService = {
  async list(empresaId?: string | 'consolidado') {
    let query = supabase
      .from('formularios_publicos')
      .select('*, empresa:empresas(*)')
      .order('titulo')

    if (empresaId && empresaId !== 'consolidado') {
      query = query.eq('empresa_id', empresaId)
    }
    const { data, error } = await query
    if (error) throw error
    return (data as FormularioPublico[]) || []
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('formularios_publicos')
      .select('*, empresa:empresas(*)')
      .eq('slug', slug)
      .single()
    if (error) throw error
    return data as FormularioPublico
  },

  async create(payload: Partial<FormularioPublico>) {
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).empresa

    const { data, error } = await supabase
      .from('formularios_publicos')
      .insert(cleanPayload as any)
      .select()
      .single()
    if (error) throw error
    return data as FormularioPublico
  },

  async toggleActive(id: string, ativo: boolean) {
    const { data, error } = await supabase
      .from('formularios_publicos')
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FormularioPublico
  },
}

// Histórico de Alterações Audit
export const historicoService = {
  async log(entry: {
    empresa_id?: string | null
    tabela: string
    registro_id: string
    campo: string
    valor_anterior?: string | null
    valor_novo?: string | null
    motivo?: string | null
    usuario_id?: string | null
    usuario_nome?: string | null
  }) {
    const { data, error } = await supabase
      .from('alteracoes_historico')
      .insert(entry)
      .select()
      .single()
    if (error) {
      console.warn('Falha ao gravar histórico audit:', error)
      return null
    }
    return data as AlteracaoHistorico
  },

  async listByRecord(tabela: string, registroId: string) {
    const { data, error } = await supabase
      .from('alteracoes_historico')
      .select('*')
      .eq('tabela', tabela)
      .eq('registro_id', registroId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as AlteracaoHistorico[]) || []
  },
}

// Perfis / Usuários Service
export const profilesService = {
  async list() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, empresa:empresas(*)')
      .order('nome', { ascending: true })
    if (error) throw error
    return (data as (UserProfile & { empresa?: any })[]) || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, empresa:empresas(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as UserProfile & { empresa?: any }
  },

  async update(
    id: string,
    payload: Partial<UserProfile>,
    auditInfo?: {
      previous?: Partial<UserProfile>
      userId?: string
      userName?: string
      motivo?: string
    },
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nome: payload.nome,
        role: payload.role,
        empresa_id: payload.empresa_id !== undefined ? payload.empresa_id : undefined,
        permite_consolidado: payload.permite_consolidado,
        telefone: payload.telefone,
        ativo: payload.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, empresa:empresas(*)')
      .single()
    if (error) throw error

    if (auditInfo?.previous) {
      const keys: (keyof UserProfile)[] = [
        'nome',
        'role',
        'empresa_id',
        'ativo',
        'permite_consolidado',
      ]
      for (const k of keys) {
        const prev = String(auditInfo.previous[k] ?? '')
        const curr = String(payload[k] ?? '')
        if (payload[k] !== undefined && prev !== curr) {
          await historicoService.log({
            empresa_id: data.empresa_id || null,
            tabela: 'profiles',
            registro_id: id,
            campo: String(k),
            valor_anterior: prev,
            valor_novo: curr,
            motivo: auditInfo.motivo || 'Alteração de perfil/permissão de usuário',
            usuario_id: auditInfo.userId,
            usuario_nome: auditInfo.userName,
          })
        }
      }
    }

    return data as UserProfile & { empresa?: any }
  },
}
