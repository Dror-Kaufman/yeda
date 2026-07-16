-- Migration: Additional RLS policies for profiles table
-- Admins need to read all profiles (for approval flows)
-- Teachers need to read student profiles (for approving students)
-- Both roles need to update profile status

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (is_admin());

-- Teachers can read student profiles
DROP POLICY IF EXISTS "Teachers can read student profiles" ON public.profiles;
CREATE POLICY "Teachers can read student profiles" ON public.profiles
  FOR SELECT USING (
    is_admin_or_teacher() AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'teacher')
      AND p.status = 'active'
    )
  );

-- Admins can update any profile status
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (is_admin());

-- Teachers can update student profiles (approve/reject)
DROP POLICY IF EXISTS "Teachers can update student profiles" ON public.profiles;
CREATE POLICY "Teachers can update student profiles" ON public.profiles
  FOR UPDATE USING (
    is_admin_or_teacher() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'teacher' AND
    (SELECT role FROM public.profiles WHERE id = profiles.id) = 'student'
  );
