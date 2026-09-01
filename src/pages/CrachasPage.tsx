import { useEffect, useState, useRef } from 'react'
import { useEmpresa } from '@/hooks/use-empresa'
import { colaboradoresService } from '@/services/gestao-service'
import { Colaborador } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  Printer,
  Shield,
  Briefcase,
  Search,
  User,
  QrCode,
  CheckCircle,
  Building,
} from 'lucide-react'
import { formatCPF } from '@/lib/formatters'

export default function CrachasPage() {
  const { selectedEmpresaId, isConsolidado, empresas } = useEmpresa()

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState('todas')

  const printAreaRef = useRef<HTMLDivElement | null>(null)

  const loadColaboradores = async () => {
    setLoading(true)
    try {
      const list = await colaboradoresService.list(selectedEmpresaId)
      setColaboradores(list.filter((c) => c.status === 'Ativo'))
      if (list.length > 0 && !selectedColab) {
        setSelectedColab(list[0])
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores para crachás:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadColaboradores()
  }, [selectedEmpresaId])

  const handlePrint = () => {
    window.print()
  }

  const filteredColabs = colaboradores.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm)
    const matchesEmpresa =
      selectedEmpresaFilter === 'todas' || c.empresa_id === selectedEmpresaFilter
    return matchesSearch && matchesEmpresa
  })

  const isHammer =
    selectedColab?.empresa?.tipo === 'seguranca' ||
    selectedColab?.empresa?.nome.toLowerCase().includes('hammer')

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-badge, #printable-badge * {
            visibility: visible;
          }
          #printable-badge {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Emissão e Visualização de Crachás</h2>
          <p className="text-xs text-slate-500">
            Modelos diferenciados para Hammer Segurança e Inteligência e Serviços. Selecione o
            colaborador para visualizar e imprimir.
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={!selectedColab}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Imprimir Crachá
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Lista de Colaboradores */}
        <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Selecionar Colaborador
            </CardTitle>
            <div className="pt-2 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Filtrar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              {isConsolidado && (
                <Select value={selectedEmpresaFilter} onValueChange={setSelectedEmpresaFilter}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
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
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Carregando...</div>
            ) : filteredColabs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredColabs.map((c) => {
                  const isSelected = selectedColab?.id === c.id

                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedColab(c)}
                      className={`w-full text-left p-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-amber-50/60 border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {c.foto_url ? (
                            <img
                              src={c.foto_url}
                              alt={c.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            c.nome.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">
                            {c.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{c.cargo}</div>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {c.empresa?.tipo === 'seguranca' ? 'Hammer' : 'Inteligência'}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2 e 3: Preview do Crachá Renderizado */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-100/70 rounded-2xl border border-slate-200 min-h-[480px]">
          {selectedColab ? (
            <div className="space-y-6 flex flex-col items-center">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Prévia de Impressão • Formato Padrão Vertical (CR-80)
                </span>
                <span className="text-[11px] text-slate-400">
                  Modelo:{' '}
                  {isHammer
                    ? 'HAMMER SEGURANÇA (Padrão Vigilância)'
                    : 'INTELIGÊNCIA E SERVIÇOS (Padrão Facilities)'}
                </span>
              </div>

              {/* CRACHÁ ELEMENT */}
              <div
                id="printable-badge"
                ref={printAreaRef}
                className={`w-72 h-[420px] rounded-2xl shadow-2xl border overflow-hidden flex flex-col justify-between relative select-none ${
                  isHammer
                    ? 'bg-gradient-to-b from-[#0a101f] via-[#101b33] to-[#070b14] text-white border-amber-500/40'
                    : 'bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#e2e8f0] text-slate-900 border-sky-400/50'
                }`}
              >
                {/* Badge Top Header */}
                <div
                  className={`p-4 text-center border-b ${
                    isHammer
                      ? 'bg-gradient-to-r from-amber-600/30 via-slate-900 to-amber-600/30 border-amber-500/30'
                      : 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white border-sky-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {isHammer ? (
                      <Shield className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-white" />
                    )}
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      {selectedColab.empresa?.nome || 'GRUPO OPERACIONAL'}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] uppercase tracking-widest ${isHammer ? 'text-amber-300' : 'text-sky-100'}`}
                  >
                    {isHammer
                      ? 'SEGURANÇA PRIVADA • VIGILÂNCIA'
                      : 'FACILITIES & SERVIÇOS TERCEIRIZADOS'}
                  </span>
                </div>

                {/* Badge Photo & Main info */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  {/* Photo circle */}
                  <div
                    className={`w-28 h-28 rounded-full p-1 shadow-xl mb-3 ${
                      isHammer
                        ? 'bg-gradient-to-br from-amber-400 to-amber-700'
                        : 'bg-gradient-to-br from-sky-400 to-cyan-600'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-3xl">
                      {selectedColab.foto_url ? (
                        <img
                          src={selectedColab.foto_url}
                          alt={selectedColab.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedColab.nome.charAt(0)
                      )}
                    </div>
                  </div>

                  {/* Collaborator Name */}
                  <h3
                    className={`font-extrabold text-sm leading-tight max-w-[230px] line-clamp-2 uppercase ${
                      isHammer ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {selectedColab.nome}
                  </h3>

                  {/* Function */}
                  <div
                    className={`mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      isHammer
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-sky-100 text-sky-800 border border-sky-300'
                    }`}
                  >
                    {selectedColab.cargo}
                  </div>

                  {/* Posto / Local */}
                  <span className="text-[10px] text-slate-400 mt-2">
                    Posto: {selectedColab.posto?.nome || 'Base Operacional'}
                  </span>
                </div>

                {/* Badge Footer */}
                <div
                  className={`p-3 border-t flex items-center justify-between text-[10px] ${
                    isHammer
                      ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="text-left font-mono">
                    <div>CPF: {formatCPF(selectedColab.cpf)}</div>
                    {isHammer && selectedColab.cnv_numero && (
                      <div className="text-amber-400 font-semibold">
                        CNV: {selectedColab.cnv_numero}
                      </div>
                    )}
                  </div>

                  <div className="p-1 bg-white rounded shadow-xs">
                    <QrCode className="w-6 h-6 text-slate-900" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Imprimir Crachá Atual
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs">
              <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Selecione um colaborador na lista ao lado para gerar o crachá.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
