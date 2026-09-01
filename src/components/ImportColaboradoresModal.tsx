import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building2,
  UserCheck,
  UserPlus,
  AlertTriangle,
  X,
  FileCheck,
  Shield,
  Briefcase,
  HelpCircle,
} from 'lucide-react'
import { useEmpresa } from '@/hooks/use-empresa'
import { colaboradoresService } from '@/services/gestao-service'
import {
  parseColaboradoresFile,
  executeColaboradoresImport,
  ImportPreviewSummary,
  ImportExecutionReport,
} from '@/services/import-service'
import { formatCPF, formatDateBR } from '@/lib/formatters'
import { toast } from '@/hooks/use-toast'

interface ImportColaboradoresModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportColaboradoresModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportColaboradoresModalProps) {
  const { empresas } = useEmpresa()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewSummary | null>(null)
  const [report, setReport] = useState<ImportExecutionReport | null>(null)
  const [activeTab, setActiveTab] = useState<'novos' | 'atualizacoes' | 'pendencias'>('novos')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleReset = () => {
    setFile(null)
    setParsing(false)
    setImporting(false)
    setPreview(null)
    setReport(null)
    setErrorMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const ext = selected.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setErrorMessage('Formato inválido. Por favor, envie um arquivo .xlsx ou .csv.')
      return
    }

    setFile(selected)
    setErrorMessage(null)
    setParsing(true)

    try {
      // Fetch all existing colaboradores to compare for upsert
      const existing = await colaboradoresService.list('consolidado')
      const parsedSummary = await parseColaboradoresFile(selected, empresas, existing)
      setPreview(parsedSummary)
    } catch (err: any) {
      console.error('Erro ao processar planilha:', err)
      setErrorMessage(
        `Erro ao ler o arquivo: ${err.message || 'Verifique se a planilha é válida e tente novamente.'}`,
      )
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!preview) return

    setImporting(true)
    setErrorMessage(null)

