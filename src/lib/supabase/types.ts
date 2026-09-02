// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      alteracoes_historico: {
        Row: {
          campo: string
          created_at: string
          empresa_id: string | null
          id: string
          motivo: string | null
          registro_id: string
          tabela: string
          usuario_id: string | null
          usuario_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          registro_id: string
          tabela: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'alteracoes_historico_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      colaboradores_postos: {
        Row: {
          id: string
          colaborador_id: string
          posto_id: string
          created_at: string
        }
        Insert: {
          id?: string
          colaborador_id: string
          posto_id: string
          created_at?: string
        }
        Update: {
          id?: string
          colaborador_id?: string
          posto_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'colaboradores_postos_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_postos_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
        ]
      }
      colaboradores: {
        Row: {
          carga_horaria_mensal: number | null
          cargo: string
          cnv_numero: string | null
          cnv_validade: string | null
          codigo_rh: string | null
          cpf: string
          created_at: string
          curso_formacao: boolean | null
          data_admissao: string
          data_nascimento: string | null
          data_ultima_reciclagem: string | null
          email: string | null
          empresa_id: string
          escala_id: string | null
          exige_vigilancia: boolean
          foto_url: string | null
          horario: string | null
          id: string
          motivo_inativacao: string | null
          nome: string
          numero_calcado: string | null
          numero_cartao_vt: string | null
          observacoes: string | null
          posto_id: string | null
          proximo_vencimento_reciclagem: string | null
          reciclagem: boolean | null
          situacao_rh: string | null
          status: string
          tamanho_calca: string | null
          tamanho_camisa: string | null
          telefone: string | null
          tipo_transporte: string | null
          turno: string
          updated_at: string
          valor_diario_vt: number | null
          valor_hora_base: number
        }
        Insert: {
          carga_horaria_mensal?: number | null
          cargo: string
          cnv_numero?: string | null
          cnv_validade?: string | null
          codigo_rh?: string | null
          cpf: string
          created_at?: string
          curso_formacao?: boolean | null
          data_admissao?: string
          data_nascimento?: string | null
          data_ultima_reciclagem?: string | null
          email?: string | null
          empresa_id: string
          escala_id?: string | null
          exige_vigilancia?: boolean
          foto_url?: string | null
          horario?: string | null
          id?: string
          motivo_inativacao?: string | null
          nome: string
          numero_calcado?: string | null
          numero_cartao_vt?: string | null
          observacoes?: string | null
          posto_id?: string | null
          proximo_vencimento_reciclagem?: string | null
          reciclagem?: boolean | null
          situacao_rh?: string | null
          status?: string
          tamanho_calca?: string | null
          tamanho_camisa?: string | null
          telefone?: string | null
          tipo_transporte?: string | null
          turno?: string
          updated_at?: string
          valor_diario_vt?: number | null
          valor_hora_base?: number
        }
        Update: {
          carga_horaria_mensal?: number | null
          cargo?: string
          cnv_numero?: string | null
          cnv_validade?: string | null
          codigo_rh?: string | null
          cpf?: string
          created_at?: string
          curso_formacao?: boolean | null
          data_admissao?: string
          data_nascimento?: string | null
          data_ultima_reciclagem?: string | null
          email?: string | null
          empresa_id?: string
          escala_id?: string | null
          exige_vigilancia?: boolean
          foto_url?: string | null
          horario?: string | null
          id?: string
          motivo_inativacao?: string | null
          nome?: string
          numero_calcado?: string | null
          numero_cartao_vt?: string | null
          observacoes?: string | null
          posto_id?: string | null
          proximo_vencimento_reciclagem?: string | null
          reciclagem?: boolean | null
          situacao_rh?: string | null
          status?: string
          tamanho_calca?: string | null
          tamanho_camisa?: string | null
          telefone?: string | null
          tipo_transporte?: string | null
          turno?: string
          updated_at?: string
          valor_diario_vt?: number | null
          valor_hora_base?: number
        }
        Relationships: [
          {
            foreignKeyName: 'colaboradores_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_escala_id_fkey'
            columns: ['escala_id']
            isOneToOne: false
            referencedRelation: 'escalas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_url: string | null
          colaborador_id: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          empresa_id: string
          id: string
          numero: string | null
          observacoes: string | null
          posto_id: string | null
          status: string
          tipo_documento: string
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          empresa_id: string
          id?: string
          numero?: string | null
          observacoes?: string | null
          posto_id?: string | null
          status?: string
          tipo_documento: string
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          colaborador_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          empresa_id?: string
          id?: string
          numero?: string | null
          observacoes?: string | null
          posto_id?: string | null
          status?: string
          tipo_documento?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          exige_vigilancia: boolean
          id: string
          nome: string
          slug: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          exige_vigilancia?: boolean
          id?: string
          nome: string
          slug: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          exige_vigilancia?: boolean
          id?: string
          nome?: string
          slug?: string
          tipo?: string
        }
        Relationships: []
      }
      escalas: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          hora_entrada: string
          hora_saida: string
          id: string
          nome: string
          observacoes: string | null
          par_impar: string | null
          periodo: string
          posto_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          hora_entrada?: string
          hora_saida?: string
          id?: string
          nome: string
          observacoes?: string | null
          par_impar?: string | null
          periodo?: string
          posto_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          hora_entrada?: string
          hora_saida?: string
          id?: string
          nome?: string
          observacoes?: string | null
          par_impar?: string | null
          periodo?: string
          posto_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'escalas_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'escalas_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
        ]
      }
      feriados: {
        Row: {
          created_at: string
          data: string
          descricao: string
          empresa_id: string | null
          id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          empresa_id?: string | null
          id?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          empresa_id?: string | null
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feriados_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      formularios_publicos: {
        Row: {
          ativo: boolean
          campos_extras: Json | null
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          slug: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campos_extras?: Json | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          slug: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campos_extras?: Json | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          slug?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'formularios_publicos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      hora_extra_configs: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          percentual: number
          tipo_dia: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          percentual?: number
          tipo_dia: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          percentual?: number
          tipo_dia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'hora_extra_configs_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      horas_extras: {
        Row: {
          ajuste_manual: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          colaborador_id: string
          created_at: string
          data: string
          empresa_id: string
          entrada: string
          id: string
          memoria_calculo: string | null
          motivo_ajuste: string | null
          motivo_recusa: string | null
          observacao: string | null
          origem: string
          percentual: number
          posto_id: string | null
          quantidade_horas: number
          saida: string
          status: string
          tipo_dia: string
          updated_at: string
          valor_calculado: number
          valor_hora: number
        }
        Insert: {
          ajuste_manual?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id: string
          created_at?: string
          data: string
          empresa_id: string
          entrada: string
          id?: string
          memoria_calculo?: string | null
          motivo_ajuste?: string | null
          motivo_recusa?: string | null
          observacao?: string | null
          origem?: string
          percentual?: number
          posto_id?: string | null
          quantidade_horas: number
          saida: string
          status?: string
          tipo_dia?: string
          updated_at?: string
          valor_calculado?: number
          valor_hora?: number
        }
        Update: {
          ajuste_manual?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id?: string
          created_at?: string
          data?: string
          empresa_id?: string
          entrada?: string
          id?: string
          memoria_calculo?: string | null
          motivo_ajuste?: string | null
          motivo_recusa?: string | null
          observacao?: string | null
          origem?: string
          percentual?: number
          posto_id?: string | null
          quantidade_horas?: number
          saida?: string
          status?: string
          tipo_dia?: string
          updated_at?: string
          valor_calculado?: number
          valor_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: 'horas_extras_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'horas_extras_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'horas_extras_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
        ]
      }
      postos: {
        Row: {
          ativo: boolean
          cliente: string
          created_at: string
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          responsavel: string | null
          telefone_responsavel: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente: string
          created_at?: string
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          responsavel?: string | null
          telefone_responsavel?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente?: string
          created_at?: string
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          responsavel?: string | null
          telefone_responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'postos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
          permite_consolidado: boolean
          role: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nome?: string
          permite_consolidado?: boolean
          role?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          permite_consolidado?: boolean
          role?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      trocas_plantao: {
        Row: {
          created_at: string
          data: string
          decidido_em: string | null
          decidido_por: string | null
          decidido_por_nome: string | null
          empresa_id: string
          horario: string
          id: string
          motivo: string
          motivo_recusa: string | null
          observacao: string | null
          origem: string
          posto_id: string | null
          solicitante_id: string
          status: string
          substituto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          empresa_id: string
          horario: string
          id?: string
          motivo: string
          motivo_recusa?: string | null
          observacao?: string | null
          origem?: string
          posto_id?: string | null
          solicitante_id: string
          status?: string
          substituto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decidido_por_nome?: string | null
          empresa_id?: string
          horario?: string
          id?: string
          motivo?: string
          motivo_recusa?: string | null
          observacao?: string | null
          origem?: string
          posto_id?: string | null
          solicitante_id?: string
          status?: string
          substituto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trocas_plantao_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trocas_plantao_posto_id_fkey'
            columns: ['posto_id']
            isOneToOne: false
            referencedRelation: 'postos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trocas_plantao_solicitante_id_fkey'
            columns: ['solicitante_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trocas_plantao_substituto_id_fkey'
            columns: ['substituto_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
        ]
      }
      uniformes_epis: {
        Row: {
          assinatura_base64: string | null
          assinatura_digital_url: string | null
          colaborador_id: string
          created_at: string
          data_movimentacao: string
          empresa_id: string
          id: string
          item: string
          observacao: string | null
          origem: string
          quantidade: number
          responsavel_entrega: string
          status: string
          tamanho: string | null
          tipo_movimentacao: string
          updated_at: string
        }
        Insert: {
          assinatura_base64?: string | null
          assinatura_digital_url?: string | null
          colaborador_id: string
          created_at?: string
          data_movimentacao?: string
          empresa_id: string
          id?: string
          item: string
          observacao?: string | null
          origem?: string
          quantidade?: number
          responsavel_entrega?: string
          status?: string
          tamanho?: string | null
          tipo_movimentacao?: string
          updated_at?: string
        }
        Update: {
          assinatura_base64?: string | null
          assinatura_digital_url?: string | null
          colaborador_id?: string
          created_at?: string
          data_movimentacao?: string
          empresa_id?: string
          id?: string
          item?: string
          observacao?: string | null
          origem?: string
          quantidade?: number
          responsavel_entrega?: string
          status?: string
          tamanho?: string | null
          tipo_movimentacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'uniformes_epis_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'uniformes_epis_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      vale_transporte: {
        Row: {
          ajuste_manual: boolean
          colaborador_id: string
          competencia: string
          created_at: string
          dias_previstos: number
          dias_trabalhados: number
          diferenca: number
          empresa_id: string
          id: string
          motivo_ajuste: string | null
          numero_cartao: string | null
          observacoes: string | null
          tipo_transporte: string | null
          updated_at: string
          valor_depositado: number
          valor_diario: number
          valor_previsto: number
        }
        Insert: {
          ajuste_manual?: boolean
          colaborador_id: string
          competencia: string
          created_at?: string
          dias_previstos?: number
          dias_trabalhados?: number
          diferenca?: number
          empresa_id: string
          id?: string
          motivo_ajuste?: string | null
          numero_cartao?: string | null
          observacoes?: string | null
          tipo_transporte?: string | null
          updated_at?: string
          valor_depositado?: number
          valor_diario?: number
          valor_previsto?: number
        }
        Update: {
          ajuste_manual?: boolean
          colaborador_id?: string
          competencia?: string
          created_at?: string
          dias_previstos?: number
          dias_trabalhados?: number
          diferenca?: number
          empresa_id?: string
          id?: string
          motivo_ajuste?: string | null
          numero_cartao?: string | null
          observacoes?: string | null
          tipo_transporte?: string | null
          updated_at?: string
          valor_depositado?: number
          valor_diario?: number
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: 'vale_transporte_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vale_transporte_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
