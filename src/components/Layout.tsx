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
  User,
  ShieldAlert,
  Plus,
  Link as LinkIcon,
  ChevronRight,
  Building,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: string
  adminOnly?: boolean
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
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
]

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const { selectedEmpresa, isConsolidado } = useEmpresa()
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

  const currentTitle =
    navItems.find(
      (i) =>
        i.href === location.pathname || (i.href !== '/' && location.pathname.startsWith(i.href)),
    )?.name || 'Sistema de Gestão Operacional'

  const userInitial = profile?.nome ? profile.nome.charAt(0).toUpperCase() : 'U'

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#0d1527] text-slate-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-900/30">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-white uppercase">
            Gestão Operacional
          </span>
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            {isConsolidado ? 'Grupo Consolidado' : selectedEmpresa?.nome || 'Multiempresa'}
          </span>
        </div>
      </div>

      {/* Company Selector */}
      <div className="p-3 bg-[#0a101f] border-b border-slate-800/80">
        <CompanySelector />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-4 border-amber-500 pl-2.5 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400/80" />}
            </NavLink>
          )
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-[#0a101f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              {userInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {profile?.nome || 'Usuário'}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                {profile?.role || 'Acesso'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 h-8 w-8"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Desktop Sidebar (Fixed 260px) */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30 shadow-2xl">
        <NavContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-700">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Abrir Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-[#0d1527] border-slate-800">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navegação</SheetTitle>
                </SheetHeader>
                <NavContent />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                {currentTitle}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500">
                {isConsolidado
                  ? 'Visão Global Integrada • Ambas as Empresas'
                  : `Empresa Ativa: ${selectedEmpresa?.nome || 'Todas'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Topbar quick Company badge (clickable) */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">
                {isConsolidado ? 'Visão Consolidada' : selectedEmpresa?.nome}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs shadow-sm">
                    {userInitial}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {profile?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
                        Perfil: {profile?.role || 'admin'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/configuracoes')}
                  className="cursor-pointer text-xs"
                >
                  <Settings className="w-4 h-4 mr-2" />
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span>Sistema de Gestão Operacional & Administrativa • Hammer & Inteligência</span>
            <span className="text-[11px] text-slate-400">
              Versão 2.4 Enterprise • Supabase Powered
            </span>
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
                  <Clock className="w-4 h-4 text-amber-600" />
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
                  <LinkIcon className="w-4 h-4 text-sky-600" />
                  Links Formulários
                </button>
              </div>
            )}
            <Button
              size="icon"
              onClick={() => setFabOpen(!fabOpen)}
              className="h-13 w-13 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-xl focus:ring-4 focus:ring-amber-200"
            >
              <Plus className={`w-6 h-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
