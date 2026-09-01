import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { formulariosService } from '@/services/gestao-service'
import { FormularioPublico } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Link as LinkIcon,
  Copy,
  MessageSquare,
  Plus,
  Power,
  Shield,
  Briefcase,
  ExternalLink,
  Users,
  Settings,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ConfiguracoesPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { toast } = useToast()

  const [formularios, setFormularios] = useState<FormularioPublico[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Novo Formulário
  const [modalOpen, setModalOpen] = useState(false)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formTipo, setFormTipo] = useState<'hora_extra' | 'troca_plantao' | 'uniforme_epi'>(
    'hora_extra',
  )
  const [formTitulo, setFormTitulo] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [saving, setSaving] = useState(false)

  const loadFormularios = async () => {
    setLoading(true)
    try {
      const data = await formulariosService.list(selectedEmpresaId)
      setFormularios(data)
    } catch (err) {
      console.error('Erro ao carregar formulários públicos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFormularios()
  }, [selectedEmpresaId])

  const openCreateModal = () => {
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormTipo('hora_extra')
    setFormTitulo('Solicitação de Hora Extra')
    setFormSlug(`solicitacao-he-${Date.now().toString().slice(-4)}`)
    setFormDescricao('')
    setModalOpen(true)
  }

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/formulario/${slug}`
    navigator.clipboard.writeText(fullUrl)
    toast({
      title: 'Link copiado!',
      description: fullUrl,
    })
  }

  const handleSendWhatsApp = (form: FormularioPublico) => {
    const fullUrl = `${window.location.origin}/formulario/${form.slug}`
    const text = encodeURIComponent(
      `Olá! Segue o link para preenchimento do formulário de ${form.titulo} (${form.empresa?.nome}):\n\n${fullUrl}\n\nPreencha e envie diretamente pelo seu celular.`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleToggleAtivo = async (form: FormularioPublico) => {
    try {
      await formulariosService.toggleActive(form.id, !form.ativo)
      toast({
        title: form.ativo ? 'Formulário Desativado' : 'Formulário Ativado',
        description: 'O status do link público foi atualizado.',
      })
      loadFormularios()
    } catch (err: any) {
      toast({ title: 'Erro ao alterar status', description: err.message, variant: 'destructive' })
    }
  }

  const handleSaveFormulario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim() || !formSlug.trim()) return

    setSaving(true)
    try {
      await formulariosService.create({
        empresa_id: formEmpresaId,
        tipo: formTipo,
        titulo: formTitulo.trim(),
        slug: formSlug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-'),
        descricao: formDescricao.trim() || null,
        ativo: true,
      })

      toast({ title: 'Formulário Criado', description: 'O link público já está pronto para uso.' })
      setModalOpen(false)
      loadFormularios()
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configurações & Formulários Públicos</h2>
          <p className="text-xs text-slate-500">
            Gerencie links públicos para WhatsApp, permissões por perfil e regras gerais do sistema.
          </p>
        </div>
      </div>

      <Tabs defaultValue="formularios" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="formularios" className="text-xs">
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
            Formulários Públicos & WhatsApp
          </TabsTrigger>
          <TabsTrigger value="perfis" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Perfis & Permissões
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FORMULÁRIOS PÚBLICOS */}
        <TabsContent value="formularios" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-600" />
                  Links Públicos para Colaboradores
                </CardTitle>
                <CardDescription className="text-xs">
                  O colaborador acessa sem login no celular. As respostas entram automaticamente no
                  sistema com a origem correspondente.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={openCreateModal}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo Formulário
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Título / Finalidade</TableHead>
                    <TableHead className="text-xs font-bold">Tipo</TableHead>
                    {isConsolidado && <TableHead className="text-xs font-bold">Empresa</TableHead>}
                    <TableHead className="text-xs font-bold">Link Direto (Slug)</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ações Rápidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                        Carregando formulários...
                      </TableCell>
                    </TableRow>
                  ) : formularios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400">
                        Nenhum formulário público cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    formularios.map((f) => (
                      <TableRow key={f.id} className="hover:bg-slate-50">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">{f.titulo}</div>
                          {f.descricao && (
                            <div className="text-[11px] text-slate-500">{f.descricao}</div>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-xs capitalize">
                          <Badge variant="outline" className="text-[10px]">
                            {f.tipo.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        {isConsolidado && (
                          <TableCell className="py-3 text-xs text-slate-700">
                            {f.empresa?.nome}
                          </TableCell>
                        )}

                        <TableCell className="py-3 text-xs font-mono text-slate-600">
                          /formulario/{f.slug}
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          <Badge
                            variant={f.ativo ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              f.ativo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {f.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyLink(f.slug)}
                              className="text-xs h-7 px-2 font-medium"
                              title="Copiar Link Absoluto"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar Link
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleSendWhatsApp(f)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2 font-medium"
                              title="Enviar pelo WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/formulario/${f.slug}`, '_blank')}
                              className="h-7 w-7 text-slate-500 hover:text-slate-800"
                              title="Abrir no navegador"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleAtivo(f)}
                              className="h-7 w-7 text-slate-400 hover:text-slate-800"
                              title={f.ativo ? 'Desativar' : 'Ativar'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PERFIS & PERMISSÕES */}
        <TabsContent value="perfis" className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                Matriz de Perfis e Permissões do Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de acesso por cargo/role funcional.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      Administrador / Direção
                    </span>
                    <Badge className="bg-amber-500 text-white text-[10px]">Acesso Total</Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Controle total sobre todas as empresas, postos, cadastros, regras de cálculo,
                    relatórios e aprovações.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      Coordenação Operacional
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Operacional
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Aprovação de horas extras, autorização de trocas de plantão, gestão de postos e
                    escalas.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">RH / Administrativo</span>
                    <Badge variant="outline" className="text-[10px]">
                      Administrativo
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Cadastro de colaboradores, controle de vale-transporte, uniformes/EPIs e
                    conferência de horas extras.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Supervisor / Fiscal</span>
                    <Badge variant="outline" className="text-[10px]">
                      Supervisão
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Lançamento de solicitações, entrega de uniformes no posto e consulta de escalas.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Consulta / Auditoria</span>
                    <Badge variant="outline" className="text-[10px]">
                      Leitura
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Apenas visualização de relatórios e dados para prestação de contas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Novo Form */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveFormulario}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Criar Novo Link de Formulário Público
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gere um slug único para compartilhar com colaboradores via WhatsApp.
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
                <Label className="text-xs font-semibold text-slate-700">Tipo de Formulário *</Label>
                <Select value={formTipo} onValueChange={(v: any) => setFormTipo(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hora_extra">Hora Extra</SelectItem>
                    <SelectItem value="troca_plantao">Troca de Plantão</SelectItem>
                    <SelectItem value="uniforme_epi">Uniforme / EPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Título Público *</Label>
                <Input
                  required
                  placeholder="Ex: Registro de Plantão Extra"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Slug da URL *</Label>
                <Input
                  required
                  placeholder="ex: plantao-extra-hammer"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400">URL final: /formulario/{formSlug}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Instruções para o Colaborador
                </Label>
                <Input
                  placeholder="Ex: Preencha com os horários exatos trabalhados."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="text-xs"
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
                {saving ? 'Criando...' : 'Criar Formulário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
