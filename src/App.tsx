import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/use-auth'
import { EmpresaProvider } from '@/hooks/use-empresa'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'

// Pages
import Login from '@/pages/Login'
import Index from '@/pages/Index'
import ColaboradoresList from '@/pages/ColaboradoresList'
import ColaboradorForm from '@/pages/ColaboradorForm'
import ColaboradorDetail from '@/pages/ColaboradorDetail'
import PostosList from '@/pages/PostosList'
import HorasExtrasList from '@/pages/HorasExtrasList'
import HoraExtraForm from '@/pages/HoraExtraForm'
import HorasExtrasConfig from '@/pages/HorasExtrasConfig'
import TrocasPlantaoList from '@/pages/TrocasPlantaoList'
import ValeTransportePage from '@/pages/ValeTransportePage'
import UniformesEPIsPage from '@/pages/UniformesEPIsPage'
import CrachasPage from '@/pages/CrachasPage'
import DocumentosPage from '@/pages/DocumentosPage'
import RelatoriosPage from '@/pages/RelatoriosPage'
import ConfiguracoesPage from '@/pages/ConfiguracoesPage'
import PublicFormPage from '@/pages/PublicFormPage'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <EmpresaProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/formulario/:slug" element={<PublicFormPage />} />

            {/* Authenticated Application Panel */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Index />} />

              {/* Colaboradores */}
              <Route path="colaboradores" element={<ColaboradoresList />} />
              <Route path="colaboradores/novo" element={<ColaboradorForm />} />
              <Route path="colaboradores/:id" element={<ColaboradorDetail />} />

              {/* Postos */}
              <Route path="postos" element={<PostosList />} />

              {/* Horas Extras */}
              <Route path="horas-extras" element={<HorasExtrasList />} />
              <Route path="horas-extras/novo" element={<HoraExtraForm />} />
              <Route path="horas-extras/configuracoes" element={<HorasExtrasConfig />} />

              {/* Troca de Plantão */}
              <Route path="trocas-plantao" element={<TrocasPlantaoList />} />

              {/* Vale-Transporte */}
              <Route path="vale-transporte" element={<ValeTransportePage />} />

              {/* Uniformes e EPIs */}
              <Route path="uniformes-epis" element={<UniformesEPIsPage />} />

              {/* Crachás */}
              <Route path="crachas" element={<CrachasPage />} />

              {/* Documentos */}
              <Route path="documentos" element={<DocumentosPage />} />

              {/* Relatórios */}
              <Route path="relatorios" element={<RelatoriosPage />} />

              {/* Configurações & Formulários */}
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </EmpresaProvider>
      </AuthProvider>
    </Router>
  )
}
