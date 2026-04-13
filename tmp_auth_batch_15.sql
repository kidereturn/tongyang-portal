DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101953@tongyanginc.co.kr';
  
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
      '101953@tongyanginc.co.kr',
      crypt('101953', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김윤기'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101953', '김윤기', 'owner', '골재사업소서부산크라샤공정팀', '010-6309-2756', 'ykkim@tongyanginc.co.kr', '101953@tongyanginc.co.kr', true, '101953')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김윤기', role = 'owner', department = '골재사업소서부산크라샤공정팀',
      phone = '010-6309-2756', contact_email = 'ykkim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101954@tongyanginc.co.kr';
  
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
      '101954@tongyanginc.co.kr',
      crypt('101954', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이해창'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101954', '이해창', 'owner', '골재사업소서부산크라샤공정팀', '010-4045-4715', 'hclee@tongyanginc.co.kr', '101954@tongyanginc.co.kr', true, '101954')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이해창', role = 'owner', department = '골재사업소서부산크라샤공정팀',
      phone = '010-4045-4715', contact_email = 'hclee@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101955@tongyanginc.co.kr';
  
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
      '101955@tongyanginc.co.kr',
      crypt('101955', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이소형'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101955', '이소형', 'owner', '인사팀', '010-8331-3653', 'shl@tongyanginc.co.kr', '101955@tongyanginc.co.kr', true, '101955')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이소형', role = 'owner', department = '인사팀',
      phone = '010-8331-3653', contact_email = 'shl@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101956@tongyanginc.co.kr';
  
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
      '101956@tongyanginc.co.kr',
      crypt('101956', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김진용'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101956', '김진용', 'owner', '환경안전팀', '010-4355-5332', 'jykim@eugenes.co.kr', '101956@tongyanginc.co.kr', true, '101956')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김진용', role = 'owner', department = '환경안전팀',
      phone = '010-4355-5332', contact_email = 'jykim@eugenes.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101957@tongyanginc.co.kr';
  
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
      '101957@tongyanginc.co.kr',
      crypt('101957', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '조승범'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101957', '조승범', 'owner', '개발운영팀', '010-6312-0302', 'cho@tongyanginc.co.kr', '101957@tongyanginc.co.kr', true, '101957')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '조승범', role = 'owner', department = '개발운영팀',
      phone = '010-6312-0302', contact_email = 'cho@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101958@tongyanginc.co.kr';
  
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
      '101958@tongyanginc.co.kr',
      crypt('101958', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김진수'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101958', '김진수', 'owner', '개발운영팀', '010-6292-6979', 'Kimjs4521@tongyanginc.co.kr', '101958@tongyanginc.co.kr', true, '101958')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김진수', role = 'owner', department = '개발운영팀',
      phone = '010-6292-6979', contact_email = 'Kimjs4521@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101959@tongyanginc.co.kr';
  
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
      '101959@tongyanginc.co.kr',
      crypt('101959', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최세운'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101959', '최세운', 'owner', '개발운영팀', '010-6516-0729', 'seawoon@tongyanginc.co.kr', '101959@tongyanginc.co.kr', true, '101959')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최세운', role = 'owner', department = '개발운영팀',
      phone = '010-6516-0729', contact_email = 'seawoon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101960@tongyanginc.co.kr';
  
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
      '101960@tongyanginc.co.kr',
      crypt('101960', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '강상현'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101960', '강상현', 'owner', '개발사업팀', '010-6295-5759', 'kangsanghyeon@tongyanginc.co.kr', '101960@tongyanginc.co.kr', true, '101960')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '강상현', role = 'owner', department = '개발사업팀',
      phone = '010-6295-5759', contact_email = 'kangsanghyeon@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101961@tongyanginc.co.kr';
  
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
      '101961@tongyanginc.co.kr',
      crypt('101961', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '오세중'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101961', '오세중', 'owner', '개발사업팀', '010-5629-3326', 'se3326@tongyanginc.co.kr', '101961@tongyanginc.co.kr', true, '101961')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '오세중', role = 'owner', department = '개발사업팀',
      phone = '010-5629-3326', contact_email = 'se3326@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101962@tongyanginc.co.kr';
  
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
      '101962@tongyanginc.co.kr',
      crypt('101962', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이시윤'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101962', '이시윤', 'owner', '양산공장공정팀', '010-8559-9450', 'sylee1@tongyanginc.co.kr', '101962@tongyanginc.co.kr', true, '101962')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이시윤', role = 'owner', department = '양산공장공정팀',
      phone = '010-8559-9450', contact_email = 'sylee1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101963@tongyanginc.co.kr';
  
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
      '101963@tongyanginc.co.kr',
      crypt('101963', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '홍정수'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101963', '홍정수', 'owner', '부산공장영업팀', '010-3151-3805', 'jshong@tongyanginc.co.kr', '101963@tongyanginc.co.kr', true, '101963')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '홍정수', role = 'owner', department = '부산공장영업팀',
      phone = '010-3151-3805', contact_email = 'jshong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101965@tongyanginc.co.kr';
  
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
      '101965@tongyanginc.co.kr',
      crypt('101965', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '문병민'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101965', '문병민', 'owner', '일산수질복원센터 시설개량사업 [1단계](토목, 건축, 기계분야)', '010-8487-2123', 'mbm@tongyanginc.co.kr', '101965@tongyanginc.co.kr', true, '101965')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '문병민', role = 'owner', department = '일산수질복원센터 시설개량사업 [1단계](토목, 건축, 기계분야)',
      phone = '010-8487-2123', contact_email = 'mbm@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101966@tongyanginc.co.kr';
  
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
      '101966@tongyanginc.co.kr',
      crypt('101966', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '장소영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101966', '장소영', 'owner', '개발운영팀', '010-3634-7434', 'jsy1@tongyanginc.co.kr', '101966@tongyanginc.co.kr', true, '101966')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '장소영', role = 'owner', department = '개발운영팀',
      phone = '010-3634-7434', contact_email = 'jsy1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101968@tongyanginc.co.kr';
  
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
      '101968@tongyanginc.co.kr',
      crypt('101968', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김지연'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101968', '김지연', 'owner', '보령발전본부 저탄장 옥내화사업 토목공사', '010-9803-3572', 'kjy@tongyanginc.co.kr', '101968@tongyanginc.co.kr', true, '101968')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김지연', role = 'owner', department = '보령발전본부 저탄장 옥내화사업 토목공사',
      phone = '010-9803-3572', contact_email = 'kjy@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101971@tongyanginc.co.kr';
  
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
      '101971@tongyanginc.co.kr',
      crypt('101971', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '송윤정'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101971', '송윤정', 'owner', 'P.I TFT', '010-9428-8397', 'yjsong@tongyanginc.co.kr', '101971@tongyanginc.co.kr', true, '101971')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '송윤정', role = 'owner', department = 'P.I TFT',
      phone = '010-9428-8397', contact_email = 'yjsong@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101972@tongyanginc.co.kr';
  
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
      '101972@tongyanginc.co.kr',
      crypt('101972', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이호선'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101972', '이호선', 'owner', '인천공장공정팀', '010-3683-5719', 'hslee1@tongyanginc.co.kr', '101972@tongyanginc.co.kr', true, '101972')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이호선', role = 'owner', department = '인천공장공정팀',
      phone = '010-3683-5719', contact_email = 'hslee1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101973@tongyanginc.co.kr';
  
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
      '101973@tongyanginc.co.kr',
      crypt('101973', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '박시환'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101973', '박시환', 'owner', '자금팀', '010-5227-8860', 'shpark@tongyanginc.co.kr', '101973@tongyanginc.co.kr', true, '101973')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '박시환', role = 'owner', department = '자금팀',
      phone = '010-5227-8860', contact_email = 'shpark@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101974@tongyanginc.co.kr';
  
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
      '101974@tongyanginc.co.kr',
      crypt('101974', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '최종현'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101974', '최종현', 'owner', '내부회계팀', '010-5234-9212', 'jhchoi1@tongyanginc.co.kr', '101974@tongyanginc.co.kr', true, '101974')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '최종현', role = 'owner', department = '내부회계팀',
      phone = '010-5234-9212', contact_email = 'jhchoi1@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101975@tongyanginc.co.kr';
  
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
      '101975@tongyanginc.co.kr',
      crypt('101975', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김상국'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101975', '김상국', 'owner', '파주공장공정팀', '010-5154-1922', 'kimsk@tongyanginc.co.kr', '101975@tongyanginc.co.kr', true, '101975')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김상국', role = 'owner', department = '파주공장공정팀',
      phone = '010-5154-1922', contact_email = 'kimsk@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101976@tongyanginc.co.kr';
  
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
      '101976@tongyanginc.co.kr',
      crypt('101976', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '임상혁'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101976', '임상혁', 'owner', '아산공장공정팀', '010-6638-0727', 'shim@tongyanginc.co.kr', '101976@tongyanginc.co.kr', true, '101976')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '임상혁', role = 'owner', department = '아산공장공정팀',
      phone = '010-6638-0727', contact_email = 'shim@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101977@tongyanginc.co.kr';
  
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
      '101977@tongyanginc.co.kr',
      crypt('101977', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '장원웅'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101977', '장원웅', 'owner', '원주공장공정팀', '010-5372-3942', 'wwjang@tongyanginc.co.kr', '101977@tongyanginc.co.kr', true, '101977')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '장원웅', role = 'owner', department = '원주공장공정팀',
      phone = '010-5372-3942', contact_email = 'wwjang@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101978@tongyanginc.co.kr';
  
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
      '101978@tongyanginc.co.kr',
      crypt('101978', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '이동희'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101978', '이동희', 'owner', '창원공장공정팀', '010-8206-5449', 'leedh@tongyanginc.co.kr', '101978@tongyanginc.co.kr', true, '101978')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '이동희', role = 'owner', department = '창원공장공정팀',
      phone = '010-8206-5449', contact_email = 'leedh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101980@tongyanginc.co.kr';
  
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
      '101980@tongyanginc.co.kr',
      crypt('101980', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '남윤호'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101980', '남윤호', 'owner', '부산공장품질관리실', '010-6693-1431', 'nyh@tongyanginc.co.kr', '101980@tongyanginc.co.kr', true, '101980')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '남윤호', role = 'owner', department = '부산공장품질관리실',
      phone = '010-6693-1431', contact_email = 'nyh@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101981@tongyanginc.co.kr';
  
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
      '101981@tongyanginc.co.kr',
      crypt('101981', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김성용'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101981', '김성용', 'owner', '정관공장', '010-5453-8353', 'ksy8353@tongyanginc.co.kr', '101981@tongyanginc.co.kr', true, '101981')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김성용', role = 'owner', department = '정관공장',
      phone = '010-5453-8353', contact_email = 'ksy8353@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '101982@tongyanginc.co.kr';
  
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
      '101982@tongyanginc.co.kr',
      crypt('101982', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '정해종'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '101982', '정해종', 'owner', '원주공장품질관리실', '010-5313-5470', 'junghj@tongyanginc.co.kr', '101982@tongyanginc.co.kr', true, '101982')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '정해종', role = 'owner', department = '원주공장품질관리실',
      phone = '010-5313-5470', contact_email = 'junghj@tongyanginc.co.kr', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Check if auth user exists
  SELECT id INTO v_uid FROM auth.users WHERE email = '109980@tongyanginc.co.kr';
  
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
      '109980@tongyanginc.co.kr',
      crypt('109980', gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', '김휘영'),
      now(), now(), '', '', '', '', '', ''
    ) RETURNING id INTO v_uid;
    
    -- Create profile
    INSERT INTO profiles (id, employee_id, full_name, role, department, phone, contact_email, email, is_active, initial_password)
    VALUES (v_uid, '109980', '김휘영', 'owner', '아산공장관리팀', '', '', '109980@tongyanginc.co.kr', true, '109980')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
      phone = EXCLUDED.phone, contact_email = EXCLUDED.contact_email, is_active = true;
  ELSE
    -- Update existing profile
    UPDATE profiles SET
      full_name = '김휘영', role = 'owner', department = '아산공장관리팀',
      phone = '', contact_email = '', is_active = true
    WHERE id = v_uid;
  END IF;
END
$$;
