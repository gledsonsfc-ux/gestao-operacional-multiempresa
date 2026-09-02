import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpresa } from '@/hooks/use-empresa'
import { colaboradoresService, postosService } from '@/services/gestao-service'
import { Colaborador, Posto } from '@/types/gestao'
import { Card, CardContent } from '@/components/ui/card'
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Upload,
  X,
  MapPin,
} from 'lucide-react'
import { formatCPF, cleanCPF, normalizeSearchText } from '@/lib/formatters'
import { ImportColaboradoresModal } from '@/components/ImportColaboradoresModal'

export default function ColaboradoresList() {
  const { selectedEmpresaId, isConsolidado } = useEmpresa()
  const navigate = useNavigate()

  // Full list of colaboradores in the current company context (used for autocomplete and table)
  const [allColaboradores, setAllColaboradores] = useState<Colaborador[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPosto, setSelectedPosto] = useState('todos')
  const [selectedStatus, setSelectedStatus] = useState('todos')
  const [includeInativos, setIncludeInativos] = useState(false)

  // Autocomplete dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Pagination (Scalable for 300+ employees)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadData = async () => {
    setLoading(true)
    setErrorMessage(null)

    // Load colaboradores and postos independently to ensure resilience:
    // If postos query fails, colaboradores still load and display properly
    const [colabsResult, postosResult] = await Promise.allSettled([
      colaboradoresService.list(selectedEmpresaId),
      postosService.list(selectedEmpresaId),
    ])

    if (colabsResult.status === 'fulfilled') {
      setAllColaboradores(colabsResult.value || [])
    } else {
      console.error('Erro ao listar colaboradores:', colabsResult.reason)
      setErrorMessage(
        colabsResult.reason?.message ||
          'Não foi possível carregar a lista de colaboradores. Verifique a conexão.',
      )
    }

    if (postosResult.status === 'fulfilled') {
      setPostos(postosResult.value || [])
    } else {
      console.warn('Erro ao carregar postos de serviço (fallback ativado):', postosResult.reason)
      setPostos([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [selectedEmpresaId])

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Reset pagination when search term or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedPosto, selectedStatus, includeInativos, selectedEmpresaId])

  // Helper filter function for search term matching
  const matchesSearch = (c: Colaborador, query: string) => {
    if (!query || !query.trim()) return true

    const normalizedQuery = normalizeSearchText(query)
    const cleanQueryDigits = cleanCPF(query)

    const normNome = normalizeSearchText(c.nome)
    const normCargo = normalizeSearchText(c.cargo)
    const normCodigoRH = normalizeSearchText(c.codigo_rh)
    const normCpf = normalizeSearchText(c.cpf)
    const cleanCpfDigits = cleanCPF(c.cpf || '')
    const normEmpresa = normalizeSearchText(c.empresa?.nome)
    const normPosto = normalizeSearchText(c.posto?.nome)
    const normTurno = normalizeSearchText(c.turno)
    const normEscala = normalizeSearchText(c.escala?.nome)
    const normSituacaoRH = normalizeSearchText(c.situacao_rh)

    const matchesNome = normNome.includes(normalizedQuery)
    const matchesCargo = normCargo.includes(normalizedQuery)
    const matchesCodigoRH = normCodigoRH.includes(normalizedQuery)
    const matchesCpfRaw = normCpf.includes(normalizedQuery)
    const matchesCpfDigits =
      cleanQueryDigits.length > 0 && cleanCpfDigits.includes(cleanQueryDigits)
    const matchesEmpresa = normEmpresa.includes(normalizedQuery)
    const matchesPosto = normPosto.includes(normalizedQuery)
    const matchesTurno = normTurno.includes(normalizedQuery)
    const matchesEscala = normEscala.includes(normalizedQuery)
    const matchesSituacaoRH = normSituacaoRH.includes(normalizedQuery)

    return (
      matchesNome ||
      matchesCargo ||
      matchesCodigoRH ||
      matchesCpfRaw ||
      matchesCpfDigits ||
      matchesEmpresa ||
      matchesPosto ||
      matchesTurno ||
      matchesEscala ||
      matchesSituacaoRH
    )
  }

  // Autocomplete dropdown results: ALL employees in company context, filtered in real-time by search
  const dropdownResults = useMemo(() => {
    return allColaboradores.filter((c) => matchesSearch(c, searchTerm))
  }, [allColaboradores, searchTerm])

  // Main table filtered list
  const filteredList = useMemo(() => {
    return allColaboradores.filter((c) => {
      // 1. Posto filter
      if (selectedPosto !== 'todos' && c.posto_id !== selectedPosto) {
        return false
      }

      // 2. Status filter
      if (selectedStatus !== 'todos' && c.status !== selectedStatus) {
        return false
      }

      // 3. Inativos toggle filter (when status is 'todos' and inativos not included)
      if (!includeInativos && selectedStatus === 'todos' && c.status === 'Inativo') {
        return false
      }

      // 4. Real-time search filter
      return matchesSearch(c, searchTerm)
    })
  }, [allColaboradores, selectedPosto, selectedStatus, includeInativos, searchTerm])

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
      <Card className="border-slate-200 bg-white shadow-sm overflow-visible z-20">
        <CardContent className="p-4 space-y-3 overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search with Autocomplete Dropdown */}
            <div className="relative" ref={searchContainerRef}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 z-10 pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar por nome, CPF, cargo ou código RH..."
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onClick={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setIsDropdownOpen(true)
                }}
                className="pl-9 pr-8 text-xs h-9 bg-white"
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 z-10"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto min-w-[320px] sm:min-w-[420px]">
                  <div className="p-2 border-b border-slate-100 bg-slate-50/90 sticky top-0 flex items-center justify-between text-[11px] text-slate-600 font-medium z-10 backdrop-blur-xs">
                    <span>
                      {dropdownResults.length === allColaboradores.length
                        ? `Todos os colaboradores cadastrados (${dropdownResults.length})`
                        : `${dropdownResults.length} colaborador(es) encontrado(s)`}
                    </span>
                    <span className="text-[10px] text-slate-400">Clique para abrir a ficha</span>
                  </div>

                  {dropdownResults.length === 0 ? (
                    <div className="py-8 px-4 text-center text-slate-400 text-xs">
                      <Users className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                      Nenhum colaborador corresponde à busca "{searchTerm}".
                    </div>
                  ) : (
                    <div className="py-1 divide-y divide-slate-100">
                      {dropdownResults.map((c) => {
                        const isSeguranca =
                          c.empresa?.tipo === 'seguranca' ||
                          c.empresa?.nome.toLowerCase().includes('hammer')
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setIsDropdownOpen(false)
                              navigate(`/colaboradores/${c.id}`)
                            }}
                            className="px-3 py-2 hover:bg-amber-50/70 cursor-pointer transition-colors flex items-center gap-3 group"
                          >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 overflow-hidden group-hover:border-amber-400 group-hover:bg-amber-100 transition-colors">
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

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-slate-900 group-hover:text-amber-700 truncate transition-colors">
                                  {c.nome}
                                </span>
                                {c.status && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 shrink-0 font-medium ${
                                      c.status === 'Ativo'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : c.status === 'Inativo'
                                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {c.status}
                                  </Badge>
                                )}
                              </div>

                              {/* Cargo + CPF/RH */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                                <span className="font-medium text-slate-800">{c.cargo}</span>
                                {c.codigo_rh && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                      RH: {c.codigo_rh}
                                    </span>
                                  </>
                                )}
                                {c.cpf && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-[10px] text-slate-500">
                                      {formatCPF(c.cpf)}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Empresa & Posto */}
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                  {isSeguranca ? (
                                    <Shield className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Briefcase className="w-2.5 h-2.5 text-sky-600" />
                                  )}
                                  {c.empresa?.nome || 'Empresa não vinculada'}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center gap-1 text-slate-600 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  {c.posto?.nome || 'Base / Sem posto'}
                                </span>
                              </div>
                            </div>

                            {/* View button */}
                            <div className="shrink-0 text-slate-400 group-hover:text-amber-600">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando colaboradores...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-xs text-rose-600">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <span className="font-semibold text-sm">Falha ao carregar colaboradores</span>
                      <p className="text-slate-500 text-xs">{errorMessage}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        className="mt-2 text-xs border-slate-300"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-xs text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    {searchTerm ? (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-600">
                          Nenhum colaborador encontrado para "{searchTerm}".
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Tente buscar por outro termo ou clique no "X" para limpar a busca.
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setSearchTerm('')}
                          className="text-xs text-amber-600 font-semibold h-auto p-0 mt-1"
                        >
                          Limpar busca
                        </Button>
                      </div>
                    ) : (
                      'Nenhum colaborador encontrado com os filtros selecionados.'
                    )}
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
