import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import { valeTransporteService, colaboradoresService } from '@/services/gestao-service'
import { ValeTransporte, Colaborador } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Bus,
  Plus,
  Edit,
  Save,
  Calculator,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function ValeTransportePage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { profile, user } = useAuth()
  const { toast } = useToast()

  const currentYearMonth = new Date().toISOString().slice(0, 7)
  const [competencia, setCompetencia] = useState(currentYearMonth)
  const [vtList, setVtList] = useState<ValeTransporte[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Save/Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVT, setEditingVT] = useState<ValeTransporte | null>(null)
  const [formColaboradorId, setFormColaboradorId] = useState('')
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formNumeroCartao, setFormNumeroCartao] = useState('')
  const [formTipoTransporte, setFormTipoTransporte] = useState('Ônibus')
  const [formValorDiario, setFormValorDiario] = useState('9.60')
  const [formDiasPrevistos, setFormDiasPrevistos] = useState(22)
  const [formDiasTrabalhados, setFormDiasTrabalhados] = useState(22)
  const [formValorDepositado, setFormValorDepositado] = useState('0.00')
  const [formMotivoAjuste, setFormMotivoAjuste] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [data, colabs] = await Promise.all([
        valeTransporteService.list(selectedEmpresaId, competencia),
        colaboradoresService.list(selectedEmpresaId),
      ])
      setVtList(data)
      setColaboradores(colabs.filter((c) => c.status === 'Ativo'))
    } catch (err) {
      console.error('Erro ao carregar VT:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId, competencia])

  const openCreate = () => {
    setEditingVT(null)
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormColaboradorId('')
    setFormNumeroCartao('')
    setFormTipoTransporte('Ônibus')
    setFormValorDiario('9.60')
    setFormDiasPrevistos(22)
    setFormDiasTrabalhados(22)
    setFormValorDepositado('211.20')
    setFormMotivoAjuste('')
    setModalOpen(true)
  }

  const openEdit = (vt: ValeTransporte) => {
    setEditingVT(vt)
    setFormEmpresaId(vt.empresa_id)
    setFormColaboradorId(vt.colaborador_id)
    setFormNumeroCartao(vt.numero_cartao || '')
    setFormTipoTransporte(vt.tipo_transporte || 'Ônibus')
    setFormValorDiario(String(vt.valor_diario))
    setFormDiasPrevistos(vt.dias_previstos)
    setFormDiasTrabalhados(vt.dias_trabalhados)
    setFormValorDepositado(String(vt.valor_depositado))
    setFormMotivoAjuste(vt.motivo_ajuste || '')
    setModalOpen(true)
  }

  const handleSelectColaborador = (colabId: string) => {
    setFormColaboradorId(colabId)
    const colab = colaboradores.find((c) => c.id === colabId)
    if (colab) {
      setFormEmpresaId(colab.empresa_id)
      if (colab.numero_cartao_vt) setFormNumeroCartao(colab.numero_cartao_vt)
      if (colab.tipo_transporte) setFormTipoTransporte(colab.tipo_transporte)
      if (colab.valor_diario_vt) {
        setFormValorDiario(String(colab.valor_diario_vt))
        const previsto = Number(colab.valor_diario_vt) * formDiasPrevistos
        setFormValorDepositado(previsto.toFixed(2))
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formColaboradorId) {
      toast({ title: 'Atenção', description: 'Selecione o colaborador.', variant: 'destructive' })
      return
    }

    const vd = Number(formValorDiario) || 0
    const dp = Number(formDiasPrevistos) || 0
    const vDep = Number(formValorDepositado) || 0
    const vPrev = Number((vd * dp).toFixed(2))
    const dif = Number((vPrev - vDep).toFixed(2))

    setSaving(true)
    try {
      await valeTransporteService.save(
        {
          id: editingVT?.id,
          empresa_id: formEmpresaId,
          colaborador_id: formColaboradorId,
          competencia,
          numero_cartao: formNumeroCartao.trim() || null,
          tipo_transporte: formTipoTransporte,
          valor_diario: vd,
          dias_previstos: dp,
          dias_trabalhados: Number(formDiasTrabalhados) || 0,
          valor_previsto: vPrev,
          valor_depositado: vDep,
          diferenca: dif,
          ajuste_manual: Boolean(editingVT && formMotivoAjuste),
          motivo_ajuste: formMotivoAjuste.trim() || null,
        },
        {
          previous: editingVT || undefined,
          userId: user?.id,
          userName: profile?.nome,
          motivo: formMotivoAjuste || 'Lançamento mensal de Vale-Transporte',
        },
      )

      toast({
        title: 'VT Salvo',
        description: 'Registro de vale-transporte persistido com sucesso.',
      })
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar VT', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Totals
  const totalPrevisto = vtList.reduce((sum, v) => sum + (Number(v.valor_previsto) || 0), 0)
  const totalDepositado = vtList.reduce((sum, v) => sum + (Number(v.valor_depositado) || 0), 0)
  const totalDiferenca = vtList.reduce((sum, v) => sum + (Number(v.diferenca) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Controle Mensal de Vale-Transporte</h2>
          <p className="text-xs text-slate-500">
            Cálculo automático de provisão (dias × valor diário), controle de depósitos, diferenças
            e histórico.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-40 text-xs h-9 bg-white"
          />
          <Button
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Lançar VT
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Valor Total Previsto
            </span>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPrevisto)}</div>
            <span className="text-[10px] text-slate-400">Competência: {competencia}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600">
            <Bus className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Valor Total Depositado
            </span>
            <div className="text-xl font-bold text-emerald-700">
              {formatCurrency(totalDepositado)}
            </div>
            <span className="text-[10px] text-slate-400">Efetivamente creditado</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Diferença / Ajustes
            </span>
            <div
              className={`text-xl font-bold ${totalDiferenca !== 0 ? 'text-amber-700' : 'text-slate-700'}`}
            >
              {formatCurrency(totalDiferenca)}
            </div>
            <span className="text-[10px] text-slate-400">Previsto menos creditado</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Calculator className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Colaborador</TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">Nº Cartão / Tipo</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Valor Diário</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Dias Previstos</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Valor Previsto</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Valor Depositado</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Diferença</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                    Carregando lançamentos de VT...
                  </TableCell>
                </TableRow>
              ) : vtList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-xs text-slate-400">
                    <Bus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum registro de vale-transporte lançado para a competência {competencia}.
                  </TableCell>
                </TableRow>
              ) : (
                vtList.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50">
                    <TableCell className="py-2.5 font-semibold text-xs text-slate-900">
                      {v.colaborador?.nome || 'Colaborador'}
                    </TableCell>

                    {isConsolidado && (
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {v.empresa?.nome}
                      </TableCell>
                    )}

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      <div>{v.numero_cartao || '-'}</div>
                      <span className="text-[10px] text-slate-400">{v.tipo_transporte}</span>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-medium text-slate-700">
                      {formatCurrency(v.valor_diario)}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {v.dias_previstos} dias
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-bold text-slate-900">
                      {formatCurrency(v.valor_previsto)}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-bold text-emerald-700">
                      {formatCurrency(v.valor_depositado)}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-semibold text-slate-700">
                      {v.diferenca !== 0 ? (
                        <span className="text-amber-700">{formatCurrency(v.diferenca)}</span>
                      ) : (
                        <span className="text-slate-400">R$ 0,00</span>
                      )}
                      {v.ajuste_manual && (
                        <span className="block text-[9px] text-amber-600 font-semibold">
                          Ajustado
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(v)}
                        className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingVT ? 'Editar Registro de VT' : 'Novo Lançamento de VT'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Competência: {competencia}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Colaborador *</Label>
                <Select
                  value={formColaboradorId}
                  onValueChange={handleSelectColaborador}
                  disabled={!!editingVT}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Nº Cartão</Label>
                  <Input
                    value={formNumeroCartao}
                    onChange={(e) => setFormNumeroCartao(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo Transporte</Label>
                  <Select value={formTipoTransporte} onValueChange={setFormTipoTransporte}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ônibus">Ônibus</SelectItem>
                      <SelectItem value="Metrô / Trem">Metrô / Trem</SelectItem>
                      <SelectItem value="Integração">Integração</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Valor Diário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formValorDiario}
                    onChange={(e) => setFormValorDiario(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Dias Previstos</Label>
                  <Input
                    type="number"
                    value={formDiasPrevistos}
                    onChange={(e) => setFormDiasPrevistos(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Valor Depositado Efetivo (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formValorDepositado}
                  onChange={(e) => setFormValorDepositado(e.target.value)}
                  className="text-xs font-bold"
                />
              </div>

              {editingVT && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold text-amber-800">
                    Motivo da Alteração Manual (Histórico Audit) *
                  </Label>
                  <Input
                    placeholder="Ex: Reembolso de dias extras / Ajuste de escala"
                    value={formMotivoAjuste}
                    onChange={(e) => setFormMotivoAjuste(e.target.value)}
                    className="text-xs border-amber-300"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {saving ? 'Gravando...' : 'Salvar VT'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