    try {
      const validRows = preview.rows.filter((r) => r.isValid)
      const pendingRows = preview.rows.filter((r) => !r.isValid)

      const executionReport = await executeColaboradoresImport(validRows, pendingRows)
      setReport(executionReport)

      toast({
        title: 'Importação concluída!',
        description: `${executionReport.hammerCreated + executionReport.inteligenciaCreated} cadastrados, ${executionReport.hammerUpdated + executionReport.inteligenciaUpdated} atualizados.`,
      })

      onSuccess()
    } catch (err: any) {
      console.error('Erro ao executar importação:', err)
      setErrorMessage(`Falha na importação: ${err.message || 'Erro inesperado'}`)
    } finally {
      setImporting(false)
    }
  }

  const novosList = preview?.rows.filter((r) => r.isValid && r.action === 'insert') || []
  const atualizacoesList = preview?.rows.filter((r) => r.isValid && r.action === 'update') || []
  const pendenciasList = preview?.pendingList || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-xl p-0 gap-0 border-slate-200 shadow-2xl">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                Importar Colaboradores (XLSX / CSV)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Upload de arquivo para cadastro e atualização em lote por CPF para Hammer Segurança
                e Inteligência e Serviços.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* STEP 1: Upload Box (shown if no preview and no report) */}
          {!preview && !report && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
              >
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
                  {parsing ? (
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1">
                  {parsing ? 'Processando arquivo...' : 'Selecione ou arraste sua planilha aqui'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Suporte para arquivos <span className="font-mono font-medium">.xlsx</span> ou{' '}
                  <span className="font-mono font-medium">.csv</span> com colunas em português.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={parsing}
                  className="text-xs font-semibold"
                >
                  Procurar no Computador
                </Button>
              </div>

              {/* Informative column mapping reference */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  Cabeçalhos reconhecidos automaticamente pelo sistema:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Código RH</span> → RH ID
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Nome completo *</span> → Nome
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">CPF *</span> → Chave única
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Data de nascimento</span> → Data
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Telefone / WhatsApp</span> → Tel
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">E-mail</span> → E-mail
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Empresa *</span> → Hammer /
                    Inteligência
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Cargo / Função</span> → Cargo
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Data de admissão</span> →
                    Admissão
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Carga horária mensal</span> → CH
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Status</span> → Ativo / Inativo
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Situação RH / Obs</span> → RH
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Atenção: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW SUMMARY BEFORE IMPORT */}
          {preview && !report && (
            <div className="space-y-5">
              {/* Top Banner */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-medium">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  Arquivo: <span className="font-bold">{file?.name}</span> ({preview.totalRows}{' '}
                  linhas identificadas)
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-100"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Trocar arquivo
                </Button>
              </div>

              {/* Stat Cards Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" /> Hammer - Novos
                  </div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">{preview.hammerNew}</div>
                  <div className="text-[10px] text-emerald-700">A serem cadastrados</div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-blue-800 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Hammer - Atualizar
                  </div>
                  <div className="text-xl font-bold text-blue-900 mt-1">{preview.hammerUpdate}</div>
                  <div className="text-[10px] text-blue-700">Já existentes (CPF)</div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-sky-800 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-sky-600" /> Inteligência - Novos
                  </div>
                  <div className="text-xl font-bold text-sky-900 mt-1">
                    {preview.inteligenciaNew}
                  </div>
                  <div className="text-[10px] text-sky-700">A serem cadastrados</div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-[11px] font-semibold text-indigo-800 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Inteligência - Atualizar
                  </div>
                  <div className="text-xl font-bold text-indigo-900 mt-1">
                    {preview.inteligenciaUpdate}
                  </div>
                  <div className="text-[10px] text-indigo-700">Já existentes (CPF)</div>
                </div>
              </div>

              {preview.pendingCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong className="font-bold">{preview.pendingCount} registros</strong> serão
                      ignorados ou ficaram como pendentes devido a regras de validação (ex: contato
                      extra, sem CPF válido).
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs with detailed lists */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full space-y-3"
              >
                <TabsList className="bg-slate-100 p-1 rounded-lg grid grid-cols-3 text-xs">
                  <TabsTrigger value="novos" className="text-xs">
                    Novos a Cadastrar ({novosList.length})
                  </TabsTrigger>
                  <TabsTrigger value="atualizacoes" className="text-xs">
                    Atualizações ({atualizacoesList.length})
                  </TabsTrigger>
                  <TabsTrigger value="pendencias" className="text-xs">
                    Pendências / Ignorados ({pendenciasList.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Novos */}
                <TabsContent value="novos" className="m-0">
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Cód RH</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Nome</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">CPF</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Empresa
                          </TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Cargo</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Contato
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {novosList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-6 text-xs text-slate-400"
                            >
                              Nenhum novo colaborador para cadastrar.
                            </TableCell>
                          </TableRow>
                        ) : (
                          novosList.map((r, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-mono text-[11px] text-slate-600">
                                {r.codigo_rh || '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900">
                                {r.nome}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-slate-600">
                                {formatCPF(r.cpf || '')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    r.empresa_slug === 'hammer-seguranca'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}
                                >
                                  {r.empresa_slug === 'hammer-seguranca'
                                    ? 'Hammer'
                                    : 'Inteligência'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-700">{r.cargo || '-'}</TableCell>
                              <TableCell className="text-[11px] text-slate-600">
                                {r.telefone || r.email || (
                                  <span className="text-slate-400 italic">Sem contato</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Tab: Atualizações */}
                <TabsContent value="atualizacoes" className="m-0">
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Cód RH</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Nome</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">CPF</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Empresa
                          </TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Cargo</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {atualizacoesList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-6 text-xs text-slate-400"
                            >
                              Nenhum colaborador existente para atualizar.
                            </TableCell>
                          </TableRow>
                        ) : (
                          atualizacoesList.map((r, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-mono text-[11px] text-slate-600">
                                {r.codigo_rh || '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900">
                                {r.nome}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-slate-600">
                                {formatCPF(r.cpf || '')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    r.empresa_slug === 'hammer-seguranca'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}
                                >
                                  {r.empresa_slug === 'hammer-seguranca'
                                    ? 'Hammer'
                                    : 'Inteligência'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-700">{r.cargo || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px]">
                                  Atualizar dados
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Tab: Pendências */}
                <TabsContent value="pendencias" className="m-0">
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Nome</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">CPF</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Empresa / Aba
                          </TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Motivo da Pendência
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendenciasList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-6 text-xs text-slate-400"
                            >
                              Nenhuma pendência ou registro ignorado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendenciasList.map((p, i) => (
                            <TableRow key={i} className="text-xs bg-amber-50/20">
                              <TableCell className="font-medium text-slate-800">
                                {p.nome || '(Não informado)'}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-slate-600">
                                {p.cpf ? formatCPF(p.cpf) : '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {p.empresa || p.sheetName}
                              </TableCell>
                              <TableCell className="text-rose-700 font-medium">
                                {p.reason}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* STEP 3: FINAL EXECUTION REPORT */}
          {report && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    Importação Finalizada com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Os dados foram persistidos no banco de dados e estão disponíveis para consulta e
                    edição.
                  </p>
                </div>
              </div>

              {/* Execution Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" /> Hammer Cadastrados
                  </div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {report.hammerCreated}
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Hammer Atualizados
                  </div>
                  <div className="text-xl font-bold text-blue-600 mt-1">{report.hammerUpdated}</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-sky-600" /> Inteligência Cadastrados
                  </div>
                  <div className="text-xl font-bold text-sky-600 mt-1">
                    {report.inteligenciaCreated}
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Inteligência Atualizados
                  </div>
                  <div className="text-xl font-bold text-indigo-600 mt-1">
                    {report.inteligenciaUpdated}
                  </div>
                </div>
              </div>

              {/* Pendencies / Failures report list */}
              {(report.pendingDetails.length > 0 || report.failedDetails.length > 0) && (
                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Registros Pendentes ou Não Importados (
                    {report.pendingDetails.length + report.failedDetails.length})
                  </h5>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Nome</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">CPF</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">
                            Empresa
                          </TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.failedDetails.map((f, i) => (
                          <TableRow key={`f-${i}`} className="bg-rose-50/30 text-xs">
                            <TableCell className="font-semibold text-rose-900">
                              {f.nome || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600">
                              {f.cpf ? formatCPF(f.cpf) : '-'}
                            </TableCell>
                            <TableCell className="text-slate-600">{f.empresa || '-'}</TableCell>
                            <TableCell className="text-rose-700 font-medium">
                              Erro: {f.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                        {report.pendingDetails.map((p, i) => (
                          <TableRow key={`p-${i}`} className="bg-amber-50/20 text-xs">
                            <TableCell className="font-medium text-slate-800">
                              {p.nome || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600">
                              {p.cpf ? formatCPF(p.cpf) : '-'}
                            </TableCell>
                            <TableCell className="text-slate-600">{p.empresa || '-'}</TableCell>
                            <TableCell className="text-amber-800">{p.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between sm:justify-between sticky bottom-0">
          <div>
            {preview && !report && (
              <span className="text-xs text-slate-500 font-medium">
                Total a processar: {preview.validCount} colaboradores válidos
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!report ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={importing || parsing}
                  className="text-xs"
                >
                  Cancelar
                </Button>

                {preview && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmImport}
                    disabled={importing || preview.validCount === 0}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Gravando no Banco...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Confirmar e Gravar ({preview.validCount})
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleClose}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
              >
                Fechar Relatório
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
