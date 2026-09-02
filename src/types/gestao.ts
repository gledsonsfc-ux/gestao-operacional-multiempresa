export type EmpresaTipo = 'seguranca' | 'servicos'

export interface Empresa {
  id: string
  nome: string
  slug: string
  cnpj?: string | null
  tipo: EmpresaTipo
  exige_vigilancia: boolean
  ativo: boolean
  created_at?: string
}

export type UserRole = 'admin' | 'coordenacao' | 'supervisor' | 'rh' | 'consulta'

export interface UserProfile {
  id: string
  email: string
  nome: string
  role: UserRole
  empresa_id?: string | null
  permite_consolidado: boolean
  telefone?: string | null
  ativo: boolean
  created_at?: string
}

export interface ColaboradorPosto {
  id: string
  colaborador_id: string
  posto_id: string
  created_at?: string
  posto?: Posto
  colaborador?: Colaborador
}

export interface Posto {
  id: string
  empresa_id: string
  cliente: string
  nome: string
  endereco?: string | null
  responsavel?: string | null
  telefone_responsavel?: string | null
  observacoes?: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
  // joined fields
  empresa?: Empresa
  _count_colaboradores?: number
}

export type EscalaTipo = '12x36' | '5x2' | '6x1' | 'Personalizada'
export type ParImparTipo = 'par' | 'impar' | 'nao_se_aplica'

export interface Escala {
  id: string
  empresa_id: string
  nome: string
  tipo: EscalaTipo
  par_impar: ParImparTipo
  periodo: 'Diurno' | 'Noturno' | 'Misto'
  hora_entrada: string
  hora_saida: string
  posto_id?: string | null
  observacoes?: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
  empresa?: Empresa
  posto?: Posto
}

export type ColaboradorStatus = 'Ativo' | 'Inativo' | 'Férias' | 'Afastado'

export interface Colaborador {
  id: string
  empresa_id: string
  nome: string
  cpf: string
  data_nascimento?: string | null
  telefone?: string | null
  email?: string | null
  cargo: string
  posto_id?: string | null
  data_admissao: string
  escala_id?: string | null
  horario?: string | null
  turno: 'Diurno' | 'Noturno'
  status: ColaboradorStatus
  motivo_inativacao?: string | null

  numero_cartao_vt?: string | null
  tipo_transporte?: string | null
  valor_diario_vt?: number | null

  tamanho_camisa?: string | null
  tamanho_calca?: string | null
  numero_calcado?: string | null

  foto_url?: string | null
  valor_hora_base: number

  exige_vigilancia: boolean
  cnv_numero?: string | null
  cnv_validade?: string | null
  curso_formacao: boolean
  reciclagem: boolean
  data_ultima_reciclagem?: string | null
  proximo_vencimento_reciclagem?: string | null

  // Campos RH
  codigo_rh?: string | null
  carga_horaria_mensal?: number | null
  situacao_rh?: string | null

  observacoes?: string | null
  created_at?: string
  updated_at?: string

  // Joins
  empresa?: Empresa
  posto?: Posto
  postos_vinculados?: Posto[]
  colaboradores_postos?: ColaboradorPosto[]
  escala?: Escala
}

export interface AlteracaoHistorico {
  id: string
  empresa_id?: string | null
  tabela: string
  registro_id: string
  campo: string
  valor_anterior?: string | null
  valor_novo?: string | null
  motivo?: string | null
  usuario_id?: string | null
  usuario_nome?: string | null
  created_at: string
}

export interface HoraExtraConfig {
  id: string
  empresa_id: string
  nome: string
  tipo_dia: 'normal' | 'domingo' | 'feriado' | 'adicional_noturno' | 'outro'
  percentual: number
  ativo: boolean
}

export interface Feriado {
  id: string
  empresa_id?: string | null
  data: string
  descricao: string
  tipo: string
}

export type HoraExtraStatus = 'Pendente' | 'Conferido' | 'Aprovado' | 'Recusado'

export interface HoraExtra {
  id: string
  empresa_id: string
  colaborador_id: string
  posto_id?: string | null
  data: string
  entrada: string
  saida: string
  quantidade_horas: number
  tipo_dia: 'normal' | 'domingo' | 'feriado' | 'outro'
  percentual: number
  valor_hora: number
  valor_calculado: number
  memoria_calculo?: string | null
  ajuste_manual: boolean
  motivo_ajuste?: string | null
  status: HoraExtraStatus
  motivo_recusa?: string | null
  aprovado_por?: string | null
  aprovado_em?: string | null
  origem: 'Painel' | 'Formulário Público'
  observacao?: string | null
  created_at?: string
  updated_at?: string

  colaborador?: Colaborador
  posto?: Posto
  empresa?: Empresa
}

export type TrocaPlantaoStatus = 'Pendente' | 'Autorizada' | 'Recusada'

export interface TrocaPlantao {
  id: string
  empresa_id: string
  posto_id?: string | null
  solicitante_id: string
  substituto_id: string
  data: string
  horario: string
  motivo: string
  observacao?: string | null
  status: TrocaPlantaoStatus
  motivo_recusa?: string | null
  decidido_por?: string | null
  decidido_por_nome?: string | null
  decidido_em?: string | null
  origem: 'Painel' | 'Formulário Público'
  created_at?: string
  updated_at?: string

  solicitante?: Colaborador
  substituto?: Colaborador
  posto?: Posto
  empresa?: Empresa
}

export interface FormularioPublico {
  id: string
  empresa_id: string
  tipo: 'hora_extra' | 'troca_plantao' | 'uniforme_epi'
  titulo: string
  slug: string
  descricao?: string | null
  ativo: boolean
  campos_extras?: Record<string, unknown>
  created_at?: string
  empresa?: Empresa
}

export interface ValeTransporte {
  id: string
  empresa_id: string
  colaborador_id: string
  competencia: string
  numero_cartao?: string | null
  tipo_transporte?: string | null
  valor_diario: number
  dias_previstos: number
  dias_trabalhados: number
  valor_previsto: number
  valor_depositado: number
  diferenca: number
  observacoes?: string | null
  ajuste_manual: boolean
  motivo_ajuste?: string | null
  created_at?: string
  updated_at?: string

  colaborador?: Colaborador
  empresa?: Empresa
}

export interface UniformeEPI {
  id: string
  empresa_id: string
  colaborador_id: string
  item: string
  tamanho?: string | null
  quantidade: number
  tipo_movimentacao: 'Entrega' | 'Devolucao' | 'Troca'
  data_movimentacao: string
  responsavel_entrega: string
  observacao?: string | null
  assinatura_digital_url?: string | null
  assinatura_base64?: string | null
  origem: 'Painel' | 'Formulário Público'
  status: 'Pendente' | 'Entregue' | 'Devolvido' | 'Danificado'
  created_at?: string
  updated_at?: string

  colaborador?: Colaborador
  empresa?: Empresa
}

export interface DocumentoItem {
  id: string
  empresa_id: string
  colaborador_id?: string | null
  posto_id?: string | null
  titulo: string
  tipo_documento: string
  numero?: string | null
  data_emissao?: string | null
  data_vencimento?: string | null
  arquivo_url?: string | null
  observacoes?: string | null
  status: 'Valido' | 'Vencendo' | 'Vencido'
  created_at?: string

  colaborador?: Colaborador
  posto?: Posto
  empresa?: Empresa
}
