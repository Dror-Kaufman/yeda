-- Migration: Restrict SELECT on public content tables to authenticated users only
-- Previously world-readable (USING true) — now only logged-in users can read

-- Grades
DROP POLICY IF EXISTS "Everyone can read grades" ON public.grades;
CREATE POLICY "Authenticated users can read grades" ON public.grades
  FOR SELECT USING (auth.role() = 'authenticated');

-- Subjects
DROP POLICY IF EXISTS "Everyone can read subjects" ON public.subjects;
CREATE POLICY "Authenticated users can read subjects" ON public.subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Topics
DROP POLICY IF EXISTS "Everyone can read topics" ON public.topics;
CREATE POLICY "Authenticated users can read topics" ON public.topics
  FOR SELECT USING (auth.role() = 'authenticated');

-- Study materials
DROP POLICY IF EXISTS "Everyone can read study materials" ON public.study_materials;
CREATE POLICY "Authenticated users can read study materials" ON public.study_materials
  FOR SELECT USING (auth.role() = 'authenticated');
