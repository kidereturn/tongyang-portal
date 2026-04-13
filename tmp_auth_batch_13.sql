DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101807@tongyanginc.co.kr';
  
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
      '101807@tongyanginc.co.kr',
      crypt('101807', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '안현진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101807', '안현진', 'owner', '김포공장영업팀', '010-9911-9140', 'hyunjin@tongyanginc.co.kr', '101807@tongyanginc.co.kr', true, '101807')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '안현진', role = 'owner', department = '김포공장영업팀',
      phone = '010-9911-9140', contact_email = 'hyunjin@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101810@tongyanginc.co.kr';
  
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
      '101810@tongyanginc.co.kr',
      crypt('101810', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김경대'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101810', '김경대', 'owner', '골재사업소부산크라샤공정팀', '010-6660-9315', 'kkd@tongyanginc.co.kr', '101810@tongyanginc.co.kr', true, '101810')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김경대', role = 'owner', department = '골재사업소부산크라샤공정팀',
      phone = '010-6660-9315', contact_email = 'kkd@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101811@tongyanginc.co.kr';
  
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
      '101811@tongyanginc.co.kr',
      crypt('101811', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '신성식'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101811', '신성식', 'owner', '창원공장영업팀', '010-9312-9947', 'seongsik17@tongyanginc.co.kr', '101811@tongyanginc.co.kr', true, '101811')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '신성식', role = 'owner', department = '창원공장영업팀',
      phone = '010-9312-9947', contact_email = 'seongsik17@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101812@tongyanginc.co.kr';
  
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
      '101812@tongyanginc.co.kr',
      crypt('101812', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '신상호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101812', '신상호', 'owner', '서대문 은평지사 복합사옥 신축공사', '010-2213-1347', 'ssh@tongyanginc.co.kr', '101812@tongyanginc.co.kr', true, '101812')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '신상호', role = 'owner', department = '서대문 은평지사 복합사옥 신축공사',
      phone = '010-2213-1347', contact_email = 'ssh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101815@tongyanginc.co.kr';
  
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
      '101815@tongyanginc.co.kr',
      crypt('101815', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '문종호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101815', '문종호', 'owner', '안양공장품질관리실', '010-7272-3848', 'dlack123@tongyanginc.co.kr', '101815@tongyanginc.co.kr', true, '101815')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '문종호', role = 'owner', department = '안양공장품질관리실',
      phone = '010-7272-3848', contact_email = 'dlack123@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101820@tongyanginc.co.kr';
  
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
      '101820@tongyanginc.co.kr',
      crypt('101820', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김태호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101820', '김태호', 'owner', '아산공장공정팀', '010-7661-4419', 'kimtaeho@tongyanginc.co.kr', '101820@tongyanginc.co.kr', true, '101820')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김태호', role = 'owner', department = '아산공장공정팀',
      phone = '010-7661-4419', contact_email = 'kimtaeho@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101829@tongyanginc.co.kr';
  
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
      '101829@tongyanginc.co.kr',
      crypt('101829', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '황지환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101829', '황지환', 'owner', '김해공장관리팀', '010-2514-9658', 'hjh9658@tongyanginc.co.kr', '101829@tongyanginc.co.kr', true, '101829')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '황지환', role = 'owner', department = '김해공장관리팀',
      phone = '010-2514-9658', contact_email = 'hjh9658@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101835@tongyanginc.co.kr';
  
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
      '101835@tongyanginc.co.kr',
      crypt('101835', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이종태'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101835', '이종태', 'owner', '회전기사업/VPC(설계Part)', '010-4912-0150', 'ljt@tongyanginc.co.kr', '101835@tongyanginc.co.kr', true, '101835')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이종태', role = 'owner', department = '회전기사업/VPC(설계Part)',
      phone = '010-4912-0150', contact_email = 'ljt@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101837@tongyanginc.co.kr';
  
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
      '101837@tongyanginc.co.kr',
      crypt('101837', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김민석'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101837', '김민석', 'owner', '제주공장영업팀', '010-3920-9502', 'minsuk201@tongyanginc.co.kr', '101837@tongyanginc.co.kr', true, '101837')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김민석', role = 'owner', department = '제주공장영업팀',
      phone = '010-3920-9502', contact_email = 'minsuk201@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101842@tongyanginc.co.kr';
  
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
      '101842@tongyanginc.co.kr',
      crypt('101842', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박한진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101842', '박한진', 'owner', '내부회계팀', '010-4529-5437', 'phjin@tongyanginc.co.kr', '101842@tongyanginc.co.kr', true, '101842')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박한진', role = 'owner', department = '내부회계팀',
      phone = '010-4529-5437', contact_email = 'phjin@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101846@tongyanginc.co.kr';
  
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
      '101846@tongyanginc.co.kr',
      crypt('101846', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김시영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101846', '김시영', 'owner', '서부산공장공정팀', '010-4105-2246', 'kimsy@tongyanginc.co.kr', '101846@tongyanginc.co.kr', true, '101846')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김시영', role = 'owner', department = '서부산공장공정팀',
      phone = '010-4105-2246', contact_email = 'kimsy@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101850@tongyanginc.co.kr';
  
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
      '101850@tongyanginc.co.kr',
      crypt('101850', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '문준혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101850', '문준혁', 'owner', '예산공장(생산관리Part)', '010-2032-7859', 'jhm@tongyanginc.co.kr', '101850@tongyanginc.co.kr', true, '101850')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '문준혁', role = 'owner', department = '예산공장(생산관리Part)',
      phone = '010-2032-7859', contact_email = 'jhm@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101857@tongyanginc.co.kr';
  
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
      '101857@tongyanginc.co.kr',
      crypt('101857', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '민영규'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101857', '민영규', 'owner', '가마지천 수해상습지 개선공사', '010-2112-9097', 'myg@tongyanginc.co.kr', '101857@tongyanginc.co.kr', true, '101857')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '민영규', role = 'owner', department = '가마지천 수해상습지 개선공사',
      phone = '010-2112-9097', contact_email = 'myg@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101859@tongyanginc.co.kr';
  
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
      '101859@tongyanginc.co.kr',
      crypt('101859', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '신홍겸'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101859', '신홍겸', 'owner', '부산공장공정팀', '010-4344-4252', 'shinhonggyeom@tongyanginc.co.kr', '101859@tongyanginc.co.kr', true, '101859')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '신홍겸', role = 'owner', department = '부산공장공정팀',
      phone = '010-4344-4252', contact_email = 'shinhonggyeom@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101866@tongyanginc.co.kr';
  
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
      '101866@tongyanginc.co.kr',
      crypt('101866', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이승진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101866', '이승진', 'owner', '골재사업소부산크라샤공정팀', '010-2565-7556', 'lsj@tongyanginc.co.kr', '101866@tongyanginc.co.kr', true, '101866')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이승진', role = 'owner', department = '골재사업소부산크라샤공정팀',
      phone = '010-2565-7556', contact_email = 'lsj@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101869@tongyanginc.co.kr';
  
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
      '101869@tongyanginc.co.kr',
      crypt('101869', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '공광호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101869', '공광호', 'owner', '아산공장', '010-2756-8903', 'gongkh@tongyanginc.co.kr', '101869@tongyanginc.co.kr', true, '101869')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '공광호', role = 'owner', department = '아산공장',
      phone = '010-2756-8903', contact_email = 'gongkh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101871@tongyanginc.co.kr';
  
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
      '101871@tongyanginc.co.kr',
      crypt('101871', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김재석'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101871', '김재석', 'owner', '회전기사업/VPC(설계Part)', '010-8631-3548', 'kjs@tongyanginc.co.kr', '101871@tongyanginc.co.kr', true, '101871')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김재석', role = 'owner', department = '회전기사업/VPC(설계Part)',
      phone = '010-8631-3548', contact_email = 'kjs@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101878@tongyanginc.co.kr';
  
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
      '101878@tongyanginc.co.kr',
      crypt('101878', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '송지수'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101878', '송지수', 'owner', '골재사업소서부산크라샤공정팀', '010-5665-0634', 'sjs0634@tongyanginc.co.kr', '101878@tongyanginc.co.kr', true, '101878')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '송지수', role = 'owner', department = '골재사업소서부산크라샤공정팀',
      phone = '010-5665-0634', contact_email = 'sjs0634@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101880@tongyanginc.co.kr';
  
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
      '101880@tongyanginc.co.kr',
      crypt('101880', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '홍성호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101880', '홍성호', 'controller', '한국건강관리협회 인천지부 신청사 건립 신축공사', '010-3367-6629', 'shhong@tongyanginc.co.kr', '101880@tongyanginc.co.kr', true, '101880')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '홍성호', role = 'controller', department = '한국건강관리협회 인천지부 신청사 건립 신축공사',
      phone = '010-3367-6629', contact_email = 'shhong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101885@tongyanginc.co.kr';
  
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
      '101885@tongyanginc.co.kr',
      crypt('101885', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '배중완'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101885', '배중완', 'owner', '개발사업팀', '010-5144-8371', 'jwbae@tongyanginc.co.kr', '101885@tongyanginc.co.kr', true, '101885')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '배중완', role = 'owner', department = '개발사업팀',
      phone = '010-5144-8371', contact_email = 'jwbae@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101886@tongyanginc.co.kr';
  
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
      '101886@tongyanginc.co.kr',
      crypt('101886', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정기영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101886', '정기영', 'owner', '인천공장공정팀', '010-2265-0844', 'jgy@tongyanginc.co.kr', '101886@tongyanginc.co.kr', true, '101886')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정기영', role = 'owner', department = '인천공장공정팀',
      phone = '010-2265-0844', contact_email = 'jgy@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101887@tongyanginc.co.kr';
  
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
      '101887@tongyanginc.co.kr',
      crypt('101887', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김현기'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101887', '김현기', 'owner', '전주공장공정팀', '010-8642-2458', 'khg@tongyanginc.co.kr', '101887@tongyanginc.co.kr', true, '101887')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김현기', role = 'owner', department = '전주공장공정팀',
      phone = '010-8642-2458', contact_email = 'khg@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101888@tongyanginc.co.kr';
  
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
      '101888@tongyanginc.co.kr',
      crypt('101888', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최명진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101888', '최명진', 'owner', '아산공장공정팀', '010-2300-3834', 'cmj@tongyanginc.co.kr', '101888@tongyanginc.co.kr', true, '101888')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최명진', role = 'owner', department = '아산공장공정팀',
      phone = '010-2300-3834', contact_email = 'cmj@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101889@tongyanginc.co.kr';
  
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
      '101889@tongyanginc.co.kr',
      crypt('101889', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김형신'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101889', '김형신', 'owner', '김해공장공정팀', '010-7305-2270', 'khs@tongyanginc.co.kr', '101889@tongyanginc.co.kr', true, '101889')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김형신', role = 'owner', department = '김해공장공정팀',
      phone = '010-7305-2270', contact_email = 'khs@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101890@tongyanginc.co.kr';
  
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
      '101890@tongyanginc.co.kr',
      crypt('101890', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김문곤'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101890', '김문곤', 'owner', '안양공장공정팀', '010-5043-8656', 'kmg@tongyanginc.co.kr', '101890@tongyanginc.co.kr', true, '101890')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김문곤', role = 'owner', department = '안양공장공정팀',
      phone = '010-5043-8656', contact_email = 'kmg@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101891@tongyanginc.co.kr';
  
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
      '101891@tongyanginc.co.kr',
      crypt('101891', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '손승복'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101891', '손승복', 'owner', '파주공장공정팀', '010-2410-2869', 'ssb@tongyanginc.co.kr', '101891@tongyanginc.co.kr', true, '101891')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '손승복', role = 'owner', department = '파주공장공정팀',
      phone = '010-2410-2869', contact_email = 'ssb@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101892@tongyanginc.co.kr';
  
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
      '101892@tongyanginc.co.kr',
      crypt('101892', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '조현'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101892', '조현', 'owner', '서부산공장공정팀', '010-4804-4700', 'joh@tongyanginc.co.kr', '101892@tongyanginc.co.kr', true, '101892')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '조현', role = 'owner', department = '서부산공장공정팀',
      phone = '010-4804-4700', contact_email = 'joh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101893@tongyanginc.co.kr';
  
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
      '101893@tongyanginc.co.kr',
      crypt('101893', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '변대룡'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101893', '변대룡', 'owner', '광양 바이오매스 EPC 건설공사', '010-3151-5856', 'bdr@tongyanginc.co.kr', '101893@tongyanginc.co.kr', true, '101893')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '변대룡', role = 'owner', department = '광양 바이오매스 EPC 건설공사',
      phone = '010-3151-5856', contact_email = 'bdr@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101894@tongyanginc.co.kr';
  
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
      '101894@tongyanginc.co.kr',
      crypt('101894', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정진이'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101894', '정진이', 'owner', '한국건강관리협회 인천지부 신청사 건립 신축공사', '010-4007-1030', 'jjy@tongyanginc.co.kr', '101894@tongyanginc.co.kr', true, '101894')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정진이', role = 'owner', department = '한국건강관리협회 인천지부 신청사 건립 신축공사',
      phone = '010-4007-1030', contact_email = 'jjy@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101900@tongyanginc.co.kr';
  
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
      '101900@tongyanginc.co.kr',
      crypt('101900', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '민명일'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101900', '민명일', 'owner', '산포처리구역 하수관로 정비사업', '010-2627-6858', 'mmi@tongyanginc.co.kr', '101900@tongyanginc.co.kr', true, '101900')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '민명일', role = 'owner', department = '산포처리구역 하수관로 정비사업',
      phone = '010-2627-6858', contact_email = 'mmi@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

