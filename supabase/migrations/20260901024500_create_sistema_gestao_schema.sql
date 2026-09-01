-- Schema Completo do Sistema de Gestão Operacional Multiempresa
-- Hammer Segurança & Inteligência e Serviços

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  tipo TEXT NOT NULL DEFAULT 'seguranca', -- 'seguranca' ou 'servicos'
  exige_vigilancia BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Empresas
INSERT INTO public.empresas (id, nome, slug, cnpj, tipo, exige_vigilancia, ativo)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Hammer Segurança', 'hammer-seguranca', '12.345.678/0001-90', 'seguranca', true, true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Inteligência e Serviços', 'inteligencia-servicos', '98.765.432/0001-10', 'servicos', false, true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  slug = EXCLUDED.slug,
  exige_vigilancia = EXCLUDED.exige_vigilancia;

-- 2. Perfis de Usuários (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT 'Usuário',
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'coordenacao', 'supervisor', 'rh', 'consulta'
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL, -- null = todas as empresas (acesso consolidado)
  permite_consolidado BOOLEAN NOT NULL DEFAULT true,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Postos / Clientes (NUNCA fixos no código; sem postos fictícios para Inteligência e Serviços)
CREATE TABLE IF NOT EXISTS public.postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  cliente TEXT NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  responsavel TEXT,
  telefone_responsavel TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postos_empresa ON public.postos(empresa_id);

-- 4. Escalas
CREATE TABLE IF NOT EXISTS public.escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT '12x36', -- '12x36', '5x2', '6x1', 'Personalizada'
  par_impar TEXT DEFAULT 'nao_se_aplica', -- 'par', 'impar', 'nao_se_aplica'
  periodo TEXT NOT NULL DEFAULT 'Diurno', -- 'Diurno', 'Noturno', 'Misto'
  hora_entrada TIME NOT NULL DEFAULT '07:00:00',
  hora_saida TIME NOT NULL DEFAULT '19:00:00',
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalas_empresa ON public.escalas(empresa_id);

-- 5. Colaboradores (Cadastro Mestre - sem delete físico)
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  cargo TEXT NOT NULL,
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
  escala_id UUID REFERENCES public.escalas(id) ON DELETE SET NULL,
  horario TEXT,
  turno TEXT NOT NULL DEFAULT 'Diurno', -- 'Diurno', 'Noturno'
  status TEXT NOT NULL DEFAULT 'Ativo', -- 'Ativo', 'Inativo', 'Férias', 'Afastado'
  motivo_inativacao TEXT,
  
  -- Vale Transporte
  numero_cartao_vt TEXT,
  tipo_transporte TEXT DEFAULT 'Ônibus',
  valor_diario_vt NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Uniforme / Tamanhos
  tamanho_camisa TEXT,
  tamanho_calca TEXT,
  numero_calcado TEXT,
  
  -- Foto
  foto_url TEXT,
  
  -- Valor da hora base para cálculo de horas extras
  valor_hora_base NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  
  -- Documentação de Vigilância (específico Hammer Segurança / cargos de vigilante)
  exige_vigilancia BOOLEAN NOT NULL DEFAULT false,
  cnv_numero TEXT,
  cnv_validade DATE,
  curso_formacao BOOLEAN DEFAULT false,
  reciclagem BOOLEAN DEFAULT false,
  data_ultima_reciclagem DATE,
  proximo_vencimento_reciclagem DATE,
  
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON public.colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_posto ON public.colaboradores(posto_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores(status);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON public.colaboradores(cpf);

-- 6. Histórico de Alterações de Colaboradores e Registros Auditados
CREATE TABLE IF NOT EXISTS public.alteracoes_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  tabela TEXT NOT NULL, -- 'colaboradores', 'horas_extras', 'postos', 'vale_transporte', etc.
  registro_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alteracoes_registro ON public.alteracoes_historico(tabela, registro_id);

-- 7. Regras Configuráveis de Horas Extras por Empresa
CREATE TABLE IF NOT EXISTS public.hora_extra_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_dia TEXT NOT NULL, -- 'normal', 'domingo', 'feriado', 'adicional_noturno', 'outro'
  percentual NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Regras de Horas Extras para ambas empresas
INSERT INTO public.hora_extra_configs (empresa_id, nome, tipo_dia, percentual, ativo)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Dia Normal (50%)', 'normal', 50.00, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Domingo (100%)', 'domingo', 100.00, true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Feriado (100%)', 'feriado', 100.00, true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Dia Normal (50%)', 'normal', 50.00, true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Domingo (100%)', 'domingo', 100.00, true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Feriado (100%)', 'feriado', 100.00, true)
ON CONFLICT DO NOTHING;

-- 8. Tabela de Feriados para detecção automática
CREATE TABLE IF NOT EXISTS public.feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE, -- null = nacional/ambas
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Nacional', -- 'Nacional', 'Estadual', 'Municipal'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feriados Nacionais Brasil padrão 2025/2026
INSERT INTO public.feriados (data, descricao, tipo)
VALUES
  ('2025-01-01', 'Confraternização Universal', 'Nacional'),
  ('2025-04-18', 'Sexta-feira Santa', 'Nacional'),
  ('2025-04-21', 'Tiradentes', 'Nacional'),
  ('2025-05-01', 'Dia do Trabalho', 'Nacional'),
  ('2025-09-07', 'Independência do Brasil', 'Nacional'),
  ('2025-10-12', 'Nossa Senhora Aparecida', 'Nacional'),
  ('2025-11-02', 'Finados', 'Nacional'),
  ('2025-11-15', 'Proclamação da República', 'Nacional'),
  ('2025-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'Nacional'),
  ('2025-12-25', 'Natal', 'Nacional'),
  ('2026-01-01', 'Confraternização Universal', 'Nacional'),
  ('2026-04-03', 'Sexta-feira Santa', 'Nacional'),
  ('2026-04-21', 'Tiradentes', 'Nacional'),
  ('2026-05-01', 'Dia do Trabalho', 'Nacional'),
  ('2026-09-07', 'Independência do Brasil', 'Nacional'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'Nacional'),
  ('2026-11-02', 'Finados', 'Nacional'),
  ('2026-11-15', 'Proclamação da República', 'Nacional'),
  ('2026-11-20', 'Dia da Consciência Negra', 'Nacional'),
  ('2026-12-25', 'Natal', 'Nacional')
ON CONFLICT DO NOTHING;

-- 9. Registro de Horas Extras
CREATE TABLE IF NOT EXISTS public.horas_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  entrada TIME NOT NULL,
  saida TIME NOT NULL,
  quantidade_horas NUMERIC(6, 2) NOT NULL,
  tipo_dia TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'domingo', 'feriado', 'outro'
  percentual NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
  valor_hora NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  valor_calculado NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  memoria_calculo TEXT,
  ajuste_manual BOOLEAN NOT NULL DEFAULT false,
  motivo_ajuste TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Conferido', 'Aprovado', 'Recusado'
  motivo_recusa TEXT,
  aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em TIMESTAMPTZ,
  origem TEXT NOT NULL DEFAULT 'Painel', -- 'Painel', 'Formulário Público'
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_horas_extras_empresa ON public.horas_extras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_horas_extras_colab ON public.horas_extras(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_horas_extras_data ON public.horas_extras(data);
CREATE INDEX IF NOT EXISTS idx_horas_extras_status ON public.horas_extras(status);

-- 10. Trocas de Plantão
CREATE TABLE IF NOT EXISTS public.trocas_plantao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  solicitante_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  substituto_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  horario TEXT NOT NULL,
  motivo TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Autorizada', 'Recusada'
  motivo_recusa TEXT,
  decidido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decidido_por_nome TEXT,
  decidido_em TIMESTAMPTZ,
  origem TEXT NOT NULL DEFAULT 'Painel', -- 'Painel', 'Formulário Público'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trocas_empresa ON public.trocas_plantao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_trocas_status ON public.trocas_plantao(status);

-- 11. Formulários Públicos
CREATE TABLE IF NOT EXISTS public.formularios_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL, -- 'hora_extra', 'troca_plantao', 'uniforme_epi'
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  campos_extras JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed formulários públicos padrão para cada empresa
INSERT INTO public.formularios_publicos (empresa_id, tipo, titulo, slug, descricao, ativo)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'hora_extra', 'Solicitação de Hora Extra - Hammer Segurança', 'he-hammer', 'Envio de registro de hora extra para a Hammer Segurança', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'troca_plantao', 'Troca de Plantão - Hammer Segurança', 'troca-hammer', 'Solicitação de substituição/troca de plantão operacional', true),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'uniforme_epi', 'Solicitação de Uniforme / EPI - Hammer', 'uniforme-hammer', 'Solicitação de itens de fardamento e EPIs', true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'hora_extra', 'Solicitação de Hora Extra - Inteligência e Serviços', 'he-inteligencia', 'Envio de registro de hora extra para Inteligência e Serviços', true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'troca_plantao', 'Troca de Plantão - Inteligência e Serviços', 'troca-inteligencia', 'Solicitação de substituição/troca de plantão de serviços', true),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'uniforme_epi', 'Solicitação de Uniforme / EPI - Inteligência', 'uniforme-inteligencia', 'Solicitação de itens de fardamento e equipamentos', true)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;

