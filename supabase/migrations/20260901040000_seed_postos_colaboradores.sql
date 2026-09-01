-- Seed inicial operacional para Hammer Segurança e Inteligência e Serviços
-- Garante postos, escalas e colaboradores para preenchimento e testes nos formulários e relatórios

DO $$
DECLARE
  posto_hammer_1 uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  posto_hammer_2 uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  posto_intel_1  uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  posto_intel_2  uuid := '20000000-0000-0000-0000-000000000002'::uuid;
  escala_12x36_d_h uuid := '30000000-0000-0000-0000-000000000001'::uuid;
  escala_12x36_n_h uuid := '30000000-0000-0000-0000-000000000002'::uuid;
  escala_5x2_intel  uuid := '40000000-0000-0000-0000-000000000001'::uuid;
  escala_12x36_intel uuid := '40000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- 1. Postos Hammer Segurança
  INSERT INTO public.postos (id, empresa_id, cliente, nome, endereco, responsavel, telefone_responsavel, ativo)
  VALUES
    (posto_hammer_1, '11111111-1111-1111-1111-111111111111'::uuid, 'Condomínio Alpha Towers', 'Posto Portaria Principal', 'Av. das Américas, 1500', 'Tenente Silva', '(11) 98765-4321', true),
    (posto_hammer_2, '11111111-1111-1111-1111-111111111111'::uuid, 'Shopping Plaza Sul', 'Posto Vigilância Armada Central', 'Rua Domingos de Morais, 2500', 'Supervisor Braga', '(11) 98888-1122', true)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Postos Inteligência e Serviços
  INSERT INTO public.postos (id, empresa_id, cliente, nome, endereco, responsavel, telefone_responsavel, ativo)
  VALUES
    (posto_intel_1, '22222222-2222-2222-2222-222222222222'::uuid, 'Hospital São Lucas', 'Posto Higienização e Limpeza Geral', 'Rua Vergueiro, 3000', 'Coordenadora Miriam', '(11) 97777-3344', true),
    (posto_intel_2, '22222222-2222-2222-2222-222222222222'::uuid, 'Centro Empresarial Paulista', 'Posto Recepção e Controle de Acesso', 'Av. Paulista, 1000', 'Gestor André', '(11) 96666-5566', true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Escalas Hammer
  INSERT INTO public.escalas (id, empresa_id, nome, tipo, par_impar, periodo, hora_entrada, hora_saida, posto_id, ativo)
  VALUES
    (escala_12x36_d_h, '11111111-1111-1111-1111-111111111111'::uuid, '12x36 Diurno (Ímpar)', '12x36', 'impar', 'Diurno', '07:00:00', '19:00:00', posto_hammer_1, true),
    (escala_12x36_n_h, '11111111-1111-1111-1111-111111111111'::uuid, '12x36 Noturno (Par)', '12x36', 'par', 'Noturno', '19:00:00', '07:00:00', posto_hammer_2, true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Escalas Inteligência
  INSERT INTO public.escalas (id, empresa_id, nome, tipo, par_impar, periodo, hora_entrada, hora_saida, posto_id, ativo)
  VALUES
    (escala_5x2_intel, '22222222-2222-2222-2222-222222222222'::uuid, '5x2 Comercial Limpeza', '5x2', 'nao_se_aplica', 'Diurno', '08:00:00', '17:00:00', posto_intel_1, true),
    (escala_12x36_intel, '22222222-2222-2222-2222-222222222222'::uuid, '12x36 Recepção Diurna', '12x36', 'par', 'Diurno', '07:00:00', '19:00:00', posto_intel_2, true)
  ON CONFLICT (id) DO NOTHING;

  -- 5. Colaboradores Hammer Segurança
  INSERT INTO public.colaboradores (
    id, empresa_id, nome, cpf, data_nascimento, telefone, email, cargo, posto_id, escala_id,
    horario, turno, status, valor_hora_base, exige_vigilancia, cnv_numero, curso_formacao, reciclagem,
    numero_cartao_vt, tipo_transporte, valor_diario_vt
  ) VALUES
    (
      '50000000-0000-0000-0000-000000000001'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Antônio Carlos Ferreira',
      '123.456.789-01',
      '1988-04-12',
      '(11) 98111-2233',
      'antonio.ferreira@hammerseguranca.com.br',
      'Vigilante Patrimonial',
      posto_hammer_1,
      escala_12x36_d_h,
      '07:00 às 19:00',
      'Diurno',
      'Ativo',
      18.50,
      true,
      'CNV-987654',
      true,
      true,
      'SP-8833441',
      'Ônibus',
      9.60
    ),
    (
      '50000000-0000-0000-0000-000000000002'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Roberto Mendes da Silva',
      '234.567.890-12',
      '1992-09-20',
      '(11) 98222-3344',
      'roberto.mendes@hammerseguranca.com.br',
      'Vigilante Líder',
      posto_hammer_1,
      escala_12x36_d_h,
      '07:00 às 19:00',
      'Diurno',
      'Ativo',
      21.00,
      true,
      'CNV-112233',
      true,
      true,
      'SP-7744112',
      'Metrô',
      10.00
    ),
    (
      '50000000-0000-0000-0000-000000000003'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Lucas Albuquerque Ramos',
      '345.678.901-23',
      '1995-02-15',
      '(11) 98333-4455',
      'lucas.ramos@hammerseguranca.com.br',
      'Vigilante Noturno',
      posto_hammer_2,
      escala_12x36_n_h,
      '19:00 às 07:00',
      'Noturno',
      'Ativo',
      19.00,
      true,
      'CNV-445566',
      true,
      true,
      'SP-9988771',
      'Ônibus',
      9.60
    )
  ON CONFLICT (cpf) DO NOTHING;

  -- 6. Colaboradores Inteligência e Serviços
  INSERT INTO public.colaboradores (
    id, empresa_id, nome, cpf, data_nascimento, telefone, email, cargo, posto_id, escala_id,
    horario, turno, status, valor_hora_base, exige_vigilancia,
    numero_cartao_vt, tipo_transporte, valor_diario_vt
  ) VALUES
    (
      '60000000-0000-0000-0000-000000000001'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Maria de Fátima Souza',
      '456.789.012-34',
      '1985-06-18',
      '(11) 97111-5566',
      'maria.fatima@inteligenciaservicos.com.br',
      'Auxiliar de Limpeza',
      posto_intel_1,
      escala_5x2_intel,
      '08:00 às 17:00',
      'Diurno',
      'Ativo',
      15.00,
      false,
      'SP-1122998',
      'Ônibus',
      9.60
    ),
    (
      '60000000-0000-0000-0000-000000000002'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Patrícia Lima Santos',
      '567.890.123-45',
      '1993-11-30',
      '(11) 97222-6677',
      'patricia.santos@inteligenciaservicos.com.br',
      'Recepcionista',
      posto_intel_2,
      escala_12x36_intel,
      '07:00 às 19:00',
      'Diurno',
      'Ativo',
      16.50,
      false,
      'SP-3344556',
      'Metrô',
      10.00
    )
  ON CONFLICT (cpf) DO NOTHING;

END $$;
