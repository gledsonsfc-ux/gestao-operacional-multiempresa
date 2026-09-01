import { useEmpresa } from '@/hooks/use-empresa'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Briefcase, Layers } from 'lucide-react'

interface CompanySelectorProps {
  className?: string
  compact?: boolean
}

export function CompanySelector({ className = '', compact = false }: CompanySelectorProps) {
  const { empresas, selectedEmpresaId, setSelectedEmpresaId, canViewConsolidado } = useEmpresa()

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {!compact && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Contexto Operacional
        </span>
      )}
      <Select value={selectedEmpresaId} onValueChange={(val) => setSelectedEmpresaId(val)}>
        <SelectTrigger className="w-full bg-slate-900/60 border-slate-700 text-white hover:bg-slate-800/80 focus:ring-amber-500 text-xs sm:text-sm font-medium h-10 transition-colors">
          <SelectValue placeholder="Selecione a empresa" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 shadow-2xl">
          {canViewConsolidado && (
            <SelectItem
              value="consolidado"
              className="hover:bg-slate-800 focus:bg-slate-800 focus:text-amber-400 py-2.5 cursor-pointer font-semibold border-b border-slate-800"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Visão Consolidada (Grupo)</span>
              </div>
            </SelectItem>
          )}
          {empresas.map((emp) => (
            <SelectItem
              key={emp.id}
              value={emp.id}
              className="hover:bg-slate-800 focus:bg-slate-800 focus:text-white py-2.5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {emp.tipo === 'seguranca' ? (
                  <Shield className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Briefcase className="w-4 h-4 text-sky-400" />
                )}
                <span>{emp.nome}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
