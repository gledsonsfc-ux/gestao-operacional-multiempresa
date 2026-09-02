-- Restauração de privilégios de tabela e sequence para as roles anon, authenticated e service_role no schema public

-- 1. Grant USAGE no schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant SELECT, INSERT, UPDATE, DELETE em todas as tabelas para authenticated e service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 3. Grant SELECT em todas as tabelas para anon
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 4. Grant INSERT nas tabelas que aceitam envio por formulário público para anon
GRANT INSERT ON public.horas_extras, public.trocas_plantao, public.uniformes_epis, public.alteracoes_historico TO anon;

-- 5. Grant USAGE em todas as sequences no schema public para anon, authenticated e service_role
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Configurar privilégios padrão para futuras tabelas criadas no schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO anon, authenticated, service_role;
