import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import { trocasService, colaboradoresService, postosService } from '@/services/gestao-service'
import { TrocaPlantao, Colaborador, Posto, TrocaPlantaoStatus } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
  Shield,
  Briefcase,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  Check,
  X,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateBR, formatDateTimeBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { getPermissions } from '@/lib/permissions'

export default function TrocasPlantaoList() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { profile, user } = useAuth()
  const { toast } = useToast()
  const permissions = getPermissions(profile?.role)

  const [trocas, setTrocas] = useState<TrocaPlantao[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('todas')
  const [postoFilter, setPostoFilter] = useState('todos')

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formPostoId, setFormPostoId] = useState('none')
  const [formSolicitanteId, setFormSolicitanteId] = useState('')
  const [formSubstitutoId, setFormSubstitutoId] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0])
  const [formHorario, setFormHorario] = useState('07:00 às 19:00')
  const [formMotivo, setFormMotivo] = useState('')
  const [formObservacao, setFormObservacao] = useState('')
  const [savingCreate, setSavingCreate] = useState(false)

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const [selectedTroca, setSelectedTroca] = useState<TrocaPlantao | null>(null)
  const [decisionType, setDecisionType] = useState<'Autorizada' | 'Recusada'>('Autorizada')
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [savingDecision, setSavingDecision] = useState(false)

  // Batch Selection & Modal
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchDecisionType, setBatchDecisionType] = useState<'Autorizada' | 'Recusada'>(
    'Autorizada',
  )
  const [batchMotivoRecusa, setBatchMotivoRecusa] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [trocasData, colabsData, postosData] = await Promise.all([
        trocasService.list(selectedEmpresaId, {
          status: statusFilter,
          postoId: postoFilter,
        }),
        colaboradoresService.list(selectedEmpresaId),
        postosService.list(selectedEmpresaId),
      ])
      // Sort so 'Pendente' always comes first
      const sorted = [...trocasData].sort((a, b) => {
        if (a.status === 'Pendente' && b.status !== 'Pendente') return -1
        if (a.status !== 'Pendente' && b.status === 'Pendente') return 1
        return (b.created_at || '').localeCompare(a.created_at || '')
      })
      setTrocas(sorted)
      setColaboradores(colabsData.filter((c) => c.status === 'Ativo'))
      setPostos(postosData)
      setSelectedIds([])
    } catch (err) {
      console.error('Erro ao carregar trocas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId, statusFilter, postoFilter])

  const openCreate = () => {
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormPostoId('none')
    setFormSolicitanteId('')
    setFormSubstitutoId('')
    setFormData(new Date().toISOString().split('T')[0])
    setFormHorario('07:00 às 19:00')
    setFormMotivo('')
    setFormObservacao('')
    setCreateModalOpen(true)
  }

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formSolicitanteId || !formSubstitutoId) {
      toast({
        title: 'Atenção',
        description: 'Selecione o solicitante e o substituto.',
        variant: 'destructive',
      })
      return
    }
    if (formSolicitanteId === formSubstitutoId) {
      toast({
        title: 'Inválido',
        description: 'O colaborador substituto deve ser diferente do solicitante.',
        variant: 'destructive',
      })
      return
    }
    if (!formMotivo.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da troca.',
        variant: 'destructive',
      })
      return
    }

    setSavingCreate(true)
    try {
      await trocasService.create({
        empresa_id: formEmpresaId,
        posto_id: formPostoId !== 'none' ? formPostoId : null,
        solicitante_id: formSolicitanteId,
        substituto_id: formSubstitutoId,
        data: formData,
        horario: formHorario,
        motivo: formMotivo.trim(),
        observacao: formObservacao.trim() || null,
        status: 'Pendente',
        origem: 'Painel',
      })

      toast({
        title: 'Troca Registrada',
        description: 'Solicitação criada. Permanece PENDENTE até a validação da coordenação.',
      })
      setCreateModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar troca', description: err.message, variant: 'destructive' })
    } finally {
      setSavingCreate(false)
    }
  }

  const openDecision = (t: TrocaPlantao, type: 'Autorizada' | 'Recusada') => {
    setSelectedTroca(t)
    setDecisionType(type)
    setMotivoRecusa('')
    setDecisionModalOpen(true)
  }

  const handleConfirmDecision = async () => {
    if (!selectedTroca) return
    if (decisionType === 'Recusada' && !motivoRecusa.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe a justificativa da recusa da troca.',
        variant: 'destructive',
      })
      return
    }

    setSavingDecision(true)
    try {
      await trocasService.decide(selectedTroca.id, {
        status: decisionType,
        motivo_recusa: decisionType === 'Recusada' ? motivoRecusa : undefined,
        decidido_por: user?.id || 'admin',
        decidido_por_nome: profile?.nome || 'Administrador',
      })

      toast({
        title: `Troca ${decisionType}`,
        description: `A troca foi registrada como ${decisionType}.`,
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
  const pendingTrocas = trocas.filter((t) => t.status === 'Pendente')
  const allPendingSelected =
    pendingTrocas.length > 0 && pendingTrocas.every((t) => selectedIds.includes(t.id))

  const handleToggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingTrocas.map((t) => t.id))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const openBatchModal = (type: 'Autorizada' | 'Recusada') => {
    if (selectedIds.length === 0) return
    setBatchDecisionType(type)
    setBatchMotivoRecusa('')
    setBatchModalOpen(true)
  }

  const handleConfirmBatchDecision = async () => {
    if (selectedIds.length === 0) return
    if (batchDecisionType === 'Recusada' && !batchMotivoRecusa.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe a justificativa da recusa das trocas selecionadas.',
        variant: 'destructive',
      })
      return
    }

    const idsToProcess = trocas
      .filter((t) => selectedIds.includes(t.id) && t.status === 'Pendente')
      .map((t) => t.id)

    if (idsToProcess.length === 0) {
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
      await trocasService.batchDecide(idsToProcess, {
        status: batchDecisionType,
        motivo_recusa: batchDecisionType === 'Recusada' ? batchMotivoRecusa.trim() : undefined,
        decidido_por: user?.id || 'admin',
        decidido_por_nome: profile?.nome || 'Administrador',
      })

      toast({
        title: `Ação em Lote Concluída`,
        description: `${idsToProcess.length} troca(s) de plantão foram ${batchDecisionType.toLowerCase()}s com sucesso.`,
      })
      setBatchModalOpen(false)
      setSelectedIds([])
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro na Ação em Lote',
        description: err.message || 'Falha ao processar trocas em lote.',
        variant: 'destructive',
      })
    } finally {
      setSavingBatch(false)
    }
  }

  const getStatusBadge = (status: TrocaPlantaoStatus) => {
    switch (status) {
      case 'Autorizada':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
            Autorizada
          </Badge>
        )
      case 'Recusada':
        return <Badge className="bg-rose-100 text-rose-800 border-none text-[10px]">Recusada</Badge>
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">Pendente</Badge>
        )
    }
  }

  const pendentesCount = trocas.filter((t) => t.status === 'Pendente').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Troca de Plantão Operacional</h2>
          <p className="text-xs text-slate-500">
            O envio do formulário NÃO representa autorização. Requer validação explícita da
            coordenação/direção.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Registrar Troca
        </Button>
      </div>

      {/* Pendentes Callout Banner */}
      {pendentesCount > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-950 block">
                {pendentesCount}{' '}
                {pendentesCount === 1
                  ? 'Troca de plantão aguardando decisão'
                  : 'Trocas de plantão aguardando decisão'}
              </span>
              <span className="text-[11px] text-amber-800">
                Analise e aprove ou recuse para garantir a cobertura correta do posto.
              </span>
            </div>
          </div>
          <Badge className="bg-amber-600 text-white text-xs">{pendentesCount} Pendentes</Badge>
        </div>
      )}

      {/* Batch Action Toolbar */}
      {permissions.canApproveTrocas && selectedIds.length > 0 && (
        <div className="p-3 bg-amber-500 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Layers className="w-4 h-4 text-amber-100 shrink-0" />
            <span>
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'troca selecionada' : 'trocas selecionadas'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openBatchModal('Autorizada')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Autorizar Selecionadas ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openBatchModal('Recusada')}
              className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200 text-xs font-semibold h-8 shadow-sm"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Recusar Selecionadas ({selectedIds.length})
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

      {/* Filters */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Situações</SelectItem>
              <SelectItem value="Pendente">Apenas Pendentes</SelectItem>
              <SelectItem value="Autorizada">Autorizadas</SelectItem>
              <SelectItem value="Recusada">Recusadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={postoFilter} onValueChange={setPostoFilter}>
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                {permissions.canApproveTrocas && (
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={handleToggleSelectAll}
                      disabled={pendingTrocas.length === 0}
                      aria-label="Selecionar todas as trocas pendentes"
                    />
                  </TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">
                  Solicitante ➔ Substituto
                </TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">
                  Posto de Trabalho
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Data / Horário</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Motivo da Troca</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Origem
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">
                  Decisão
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      permissions.canApproveTrocas ? (isConsolidado ? 9 : 8) : isConsolidado ? 8 : 7
                    }
                    className="text-center py-10 text-xs text-slate-500"
                  >
                    Carregando trocas de plantão...
                  </TableCell>
                </TableRow>
              ) : trocas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      permissions.canApproveTrocas ? (isConsolidado ? 9 : 8) : isConsolidado ? 8 : 7
                    }
                    className="text-center py-12 text-xs text-slate-400"
                  >
                    <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhuma troca de plantão encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                trocas.map((t) => {
                  const isPending = t.status === 'Pendente'
                  const isSelected = selectedIds.includes(t.id)

                  return (
                    <TableRow
                      key={t.id}
                      className={`hover:bg-slate-50 ${isPending ? 'bg-amber-50/25 border-l-4 border-l-amber-500' : ''} ${isSelected ? 'bg-amber-50/60' : ''}`}
                    >
                      {permissions.canApproveTrocas && (
                        <TableCell className="text-center py-2.5">
                          {isPending ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelectOne(t.id)}
                              aria-label={`Selecionar troca de ${t.solicitante?.nome || 'registro'}`}
                            />
                          ) : (
                            <span className="text-slate-300">•</span>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="py-2.5">
                        <div className="font-semibold text-xs text-slate-900">
                          {t.solicitante?.nome || 'Solicitante'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>Substituto:</span>
                          <span className="font-semibold text-slate-700">
                            {t.substituto?.nome || 'Substituto'}
                          </span>
                        </div>
                      </TableCell>

                      {isConsolidado && (
                        <TableCell className="text-xs text-slate-600">{t.empresa?.nome}</TableCell>
                      )}

                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {t.posto?.nome || 'Base operacional'}
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-700">
                        <div className="font-medium">{formatDateBR(t.data)}</div>
                        <div className="text-[11px] text-slate-500">{t.horario}</div>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-600 max-w-xs">
                        <div className="line-clamp-2 italic">"{t.motivo}"</div>
                        {t.status === 'Recusada' && t.motivo_recusa && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            Recusa: {t.motivo_recusa}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-center">
                        {t.origem === 'Formulário Público' ? (
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
                        {getStatusBadge(t.status)}
                        {t.decidido_por_nome && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Por {t.decidido_por_nome}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        {isPending && permissions.canApproveTrocas ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => openDecision(t, 'Autorizada')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Autorizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDecision(t, 'Recusada')}
                              className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs h-7 px-2.5"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Recusar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Concluída</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Registrar Solicitação de Troca de Plantão
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A troca entrará como Pendente e precisará da aprovação da coordenação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
                <Select value={formEmpresaId} onValueChange={setFormEmpresaId}>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Colaborador Solicitante *
                  </Label>
                  <Select value={formSolicitanteId} onValueChange={setFormSolicitanteId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Quem vai faltar" />
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Colaborador Substituto *
                  </Label>
                  <Select value={formSubstitutoId} onValueChange={setFormSubstitutoId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Quem vai cobrir" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores
                        .filter((c) => c.id !== formSolicitanteId)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Posto de Serviço</Label>
                <Select value={formPostoId} onValueChange={setFormPostoId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o posto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Base / Sem Posto Específico</SelectItem>
                    {postos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Data do Plantão *</Label>
                  <Input
                    type="date"
                    required
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Horário Previsto *</Label>
                  <Input
                    required
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Motivo da Troca *</Label>
                <Textarea
                  required
                  placeholder="Justificativa da substituição..."
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingCreate}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {savingCreate ? 'Gravando...' : 'Registrar Troca'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Decision Modal */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {decisionType === 'Autorizada'
                ? 'Autorizar Troca de Plantão'
                : 'Recusar Troca de Plantão'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedTroca?.solicitante?.nome} ➔ {selectedTroca?.substituto?.nome} (
              {formatDateBR(selectedTroca?.data)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {decisionType === 'Recusada' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo da Recusa (Obrigatório) *
                </Label>
                <Input
                  required
                  placeholder="Ex: Substituto já está em escala de 12h consecutiva."
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Você confirma a autorização da substituição? O histórico de decisão ficará
                registrado com seu usuário.
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
              onClick={handleConfirmDecision}
              className={
                decisionType === 'Autorizada'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold'
              }
            >
              {savingDecision ? 'Processando...' : `Confirmar ${decisionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Decision Modal */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              {batchDecisionType === 'Autorizada'
                ? 'Autorização em Lote de Trocas'
                : 'Recusa em Lote de Trocas'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Você está prestes a processar {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'troca selecionada' : 'trocas selecionadas'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1">
              <div>
                Trocas Selecionadas:{' '}
                <strong className="text-slate-900">{selectedIds.length}</strong>
              </div>
              <div className="text-[11px] text-slate-500">
                A decisão será aplicada simultaneamente em todos os registros selecionados.
              </div>
            </div>

            {batchDecisionType === 'Recusada' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Motivo da Recusa em Lote (Obrigatório) *
                </Label>
                <Input
                  required
                  placeholder="Ex: Não autorizado devido a incompatibilidade de turnos."
                  value={batchMotivoRecusa}
                  onChange={(e) => setBatchMotivoRecusa(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Confirma a autorização de todas as {selectedIds.length} trocas selecionadas? Os
                registros ficarão marcados com seu usuário e data/hora atual.
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
                batchDecisionType === 'Autorizada'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold'
              }
            >
              {savingBatch
                ? 'Processando Lote...'
                : `Confirmar ${batchDecisionType === 'Autorizada' ? 'Autorização' : 'Recusa'} (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
