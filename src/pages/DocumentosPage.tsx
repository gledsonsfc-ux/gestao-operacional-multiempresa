import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { documentosService, colaboradoresService, postosService } from '@/services/gestao-service'
import { DocumentoItem, Colaborador, Posto } from '@/types/gestao'
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
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Shield,
  Briefcase,
  Layers,
  Search,
} from 'lucide-react'
import { formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function DocumentosPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { toast } = useToast()

  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formColaboradorId, setFormColaboradorId] = useState('none')
  const [formPostoId, setFormPostoId] = useState('none')
  const [formTitulo, setFormTitulo] = useState('')
  const [formTipoDoc, setFormTipoDoc] = useState('CNV')
  const [formNumero, setFormNumero] = useState('')
  const [formDataEmissao, setFormDataEmissao] = useState('')
  const [formDataVencimento, setFormDataVencimento] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [docsData, colabsData, postosData] = await Promise.all([
        documentosService.list(selectedEmpresaId),
        colaboradoresService.list(selectedEmpresaId),
        postosService.list(selectedEmpresaId),
      ])

      // Calculate status: Valido / Vencendo / Vencido
      const today = new Date().toISOString().split('T')[0]
      const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const processed = docsData.map((d) => {
        let st: 'Valido' | 'Vencendo' | 'Vencido' = 'Valido'
        if (d.data_vencimento) {
          if (d.data_vencimento < today) st = 'Vencido'
          else if (d.data_vencimento <= next30) st = 'Vencendo'
        }
        return { ...d, status: st }
      })

      setDocumentos(processed)
      setColaboradores(colabsData.filter((c) => c.status === 'Ativo'))
      setPostos(postosData)
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
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
    setFormColaboradorId('none')
    setFormPostoId('none')
    setFormTitulo('')
    setFormTipoDoc('CNV')
    setFormNumero('')
    setFormDataEmissao(new Date().toISOString().split('T')[0])
    setFormDataVencimento('')
    setFormObservacoes('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o título do documento.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await documentosService.create({
        empresa_id: formEmpresaId,
        colaborador_id: formColaboradorId !== 'none' ? formColaboradorId : null,
        posto_id: formPostoId !== 'none' ? formPostoId : null,
        titulo: formTitulo.trim(),
        tipo_documento: formTipoDoc,
        numero: formNumero.trim() || null,
        data_emissao: formDataEmissao || null,
        data_vencimento: formDataVencimento || null,
        observacoes: formObservacoes.trim() || null,
      })

      toast({
        title: 'Documento cadastrado',
        description: 'Controle de validade registrado com sucesso.',
      })
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar documento', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const filteredDocs = documentos.filter((d) => {
    const matchesSearch =
      d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.colaborador?.nome &&
        d.colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.numero && d.numero.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Vencido':
        return <Badge className="bg-rose-100 text-rose-800 border-none text-[10px]">Vencido</Badge>
      case 'Vencendo':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
            Vence em 30d
          </Badge>
        )
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Válido</Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Documentos e Conformidade Operacional
          </h2>
          <p className="text-xs text-slate-500">
            Controle de validades de CNVs, reciclagens, ASOs médicos e alvarás operacionais.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Cadastrar Documento
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar documento, colaborador ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Valido">Válidos</SelectItem>
              <SelectItem value="Vencendo">Vencendo nos próximos 30 dias</SelectItem>
              <SelectItem value="Vencido">Vencidos</SelectItem>
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
                <TableHead className="text-xs font-bold text-slate-700">
                  Documento / Título
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Tipo</TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">
                  Vínculo (Colaborador / Posto)
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Emissão</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">
                  Validade / Vencimento
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum documento localizado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50">
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-slate-900">{d.titulo}</div>
                      {d.numero && (
                        <span className="text-[11px] text-slate-500 font-mono">Nº {d.numero}</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      <Badge variant="outline" className="text-[10px]">
                        {d.tipo_documento}
                      </Badge>
                    </TableCell>

                    {isConsolidado && (
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {d.empresa?.nome}
                      </TableCell>
                    )}

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {d.colaborador?.nome ? (
                        <span className="font-medium text-slate-800">👤 {d.colaborador.nome}</span>
                      ) : d.posto?.nome ? (
                        <span className="font-medium text-slate-800">📍 {d.posto.nome}</span>
                      ) : (
                        <span className="text-slate-400 italic">Empresa / Geral</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {formatDateBR(d.data_emissao)}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs font-semibold text-slate-800">
                      {formatDateBR(d.data_vencimento)}
                    </TableCell>

                    <TableCell className="py-2.5 text-center">{getStatusBadge(d.status)}</TableCell>
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
                Cadastrar Documento / Certificado
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Acompanhamento automático de validade e alertas.
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
                  Título do Documento *
                </Label>
                <Input
                  required
                  placeholder="Ex: CNV - Carlos Silva / ASO Periódico"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo</Label>
                  <Select value={formTipoDoc} onValueChange={setFormTipoDoc}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNV">CNV (Vigilância)</SelectItem>
                      <SelectItem value="Curso Formação">Curso de Formação</SelectItem>
                      <SelectItem value="Reciclagem">Reciclagem</SelectItem>
                      <SelectItem value="ASO / Exame Médico">ASO / Exame Médico</SelectItem>
                      <SelectItem value="Contrato">Contrato de Trabalho</SelectItem>
                      <SelectItem value="Ficha EPI">Ficha de EPI</SelectItem>
                      <SelectItem value="Alvará / Licença">Alvará / Licença</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Número / Registro</Label>
                  <Input
                    placeholder="Ex: 987654321"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Vincular a Colaborador (Opcional)
                </Label>
                <Select value={formColaboradorId} onValueChange={setFormColaboradorId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Geral / Sem colaborador específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral / Não vinculado a colaborador</SelectItem>
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
                  <Label className="text-xs font-semibold text-slate-700">Data de Emissão</Label>
                  <Input
                    type="date"
                    value={formDataEmissao}
                    onChange={(e) => setFormDataEmissao(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Data de Vencimento *
                  </Label>
                  <Input
                    type="date"
                    required
                    value={formDataVencimento}
                    onChange={(e) => setFormDataVencimento(e.target.value)}
                    className="text-xs font-bold text-amber-700"
                  />
                </div>
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
                {saving ? 'Gravando...' : 'Salvar Documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
