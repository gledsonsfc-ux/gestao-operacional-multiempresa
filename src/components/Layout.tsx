import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useEmpresa } from '@/hooks/use-empresa'
import { CompanySelector } from '@/components/CompanySelector'
import { NotificationBell } from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Clock,
  ArrowLeftRight,
  Bus,
  Shirt,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  HelpCircle,
  Plus,
  Link as LinkIcon,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InteligenciaLogo, HammerLogo } from '@/components/BrandLogos'

interface NavItem {
  name: string
  href: string
  icon: any
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Colaboradores', href: '/colaboradores', icon: Users },
  { name: 'Postos / Clientes', href: '/postos', icon: Building2 },
  { name: 'Escalas', href: '/escalas', icon: CalendarDays },
  { name: 'Horas Extras', href: '/horas-extras', icon: Clock },
  { name: 'Troca de Plantão', href: '/trocas-plantao', icon: ArrowLeftRight },
  { name: 'Vale-Transporte', href: '/vale-transporte', icon: Bus },
  { name: 'Uniformes e EPIs', href: '/uniformes-epis', icon: Shirt },
  { name: 'Crachás', href: '/crachas', icon: CreditCard },
  { name: 'Documentos', href: '/documentos', icon: FileText },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
]

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const {
    selectedEmpresa,
    selectedEmpresaId,
    setSelectedEmpresaId,
    isConsolidado,
    hammerEmpresa,
    inteligenciaEmpresa,
    empresas,
  } = useEmpresa()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast({ title: 'Sessão encerrada', description: 'Você saiu do sistema com sucesso.' })
    navigate('/login')
  }

  const userInitial = profile?.nome ? profile.nome.charAt(0).toUpperCase() : 'G'

  // Identificação da empresa ativa para estilização condicional
  const isHammer =
    !isConsolidado &&
    (selectedEmpresa?.tipo === 'seguranca' ||
      selectedEmpresa?.slug?.includes('hammer') ||
      selectedEmpresa?.nome?.toLowerCase().includes('hammer'))

  const isInteligencia =
    !isConsolidado &&
    (selectedEmpresa?.tipo === 'servicos' ||
      selectedEmpresa?.slug?.includes('inteligencia') ||
      selectedEmpresa?.nome?.toLowerCase().includes('inteligência') ||
      selectedEmpresa?.nome?.toLowerCase().includes('inteligencia'))

  // Cores dinâmicas de destaque baseadas na empresa ativa
  const brandHighlightClass = isHammer
    ? 'bg-slate-900 text-white font-semibold'
    : isInteligencia
      ? 'bg-[#004B87] text-white font-semibold'
      : 'bg-[#004B87] text-white font-semibold'

  const brandActiveItemClass = isHammer
    ? 'bg-slate-900 text-white font-semibold shadow-sm'
    : isInteligencia
      ? 'bg-[#004B87] text-white font-semibold shadow-sm'
      : 'bg-[#004B87] text-white font-semibold shadow-sm'

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-700 border-r border-slate-200">
      {/* Top Header Visão Atual / Consolidado */}
      <div className="p-3.5 border-b border-slate-100">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2 px-1">
          Visão Atual
        </span>
        <button
          type="button"
          onClick={() => {
            setSelectedEmpresaId('consolidado')
            if (mobileOpen) setMobileOpen(false)
          }}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
            isConsolidado
              ? 'bg-[#004B87] text-white shadow-sm'
              : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <Layers className={`w-4 h-4 ${isConsolidado ? 'text-white' : 'text-[#004B87]'}`} />
          <span>Visão Consolidada</span>
        </button>
      </div>

      {/* Seção 1: Inteligência e Serviços */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/40">
        <button
          type="button"
          onClick={() => {
            if (inteligenciaEmpresa) {
              setSelectedEmpresaId(inteligenciaEmpresa.id)
            } else {
              const intObj = empresas.find(
                (e) =>
                  e.slug?.includes('inteligencia') || e.nome.toLowerCase().includes('inteligência'),
              )
              if (intObj) setSelectedEmpresaId(intObj.id)
            }
          }}
          className={`w-full text-left p-2 rounded-lg transition-all border ${
            isInteligencia
              ? 'border-[#004B87]/40 bg-white shadow-xs'
              : 'border-transparent hover:bg-white/80'
          }`}
        >
          <InteligenciaLogo size="sm" variant="full" />
        </button>

        {/* Links quando Inteligência selecionada OU lista compacta consolidada */}
        <div className="mt-2 space-y-0.5">
          {navItems.slice(0, 9).map((item) => {
            const isEmpresaActive = isInteligencia
            const isRouteActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            const isActive = isEmpresaActive && isRouteActive
            const Icon = item.icon

            return (
              <NavLink
                key={`int-${item.href}`}
                to={item.href}
                onClick={() => {
                  if (inteligenciaEmpresa && !isInteligencia) {
                    setSelectedEmpresaId(inteligenciaEmpresa.id)
                  }
                  setMobileOpen(false)
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#004B87] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Seção 2: Hammer Segurança */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/40 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            if (hammerEmpresa) {
              setSelectedEmpresaId(hammerEmpresa.id)
            } else {
              const hamObj = empresas.find(
                (e) => e.slug?.includes('hammer') || e.nome.toLowerCase().includes('hammer'),
              )
              if (hamObj) setSelectedEmpresaId(hamObj.id)
            }
          }}
          className={`w-full text-left p-2 rounded-lg transition-all border ${
            isHammer
              ? 'border-slate-800/40 bg-white shadow-xs'
              : 'border-transparent hover:bg-white/80'
          }`}
        >
          <HammerLogo size="sm" variant="full" />
        </button>

        {/* Links para Hammer */}
        <div className="mt-2 space-y-0.5">
          {navItems.slice(0, 9).map((item) => {
            const isEmpresaActive = isHammer
            const isRouteActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            const isActive = isEmpresaActive && isRouteActive
            const Icon = item.icon

            return (
              <NavLink
                key={`ham-${item.href}`}
                to={item.href}
                onClick={() => {
                  if (hammerEmpresa && !isHammer) {
                    setSelectedEmpresaId(hammerEmpresa.id)
                  }
                  setMobileOpen(false)
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Configurações Globais */}
      <div className="p-3 bg-white border-t border-slate-100">
        <NavLink
          to="/configuracoes"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            location.pathname.startsWith('/configuracoes')
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span>Configurações</span>
        </NavLink>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Desktop Sidebar (Fixed 240px, fundo branco limpo conforme referência) */}
      <aside className="hidden lg:block w-60 fixed inset-y-0 left-0 z-30 shadow-sm border-r border-slate-200 bg-white">
        <NavContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-60">
        {/* Topbar Limpa Corporativa */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-700 h-9 w-9">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Abrir Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-white border-r border-slate-200">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navegação</SheetTitle>
                </SheetHeader>
                <NavContent />
              </SheetContent>
            </Sheet>

            {/* Topbar Title Oficial */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#004B87] uppercase">
                GESTÃO OPERACIONAL MULTIEMPRESA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor rápido de empresa no topo para telas menores */}
            <div className="hidden sm:block">
              <CompanySelector compact className="w-48" />
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Ajuda / Informações */}
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:text-slate-900 h-8 w-8 rounded-full"
              title="Ajuda e Suporte"
              onClick={() => {
                toast({
                  title: 'Gestão Operacional Multiempresa',
                  description:
                    'Ambiente integrado para Hammer Segurança e Inteligência & Serviços.',
                })
              }}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>

            {/* User Dropdown Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#004B87]"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {userInitial}
                  </div>
                  <div className="hidden md:flex flex-col text-left leading-none">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                      {profile?.nome || 'Gledson R.'}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">
                      {profile?.role || 'Administrador'}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      {profile?.nome || 'Gledson R.'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-800 rounded">
                        Perfil: {profile?.role || 'Administrador'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/configuracoes')}
                  className="cursor-pointer text-xs"
                >
                  <Settings className="w-4 h-4 mr-2 text-slate-500" />
                  Configurações e Formulários
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto bg-white">
          <Outlet />
        </main>

        {/* Footer Conforme Referência */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1600px] mx-auto">
            <span>© 2025 Gestão Operacional Multiempresa. Todos os direitos reservados.</span>
            <span className="text-[11px] text-slate-400">Versão 1.0.0</span>
          </div>
        </footer>

        {/* Floating Action Button (Mobile only) */}
        <div className="fixed bottom-5 right-5 lg:hidden z-30">
          <div className="relative">
            {fabOpen && (
              <div className="absolute bottom-14 right-0 flex flex-col gap-2 mb-2 items-end animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false)
                    navigate('/horas-extras/novo')
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-800 rounded-full shadow-lg border text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                >
                  <Clock className="w-4 h-4 text-[#004B87]" />
                  Nova Hora Extra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false)
                    navigate('/colaboradores/novo')
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-800 rounded-full shadow-lg border text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  Novo Colaborador
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabOpen(false)
                    navigate('/configuracoes')
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-800 rounded-full shadow-lg border text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                >
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  Links Formulários
                </button>
              </div>
            )}
            <Button
              size="icon"
              onClick={() => setFabOpen(!fabOpen)}
              className="h-12 w-12 rounded-full bg-[#004B87] hover:bg-[#003B6D] text-white shadow-xl"
            >
              <Plus className={`w-6 h-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
