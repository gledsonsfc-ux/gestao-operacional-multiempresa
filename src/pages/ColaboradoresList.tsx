import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { colaboradoresService, postosService } from '@/services/gestao-service'
import { Colaborador, Posto } from '@/types/gestao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Search,
  Users,
  Shield,
  Briefcase,
  AlertTriangle,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Edit,
  Upload,
} from 'lucide-react'
import { formatCPF } from '@/lib/formatters'
import { ImportColaboradoresModal } from '@/components/ImportColaboradoresModal'

export default function ColaboradoresList() {
  const { selectedEmpresaId, isConsolidado } = useEmpresa()
  const navigate = useNavigate()

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPosto, setSelectedPosto] = useState('todos')
  const [selectedStatus, setSelectedStatus] = useState('todos')
  const [includeInativos, setIncludeInativos] = useState(false)

  // Pagination (Scalable for 300+ employees)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    try {
      const [colabsData, postosData] = await Promise.all([
        colaboradoresService.list(selectedEmpresaId, {
          postoId: selectedPosto,
          status: selectedStatus,
          search: searchTerm,
        }),
        postosService.list(selectedEmpresaId),
      ])
      setColaboradores(colabsData)
      setPostos(postosData)
    } catch (err) {
      console.error('Erro ao listar colaboradores:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setCurrentPage(1)
  }, [selectedEmpresaId, selectedPosto, selectedStatus, searchTerm])

  // Filter inativos toggle locally if status is 'todos'
  const filteredList = colaboradores.filter((c) => {
    if (!includeInativos && selectedStatus === 'todos' && c.status === 'Inativo') {
      return false
    }
    return true
  })

  const totalRecords = filteredList.length
  const totalPages = Math.ceil(totalRecords / pageSize) || 1
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[11px]">
            Ativo
          </Badge>
        )
      case 'Inativo':
        return (
          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none text-[11px]">
            Inativo
          </Badge>
        )
      case 'Férias':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none text-[11px]">
            Férias
          </Badge>
        )
      case 'Afastado':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-[11px]">
            Afastado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cadastro Mestre de Colaboradores</h2>
          <p className="text-xs text-slate-500">
            Gerenciamento completo do efetivo operacional e administrativo com histórico auditável.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs h-9 shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1.5 text-amber-500" />
            Importar colaboradores
          </Button>
          <Button
            onClick={() => navigate('/colaboradores/novo')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Buscar por nome, CPF, cargo ou código RH..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Posto filter */}
            <Select value={selectedPosto} onValueChange={setSelectedPosto}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Filtrar por Posto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Postos</SelectItem>
                {postos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.cliente})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Férias">Férias</SelectItem>
                <SelectItem value="Afastado">Afastado</SelectItem>
              </SelectContent>
            </Select>

            {/* Include Inativos Toggle */}
            <div className="flex items-center justify-between px-3 border rounded-md h-9 bg-slate-50 text-xs text-slate-600">
              <label htmlFor="inativos-toggle" className="cursor-pointer select-none">
                Exibir Desligados/Inativos
              </label>
              <input
                type="checkbox"
                id="inativos-toggle"
                checked={includeInativos}
                onChange={(e) => setIncludeInativos(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-bold text-slate-700">
                  Foto
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Nome / CPF</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Código RH</TableHead>
                {isConsolidado && (
                  <TableHead className="text-xs font-bold text-slate-700">Empresa</TableHead>
                )}
                <TableHead className="text-xs font-bold text-slate-700">Cargo / Função</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Posto de Serviço</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Escala / Turno</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Carga horária mensal
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Situação RH
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-xs text-slate-500">
                    Carregando colaboradores...
                  </TableCell>
                </TableRow>
              ) : paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-xs text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/colaboradores/${c.id}`)}
                  >
                    <TableCell className="text-center py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden mx-auto flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-300 shadow-xs">
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
                    </TableCell>

                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-amber-600 transition-colors">
                        {c.nome}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{formatCPF(c.cpf)}</div>
                    </TableCell>

                    <TableCell className="py-2.5 text-xs">
                      {c.codigo_rh ? (
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {c.codigo_rh}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </TableCell>

                    {isConsolidado && (
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium">
                          {c.empresa?.tipo === 'seguranca' ? (
                            <Shield className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Briefcase className="w-3 h-3 text-sky-600" />
                          )}
                          {c.empresa?.nome}
                        </span>
                      </TableCell>
                    )}

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      <div className="font-medium">{c.cargo}</div>
                      {c.exige_vigilancia && (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" /> Vigilância Ativa
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-700">
                      {c.posto?.nome ? (
                        <span className="font-medium text-slate-800">{c.posto.nome}</span>
                      ) : (
                        <span className="text-slate-400 italic">Base / Sem alocação</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 text-xs text-slate-600">
                      <div>{c.escala?.nome || 'Escala Padrão'}</div>
                      <span className="text-[10px] text-slate-400">{c.turno}</span>
                    </TableCell>

                    <TableCell className="text-center py-2.5 text-xs text-slate-700">
                      {c.carga_horaria_mensal ? (
                        <span className="font-medium">{c.carga_horaria_mensal}h</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center py-2.5 text-xs">
                      {c.situacao_rh ? (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {c.situacao_rh}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center py-2.5">{getStatusBadge(c.status)}</TableCell>

                    <TableCell className="text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-amber-600"
                          onClick={() => navigate(`/colaboradores/${c.id}`)}
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-amber-600"
                          onClick={() => navigate(`/colaboradores/${c.id}?edit=true`)}
                          title="Editar Cadastro"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Exibindo</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>de {totalRecords} colaboradores</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs bg-white"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
            </Button>
            <span className="px-2 font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs bg-white"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Importação de Colaboradores */}
      <ImportColaboradoresModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadData()
        }}
      />
    </div>
  )
}
