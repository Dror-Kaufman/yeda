# Yeda — Phase 1 Implementation Plan

> **Scope**: Core web platform: manual MCQ management, Google Docs study materials,
> Grade→Subject→Topic navigation, basic file manager, email/password auth,
> English UI, LaTeX support, minimal tracking.

---

## Dependency Graph

```
Wave 0: Project Scaffold
  │
  └──► Wave 1: Data Layer Design (parallel)
         ├── Block B1: DB Schema + RLS + Seed
         ├── Block B2: MCQ JSON Schema Specification
         └── Block B3: LLM Prompt Template
  │
  └──► Wave 2: Auth Implementation (depends on B1)
  │      ├── Sign-up with role selection
  │      ├── Sign-in/sign-out
  │      ├── Admin approval flows
  │      └── Stack.Protected auth gate
  │
  └──► Wave 3: Content Management (depends on B1, parallel with Wave 2)
  │      ├── File Manager UI (Grade→Subject→Topic tree)
  │      ├── Folder CRUD operations
  │      └── Google Docs study material link management
  │
  └──► Wave 4: MCQ Pipeline + Player (depends on B1 + B2)
         ├── MCQ paste → parse → preview → publish flow
         ├── Exercise mode (hints, explanations)
         ├── Exam mode (timed, scored, no hints)
         ├── Study mode (Google Docs inline rendering)
         └── Score tracking (minimal Phase 1)
```

---

## Wave 0 — Project Scaffold (sequential)

**Goal**: Working dev environment with Expo + Supabase running.

| # | Task | Description | Agent |
|---|------|-------------|-------|
| 0.1 | Create Expo app | `npx create-expo-app` with TypeScript template, install deps (`expo-router`, `@supabase/supabase-js`, etc.) | `deep` |
| 0.2 | Init Supabase | `supabase init`, configure `config.toml` with project_id = "yeda" and non-conflicting ports (Helpie uses defaults; we use e.g. 54331/54332/54333) | `deep` |
| 0.3 | Create directory structure | `supabase/` (schema.sql, seed.sql, migrations/, functions/), `mobile/src/` (app, components, constants, utils), `docs/`, `.omo/` | `quick` |
| 0.4 | Setup Expo Router layout | Root `_layout.tsx` with Stack, tabs layout for authenticated area, placeholder screens | `visual-engineering` |
| 0.5 | Write seed.sql | Auth users for all 3 roles (admin, teacher, student) with bcrypt hashes, profiles table entries, content seed data | `deep` |
| 0.6 | Smoke test | `supabase start`, curl auth smoke test, confirm Expo web dev server renders | `quick` |

**Outputs**: Running `npx expo start --web` + `supabase start`, both green.

---

## Wave 1 — Data Layer Design (3 blocks in parallel)

### Block B1: DB Schema + RLS + Seed

**Goal**: Full PostgreSQL schema for Phase 1 content model.

Tables to define:

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata (role: admin/teacher/student, status: active/pending_approval, display_name) |
| `grades` | e.g., 10th, 11th, 12th grade |
| `subjects` | e.g., Mathematics, Physics, Chemistry, English |
| `topics` | e.g., Quadratic Equations, Newton's Laws |
| `study_materials` | Google Docs embed URLs per topic |
| `questions` | MCQs stored as JSON (question, options[], correctIndex, hint, explanation, topic_id) |
| `exam_attempts` | Student exam results (user_id, topic_id, score, answers, completed_at) |

**RLS**: Row-level security for each table — admins see all, teachers see their own content, students see published content.

**Seed**: 1 admin, 1 teacher, 1 student + sample grade/subject/topic/question data.

| # | Task | Agent |
|---|------|-------|
| B1.1 | Design tables, relationships, constraints, indexes | `oracle` (consultation) |
| B1.2 | Write `supabase/schema.sql` with DDL + RLS | `deep` |
| B1.3 | Write `supabase/migrations/YYYYMMDDHHMMSS_schema.sql` | `quick` |
| B1.4 | Write `supabase/seed.sql` with test data | `deep` |
| B1.5 | Generate TypeScript types from DB | `quick` |

### Block B2: MCQ JSON Schema Specification

**Goal**: Precise, validated JSON schema for MCQs — the data contract between the LLM prompt and the platform.

Define:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `question` | string | Yes | Supports LaTeX delimiters (`$$...$$` or `\(...\)`) |
| `options` | string[4] | Yes | Exactly 4 items, each may contain LaTeX |
| `correctIndex` | integer | Yes | 0–3, validated against array bounds |
| `hint` | string | No | Max 500 chars, LaTeX allowed, shown before answering in Exercise mode |
| `explanation` | string | No | Max 2000 chars, LaTeX allowed, shown after answering |
| `topic` | string | No | Optional tag for organization |

| # | Task | Agent |
|---|------|-------|
| B2.1 | Define JSON Schema (Zod schema for runtime validation) | `deep` |
| B2.2 | Write MCQ schema validation utility (`utils/mcq-schema.ts`) | `deep` |
| B2.3 | Define Zod error messages in Hebrew/English | `deep` |

### Block B3: LLM Prompt Template

**Goal**: The prompt teachers copy-paste into ChatGPT/Claude/etc. to generate structured MCQs.

**Output**: A markdown document `docs/llm-prompt-template.md` with:
- The exact prompt text teachers use
- Example input/output
- Known edge cases and how the LLM should handle LaTeX
- Instructions for generating exactly 4 options with one correct

