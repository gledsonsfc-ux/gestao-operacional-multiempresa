import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import {
  horasExtrasService,
  horaExtraConfigsService,
  colaboradoresService,
  postosService,
  historicoService,
} from '@/services/gestao-service'
import { Colaborador, Posto, HoraExtraConfig, Feriado, HoraExtra } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  Save,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  calculateHoursDifference,
  calculateOvertime,
  formatCurrency,
  formatDateBR,
} from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function HoraExtraForm() {
  const { selectedEmpresaId, empresas } = useEmpresa()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('editId')
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [existingRecord, setExistingRecord] = useState<HoraExtra | null>(null)

  // Aux state
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [configs, setConfigs] = useState<HoraExtraConfig[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])

  // Form
  const [empresaId, setEmpresaId] = useState<string>(
    selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
  )
  const [colaboradorId, setColaboradorId] = useState('')
  const [postoId, setPostoId] = useState('none')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [entrada, setEntrada] = useState('18:00')
  const [saida, setSaida] = useState('22:00')

  // Calculation fields
  const [quantidadeHoras, setQuantidadeHoras] = useState<number>(4.0)
  const [tipoDia, setTipoDia] = useState<'normal' | 'domingo' | 'feriado' | 'outro'>('normal')
  const [percentual, setPercentual] = useState<number>(50.0)
  const [valorHora, setValorHora] = useState<number>(15.0)
  const [valorCalculado, setValorCalculado] = useState<number>(90.0)
  const [memoriaCalculo, setMemoriaCalculo] = useState<string>('')

  // Manual adjustment tracking
  const [ajusteManual, setAjusteManual] = useState(false)
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [motivoModalOpen, setMotivoModalOpen] = useState(false)
  const [pendingSave, setPendingSave] = useState(false)

  const [status, setStatus] = useState<'Pendente' | 'Conferido' | 'Aprovado' | 'Recusado'>(
    'Pendente',
  )
  const [observacao, setObservacao] = useState('')

  // 1. Load basic configs & feriados
  useEffect(() => {
    if (empresaId) {
      Promise.all([
        colaboradoresService.list(empresaId),
        postosService.list(empresaId),
        horaExtraConfigsService.getConfigs(empresaId),
        horaExtraConfigsService.listFeriados(),
      ]).then(([cList, pList, confList, fList]) => {
        setColaboradores(cList.filter((c) => c.status === 'Ativo'))
        setPostos(pList)
        setConfigs(confList)
        setFeriados(fList)

        if (editId) {
          horasExtrasService.list(empresaId).then((all) => {
            const found = all.find((h) => h.id === editId)
            if (found) {
              setExistingRecord(found)
              setColaboradorId(found.colaborador_id)
              setPostoId(found.posto_id || 'none')
              setData(found.data)
              setEntrada(found.entrada.slice(0, 5))
              setSaida(found.saida.slice(0, 5))
              setQuantidadeHoras(found.quantidade_horas)
              setTipoDia(found.tipo_dia as any)
              setPercentual(found.percentual)
              setValorHora(found.valor_hora)
              setValorCalculado(found.valor_calculado)
              setMemoriaCalculo(found.memoria_calculo || '')
              setAjusteManual(found.ajuste_manual)
              setMotivoAjuste(found.motivo_ajuste || '')
              setStatus(found.status)
              setObservacao(found.observacao || '')
            }
          })
        }
      })
    }
  }, [empresaId, editId])

  // When collaborator is selected: autofill Posto and Valor Hora Base
  const handleColaboradorSelect = (id: string) => {
    setColaboradorId(id)
    const colab = colaboradores.find((c) => c.id === id)
    if (colab) {
      if (colab.posto_id) setPostoId(colab.posto_id)
      if (colab.valor_hora_base) setValorHora(Number(colab.valor_hora_base))
    }
  }

  // Automatic Calculation effect (only runs when NOT manually locked)
  useEffect(() => {
    if (ajusteManual && existingRecord) {
      // Do not auto-recalc if manual override is locked
      return
    }

    // 1. Calculate hours diff
    const diff = calculateHoursDifference(entrada, saida)
    setQuantidadeHoras(diff)

    // 2. Detect day type from feriados table + sunday
    const detection = horaExtraConfigsService.detectDayType(data, feriados)
    setTipoDia(detection.tipo)

    // 3. Match config rule for this company
    const matchingConfig = configs.find((c) => c.tipo_dia === detection.tipo)
    const perc = matchingConfig
      ? Number(matchingConfig.percentual)
      : detection.tipo === 'normal'
        ? 50
        : 100
    setPercentual(perc)

    // 4. Overtime result
    const { valorCalculado: val, memoriaCalculo: mem } = calculateOvertime(
      diff,
      valorHora,
      perc,
      matchingConfig?.nome || detection.descricao,
    )
    setValorCalculado(val)
    setMemoriaCalculo(mem)
  }, [entrada, saida, data, valorHora, feriados, configs, ajusteManual])

  const handleManualRecalculate = () => {
    setAjusteManual(false)
    toast({
      title: 'Recalculado',
      description: 'Cálculo automático reativado com base nas regras vigentes.',
    })
  }

  const handleTriggerSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!colaboradorId) {
      toast({
        title: 'Selecione o Colaborador',
        description: 'O colaborador é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    // Check if user changed calculated fields manually on existing record
    if (existingRecord) {
      const hasChangedCalculated =
        existingRecord.quantidade_horas !== quantidadeHoras ||
        existingRecord.percentual !== percentual ||
        existingRecord.valor_hora !== valorHora ||
        existingRecord.valor_calculado !== valorCalculado

      if (hasChangedCalculated && !motivoAjuste.trim()) {
        setMotivoModalOpen(true)
        return
      }
    }

    executeSave()
  }

  const executeSave = async () => {
    setSaving(true)
    try {
      const payload: Partial<HoraExtra> = {
        empresa_id: empresaId,
        colaborador_id: colaboradorId,
        posto_id: postoId !== 'none' ? postoId : null,
        data,
        entrada,
        saida,
        quantidade_horas: quantidadeHoras,
        tipo_dia: tipoDia,
        percentual,
        valor_hora: valorHora,
        valor_calculado: valorCalculado,
        memoria_calculo: memoriaCalculo,
        ajuste_manual: ajusteManual,
        motivo_ajuste: motivoAjuste.trim() || null,
        status,
        origem: existingRecord?.origem || 'Painel',
        observacao: observacao.trim() || null,
      }

      if (existingRecord) {
        await horasExtrasService.update(existingRecord.id, payload, {
          previous: existingRecord,
          userId: user?.id,
          userName: profile?.nome,
          motivo: motivoAjuste || 'Edição de lançamento de hora extra',
        })
        toast({ title: 'Hora Extra atualizada', description: 'Registro atualizado com sucesso.' })
      } else {
        await horasExtrasService.create(payload)
        toast({ title: 'Hora Extra cadastrada', description: 'Registro lançado com sucesso.' })
      }

      navigate('/horas-extras')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/horas-extras')}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {existingRecord ? 'Editar Hora Extra' : 'Lançar Hora Extra'}
            </h2>
            <p className="text-xs text-slate-500">
              Cálculo automatizado com base na jornada, dia da semana e feriados.
            </p>
          </div>
        </div>

        {ajusteManual && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRecalculate}
            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reativar Recálculo Auto
          </Button>
        )}
      </div>

      <form onSubmit={handleTriggerSave} className="space-y-6">
        {/* Card 1: Identificação */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              1. Colaborador e Posto de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
              <Select value={empresaId} onValueChange={setEmpresaId} disabled={!!existingRecord}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Colaborador *</Label>
              <Select value={colaboradorId} onValueChange={handleColaboradorSelect}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({c.cargo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Posto de Trabalho</Label>
              <Select value={postoId} onValueChange={setPostoId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o posto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Base / Sem Posto</SelectItem>
                  {postos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Horários e Cálculo Automático */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>2. Período e Parâmetros de Cálculo</span>
              {ajusteManual ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                  ⚠️ Ajuste Manual Ativo
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                  ✨ Cálculo Automático
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Data da Hora Extra *</Label>
                <Input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Horário de Entrada *</Label>
                <Input
                  type="time"
                  required
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Horário de Saída *</Label>
                <Input
                  type="time"
                  required
                  value={saida}
                  onChange={(e) => setSaida(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Se virar o dia, o sistema calcula +24h.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Quantidade de Horas</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantidadeHoras}
                  onChange={(e) => {
                    setQuantidadeHoras(Number(e.target.value))
                    setAjusteManual(true)
                  }}
                  className="text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Dia</Label>
                <Select
                  value={tipoDia}
                  onValueChange={(v: any) => {
                    setTipoDia(v)
                    setAjusteManual(true)
                    const matchingConfig = configs.find((c) => c.tipo_dia === v)
                    if (matchingConfig) setPercentual(Number(matchingConfig.percentual))
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Dia Normal</SelectItem>
                    <SelectItem value="domingo">Domingo</SelectItem>
                    <SelectItem value="feriado">Feriado</SelectItem>
                    <SelectItem value="outro">Outro Adicional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Percentual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={percentual}
                  onChange={(e) => {
                    setPercentual(Number(e.target.value))
                    setAjusteManual(true)
                  }}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Valor Hora Base (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorHora}
                  onChange={(e) => {
                    setValorHora(Number(e.target.value))
                    setAjusteManual(true)
                  }}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Memória do Cálculo Visual Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#121c33] text-white space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Memória do Cálculo
                </span>
                <span className="text-[11px] text-slate-400">
                  {tipoDia === 'feriado'
                    ? 'Feriado Identificado'
                    : tipoDia === 'domingo'
                      ? 'Domingo Identificado'
                      : 'Dia Útil'}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-200 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                {memoriaCalculo ||
                  `${quantidadeHoras}h × ${formatCurrency(valorHora)} × (1 + ${percentual}%) = ${formatCurrency(valorCalculado)}`}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-400">Total a Pagar / Provisão:</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {formatCurrency(valorCalculado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Status & Observações */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              3. Status e Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status de Conferência</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Conferido">Conferido</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Recusado">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações Operacionais
              </Label>
              <Textarea
                placeholder="Detalhes ou justificativa do lançamento de hora extra..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/horas-extras')}
            disabled={saving}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Gravando...' : 'Salvar Registro'}
          </Button>
        </div>
      </form>

      {/* Modal: Motivo de Ajuste Manual Obrigatório */}
      <Dialog open={motivoModalOpen} onOpenChange={setMotivoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Motivo do Ajuste Manual
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Você alterou campos calculados automaticamente. Conforme as regras operacionais, é
              obrigatório registrar o motivo para histórico e auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold text-slate-700">
              Justificativa / Motivo da alteração *
            </Label>
            <Input
              required
              placeholder="Ex: Acordo operacional prévio aprovado pela diretoria."
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMotivoModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!motivoAjuste.trim() || saving}
              onClick={() => {
                setMotivoModalOpen(false)
                setAjusteManual(true)
                executeSave()
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
            >
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
