-- Migração: Adicionar campos de integração RH na tabela colaboradores
-- codigo_rh (text, NULL)
-- carga_horaria_mensal (integer, NULL)
-- situacao_rh (text, NULL)

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS codigo_rh TEXT NULL,
  ADD COLUMN IF NOT EXISTS carga_horaria_mensal INTEGER NULL,
  ADD COLUMN IF NOT EXISTS situacao_rh TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_codigo_rh ON public.colaboradores (codigo_rh);
