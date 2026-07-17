-- Migration: Add UNIQUE constraint on grades.name
-- Prevents duplicate grade entries when seed is applied multiple times.

-- Remove duplicate rows keeping the row with the smallest id for each name
DELETE FROM public.grades g1 USING public.grades g2
WHERE g1.name = g2.name AND g1.id > g2.id;

-- Add unique constraint
ALTER TABLE public.grades ADD CONSTRAINT grades_name_unique UNIQUE (name);
