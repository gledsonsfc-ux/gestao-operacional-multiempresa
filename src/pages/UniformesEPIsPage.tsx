import { useEffect, useState, useRef } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { uniformesService, colaboradoresService } from '@/services/gestao-service'
import { UniformeEPI, Colaborador } from '@/types/gestao'
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
  Shirt,
  Plus,
  PenTool,
  CheckCircle2,
  Trash2,
  Link as LinkIcon,
  Shield,
  Briefcase,
  Layers,
  FileCheck2,
} from 'lucide-react'
import { formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

const ITENS_PADRAO = [
  'Camisa Polo',
  'Calça Operacional',
  'Calçado / Bota',
  'Jaqueta Térmica / Frio',
  'Crachá de Identificação',
  'Cordão de Crachá',
  'Luvas de Procedimento',
  'Máscaras de Proteção',
  'Colete Tático / Operacional',
  'Capa de Chuva',
  'Outro Equipamento',
]

export default function UniformesEPIsPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { toast } = useToast()

  const [uniformes, setUniformes] = useState<UniformeEPI[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formColaboradorId, setFormColaboradorId] = useState('')
  const [formItem, setFormItem] = useState('Camisa Polo')
  const [formTamanho, setFormTamanho] = useState('M')
  const [formQuantidade, setFormQuantidade] = useState(1)
  const [formTipo, setFormTipo] = useState<'Entrega' | 'Devolucao' | 'Troca'>('Entrega')
  const [formDataMov, setFormDataMov] = useState(new Date().toISOString().split('T')[0])
  const [formResponsavel, setFormResponsavel] = useState('Almoxarifado')
  const [formObservacao, setFormObservacao] = useState('')
  const [formStatus, setFormStatus] = useState<'Pendente' | 'Entregue' | 'Devolvido'>('Entregue')

  // Digital Signature Pad (Canvas)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [uData, cData] = await Promise.all([
        uniformesService.list(selectedEmpresaId),
        colaboradoresService.list(selectedEmpresaId),
      ])
      setUniformes(uData)
      setColaboradores(cData.filter((c) => c.status === 'Ativo'))
    } catch (err) {
      console.error('Erro ao carregar uniformes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId])

  const openCreate = () => {
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormColaboradorId('')
    setFormItem('Camisa Polo')
    setFormTamanho('M')
    setFormQuantidade(1)
    setFormTipo('Entrega')
    setFormDataMov(new Date().toISOString().split('T')[0])
    setFormResponsavel('Almoxarifado')
    setFormObservacao('')
    setFormStatus('Entregue')
    setSignatureData(null)
    setModalOpen(true)
  }

  // Canvas Handlers for Signature
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignatureData(canvas.toDataURL())
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formColaboradorId) {
      toast({
        title: 'Atenção',
        description: 'Selecione o colaborador destinatário.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await uniformesService.create({
        empresa_id: formEmpresaId,
        colaborador_id: formColaboradorId,
        item: formItem,
        tamanho: formTamanho || null,
        quantidade: Number(formQuantidade) || 1,
        tipo_movimentacao: formTipo,
        data_movimentacao: formDataMov,
        responsavel_entrega: formResponsavel.trim() || 'Almoxarifado',
        observacao: formObservacao.trim() || null,
        status: formStatus,
        assinatura_base64: signatureData || null,
        origem: 'Painel',
      })

      toast({
        title: 'Movimentação registrada',
        description: `${formItem} registrado com sucesso.`,
      })
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestão de Uniformes & EPIs</h2>
          <p className="text-xs text-slate-500">
            Controle de entrega, devolução e troca de fardamento com estrutura para assinatura
            digital do colaborador.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Registrar Entrega / Devolução
        </Button>
      </div>

      {/* Table Card */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Data</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Colaborador</TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">
                  Item / Equipamento
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Tamanho</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Qtd</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Tipo</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Responsável</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Assinatura
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-500">
                    Carregando movimentações de uniformes...
                  </TableCell>
                </TableRow>
              ) : uniformes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-xs text-slate-400">
                    <Shirt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum fardamento ou EPI registrado.
                  </TableCell>
                </TableRow>
              ) : (
                uniformes.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50">
                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {formatDateBR(u.data_movimentacao)}
                    </TableCell>

                    <TableCell className="py-2.5 font-semibold text-xs text-slate-900">
                      {u.colaborador?.nome || 'Colaborador'}
                    </TableCell>

                    {isConsolidado && (
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {u.empresa?.nome}
                      </TableCell>
                    )}

                    <TableCell className="py-2.5 text-xs font-medium text-slate-800">
                      {u.item}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {u.tamanho || '-'}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-bold text-slate-800">
                      {u.quantidade}
                    </TableCell>

                    <TableCell className="py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          u.tipo_movimentacao === 'Entrega'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.tipo_movimentacao === 'Devolucao'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {u.tipo_movimentacao}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {u.responsavel_entrega}
                    </TableCell>

                    <TableCell className="py-2.5 text-center">
                      {u.assinatura_base64 ? (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Assinado
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Pendente</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {u.status}
                      </Badge>
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
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Registrar Movimentação de Uniforme / EPI
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecione o colaborador, os itens e colha a assinatura digital se disponível.
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
                <Label className="text-xs font-semibold text-slate-700">
                  Colaborador Destinatário *
                </Label>
                <Select value={formColaboradorId} onValueChange={setFormColaboradorId}>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Item / EPI *</Label>
                  <Select value={formItem} onValueChange={setFormItem}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITENS_PADRAO.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tamanho</Label>
                  <Input
                    placeholder="Ex: G, 42"
                    value={formTamanho}
                    onChange={(e) => setFormTamanho(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formQuantidade}
                    onChange={(e) => setFormQuantidade(Number(e.target.value))}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Movimento</Label>
                  <Select value={formTipo} onValueChange={(v: any) => setFormTipo(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrega">Entrega</SelectItem>
                      <SelectItem value="Devolucao">Devolução</SelectItem>
                      <SelectItem value="Troca">Troca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Data Movimentação</Label>
                  <Input
                    type="date"
                    required
                    value={formDataMov}
                    onChange={(e) => setFormDataMov(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Digital Signature Area */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-600" />
                    Assinatura Digital do Colaborador (Opcional)
                  </Label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Limpar assinatura
                  </button>
                </div>
                <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    width={450}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-24 cursor-crosshair bg-white"
                  />
                  <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 pointer-events-none">
                    Assine com o mouse ou dedo
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Observações</Label>
                <Textarea
                  placeholder="Ex: Substituição por desgaste natural..."
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  className="text-xs min-h-[50px]"
                />
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
                {saving ? 'Gravando...' : 'Registrar Movimentação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
