-- Migration: 20260902092500_create_colaboradores_postos_and_seed_vinculos.sql
-- Description: Cria tabela de junção colaboradores_postos com RLS, backfill dos vínculos atuais e inclusão dos novos vínculos dos 3 colaboradores

CREATE TABLE IF NOT EXISTS public.colaboradores_postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  posto_id UUID NOT NULL REFERENCES public.postos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(colaborador_id, posto_id)
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_postos_colab ON public.colaboradores_postos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_postos_posto ON public.colaboradores_postos(posto_id);

-- RLS
ALTER TABLE public.colaboradores_postos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaboradores_postos_select" ON public.colaboradores_postos;
CREATE POLICY "colaboradores_postos_select" ON public.colaboradores_postos
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "colaboradores_postos_write" ON public.colaboradores_postos;
CREATE POLICY "colaboradores_postos_write" ON public.colaboradores_postos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "colaboradores_postos_service_role" ON public.colaboradores_postos;
CREATE POLICY "colaboradores_postos_service_role" ON public.colaboradores_postos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permissões GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores_postos TO authenticated;
GRANT SELECT ON public.colaboradores_postos TO anon;
GRANT ALL ON public.colaboradores_postos TO service_role;

-- Backfill idempotente: insere em colaboradores_postos uma linha para cada colaborador que já tem posto_id não nulo
INSERT INTO public.colaboradores_postos (colaborador_id, posto_id)
SELECT id, posto_id
FROM public.colaboradores
WHERE posto_id IS NOT NULL
ON CONFLICT (colaborador_id, posto_id) DO NOTHING;

-- Inserção dos vínculos adicionais solicitados:
-- 1. "MARIA SUELI CORREA BARCELOS" -> "Escritório Motortec"
INSERT INTO public.colaboradores_postos (colaborador_id, posto_id)
SELECT c.id, p.id
FROM public.colaboradores c, public.postos p
WHERE c.nome ILIKE '%MARIA SUELI CORREA BARCELOS%'
  AND p.nome ILIKE '%Escritório Motortec%'
ON CONFLICT (colaborador_id, posto_id) DO NOTHING;

-- 2. "KAREN KELLY DOS SANTOS MENDONÇA" -> "Residencial Sagais"
INSERT INTO public.colaboradores_postos (colaborador_id, posto_id)
SELECT c.id, p.id
FROM public.colaboradores c, public.postos p
WHERE c.nome ILIKE '%KAREN KELLY DOS SANTOS MENDONÇA%'
  AND p.nome ILIKE '%Residencial Sagais%'
ON CONFLICT (colaborador_id, posto_id) DO NOTHING;

-- 3. "ELIANE PINTO DE OLIVEIRA VIEIRA DOMINGUES" -> "Vianei" e "São Joaquim"
INSERT INTO public.colaboradores_postos (colaborador_id, posto_id)
SELECT c.id, p.id
FROM public.colaboradores c, public.postos p
WHERE c.nome ILIKE '%ELIANE PINTO DE OLIVEIRA VIEIRA DOMINGUES%'
  AND p.nome ILIKE '%Vianei%'
ON CONFLICT (colaborador_id, posto_id) DO NOTHING;

INSERT INTO public.colaboradores_postos (colaborador_id, posto_id)
SELECT c.id, p.id
FROM public.colaboradores c, public.postos p
WHERE c.nome ILIKE '%ELIANE PINTO DE OLIVEIRA VIEIRA DOMINGUES%'
  AND p.nome ILIKE '%São Joaquim%'
ON CONFLICT (colaborador_id, posto_id) DO NOTHING;
