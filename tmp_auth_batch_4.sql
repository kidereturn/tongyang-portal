DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101166@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101166@tongyanginc.co.kr',
      crypt('101166', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이성일'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101166', '이성일', 'owner', '공사관리팀', '010-8613-7441', 'sungil.lee@tongyanginc.co.kr', '101166@tongyanginc.co.kr', true, '101166')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이성일', role = 'owner', department = '공사관리팀',
      phone = '010-8613-7441', contact_email = 'sungil.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101167@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101167@tongyanginc.co.kr',
      crypt('101167', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이언일'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101167', '이언일', 'owner', '건자재유통사업팀(구매영업1Part)', '010-2594-4065', 'eonil.lee@tongyanginc.co.kr', '101167@tongyanginc.co.kr', true, '101167')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이언일', role = 'owner', department = '건자재유통사업팀(구매영업1Part)',
      phone = '010-2594-4065', contact_email = 'eonil.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101169@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101169@tongyanginc.co.kr',
      crypt('101169', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이재호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101169', '이재호', 'owner', '원주공장품질관리실', '010-3773-6047', 'jaeho3.lee@tongyanginc.co.kr', '101169@tongyanginc.co.kr', true, '101169')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이재호', role = 'owner', department = '원주공장품질관리실',
      phone = '010-3773-6047', contact_email = 'jaeho3.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101170@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101170@tongyanginc.co.kr',
      crypt('101170', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이철홍'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101170', '이철홍', 'controller', '정관공장품질관리실', '010-4580-7438', 'cheolhong.lee@tongyanginc.co.kr', '101170@tongyanginc.co.kr', true, '101170')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이철홍', role = 'controller', department = '정관공장품질관리실',
      phone = '010-4580-7438', contact_email = 'cheolhong.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101171@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101171@tongyanginc.co.kr',
      crypt('101171', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이은수'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101171', '이은수', 'owner', '김해공장품질관리실', '010-5744-7763', 'eunsu.lee@tongyanginc.co.kr', '101171@tongyanginc.co.kr', true, '101171')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이은수', role = 'owner', department = '김해공장품질관리실',
      phone = '010-5744-7763', contact_email = 'eunsu.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101172@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101172@tongyanginc.co.kr',
      crypt('101172', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '임재육'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101172', '임재육', 'owner', '서대문 은평지사 복합사옥 신축공사', '010-8575-2745', 'jaeyuck.lim@tongyanginc.co.kr', '101172@tongyanginc.co.kr', true, '101172')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '임재육', role = 'owner', department = '서대문 은평지사 복합사옥 신축공사',
      phone = '010-8575-2745', contact_email = 'jaeyuck.lim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101175@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101175@tongyanginc.co.kr',
      crypt('101175', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '장정훈'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101175', '장정훈', 'controller', '원주공장품질관리실', '010-8489-4264', 'jeonghoon.jang@tongyanginc.co.kr', '101175@tongyanginc.co.kr', true, '101175')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '장정훈', role = 'controller', department = '원주공장품질관리실',
      phone = '010-8489-4264', contact_email = 'jeonghoon.jang@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101176@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101176@tongyanginc.co.kr',
      crypt('101176', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정선우'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101176', '정선우', 'owner', '기술관리팀', '010-3656-0394', 'sunwoo.jeong@tongyanginc.co.kr', '101176@tongyanginc.co.kr', true, '101176')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정선우', role = 'owner', department = '기술관리팀',
      phone = '010-3656-0394', contact_email = 'sunwoo.jeong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101177@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101177@tongyanginc.co.kr',
      crypt('101177', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정성민'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101177', '정성민', 'owner', 'DC 프리콘 TFT', '010-9921-5737', 'sungmin.jung@tongyanginc.co.kr', '101177@tongyanginc.co.kr', true, '101177')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정성민', role = 'owner', department = 'DC 프리콘 TFT',
      phone = '010-9921-5737', contact_email = 'sungmin.jung@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101179@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101179@tongyanginc.co.kr',
      crypt('101179', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '조재철'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101179', '조재철', 'owner', '공사관리팀', '010-8284-0890', 'jaecheol.cho@tongyanginc.co.kr', '101179@tongyanginc.co.kr', true, '101179')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '조재철', role = 'owner', department = '공사관리팀',
      phone = '010-8284-0890', contact_email = 'jaecheol.cho@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101180@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101180@tongyanginc.co.kr',
      crypt('101180', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '진소환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101180', '진소환', 'owner', '총무팀', '010-2742-7780', 'sohwan.jin@tongyanginc.co.kr', '101180@tongyanginc.co.kr', true, '101180')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '진소환', role = 'owner', department = '총무팀',
      phone = '010-2742-7780', contact_email = 'sohwan.jin@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101181@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101181@tongyanginc.co.kr',
      crypt('101181', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최강석'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101181', '최강석', 'owner', '군산공장영업팀', '010-4001-0108', 'kangseok.choi@tongyanginc.co.kr', '101181@tongyanginc.co.kr', true, '101181')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최강석', role = 'owner', department = '군산공장영업팀',
      phone = '010-4001-0108', contact_email = 'kangseok.choi@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101184@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101184@tongyanginc.co.kr',
      crypt('101184', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '홍정미'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101184', '홍정미', 'owner', '연구개발팀', '010-4052-4319', 'jungmi.hong@tongyanginc.co.kr', '101184@tongyanginc.co.kr', true, '101184')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '홍정미', role = 'owner', department = '연구개발팀',
      phone = '010-4052-4319', contact_email = 'jungmi.hong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101185@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101185@tongyanginc.co.kr',
      crypt('101185', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'Pham Ngoc Son'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101185', 'Pham Ngoc Son', 'owner', '회전기사업/VPC(관리Part)', '010-5175-5632', 'son.phamngoc@tongyanginc.co.kr', '101185@tongyanginc.co.kr', true, '101185')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = 'Pham Ngoc Son', role = 'owner', department = '회전기사업/VPC(관리Part)',
      phone = '010-5175-5632', contact_email = 'son.phamngoc@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101187@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101187@tongyanginc.co.kr',
      crypt('101187', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '강태중'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101187', '강태중', 'owner', '울산공장영업팀', '010-8569-0782', 'taejoong.kang@tongyanginc.co.kr', '101187@tongyanginc.co.kr', true, '101187')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '강태중', role = 'owner', department = '울산공장영업팀',
      phone = '010-8569-0782', contact_email = 'taejoong.kang@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101188@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101188@tongyanginc.co.kr',
      crypt('101188', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '권대순'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101188', '권대순', 'owner', '연구개발팀', '010-7412-7144', 'daesoon.kwon@tongyanginc.co.kr', '101188@tongyanginc.co.kr', true, '101188')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '권대순', role = 'owner', department = '연구개발팀',
      phone = '010-7412-7144', contact_email = 'daesoon.kwon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101189@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101189@tongyanginc.co.kr',
      crypt('101189', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '권오윤'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101189', '권오윤', 'owner', '전략기획팀', '010-3888-2059', 'oykwon@tongyanginc.co.kr', '101189@tongyanginc.co.kr', true, '101189')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '권오윤', role = 'owner', department = '전략기획팀',
      phone = '010-3888-2059', contact_email = 'oykwon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101190@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101190@tongyanginc.co.kr',
      crypt('101190', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '권윤'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101190', '권윤', 'owner', '법무팀', '010-3482-2238', 'yoon.guon@tongyanginc.co.kr', '101190@tongyanginc.co.kr', true, '101190')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '권윤', role = 'owner', department = '법무팀',
      phone = '010-3482-2238', contact_email = 'yoon.guon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101191@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101191@tongyanginc.co.kr',
      crypt('101191', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '권혁준'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101191', '권혁준', 'owner', '원주공장영업팀', '010-8531-0790', 'hj.kwon@tongyanginc.co.kr', '101191@tongyanginc.co.kr', true, '101191')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '권혁준', role = 'owner', department = '원주공장영업팀',
      phone = '010-8531-0790', contact_email = 'hj.kwon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101194@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101194@tongyanginc.co.kr',
      crypt('101194', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김경국'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101194', '김경국', 'owner', '골재사업소영업팀', '010-4433-4722', 'kyoungkoog.kim@tongyanginc.co.kr', '101194@tongyanginc.co.kr', true, '101194')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김경국', role = 'owner', department = '골재사업소영업팀',
      phone = '010-4433-4722', contact_email = 'kyoungkoog.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101195@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101195@tongyanginc.co.kr',
      crypt('101195', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김경현'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101195', '김경현', 'owner', '부산공장품질관리실', '010-3508-7387', 'kyounghyun.kim@tongyanginc.co.kr', '101195@tongyanginc.co.kr', true, '101195')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김경현', role = 'owner', department = '부산공장품질관리실',
      phone = '010-3508-7387', contact_email = 'kyounghyun.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101197@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101197@tongyanginc.co.kr',
      crypt('101197', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김동석'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101197', '김동석', 'owner', '울산공장품질관리실', '010-3909-6087', 'dongsuk.kim@tongyanginc.co.kr', '101197@tongyanginc.co.kr', true, '101197')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김동석', role = 'owner', department = '울산공장품질관리실',
      phone = '010-3909-6087', contact_email = 'dongsuk.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101198@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101198@tongyanginc.co.kr',
      crypt('101198', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김동혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101198', '김동혁', 'owner', '회전기사업/VPC(설계Part)', '010-9655-7831', 'donghyuk3.kim@tongyanginc.co.kr', '101198@tongyanginc.co.kr', true, '101198')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김동혁', role = 'owner', department = '회전기사업/VPC(설계Part)',
      phone = '010-9655-7831', contact_email = 'donghyuk3.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101199@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101199@tongyanginc.co.kr',
      crypt('101199', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김명학'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101199', '김명학', 'owner', '파주공장영업팀', '010-8790-0035', 'mhkim76@tongyanginc.co.kr', '101199@tongyanginc.co.kr', true, '101199')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김명학', role = 'owner', department = '파주공장영업팀',
      phone = '010-8790-0035', contact_email = 'mhkim76@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101200@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101200@tongyanginc.co.kr',
      crypt('101200', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김민성'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101200', '김민성', 'owner', '예산공장(생산관리Part)', '010-2832-7971', 'minsung.kim@tongyanginc.co.kr', '101200@tongyanginc.co.kr', true, '101200')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김민성', role = 'owner', department = '예산공장(생산관리Part)',
      phone = '010-2832-7971', contact_email = 'minsung.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101201@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101201@tongyanginc.co.kr',
      crypt('101201', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김민재'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101201', '김민재', 'owner', '총무팀', '010-2391-2349', 'apple@tongyanginc.co.kr', '101201@tongyanginc.co.kr', true, '101201')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김민재', role = 'owner', department = '총무팀',
      phone = '010-2391-2349', contact_email = 'apple@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101203@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101203@tongyanginc.co.kr',
      crypt('101203', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김병국'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101203', '김병국', 'owner', '전주공장품질관리실', '010-2536-6656', 'byungkuk.kim@tongyanginc.co.kr', '101203@tongyanginc.co.kr', true, '101203')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김병국', role = 'owner', department = '전주공장품질관리실',
      phone = '010-2536-6656', contact_email = 'byungkuk.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101205@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101205@tongyanginc.co.kr',
      crypt('101205', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김성목'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101205', '김성목', 'owner', '부산공장품질관리실', '010-4789-0061', 'sungmok.kim@tongyanginc.co.kr', '101205@tongyanginc.co.kr', true, '101205')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김성목', role = 'owner', department = '부산공장품질관리실',
      phone = '010-4789-0061', contact_email = 'sungmok.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101207@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101207@tongyanginc.co.kr',
      crypt('101207', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김주현'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101207', '김주현', 'owner', '부산공장관리팀', '010-3279-7272', 'juhyun2.kim@tongyanginc.co.kr', '101207@tongyanginc.co.kr', true, '101207')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김주현', role = 'owner', department = '부산공장관리팀',
      phone = '010-3279-7272', contact_email = 'juhyun2.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101208@tongyanginc.co.kr';
  
  IF v_uid IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new,
      recovery_token, phone_change, phone_change_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      '101208@tongyanginc.co.kr',
      crypt('101208', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김화겸'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101208', '김화겸', 'owner', '군산공장품질관리실', '010-3111-9448', 'hwakyum.kim@tongyanginc.co.kr', '101208@tongyanginc.co.kr', true, '101208')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김화겸', role = 'owner', department = '군산공장품질관리실',
      phone = '010-3111-9448', contact_email = 'hwakyum.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