-- 12. Vale-Transporte (Controle Mensal)
CREATE TABLE IF NOT EXISTS public.vale_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  competencia TEXT NOT NULL, -- 'YYYY-MM' ex: '2025-05'
  numero_cartao TEXT,
  tipo_transporte TEXT DEFAULT 'Ônibus',
  valor_diario NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  dias_previstos INT NOT NULL DEFAULT 22,
  dias_trabalhados INT NOT NULL DEFAULT 22,
  valor_previsto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  valor_depositado NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  diferenca NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  observacoes TEXT,
  ajuste_manual BOOLEAN NOT NULL DEFAULT false,
  motivo_ajuste TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(colaborador_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_vt_empresa ON public.vale_transporte(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vt_competencia ON public.vale_transporte(competencia);

-- 13. Uniformes e EPIs
CREATE TABLE IF NOT EXISTS public.uniformes_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  item TEXT NOT NULL, -- 'Camisa', 'Calça', 'Calçado', 'Jaqueta', 'Crachá', 'Cordão', 'Luvas', 'Máscaras', 'Colete', 'Capa de Chuva', 'Outros'
  tamanho TEXT,
  quantidade INT NOT NULL DEFAULT 1,
  tipo_movimentacao TEXT NOT NULL DEFAULT 'Entrega', -- 'Entrega', 'Devolucao', 'Troca'
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_entrega TEXT NOT NULL DEFAULT 'Almoxarifado',
  observacao TEXT,
  assinatura_digital_url TEXT,
  assinatura_base64 TEXT,
  origem TEXT NOT NULL DEFAULT 'Painel', -- 'Painel', 'Formulário Público'
  status TEXT NOT NULL DEFAULT 'Entregue', -- 'Pendente', 'Entregue', 'Devolvido', 'Danificado'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uniformes_empresa ON public.uniformes_epis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uniformes_colab ON public.uniformes_epis(colaborador_id);

-- 14. Documentos Gerais / Conformidade
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  posto_id UUID REFERENCES public.postos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL, -- 'CNV', 'Curso Formação', 'Reciclagem', 'ASO / Exame Médico', 'Contrato', 'Ficha EPI', 'Outro'
  numero TEXT,
  data_emissao DATE,
  data_vencimento DATE,
  arquivo_url TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'Valido', -- 'Valido', 'Vencendo', 'Vencido'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_empresa ON public.documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_docs_vencimento ON public.documentos(data_vencimento);

-- 15. Storage Buckets (colaboradores fotos, documentos, assinaturas)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('colaboradores', 'colaboradores', true),
  ('documentos', 'documentos', true),
  ('assinaturas', 'assinaturas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "public_read_colaboradores_bucket" ON storage.objects;
CREATE POLICY "public_read_colaboradores_bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id IN ('colaboradores', 'documentos', 'assinaturas'));

DROP POLICY IF EXISTS "auth_upload_colaboradores_bucket" ON storage.objects;
CREATE POLICY "auth_upload_colaboradores_bucket" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id IN ('colaboradores', 'documentos', 'assinaturas'));

DROP POLICY IF EXISTS "auth_update_colaboradores_bucket" ON storage.objects;
CREATE POLICY "auth_update_colaboradores_bucket" ON storage.objects
  FOR UPDATE TO public USING (bucket_id IN ('colaboradores', 'documentos', 'assinaturas'));

-- 16. Trigger para auto-criar profile ao criar auth.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, permite_consolidado)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Administrador'), 'admin', true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17. Seed Inicial do Usuário Administrador (gledsonsc@outlook.com / Skip@Pass)
DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gledsonsc@outlook.com') THEN
    seed_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      seed_user_id,
      '00000000-0000-0000-0000-000000000000',
      'gledsonsc@outlook.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Gledson Administrador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );

    INSERT INTO public.profiles (id, email, nome, role, permite_consolidado)
    VALUES (seed_user_id, 'gledsonsc@outlook.com', 'Gledson Administrador', 'admin', true)
    ON CONFLICT (id) DO UPDATE SET
      nome = 'Gledson Administrador',
      role = 'admin',
      permite_consolidado = true;
  ELSE
    -- Atualiza profile para admin garantindo acesso
    UPDATE public.profiles 
    SET role = 'admin', permite_consolidado = true
    WHERE email = 'gledsonsc@outlook.com';
  END IF;
END $$;

-- 18. Configuração RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alteracoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hora_extra_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trocas_plantao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formularios_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vale_transporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniformes_epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Empresas: authenticated e anon (para ler empresa do form público) podem ler
DROP POLICY IF EXISTS "empresas_select_all" ON public.empresas;
CREATE POLICY "empresas_select_all" ON public.empresas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "empresas_admin_write" ON public.empresas;
CREATE POLICY "empresas_admin_write" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Postos
DROP POLICY IF EXISTS "postos_select" ON public.postos;
CREATE POLICY "postos_select" ON public.postos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "postos_write" ON public.postos;
CREATE POLICY "postos_write" ON public.postos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Escalas
DROP POLICY IF EXISTS "escalas_select" ON public.escalas;
CREATE POLICY "escalas_select" ON public.escalas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "escalas_write" ON public.escalas;
CREATE POLICY "escalas_write" ON public.escalas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Colaboradores (permitir SELECT público de nomes/postos apenas para listagem em formulário público)
DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
CREATE POLICY "colaboradores_select" ON public.colaboradores FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "colaboradores_write" ON public.colaboradores;
CREATE POLICY "colaboradores_write" ON public.colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alterações Histórico
DROP POLICY IF EXISTS "alteracoes_select" ON public.alteracoes_historico;
CREATE POLICY "alteracoes_select" ON public.alteracoes_historico FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "alteracoes_insert" ON public.alteracoes_historico;
CREATE POLICY "alteracoes_insert" ON public.alteracoes_historico FOR INSERT TO public WITH CHECK (true);

-- Hora Extra Configs
DROP POLICY IF EXISTS "hora_extra_configs_select" ON public.hora_extra_configs;
CREATE POLICY "hora_extra_configs_select" ON public.hora_extra_configs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "hora_extra_configs_write" ON public.hora_extra_configs;
CREATE POLICY "hora_extra_configs_write" ON public.hora_extra_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Feriados
DROP POLICY IF EXISTS "feriados_select" ON public.feriados;
CREATE POLICY "feriados_select" ON public.feriados FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "feriados_write" ON public.feriados;
CREATE POLICY "feriados_write" ON public.feriados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Horas Extras (authenticated full, anon can insert via public form)
DROP POLICY IF EXISTS "horas_extras_select" ON public.horas_extras;
CREATE POLICY "horas_extras_select" ON public.horas_extras FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "horas_extras_insert_public" ON public.horas_extras;
CREATE POLICY "horas_extras_insert_public" ON public.horas_extras FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "horas_extras_update_auth" ON public.horas_extras;
CREATE POLICY "horas_extras_update_auth" ON public.horas_extras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "horas_extras_delete_auth" ON public.horas_extras;
CREATE POLICY "horas_extras_delete_auth" ON public.horas_extras FOR DELETE TO authenticated USING (true);

-- Trocas de Plantão (authenticated full, anon can insert via public form)
DROP POLICY IF EXISTS "trocas_select" ON public.trocas_plantao;
CREATE POLICY "trocas_select" ON public.trocas_plantao FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trocas_insert_public" ON public.trocas_plantao;
CREATE POLICY "trocas_insert_public" ON public.trocas_plantao FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "trocas_update_auth" ON public.trocas_plantao;
CREATE POLICY "trocas_update_auth" ON public.trocas_plantao FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Formulários Públicos
DROP POLICY IF EXISTS "formularios_select" ON public.formularios_publicos;
CREATE POLICY "formularios_select" ON public.formularios_publicos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "formularios_write" ON public.formularios_publicos;
CREATE POLICY "formularios_write" ON public.formularios_publicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vale Transporte
DROP POLICY IF EXISTS "vt_select" ON public.vale_transporte;
CREATE POLICY "vt_select" ON public.vale_transporte FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vt_write" ON public.vale_transporte;
CREATE POLICY "vt_write" ON public.vale_transporte FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Uniformes e EPIs (authenticated full, anon can insert via public form)
DROP POLICY IF EXISTS "uniformes_select" ON public.uniformes_epis;
CREATE POLICY "uniformes_select" ON public.uniformes_epis FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "uniformes_insert_public" ON public.uniformes_epis;
CREATE POLICY "uniformes_insert_public" ON public.uniformes_epis FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "uniformes_write" ON public.uniformes_epis;
CREATE POLICY "uniformes_write" ON public.uniformes_epis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Documentos
DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documentos_write" ON public.documentos;
CREATE POLICY "documentos_write" ON public.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
