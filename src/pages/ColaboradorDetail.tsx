import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useEmpresa } from '@/hooks/use-empresa'
import {
  colaboradoresService,
  postosService,
  escalasService,
  horasExtrasService,
  valeTransporteService,
  uniformesService,
  documentosService,
  historicoService,
} from '@/services/gestao-service'
import {
  Colaborador,
  Posto,
  Escala,
  HoraExtra,
  ValeTransporte,
  UniformeEPI,
  DocumentoItem,
  AlteracaoHistorico,
} from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ArrowLeft,
  Edit,
  Save,
  Shield,
  Briefcase,
  Clock,
  Bus,
  Shirt,
  FileText,
  History,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Plus,
} from 'lucide-react'
import { formatCPF, formatCurrency, formatDateBR, formatDateTimeBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function ColaboradorDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile } = useAuth()
  const { empresas } = useEmpresa()

  const [colaborador, setColaborador] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')
  const [saving, setSaving] = useState(false)

  // Aux state for lists
  const [postos, setPostos] = useState<Posto[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([])
  const [vtList, setVtList] = useState<ValeTransporte[]>([])
  const [uniformes, setUniformes] = useState<UniformeEPI[]>([])
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])
  const [historico, setHistorico] = useState<AlteracaoHistorico[]>([])

  // Inativation Modal
  const [inativarModalOpen, setInativarModalOpen] = useState(false)
  const [motivoInativacao, setMotivoInativacao] = useState('')

  // Edit form state
  const [formData, setFormData] = useState<Partial<Colaborador>>({})
  const [selectedPostosIds, setSelectedPostosIds] = useState<string[]>([])

  const loadColaborador = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await colaboradoresService.getById(id)
      setColaborador(data)
      setFormData(data)
      const vinculadosIds =
        data.postos_vinculados?.map((p) => p.id) || (data.posto_id ? [data.posto_id] : [])
      setSelectedPostosIds(vinculadosIds)

      const [pList, eList, heList, vtData, uniData, docsData, histData] = await Promise.all([
        postosService.list(data.empresa_id),
        escalasService.list(data.empresa_id),
        horasExtrasService.list(data.empresa_id, { colaboradorId: id }),
        valeTransporteService.list(data.empresa_id),
        uniformesService.list(data.empresa_id, id),
        documentosService.list(data.empresa_id, id),
        historicoService.listByRecord('colaboradores', id),
      ])

      setPostos(pList)
      setEscalas(eList)
      setHorasExtras(heList)
      setVtList(vtData.filter((v) => v.colaborador_id === id))
      setUniformes(uniData)
      setDocumentos(docsData)
      setHistorico(histData)
    } catch (err) {
      console.error('Erro ao carregar colaborador:', err)
      toast({ title: 'Erro', description: 'Colaborador não encontrado.', variant: 'destructive' })
      navigate('/colaboradores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadColaborador()
  }, [id])

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !colaborador) return

    setSaving(true)
    try {
      await colaboradoresService.update(
        id,
        {
          ...formData,
          postos_ids: selectedPostosIds,
          valor_hora_base: Number(formData.valor_hora_base) || 15,
          valor_diario_vt: Number(formData.valor_diario_vt) || 0,
        },
        {
          previous: colaborador,
          userId: profile?.id,
          userName: profile?.nome,
          motivo: 'Atualização de dados cadastrais pelo painel',
        },
      )

      toast({
        title: 'Alterações salvas',
        description: 'O cadastro do colaborador foi atualizado com sucesso.',
      })
      setIsEditing(false)
      loadColaborador()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmInativacao = async () => {
    if (!id || !colaborador) return
    setSaving(true)
    try {
      await colaboradoresService.update(
        id,
        {
          status: 'Inativo',
          motivo_inativacao: motivoInativacao || 'Desligamento de colaborador',
        },
        {
          previous: colaborador,
          userId: profile?.id,
          userName: profile?.nome,
          motivo: `Desligamento / Inativação: ${motivoInativacao || 'Sem motivo informado'}`,
        },
      )

      toast({
        title: 'Colaborador Inativado',
        description:
          'O colaborador foi marcado como Inativo e todo o seu histórico permanece preservado.',
      })
      setInativarModalOpen(false)
      loadColaborador()
    } catch (err: any) {
      toast({ title: 'Erro ao inativar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !colaborador) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Carregando informações do colaborador...
      </div>
    )
  }

  const isHammer =
    colaborador.empresa?.tipo === 'seguranca' ||
    colaborador.empresa?.nome.toLowerCase().includes('hammer')

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/colaboradores')}
          className="text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar para Lista
        </Button>

        <div className="flex items-center gap-2">
          {colaborador.status === 'Ativo' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInativarModalOpen(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
            >
              <UserX className="w-3.5 h-3.5 mr-1" /> Desligar / Inativar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await colaboradoresService.update(
                  colaborador.id,
                  { status: 'Ativo' },
                  {
                    previous: colaborador,
                    userId: profile?.id,
                    userName: profile?.nome,
                    motivo: 'Reativação de colaborador',
                  },
                )
                toast({ title: 'Reativado', description: 'Colaborador reativado com sucesso.' })
                loadColaborador()
              }}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" /> Reativar Colaborador
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            {isEditing ? 'Cancelar Edição' : 'Editar Cadastro'}
          </Button>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4" />
        <CardContent className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg border border-slate-200">
                <div className="w-full h-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xl">
                  {colaborador.foto_url ? (
                    <img
                      src={colaborador.foto_url}
                      alt={colaborador.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    colaborador.nome.charAt(0)
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{colaborador.nome}</h2>
                  <Badge
                    className={
                      colaborador.status === 'Ativo'
                        ? 'bg-emerald-100 text-emerald-800'
                        : colaborador.status === 'Inativo'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {colaborador.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{colaborador.cargo}</span>
                  <span>•</span>
                  <span>CPF: {formatCPF(colaborador.cpf)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {isHammer ? (
                      <Shield className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Briefcase className="w-3 h-3 text-sky-600" />
                    )}
                    {colaborador.empresa?.nome}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500">
              <div>
                Admissão:{' '}
                <span className="font-semibold text-slate-700">
                  {formatDateBR(colaborador.data_admissao)}
                </span>
              </div>
              <div>
                Posto(s):{' '}
                <span className="font-semibold text-slate-700">
                  {colaborador.postos_vinculados && colaborador.postos_vinculados.length > 0
                    ? colaborador.postos_vinculados.map((p) => p.nome).join(', ')
                    : colaborador.posto?.nome || 'Base'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
          <TabsTrigger value="dados" className="text-xs">
            Dados Cadastrais
          </TabsTrigger>
          <TabsTrigger value="horas" className="text-xs">
            Horas Extras ({horasExtras.length})
          </TabsTrigger>
          <TabsTrigger value="vt" className="text-xs">
            Vale-Transporte ({vtList.length})
          </TabsTrigger>
          <TabsTrigger value="uniformes" className="text-xs">
            Uniformes & EPIs ({uniformes.length})
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs">
            Documentos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs">
            Histórico Audit ({historico.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DADOS */}
        <TabsContent value="dados">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Card className="border-slate-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-800">
                    Editar Cadastro do Colaborador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Nome Completo</Label>
                      <Input
                        value={formData.nome || ''}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Cargo / Função</Label>
                      <Input
                        value={formData.cargo || ''}
                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Posto Principal
                      </Label>
                      <Select
                        value={formData.posto_id || 'none'}
                        onValueChange={(v) => {
                          const val = v === 'none' ? null : v
                          setFormData({ ...formData, posto_id: val })
                          if (val && !selectedPostosIds.includes(val)) {
                            setSelectedPostosIds([...selectedPostosIds, val])
                          }
                        }}
                      >
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

                    {/* Multi-select de Postos de Atuação */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800">
                          Postos de Atuação Vinculados (Múltiplos Postos)
                        </Label>
                        <span className="text-[11px] text-slate-500">
                          {selectedPostosIds.length} posto(s) vinculado(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {postos.map((p) => {
                          const isChecked = selectedPostosIds.includes(p.id)
                          const isPrincipal = formData.posto_id === p.id
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-amber-50/80 border-amber-300 text-slate-900 font-medium'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPostosIds([...selectedPostosIds, p.id])
                                    if (!formData.posto_id)
                                      setFormData({ ...formData, posto_id: p.id })
                                  } else {
                                    const updated = selectedPostosIds.filter((pid) => pid !== p.id)
                                    setSelectedPostosIds(updated)
                                    if (formData.posto_id === p.id) {
                                      setFormData({ ...formData, posto_id: updated[0] || null })
                                    }
                                  }
                                }}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold text-slate-800">
                                  {p.nome}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {p.cliente}
                                </div>
                                {isPrincipal && (
                                  <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                    Principal
                                  </span>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Telefone</Label>
                      <Input
                        value={formData.telefone || ''}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
                      <Input
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Valor Hora Base (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_hora_base || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, valor_hora_base: Number(e.target.value) })
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Código RH</Label>
                      <Input
                        value={formData.codigo_rh || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, codigo_rh: e.target.value || null })
                        }
                        placeholder="Ex: 97"
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">
                        Carga horária mensal
                      </Label>
                      <Input
                        type="number"
                        value={formData.carga_horaria_mensal ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            carga_horaria_mensal: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="Ex: 220"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Situação RH</Label>
                      <Input
                        value={formData.situacao_rh || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, situacao_rh: e.target.value || null })
                        }
                        placeholder="Ex: 1"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {isHammer && (
                    <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/70 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-exige-vigilancia"
                          checked={formData.exige_vigilancia || false}
                          onChange={(e) =>
                            setFormData({ ...formData, exige_vigilancia: e.target.checked })
                          }
                          className="h-4 w-4 text-amber-500 rounded"
                        />
                        <Label
                          htmlFor="edit-exige-vigilancia"
                          className="text-xs font-bold text-slate-800 cursor-pointer"
                        >
                          Exige Documentação de Vigilância (CNV / Reciclagem)
                        </Label>
                      </div>

                      {formData.exige_vigilancia && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Nº CNV
                            </Label>
                            <Input
                              value={formData.cnv_numero || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, cnv_numero: e.target.value })
                              }
                              className="text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Validade CNV
                            </Label>
                            <Input
                              type="date"
                              value={formData.cnv_validade || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, cnv_validade: e.target.value })
                              }
                              className="text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-700">
                              Próx. Reciclagem
                            </Label>
                            <Input
                              type="date"
                              value={formData.proximo_vencimento_reciclagem || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  proximo_vencimento_reciclagem: e.target.value,
                                })
                              }
                              className="text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
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
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {saving ? 'Gravando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Dados Pessoais & Profissionais */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Informações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Data de Nascimento:</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateBR(colaborador.data_nascimento)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Telefone:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.telefone || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="font-semibold text-slate-800">{colaborador.email || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Postos de Atuação:</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {colaborador.postos_vinculados && colaborador.postos_vinculados.length > 0
                        ? colaborador.postos_vinculados.map((p) => p.nome).join(', ')
                        : colaborador.posto?.nome || 'Base / Sem posto'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Escala / Turno:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.escala?.nome || 'Escala Padrão'} ({colaborador.turno})
                      {colaborador.escala?.tipo === '12x36' && colaborador.escala?.par_impar && (
                        <span className="ml-1 text-xs font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          12x36 {colaborador.escala.par_impar === 'par' ? 'Dia Par' : 'Dia Ímpar'}{' '}
                          (Base Set/26)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Horário:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.horario || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Valor Hora Base:</span>
                    <span className="font-bold text-amber-700">
                      {formatCurrency(colaborador.valor_hora_base)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-100">
                    <span className="text-slate-500">Código RH:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {colaborador.codigo_rh || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Carga horária mensal:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.carga_horaria_mensal
                        ? `${colaborador.carga_horaria_mensal}h`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Situação RH:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.situacao_rh || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card Uniforme & Benefícios */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Benefícios & Tamanhos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Cartão VT:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.numero_cartao_vt || 'Não cadastrado'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tipo / Valor Diário VT:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.tipo_transporte} ({formatCurrency(colaborador.valor_diario_vt)})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tamanho Camisa:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.tamanho_camisa || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tamanho Calça:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.tamanho_calca || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Número Calçado:</span>
                    <span className="font-semibold text-slate-800">
                      {colaborador.numero_calcado || '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Documentação Vigilância Card (se aplicável) */}
              {isHammer && colaborador.exige_vigilancia && (
                <Card className="md:col-span-2 border-amber-200 bg-amber-50/40 shadow-sm">
                  <CardHeader className="pb-2 border-b border-amber-200/60">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Documentação Obrigatória de Vigilância
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Número da CNV:</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {colaborador.cnv_numero || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Validade CNV:</span>
                      <span className="font-semibold text-slate-900">
                        {formatDateBR(colaborador.cnv_validade)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Próx. Reciclagem:</span>
                      <span className="font-semibold text-slate-900">
                        {formatDateBR(colaborador.proximo_vencimento_reciclagem)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HORAS EXTRAS */}
        <TabsContent value="horas">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Histórico de Horas Extras
                </CardTitle>
                <CardDescription className="text-xs">
                  Lançamentos registrados e calculados para este colaborador.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/horas-extras/novo')}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova HE
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Data</TableHead>
                    <TableHead className="text-xs font-bold">Horário</TableHead>
                    <TableHead className="text-xs font-bold">Qtde Horas</TableHead>
                    <TableHead className="text-xs font-bold">Tipo Dia</TableHead>
                    <TableHead className="text-xs font-bold">Valor Calculado</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horasExtras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-400">
                        Nenhuma hora extra registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    horasExtras.map((h) => (
                      <TableRow key={h.id} className="text-xs">
                        <TableCell className="font-medium">{formatDateBR(h.data)}</TableCell>
                        <TableCell>
                          {h.entrada} às {h.saida}
                        </TableCell>
                        <TableCell>{h.quantidade_horas}h</TableCell>
                        <TableCell className="capitalize">
                          {h.tipo_dia} ({h.percentual}%)
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatCurrency(h.valor_calculado)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {h.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VALE-TRANSPORTE */}
        <TabsContent value="vt">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">
                Histórico Mensal de Vale-Transporte
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Competência</TableHead>
                    <TableHead className="text-xs font-bold">Dias Previstos</TableHead>
                    <TableHead className="text-xs font-bold">Valor Previsto</TableHead>
                    <TableHead className="text-xs font-bold">Valor Depositado</TableHead>
                    <TableHead className="text-xs font-bold">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vtList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400">
                        Nenhum registro mensal de VT localizado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vtList.map((v) => (
                      <TableRow key={v.id} className="text-xs">
                        <TableCell className="font-semibold">{v.competencia}</TableCell>
                        <TableCell>{v.dias_previstos} dias</TableCell>
                        <TableCell>{formatCurrency(v.valor_previsto)}</TableCell>
                        <TableCell>{formatCurrency(v.valor_depositado)}</TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatCurrency(v.diferenca)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: UNIFORMES & EPIS */}
        <TabsContent value="uniformes">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">
                Entregas e Devoluções de Fardamento / EPIs
              </CardTitle>
              <Button
                size="sm"
                onClick={() => navigate('/uniformes-epis')}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova Entrega
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Data</TableHead>
                    <TableHead className="text-xs font-bold">Item</TableHead>
                    <TableHead className="text-xs font-bold">Tamanho</TableHead>
                    <TableHead className="text-xs font-bold">Qtd</TableHead>
                    <TableHead className="text-xs font-bold">Movimento</TableHead>
                    <TableHead className="text-xs font-bold">Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniformes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-400">
                        Nenhum fardamento ou EPI registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    uniformes.map((u) => (
                      <TableRow key={u.id} className="text-xs">
                        <TableCell>{formatDateBR(u.data_movimentacao)}</TableCell>
                        <TableCell className="font-semibold">{u.item}</TableCell>
                        <TableCell>{u.tamanho || '-'}</TableCell>
                        <TableCell>{u.quantidade}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {u.tipo_movimentacao}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.responsavel_entrega}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: DOCUMENTOS */}
        <TabsContent value="documentos">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-slate-800">
                Documentos e Certificados
              </CardTitle>
              <Button
                size="sm"
                onClick={() => navigate('/documentos')}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo Documento
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Documento</TableHead>
                    <TableHead className="text-xs font-bold">Tipo</TableHead>
                    <TableHead className="text-xs font-bold">Vencimento</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">
                        Nenhum documento anexado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentos.map((d) => (
                      <TableRow key={d.id} className="text-xs">
                        <TableCell className="font-semibold">{d.titulo}</TableCell>
                        <TableCell>{d.tipo_documento}</TableCell>
                        <TableCell>{formatDateBR(d.data_vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: HISTÓRICO AUDIT */}
        <TabsContent value="historico">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                Trilha de Auditoria e Alterações
              </CardTitle>
              <CardDescription className="text-xs">
                Todas as edições em campos-chave deste colaborador registradas permanentemente.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-bold">Campo Alterado</TableHead>
                    <TableHead className="text-xs font-bold">Valor Anterior</TableHead>
                    <TableHead className="text-xs font-bold">Novo Valor</TableHead>
                    <TableHead className="text-xs font-bold">Usuário Responsável</TableHead>
                    <TableHead className="text-xs font-bold">Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Nenhuma alteração registrada após a criação inicial.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historico.map((h) => (
                      <TableRow key={h.id} className="text-xs">
                        <TableCell className="text-slate-500 whitespace-nowrap">
                          {formatDateTimeBR(h.created_at)}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800 uppercase">
                          {h.campo}
                        </TableCell>
                        <TableCell className="text-rose-700 bg-rose-50/50 max-w-[150px] truncate">
                          {h.valor_anterior || '-'}
                        </TableCell>
                        <TableCell className="text-emerald-700 bg-emerald-50/50 max-w-[150px] truncate">
                          {h.valor_novo || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {h.usuario_nome || 'Sistema'}
                        </TableCell>
                        <TableCell className="text-slate-500 italic">{h.motivo || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inativação Modal */}
      <Dialog open={inativarModalOpen} onOpenChange={setInativarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Desligamento / Inativação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nenhum dado é excluído do sistema. O colaborador será marcado como Inativo e seu
              histórico permanecerá intacto para relatórios e auditorias.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold text-slate-700">
              Motivo do Desligamento / Inativação (Obrigatório) *
            </Label>
            <Input
              placeholder="Ex: Demissão sem justa causa / Pedido de demissão"
              value={motivoInativacao}
              onChange={(e) => setMotivoInativacao(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInativarModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={saving || !motivoInativacao.trim()}
              onClick={handleConfirmInativacao}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {saving ? 'Processando...' : 'Confirmar Inativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
