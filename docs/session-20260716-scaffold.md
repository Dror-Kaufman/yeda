# Session: Project Scaffold + Data Layer (2026-07-16)

## What Was Built

### Wave 0 — Project Scaffold
- **Expo app** (SDK 57, TypeScript) in `mobile/` — Expo Router file-based routing
- **Supabase** initialized with custom ports (54331-54337) to avoid conflict with Helpie
- **Expo Router layout** — `src/app/_layout.tsx` with Stack navigator, `index.tsx` placeholder
- **Theme constants** — `src/constants/theme.ts` (colors, spacing, typography)
- **Seed data** — 3 users (admin@yeda.com, teacher@yeda.com, student@yeda.com / password123) with profiles, identities, sample grades
- **Supabase running** on ports 54331 (API), 54332 (DB), 54333 (Studio), 54334 (Mailpit)

### Wave 1 — Data Layer (3 parallel blocks)

**B1 — DB Schema (`supabase/migrations/20260716000002_content_tables.sql`)**
- Tables: `subjects`, `topics`, `study_materials`, `questions`, `exam_attempts`
- RLS on all tables with `SECURITY DEFINER` helpers (`is_admin()`, `is_admin_or_teacher()`)
- Questions: normalized columns (not JSONB), CHECK constraints for options (array_length=4), correct_index (0-3), status (draft/published)
- Ownership via `created_by` (no team/sharing in Phase 1)

**B2 — MCQ Zod Schema (`mobile/src/utils/mcq-schema.ts`)**
- TypeScript interfaces + Zod schemas for MCQ validation
- `parseMCQJson()` — parses LLM output JSON, validates against schema
- `validateQuestion()` / `formatValidationErrors()` helpers

**B3 — LLM Prompt Template (`docs/llm-prompt-template.md`)**
- Copy-paste prompt for teachers to generate MCQs via ChatGPT/Claude
- 112 lines with JSON schema, LaTeX guidance, example I/O

## Key Decisions
- **Questions stored as normalized columns** (not JSONB) — DB-level type safety with CHECK constraints
- **Separate tables** for study_materials and questions (no polymorphic content_items)
- **Per-topic exam_attempts** (not per-subject)
- **`created_by` ownership** only — no team/sharing infrastructure
- **Status field** (draft/published) on questions for the publish flow

## Seed Data Gotcha
Seed users need 5 things to authenticate that aren't obvious:
1. `instance_id = '00000000-0000-0000-0000-000000000000'`
2. `aud = 'authenticated'`
3. `role = 'authenticated'`
4. `raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))`
5. Corresponding row in `auth.identities`

All documented in `AGENTS.md`.

## Files Created/Modified
- `AGENTS.md` — project conventions, gotchas, commands
- `docs/requirements.md` (pre-existing)
- `docs/llm-prompt-template.md` — teacher-facing prompt
- `docs/session-20260716-scaffold.md` — this file
- `docs/next-session-prompt.md` — handoff
- `mobile/` — entire Expo app (src/app, src/constants, src/utils, package.json, etc.)
- `supabase/` — config.toml (custom ports), 2 migrations, seed.sql
- `.omo/plans/phase1-plan.md` — work plan

## Running Services
- Supabase Studio: http://127.0.0.1:54333
- Expo Dev: http://localhost:8081
- Supabase API: http://127.0.0.1:54331
- Auth login: admin@yeda.com / password123
