-- Migration: Content Tables for Yeda
-- Phase 1: subjects, topics, study_materials, questions, exam_attempts
-- Depends on: 20260716000001_profiles.sql (profiles + grades tables)

-- ============================================================
-- Helper functions for RLS policies
-- ============================================================

-- Check if the current user is an admin or active teacher
CREATE OR REPLACE FUNCTION public.is_admin_or_teacher()
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher')
    AND status = 'active'
  );
END;
$$;

-- Check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$;

-- ============================================================
-- subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can read subjects
DROP POLICY IF EXISTS "Everyone can read subjects" ON public.subjects;
CREATE POLICY "Everyone can read subjects" ON public.subjects
  FOR SELECT USING (true);

-- Admins and teachers can insert subjects
DROP POLICY IF EXISTS "Admins and teachers can insert subjects" ON public.subjects;
CREATE POLICY "Admins and teachers can insert subjects" ON public.subjects
  FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Admins and teachers can update subjects
DROP POLICY IF EXISTS "Admins and teachers can update subjects" ON public.subjects;
CREATE POLICY "Admins and teachers can update subjects" ON public.subjects
  FOR UPDATE USING (is_admin_or_teacher());

-- Admins and teachers can delete subjects
DROP POLICY IF EXISTS "Admins and teachers can delete subjects" ON public.subjects;
CREATE POLICY "Admins and teachers can delete subjects" ON public.subjects
  FOR DELETE USING (is_admin_or_teacher());

-- ============================================================
-- topics
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Everyone can read topics
DROP POLICY IF EXISTS "Everyone can read topics" ON public.topics;
CREATE POLICY "Everyone can read topics" ON public.topics
  FOR SELECT USING (true);

-- Admins and teachers can insert topics
DROP POLICY IF EXISTS "Admins and teachers can insert topics" ON public.topics;
CREATE POLICY "Admins and teachers can insert topics" ON public.topics
  FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Teachers can update own topics, admins can update any
DROP POLICY IF EXISTS "Teachers can update own topics" ON public.topics;
CREATE POLICY "Teachers can update own topics" ON public.topics
  FOR UPDATE USING (is_admin_or_teacher() AND (created_by = auth.uid() OR is_admin()));

-- Teachers can delete own topics, admins can delete any
DROP POLICY IF EXISTS "Teachers can delete own topics" ON public.topics;
CREATE POLICY "Teachers can delete own topics" ON public.topics
  FOR DELETE USING (is_admin_or_teacher() AND (created_by = auth.uid() OR is_admin()));

-- ============================================================
-- study_materials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  google_docs_url TEXT NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Everyone can read study materials
DROP POLICY IF EXISTS "Everyone can read study materials" ON public.study_materials;
CREATE POLICY "Everyone can read study materials" ON public.study_materials
  FOR SELECT USING (true);

-- Admins and teachers can insert study materials
DROP POLICY IF EXISTS "Admins and teachers can insert study materials" ON public.study_materials;
CREATE POLICY "Admins and teachers can insert study materials" ON public.study_materials
  FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Teachers can update own study materials, admins can update any
DROP POLICY IF EXISTS "Teachers can update own study materials" ON public.study_materials;
CREATE POLICY "Teachers can update own study materials" ON public.study_materials
  FOR UPDATE USING (is_admin_or_teacher() AND (created_by = auth.uid() OR is_admin()));

-- Teachers can delete own study materials, admins can delete any
DROP POLICY IF EXISTS "Teachers can delete own study materials" ON public.study_materials;
CREATE POLICY "Teachers can delete own study materials" ON public.study_materials
  FOR DELETE USING (is_admin_or_teacher() AND (created_by = auth.uid() OR is_admin()));

-- ============================================================
-- questions (THE KEY TABLE — MCQ storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  hint TEXT,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT options_length CHECK (array_length(options, 1) = 4)
);

-- Index for student queries filtering by topic and status
DROP INDEX IF EXISTS idx_questions_topic_status;
CREATE INDEX idx_questions_topic_status ON public.questions (topic_id, status);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Admins can read all questions
DROP POLICY IF EXISTS "Admins can read all questions" ON public.questions;
CREATE POLICY "Admins can read all questions" ON public.questions
  FOR SELECT USING (is_admin());

-- Teachers can read their own questions
DROP POLICY IF EXISTS "Teachers can read own questions" ON public.questions;
CREATE POLICY "Teachers can read own questions" ON public.questions
  FOR SELECT USING (is_admin_or_teacher() AND created_by = auth.uid());

-- Students (and anyone else) can read published questions
DROP POLICY IF EXISTS "Students can read published questions" ON public.questions;
CREATE POLICY "Students can read published questions" ON public.questions
  FOR SELECT USING (status = 'published');

-- Admins and teachers can insert questions
DROP POLICY IF EXISTS "Admins and teachers can insert questions" ON public.questions;
CREATE POLICY "Admins and teachers can insert questions" ON public.questions
  FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Teachers can update their own questions
DROP POLICY IF EXISTS "Teachers can update own questions" ON public.questions;
CREATE POLICY "Teachers can update own questions" ON public.questions
  FOR UPDATE USING (created_by = auth.uid() AND is_admin_or_teacher())
  WITH CHECK (created_by = auth.uid());

-- Admins can update all questions
DROP POLICY IF EXISTS "Admins can update all questions" ON public.questions;
CREATE POLICY "Admins can update all questions" ON public.questions
  FOR UPDATE USING (is_admin());

-- Teachers can delete their own questions
DROP POLICY IF EXISTS "Teachers can delete own questions" ON public.questions;
CREATE POLICY "Teachers can delete own questions" ON public.questions
  FOR DELETE USING (created_by = auth.uid() AND is_admin_or_teacher());

-- Admins can delete all questions
DROP POLICY IF EXISTS "Admins can delete all questions" ON public.questions;
CREATE POLICY "Admins can delete all questions" ON public.questions
  FOR DELETE USING (is_admin());

-- ============================================================
-- exam_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Students can insert their own attempts
DROP POLICY IF EXISTS "Students can insert own attempts" ON public.exam_attempts;
CREATE POLICY "Students can insert own attempts" ON public.exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Students can update their own attempts (to submit answers)
DROP POLICY IF EXISTS "Students can update own attempts" ON public.exam_attempts;
CREATE POLICY "Students can update own attempts" ON public.exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Students can read their own attempts
DROP POLICY IF EXISTS "Students can read own attempts" ON public.exam_attempts;
CREATE POLICY "Students can read own attempts" ON public.exam_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Teachers can read attempts for their own topics
DROP POLICY IF EXISTS "Teachers can read attempts for own topics" ON public.exam_attempts;
CREATE POLICY "Teachers can read attempts for own topics" ON public.exam_attempts
  FOR SELECT USING (
    is_admin_or_teacher() AND EXISTS (
      SELECT 1 FROM public.topics t
      WHERE t.id = topic_id AND t.created_by = auth.uid()
    )
  );

-- Admins can read all attempts
DROP POLICY IF EXISTS "Admins can read all attempts" ON public.exam_attempts;
CREATE POLICY "Admins can read all attempts" ON public.exam_attempts
  FOR SELECT USING (is_admin());
