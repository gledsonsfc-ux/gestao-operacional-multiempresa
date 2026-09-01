import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { postosService, colaboradoresService } from '@/services/gestao-service'
import { Posto, Colaborador } from '@/types/gestao'
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
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  User,
  Users,
  Edit,
  Power,
  Shield,
  Briefcase,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

export default function PostosList() {
  const { selectedEmpresaId, isConsolidado, empresas, selectedEmpresa } = useEmpresa()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [postos, setPostos] = useState<Posto[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Modal Create/Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPosto, setEditingPosto] = useState<Posto | null>(null)
  const [saving, setSaving] = useState(false)

  // Form Fields
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formCliente, setFormCliente] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formResponsavel, setFormResponsavel] = useState('')
  const [formTelefoneResponsavel, setFormTelefoneResponsavel] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [postosData, colabsData] = await Promise.all([
        postosService.list(selectedEmpresaId),
        colaboradoresService.list(selectedEmpresaId),
      ])
      setPostos(postosData)
      setColaboradores(colabsData)
    } catch (err) {
      console.error('Erro ao carregar postos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId])

  const openCreateModal = () => {
    setEditingPosto(null)
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormCliente('')
    setFormNome('')
    setFormEndereco('')
    setFormResponsavel('')
    setFormTelefoneResponsavel('')
    setFormObservacoes('')
    setFormAtivo(true)
    setModalOpen(true)
  }

  const openEditModal = (p: Posto) => {
    setEditingPosto(p)
    setFormEmpresaId(p.empresa_id)
    setFormCliente(p.cliente)
    setFormNome(p.nome)
    setFormEndereco(p.endereco || '')
    setFormResponsavel(p.responsavel || '')
    setFormTelefoneResponsavel(p.telefone_responsavel || '')
    setFormObservacoes(p.observacoes || '')
    setFormAtivo(p.ativo)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim() || !formCliente.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o Cliente e o Nome do Posto.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingPosto) {
        await postosService.update(
          editingPosto.id,
          {
            empresa_id: formEmpresaId,
            cliente: formCliente.trim(),
            nome: formNome.trim(),
            endereco: formEndereco.trim() || null,
            responsavel: formResponsavel.trim() || null,
            telefone_responsavel: formTelefoneResponsavel.trim() || null,
            observacoes: formObservacoes.trim() || null,
            ativo: formAtivo,
          },
          {
            previous: editingPosto,
            userId: profile?.id,
            userName: profile?.nome,
          },
        )
        toast({ title: 'Posto atualizado', description: `${formNome} foi atualizado com sucesso.` })
      } else {
        await postosService.create({
          empresa_id: formEmpresaId,
          cliente: formCliente.trim(),
          nome: formNome.trim(),
          endereco: formEndereco.trim() || null,
          responsavel: formResponsavel.trim() || null,
          telefone_responsavel: formTelefoneResponsavel.trim() || null,
          observacoes: formObservacoes.trim() || null,
          ativo: formAtivo,
        })
        toast({ title: 'Posto criado', description: `${formNome} foi cadastrado com sucesso.` })
      }
      setModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar posto', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (p: Posto) => {
    try {
      await postosService.update(
        p.id,
        { ativo: !p.ativo },
        {
          previous: p,
          userId: profile?.id,
          userName: profile?.nome,
        },
      )
      toast({
        title: p.ativo ? 'Posto Inativado' : 'Posto Ativado',
        description: `O status do posto ${p.nome} foi alterado.`,
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao alterar status', description: err.message, variant: 'destructive' })
    }
  }

  const filteredPostos = postos.filter((p) => {
    const matchesSearch =
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.responsavel && p.responsavel.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus =
      statusFilter === 'todos' || (statusFilter === 'ativos' ? p.ativo : !p.ativo)
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Postos de Serviço e Clientes</h2>
          <p className="text-xs text-slate-500">
            Cadastre os clientes e postos operacionais. Nenhum posto é fixo no código.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Cadastrar Posto
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar por posto, cliente ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativos">Somente Ativos</SelectItem>
              <SelectItem value="inativos">Somente Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Postos Grid/Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Carregando postos...</div>
      ) : filteredPostos.length === 0 ? (
        <Card className="border-slate-200 bg-white p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nenhum posto cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {selectedEmpresa?.tipo === 'servicos'
              ? 'A empresa Inteligência e Serviços está pronta para novos cadastros. Clique abaixo para registrar o primeiro posto.'
              : 'Cadastre postos de serviço para vincular colaboradores, escalas e horas extras.'}
          </p>
          <Button
            onClick={openCreateModal}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Cadastrar Primeiro Posto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPostos.map((p) => {
            const linkedColabs = colaboradores.filter(
              (c) => c.posto_id === p.id && c.status === 'Ativo',
            )

            return (
              <Card
                key={p.id}
                className={`border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between ${
                  !p.ativo ? 'opacity-60 bg-slate-50' : ''
                }`}
              >
                <div
                  className={`h-1.5 w-full ${
                    p.empresa?.tipo === 'seguranca' ? 'bg-emerald-500' : 'bg-sky-500'
                  }`}
                />

                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                        Cliente: {p.cliente}
                      </span>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-0.5">
                        {p.nome}
                      </CardTitle>
                    </div>

                    <Badge
                      variant={p.ativo ? 'default' : 'secondary'}
                      className={`text-[10px] ${
                        p.ativo
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-2.5 text-xs text-slate-600 flex-1">
                  {isConsolidado && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 p-1.5 rounded">
                      {p.empresa?.tipo === 'seguranca' ? (
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                      )}
                      <span>{p.empresa?.nome}</span>
                    </div>
                  )}

                  {p.endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{p.endereco}</span>
                    </div>
                  )}

                  {p.responsavel && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {p.responsavel}{' '}
                        {p.telefone_responsavel ? `(${p.telefone_responsavel})` : ''}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      {linkedColabs.length}{' '}
                      {linkedColabs.length === 1 ? 'colaborador' : 'colaboradores'} ativos
                    </span>
                  </div>
                </CardContent>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAtivo(p)}
                    className="text-xs h-7 text-slate-500 hover:text-slate-800"
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {p.ativo ? 'Inativar' : 'Ativar'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(p)}
                    className="text-xs h-7 font-semibold"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingPosto ? 'Editar Posto de Serviço' : 'Cadastrar Novo Posto'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Defina o cliente, endereço e responsável operacional.
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
                        {e.tipo === 'seguranca' ? '🛡️ ' : '💼 '}
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Cliente / Contratante *
                  </Label>
                  <Input
                    required
                    placeholder="Ex: Condomínio Solar das Flores"
                    value={formCliente}
                    onChange={(e) => setFormCliente(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Nome do Posto *</Label>
                  <Input
                    required
                    placeholder="Ex: Portaria Principal / Bloco A"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Endereço Completo</Label>
                <Input
                  placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Responsável no Local
                  </Label>
                  <Input
                    placeholder="Ex: Síndico / Gestor Predial"
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Telefone Contato</Label>
                  <Input
                    placeholder="(00) 0000-0000"
                    value={formTelefoneResponsavel}
                    onChange={(e) => setFormTelefoneResponsavel(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="posto-ativo"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <Label
                  htmlFor="posto-ativo"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Posto Ativo na Operação
                </Label>
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
                {saving ? 'Gravando...' : 'Salvar Posto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
