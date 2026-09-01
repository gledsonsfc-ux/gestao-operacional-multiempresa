DO $$
DECLARE
  coord_id uuid := 'a1111111-1111-1111-1111-111111111111'::uuid;
  sup_id uuid   := 'b2222222-2222-2222-2222-222222222222'::uuid;
  rh_id uuid    := 'c3333333-3333-3333-3333-333333333333'::uuid;
  cons_id uuid  := 'd4444444-4444-4444-4444-444444444444'::uuid;
  emp1_id uuid  := '11111111-1111-1111-1111-111111111111'::uuid;
  emp2_id uuid  := '22222222-2222-2222-2222-222222222222'::uuid;
BEGIN
  -- Coordenação Operacional
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'coordenacao@hammerseguranca.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      coord_id,
      '00000000-0000-0000-0000-000000000000',
      'coordenacao@hammerseguranca.com.br',
      crypt('Coord@2026', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Carlos Coordenação"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, nome, role, empresa_id, permite_consolidado, ativo)
    VALUES (coord_id, 'coordenacao@hammerseguranca.com.br', 'Carlos Coordenação', 'coordenacao', emp1_id, false, true)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      empresa_id = EXCLUDED.empresa_id;
  END IF;

  -- Supervisor / Fiscal
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'supervisor@hammerseguranca.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      sup_id,
      '00000000-0000-0000-0000-000000000000',
      'supervisor@hammerseguranca.com.br',
      crypt('Super@2026', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Marcos Fiscal"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, nome, role, empresa_id, permite_consolidado, ativo)
    VALUES (sup_id, 'supervisor@hammerseguranca.com.br', 'Marcos Fiscal', 'supervisor', emp1_id, false, true)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      empresa_id = EXCLUDED.empresa_id;
  END IF;

  -- RH / Administrativo
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rh@inteligenciaservicos.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      rh_id,
      '00000000-0000-0000-0000-000000000000',
      'rh@inteligenciaservicos.com.br',
      crypt('Rh@Pass2026', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Juliana RH"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, nome, role, empresa_id, permite_consolidado, ativo)
    VALUES (rh_id, 'rh@inteligenciaservicos.com.br', 'Juliana RH', 'rh', emp2_id, false, true)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      empresa_id = EXCLUDED.empresa_id;
  END IF;

  -- Consulta / Auditoria
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'auditoria@sistema.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      cons_id,
      '00000000-0000-0000-0000-000000000000',
      'auditoria@sistema.com.br',
      crypt('Audit@2026', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Auditoria e Consulta"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, email, nome, role, empresa_id, permite_consolidado, ativo)
    VALUES (cons_id, 'auditoria@sistema.com.br', 'Auditoria e Consulta', 'consulta', NULL, true, true)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      empresa_id = EXCLUDED.empresa_id;
  END IF;
END $$;
