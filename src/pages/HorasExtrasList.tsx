import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import { horasExtrasService, postosService, colaboradoresService } from '@/services/gestao-service'
import { HoraExtra, Posto, Colaborador, HoraExtraStatus } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  Plus,
  Sliders,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon,
  Filter,
  Eye,
  History,
  Info,
  CheckSquare,
  Square,
  Check,
  X,
  Layers,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { getPermissions } from '@/lib/permissions'

export default function HorasExtrasList() {
  const { selectedEmpresaId, isConsolidado } = useEmpresa()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const permissions = getPermissions(profile?.role)

  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filtroPosto, setFiltroPosto] = useState('todos')
  const [filtroColaborador, setFiltroColaborador] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const [selectedHE, setSelectedHE] = useState<HoraExtra | null>(null)
  const [decisionType, setDecisionType] = useState<'Aprovado' | 'Recusado' | 'Conferido'>(
    'Aprovado',
  )
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [savingDecision, setSavingDecision] = useState(false)

  // Memória de Cálculo Dialog
  const [memoriaModalOpen, setMemoriaModalOpen] = useState(false)
  const [viewHE, setViewHE] = useState<HoraExtra | null>(null)

  // Batch Selection & Modal
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchDecisionType, setBatchDecisionType] = useState<'Aprovado' | 'Recusado'>('Aprovado')
  const [batchMotivoRecusa, setBatchMotivoRecusa] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [heData, postosData, colabsData] = await Promise.all([
        horasExtrasService.list(selectedEmpresaId, {
          postoId: filtroPosto,
          colaboradorId: filtroColaborador,
          status: filtroStatus,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        }),
        postosService.list(selectedEmpresaId),
        colaboradoresService.list(selectedEmpresaId),
      ])
      setHorasExtras(heData)
      setPostos(postosData)
      setColaboradores(colabsData)
      setSelectedIds([])
    } catch (err) {
      console.error('Erro ao carregar horas extras:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId, filtroPosto, filtroColaborador, filtroStatus, dataInicio, dataFim])

  const openDecisionModal = (he: HoraExtra, type: 'Aprovado' | 'Recusado' | 'Conferido') => {
    setSelectedHE(he)
    setDecisionType(type)
    setMotivoRecusa('')
    setDecisionModalOpen(true)
  }

  const handleSaveDecision = async () => {
    if (!selectedHE) return
    if (decisionType === 'Recusado' && !motivoRecusa.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da recusa.',
        variant: 'destructive',
      })
      return
    }

    setSavingDecision(true)
    try {
      await horasExtrasService.update(
        selectedHE.id,
        {
          status: decisionType,
          motivo_recusa: decisionType === 'Recusado' ? motivoRecusa : null,
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        },
        {
          previous: selectedHE,
          userId: user?.id,
          userName: profile?.nome,
          motivo: `Mudança de status para ${decisionType}: ${motivoRecusa || 'Decisão administrativa'}`,
        },
      )

      toast({
        title: `Hora Extra ${decisionType}`,
        description: `O registro foi marcado como ${decisionType}.`,
      })
      setDecisionModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao decidir', description: err.message, variant: 'destructive' })
    } finally {
      setSavingDecision(false)
    }
  }

  // Batch handlers
  const pendingHorasExtras = horasExtras.filter((h) => h.status === 'Pendente')
  const allPendingSelected =
    pendingHorasExtras.length > 0 && pendingHorasExtras.every((h) => selectedIds.includes(h.id))

  const handleToggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingHorasExtras.map((h) => h.id))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const openBatchModal = (type: 'Aprovado' | 'Recusado') => {
    if (selectedIds.length === 0) return
    setBatchDecisionType(type)
    setBatchMotivoRecusa('')
    setBatchModalOpen(true)
  }

  const handleConfirmBatchDecision = async () => {
    if (selectedIds.length === 0) return
    if (batchDecisionType === 'Recusado' && !batchMotivoRecusa.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da recusa em lote para os registros selecionados.',
        variant: 'destructive',
      })
      return
    }

    const itemsToProcess = horasExtras.filter(
      (h) => selectedIds.includes(h.id) && h.status === 'Pendente',
    )

    if (itemsToProcess.length === 0) {
      toast({
        title: 'Nenhum registro pendente',
        description: 'Os itens selecionados já foram processados.',
        variant: 'destructive',
      })
      setBatchModalOpen(false)
      return
    }

    setSavingBatch(true)
    try {
      await horasExtrasService.batchDecide(itemsToProcess, {
        status: batchDecisionType,
        motivo_recusa: batchDecisionType === 'Recusado' ? batchMotivoRecusa.trim() : undefined,
        userId: user?.id,
        userName: profile?.nome || 'Administrador',
      })

      toast({
        title: `Ação em Lote Concluída`,
        description: `${itemsToProcess.length} registro(s) de hora extra foram ${batchDecisionType.toLowerCase()}s com sucesso.`,
      })
      setBatchModalOpen(false)
      setSelectedIds([])
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro na Ação em Lote',
        description: err.message || 'Falha ao processar registros em lote.',
        variant: 'destructive',
      })
    } finally {
      setSavingBatch(false)
    }
  }

  // Calculate selected total summary
  const selectedHEItems = horasExtras.filter((h) => selectedIds.includes(h.id))
  const selectedTotalHours = selectedHEItems.reduce(
    (sum, h) => sum + (Number(h.quantidade_horas) || 0),
    0,
  )
  const selectedTotalValue = selectedHEItems.reduce(
    (sum, h) => sum + (Number(h.valor_calculado) || 0),
    0,
  )

  // Totals of the filtered set
  const totalHoras = horasExtras.reduce((sum, h) => sum + (Number(h.quantidade_horas) || 0), 0)
  const totalValor = horasExtras.reduce((sum, h) => sum + (Number(h.valor_calculado) || 0), 0)

  const getStatusBadge = (status: HoraExtraStatus) => {
    switch (status) {
      case 'Aprovado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
            Aprovado
          </Badge>
        )
      case 'Conferido':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">Conferido</Badge>
        )
      case 'Recusado':
        return <Badge className="bg-rose-100 text-rose-800 border-none text-[10px]">Recusado</Badge>
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">Pendente</Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestão de Horas Extras</h2>
          <p className="text-xs text-slate-500">
            Lançamentos, conferência, cálculos automáticos com regras configuráveis por empresa e
            trilha de auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/horas-extras/configuracoes')}
            className="text-xs"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Regras & Feriados
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/horas-extras/novo')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Lançar Hora Extra
          </Button>
        </div>
      </div>

      {/* KPI Totals Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Lançamentos Filtrados
            </span>
            <div className="text-xl font-bold text-slate-900">{horasExtras.length} registros</div>
          </div>
          <Clock className="w-8 h-8 text-slate-300" />
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Total de Horas
            </span>
            <div className="text-xl font-bold text-slate-900">{totalHoras.toFixed(2)} horas</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
            HE
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Valor Total Calculado
            </span>
            <div className="text-xl font-bold text-amber-700">{formatCurrency(totalValor)}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            R$
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select value={filtroPosto} onValueChange={setFiltroPosto}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Filtrar por Posto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Postos</SelectItem>
              {postos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Filtrar por Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Colaboradores</SelectItem>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Conferido">Conferido</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Recusado">Recusado</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-0.5">
            <Input
              type="date"
              placeholder="Data Início"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-0.5">
            <Input
              type="date"
              placeholder="Data Fim"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Batch Action Toolbar */}
      {permissions.canApproveHorasExtras && selectedIds.length > 0 && (
        <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Layers className="w-4 h-4 text-amber-100 shrink-0" />
            <span>
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'registro selecionado' : 'registros selecionados'} (
              {selectedTotalHours.toFixed(1)}h • {formatCurrency(selectedTotalValue)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openBatchModal('Aprovado')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Aprovar Selecionados ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBatchModal('Recusado')}
              className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200 text-xs font-semibold h-8 shadow-sm"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Recusar Selecionados ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-white hover:bg-amber-600 text-xs h-8 px-2"
            >
              Desmarcar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                {permissions.canApproveHorasExtras && (
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={handleToggleSelectAll}
                      disabled={pendingHorasExtras.length === 0}
                      aria-label="Selecionar todos os pendentes"
                    />
                  </TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">
                  Colaborador / Posto
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Data / Horário</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Horas</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Regra / %</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Valor Calculado</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Origem
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={permissions.canApproveHorasExtras ? 9 : 8}
                    className="text-center py-10 text-xs text-slate-500"
                  >
                    Carregando registros de horas extras...
                  </TableCell>
                </TableRow>
              ) : horasExtras.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={permissions.canApproveHorasExtras ? 9 : 8}
                    className="text-center py-12 text-xs text-slate-400"
                  >
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum lançamento de hora extra encontrado para os filtros informados.
                  </TableCell>
                </TableRow>
              ) : (
                horasExtras.map((h) => {
                  const isPending = h.status === 'Pendente'
                  const isSelected = selectedIds.includes(h.id)

                  return (
                    <TableRow
                      key={h.id}
                      className={`hover:bg-slate-50 ${isSelected ? 'bg-amber-50/60' : ''}`}
                    >
                      {permissions.canApproveHorasExtras && (
                        <TableCell className="text-center py-2.5">
                          {isPending ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelectOne(h.id)}
                              aria-label={`Selecionar ${h.colaborador?.nome || 'registro'}`}
                            />
                          ) : (
                            <span className="text-slate-300">•</span>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="py-2.5">
                        <div className="font-semibold text-xs text-slate-900">
                          {h.colaborador?.nome || 'Colaborador não identificado'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {h.posto?.nome || 'Base operacional'}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-700">
                        <div className="font-medium">{formatDateBR(h.data)}</div>
                        <div className="text-[11px] text-slate-500">
                          {h.entrada} às {h.saida}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs font-bold text-slate-800">
                        {h.quantidade_horas}h
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-600">
                        <span className="capitalize">{h.tipo_dia}</span> ({h.percentual}%)
                        {h.ajuste_manual && (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            ⚠️ Ajustado Manual
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-xs">
                        <div className="font-bold text-slate-900">
                          {formatCurrency(h.valor_calculado)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setViewHE(h)
                            setMemoriaModalOpen(true)
                          }}
                          className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"
                        >
                          <Info className="w-2.5 h-2.5" /> Memória
                        </button>
                      </TableCell>

                      <TableCell className="py-2.5 text-center">
                        {h.origem === 'Formulário Público' ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
                          >
                            <LinkIcon className="w-2.5 h-2.5 mr-1" /> Público
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-600">
                            Painel
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-center">
                        {getStatusBadge(h.status)}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {permissions.canApproveHorasExtras && h.status === 'Pendente' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openDecisionModal(h, 'Aprovado')}
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                title="Aprovar Hora Extra"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openDecisionModal(h, 'Recusado')}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                title="Recusar com Motivo"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/horas-extras/novo?editId=${h.id}`)}
                            className="h-7 w-7 text-slate-500 hover:text-amber-600"
                            title="Editar Registro / Ajuste Manual"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Batch Decision Dialog */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              {batchDecisionType === 'Aprovado'
                ? 'Aprovação em Lote de Horas Extras'
                : 'Recusa em Lote de Horas Extras'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Você está prestes a processar {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'registro selecionado' : 'registros selecionados'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1">
              <div>
                Registros Selecionados:{' '}
                <strong className="text-slate-900">{selectedIds.length}</strong>
              </div>
              <div>
                Total de Horas:{' '}
                <strong className="text-slate-900">{selectedTotalHours.toFixed(2)}h</strong>
              </div>
              <div>
                Valor Total:{' '}
                <strong className="text-emerald-700">{formatCurrency(selectedTotalValue)}</strong>
              </div>
            </div>

            {batchDecisionType === 'Recusado' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo da Recusa em Lote (Obrigatório) *
                </Label>
                <Input
                  required
                  placeholder="Ex: Horas extras não autorizadas para este período."
                  value={batchMotivoRecusa}
                  onChange={(e) => setBatchMotivoRecusa(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Confirma a aprovação de todos os {selectedIds.length} registros selecionados? Cada
                registro será atualizado com a data, horário e seu usuário como aprovador.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingBatch}
              onClick={handleConfirmBatchDecision}
              className={
                batchDecisionType === 'Aprovado'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold'
              }
            >
              {savingBatch
                ? 'Processando Lote...'
                : `Confirmar ${batchDecisionType === 'Aprovado' ? 'Aprovação' : 'Recusa'} (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Modal */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {decisionType === 'Aprovado' ? 'Aprovar Hora Extra' : 'Recusar Hora Extra'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedHE?.colaborador?.nome} • {formatDateBR(selectedHE?.data)} (
              {selectedHE?.quantidade_horas}h)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {decisionType === 'Recusado' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo da Recusa (Obrigatório) *
                </Label>
                <Input
                  required
                  placeholder="Ex: Hora extra não pré-autorizada pela supervisão."
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Confirma a aprovação do pagamento desta hora extra no valor de{' '}
                <span className="font-bold text-emerald-700">
                  {formatCurrency(selectedHE?.valor_calculado)}
                </span>
                ?
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDecisionModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingDecision}
              onClick={handleSaveDecision}
              className={
                decisionType === 'Aprovado'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold'
              }
            >
              {savingDecision ? 'Processando...' : `Confirmar ${decisionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Memória de Cálculo Dialog */}
      <Dialog open={memoriaModalOpen} onOpenChange={setMemoriaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Memória do Cálculo de Hora Extra
            </DialogTitle>
          </DialogHeader>

          {viewHE && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-mono">
                <div className="text-slate-500">Fórmula Aplicada:</div>
                <div className="font-semibold text-slate-900">
                  {viewHE.memoria_calculo ||
                    `${viewHE.quantidade_horas}h × ${formatCurrency(viewHE.valor_hora)} × (1 + ${viewHE.percentual}%) = ${formatCurrency(viewHE.valor_calculado)}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  Colaborador:{' '}
                  <span className="font-semibold text-slate-800">{viewHE.colaborador?.nome}</span>
                </div>
                <div>
                  Data:{' '}
                  <span className="font-semibold text-slate-800">{formatDateBR(viewHE.data)}</span>
                </div>
                <div>
                  Horário:{' '}
                  <span className="font-semibold text-slate-800">
                    {viewHE.entrada} às {viewHE.saida}
                  </span>
                </div>
                <div>
                  Tipo de Dia:{' '}
                  <span className="font-semibold text-slate-800 capitalize">{viewHE.tipo_dia}</span>
                </div>
                <div>
                  Percentual:{' '}
                  <span className="font-semibold text-slate-800">{viewHE.percentual}%</span>
                </div>
                <div>
                  Valor Hora Base:{' '}
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(viewHE.valor_hora)}
                  </span>
                </div>
              </div>

              {viewHE.ajuste_manual && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <span className="font-bold block">⚠️ Registro Ajustado Manualmente</span>
                  <span className="text-[11px] block mt-0.5">
                    Motivo: {viewHE.motivo_ajuste || 'Ajuste manual autorizado'}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setMemoriaModalOpen(false)} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
