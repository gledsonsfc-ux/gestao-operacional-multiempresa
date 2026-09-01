import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useEmpresa } from '@/hooks/use-empresa'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertTriangle, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateBR } from '@/lib/formatters'

interface NotificationItem {
  id: string
  tipo: 'troca' | 'documento_vencendo' | 'documento_vencido' | 'cnv_vencendo'
  titulo: string
  descricao: string
  data?: string
  link: string
  urgencia: 'alta' | 'media' | 'baixa'
}

export function NotificationBell() {
  const { selectedEmpresaId } = useEmpresa()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const items: NotificationItem[] = []

      // 1. Trocas Pendentes
      let trocasQuery = supabase
        .from('trocas_plantao')
        .select(
          'id, data, horario, motivo, empresa_id, solicitante:colaboradores!trocas_plantao_solicitante_id_fkey(nome), substituto:colaboradores!trocas_plantao_substituto_id_fkey(nome)',
        )
        .eq('status', 'Pendente')

      if (selectedEmpresaId !== 'consolidado') {
        trocasQuery = trocasQuery.eq('empresa_id', selectedEmpresaId)
      }

      const { data: trocas } = await trocasQuery
      if (trocas) {
        trocas.forEach((t: any) => {
          items.push({
            id: `troca-${t.id}`,
            tipo: 'troca',
            titulo: 'Troca de Plantão Pendente',
            descricao: `${t.solicitante?.nome || 'Solicitante'} ➔ ${t.substituto?.nome || 'Substituto'} em ${formatDateBR(t.data)}`,
            data: t.data,
            link: '/trocas-plantao',
            urgencia: 'media',
          })
        })
      }

      // 2. Documentos e CNVs vencendo em 30 dias ou vencidos
      const today = new Date().toISOString().split('T')[0]
      const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      let colabQuery = supabase
        .from('colaboradores')
        .select('id, nome, cnv_validade, proximo_vencimento_reciclagem, exige_vigilancia, status')
        .eq('status', 'Ativo')

      if (selectedEmpresaId !== 'consolidado') {
        colabQuery = colabQuery.eq('empresa_id', selectedEmpresaId)
      }

      const { data: colabs } = await colabQuery
      if (colabs) {
        colabs.forEach((c: any) => {
          if (c.exige_vigilancia) {
            if (c.cnv_validade) {
              if (c.cnv_validade < today) {
                items.push({
                  id: `cnv-exp-${c.id}`,
                  tipo: 'documento_vencido',
                  titulo: `CNV Vencida: ${c.nome}`,
                  descricao: `Venceu em ${formatDateBR(c.cnv_validade)}`,
                  link: `/colaboradores/${c.id}`,
                  urgencia: 'alta',
                })
              } else if (c.cnv_validade <= next30) {
                items.push({
                  id: `cnv-soon-${c.id}`,
                  tipo: 'cnv_vencendo',
                  titulo: `CNV Vencendo: ${c.nome}`,
                  descricao: `Vence em ${formatDateBR(c.cnv_validade)}`,
                  link: `/colaboradores/${c.id}`,
                  urgencia: 'media',
                })
              }
            }

            if (c.proximo_vencimento_reciclagem) {
              if (c.proximo_vencimento_reciclagem < today) {
                items.push({
                  id: `rec-exp-${c.id}`,
                  tipo: 'documento_vencido',
                  titulo: `Reciclagem Vencida: ${c.nome}`,
                  descricao: `Venceu em ${formatDateBR(c.proximo_vencimento_reciclagem)}`,
                  link: `/colaboradores/${c.id}`,
                  urgencia: 'alta',
                })
              } else if (c.proximo_vencimento_reciclagem <= next30) {
                items.push({
                  id: `rec-soon-${c.id}`,
                  tipo: 'cnv_vencendo',
                  titulo: `Reciclagem Vencendo: ${c.nome}`,
                  descricao: `Vence em ${formatDateBR(c.proximo_vencimento_reciclagem)}`,
                  link: `/colaboradores/${c.id}`,
                  urgencia: 'media',
                })
              }
            }
          }
        })
      }

      setNotifications(items)
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // 1 min poll
    return () => clearInterval(interval)
  }, [selectedEmpresaId])

  const count = notifications.length
  const highPriorityCount = notifications.filter((n) => n.urgencia === 'alta').length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
          title="Notificações operacionais"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span
              className={`absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full ${
                highPriorityCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
              }`}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-slate-200">
        <div className="flex items-center justify-between p-3 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-slate-800">Alertas Operacionais</h4>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500"
            onClick={fetchNotifications}
            title="Atualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Nenhum alerta pendente no momento!
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors group"
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                    n.urgencia === 'alta'
                      ? 'bg-rose-100 text-rose-600'
                      : n.tipo === 'troca'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-primary truncate">
                    {n.titulo}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.descricao}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 self-center" />
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
