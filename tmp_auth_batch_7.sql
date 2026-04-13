DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101295@tongyanginc.co.kr';
  
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
      '101295@tongyanginc.co.kr',
      crypt('101295', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김미래'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101295', '김미래', 'owner', '회전기사업/VPC(설계Part)', '010-9489-6798', 'mirae.kim@tongyanginc.co.kr', '101295@tongyanginc.co.kr', true, '101295')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김미래', role = 'owner', department = '회전기사업/VPC(설계Part)',
      phone = '010-9489-6798', contact_email = 'mirae.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101296@tongyanginc.co.kr';
  
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
      '101296@tongyanginc.co.kr',
      crypt('101296', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김상환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101296', '김상환', 'owner', '서부산공장품질관리실', '010-5380-4919', 'sanghwan.kim@tongyanginc.co.kr', '101296@tongyanginc.co.kr', true, '101296')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김상환', role = 'owner', department = '서부산공장품질관리실',
      phone = '010-5380-4919', contact_email = 'sanghwan.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101298@tongyanginc.co.kr';
  
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
      '101298@tongyanginc.co.kr',
      crypt('101298', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김종일'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101298', '김종일', 'owner', '사업운영팀', '010-3933-0796', 'jongil.kim2@tongyanginc.co.kr', '101298@tongyanginc.co.kr', true, '101298')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김종일', role = 'owner', department = '사업운영팀',
      phone = '010-3933-0796', contact_email = 'jongil.kim2@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101299@tongyanginc.co.kr';
  
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
      '101299@tongyanginc.co.kr',
      crypt('101299', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김지훈'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101299', '김지훈', 'owner', '인천공장품질관리실', '010-3816-8352', 'jihun.kim@tongyanginc.co.kr', '101299@tongyanginc.co.kr', true, '101299')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김지훈', role = 'owner', department = '인천공장품질관리실',
      phone = '010-3816-8352', contact_email = 'jihun.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101300@tongyanginc.co.kr';
  
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
      '101300@tongyanginc.co.kr',
      crypt('101300', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김창환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101300', '김창환', 'owner', '사업운영팀', '010-8583-1731', 'changhwan.kim2@tongyanginc.co.kr', '101300@tongyanginc.co.kr', true, '101300')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김창환', role = 'owner', department = '사업운영팀',
      phone = '010-8583-1731', contact_email = 'changhwan.kim2@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101301@tongyanginc.co.kr';
  
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
      '101301@tongyanginc.co.kr',
      crypt('101301', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김현중'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101301', '김현중', 'owner', '전주공장관리팀', '010-4485-1212', 'hyunjung.kim@tongyanginc.co.kr', '101301@tongyanginc.co.kr', true, '101301')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김현중', role = 'owner', department = '전주공장관리팀',
      phone = '010-4485-1212', contact_email = 'hyunjung.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101302@tongyanginc.co.kr';
  
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
      '101302@tongyanginc.co.kr',
      crypt('101302', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김희관'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101302', '김희관', 'owner', '회전기사업/VPC', '010-5069-4250', 'kimhk@tongyanginc.co.kr', '101302@tongyanginc.co.kr', true, '101302')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김희관', role = 'owner', department = '회전기사업/VPC',
      phone = '010-5069-4250', contact_email = 'kimhk@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101307@tongyanginc.co.kr';
  
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
      '101307@tongyanginc.co.kr',
      crypt('101307', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박석우'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101307', '박석우', 'owner', '건자재유통사업팀(구매영업2Part)', '010-2830-8482', 'seokwoo.park@tongyanginc.co.kr', '101307@tongyanginc.co.kr', true, '101307')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박석우', role = 'owner', department = '건자재유통사업팀(구매영업2Part)',
      phone = '010-2830-8482', contact_email = 'seokwoo.park@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101309@tongyanginc.co.kr';
  
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
      '101309@tongyanginc.co.kr',
      crypt('101309', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박연실'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101309', '박연실', 'owner', '전주공장영업팀', '010-3683-0031', 'yunshil.park@tongyanginc.co.kr', '101309@tongyanginc.co.kr', true, '101309')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박연실', role = 'owner', department = '전주공장영업팀',
      phone = '010-3683-0031', contact_email = 'yunshil.park@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101311@tongyanginc.co.kr';
  
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
      '101311@tongyanginc.co.kr',
      crypt('101311', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '선회정'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101311', '선회정', 'owner', '창원공장영업팀', '010-2102-2015', 'hoejeong.seon@tongyanginc.co.kr', '101311@tongyanginc.co.kr', true, '101311')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '선회정', role = 'owner', department = '창원공장영업팀',
      phone = '010-2102-2015', contact_email = 'hoejeong.seon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101313@tongyanginc.co.kr';
  
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
      '101313@tongyanginc.co.kr',
      crypt('101313', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '손석환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101313', '손석환', 'owner', '아산공장영업팀', '010-9686-2569', 'seokhwan.son@tongyanginc.co.kr', '101313@tongyanginc.co.kr', true, '101313')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '손석환', role = 'owner', department = '아산공장영업팀',
      phone = '010-9686-2569', contact_email = 'seokhwan.son@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101315@tongyanginc.co.kr';
  
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
      '101315@tongyanginc.co.kr',
      crypt('101315', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '신진영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101315', '신진영', 'owner', '서부산공장영업팀', '010-9255-7811', 'jinyoung.shin@tongyanginc.co.kr', '101315@tongyanginc.co.kr', true, '101315')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '신진영', role = 'owner', department = '서부산공장영업팀',
      phone = '010-9255-7811', contact_email = 'jinyoung.shin@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101316@tongyanginc.co.kr';
  
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
      '101316@tongyanginc.co.kr',
      crypt('101316', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '오동준'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101316', '오동준', 'owner', '아산공장품질관리실', '010-5628-7275', 'dongjun.oh@tongyanginc.co.kr', '101316@tongyanginc.co.kr', true, '101316')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '오동준', role = 'owner', department = '아산공장품질관리실',
      phone = '010-5628-7275', contact_email = 'dongjun.oh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101317@tongyanginc.co.kr';
  
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
      '101317@tongyanginc.co.kr',
      crypt('101317', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '오민영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101317', '오민영', 'owner', '사업운영팀', '010-8812-2756', 'minyoung.oh@tongyanginc.co.kr', '101317@tongyanginc.co.kr', true, '101317')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '오민영', role = 'owner', department = '사업운영팀',
      phone = '010-8812-2756', contact_email = 'minyoung.oh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101319@tongyanginc.co.kr';
  
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
      '101319@tongyanginc.co.kr',
      crypt('101319', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '유영호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101319', '유영호', 'owner', '울산공장영업팀', '010-5184-0564', 'youngho.yoo@tongyanginc.co.kr', '101319@tongyanginc.co.kr', true, '101319')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '유영호', role = 'owner', department = '울산공장영업팀',
      phone = '010-5184-0564', contact_email = 'youngho.yoo@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101320@tongyanginc.co.kr';
  
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
      '101320@tongyanginc.co.kr',
      crypt('101320', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '유일상'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101320', '유일상', 'owner', '아산공장영업팀', '010-4880-2652', 'ilsang.you@tongyanginc.co.kr', '101320@tongyanginc.co.kr', true, '101320')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '유일상', role = 'owner', department = '아산공장영업팀',
      phone = '010-4880-2652', contact_email = 'ilsang.you@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101321@tongyanginc.co.kr';
  
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
      '101321@tongyanginc.co.kr',
      crypt('101321', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '유진희'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101321', '유진희', 'owner', '파주공장영업팀', '010-8373-5632', 'jinhee.yoo@tongyanginc.co.kr', '101321@tongyanginc.co.kr', true, '101321')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '유진희', role = 'owner', department = '파주공장영업팀',
      phone = '010-8373-5632', contact_email = 'jinhee.yoo@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101322@tongyanginc.co.kr';
  
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
      '101322@tongyanginc.co.kr',
      crypt('101322', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이동준'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101322', '이동준', 'owner', '수주영업팀', '010-7447-5256', 'dongjun.lee@tongyanginc.co.kr', '101322@tongyanginc.co.kr', true, '101322')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이동준', role = 'owner', department = '수주영업팀',
      phone = '010-7447-5256', contact_email = 'dongjun.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101324@tongyanginc.co.kr';
  
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
      '101324@tongyanginc.co.kr',
      crypt('101324', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이승희'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101324', '이승희', 'owner', '건자재유통사업팀(구매영업2Part)', '010-3627-5608', 'lee.sh@tongyanginc.co.kr', '101324@tongyanginc.co.kr', true, '101324')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이승희', role = 'owner', department = '건자재유통사업팀(구매영업2Part)',
      phone = '010-3627-5608', contact_email = 'lee.sh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101327@tongyanginc.co.kr';
  
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
      '101327@tongyanginc.co.kr',
      crypt('101327', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이태성'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101327', '이태성', 'owner', '안양공장품질관리실', '010-8441-1703', 'taesung.lee@tongyanginc.co.kr', '101327@tongyanginc.co.kr', true, '101327')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이태성', role = 'owner', department = '안양공장품질관리실',
      phone = '010-8441-1703', contact_email = 'taesung.lee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101328@tongyanginc.co.kr';
  
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
      '101328@tongyanginc.co.kr',
      crypt('101328', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '전영준'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101328', '전영준', 'owner', '사업관리팀', '010-8557-4669', 'youngjun.jeon@tongyanginc.co.kr', '101328@tongyanginc.co.kr', true, '101328')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '전영준', role = 'owner', department = '사업관리팀',
      phone = '010-8557-4669', contact_email = 'youngjun.jeon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101330@tongyanginc.co.kr';
  
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
      '101330@tongyanginc.co.kr',
      crypt('101330', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '진영옥'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101330', '진영옥', 'owner', '정관공장영업팀', '010-8116-2919', 'youngok.jin@tongyanginc.co.kr', '101330@tongyanginc.co.kr', true, '101330')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '진영옥', role = 'owner', department = '정관공장영업팀',
      phone = '010-8116-2919', contact_email = 'youngok.jin@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101332@tongyanginc.co.kr';
  
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
      '101332@tongyanginc.co.kr',
      crypt('101332', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최지수'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101332', '최지수', 'owner', '공사관리팀', '010-9447-3587', 'jisoo.choi@tongyanginc.co.kr', '101332@tongyanginc.co.kr', true, '101332')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최지수', role = 'owner', department = '공사관리팀',
      phone = '010-9447-3587', contact_email = 'jisoo.choi@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101334@tongyanginc.co.kr';
  
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
      '101334@tongyanginc.co.kr',
      crypt('101334', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김도연'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101334', '김도연', 'owner', '정관공장영업팀', '010-5547-1860', 'byDo@tongyanginc.co.kr', '101334@tongyanginc.co.kr', true, '101334')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김도연', role = 'owner', department = '정관공장영업팀',
      phone = '010-5547-1860', contact_email = 'byDo@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101338@tongyanginc.co.kr';
  
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
      '101338@tongyanginc.co.kr',
      crypt('101338', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '안봉환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101338', '안봉환', 'owner', '양산공장품질관리실', '010-9465-6700', 'bonghwan.an@tongyanginc.co.kr', '101338@tongyanginc.co.kr', true, '101338')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '안봉환', role = 'owner', department = '양산공장품질관리실',
      phone = '010-9465-6700', contact_email = 'bonghwan.an@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101340@tongyanginc.co.kr';
  
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
      '101340@tongyanginc.co.kr',
      crypt('101340', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '윤영아'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101340', '윤영아', 'owner', '김해공장영업팀', '010-7618-0802', 'younga.yoon@tongyanginc.co.kr', '101340@tongyanginc.co.kr', true, '101340')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '윤영아', role = 'owner', department = '김해공장영업팀',
      phone = '010-7618-0802', contact_email = 'younga.yoon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101344@tongyanginc.co.kr';
  
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
      '101344@tongyanginc.co.kr',
      crypt('101344', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '조용인'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101344', '조용인', 'owner', '부산공장영업팀', '010-4594-9892', 'yongin.cho@tongyanginc.co.kr', '101344@tongyanginc.co.kr', true, '101344')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '조용인', role = 'owner', department = '부산공장영업팀',
      phone = '010-4594-9892', contact_email = 'yongin.cho@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101347@tongyanginc.co.kr';
  
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
      '101347@tongyanginc.co.kr',
      crypt('101347', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김민정'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101347', '김민정', 'owner', '대구공장영업팀', '010-5096-4298', 'minjung.kim@tongyanginc.co.kr', '101347@tongyanginc.co.kr', true, '101347')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김민정', role = 'owner', department = '대구공장영업팀',
      phone = '010-5096-4298', contact_email = 'minjung.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101348@tongyanginc.co.kr';
  
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
      '101348@tongyanginc.co.kr',
      crypt('101348', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김보연'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101348', '김보연', 'owner', '채권관리팀', '010-9493-5080', 'boyeon.kim@tongyanginc.co.kr', '101348@tongyanginc.co.kr', true, '101348')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김보연', role = 'owner', department = '채권관리팀',
      phone = '010-9493-5080', contact_email = 'boyeon.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101349@tongyanginc.co.kr';
  
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
      '101349@tongyanginc.co.kr',
      crypt('101349', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김진봉'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101349', '김진봉', 'owner', '원주공장관리팀', '010-2299-4851', 'jinbong.kim@tongyanginc.co.kr', '101349@tongyanginc.co.kr', true, '101349')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김진봉', role = 'owner', department = '원주공장관리팀',
      phone = '010-2299-4851', contact_email = 'jinbong.kim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

