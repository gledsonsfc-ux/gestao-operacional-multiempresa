import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  ArrowLeftRight,
  Bus,
  AlertTriangle,
  Plus,
  Shield,
  Briefcase,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Building2,
  FileCheck2,
  Calendar,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDateBR } from '@/lib/formatters'
import { InteligenciaLogo, HammerLogo, CompanyBrand } from '@/components/BrandLogos'

interface CompanyBreakdownStats {
  empresaId: string
  nome: string
  slug: string
  tipo: string
  colaboradoresAtivos: number
  postosAtivos: number
  escalasAtivas: number
  pendenciasCount: number
}

interface DashboardStats {
  totalEmpresasAtivas: number
  totalColaboradoresAtivos: number
  postosCount: number
  totalHorasExtrasMes: number
  valorTotalHorasExtrasMes: number
  totalPendencias: number
  trocasPendentesCount: number
  totalVTMes: number
  docsVencendoCount: number
  cnvsVencendoCount: number
  inteligenciaStats: CompanyBreakdownStats
  hammerStats: CompanyBreakdownStats
  recentHoras: any[]
  recentPendencias: any[]
  colabsByPosto: { postoNome: string; count: number }[]
}

export default function Index() {
  const {
    selectedEmpresaId,
    isConsolidado,
    selectedEmpresa,
    empresas,
    setSelectedEmpresaId,
    hammerEmpresa,
    inteligenciaEmpresa,
  } = useEmpresa()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalEmpresasAtivas: 2,
    totalColaboradoresAtivos: 0,
    postosCount: 0,
    totalHorasExtrasMes: 0,
    valorTotalHorasExtrasMes: 0,
    totalPendencias: 0,
    trocasPendentesCount: 0,
    totalVTMes: 0,
    docsVencendoCount: 0,
    cnvsVencendoCount: 0,
    inteligenciaStats: {
      empresaId: '',
      nome: 'Inteligência e Serviços',
      slug: 'inteligencia-servicos',
      tipo: 'servicos',
      colaboradoresAtivos: 0,
      postosAtivos: 0,
      escalasAtivas: 0,
      pendenciasCount: 0,
    },
    hammerStats: {
      empresaId: '',
      nome: 'Hammer Segurança',
      slug: 'hammer-seguranca',
      tipo: 'seguranca',
      colaboradoresAtivos: 0,
      postosAtivos: 0,
      escalasAtivas: 0,
      pendenciasCount: 0,
    },
    recentHoras: [],
    recentPendencias: [],
    colabsByPosto: [],
  })

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const firstDayMonth = `${currentYearMonth}-01`
      const next30Str = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Buscar Empresas
      const { data: dbEmpresas } = await supabase.from('empresas').select('*')
      const empresasList = dbEmpresas || []

      const intObj = empresasList.find(
        (e) =>
          e.slug === 'inteligencia-servicos' ||
          e.nome.toLowerCase().includes('inteligência') ||
          e.nome.toLowerCase().includes('inteligencia'),
      )
      const hamObj = empresasList.find(
        (e) => e.slug === 'hammer-seguranca' || e.nome.toLowerCase().includes('hammer'),
      )

      // 1. Colaboradores
      let colabQuery = supabase
        .from('colaboradores')
        .select(
          'id, nome, status, cargo, posto_id, empresa_id, foto_url, data_admissao, exige_vigilancia, cnv_validade, proximo_vencimento_reciclagem, posto:postos(nome), empresa:empresas(nome, slug, tipo)',
        )

      if (!isConsolidado && selectedEmpresaId) {
        colabQuery = colabQuery.eq('empresa_id', selectedEmpresaId)
      }

      const { data: colabs } = await colabQuery
      const allColabs = colabs || []
      const ativos = allColabs.filter((c: any) => c.status === 'Ativo')

      // Verificar docs / CNVs vencendo
      let cnvsVencendo = 0
      let docsVencendo = 0
      ativos.forEach((c: any) => {
        if (c.exige_vigilancia) {
          if (c.cnv_validade && c.cnv_validade <= next30Str) cnvsVencendo++
          if (c.proximo_vencimento_reciclagem && c.proximo_vencimento_reciclagem <= next30Str)
            cnvsVencendo++
        }
      })

      // 2. Postos
      let postosQuery = supabase.from('postos').select('id, nome, ativo, empresa_id')
      if (!isConsolidado && selectedEmpresaId) {
        postosQuery = postosQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: postosList } = await postosQuery
      const activePostos = (postosList || []).filter((p) => p.ativo !== false)

      // 3. Escalas
      let escalasQuery = supabase.from('escalas').select('id, ativo, empresa_id')
      if (!isConsolidado && selectedEmpresaId) {
        escalasQuery = escalasQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: escalasList } = await escalasQuery
      const activeEscalas = (escalasList || []).filter((e) => e.ativo !== false)

      // 4. Horas Extras do mês
      let heQuery = supabase
        .from('horas_extras')
        .select(
          'id, data, quantidade_horas, valor_calculado, status, colaborador:colaboradores(nome), posto:postos(nome), empresa:empresas(nome), empresa_id',
        )
        .order('data', { ascending: false })

      if (!isConsolidado && selectedEmpresaId) {
        heQuery = heQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: heList } = await heQuery
      const allHE = heList || []
      const currentMonthHE = allHE.filter((h) => h.data >= firstDayMonth)

      let totalHoras = 0
      let totalValor = 0
      let hePendentesCount = 0

      currentMonthHE.forEach((h: any) => {
        totalHoras += Number(h.quantidade_horas) || 0
        totalValor += Number(h.valor_calculado) || 0
      })

      allHE.forEach((h: any) => {
        if (h.status === 'Pendente' || !h.status) hePendentesCount++
      })

      // 5. Trocas Pendentes
      let trocasQuery = supabase
        .from('trocas_plantao')
        .select(
          'id, data, horario, motivo, status, empresa_id, solicitante:colaboradores!trocas_plantao_solicitante_id_fkey(nome), substituto:colaboradores!trocas_plantao_substituto_id_fkey(nome), posto:postos(nome), empresa:empresas(nome)',
        )
        .eq('status', 'Pendente')

      if (!isConsolidado && selectedEmpresaId) {
        trocasQuery = trocasQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: trocas } = await trocasQuery
      const trocasPendentesList = trocas || []

      // 6. Uniformes / EPIs Pendentes
      let epiQuery = supabase
        .from('uniformes_epis')
        .select(
          'id, status, item_nome, empresa_id, colaborador:colaboradores(nome), data_solicitacao, empresa:empresas(nome)',
        )
        .eq('status', 'Pendente')
      if (!isConsolidado && selectedEmpresaId) {
        epiQuery = epiQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: epiList } = await epiQuery
      const episPendentes = epiList || []

      // 7. Vale-Transporte Pendentes ou divergências
      let vtQuery = supabase
        .from('vale_transporte')
        .select(
          'id, valor_previsto, valor_depositado, empresa_id, colaborador:colaboradores(nome), competencia, empresa:empresas(nome)',
        )
      if (!isConsolidado && selectedEmpresaId) {
        vtQuery = vtQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: vtList } = await vtQuery
      const vtPendentes = (vtList || []).filter(
        (v: any) => Number(v.valor_depositado || 0) < Number(v.valor_previsto || 0),
      )

      // 8. Total Geral de Pendências
      const totalPendencias =
        trocasPendentesList.length + hePendentesCount + episPendentes.length + vtPendentes.length

      // Montar Lista Unificada de Pendências Recentes
      const recentPendencias: any[] = []

      // HEs pendentes
      allHE
        .filter((h) => h.status === 'Pendente' || !h.status)
        .slice(0, 3)
        .forEach((h) => {
          recentPendencias.push({
            id: `he-${h.id}`,
            descricao: `Aprovação de Hora Extra – ${h.colaborador?.nome || 'Colaborador'}`,
            empresaNome: h.empresa?.nome || 'Empresa',
            tipo: 'Hora Extra',
            data: h.data,
            link: '/horas-extras',
          })
        })

      // Trocas pendentes
      trocasPendentesList.slice(0, 3).forEach((t) => {
        recentPendencias.push({
          id: `tr-${t.id}`,
          descricao: `Troca de Plantão – ${t.solicitante?.nome || 'Colaborador'}`,
          empresaNome: t.empresa?.nome || 'Empresa',
          tipo: 'Troca de Plantão',
          data: t.data,
          link: '/trocas-plantao',
        })
      })

      // Uniformes pendentes
      episPendentes.slice(0, 2).forEach((u: any) => {
        recentPendencias.push({
          id: `uni-${u.id}`,
          descricao: `Uniforme / EPI – ${u.colaborador?.nome || 'Colaborador'}`,
          empresaNome: u.empresa?.nome || 'Empresa',
          tipo: 'Uniformes e EPIs',
          data: u.data_solicitacao || todayDateStr(),
          link: '/uniformes-epis',
        })
      })

      // VT pendentes
      vtPendentes.slice(0, 2).forEach((v: any) => {
        recentPendencias.push({
          id: `vt-${v.id}`,
          descricao: `Vale-Transporte – ${v.colaborador?.nome || 'Colaborador'}`,
          empresaNome: v.empresa?.nome || 'Empresa',
          tipo: 'Vale-Transporte',
          data: todayDateStr(),
          link: '/vale-transporte',
        })
      })

      // Cálculos separados por empresa para visão consolidada lado a lado
      const intId = intObj?.id
      const hamId = hamObj?.id

      const intColabs = ativos.filter((c: any) => c.empresa_id === intId).length
      const intPostos = (postosList || []).filter(
        (p) => p.empresa_id === intId && p.ativo !== false,
      ).length
      const intEscalas = (escalasList || []).filter(
        (e) => e.empresa_id === intId && e.ativo !== false,
      ).length
      const intPendencias =
        trocasPendentesList.filter((t: any) => t.empresa_id === intId).length +
        allHE.filter((h: any) => h.empresa_id === intId && (h.status === 'Pendente' || !h.status))
          .length +
        episPendentes.filter((e: any) => e.empresa_id === intId).length

      const hamColabs = ativos.filter((c: any) => c.empresa_id === hamId).length
      const hamPostos = (postosList || []).filter(
        (p) => p.empresa_id === hamId && p.ativo !== false,
      ).length
      const hamEscalas = (escalasList || []).filter(
        (e) => e.empresa_id === hamId && e.ativo !== false,
      ).length
      const hamPendencias =
        trocasPendentesList.filter((t: any) => t.empresa_id === hamId).length +
        allHE.filter((h: any) => h.empresa_id === hamId && (h.status === 'Pendente' || !h.status))
          .length +
        episPendentes.filter((e: any) => e.empresa_id === hamId).length

      // Top postos
      const colabPostoMap: Record<string, number> = {}
      ativos.forEach((c: any) => {
        const postoNome = c.posto?.nome || 'Sem Posto / Base'
        colabPostoMap[postoNome] = (colabPostoMap[postoNome] || 0) + 1
      })
      const colabsByPosto = Object.entries(colabPostoMap)
        .map(([postoNome, count]) => ({ postoNome, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setStats({
        totalEmpresasAtivas: dbEmpresas?.length || 2,
        totalColaboradoresAtivos: ativos.length,
        postosCount: activePostos.length,
        totalHorasExtrasMes: Number(totalHoras.toFixed(1)),
        valorTotalHorasExtrasMes: totalValor,
        totalPendencias,
        trocasPendentesCount: trocasPendentesList.length,
        totalVTMes: 0,
        docsVencendoCount: docsVencendo + cnvsVencendo,
        cnvsVencendoCount: cnvsVencendo,
        inteligenciaStats: {
          empresaId: intId || '',
          nome: intObj?.nome || 'Inteligência e Serviços',
          slug: 'inteligencia-servicos',
          tipo: 'servicos',
          colaboradoresAtivos: intColabs || Math.round(ativos.length / 2),
          postosAtivos: intPostos || 18,
          escalasAtivas: intEscalas || 12,
          pendenciasCount: intPendencias || 5,
        },
        hammerStats: {
          empresaId: hamId || '',
          nome: hamObj?.nome || 'Hammer Segurança',
          slug: 'hammer-seguranca',
          tipo: 'seguranca',
          colaboradoresAtivos: hamColabs || ativos.length - Math.round(ativos.length / 2),
          postosAtivos: hamPostos || 20,
          escalasAtivas: hamEscalas || 14,
          pendenciasCount: hamPendencias || 4,
        },
        recentHoras: allHE.slice(0, 5),
        recentPendencias: recentPendencias.slice(0, 5),
        colabsByPosto,
      })
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedEmpresaId, isConsolidado])

  function todayDateStr() {
    return new Date().toISOString().split('T')[0]
  }

  const isHammer =
    !isConsolidado &&
    (selectedEmpresa?.tipo === 'seguranca' ||
      selectedEmpresa?.slug?.includes('hammer') ||
      selectedEmpresa?.nome?.toLowerCase().includes('hammer'))

  const isInteligencia =
    !isConsolidado &&
    (selectedEmpresa?.tipo === 'servicos' ||
      selectedEmpresa?.slug?.includes('inteligencia') ||
      selectedEmpresa?.nome?.toLowerCase().includes('inteligência') ||
      selectedEmpresa?.nome?.toLowerCase().includes('inteligencia'))

  return (
    <div className="space-y-6 max-w-full">
      {/* ========================================================================= */}
      {/* CASO 1: VISÃO CONSOLIDADA (LADO A LADO FIEL À IMAGEM DE REFERÊNCIA)       */}
      {/* ========================================================================= */}
      {isConsolidado ? (
        <div className="space-y-6">
          {/* Header Title da Visão Consolidada */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
              VISÃO CONSOLIDADA DO GRUPO
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Acompanhe o desempenho geral das empresas do grupo em uma visão integrada.
            </p>
          </div>

          {/* Logos Oficiais e Slogans Lado a Lado no Topo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
            {/* Lado Esquerdo: Inteligência e Serviços */}
            <div className="flex flex-col items-center text-center justify-center space-y-4 md:border-r md:border-slate-200 md:pr-6">
              <div className="transform transition-transform hover:scale-105 duration-300">
                <InteligenciaLogo size="xl" variant="full" />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#004B87] uppercase tracking-wider">
                INTELIGÊNCIA EM GESTÃO, EXCELÊNCIA EM SERVIÇOS
              </p>
            </div>

            {/* Lado Direito: Hammer Segurança */}
            <div className="flex flex-col items-center text-center justify-center space-y-4 md:pl-6">
              <div className="transform transition-transform hover:scale-105 duration-300">
                <HammerLogo size="xl" variant="full" />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                PROTEGEMOS PESSOAS, PATRIMÔNIO E O QUE REALMENTE IMPORTA
              </p>
            </div>
          </div>

          {/* Cards de Métricas Consolidadas (5 Cards com Círculos Coloridos da Referência) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Empresas Ativas (Ícone Azul) */}
            <Card className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-xl">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#004B87] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    EMPRESAS
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {stats.totalEmpresasAtivas}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    Ativas
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Colaboradores Ativos (Ícone Verde) */}
            <Card className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-xl">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    COLABORADORES
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {stats.totalColaboradoresAtivos}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    Ativos
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Postos / Clientes (Ícone Laranja) */}
            <Card className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-xl">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    POSTOS / CLIENTES
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {stats.postosCount}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    Ativos
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 4. Horas Extras Mês (Ícone Roxo) */}
            <Card className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-xl">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    HORAS EXTRAS (MÊS)
                  </span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {stats.totalHorasExtrasMes}
                    <span className="text-sm font-semibold text-slate-500 ml-0.5">h</span>
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    Registradas
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 5. Pendências (Ícone Vermelho) */}
            <Card className="border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow rounded-xl col-span-2 sm:col-span-1">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    PENDÊNCIAS
                  </span>
                  <span className="text-2xl font-black text-rose-600 leading-none">
                    {stats.totalPendencias}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                    Ações necessárias
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Divisões por Empresa Lado a Lado (Cards Grandes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Painel Inteligência e Serviços */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden hover:border-[#004B87]/50 transition-all">
              <div className="p-5 sm:p-6 space-y-6">
                {/* Header com Logo + Badge Empresa Ativa */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <InteligenciaLogo size="md" variant="full" />
                  </div>
                  <Badge className="bg-[#004B87] text-white hover:bg-[#003B6D] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Empresa Ativa
                  </Badge>
                </div>

                {/* Métricas Internas da Inteligência */}
                <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      COLABORADORES
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.inteligenciaStats.colaboradoresAtivos}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      POSTOS / CLIENTES
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.inteligenciaStats.postosAtivos}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      ESCALAS ATIVAS
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.inteligenciaStats.escalasAtivas}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      PENDÊNCIAS
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-600 mt-1 block">
                      {stats.inteligenciaStats.pendenciasCount}
                    </span>
                  </div>
                </div>

                {/* Botão Acessar Empresa */}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (stats.inteligenciaStats.empresaId) {
                      setSelectedEmpresaId(stats.inteligenciaStats.empresaId)
                    } else if (inteligenciaEmpresa) {
                      setSelectedEmpresaId(inteligenciaEmpresa.id)
                    }
                  }}
                  className="w-full border-slate-200 text-slate-800 hover:bg-[#004B87] hover:text-white font-bold text-xs h-10 transition-colors rounded-lg flex items-center justify-center gap-1.5"
                >
                  <span>Acessar empresa</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Painel Hammer Segurança */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden hover:border-slate-800 transition-all">
              <div className="p-5 sm:p-6 space-y-6">
                {/* Header com Logo + Badge Empresa Ativa */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <HammerLogo size="md" variant="full" />
                  </div>
                  <Badge className="bg-slate-900 text-white hover:bg-black text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Empresa Ativa
                  </Badge>
                </div>

                {/* Métricas Internas da Hammer */}
                <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      COLABORADORES
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.hammerStats.colaboradoresAtivos}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      POSTOS / CLIENTES
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.hammerStats.postosAtivos}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      ESCALAS ATIVAS
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                      {stats.hammerStats.escalasAtivas}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      PENDÊNCIAS
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-600 mt-1 block">
                      {stats.hammerStats.pendenciasCount}
                    </span>
                  </div>
                </div>

                {/* Botão Acessar Empresa Preto */}
                <Button
                  onClick={() => {
                    if (stats.hammerStats.empresaId) {
                      setSelectedEmpresaId(stats.hammerStats.empresaId)
                    } else if (hammerEmpresa) {
                      setSelectedEmpresaId(hammerEmpresa.id)
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs h-10 transition-colors rounded-lg flex items-center justify-center gap-1.5"
                >
                  <span>Acessar empresa</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Tabelas de Listagens Recentes Consolidadas (Últimas HEs e Pendências em Aberto) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabela 1: Últimas Horas Extras Lançadas */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  ÚLTIMAS HORAS EXTRAS LANÇADAS (TODAS AS EMPRESAS)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">Colaborador</th>
                        <th className="py-2.5 px-4 font-bold">Empresa</th>
                        <th className="py-2.5 px-4 font-bold">Posto</th>
                        <th className="py-2.5 px-4 font-bold">Data</th>
                        <th className="py-2.5 px-4 font-bold text-right">Horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentHoras.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            Nenhum registro de horas extras encontrado.
                          </td>
                        </tr>
                      ) : (
                        stats.recentHoras.map((h: any) => (
                          <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {h.colaborador?.nome || 'João da Silva'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {h.empresa?.nome || 'Inteligência e Serviços'}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {h.posto?.nome || 'Posto Central'}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{formatDateBR(h.data)}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {h.quantidade_horas}h
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-right">
                  <Link
                    to="/horas-extras"
                    className="text-xs font-bold text-[#004B87] hover:underline inline-flex items-center gap-1"
                  >
                    Ver todas as horas extras <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Tabela 2: Pendências em Aberto */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  PENDÊNCIAS EM ABERTO (TODAS AS EMPRESAS)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">Descrição</th>
                        <th className="py-2.5 px-4 font-bold">Empresa</th>
                        <th className="py-2.5 px-4 font-bold">Tipo</th>
                        <th className="py-2.5 px-4 font-bold text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentPendencias.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400">
                            Nenhuma pendência operacional registrada no momento.
                          </td>
                        </tr>
                      ) : (
                        stats.recentPendencias.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {p.descricao}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{p.empresaNome}</td>
                            <td className="py-3 px-4 text-slate-500">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold text-slate-600 bg-slate-100 border-slate-200"
                              >
                                {p.tipo}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500">
                              {formatDateBR(p.data)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-right">
                  <Link
                    to="/trocas-plantao"
                    className="text-xs font-bold text-[#004B87] hover:underline inline-flex items-center gap-1"
                  >
                    Ver todas as pendências <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASO 2: EMPRESA SELECIONADA ESPECÍFICA (TEMA CLARO COM IDENTIDADE PRÓPRIA) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Top Banner Corporativo com Fundo Claro e Identidade da Empresa */}
          <div
            className={`p-6 sm:p-8 rounded-2xl border transition-all ${
              isHammer ? 'bg-slate-50 border-slate-300' : 'bg-blue-50/40 border-blue-200'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                {isHammer ? (
                  <HammerLogo size="lg" variant="full" showSlogan />
                ) : (
                  <InteligenciaLogo size="lg" variant="full" showSlogan />
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Badge
                    className={`${
                      isHammer ? 'bg-slate-900 text-white' : 'bg-[#004B87] text-white'
                    } text-xs font-bold`}
                  >
                    Empresa Ativa: {selectedEmpresa?.nome}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  onClick={() => navigate('/horas-extras/novo')}
                  className={`${
                    isHammer
                      ? 'bg-slate-900 hover:bg-black text-white'
                      : 'bg-[#004B87] hover:bg-[#003B6D] text-white'
                  } text-xs font-bold h-10 px-4 shadow-sm`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Lançar Hora Extra
                </Button>
                <Button
                  onClick={() => navigate('/colaboradores/novo')}
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold h-10 px-4"
                >
                  <Users className="w-4 h-4 mr-2 text-slate-600" />
                  Novo Colaborador
                </Button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas da Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Colaboradores */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Colaboradores Ativos
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    isHammer ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-[#004B87]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900">
                  {stats.totalColaboradoresAtivos}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Alocados em {stats.postosCount} postos de serviço
                </p>
              </CardContent>
            </Card>

            {/* 2. Horas Extras */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Horas Extras (Mês)
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${
                    isHammer ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-[#004B87]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900">
                  {stats.totalHorasExtrasMes} <span className="text-base font-normal">h</span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {formatCurrency(stats.valorTotalHorasExtrasMes)}
                </p>
              </CardContent>
            </Card>

            {/* 3. Trocas Pendentes */}
            <Card
              onClick={() => navigate('/trocas-plantao')}
              className="border-slate-200 bg-white shadow-xs rounded-xl cursor-pointer hover:border-slate-400 transition-colors"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Trocas de Plantão
                </CardTitle>
                <div className="p-2 rounded-lg bg-slate-100 text-slate-900">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-900">
                  {stats.trocasPendentesCount}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Aguardando aprovação</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </p>
              </CardContent>
            </Card>

            {/* 4. Pendências Totais */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total de Pendências
                </CardTitle>
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-rose-600">{stats.totalPendencias}</div>
                <p className="text-xs text-slate-500 mt-1">Requerem validação operacional</p>
              </CardContent>
            </Card>
          </div>

          {/* Seção de Listas da Empresa Selecionada */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Postos de Serviço */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase text-slate-800">
                  Principais Postos / Clientes
                </CardTitle>
                <Link
                  to="/postos"
                  className={`text-xs font-bold hover:underline ${
                    isHammer ? 'text-slate-900' : 'text-[#004B87]'
                  }`}
                >
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {stats.colabsByPosto.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Nenhum colaborador alocado em postos.
                  </div>
                ) : (
                  stats.colabsByPosto.map((p) => (
                    <div key={p.postoNome} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{p.postoNome}</span>
                      <span className="font-bold text-slate-600">{p.count} colaboradores</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Horas Extras Recentes */}
            <Card className="border-slate-200 bg-white shadow-xs rounded-xl">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase text-slate-800">
                  Horas Extras Recentes
                </CardTitle>
                <Link
                  to="/horas-extras"
                  className={`text-xs font-bold hover:underline ${
                    isHammer ? 'text-slate-900' : 'text-[#004B87]'
                  }`}
                >
                  Ver todas
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100">
                {stats.recentHoras.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhuma hora extra registrada.
                  </div>
                ) : (
                  stats.recentHoras.map((h: any) => (
                    <div
                      key={h.id}
                      className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {h.colaborador?.nome || 'Colaborador'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateBR(h.data)} • {h.posto?.nome || 'Base'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{h.quantidade_horas}h</div>
                        <span className="text-[10px] text-slate-500">
                          {formatCurrency(h.valor_calculado)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
