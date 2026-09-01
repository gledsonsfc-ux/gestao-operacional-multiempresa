import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  formulariosService,
  colaboradoresService,
  postosService,
  horasExtrasService,
  trocasService,
  uniformesService,
  horaExtraConfigsService,
} from '@/services/gestao-service'
import { FormularioPublico, Colaborador, Posto, HoraExtraConfig, Feriado } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Clock,
  ArrowLeftRight,
  Shirt,
  ShieldAlert,
  CheckCircle2,
  Send,
  Loader2,
  Calendar,
  PenTool,
  AlertTriangle,
  Building,
} from 'lucide-react'
import { calculateHoursDifference, calculateOvertime, formatCurrency } from '@/lib/formatters'

const ITENS_EPI = [
  'Camisa Polo',
  'Calça Operacional',
  'Calçado / Bota',
  'Jaqueta de Frio',
  'Crachá',
  'Cordão de Crachá',
  'Luvas de Procedimento',
  'Máscaras',
  'Colete Tático',
  'Capa de Chuva',
  'Outro',
]

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()

  const [formConfig, setFormConfig] = useState<FormularioPublico | null>(null)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [heConfigs, setHeConfigs] = useState<HoraExtraConfig[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states common
  const [colaboradorId, setColaboradorId] = useState('')
  const [postoId, setPostoId] = useState('none')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')

  // Form states: Hora Extra
  const [entrada, setEntrada] = useState('18:00')
  const [saida, setSaida] = useState('22:00')
  const [quantidadeHoras, setQuantidadeHoras] = useState(4)
  const [valorCalculado, setValorCalculado] = useState(0)

  // Form states: Troca de Plantão
  const [substitutoId, setSubstitutoId] = useState('')
  const [horarioTroca, setHorarioTroca] = useState('07:00 às 19:00')
  const [motivoTroca, setMotivoTroca] = useState('')

  // Form states: Uniforme / EPI
  const [itemEpi, setItemEpi] = useState('Camisa Polo')
  const [tamanhoEpi, setTamanhoEpi] = useState('M')
  const [quantidadeEpi, setQuantidadeEpi] = useState(1)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    formulariosService
      .getBySlug(slug)
      .then(async (config) => {
        setFormConfig(config)
        if (config?.empresa_id) {
          const [colabs, pList, configsList, fList] = await Promise.all([
            colaboradoresService.list(config.empresa_id),
            postosService.list(config.empresa_id),
            horaExtraConfigsService.getConfigs(config.empresa_id),
            horaExtraConfigsService.listFeriados(),
          ])
          setColaboradores(colabs.filter((c) => c.status === 'Ativo'))
          setPostos(pList)
          setHeConfigs(configsList)
          setFeriados(fList)
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar formulário público:', err)
        setErrorMsg('Formulário não localizado ou inativo.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  // Recalculate HE for public form
  useEffect(() => {
    if (formConfig?.tipo !== 'hora_extra') return
    const diff = calculateHoursDifference(entrada, saida)
    setQuantidadeHoras(diff)

    const colab = colaboradores.find((c) => c.id === colaboradorId)
    const valorHora = colab?.valor_hora_base ? Number(colab.valor_hora_base) : 15.0

    const detection = horaExtraConfigsService.detectDayType(data, feriados)
    const matchingConfig = heConfigs.find((c) => c.tipo_dia === detection.tipo)
    const perc = matchingConfig ? Number(matchingConfig.percentual) : 50

    const { valorCalculado: val } = calculateOvertime(diff, valorHora, perc)
    setValorCalculado(val)
  }, [entrada, saida, data, colaboradorId, feriados, heConfigs, formConfig])

  // Canvas handlers
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
    if (canvas) setSignatureData(canvas.toDataURL())
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignatureData(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formConfig || !colaboradorId) {
      setErrorMsg('Por favor, selecione o colaborador.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    try {
      if (formConfig.tipo === 'hora_extra') {
        const colab = colaboradores.find((c) => c.id === colaboradorId)
        const valorHora = colab?.valor_hora_base ? Number(colab.valor_hora_base) : 15.0
        const detection = horaExtraConfigsService.detectDayType(data, feriados)
        const matchingConfig = heConfigs.find((c) => c.tipo_dia === detection.tipo)
        const perc = matchingConfig ? Number(matchingConfig.percentual) : 50
        const { valorCalculado: val, memoriaCalculo: mem } = calculateOvertime(
          quantidadeHoras,
          valorHora,
          perc,
          matchingConfig?.nome,
        )

        await horasExtrasService.create({
          empresa_id: formConfig.empresa_id,
          colaborador_id: colaboradorId,
          posto_id: postoId !== 'none' ? postoId : null,
          data,
          entrada,
          saida,
          quantidade_horas: quantidadeHoras,
          tipo_dia: detection.tipo,
          percentual: perc,
          valor_hora: valorHora,
          valor_calculado: val,
          memoria_calculo: mem,
          status: 'Pendente',
          origem: 'Formulário Público',
          observacao: observacao.trim() || null,
        })
      } else if (formConfig.tipo === 'troca_plantao') {
        if (!substitutoId || substitutoId === colaboradorId) {
          throw new Error('Selecione um substituto diferente do solicitante.')
        }
        if (!motivoTroca.trim()) {
          throw new Error('Informe o motivo da troca.')
        }

        await trocasService.create({
          empresa_id: formConfig.empresa_id,
          solicitante_id: colaboradorId,
          substituto_id: substitutoId,
          posto_id: postoId !== 'none' ? postoId : null,
          data,
          horario: horarioTroca,
          motivo: motivoTroca.trim(),
          status: 'Pendente',
          origem: 'Formulário Público',
          observacao: observacao.trim() || null,
        })
      } else if (formConfig.tipo === 'uniforme_epi') {
        await uniformesService.create({
          empresa_id: formConfig.empresa_id,
          colaborador_id: colaboradorId,
          item: itemEpi,
          tamanho: tamanhoEpi || null,
          quantidade: quantidadeEpi,
          tipo_movimentacao: 'Entrega',
          data_movimentacao: data,
          responsavel_entrega: 'Solicitação Web',
          observacao: observacao.trim() || null,
          status: 'Pendente',
          assinatura_base64: signatureData || null,
          origem: 'Formulário Público',
        })
      }

      setSubmitted(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar envio do formulário.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs text-slate-400">Carregando formulário operacional...</p>
      </div>
    )
  }

  if (!formConfig || !formConfig.ativo) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold">Formulário Indisponível</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Este link foi desativado ou não existe. Entre em contato com a coordenação operacional.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a101f] via-[#0f1b33] to-[#152342] py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        {/* Public Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xl shadow-amber-500/20 mb-3 border border-amber-400/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formConfig.titulo}
          </h1>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mt-1">
            {formConfig.empresa?.nome} • Gestão Operacional
          </p>
          {formConfig.descricao && (
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">{formConfig.descricao}</p>
          )}
        </div>

        <Card className="border-slate-800 bg-white/95 backdrop-blur text-slate-900 shadow-2xl">
          {submitted ? (
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Solicitação Enviada com Sucesso!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Seus dados foram integrados diretamente no sistema operacional. A coordenação foi
                notificada para análise e conferência.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => {
                    setSubmitted(false)
                    setColaboradorId('')
                    setMotivoTroca('')
                    setObservacao('')
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                >
                  Enviar Outra Solicitação
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Colaborador */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    {formConfig.tipo === 'troca_plantao'
                      ? 'Colaborador Solicitante (Você) *'
                      : 'Seu Nome / Colaborador *'}
                  </Label>
                  <Select
                    value={colaboradorId}
                    onValueChange={(id) => {
                      setColaboradorId(id)
                      const colab = colaboradores.find((c) => c.id === id)
                      if (colab?.posto_id) setPostoId(colab.posto_id)
                    }}
                  >
                    <SelectTrigger className="text-xs h-10 bg-slate-50">
                      <SelectValue placeholder="Selecione seu nome na lista" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} ({c.cargo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Posto */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Posto de Trabalho *
                  </Label>
                  <Select value={postoId} onValueChange={setPostoId}>
                    <SelectTrigger className="text-xs h-10 bg-slate-50">
                      <SelectValue placeholder="Selecione o posto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Base Operacional / Sem Posto</SelectItem>
                      {postos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} ({p.cliente})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">Data *</Label>
                  <Input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="text-xs h-10 bg-slate-50"
                  />
                </div>

                {/* FIELDS SPECIFIC TO FORM TYPE */}
                {formConfig.tipo === 'hora_extra' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-800">
                          Entrada Real *
                        </Label>
                        <Input
                          type="time"
                          required
                          value={entrada}
                          onChange={(e) => setEntrada(e.target.value)}
                          className="text-xs h-10 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-800">Saída Real *</Label>
                        <Input
                          type="time"
                          required
                          value={saida}
                          onChange={(e) => setSaida(e.target.value)}
                          className="text-xs h-10 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span>
                        Horas Calculadas: <strong className="text-sm">{quantidadeHoras}h</strong>
                      </span>
                      <span>
                        Valor Estimado:{' '}
                        <strong className="text-sm text-emerald-700">
                          {formatCurrency(valorCalculado)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {formConfig.tipo === 'troca_plantao' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-800">
                        Colaborador Substituto (Quem vai cobrir) *
                      </Label>
                      <Select value={substitutoId} onValueChange={setSubstitutoId}>
                        <SelectTrigger className="text-xs h-10 bg-slate-50">
                          <SelectValue placeholder="Selecione o substituto" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {colaboradores
                            .filter((c) => c.id !== colaboradorId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-800">
                        Horário da Troca *
                      </Label>
                      <Input
                        required
                        value={horarioTroca}
                        onChange={(e) => setHorarioTroca(e.target.value)}
                        className="text-xs h-10 bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-800">
                        Motivo da Substituição *
                      </Label>
                      <Textarea
                        required
                        placeholder="Informe detalhadamente a justificativa da troca de plantão..."
                        value={motivoTroca}
                        onChange={(e) => setMotivoTroca(e.target.value)}
                        className="text-xs min-h-[60px] bg-slate-50"
                      />
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                      ⚠️ O envio deste pedido <strong>não autoriza a troca</strong>. A coordenação
                      analisará e dará a autorização final.
                    </div>
                  </div>
                )}

                {formConfig.tipo === 'uniforme_epi' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-800">
                          Item Solicitado *
                        </Label>
                        <Select value={itemEpi} onValueChange={setItemEpi}>
                          <SelectTrigger className="text-xs h-10 bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITENS_EPI.map((it) => (
                              <SelectItem key={it} value={it}>
                                {it}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-800">Tamanho</Label>
                        <Input
                          placeholder="Ex: G, 42"
                          value={tamanhoEpi}
                          onChange={(e) => setTamanhoEpi(e.target.value)}
                          className="text-xs h-10 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-amber-600" />
                          Assinatura Digital (Assine na tela)
                        </Label>
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="text-[11px] text-rose-600 hover:underline"
                        >
                          Limpar
                        </button>
                      </div>
                      <div className="border border-slate-300 rounded-lg bg-slate-50 overflow-hidden relative">
                        <canvas
                          ref={canvasRef}
                          width={450}
                          height={90}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-24 cursor-crosshair bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações Gerais */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Observações adicionais
                  </Label>
                  <Textarea
                    placeholder="Alguma informação extra sobre a solicitação..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="text-xs min-h-[50px] bg-slate-50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-11 shadow-lg shadow-amber-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Gravando Solicitação...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
