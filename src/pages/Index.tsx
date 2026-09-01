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
} from 'lucide-react'
import { formatCurrency, formatDateBR } from '@/lib/formatters'

interface DashboardStats {
  totalColaboradoresAtivos: number
  totalHorasExtrasMes: number
  valorTotalHorasExtrasMes: number
  trocasPendentesCount: number
  totalVTMes: number
  postosCount: number
  docsVencendoCount: number
  cnvsVencendoCount: number
  colabsByEmpresa: { empresaNome: string; count: number; color: string }[]
  colabsByPosto: { postoNome: string; count: number }[]
  horasByDay: { dia: string; horas: number; valor: number }[]
  recentHoras: any[]
  recentColabs: any[]
  trocasPendentesList: any[]
}

export default function Index() {
  const { selectedEmpresaId, isConsolidado, selectedEmpresa, empresas } = useEmpresa()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalColaboradoresAtivos: 0,
    totalHorasExtrasMes: 0,
    valorTotalHorasExtrasMes: 0,
    trocasPendentesCount: 0,
    totalVTMes: 0,
    postosCount: 0,
    docsVencendoCount: 0,
    cnvsVencendoCount: 0,
    colabsByEmpresa: [],
    colabsByPosto: [],
    horasByDay: [],
    recentHoras: [],
    recentColabs: [],
    trocasPendentesList: [],
  })

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const firstDayMonth = `${currentYearMonth}-01`
      const todayStr = now.toISOString().split('T')[0]
      const next30Str = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 1. Colaboradores
      let colabQuery = supabase
        .from('colaboradores')
        .select(
          'id, nome, status, cargo, posto_id, empresa_id, foto_url, data_admissao, exige_vigilancia, cnv_validade, proximo_vencimento_reciclagem, posto:postos(nome), empresa:empresas(nome)',
        )

      if (selectedEmpresaId !== 'consolidado') {
        colabQuery = colabQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: colabs } = await colabQuery
      const allColabs = colabs || []
      const ativos = allColabs.filter((c: any) => c.status === 'Ativo')

      // Check CNVs / Docs vencendo
      let cnvsVencendo = 0
      let docsVencendo = 0
      ativos.forEach((c: any) => {
        if (c.exige_vigilancia) {
          if (c.cnv_validade && c.cnv_validade <= next30Str) cnvsVencendo++
          if (c.proximo_vencimento_reciclagem && c.proximo_vencimento_reciclagem <= next30Str)
            cnvsVencendo++
        }
      })

      // Group colabs by empresa (for consolidated donut)
      const colabEmpresaMap: Record<string, number> = {}
      empresas.forEach((e) => {
        colabEmpresaMap[e.nome] = 0
      })
      ativos.forEach((c: any) => {
        const empName = c.empresa?.nome || 'Outra'
        colabEmpresaMap[empName] = (colabEmpresaMap[empName] || 0) + 1
      })
      const colabsByEmpresa = Object.entries(colabEmpresaMap).map(([empresaNome, count], idx) => ({
        empresaNome,
        count,
        color: idx === 0 ? '#10b981' : '#0284c7',
      }))

      // Group colabs by posto (top postos)
      const colabPostoMap: Record<string, number> = {}
      ativos.forEach((c: any) => {
        const postoNome = c.posto?.nome || 'Sem Posto / Base'
        colabPostoMap[postoNome] = (colabPostoMap[postoNome] || 0) + 1
      })
      const colabsByPosto = Object.entries(colabPostoMap)
        .map(([postoNome, count]) => ({ postoNome, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // 2. Horas Extras do mês
      let heQuery = supabase
        .from('horas_extras')
        .select(
          'id, data, quantidade_horas, valor_calculado, status, colaborador:colaboradores(nome), posto:postos(nome), empresa_id',
        )
        .gte('data', firstDayMonth)

      if (selectedEmpresaId !== 'consolidado') {
        heQuery = heQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: heList } = await heQuery
      const allHE = heList || []

      let totalHoras = 0
      let totalValor = 0
      const dailyMap: Record<string, { horas: number; valor: number }> = {}

      allHE.forEach((h: any) => {
        const q = Number(h.quantidade_horas) || 0
        const v = Number(h.valor_calculado) || 0
        totalHoras += q
        totalValor += v

        const dayNum = h.data.split('-')[2]
        if (!dailyMap[dayNum]) {
          dailyMap[dayNum] = { horas: 0, valor: 0 }
        }
        dailyMap[dayNum].horas += q
        dailyMap[dayNum].valor += v
      })

      const horasByDay = Object.entries(dailyMap)
        .map(([dia, d]) => ({
          dia: `Dia ${dia}`,
          horas: Number(d.horas.toFixed(1)),
          valor: d.valor,
        }))
        .sort((a, b) => a.dia.localeCompare(b.dia))

      // 3. Trocas Pendentes
      let trocasQuery = supabase
        .from('trocas_plantao')
        .select(
          'id, data, horario, motivo, status, empresa_id, solicitante:colaboradores!trocas_plantao_solicitante_id_fkey(nome), substituto:colaboradores!trocas_plantao_substituto_id_fkey(nome), posto:postos(nome)',
        )
        .eq('status', 'Pendente')

      if (selectedEmpresaId !== 'consolidado') {
        trocasQuery = trocasQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: trocas } = await trocasQuery
      const trocasPendentesList = trocas || []

      // 4. Vale-Transporte do Mês
      let vtQuery = supabase
        .from('vale_transporte')
        .select('valor_previsto, valor_depositado, empresa_id')
        .eq('competencia', currentYearMonth)

      if (selectedEmpresaId !== 'consolidado') {
        vtQuery = vtQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { data: vtList } = await vtQuery
      const totalVTMes = (vtList || []).reduce(
        (acc: number, item: any) => acc + (Number(item.valor_previsto) || 0),
        0,
      )

      // 5. Postos Count
      let postosQuery = supabase
        .from('postos')
        .select('id, ativo', { count: 'exact' })
        .eq('ativo', true)
      if (selectedEmpresaId !== 'consolidado') {
        postosQuery = postosQuery.eq('empresa_id', selectedEmpresaId)
      }
      const { count: postosCount } = await postosQuery

      // Recent lists
      const recentHoras = [...allHE].reverse().slice(0, 5)
      const recentColabs = [...allColabs].reverse().slice(0, 5)

      setStats({
        totalColaboradoresAtivos: ativos.length,
        totalHorasExtrasMes: Number(totalHoras.toFixed(1)),
        valorTotalHorasExtrasMes: totalValor,
        trocasPendentesCount: trocasPendentesList.length,
        totalVTMes,
        postosCount: postosCount || 0,
        docsVencendoCount: docsVencendo + cnvsVencendo,
        cnvsVencendoCount: cnvsVencendo,
        colabsByEmpresa,
        colabsByPosto,
        horasByDay,
        recentHoras,
        recentColabs,
        trocasPendentesList,
      })
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedEmpresaId])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1527] via-[#152342] to-[#1e325c] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {isConsolidado ? 'Painel Integrado' : selectedEmpresa?.nome}
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Olá, {profile?.nome || 'Gestor'}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Acompanhe a operação em tempo real, aprove trocas de plantão, confira horas extras e
              mantenha a conformidade das escalas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate('/horas-extras/novo')}
              className="bg-amber-500 hover:bg-amber-600 text-white shadow-md text-xs font-semibold h-9"
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Lançar Hora Extra
            </Button>
            <Button
              onClick={() => navigate('/colaboradores/novo')}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-9"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Novo Colaborador
            </Button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Colaboradores Ativos */}
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Colaboradores Ativos
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats.totalColaboradoresAtivos}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Distribuídos em {stats.postosCount} postos ativos
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Horas Extras Mês */}
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Horas Extras (Mês)
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats.totalHorasExtrasMes}{' '}
              <span className="text-sm font-medium text-slate-500">horas</span>
            </div>
            <p className="text-xs font-semibold text-amber-700 mt-1">
              Total Calculado: {formatCurrency(stats.valorTotalHorasExtrasMes)}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Trocas Pendentes */}
        <Card
          onClick={() => navigate('/trocas-plantao')}
          className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trocas de Plantão
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {stats.trocasPendentesCount}
              </span>
              <span className="text-xs font-semibold text-blue-600">pendentes</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Aguardando autorização</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Vale-Transporte */}
        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vale-Transporte (Mês)
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Bus className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
              {formatCurrency(stats.totalVTMes)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Provisão prevista competência
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Colaboradores por Posto */}
        <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Colaboradores por Posto de Serviço
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribuição da equipe operacional por cliente / localização
                </CardDescription>
              </div>
              <Link
                to="/postos"
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                Ver Postos <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.colabsByPosto.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum colaborador alocado em postos no momento.
              </div>
            ) : (
              <div className="space-y-3.5 pt-2">
                {stats.colabsByPosto.map((item, idx) => {
                  const max = Math.max(...stats.colabsByPosto.map((p) => p.count), 1)
                  const pct = Math.round((item.count / max) * 100)
                  const colors = [
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-blue-500',
                    'bg-indigo-500',
                    'bg-rose-500',
                    'bg-cyan-500',
                  ]
                  const colorClass = colors[idx % colors.length]

                  return (
                    <div key={item.postoNome} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[240px]">
                          {item.postoNome}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.count} {item.count === 1 ? 'colaborador' : 'colaboradores'}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Colaboradores por Empresa (Donut / Proporção) */}
        <Card className="border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-800">Divisão por Empresa</CardTitle>
            <CardDescription className="text-xs">
              {isConsolidado
                ? 'Proporção entre as duas operações'
                : 'Efetivo da empresa selecionada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center py-4">
            {stats.colabsByEmpresa.length === 0 ? (
              <div className="text-xs text-slate-400">Sem dados cadastrados</div>
            ) : (
              <div className="w-full space-y-4">
                {/* SVG Donut Visual */}
                <div className="flex justify-center">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="3.8"
                    />
                    {(() => {
                      const total = stats.colabsByEmpresa.reduce((a, b) => a + b.count, 0) || 1
                      let accumulated = 0
                      return stats.colabsByEmpresa.map((e, idx) => {
                        const pct = (e.count / total) * 100
                        const dashArray = `${pct} ${100 - pct}`
                        const dashOffset = 100 - accumulated + 25
                        accumulated += pct
                        return (
                          <circle
                            key={e.empresaNome}
                            cx="18"
                            cy="18"
                            r="15.91549430918954"
                            fill="transparent"
                            stroke={e.color}
                            strokeWidth="3.8"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                          />
                        )
                      })
                    })()}
                  </svg>
                </div>

                {/* Legend list */}
                <div className="space-y-2">
                  {stats.colabsByEmpresa.map((e) => (
                    <div
                      key={e.empresaNome}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: e.color }}
                        />
                        <span className="font-semibold text-slate-700">{e.empresaNome}</span>
                      </div>
                      <span className="font-bold text-slate-900">{e.count} ativos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas & Trocas Pendentes Priority Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel 1: Trocas de Plantão Pendentes */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                Trocas de Plantão Aguardando Decisão
              </CardTitle>
              <CardDescription className="text-xs">
                O envio não autoriza automaticamente. Requer validação da coordenação.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              {stats.trocasPendentesCount} Pendentes
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {stats.trocasPendentesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <FileCheck2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Nenhuma solicitação de troca pendente de análise.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {stats.trocasPendentesList.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {t.solicitante?.nome || 'Solicitante'}
                        </span>
                        <span className="text-[10px] text-slate-400">➔</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {t.substituto?.nome || 'Substituto'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>
                          📅 {formatDateBR(t.data)} ({t.horario})
                        </span>
                        {t.posto?.nome && <span>📍 {t.posto.nome}</span>}
                      </div>
                      <div className="text-[11px] text-slate-600 italic line-clamp-1">
                        Motivo: "{t.motivo}"
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/trocas-plantao')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0"
                    >
                      Analisar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel 2: Alertas de Vencimentos e Documentação */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertas de Vencimento e Conformidade
              </CardTitle>
              <CardDescription className="text-xs">
                CNVs, reciclagens de vigilância e documentos dos próximos 30 dias
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                stats.docsVencendoCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {stats.docsVencendoCount} Alertas
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {stats.docsVencendoCount === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Toda a documentação operacional e de vigilância está em dia!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block">
                      {stats.cnvsVencendoCount} Credenciais / Reciclagens requerem atenção
                    </span>
                    <span className="text-amber-800">
                      Consulte a lista de colaboradores da Hammer Segurança para agendar a
                      renovação.
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/documentos')}
                  className="w-full text-xs font-semibold"
                >
                  Consultar Painel Geral de Documentos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividade Recente (2 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recentes: Horas Extras */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800">
              Últimas Horas Extras Lançadas
            </CardTitle>
            <Link
              to="/horas-extras"
              className="text-xs text-amber-600 font-semibold hover:underline"
            >
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentHoras.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum lançamento no período.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentHoras.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {h.colaborador?.nome || 'Colaborador'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateBR(h.data)} • {h.quantidade_horas}h • {h.posto?.nome || 'Base'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(h.valor_calculado)}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          h.status === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'Recusado'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recentes: Novos Colaboradores */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800">
              Colaboradores Recentes
            </CardTitle>
            <Link
              to="/colaboradores"
              className="text-xs text-amber-600 font-semibold hover:underline"
            >
              Ver equipe
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentColabs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum colaborador registrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentColabs.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/colaboradores/${c.id}`)}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                        {c.foto_url ? (
                          <img
                            src={c.foto_url}
                            alt={c.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.nome.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{c.nome}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.cargo} • {c.posto?.nome || 'Sem posto'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        c.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
