import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import {
  formulariosService,
  horaExtraConfigsService,
  profilesService,
} from '@/services/gestao-service'
import { FormularioPublico, HoraExtraConfig, Feriado, UserProfile, UserRole } from '@/types/gestao'
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
  Sliders,
  Calendar,
  Edit,
  Trash2,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
} from 'lucide-react'
import { formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { getPermissions } from '@/lib/permissions'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador / Direção',
  coordenacao: 'Coordenação Operacional',
  supervisor: 'Supervisor / Fiscal',
  rh: 'RH / Administrativo',
  consulta: 'Consulta / Auditoria',
}

export default function ConfiguracoesPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { user: authUser, profile: currentProfile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const permissions = getPermissions(currentProfile?.role)

  // -------------------------------------------------------------
  // TAB 1: FORMULÁRIOS PÚBLICOS & WHATSAPP
  // -------------------------------------------------------------
  const [formularios, setFormularios] = useState<FormularioPublico[]>([])
  const [loadingForms, setLoadingForms] = useState(true)

  // Modal Novo Formulário
  const [modalFormOpen, setModalFormOpen] = useState(false)
  const [formEmpresaId, setFormEmpresaId] = useState('')
  const [formTipo, setFormTipo] = useState<'hora_extra' | 'troca_plantao' | 'uniforme_epi'>(
    'hora_extra',
  )
  const [formTitulo, setFormTitulo] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [savingForm, setSavingForm] = useState(false)

  const loadFormularios = async () => {
    setLoadingForms(true)
    try {
      const data = await formulariosService.list(selectedEmpresaId)
      setFormularios(data)
    } catch (err) {
      console.error('Erro ao carregar formulários públicos:', err)
    } finally {
      setLoadingForms(false)
    }
  }

  const openCreateFormModal = () => {
    setFormEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setFormTipo('hora_extra')
    setFormTitulo('Solicitação de Hora Extra')
    setFormSlug(`solicitacao-he-${Date.now().toString().slice(-4)}`)
    setFormDescricao('')
    setModalFormOpen(true)
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

  const handleToggleAtivoForm = async (form: FormularioPublico) => {
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

    setSavingForm(true)
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
      setModalFormOpen(false)
      loadFormularios()
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' })
    } finally {
      setSavingForm(false)
    }
  }

  // -------------------------------------------------------------
  // TAB 2: REGRAS DE HORAS EXTRAS & FERIADOS
  // -------------------------------------------------------------
  const [configsHE, setConfigsHE] = useState<(HoraExtraConfig & { empresa: any })[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loadingRegras, setLoadingRegras] = useState(true)

  // Modal Regra HE
  const [regraModalOpen, setRegraModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<HoraExtraConfig | null>(null)
  const [regraEmpresaId, setRegraEmpresaId] = useState('')
  const [regraNome, setRegraNome] = useState('')
  const [regraTipoDia, setRegraTipoDia] = useState<
    'normal' | 'domingo' | 'feriado' | 'adicional_noturno' | 'outro'
  >('normal')
  const [regraPercentual, setRegraPercentual] = useState('50.00')
  const [regraAtivo, setRegraAtivo] = useState(true)
  const [savingRegra, setSavingRegra] = useState(false)

  // Modal Feriado
  const [feriadoModalOpen, setFeriadoModalOpen] = useState(false)
  const [feriadoData, setFeriadoData] = useState('')
  const [feriadoDescricao, setFeriadoDescricao] = useState('')
  const [feriadoTipo, setFeriadoTipo] = useState('Nacional')
  const [savingFeriado, setSavingFeriado] = useState(false)

  const loadRegrasData = async () => {
    setLoadingRegras(true)
    try {
      const [allConfigs, allFeriados] = await Promise.all([
        horaExtraConfigsService.listAllConfigs(),
        horaExtraConfigsService.listFeriados(),
      ])
      // Filter by selected empresa if not consolidado
      const filtered =
        selectedEmpresaId !== 'consolidado'
          ? allConfigs.filter((c) => c.empresa_id === selectedEmpresaId)
          : allConfigs
      setConfigsHE(filtered)
      setFeriados(allFeriados)
    } catch (err) {
      console.error('Erro ao carregar regras e feriados:', err)
    } finally {
      setLoadingRegras(false)
    }
  }

  const openNewConfigModal = () => {
    setEditingConfig(null)
    setRegraEmpresaId(
      selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
    )
    setRegraNome('Hora Extra Adicional (60%)')
    setRegraTipoDia('outro')
    setRegraPercentual('60.00')
    setRegraAtivo(true)
    setRegraModalOpen(true)
  }

  const openEditConfigModal = (conf: HoraExtraConfig) => {
    setEditingConfig(conf)
    setRegraEmpresaId(conf.empresa_id)
    setRegraNome(conf.nome)
    setRegraTipoDia(conf.tipo_dia)
    setRegraPercentual(String(conf.percentual))
    setRegraAtivo(conf.ativo)
    setRegraModalOpen(true)
  }

  const handleSaveRegra = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRegra(true)
    try {
      await horaExtraConfigsService.saveConfig({
        id: editingConfig?.id,
        empresa_id: regraEmpresaId,
        nome: regraNome.trim(),
        tipo_dia: regraTipoDia,
        percentual: Number(regraPercentual),
        ativo: regraAtivo,
      })

      toast({
        title: 'Regra salva',
        description: 'Os percentuais de hora extra foram atualizados com sucesso.',
      })
      setRegraModalOpen(false)
      loadRegrasData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar regra', description: err.message, variant: 'destructive' })
    } finally {
      setSavingRegra(false)
    }
  }

  const handleSaveFeriado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feriadoData || !feriadoDescricao.trim()) return

    setSavingFeriado(true)
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
      loadRegrasData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar feriado', description: err.message, variant: 'destructive' })
    } finally {
      setSavingFeriado(false)
    }
  }

  const handleDeleteFeriado = async (id: string) => {
    try {
      await horaExtraConfigsService.deleteFeriado(id)
      toast({ title: 'Feriado removido', description: 'Registro excluído com sucesso.' })
      loadRegrasData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  // -------------------------------------------------------------
  // TAB 3: USUÁRIOS & PERFIS (PERMISSÕES CONFIGURÁVEIS)
  // -------------------------------------------------------------
  const [profiles, setProfiles] = useState<(UserProfile & { empresa?: any })[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  // Edit User Modal
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const [userNome, setUserNome] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('coordenacao')
  const [userEmpresaId, setUserEmpresaId] = useState<string>('todas')
  const [userAtivo, setUserAtivo] = useState(true)
  const [userTelefone, setUserTelefone] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  const loadProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const data = await profilesService.list()
      setProfiles(data)
    } catch (err) {
      console.error('Erro ao carregar profiles:', err)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const openEditUserModal = (p: UserProfile) => {
    setEditingProfile(p)
    setUserNome(p.nome || '')
    setUserEmail(p.email || '')
    setUserRole(p.role || 'consulta')
    setUserEmpresaId(p.empresa_id || 'todas')
    setUserAtivo(p.ativo !== false)
    setUserTelefone(p.telefone || '')
    setUserModalOpen(true)
  }

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProfile) return

    setSavingUser(true)
    try {
      const targetEmpresaId = userEmpresaId === 'todas' ? null : userEmpresaId
      const permiteConsolidado = userEmpresaId === 'todas'

      await profilesService.update(
        editingProfile.id,
        {
          nome: userNome.trim(),
          role: userRole,
          empresa_id: targetEmpresaId,
          permite_consolidado: permiteConsolidado,
          telefone: userTelefone.trim() || null,
          ativo: userAtivo,
        },
        {
          previous: editingProfile,
          userId: authUser?.id,
          userName: currentProfile?.nome,
          motivo: `Atualização de perfil para ${ROLE_LABELS[userRole]}`,
        },
      )

      toast({
        title: 'Perfil Atualizado',
        description: `As permissões do usuário ${userNome} foram atualizadas no banco.`,
      })
      setUserModalOpen(false)
      loadProfiles()
      if (editingProfile.id === authUser?.id) {
        refreshProfile()
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar perfil', description: err.message, variant: 'destructive' })
    } finally {
      setSavingUser(false)
    }
  }

  // Load appropriate data on company change or initial mount
  useEffect(() => {
    loadFormularios()
    loadRegrasData()
    loadProfiles()
  }, [selectedEmpresaId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configurações Gerais & Acessos</h2>
          <p className="text-xs text-slate-500">
            Gerencie formulários públicos para WhatsApp, regras configuráveis de horas extras e
            perfis com permissões no banco.
          </p>
        </div>
      </div>

      <Tabs defaultValue="formularios" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="formularios" className="text-xs">
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
            Formulários Públicos & WhatsApp ({formularios.length})
          </TabsTrigger>
          <TabsTrigger value="regras" className="text-xs">
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Regras de Horas Extras & Feriados
          </TabsTrigger>
          <TabsTrigger value="perfis" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Usuários & Perfis ({profiles.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* ABA 1: FORMULÁRIOS PÚBLICOS & WHATSAPP                   */}
        {/* ========================================================= */}
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
                onClick={openCreateFormModal}
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
                  {loadingForms ? (
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
                              onClick={() => handleToggleAtivoForm(f)}
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

        {/* ========================================================= */}
        {/* ABA 2: REGRAS DE HORAS EXTRAS & FERIADOS                 */}
        {/* ========================================================= */}
        <TabsContent value="regras" className="space-y-6">
          {/* Tabela de Percentuais por Empresa */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  Percentuais Configuráveis de Horas Extras por Empresa
                </CardTitle>
                <CardDescription className="text-xs">
                  Percentuais aplicados no cálculo automático (dia normal, domingo, feriado e
                  adicionais). Valores persistem no banco sem dados fixos no código.
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
                  {loadingRegras ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        Carregando regras...
                      </TableCell>
                    </TableRow>
                  ) : configsHE.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Nenhuma regra de hora extra encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    configsHE.map((conf) => (
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
                          <Badge
                            variant={conf.ativo ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
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
                    ))
                  )}
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
                  Calendário de Feriados (Detecção Automática do Tipo de Dia)
                </CardTitle>
                <CardDescription className="text-xs">
                  Quando a data do plantão ou hora extra coincidir com este calendário, a regra de
                  feriado é aplicada automaticamente.
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
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 3: USUÁRIOS & PERFIS (PERMISSÕES CONFIGURÁVEIS)        */}
        {/* ========================================================= */}
        <TabsContent value="perfis" className="space-y-6">
          {/* Matriz Visual Explicativa */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Matriz de Perfis e Permissões do Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de acesso por cargo funcional. Cada ação no sistema obedece estritamente a
                estas permissões.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Admin / Direção</span>
                    <Badge className="bg-amber-500 text-white text-[9px]">Acesso Total</Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Controle pleno sobre empresas, cadastros, regras de cálculo, permissões e
                    aprovação de HE/trocas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Coordenação</span>
                    <Badge variant="outline" className="text-[9px]">
                      Operacional
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Aprovação de horas extras, autorização de trocas de plantão, postos e escalas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">RH / Admin</span>
                    <Badge variant="outline" className="text-[9px]">
                      Administrativo
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Cadastro de colaboradores, controle de vale-transporte, uniformes/EPIs e
                    conferência de HE.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Supervisor</span>
                    <Badge variant="outline" className="text-[9px]">
                      Supervisão
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Lançamento de solicitações no posto, entrega de uniformes e consulta de escalas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Consulta</span>
                    <Badge variant="outline" className="text-[9px]">
                      Leitura
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Apenas visualização de relatórios e dados para auditoria e prestação de contas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Usuários Cadastrados (Profiles) */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Usuários do Sistema & Configuração de Acesso
                </CardTitle>
                <CardDescription className="text-xs">
                  Edite nome, perfil funcional, empresa vinculada e status ativo de cada operador.
                  Alterações persistem diretamente no banco.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Usuário / Nome</TableHead>
                    <TableHead className="text-xs font-bold">E-mail (Login)</TableHead>
                    <TableHead className="text-xs font-bold">Perfil / Função</TableHead>
                    <TableHead className="text-xs font-bold">Empresa Vinculada</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProfiles ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        Carregando usuários do sistema...
                      </TableCell>
                    </TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        Nenhum perfil de usuário encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((p) => (
                      <TableRow key={p.id} className="text-xs hover:bg-slate-50">
                        <TableCell className="font-semibold text-slate-900">
                          {p.nome || 'Sem nome'}
                          {p.id === authUser?.id && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              Você
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-slate-600 font-mono text-[11px]">
                          {p.email}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={p.role === 'admin' ? 'default' : 'outline'}
                            className={`text-[10px] ${
                              p.role === 'admin'
                                ? 'bg-amber-500 text-white'
                                : p.role === 'coordenacao'
                                  ? 'border-blue-300 text-blue-800 bg-blue-50'
                                  : p.role === 'rh'
                                    ? 'border-purple-300 text-purple-800 bg-purple-50'
                                    : 'border-slate-300 text-slate-700 bg-slate-50'
                            }`}
                          >
                            {ROLE_LABELS[p.role] || p.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-slate-700">
                          {p.empresa?.nome ? (
                            <span className="font-medium">{p.empresa.nome}</span>
                          ) : (
                            <span className="text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                              Todas (Consolidado)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant={p.ativo ? 'default' : 'secondary'}
                            className={`text-[10px] ${
                              p.ativo
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {p.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUserModal(p)}
                            className="text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Editar Acesso
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================= */}
      {/* MODAL NOVO FORMULÁRIO PÚBLICO                             */}
      {/* ========================================================= */}
      <Dialog open={modalFormOpen} onOpenChange={setModalFormOpen}>
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
                onClick={() => setModalFormOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingForm}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {savingForm ? 'Criando...' : 'Criar Formulário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL REGRA DE HORA EXTRA                                 */}
      {/* ========================================================= */}
      <Dialog open={regraModalOpen} onOpenChange={setRegraModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveRegra}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingConfig ? 'Editar Regra de Hora Extra' : 'Nova Regra de Hora Extra'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure o percentual de acréscimo calculado automaticamente pelo sistema.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
                <Select value={regraEmpresaId} onValueChange={setRegraEmpresaId}>
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
                  value={regraNome}
                  onChange={(e) => setRegraNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Dia</Label>
                  <Select value={regraTipoDia} onValueChange={(v: any) => setRegraTipoDia(v)}>
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
                    value={regraPercentual}
                    onChange={(e) => setRegraPercentual(e.target.value)}
                    className="text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="regra-ativo-check"
                  checked={regraAtivo}
                  onChange={(e) => setRegraAtivo(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <Label
                  htmlFor="regra-ativo-check"
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
                disabled={savingRegra}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {savingRegra ? 'Gravando...' : 'Salvar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL FERIADO                                             */}
      {/* ========================================================= */}
      <Dialog open={feriadoModalOpen} onOpenChange={setFeriadoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveFeriado}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Cadastrar Feriado
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                O dia será reconhecido automaticamente nos cálculos de HE.
              </DialogDescription>
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
                <Label className="text-xs font-semibold text-slate-700">Tipo de Feriado</Label>
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
                disabled={savingFeriado}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {savingFeriado ? 'Gravando...' : 'Salvar Feriado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL EDITAR USUÁRIO & PERFIL                             */}
      {/* ========================================================= */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveUserProfile}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Editar Perfil & Permissões do Usuário
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                As configurações alteradas são salvas no banco de dados e entram em vigor
                imediatamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              {/* E-mail (somente leitura) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  E-mail de Login (Somente Leitura)
                </Label>
                <Input
                  disabled
                  value={userEmail}
                  className="text-xs bg-slate-100 text-slate-600 font-mono"
                />
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
                <Input
                  required
                  value={userNome}
                  onChange={(e) => setUserNome(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={userTelefone}
                  onChange={(e) => setUserTelefone(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Perfil / Role */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Perfil de Permissão *
                </Label>
                <Select value={userRole} onValueChange={(v: UserRole) => setUserRole(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador / Direção (Acesso Total)</SelectItem>
                    <SelectItem value="coordenacao">
                      Coordenação Operacional (Aprova HE e Trocas)
                    </SelectItem>
                    <SelectItem value="rh">
                      RH / Administrativo (Colaboradores, VT, EPIs)
                    </SelectItem>
                    <SelectItem value="supervisor">
                      Supervisor / Fiscal (Postos, EPIs, Consulta)
                    </SelectItem>
                    <SelectItem value="consulta">Consulta / Auditoria (Somente Leitura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Empresa Vinculada */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Empresa Vinculada *</Label>
                <Select value={userEmpresaId} onValueChange={setUserEmpresaId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Empresas (Visão Consolidada)</SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Ativo / Inativo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="user-ativo-check"
                  checked={userAtivo}
                  onChange={(e) => setUserAtivo(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500"
                />
                <Label
                  htmlFor="user-ativo-check"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Usuário Ativo no Sistema
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingUser}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {savingUser ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
