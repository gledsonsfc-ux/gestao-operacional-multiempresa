import { useEmpresa } from '@/hooks/use-empresa'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Layers } from 'lucide-react'
import { InteligenciaLogo, HammerLogo } from '@/components/BrandLogos'

interface CompanySelectorProps {
  className?: string
  compact?: boolean
}

export function CompanySelector({ className = '', compact = false }: CompanySelectorProps) {
  const { empresas, selectedEmpresaId, setSelectedEmpresaId, canViewConsolidado } = useEmpresa()

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-0.5">
          Visão Atual
        </span>
      )}
      <Select value={selectedEmpresaId} onValueChange={(val) => setSelectedEmpresaId(val)}>
        <SelectTrigger className="w-full bg-white border-slate-200 text-slate-800 hover:bg-slate-50 focus:ring-2 focus:ring-[#004B87] text-xs font-semibold h-10 transition-colors shadow-sm">
          <SelectValue placeholder="Selecione a empresa" />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-xl rounded-lg">
          {canViewConsolidado && (
            <SelectItem
              value="consolidado"
              className="hover:bg-slate-100 focus:bg-slate-100 focus:text-[#004B87] py-2.5 cursor-pointer font-bold border-b border-slate-100 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#004B87]/10 flex items-center justify-center text-[#004B87]">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span>Visão Consolidada (Grupo)</span>
              </div>
            </SelectItem>
          )}
          {empresas.map((emp) => {
            const isHammer =
              emp.tipo === 'seguranca' ||
              emp.slug === 'hammer-seguranca' ||
              emp.nome.toLowerCase().includes('hammer')

            return (
              <SelectItem
                key={emp.id}
                value={emp.id}
                className="hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 py-2.5 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {isHammer ? (
                      <HammerLogo size="sm" variant="icon" />
                    ) : (
                      <InteligenciaLogo size="sm" variant="icon" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-800">{emp.nome}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