| # | Task | Agent |
|---|------|-------|
| B3.1 | Write LLM prompt template | `writing` |
| B3.2 | Test with sample subject matter (e.g., "generate 5 questions on quadratic equations") | `librarian` |
| B3.3 | Iterate prompt based on output quality | `writing` |

---

## Wave 2 — Auth Implementation (depends on B1)

**Goal**: Full auth flow with role-based approval.

| # | Task | Description | Agent | Depends on |
|---|------|-------------|-------|------------|
| 2.1 | Auth provider setup | Configure Supabase client, session management, auth context hook | `unspecified-high` | B1 (profiles table) |
| 2.2 | Sign-up screen | Email + password + role selection (teacher/student), creates profile with pending status | `visual-engineering` | 2.1 |
| 2.3 | Sign-in screen | Email + password, checks approval status, redirects based on role | `visual-engineering` | 2.1 |
| 2.4 | Auth gate | `Stack.Protected` wrapper, redirects unauthenticated users, prevents unapproved students | `unspecified-high` | 2.1 |
| 2.5 | Admin approval screens | List pending teachers + students, approve/reject buttons | `visual-engineering` | B1 |
| 2.6 | Teacher pending screen | Show pending students list for teacher approval | `visual-engineering` | B1 |
| 2.7 | Password reset | Supabase Auth built-in, wire "Forgot password" link | `unspecified-high` | 2.1 |
| 2.8 | Auth smoke tests | curl tests for sign-up, sign-in, rejected login for unapproved users | `quick` | 2.2, 2.3 |

---

## Wave 3 — Content Management (depends on B1, parallel with Wave 2)

**Goal**: File Manager UI for teachers to organize content in Grade→Subject→Topic hierarchy.

| # | Task | Description | Agent | Depends on |
|---|------|-------------|-------|------------|
| 3.1 | Grade selection screen | Grid/list of grades from DB | `visual-engineering` | B1 (grades table) |
| 3.2 | Subject selection screen | Subjects within selected grade | `visual-engineering` | 3.1 |
| 3.3 | Topic list screen | Topics within selected subject, shows study materials + MCQ bank count | `visual-engineering` | 3.2 |
| 3.4 | Topic detail screen (teacher) | Add/edit Google Docs link, manage MCQ bank | `visual-engineering` | B1 |
| 3.5 | Add/rename/delete hierarchy | CRUD for grades, subjects, topics (teacher + admin only) | `unspecified-high` | B1 |
| 3.6 | RLS verification | Confirm teachers can only edit their content, students read-only | `quick` | B1 |

---

## Wave 4 — MCQ Pipeline + Player (depends on B1 + B2)

**Goal**: Full MCQ lifecycle — teacher publishes, student exercises and takes exams.

| # | Task | Description | Agent | Depends on |
|---|------|-------------|-------|------------|
| 4.1 | MCQ paste screen | Teacher pastes LLM JSON output → parse → validate against Zod schema | `visual-engineering` | B2 (Zod schema) |
| 4.2 | MCQ preview + edit | List parsed questions, edit/delete individual questions before publishing | `visual-engineering` | 4.1 |
| 4.3 | Publish MCQ bank | Transactional insert into `questions` table, mark topic as having live MCQs | `unspecified-high` | B1 + 4.2 |
| 4.4 | Exercise mode | Random question draw, hint before answering, explanation after, no timer, no score | `visual-engineering` | B1 + B2 |
| 4.5 | Exam mode | Teacher-configured time limit + question count, no hints during exam, score + explanations on submit | `visual-engineering` | B1 + B2 |
| 4.6 | Study mode | Inline Google Docs rendering via iframe, reading-only | `visual-engineering` | B1 |
| 4.7 | Score tracking | `exam_attempts` insert on exam submit, display past results | `unspecified-high` | B1 |
| 4.8 | LaTeX rendering | Integrate KaTeX on web, verify math renders correctly in questions/options/hints/explanations | `visual-engineering` | 4.4, 4.5 |

---

## Parallelization Strategy

```
Time ──────────────────────────────────────────────────────────►

Wave 0 [sequential, ~1 session]
  │
Wave 1 [3 agents in parallel]
  ├── B1: DB Schema ─────────────────►
  ├── B2: MCQ Schema ───────────────►
  └── B3: LLM Prompt ──────────────►
  │
  ▼ (B1 must complete before Wave 2 & 3)
  │
Wave 2 (Auth) ────► ────► ────►    (parallel with Wave 3)
Wave 3 (Content) ──► ────► ────►    (parallel with Wave 2)
  │
  ▼ (B1 + B2 must complete before Wave 4)
  │
Wave 4 (MCQ) ─────► ────► ────► ────►
```

---

## Execution Model

Each work item is delegated to a `deep` or `visual-engineering` agent running in the current session (not separate sessions), so orchestration context is preserved. After each wave completes, QA gates run:
1. **LSP diagnostics** on changed files
2. **Build check** (`npx tsc --noEmit` or Expo build)
3. **Smoke test** (curl or Playwright)

Final wave includes a **Momus review** (plan critic) before declaring Phase 1 complete.

---

## Estimated Waves

| Wave | Items | Dependencies | Parallelizable |
|------|-------|-------------|----------------|
| 0 — Scaffold | 6 | None | Mostly sequential (toolchain setup) |
| 1 — Data Layer | 11 | Wave 0 | 3 blocks fully parallel |
| 2 — Auth | 8 | B1 | Sequential within wave |
| 3 — Content | 6 | B1 | Parallel with Wave 2 |
| 4 — MCQ | 8 | B1 + B2 | Mostly sequential within wave |
