# Session 2026-07-21 — RLS Tightening + Count Displays

## What Was Built

### 1. Count displays on cards
- **Grade list** (`grades/index.tsx`): Each grade card now shows `Subjects: X` below the grade name, using `select('*, subjects(count)')`
- **Subject list** (`grades/[gradeId]/index.tsx`): Each subject item now shows `Topics: X` below the subject name, using `select('*, topics(count)')`
- Both follow the same pattern as topic cards showing Materials/Questions counts

### 2. RLS tightened — from world-readable to authenticated-only
- **Migration**: `20260721000006_rls_authenticated_select.sql`
- Changed `FOR SELECT USING (true)` → `FOR SELECT USING (auth.role() = 'authenticated')` on:
  - `grades`
  - `subjects`
  - `topics`
  - `study_materials`
- Anonymous (no JWT) requests now get empty results from these tables

### RLS Review Conclusion
All 6 app tables have RLS enabled with properly scoped policies:
- Write operations restricted by role (admin, teacher) everywhere
- Questions table: students see only published, teachers see own, admins see all
- Exam attempts: students see own, teachers see attempts on their topics, admins see all
- Profiles: users see own, teachers see students, admins see all
- Content structure (grades/subjects/topics/study_materials): now authenticated-only
- All helper functions use SECURITY DEFINER (required to bypass RLS on profiles)

## Committed
- Count displays on grade cards (Subjects: X) and subject cards (Topics: X)
- RLS migration restricting 4 content tables to authenticated users only
- Verified via curl smoke tests (anonymous → empty, authenticated → data)
