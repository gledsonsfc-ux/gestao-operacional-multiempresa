import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { horaExtraConfigsService } from '@/services/gestao-service'
import { HoraExtraConfig, Feriado } from '@/types/gestao'
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
  Sliders,
  Calendar,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle2,
  Shield,
  Briefcase,
} from 'lucide-react'
import { formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function HorasExtrasConfig() {
  const { selectedEmpresaId, empresas } = useEmpresa()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [configs, setConfigs] = useState<(HoraExtraConfig & { empresa: any })[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Regra
  const [regraModalOpen, setRegraModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<HoraExtraConfig | null>(null)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formTipoDia, setFormTipoDia] = useState<
    'normal' | 'domingo' | 'feriado' | 'adicional_noturno' | 'outro'
  >('normal')
  const [formPercentual, setFormPercentual] = useState('50.00')
  const [formAtivo, setFormAtivo] = useState(true)

  // Modal Feriado
  const [feriadoModalOpen, setFeriadoModalOpen] = useState(false)
  const [feriadoData, setFeriadoData] = useState('')
  const [feriadoDescricao, setFeriadoDescricao] = useState('')
  const [feriadoTipo, setFeriadoTipo] = useState('Nacional')

  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [allConfigs, allFeriados] = await Promise.all([
        horaExtraConfigsService.listAllConfigs(),
        horaExtraConfigsService.listFeriados(),
      ])
      setConfigs(allConfigs)
      setFeriados(allFeriados)
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId])

  const openNewConfigModal = () => {
    setEditingConfig(null)
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormNome('Hora Extra Adicional (60%)')
    setFormTipoDia('outro')
    setFormPercentual('60.00')
    setFormAtivo(true)
    setRegraModalOpen(true)
  }

  const openEditConfigModal = (conf: HoraExtraConfig) => {
    setEditingConfig(conf)
    setFormEmpresaId(conf.empresa_id)
    setFormNome(conf.nome)
    setFormTipoDia(conf.tipo_dia)
    setFormPercentual(String(conf.percentual))
    setFormAtivo(conf.ativo)
    setRegraModalOpen(true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await horaExtraConfigsService.saveConfig({
        id: editingConfig?.id,
        empresa_id: formEmpresaId,
        nome: formNome.trim(),
        tipo_dia: formTipoDia,
        percentual: Number(formPercentual),
        ativo: formAtivo,
      })

      toast({ title: 'Regra salva', description: 'A regra de cálculo foi atualizada com sucesso.' })
      setRegraModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar regra', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFeriado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feriadoData || !feriadoDescricao.trim()) return

    setSaving(true)
    try {
      await horaExtraConfigsService.saveFeriado({
        data: feriadoData,
        descricao: feriadoDescricao.trim(),
        tipo: feriadoTipo,
      })

      toast({
        title: 'Feriado cadastrado',
        description: 'O dia será reconhecido automaticamente no cálculo.',
      })
      setFeriadoModalOpen(false)
      setFeriadoData('')
      setFeriadoDescricao('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar feriado', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFeriado = async (id: string) => {
    try {
      await horaExtraConfigsService.deleteFeriado(id)
      toast({ title: 'Feriado removido', description: 'Registro excluído.' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
              Regras e Parâmetros de Horas Extras
            </h2>
            <p className="text-xs text-slate-500">
              Percentuais configuráveis por empresa (nada fixo no código) e calendário de feriados
              automáticos.
            </p>
          </div>
        </div>
      </div>

      {/* Regras por Empresa */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              Tabela de Percentuais por Empresa
            </CardTitle>
            <CardDescription className="text-xs">
              Hammer Segurança e Inteligência e Serviços possuem conjuntos de regras 100%
              independentes.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={openNewConfigModal}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova Regra
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">Empresa</TableHead>
                <TableHead className="text-xs font-bold">Nome da Regra</TableHead>
                <TableHead className="text-xs font-bold">Tipo de Dia</TableHead>
                <TableHead className="text-xs font-bold text-center">Percentual (%)</TableHead>
                <TableHead className="text-xs font-bold text-center">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((conf) => (
                <TableRow key={conf.id} className="text-xs">
                  <TableCell className="font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      {conf.empresa?.tipo === 'seguranca' ? (
                        <Shield className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Briefcase className="w-3 h-3 text-sky-600" />
                      )}
                      {conf.empresa?.nome}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{conf.nome}</TableCell>
                  <TableCell className="capitalize">{conf.tipo_dia}</TableCell>
                  <TableCell className="text-center font-bold text-amber-700">
                    {conf.percentual}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={conf.ativo ? 'default' : 'secondary'} className="text-[10px]">
                      {conf.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditConfigModal(conf)}
                      className="text-xs h-7 text-amber-600 hover:text-amber-700"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tabela de Feriados */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Calendário de Feriados (Detecção Automática)
            </CardTitle>
            <CardDescription className="text-xs">
              Quando a data da hora extra coincidir com esta tabela, o percentual de feriado é
              aplicado automaticamente.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFeriadoModalOpen(true)}
            className="text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Feriado
          </Button>
        </CardHeader>
        <CardContent className="p-0 max-h-80 overflow-y-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-bold">Data</TableHead>
                <TableHead className="text-xs font-bold">Descrição / Feriado</TableHead>
                <TableHead className="text-xs font-bold">Abrangência</TableHead>
                <TableHead className="text-xs font-bold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((f) => (
                <TableRow key={f.id} className="text-xs">
                  <TableCell className="font-semibold text-slate-900">
                    {formatDateBR(f.data)}
                  </TableCell>
                  <TableCell className="text-slate-700">{f.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {f.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFeriado(f.id)}
                      className="h-6 w-6 text-slate-400 hover:text-rose-600"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Regra */}
      <Dialog open={regraModalOpen} onOpenChange={setRegraModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveConfig}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingConfig ? 'Editar Regra de Hora Extra' : 'Nova Regra de Hora Extra'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3">
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
                <Label className="text-xs font-semibold text-slate-700">Nome da Regra *</Label>
                <Input
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Dia</Label>
                  <Select value={formTipoDia} onValueChange={(v: any) => setFormTipoDia(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Dia Normal</SelectItem>
                      <SelectItem value="domingo">Domingo</SelectItem>
                      <SelectItem value="feriado">Feriado</SelectItem>
                      <SelectItem value="adicional_noturno">Adicional Noturno</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Percentual (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formPercentual}
                    onChange={(e) => setFormPercentual(e.target.value)}
                    className="text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="regra-ativo"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <Label
                  htmlFor="regra-ativo"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Regra Ativa no Cálculo
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRegraModalOpen(false)}
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
                {saving ? 'Gravando...' : 'Salvar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Feriado */}
      <Dialog open={feriadoModalOpen} onOpenChange={setFeriadoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveFeriado}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Cadastrar Feriado
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Data do Feriado *</Label>
                <Input
                  type="date"
                  required
                  value={feriadoData}
                  onChange={(e) => setFeriadoData(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome / Descrição *</Label>
                <Input
                  required
                  placeholder="Ex: Aniversário da Cidade / Feriado Municipal"
                  value={feriadoDescricao}
                  onChange={(e) => setFeriadoDescricao(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tipo</Label>
                <Select value={feriadoTipo} onValueChange={setFeriadoTipo}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nacional">Nacional</SelectItem>
                    <SelectItem value="Estadual">Estadual</SelectItem>
                    <SelectItem value="Municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeriadoModalOpen(false)}
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
                {saving ? 'Gravando...' : 'Salvar Feriado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
