-- Migration: Grades RLS policies for INSERT/UPDATE/DELETE
-- The initial grades migration only added a SELECT policy.
-- Admins need write access to manage grade entries.

-- Admins can insert grades
DROP POLICY IF EXISTS "Admins can insert grades" ON public.grades;
CREATE POLICY "Admins can insert grades" ON public.grades
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update grades
DROP POLICY IF EXISTS "Admins can update grades" ON public.grades;
CREATE POLICY "Admins can update grades" ON public.grades
  FOR UPDATE USING (public.is_admin());

-- Admins can delete grades
DROP POLICY IF EXISTS "Admins can delete grades" ON public.grades;
CREATE POLICY "Admins can delete grades" ON public.grades
  FOR DELETE USING (public.is_admin());
