import { useEffect, useState } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import {
  colaboradoresService,
  postosService,
  horasExtrasService,
  valeTransporteService,
} from '@/services/gestao-service'
import { Colaborador, Posto, HoraExtra, ValeTransporte } from '@/types/gestao'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  FileSpreadsheet,
  Printer,
  Users,
  Clock,
  Bus,
  Building,
  RotateCcw,
  Download,
  FileCode,
} from 'lucide-react'
import { formatCurrency, formatDateBR } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function RelatoriosPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'horas' | 'vt' | 'efetivo'>('horas')
  const [loading, setLoading] = useState(true)

  // Raw fetched Data
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([])
  const [vtList, setVtList] = useState<ValeTransporte[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])

  // Dropdown list for collaborator selector
  const [colaboradoresOptions, setColaboradoresOptions] = useState<Colaborador[]>([])

  // Filters
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas')
  const [filtroPosto, setFiltroPosto] = useState('todos')
  const [filtroColaborador, setFiltroColaborador] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Determine which empresaId to query the backend with
  // If global context is 'consolidado', the user might also have picked a specific empresa in the subfilter
  const effectiveEmpresaId = isConsolidado
    ? filtroEmpresa !== 'todas'
      ? filtroEmpresa
      : 'consolidado'
    : selectedEmpresaId

  // Load collaborator dropdown options whenever the empresa context changes
  useEffect(() => {
    colaboradoresService
      .list(effectiveEmpresaId)
      .then((data) => setColaboradoresOptions(data))
      .catch((err) => console.error('Erro ao listar opções de colaboradores:', err))
  }, [effectiveEmpresaId])

  // Reset subfilter when switching global company context
  useEffect(() => {
    setFiltroEmpresa('todas')
    setFiltroPosto('todos')
    setFiltroColaborador('todos')
  }, [selectedEmpresaId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [heData, vtData, colabsData, postosData] = await Promise.all([
        horasExtrasService.list(effectiveEmpresaId, {
          postoId: filtroPosto,
          colaboradorId: filtroColaborador,
          status: filtroStatus,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        }),
        valeTransporteService.list(effectiveEmpresaId, {
          colaboradorId: filtroColaborador,
        }),
        colaboradoresService.list(effectiveEmpresaId, {
          postoId: filtroPosto,
          status: filtroStatus,
        }),
        postosService.list(effectiveEmpresaId),
      ])

      // If collaborator filter is active, also refine the Efetivo tab
      let filteredColabs = colabsData
      if (filtroColaborador !== 'todos') {
        filteredColabs = filteredColabs.filter((c) => c.id === filtroColaborador)
      }

      setHorasExtras(heData)
      setVtList(vtData)
      setColaboradores(filteredColabs)
      setPostos(postosData)
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [
    effectiveEmpresaId,
    filtroEmpresa,
    filtroPosto,
    filtroColaborador,
    filtroStatus,
    dataInicio,
    dataFim,
  ])

  const handleClearFilters = () => {
    setFiltroEmpresa('todas')
    setFiltroPosto('todos')
    setFiltroColaborador('todos')
    setFiltroStatus('todos')
    setDataInicio('')
    setDataFim('')
  }

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'

    if (activeTab === 'horas') {
      csvContent +=
        'Colaborador,Empresa,Posto,Data,Entrada,Saida,Horas,Tipo,Percentual,Valor Hora,Valor Total,Status\n'
      horasExtras.forEach((h) => {
        csvContent += `"${h.colaborador?.nome || ''}","${h.empresa?.nome || ''}","${h.posto?.nome || ''}","${h.data}","${h.entrada}","${h.saida}",${h.quantidade_horas},"${h.tipo_dia}",${h.percentual},${h.valor_hora},${h.valor_calculado},"${h.status}"\n`
      })
    } else if (activeTab === 'vt') {
      csvContent +=
        'Colaborador,Empresa,Competencia,Numero Cartao,Tipo,Valor Diario,Dias Previstos,Valor Previsto,Valor Depositado,Diferenca\n'
      vtList.forEach((v) => {
        csvContent += `"${v.colaborador?.nome || ''}","${v.empresa?.nome || ''}","${v.competencia}","${v.numero_cartao || ''}","${v.tipo_transporte}",${v.valor_diario},${v.dias_previstos},${v.valor_previsto},${v.valor_depositado},${v.diferenca}\n`
      })
    } else {
      csvContent += 'Nome,CPF,Empresa,Cargo,Posto,Admissao,Escala,Turno,Status\n'
      colaboradores.forEach((c) => {
        csvContent += `"${c.nome}","${c.cpf}","${c.empresa?.nome || ''}","${c.cargo}","${c.posto?.nome || ''}","${c.data_admissao}","${c.escala?.nome || ''}","${c.turno}","${c.status}"\n`
      })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `relatorio_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({ title: 'Exportação CSV Concluída', description: 'Arquivo CSV gerado com sucesso.' })
  }

  const handleExportExcel = () => {
    // Generate an Excel XML (.xls / .xlsx readable by MS Excel, Google Sheets, LibreOffice)
    // with styled headers, formatted columns, and numeric types
    let sheetName = 'Relatório'
    let headers: string[] = []
    let rows: (string | number)[][] = []
    let totalRow: (string | number)[] | null = null

    if (activeTab === 'horas') {
      sheetName = 'Horas Extras'
      headers = [
        'Colaborador',
        'Empresa',
        'Posto de Trabalho',
        'Data',
        'Entrada',
        'Saída',
        'Quantidade de Horas',
        'Tipo de Dia',
        'Percentual (%)',
        'Valor da Hora Base (R$)',
        'Valor Total Calculado (R$)',
        'Status',
      ]
      rows = horasExtras.map((h) => [
        h.colaborador?.nome || '',
        h.empresa?.nome || '',
        h.posto?.nome || 'Base',
        formatDateBR(h.data),
        h.entrada || '',
        h.saida || '',
        Number(h.quantidade_horas) || 0,
        h.tipo_dia || '',
        Number(h.percentual) || 0,
        Number(h.valor_hora) || 0,
        Number(h.valor_calculado) || 0,
        h.status || '',
      ])
      totalRow = [
        'TOTAL GERAL',
        '',
        '',
        '',
        '',
        '',
        totalHorasQtd,
        '',
        '',
        '',
        totalHorasVal,
        `${horasExtras.length} registros`,
      ]
    } else if (activeTab === 'vt') {
      sheetName = 'Vale-Transporte'
      headers = [
        'Colaborador',
        'Empresa',
        'Competência',
        'Número do Cartão',
        'Tipo de Transporte',
        'Valor Diário (R$)',
        'Dias Previstos',
        'Dias Trabalhados',
        'Valor Previsto (R$)',
        'Valor Depositado (R$)',
        'Diferença (R$)',
      ]
      rows = vtList.map((v) => [
        v.colaborador?.nome || '',
        v.empresa?.nome || '',
        v.competencia || '',
        v.numero_cartao || '-',
        v.tipo_transporte || '',
        Number(v.valor_diario) || 0,
        Number(v.dias_previstos) || 0,
        Number(v.dias_trabalhados) || 0,
        Number(v.valor_previsto) || 0,
        Number(v.valor_depositado) || 0,
        Number(v.diferenca) || 0,
      ])
      totalRow = [
        'TOTAL GERAL',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalVtPrevisto,
        totalVtDepositado,
        totalVtDiferenca,
      ]
    } else {
      sheetName = 'Efetivo Colaboradores'
      headers = [
        'Nome Completo',
        'CPF',
        'Empresa',
        'Cargo',
        'Posto de Trabalho',
        'Data de Admissão',
        'Escala',
        'Turno',
        'Status',
        'Valor Hora Base (R$)',
        'Valor Diário VT (R$)',
      ]
      rows = colaboradores.map((c) => [
        c.nome,
        c.cpf,
        c.empresa?.nome || '',
        c.cargo,
        c.posto?.nome || 'Base',
        formatDateBR(c.data_admissao),
        c.escala?.nome || '-',
        c.turno,
        c.status,
        Number(c.valor_hora_base) || 0,
        Number(c.valor_diario_vt) || 0,
      ])
      totalRow = [
        'TOTAL GERAL',
        `${colaboradores.length} colaboradores`,
        '',
        '',
        '',
        '',
        '',
        '',
        `${countAtivos} ativos / ${countInativos} inativos`,
        '',
        '',
      ]
    }

    const escapeXml = (unsafe: any) => {
      if (unsafe === null || unsafe === undefined) return ''
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Relatório Operacional - ${escapeXml(sheetName)}</Title>
  <Author>Gestão Operacional Multiempresa</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1e293b"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0f172a" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0f172a"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0f172a"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="TotalCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0f172a"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0f172a"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#0f172a" ss:Bold="1"/>
   <Interior ss:Color="#fef3c7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TotalNumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0f172a"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0f172a"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#0f172a" ss:Bold="1"/>
   <Interior ss:Color="#fef3c7" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultRowHeight="20">`

    // Columns width
    headers.forEach(() => {
      xml += `\n   <Column ss:AutoFitWidth="1" ss:Width="120"/>`
    })

    // Header Row
    xml += `\n   <Row ss:Height="26" ss:StyleID="Header">`
    headers.forEach((h) => {
      xml += `\n    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
    })
    xml += `\n   </Row>`

    // Data Rows
    rows.forEach((r) => {
      xml += `\n   <Row ss:Height="20">`
      r.forEach((cellVal) => {
        const isNum = typeof cellVal === 'number'
        const type = isNum ? 'Number' : 'String'
        const style = isNum ? 'NumberCell' : 'Cell'
        xml += `\n    <Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(cellVal)}</Data></Cell>`
      })
      xml += `\n   </Row>`
    })

    // Total Row
    if (totalRow) {
      xml += `\n   <Row ss:Height="22" ss:StyleID="TotalCell">`
      totalRow.forEach((cellVal) => {
        const isNum = typeof cellVal === 'number'
        const type = isNum ? 'Number' : 'String'
        const style = isNum ? 'TotalNumberCell' : 'TotalCell'
        xml += `\n    <Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(cellVal)}</Data></Cell>`
      })
      xml += `\n   </Row>`
    }

    xml += `\n  </Table>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xml], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_${activeTab}_${new Date().toISOString().split('T')[0]}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Exportação Excel Concluída',
      description: 'Arquivo compatível com Excel e Google Sheets gerado com sucesso.',
    })
  }

  // Recalculated totalizers based on active filters
  const totalHorasQtd = horasExtras.reduce((sum, h) => sum + (Number(h.quantidade_horas) || 0), 0)
  const totalHorasVal = horasExtras.reduce((sum, h) => sum + (Number(h.valor_calculado) || 0), 0)

  const totalVtPrevisto = vtList.reduce((sum, v) => sum + (Number(v.valor_previsto) || 0), 0)
  const totalVtDepositado = vtList.reduce((sum, v) => sum + (Number(v.valor_depositado) || 0), 0)
  const totalVtDiferenca = vtList.reduce((sum, v) => sum + (Number(v.diferenca) || 0), 0)

  const countAtivos = colaboradores.filter((c) => c.status === 'Ativo').length
  const countInativos = colaboradores.filter((c) => c.status === 'Inativo').length

  const hasActiveFilters =
    filtroEmpresa !== 'todas' ||
    filtroPosto !== 'todos' ||
    filtroColaborador !== 'todos' ||
    filtroStatus !== 'todos' ||
    dataInicio !== '' ||
    dataFim !== ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Relatórios & Totalizadores Operacionais
          </h2>
          <p className="text-xs text-slate-500">
            Filtros cruzados, consolidação financeira por empresa e colaborador, conferência e
            exportação de dados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              onClick={handleClearFilters}
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Limpar Filtros
            </Button>
          )}
          <Button onClick={() => window.print()} variant="outline" size="sm" className="text-xs">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="text-xs font-semibold h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Exportar CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Exportar Excel (.xls)
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Conditionally show Empresa filter when in Consolidado context */}
          {isConsolidado && (
            <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
              <SelectTrigger className="text-xs h-9 font-medium text-slate-700">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Filtro por Colaborador */}
          <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="todos">Todos os Colaboradores</SelectItem>
              {colaboradoresOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} {isConsolidado && c.empresa ? `(${c.empresa.nome})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Posto */}
          <Select value={filtroPosto} onValueChange={setFiltroPosto}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Filtrar por Posto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Postos</SelectItem>
              {postos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Status */}
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Ativo">Ativo / Aprovado</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Inativo">Inativo / Recusado</SelectItem>
            </SelectContent>
          </Select>

          {/* Data Início */}
          <Input
            type="date"
            placeholder="Data Início"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="text-xs h-9"
          />

          {/* Data Fim */}
          <Input
            type="date"
            placeholder="Data Fim"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="text-xs h-9"
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="horas" className="text-xs">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Horas Extras ({horasExtras.length})
          </TabsTrigger>
          <TabsTrigger value="vt" className="text-xs">
            <Bus className="w-3.5 h-3.5 mr-1.5" /> Vale-Transporte ({vtList.length})
          </TabsTrigger>
          <TabsTrigger value="efetivo" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Efetivo Colaboradores ({colaboradores.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HORAS EXTRAS */}
        <TabsContent value="horas" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Lançamentos Filtrados
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {horasExtras.length} registros
              </div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total de Horas Extras
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {totalHorasQtd.toFixed(2)} horas
              </div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total Financeiro HE
              </span>
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(totalHorasVal)}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="text-xs font-bold">Colaborador</TableHead>
                  {isConsolidado && <TableHead className="text-xs font-bold">Empresa</TableHead>}
                  <TableHead className="text-xs font-bold">Posto</TableHead>
                  <TableHead className="text-xs font-bold">Data</TableHead>
                  <TableHead className="text-xs font-bold">Horário</TableHead>
                  <TableHead className="text-xs font-bold">Qtde</TableHead>
                  <TableHead className="text-xs font-bold">Tipo / %</TableHead>
                  <TableHead className="text-xs font-bold">Total Calculado</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 9 : 8}
                      className="text-center py-8 text-xs text-slate-500"
                    >
                      Carregando dados de horas extras...
                    </TableCell>
                  </TableRow>
                ) : horasExtras.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 9 : 8}
                      className="text-center py-10 text-xs text-slate-400"
                    >
                      Nenhum registro de hora extra encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  horasExtras.map((h) => (
                    <TableRow key={h.id} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-semibold">{h.colaborador?.nome}</TableCell>
                      {isConsolidado && (
                        <TableCell className="text-slate-600">{h.empresa?.nome}</TableCell>
                      )}
                      <TableCell>{h.posto?.nome || 'Base'}</TableCell>
                      <TableCell>{formatDateBR(h.data)}</TableCell>
                      <TableCell>
                        {h.entrada} às {h.saida}
                      </TableCell>
                      <TableCell className="font-bold">{h.quantidade_horas}h</TableCell>
                      <TableCell className="capitalize">
                        {h.tipo_dia} ({h.percentual}%)
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {formatCurrency(h.valor_calculado)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {h.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 2: VT */}
        <TabsContent value="vt" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total Previsto VT
              </span>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalVtPrevisto)}
              </div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total Depositado
              </span>
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(totalVtDepositado)}
              </div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Diferença Acumulada
              </span>
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(totalVtDiferenca)}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="text-xs font-bold">Colaborador</TableHead>
                  {isConsolidado && <TableHead className="text-xs font-bold">Empresa</TableHead>}
                  <TableHead className="text-xs font-bold">Competência</TableHead>
                  <TableHead className="text-xs font-bold">Cartão</TableHead>
                  <TableHead className="text-xs font-bold">Valor Diário</TableHead>
                  <TableHead className="text-xs font-bold">Dias</TableHead>
                  <TableHead className="text-xs font-bold">Previsto</TableHead>
                  <TableHead className="text-xs font-bold">Depositado</TableHead>
                  <TableHead className="text-xs font-bold">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 9 : 8}
                      className="text-center py-8 text-xs text-slate-500"
                    >
                      Carregando dados de vale-transporte...
                    </TableCell>
                  </TableRow>
                ) : vtList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 9 : 8}
                      className="text-center py-10 text-xs text-slate-400"
                    >
                      Nenhum registro de vale-transporte encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  vtList.map((v) => (
                    <TableRow key={v.id} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-semibold">{v.colaborador?.nome}</TableCell>
                      {isConsolidado && (
                        <TableCell className="text-slate-600">{v.empresa?.nome}</TableCell>
                      )}
                      <TableCell>{v.competencia}</TableCell>
                      <TableCell>{v.numero_cartao || '-'}</TableCell>
                      <TableCell>{formatCurrency(v.valor_diario)}</TableCell>
                      <TableCell>{v.dias_previstos}d</TableCell>
                      <TableCell>{formatCurrency(v.valor_previsto)}</TableCell>
                      <TableCell className="font-bold text-emerald-700">
                        {formatCurrency(v.valor_depositado)}
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(v.diferenca)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: EFETIVO */}
        <TabsContent value="efetivo" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total de Colaboradores
              </span>
              <div className="text-2xl font-bold text-slate-900">{colaboradores.length}</div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Colaboradores Ativos
              </span>
              <div className="text-2xl font-bold text-emerald-700">{countAtivos}</div>
            </Card>
            <Card className="border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Inativos / Outros
              </span>
              <div className="text-2xl font-bold text-slate-600">{countInativos}</div>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="text-xs font-bold">Nome</TableHead>
                  {isConsolidado && <TableHead className="text-xs font-bold">Empresa</TableHead>}
                  <TableHead className="text-xs font-bold">Cargo</TableHead>
                  <TableHead className="text-xs font-bold">Posto</TableHead>
                  <TableHead className="text-xs font-bold">Admissão</TableHead>
                  <TableHead className="text-xs font-bold">Turno</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 7 : 6}
                      className="text-center py-8 text-xs text-slate-500"
                    >
                      Carregando efetivo de colaboradores...
                    </TableCell>
                  </TableRow>
                ) : colaboradores.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isConsolidado ? 7 : 6}
                      className="text-center py-10 text-xs text-slate-400"
                    >
                      Nenhum colaborador encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  colaboradores.map((c) => (
                    <TableRow key={c.id} className="text-xs hover:bg-slate-50">
                      <TableCell className="font-semibold">{c.nome}</TableCell>
                      {isConsolidado && (
                        <TableCell className="text-slate-600">{c.empresa?.nome}</TableCell>
                      )}
                      <TableCell>{c.cargo}</TableCell>
                      <TableCell>{c.posto?.nome || 'Base'}</TableCell>
                      <TableCell>{formatDateBR(c.data_admissao)}</TableCell>
                      <TableCell>{c.turno}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
