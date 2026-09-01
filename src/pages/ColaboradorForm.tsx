import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { useAuth } from '@/hooks/use-auth'
import { colaboradoresService, postosService, escalasService } from '@/services/gestao-service'
import { Posto, Escala } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Shield,
  Briefcase,
  Upload,
  Save,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Shirt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { formatCPF, isValidCPF, formatPhone } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function ColaboradorForm() {
  const { selectedEmpresaId, isConsolidado, empresas, hammerEmpresa, inteligenciaEmpresa } =
    useEmpresa()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [postos, setPostos] = useState<Posto[]>([])
  const [escalas, setEscalas] = useState<Escala[]>([])

  // Form State
  const [empresaId, setEmpresaId] = useState<string>(
    selectedEmpresaId !== 'consolidado' ? selectedEmpresaId : empresas[0]?.id || '',
  )
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [dataNascimento, setDataNascimento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('Vigilante')
  const [postoId, setPostoId] = useState<string>('none')
  const [dataAdmissao, setDataAdmissao] = useState(new Date().toISOString().split('T')[0])
  const [escalaId, setEscalaId] = useState<string>('none')
  const [horario, setHorario] = useState('07:00 às 19:00')
  const [turno, setTurno] = useState<'Diurno' | 'Noturno'>('Diurno')
  const [status, setStatus] = useState<'Ativo' | 'Inativo' | 'Férias' | 'Afastado'>('Ativo')
  const [valorHoraBase, setValorHoraBase] = useState('15.00')

  // Campos RH
  const [codigoRh, setCodigoRh] = useState('')
  const [cargaHorariaMensal, setCargaHorariaMensal] = useState('')
  const [situacaoRh, setSituacaoRh] = useState('')

  // VT
  const [numeroCartaoVT, setNumeroCartaoVT] = useState('')
  const [tipoTransporte, setTipoTransporte] = useState('Ônibus')
  const [valorDiarioVT, setValorDiarioVT] = useState('9.60')

  // Uniforme
  const [tamanhoCamisa, setTamanhoCamisa] = useState('M')
  const [tamanhoCalca, setTamanhoCalca] = useState('42')
  const [numeroCalcado, setNumeroCalcado] = useState('41')

  // Vigilância (Hammer Segurança)
  const [exigeVigilancia, setExigeVigilancia] = useState(false)
  const [cnvNumero, setCnvNumero] = useState('')
  const [cnvValidade, setCnvValidade] = useState('')
  const [cursoFormacao, setCursoFormacao] = useState(false)
  const [reciclagem, setReciclagem] = useState(false)
  const [dataUltimaReciclagem, setDataUltimaReciclagem] = useState('')
  const [proximoVencimentoReciclagem, setProximoVencimentoReciclagem] = useState('')

  // Foto & Observações
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const currentEmpresa = empresas.find((e) => e.id === empresaId)
  const isHammer =
    currentEmpresa?.tipo === 'seguranca' || currentEmpresa?.nome.toLowerCase().includes('hammer')

  useEffect(() => {
    if (empresaId) {
      postosService.list(empresaId).then(setPostos)
      escalasService.list(empresaId).then(setEscalas)
    }
  }, [empresaId])

  // Auto-detect vigilance documentation recommendation on cargo change
  useEffect(() => {
    if (isHammer) {
      const lowerCargo = cargo.toLowerCase()
      if (
        lowerCargo.includes('vigilante') ||
        lowerCargo.includes('segurança') ||
        lowerCargo.includes('escolta')
      ) {
        setExigeVigilancia(true)
      }
    } else {
      setExigeVigilancia(false)
    }
  }, [cargo, isHammer])

  const handleCpfChange = (val: string) => {
    const formatted = formatCPF(val)
    setCpf(formatted)
    if (formatted.length === 14) {
      if (!isValidCPF(formatted)) {
        setCpfError('CPF inválido. Verifique os dígitos.')
      } else {
        setCpfError(null)
      }
    } else {
      setCpfError(null)
    }
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O nome do colaborador é obrigatório.',
        variant: 'destructive',
      })
      return
    }
    if (cpf.length === 14 && !isValidCPF(cpf)) {
      toast({
        title: 'CPF Inválido',
        description: 'Por favor, informe um CPF válido.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      let fotoUrl = null

      // 1. Create collaborator
      const newColab = await colaboradoresService.create({
        empresa_id: empresaId,
        nome: nome.trim(),
        cpf: cpf.trim(),
        data_nascimento: dataNascimento || null,
        telefone: telefone ? formatPhone(telefone) : null,
        email: email.trim() || null,
        cargo: cargo.trim(),
        posto_id: postoId !== 'none' ? postoId : null,
        data_admissao: dataAdmissao,
        escala_id: escalaId !== 'none' ? escalaId : null,
        horario: horario.trim() || null,
        turno,
        status,
        codigo_rh: codigoRh.trim() || null,
        carga_horaria_mensal: cargaHorariaMensal ? Number(cargaHorariaMensal) : null,
        situacao_rh: situacaoRh.trim() || null,
        valor_hora_base: Number(valorHoraBase) || 15.0,
        numero_cartao_vt: numeroCartaoVT || null,
        tipo_transporte: tipoTransporte,
        valor_diario_vt: Number(valorDiarioVT) || 0,
        tamanho_camisa: tamanhoCamisa,
        tamanho_calca: tamanhoCalca,
        numero_calcado: numeroCalcado,
        exige_vigilancia: isHammer ? exigeVigilancia : false,
        cnv_numero: isHammer && exigeVigilancia ? cnvNumero : null,
        cnv_validade: isHammer && exigeVigilancia ? cnvValidade || null : null,
        curso_formacao: isHammer && exigeVigilancia ? cursoFormacao : false,
        reciclagem: isHammer && exigeVigilancia ? reciclagem : false,
        data_ultima_reciclagem: isHammer && exigeVigilancia ? dataUltimaReciclagem || null : null,
        proximo_vencimento_reciclagem:
          isHammer && exigeVigilancia ? proximoVencimentoReciclagem || null : null,
        observacoes: observacoes.trim() || null,
      })

      // 2. Upload photo if selected
      if (fotoFile && newColab?.id) {
        try {
          fotoUrl = await colaboradoresService.uploadPhoto(fotoFile, newColab.id)
          await colaboradoresService.update(newColab.id, { foto_url: fotoUrl })
        } catch (uploadErr) {
          console.error('Erro ao enviar foto:', uploadErr)
        }
      }

      toast({
        title: 'Colaborador Cadastrado',
        description: `${nome} foi inserido com sucesso na base.`,
      })

      navigate(`/colaboradores/${newColab.id}`)
    } catch (err: any) {
      console.error('Erro ao salvar colaborador:', err)
      toast({
        title: 'Erro ao salvar',
        description: err.message?.includes('duplicate key')
          ? 'Este CPF já está cadastrado no sistema.'
          : err.message || 'Ocorreu um erro ao persistir o cadastro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/colaboradores')}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Novo Colaborador</h2>
            <p className="text-xs text-slate-500">
              Preencha os dados cadastrais, documentais e operacionais.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Empresa & Foto */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              1. Identificação da Empresa e Foto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden mb-3 flex items-center justify-center border-2 border-white shadow-md relative">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <Label
                htmlFor="foto-upload"
                className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 text-slate-700"
              >
                <Upload className="w-3.5 h-3.5" />
                Escolher Foto
              </Label>
              <input
                id="foto-upload"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1">PNG, JPG até 5MB</span>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Empresa Vinculada *</Label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.tipo === 'seguranca' ? '🛡️ ' : '💼 '}
                        {emp.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  {isHammer
                    ? 'Empresa de Vigilância armada/desarmada — Permite controle de CNV e reciclagem.'
                    : 'Empresa de Facilities e Serviços gerais.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
                  <Input
                    required
                    placeholder="Ex: Carlos Eduardo da Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    CPF (Unicidade Real) *
                  </Label>
                  <Input
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className={`text-xs font-mono ${cpfError ? 'border-rose-500' : ''}`}
                  />
                  {cpfError && <p className="text-[11px] text-rose-500">{cpfError}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Telefone / WhatsApp
                  </Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
                  <Input
                    type="email"
                    placeholder="colaborador@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Integração / Controle de RH */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2.5">Dados de RH</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Código RH</Label>
                    <Input
                      placeholder="Ex: 97"
                      value={codigoRh}
                      onChange={(e) => setCodigoRh(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Carga horária mensal
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 220"
                      value={cargaHorariaMensal}
                      onChange={(e) => setCargaHorariaMensal(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Situação RH</Label>
                    <Input
                      placeholder="Ex: 1"
                      value={situacaoRh}
                      onChange={(e) => setSituacaoRh(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Dados Operacionais e Posto */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              2. Dados Operacionais e Alocação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cargo / Função *</Label>
              <Input
                required
                placeholder={isHammer ? 'Ex: Vigilante Patrimonial' : 'Ex: Auxiliar de Limpeza'}
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Posto de Trabalho</Label>
              <Select value={postoId} onValueChange={setPostoId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o posto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Base / Sem Posto Definido</SelectItem>
                  {postos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.cliente})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Data de Admissão *</Label>
              <Input
                type="date"
                required
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Escala de Trabalho</Label>
              <Select value={escalaId} onValueChange={setEscalaId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a escala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Escala Padrão / Sem Vínculo</SelectItem>
                  {escalas.map((esc) => (
                    <SelectItem key={esc.id} value={esc.id}>
                      {esc.nome} ({esc.tipo} - {esc.periodo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Horário Previsto</Label>
              <Input
                placeholder="Ex: 07:00 às 19:00"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Turno</Label>
              <Select value={turno} onValueChange={(v: any) => setTurno(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diurno">Diurno</SelectItem>
                  <SelectItem value="Noturno">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Status do Colaborador *
              </Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo (Desligado)</SelectItem>
                  <SelectItem value="Férias">Férias</SelectItem>
                  <SelectItem value="Afastado">Afastado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Valor Hora Base (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={valorHoraBase}
                onChange={(e) => setValorHoraBase(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-400">Utilizado no cálculo automático de HE.</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Documentação de Vigilância (SOMENTE HAMMER SEGURANÇA) */}
        {isHammer ? (
          <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
            <CardHeader className="pb-3 border-b border-amber-200/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  3. Documentação de Vigilância (Hammer Segurança)
                </CardTitle>
                <CardDescription className="text-xs">
                  Controle obrigatório de CNV, cursos e reciclagens para vigilantes.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="vigilancia-toggle"
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Exige Vigilância
                </label>
                <input
                  type="checkbox"
                  id="vigilancia-toggle"
                  checked={exigeVigilancia}
                  onChange={(e) => setExigeVigilancia(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
              </div>
            </CardHeader>

            {exigeVigilancia && (
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Número da CNV</Label>
                  <Input
                    placeholder="Ex: CNV-987654"
                    value={cnvNumero}
                    onChange={(e) => setCnvNumero(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Validade da CNV</Label>
                  <Input
                    type="date"
                    value={cnvValidade}
                    onChange={(e) => setCnvValidade(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-white">
                    <input
                      type="checkbox"
                      id="curso-formacao"
                      checked={cursoFormacao}
                      onChange={(e) => setCursoFormacao(e.target.checked)}
                      className="h-4 w-4 rounded text-amber-500"
                    />
                    <label htmlFor="curso-formacao" className="text-xs font-medium text-slate-700">
                      Curso de Formação Concluído
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-white">
                    <input
                      type="checkbox"
                      id="reciclagem"
                      checked={reciclagem}
                      onChange={(e) => setReciclagem(e.target.checked)}
                      className="h-4 w-4 rounded text-amber-500"
                    />
                    <label htmlFor="reciclagem" className="text-xs font-medium text-slate-700">
                      Reciclagem em Dia
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Data da Última Reciclagem
                  </Label>
                  <Input
                    type="date"
                    value={dataUltimaReciclagem}
                    onChange={(e) => setDataUltimaReciclagem(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Próximo Vencimento Reciclagem
                  </Label>
                  <Input
                    type="date"
                    value={proximoVencimentoReciclagem}
                    onChange={(e) => setProximoVencimentoReciclagem(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ) : null}

        {/* Section 4: Vale-Transporte & Uniforme */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              4. Benefícios e Uniformes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nº Cartão Vale-Transporte
              </Label>
              <Input
                placeholder="Ex: 01.12.34567890-1"
                value={numeroCartaoVT}
                onChange={(e) => setNumeroCartaoVT(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Transporte</Label>
              <Select value={tipoTransporte} onValueChange={setTipoTransporte}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ônibus">Ônibus</SelectItem>
                  <SelectItem value="Metrô / Trem">Metrô / Trem</SelectItem>
                  <SelectItem value="Integração">Integração Ônibus/Metrô</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Valor Diário VT (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorDiarioVT}
                onChange={(e) => setValorDiarioVT(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tamanho de Camisa</Label>
              <Select value={tamanhoCamisa} onValueChange={setTamanhoCamisa}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PP">PP</SelectItem>
                  <SelectItem value="P">P</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                  <SelectItem value="GG">GG</SelectItem>
                  <SelectItem value="XGG">XGG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tamanho de Calça</Label>
              <Input
                placeholder="Ex: 40, 42, 44"
                value={tamanhoCalca}
                onChange={(e) => setTamanhoCalca(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Número do Calçado</Label>
              <Input
                placeholder="Ex: 39, 40, 41, 42"
                value={numeroCalcado}
                onChange={(e) => setNumeroCalcado(e.target.value)}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Observações */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              5. Observações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea
              placeholder="Informações adicionais relevantes sobre o colaborador..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/colaboradores')}
            disabled={saving}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Salvando Cadastro...' : 'Salvar Colaborador'}
          </Button>
        </div>
      </form>
    </div>
  )
}
