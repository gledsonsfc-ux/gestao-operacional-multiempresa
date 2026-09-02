import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { escalasService, postosService } from '@/services/gestao-service'
import { Escala, Posto, EscalaTipo, ParImparTipo } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateParidadeMes, MESES_NOMES } from '@/lib/escalas-calculator'
import { useAuth } from '@/hooks/use-auth'
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
import { CalendarDays, Plus, Edit, Clock, Shield, Briefcase, Building2, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EscalasList() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { toast } = useToast()
  const { profile } = useAuth()

  const [escalas, setEscalas] = useState<Escala[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)

  // Filtro de Mês/Ano para visualização da paridade calculada automaticamente
  const [selectedMonth, setSelectedMonth] = useState<number>(9) // 9 = Setembro (Mês Base)
  const [selectedYear, setSelectedYear] = useState<number>(2026) // 2026

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formTipo, setFormTipo] = useState<EscalaTipo>('12x36')
  const [formParImpar, setFormParImpar] = useState<ParImparTipo>('par')
  const [formPeriodo, setFormPeriodo] = useState<'Diurno' | 'Noturno' | 'Misto'>('Diurno')
  const [formHoraEntrada, setFormHoraEntrada] = useState('07:00')
  const [formHoraSaida, setFormHoraSaida] = useState('19:00')
  const [formPostoId, setFormPostoId] = useState<string>('none')
  const [formObservacoes, setFormObservacoes] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [escalasData, postosData] = await Promise.all([
        escalasService.list(selectedEmpresaId),
        postosService.list(selectedEmpresaId),
      ])
      setEscalas(escalasData)
      setPostos(postosData)
    } catch (err) {
      console.error('Erro ao carregar escalas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId])

  const openCreateModal = () => {
    setEditingEscala(null)
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormNome('Escala 12x36 Diurna - Par')
    setFormTipo('12x36')
    setFormParImpar('par')
    setFormPeriodo('Diurno')
    setFormHoraEntrada('07:00')
    setFormHoraSaida('19:00')
    setFormPostoId('none')
    setFormObservacoes('')
    setModalOpen(true)
  }

  const openEditModal = (esc: Escala) => {
    setEditingEscala(esc)
    setFormEmpresaId(esc.empresa_id)
    setFormNome(esc.nome)
    setFormTipo(esc.tipo)
    setFormParImpar(esc.par_impar)
    setFormPeriodo(esc.periodo)
    setFormHoraEntrada(esc.hora_entrada.slice(0, 5))
    setFormHoraSaida(esc.hora_saida.slice(0, 5))
    setFormPostoId(esc.posto_id || 'none')
    setFormObservacoes(esc.observacoes || '')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'Informe o nome de identificação da escala.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Escala> = {
        empresa_id: formEmpresaId,
        nome: formNome.trim(),
        tipo: formTipo,
        par_impar: formTipo === '12x36' ? formParImpar : 'nao_se_aplica',
        periodo: formPeriodo,
        hora_entrada: formHoraEntrada,
        hora_saida: formHoraSaida,
        posto_id: formPostoId !== 'none' ? formPostoId : null,
        observacoes: formObservacoes.trim() || null,
        ativo: true,
      }

      if (editingEscala) {
        await escalasService.update(editingEscala.id, payload, {
          previous: editingEscala,
          userId: profile?.id,
          userName: profile?.nome,
          motivo: 'Alteração manual de parâmetros da escala (paridade base)',
        })
        toast({ title: 'Escala atualizada', description: `${formNome} foi salva com sucesso.` })
      } else {
        await escalasService.create(payload)
        toast({ title: 'Escala criada', description: `${formNome} foi cadastrada.` })
      }
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case '12x36':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">12x36</Badge>
      case '5x2':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">5x2</Badge>
      case '6x1':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">6x1</Badge>
      default:
        return <Badge variant="secondary">{tipo}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Escalas e Jornadas de Trabalho</h2>
          <p className="text-xs text-slate-500">
            Configure jornadas 12x36 (Par/Ímpar com virada automática de mês de 31 dias), 5x2, 6x1
            ou personalizadas.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Escala
        </Button>
      </div>

      {/* Card de Controle de Competência / Simulação de Virada de Mês 12x36 */}
      <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Competência de Cálculo de Paridade 12x36
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-white border-amber-300 text-amber-800"
              >
                Base: Setembro/2026 (31d)
              </Badge>
            </div>
            <p className="text-xs text-slate-600">
              Ao virar de um mês com 31 dias para o seguinte, a paridade (Par/Ímpar) inverte
              automaticamente. Em meses com 28, 29 ou 30 dias, a paridade se mantém.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="w-36 text-xs bg-white h-8 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES_NOMES.map((nome, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 text-xs bg-white h-8 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Nome da Escala</TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">Tipo de Jornada</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">
                  Paridade em {MESES_NOMES[selectedMonth - 1]}/{selectedYear}
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">
                  Paridade Base (Set/26)
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Turno & Horário</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Posto Vinculado</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                    Carregando escalas...
                  </TableCell>
                </TableRow>
              ) : escalas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhuma escala cadastrada para esta empresa.
                  </TableCell>
                </TableRow>
              ) : (
                escalas.map((esc) => {
                  const calculatedParidade =
                    esc.tipo === '12x36'
                      ? calculateParidadeMes(esc.par_impar, selectedYear, selectedMonth)
                      : 'nao_se_aplica'

                  const hasShift =
                    esc.tipo === '12x36' &&
                    esc.par_impar !== 'nao_se_aplica' &&
                    calculatedParidade !== esc.par_impar

                  return (
                    <TableRow key={esc.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-xs text-slate-900">
                        {esc.nome}
                      </TableCell>

                      {isConsolidado && (
                        <TableCell className="text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            {esc.empresa?.tipo === 'seguranca' ? (
                              <Shield className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Briefcase className="w-3 h-3 text-sky-600" />
                            )}
                            {esc.empresa?.nome}
                          </span>
                        </TableCell>
                      )}

                      <TableCell>{getTipoBadge(esc.tipo)}</TableCell>

                      {/* Paridade Calculada para o mês selecionado */}
                      <TableCell className="text-xs text-slate-700">
                        {esc.tipo === '12x36' && calculatedParidade !== 'nao_se_aplica' ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[11px] font-bold uppercase ${
                                calculatedParidade === 'par'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                  : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                              }`}
                            >
                              Dia {calculatedParidade}
                            </Badge>
                            {hasShift && (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                                Inverteu
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </TableCell>

                      {/* Paridade Base Setembro/2026 */}
                      <TableCell className="text-xs text-slate-600 capitalize">
                        {esc.par_impar === 'nao_se_aplica' ? (
                          '-'
                        ) : (
                          <span className="font-mono text-[11px] text-slate-500">
                            Base: {esc.par_impar}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-700">
                        <div className="font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {esc.hora_entrada?.slice(0, 5)} às {esc.hora_saida?.slice(0, 5)}
                        </div>
                        <span className="text-[10px] text-slate-400">{esc.periodo}</span>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {esc.posto?.nome ? (
                          <span className="font-medium text-slate-800">{esc.posto.nome}</span>
                        ) : (
                          <span className="text-slate-400 italic">Geral / Sem Posto</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(esc)}
                          className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
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
                {editingEscala ? 'Editar Escala' : 'Nova Escala de Trabalho'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Parâmetros de jornada operacional para alocação de efetivo.
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome da Escala *</Label>
                <Input
                  required
                  placeholder="Ex: 12x36 Noturno - Ímpar (Portaria)"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Escala</Label>
                  <Select value={formTipo} onValueChange={(v: any) => setFormTipo(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12x36">12x36</SelectItem>
                      <SelectItem value="5x2">5x2</SelectItem>
                      <SelectItem value="6x1">6x1</SelectItem>
                      <SelectItem value="Personalizada">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formTipo === '12x36' ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Paridade Base (Setembro/2026)
                    </Label>
                    <Select value={formParImpar} onValueChange={(v: any) => setFormParImpar(v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="par">Dias Pares (Base Set/26)</SelectItem>
                        <SelectItem value="impar">Dias Ímpares (Base Set/26)</SelectItem>
                        <SelectItem value="nao_se_aplica">Flexível / Não se aplica</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500">
                      Calcula virada automática nos meses de 31 dias.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Período</Label>
                    <Select value={formPeriodo} onValueChange={(v: any) => setFormPeriodo(v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diurno">Diurno</SelectItem>
                        <SelectItem value="Noturno">Noturno</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Entrada (HH:mm)</Label>
                  <Input
                    type="time"
                    required
                    value={formHoraEntrada}
                    onChange={(e) => setFormHoraEntrada(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Saída (HH:mm)</Label>
                  <Input
                    type="time"
                    required
                    value={formHoraSaida}
                    onChange={(e) => setFormHoraSaida(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Posto Vinculado (Opcional)
                </Label>
                <Select value={formPostoId} onValueChange={setFormPostoId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Geral / Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral / Sem Posto Específico</SelectItem>
                    {postos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {saving ? 'Gravando...' : 'Salvar Escala'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
