DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101350@tongyanginc.co.kr';
  
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
      '101350@tongyanginc.co.kr',
      crypt('101350', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '현효인'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101350', '현효인', 'owner', '양산공장영업팀', '010-3953-9394', 'hyoin.hyun@tongyanginc.co.kr', '101350@tongyanginc.co.kr', true, '101350')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '현효인', role = 'owner', department = '양산공장영업팀',
      phone = '010-3953-9394', contact_email = 'hyoin.hyun@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101353@tongyanginc.co.kr';
  
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
      '101353@tongyanginc.co.kr',
      crypt('101353', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '배재건'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101353', '배재건', 'owner', '대구공장공정팀', '010-9163-2843', 'jaekeon.bae@tongyanginc.co.kr', '101353@tongyanginc.co.kr', true, '101353')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '배재건', role = 'owner', department = '대구공장공정팀',
      phone = '010-9163-2843', contact_email = 'jaekeon.bae@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101354@tongyanginc.co.kr';
  
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
      '101354@tongyanginc.co.kr',
      crypt('101354', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '백현윤'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101354', '백현윤', 'owner', '창원공장공정팀', '010-5368-5266', 'hyunyun.baek@tongyanginc.co.kr', '101354@tongyanginc.co.kr', true, '101354')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '백현윤', role = 'owner', department = '창원공장공정팀',
      phone = '010-5368-5266', contact_email = 'hyunyun.baek@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101356@tongyanginc.co.kr';
  
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
      '101356@tongyanginc.co.kr',
      crypt('101356', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이상진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101356', '이상진', 'owner', '양산공장공정팀', '010-4587-8600', 'sangjin2.lee@tongyanginc.co.kr', '101356@tongyanginc.co.kr', true, '101356')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이상진', role = 'owner', department = '양산공장공정팀',
      phone = '010-4587-8600', contact_email = 'sangjin2.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101358@tongyanginc.co.kr';
  
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
      '101358@tongyanginc.co.kr',
      crypt('101358', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이대혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101358', '이대혁', 'owner', '울산공장공정팀', '010-2508-0232', 'daehyuck.lee@tongyanginc.co.kr', '101358@tongyanginc.co.kr', true, '101358')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이대혁', role = 'owner', department = '울산공장공정팀',
      phone = '010-2508-0232', contact_email = 'daehyuck.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101360@tongyanginc.co.kr';
  
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
      '101360@tongyanginc.co.kr',
      crypt('101360', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김보성'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101360', '김보성', 'owner', '대구공장공정팀', '010-4584-4498', 'bosung.kim@tongyanginc.co.kr', '101360@tongyanginc.co.kr', true, '101360')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김보성', role = 'owner', department = '대구공장공정팀',
      phone = '010-4584-4498', contact_email = 'bosung.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101361@tongyanginc.co.kr';
  
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
      '101361@tongyanginc.co.kr',
      crypt('101361', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '문효규'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101361', '문효규', 'owner', '파주공장공정팀', '010-3812-3664', 'hogyu.moon@tongyanginc.co.kr', '101361@tongyanginc.co.kr', true, '101361')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '문효규', role = 'owner', department = '파주공장공정팀',
      phone = '010-3812-3664', contact_email = 'hogyu.moon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101362@tongyanginc.co.kr';
  
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
      '101362@tongyanginc.co.kr',
      crypt('101362', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정재욱'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101362', '정재욱', 'owner', '파주공장공정팀', '010-3025-3629', 'TMJ_1005589@tongyanginc.co.kr', '101362@tongyanginc.co.kr', true, '101362')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정재욱', role = 'owner', department = '파주공장공정팀',
      phone = '010-3025-3629', contact_email = 'TMJ_1005589@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101365@tongyanginc.co.kr';
  
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
      '101365@tongyanginc.co.kr',
      crypt('101365', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김종갑'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101365', '김종갑', 'owner', '정관공장공정팀', '010-8779-6914', 'jonggab.kim@tongyanginc.co.kr', '101365@tongyanginc.co.kr', true, '101365')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김종갑', role = 'owner', department = '정관공장공정팀',
      phone = '010-8779-6914', contact_email = 'jonggab.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101366@tongyanginc.co.kr';
  
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
      '101366@tongyanginc.co.kr',
      crypt('101366', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김응찬'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101366', '김응찬', 'owner', '보령발전본부 저탄장 옥내화사업 토목공사', '010-3750-5819', 'eungchan.kim@tongyanginc.co.kr', '101366@tongyanginc.co.kr', true, '101366')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김응찬', role = 'owner', department = '보령발전본부 저탄장 옥내화사업 토목공사',
      phone = '010-3750-5819', contact_email = 'eungchan.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101373@tongyanginc.co.kr';
  
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
      '101373@tongyanginc.co.kr',
      crypt('101373', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박종국'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101373', '박종국', 'owner', '환경안전팀', '010-5319-3652', 'jkpark@tongyanginc.co.kr', '101373@tongyanginc.co.kr', true, '101373')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박종국', role = 'owner', department = '환경안전팀',
      phone = '010-5319-3652', contact_email = 'jkpark@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101375@tongyanginc.co.kr';
  
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
      '101375@tongyanginc.co.kr',
      crypt('101375', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '한종혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101375', '한종혁', 'owner', '보령발전본부 저탄장 옥내화사업 토목공사', '010-5721-2721', 'jhhan@tongyanginc.co.kr', '101375@tongyanginc.co.kr', true, '101375')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '한종혁', role = 'owner', department = '보령발전본부 저탄장 옥내화사업 토목공사',
      phone = '010-5721-2721', contact_email = 'jhhan@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101380@tongyanginc.co.kr';
  
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
      '101380@tongyanginc.co.kr',
      crypt('101380', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김지인'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101380', '김지인', 'owner', '군산공장관리팀', '010-7736-2889', 'jiin.kim@tongyanginc.co.kr', '101380@tongyanginc.co.kr', true, '101380')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김지인', role = 'owner', department = '군산공장관리팀',
      phone = '010-7736-2889', contact_email = 'jiin.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101395@tongyanginc.co.kr';
  
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
      '101395@tongyanginc.co.kr',
      crypt('101395', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '한정기'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101395', '한정기', 'owner', '예산공장(품질보증Part)', '010-3164-5904', 'hjk5904@tongyanginc.co.kr', '101395@tongyanginc.co.kr', true, '101395')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '한정기', role = 'owner', department = '예산공장(품질보증Part)',
      phone = '010-3164-5904', contact_email = 'hjk5904@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101398@tongyanginc.co.kr';
  
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
      '101398@tongyanginc.co.kr',
      crypt('101398', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박영숙'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101398', '박영숙', 'owner', '창원공장', '010-9281-3515', 'yongsook.park@tongyanginc.co.kr', '101398@tongyanginc.co.kr', true, '101398')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박영숙', role = 'owner', department = '창원공장',
      phone = '010-9281-3515', contact_email = 'yongsook.park@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101401@tongyanginc.co.kr';
  
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
      '101401@tongyanginc.co.kr',
      crypt('101401', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이동철'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101401', '이동철', 'owner', '전주공장', '010-3679-2803', 'TMJ_1007991@tongyanginc.co.kr', '101401@tongyanginc.co.kr', true, '101401')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이동철', role = 'owner', department = '전주공장',
      phone = '010-3679-2803', contact_email = 'TMJ_1007991@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101404@tongyanginc.co.kr';
  
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
      '101404@tongyanginc.co.kr',
      crypt('101404', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '고정훈'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101404', '고정훈', 'owner', '환경안전팀', '010-6344-2887', 'jhko@tongyanginc.co.kr', '101404@tongyanginc.co.kr', true, '101404')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '고정훈', role = 'owner', department = '환경안전팀',
      phone = '010-6344-2887', contact_email = 'jhko@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101406@tongyanginc.co.kr';
  
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
      '101406@tongyanginc.co.kr',
      crypt('101406', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이우익'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101406', '이우익', 'controller', '김포공장품질관리실', '010-5317-8307', 'wooik.lee@tongyanginc.co.kr', '101406@tongyanginc.co.kr', true, '101406')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이우익', role = 'controller', department = '김포공장품질관리실',
      phone = '010-5317-8307', contact_email = 'wooik.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101410@tongyanginc.co.kr';
  
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
      '101410@tongyanginc.co.kr',
      crypt('101410', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '강승남'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101410', '강승남', 'owner', '파주공장품질관리실', '010-9340-7282', 'seungnam.kang@tongyanginc.co.kr', '101410@tongyanginc.co.kr', true, '101410')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '강승남', role = 'owner', department = '파주공장품질관리실',
      phone = '010-9340-7282', contact_email = 'seungnam.kang@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101412@tongyanginc.co.kr';
  
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
      '101412@tongyanginc.co.kr',
      crypt('101412', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '강경표'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101412', '강경표', 'owner', '울산공장관리팀', '010-2025-8199', 'gyeongpyo.kang1@tongyanginc.co.kr', '101412@tongyanginc.co.kr', true, '101412')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '강경표', role = 'owner', department = '울산공장관리팀',
      phone = '010-2025-8199', contact_email = 'gyeongpyo.kang1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101413@tongyanginc.co.kr';
  
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
      '101413@tongyanginc.co.kr',
      crypt('101413', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '강성욱'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101413', '강성욱', 'owner', '울산공장공정팀', '010-3189-4644', 'sungwook.kang1@tongyanginc.co.kr', '101413@tongyanginc.co.kr', true, '101413')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '강성욱', role = 'owner', department = '울산공장공정팀',
      phone = '010-3189-4644', contact_email = 'sungwook.kang1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101414@tongyanginc.co.kr';
  
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
      '101414@tongyanginc.co.kr',
      crypt('101414', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김영기'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101414', '김영기', 'owner', '울산공장품질관리실', '010-4560-8101', 'youngki.kim1@tongyanginc.co.kr', '101414@tongyanginc.co.kr', true, '101414')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김영기', role = 'owner', department = '울산공장품질관리실',
      phone = '010-4560-8101', contact_email = 'youngki.kim1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101415@tongyanginc.co.kr';
  
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
      '101415@tongyanginc.co.kr',
      crypt('101415', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박우진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101415', '박우진', 'owner', '창원공장품질관리실', '010-2223-0258', 'woojin.park@tongyanginc.co.kr', '101415@tongyanginc.co.kr', true, '101415')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박우진', role = 'owner', department = '창원공장품질관리실',
      phone = '010-2223-0258', contact_email = 'woojin.park@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101417@tongyanginc.co.kr';
  
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
      '101417@tongyanginc.co.kr',
      crypt('101417', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '성미경'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101417', '성미경', 'owner', '울산공장영업팀', '010-3570-8203', 'mikyeong.sung@tongyanginc.co.kr', '101417@tongyanginc.co.kr', true, '101417')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '성미경', role = 'owner', department = '울산공장영업팀',
      phone = '010-3570-8203', contact_email = 'mikyeong.sung@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101419@tongyanginc.co.kr';
  
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
      '101419@tongyanginc.co.kr',
      crypt('101419', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '손청우'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101419', '손청우', 'owner', '부산공장영업팀', '010-2590-8146', 'chungwoo.son@tongyanginc.co.kr', '101419@tongyanginc.co.kr', true, '101419')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '손청우', role = 'owner', department = '부산공장영업팀',
      phone = '010-2590-8146', contact_email = 'chungwoo.son@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101420@tongyanginc.co.kr';
  
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
      '101420@tongyanginc.co.kr',
      crypt('101420', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최원혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101420', '최원혁', 'owner', '울산공장공정팀', '010-5005-6793', 'wonhyuk.choi@tongyanginc.co.kr', '101420@tongyanginc.co.kr', true, '101420')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최원혁', role = 'owner', department = '울산공장공정팀',
      phone = '010-5005-6793', contact_email = 'wonhyuk.choi@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101421@tongyanginc.co.kr';
  
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
      '101421@tongyanginc.co.kr',
      crypt('101421', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '한동헌'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101421', '한동헌', 'owner', '건자재유통사업팀(구매영업2Part)', '010-6849-0111', 'dongheon.han@tongyanginc.co.kr', '101421@tongyanginc.co.kr', true, '101421')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '한동헌', role = 'owner', department = '건자재유통사업팀(구매영업2Part)',
      phone = '010-6849-0111', contact_email = 'dongheon.han@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101422@tongyanginc.co.kr';
  
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
      '101422@tongyanginc.co.kr',
      crypt('101422', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '오두진'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101422', '오두진', 'owner', '그룹파견', '010-9446-9664', 'doojin.oh1@tongyanginc.co.kr', '101422@tongyanginc.co.kr', true, '101422')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '오두진', role = 'owner', department = '그룹파견',
      phone = '010-9446-9664', contact_email = 'doojin.oh1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101425@tongyanginc.co.kr';
  
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
      '101425@tongyanginc.co.kr',
      crypt('101425', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이은선'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101425', '이은선', 'owner', '총무팀', '010-9139-5158', 'eunsun.lee@tongyanginc.co.kr', '101425@tongyanginc.co.kr', true, '101425')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이은선', role = 'owner', department = '총무팀',
      phone = '010-9139-5158', contact_email = 'eunsun.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101431@tongyanginc.co.kr';
  
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
      '101431@tongyanginc.co.kr',
      crypt('101431', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정정태'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101431', '정정태', 'controller', '안양공장품질관리실', '010-3605-8694', 'jeongtea.jeong@tongyanginc.co.kr', '101431@tongyanginc.co.kr', true, '101431')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정정태', role = 'controller', department = '안양공장품질관리실',
      phone = '010-3605-8694', contact_email = 'jeongtea.jeong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

