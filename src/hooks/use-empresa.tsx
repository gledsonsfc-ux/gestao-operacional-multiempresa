import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Empresa } from '@/types/gestao'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export type EmpresaContextOption = string | 'consolidado'

interface EmpresaContextType {
  empresas: Empresa[]
  selectedEmpresaId: EmpresaContextOption // 'consolidado' or empresa.id
  selectedEmpresa: Empresa | null // null when 'consolidado'
  isConsolidado: boolean
  setSelectedEmpresaId: (id: EmpresaContextOption) => void
  loading: boolean
  canViewConsolidado: boolean
  hammerEmpresa: Empresa | null
  inteligenciaEmpresa: Empresa | null
  refreshEmpresas: () => Promise<void>
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined)

export const useEmpresa = () => {
  const context = useContext(EmpresaContext)
  if (!context) throw new Error('useEmpresa must be used within an EmpresaProvider')
  return context
}

const STORAGE_KEY = 'gestao_selected_empresa_id'

export const EmpresaProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedEmpresaId, setSelectedEmpresaIdState] = useState<EmpresaContextOption>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'consolidado'
  })
  const [loading, setLoading] = useState(true)

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase.from('empresas').select('*').order('nome')
      if (error) throw error
      const list = (data as Empresa[]) || []
      setEmpresas(list)

      // Default selection logic
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && (saved === 'consolidado' || list.some((e) => e.id === saved))) {
        setSelectedEmpresaIdState(saved)
      } else if (list.length > 0) {
        setSelectedEmpresaIdState(list[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const setSelectedEmpresaId = (id: EmpresaContextOption) => {
    setSelectedEmpresaIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const selectedEmpresa =
    selectedEmpresaId === 'consolidado'
      ? null
      : empresas.find((e) => e.id === selectedEmpresaId) || null

  const isConsolidado = selectedEmpresaId === 'consolidado'
  const canViewConsolidado = profile ? profile.permite_consolidado && !profile.empresa_id : true

  const hammerEmpresa =
    empresas.find(
      (e) => e.slug === 'hammer-seguranca' || e.nome.toLowerCase().includes('hammer'),
    ) || null
  const inteligenciaEmpresa =
    empresas.find(
      (e) =>
        e.slug === 'inteligencia-servicos' ||
        e.nome.toLowerCase().includes('inteligência') ||
        e.nome.toLowerCase().includes('inteligencia'),
    ) || null

  return (
    <EmpresaContext.Provider
      value={{
        empresas,
        selectedEmpresaId,
        selectedEmpresa,
        isConsolidado,
        setSelectedEmpresaId,
        loading,
        canViewConsolidado,
        hammerEmpresa,
        inteligenciaEmpresa,
        refreshEmpresas: fetchEmpresas,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  )
}
