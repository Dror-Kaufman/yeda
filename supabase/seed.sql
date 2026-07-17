-- Yeda Seed Data
-- Test users: admin, teacher, student
-- Passwords: password123 for all test users

-- ============================================================
-- Helper to insert a user + identity in one step
-- ============================================================
DO $$
DECLARE
  admin_id UUID;
  teacher_id UUID;
  student_id UUID;
  unapproved_student_id UUID;
BEGIN
  -- Admin user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_current, email_change_token_new,
    reauthentication_token,
    email_change, phone_change, phone_change_token,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated',
    'admin@yeda.com',
    crypt('password123', gen_salt('bf', 10)),
    now(), '', '', '', '', '',
    '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('display_name', 'Admin User', 'role', 'admin'),
    now(), now()
  )
  RETURNING id INTO admin_id;

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'admin@yeda.com', admin_id,
    jsonb_build_object('sub', admin_id, 'email', 'admin@yeda.com', 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- Teacher user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_current, email_change_token_new,
    reauthentication_token,
    email_change, phone_change, phone_change_token,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated',
    'teacher@yeda.com',
    crypt('password123', gen_salt('bf', 10)),
    now(), '', '', '', '', '',
    '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('display_name', 'Teacher User', 'role', 'teacher'),
    now(), now()
  )
  RETURNING id INTO teacher_id;

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'teacher@yeda.com', teacher_id,
    jsonb_build_object('sub', teacher_id, 'email', 'teacher@yeda.com', 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- Student user (pending approval)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_current, email_change_token_new,
    reauthentication_token,
    email_change, phone_change, phone_change_token,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated',
    'student@yeda.com',
    crypt('password123', gen_salt('bf', 10)),
    now(), '', '', '', '', '',
    '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('display_name', 'Student User', 'role', 'student'),
    now(), now()
  )
  RETURNING id INTO student_id;

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'student@yeda.com', student_id,
    jsonb_build_object('sub', student_id, 'email', 'student@yeda.com', 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- Unapproved student user (stays pending_approval)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_current, email_change_token_new,
    reauthentication_token,
    email_change, phone_change, phone_change_token,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated',
    'unapproved_student@yeda.com',
    crypt('password123', gen_salt('bf', 10)),
    now(), '', '', '', '', '',
    '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('display_name', 'Unapproved Student', 'role', 'student'),
    now(), now()
  )
  RETURNING id INTO unapproved_student_id;

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'unapproved_student@yeda.com', unapproved_student_id,
    jsonb_build_object('sub', unapproved_student_id, 'email', 'unapproved_student@yeda.com', 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  -- Approve admin + teacher (students stay pending_approval)
  UPDATE public.profiles SET status = 'active'
  WHERE id IN (admin_id, teacher_id);
END $$;

-- ============================================================
-- Sample grades
-- ============================================================
INSERT INTO public.grades (name, display_order) VALUES
  ('10th Grade', 1),
  ('11th Grade', 2),
  ('12th Grade', 3)
ON CONFLICT ON CONSTRAINT grades_name_unique DO NOTHING;

-- ============================================================
-- Sample content data (subjects, topics, questions, materials)
-- ============================================================
DO $$
DECLARE
  v_teacher_id UUID;
  v_tenth_grade_id UUID;
  v_math_id UUID;
  v_quadratic_id UUID;
  v_linear_id UUID;
BEGIN
  -- Lookup teacher user by email
  SELECT id INTO v_teacher_id FROM auth.users WHERE email = 'teacher@yeda.com';

  -- Lookup grade
  SELECT id INTO v_tenth_grade_id FROM public.grades WHERE name = '10th Grade';

  -- Insert subjects under 10th Grade
  INSERT INTO public.subjects (grade_id, name, display_order) VALUES
    (v_tenth_grade_id, 'Mathematics', 1),
    (v_tenth_grade_id, 'Physics', 2),
    (v_tenth_grade_id, 'Chemistry', 3),
    (v_tenth_grade_id, 'English', 4);

  -- Lookup subject IDs
  SELECT id INTO v_math_id FROM public.subjects
    WHERE grade_id = v_tenth_grade_id AND name = 'Mathematics';

  -- Insert topics under Mathematics
  INSERT INTO public.topics (subject_id, name, created_by) VALUES
    (v_math_id, 'Quadratic Equations', v_teacher_id),
    (v_math_id, 'Linear Functions', v_teacher_id);

  -- Lookup topic IDs
  SELECT id INTO v_quadratic_id FROM public.topics
    WHERE subject_id = v_math_id AND name = 'Quadratic Equations';
  SELECT id INTO v_linear_id FROM public.topics
    WHERE subject_id = v_math_id AND name = 'Linear Functions';

  -- Insert published questions under Quadratic Equations
  INSERT INTO public.questions (topic_id, question_text, options, correct_index, hint, explanation, status, created_by) VALUES
    (
      v_quadratic_id,
      'What is the standard form of a quadratic equation?',
      ARRAY['ax² + bx + c = 0', 'ax + b = 0', 'ax³ + bx² + cx + d = 0', 'a / b = c / d'],
      0,
      'Think about the highest power of the variable.',
      'A quadratic equation has degree 2, meaning the highest power of x is 2. The standard form is ax² + bx + c = 0 where a ≠ 0.',
      'published',
      v_teacher_id
    ),
    (
      v_quadratic_id,
      'In the quadratic formula x = [-b ± √(b² - 4ac)] / 2a, what is the discriminant?',
      ARRAY['b² - 4ac', 'b² + 4ac', '√(b² - 4ac)', '2a'],
      0,
      'The expression under the square root sign.',
      'The discriminant is b² - 4ac. It determines the nature of the roots: if positive → 2 real roots, if zero → 1 real root, if negative → no real roots.',
      'published',
      v_teacher_id
    ),
    (
      v_quadratic_id,
      'How many real roots does the equation x² + 1 = 0 have?',
      ARRAY['0', '1', '2', 'Infinite'],
      0,
      'Consider what x² must equal for this equation to hold.',
      'x² = -1 has no real solution since a square cannot be negative in the real numbers. The roots are imaginary: x = i and x = -i.',
      'published',
      v_teacher_id
    );

  -- Insert sample study material
  INSERT INTO public.study_materials (topic_id, title, description, google_docs_url, created_by) VALUES
    (
      v_quadratic_id,
      'Quadratic Equations Study Guide',
      'Comprehensive guide covering factoring, completing the square, and the quadratic formula.',
      'https://docs.google.com/document/d/example-quadratic-equations/edit',
      v_teacher_id
    );
END $$;
-- OmO_SeEdInG_fLaG
