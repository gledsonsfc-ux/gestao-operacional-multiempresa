import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldAlert, Lock, Mail, Loader2, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const { user, signIn, resetPassword, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [email, setEmail] = useState('gledsonsc@outlook.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setErrorMsg('E-mail ou senha inválidos. Por favor, confira suas credenciais.')
      } else {
        toast({
          title: 'Acesso autorizado',
          description: 'Bem-vindo ao Sistema de Gestão Operacional.',
        })
        const from = (location.state as any)?.from?.pathname || '/'
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao conectar.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setErrorMsg('Informe seu e-mail para recuperação.')
      return
    }
    setErrorMsg(null)
    setLoading(true)
    try {
      const { error } = await resetPassword(email)
      if (error) {
        setErrorMsg(error.message)
      } else {
        setResetSent(true)
        toast({
          title: 'E-mail de recuperação enviado',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        })
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao solicitar recuperação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a101f] via-[#0f1b33] to-[#152342] p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-2xl shadow-amber-500/20 mb-4 border border-amber-400/30">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sistema de Gestão Operacional
          </h1>
          <p className="text-sm text-slate-400 mt-1">Hammer Segurança & Inteligência e Serviços</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur text-slate-100 shadow-2xl">
          {!forgotMode ? (
            <form onSubmit={handleLogin}>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-white">Acesso Restrito</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Informe suas credenciais para entrar no painel operacional.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMsg && (
                  <Alert
                    variant="destructive"
                    className="bg-rose-950/50 border-rose-800 text-rose-200 py-2.5"
                  >
                    <AlertDescription className="text-xs font-medium">{errorMsg}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-medium">E-mail corporativo</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="email"
                      required
                      placeholder="seu.email@empresa.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-300 font-medium">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true)
                        setErrorMsg(null)
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 text-sm h-10"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-amber-600/20 h-10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar no Sistema
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-[11px] text-center text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 w-full">
                  <span className="font-semibold text-amber-400">Acesso Seed Demo:</span>{' '}
                  gledsonsc@outlook.com / Skip@Pass
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-white">Recuperar Senha</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Enviaremos um link de recuperação para o seu e-mail cadastrado.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {resetSent ? (
                  <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      E-mail enviado com sucesso!
                    </div>
                    <p>
                      Verifique sua caixa de entrada e siga as instruções para redefinir seu acesso.
                    </p>
                  </div>
                ) : (
                  <>
                    {errorMsg && (
                      <Alert
                        variant="destructive"
                        className="bg-rose-950/50 border-rose-800 text-rose-200 py-2.5"
                      >
                        <AlertDescription className="text-xs font-medium">
                          {errorMsg}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-medium">
                        E-mail cadastrado
                      </Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <Input
                          type="email"
                          required
                          placeholder="seu.email@empresa.com.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 text-sm h-10"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-2">
                {!resetSent ? (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-10"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Enviar Link de Redefinição
                      </>
                    )}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setForgotMode(false)
                    setResetSent(false)
                    setErrorMsg(null)
                  }}
                  className="w-full text-slate-400 hover:text-white text-xs"
                >
                  Voltar para o Login
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
