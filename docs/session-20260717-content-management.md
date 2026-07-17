# Session: Wave 3 — Content Management + Jest Unit Tests (2026-07-17)

## What Was Built

### Wave 3 — Content Management Screens (5 new routes)

**Grade Selection** — `mobile/src/app/(app)/grades/index.tsx`
- Fetches grades from Supabase, sorted alphabetically (all roles)
- "Add Grade" button visible to teachers/admins — prompts via `showPrompt()`
- Long-press (teacher/admin) shows rename/delete options via `showPrompt()`
- Tap navigates to subjects within that grade

**Subject Selection** — `mobile/src/app/(app)/grades/[gradeId]/index.tsx`
- Fetches subjects for a given grade via FK filter
- "Add Subject" + long-press rename/delete for teachers/admins
- Tap navigates to topic list for that subject

**Topic List** — `mobile/src/app/(app)/topics/[subjectId]/index.tsx`
- Fetches topics within a subject, shows inline study_materials count + MCQ count
- "Add Topic" + long-press rename/delete for teachers/admins
- Tap navigates to topic detail

**Topic Detail** — `mobile/src/app/(app)/topic/[topicId]/index.tsx`
- Fetches topic with study material links
- Teachers/admins: add/edit/delete Google Docs links, manage MCQ bank placeholder
- Students: placeholder "Study/Exercise/Exam mode coming soon"
- Shows: topic name, study material list, study/exercise/exam mode cards (non-functional for Phase 1)

**Home Screen Update** — `mobile/src/app/(app)/index.tsx`
- Added "Browse Content" link navigating to grade selection

### CRUD Operations (Add/Rename/Delete)

All 6 operations (add/rename/delete for grades, subjects, topics) implemented via:

- **`showPrompt()` utility** (`src/utils/prompt.ts`) — wraps `window.prompt` in `setTimeout(0)` for Playwright compatibility, replaces all 6 `Alert.prompt` calls across 3 screens
- Non-web platforms log a warning instead of crashing
- All operations call Supabase REST endpoints with proper RLS

### Supabase Schema Changes

**Grades RLS policies** — added INSERT/UPDATE/DELETE policies for admins on `public.profiles`:
- Migration: `supabase/migrations/20260716000004_grades_rls.sql`
- Applied via `docker exec` (not `supabase stop/start` — doesn't re-apply migrations)

**Grades UNIQUE constraint** — `UNIQUE(name)` on grades table:
- Migration: `supabase/migrations/20260717000005_grades_unique.sql`
- Required deduplicating seed data first (seed had "10th Grade" twice)

**`seed.sql` idempotency** — grade inserts now use `ON CONFLICT DO NOTHING`

### E2E Tests — `content-crud.spec.ts`

3 new Playwright tests (teacher role):
1. Teacher can see grade list
2. Teacher can add a grade via prompt → confirmed in list
3. Teacher can cancel the prompt → no grade added

**afterAll cleanup**: Deletes `E2E-Grade-%` rows to leave DB clean.
**Total tests**: 10 passing (7 auth + 3 CRUD)

### Bug Triage Session

User discovered UI issues in the running app after Wave 3:
- **[Critical] `Alert.prompt` crash on react-native-web** — `Alert.prompt` is iOS-only, crashes on web with "undefined is not a function". Fixed by replacing all 6 call sites with `showPrompt()` utility
- **E2E `page.prompt()` doesn't exist** — Playwright has no built-in prompt mocking. Fixed by evaluating `window.prompt = () => 'text'` before triggering prompt actions
- **[Cosmetic] "No pending approvals" on profile fetch** — Actually a display issue from auth screen sign-out with pending teachers in the list
- **[Cosmetic] Pending student cannot sign up with same email** — Expected behavior (Supabase Auth checks for existing email)

Root cause analysis: All bugs were E2E gaps — no test covered the teacher CRUD flow or prompt input. Added E2E tests as a result.

### Jest Unit Tests (new test infrastructure)

**Jest setup** (`jest.config.js`, `babel.config.js`):
- `jest-expo` preset with `jest-environment-node` (not jsdom — conflicts with RN preset's `window` redefinition)
- Babel config using `babel-preset-expo`

**MCQ Schema tests** (`src/utils/__tests__/mcq-schema.test.ts`) — 20 tests:
- 5 schema-level validation tests (valid/invalid questions, options array validation, correctIndex bounds)
- 7 `parseMCQJson` tests (valid JSON, empty JSON, malformed, missing fields, partial)
- 5 `validateQuestion` tests (valid, missing options, wrong correctIndex, empty hint/explanation)
- 3 `formatValidationErrors` tests (single error, multiple errors, empty)

**Prompt utility tests** (`src/utils/__tests__/prompt.test.ts`) — 5 tests:
- Calls `window.prompt` on web
- Passes defaultValue
- Cancelled prompt (null) doesn't call callback
- Sync callback doesn't crash
- Non-web platforms log warning

**Gotcha fixed**: `jest.spyOn(Platform, 'OS', 'get')` fails in Node env (OS is a plain string, not a getter). Use `Object.defineProperty(Platform, 'OS', { get: () => ..., configurable: true })` instead.

## Key Decisions
- **`showPrompt()` over Alert.prompt**: `Alert.prompt` is iOS-only and doesn't exist on Android or react-native-web. The utility wraps `window.prompt` in `setTimeout(0)` for Playwright compatibility, and logs a warning on non-web platforms.
- **Grades UNIQUE name**: Prevents duplicate grade names at the DB level. Seed deduped to match.
- **Unit tests in Node env (not jsdom)**: `jest-expo` includes `@react-native/jest-preset` which redefines `window`, conflicting with jsdom. All window-dependent mocking is done manually via `Object.defineProperty(globalThis, 'window', ...)`.
- **E2E prompt mocking**: Since Playwright has no `page.prompt()`, prompt dialogs are mocked before trigger via `page.evaluate(() => window.prompt = ...)` and restored after.

## Gotchas Discovered
- **`Alert.prompt` is iOS-only**: crashes on react-native-web and Android.
- **`jest.spyOn(Platform, 'OS', 'get')` fails in Node env**: only works in RN preset (jsdom) where `OS` is a getter.
- **`jest-expo` + jsdom conflict**: RN preset's setup.js redefines `window` (already set by jsdom), causing "Cannot redefine property: window".
- **Playwright `page.prompt` doesn't exist**: must mock via `page.evaluate()`.
- **Grades need UNIQUE constraint**: But existing seed data may have duplicates, requiring cleanup first.
- **`supabase stop && start` doesn't re-apply migrations**: already documented, but worth noting you must use `docker exec` for policy changes too.

## Files Created/Modified

### New Files
- `mobile/src/app/(app)/grades/index.tsx` — grade selection screen
- `mobile/src/app/(app)/grades/[gradeId]/index.tsx` — subject selection screen
- `mobile/src/app/(app)/topics/[subjectId]/index.tsx` — topic list screen
- `mobile/src/app/(app)/topic/[topicId]/index.tsx` — topic detail screen
- `mobile/src/utils/prompt.ts` — cross-platform prompt utility
- `mobile/src/utils/__tests__/mcq-schema.test.ts` — 20 MCQ unit tests
- `mobile/src/utils/__tests__/prompt.test.ts` — 5 prompt unit tests
- `mobile/src/e2e/content-crud.spec.ts` — CRUD E2E tests with cleanup
- `mobile/jest.config.js` — Jest configuration
- `mobile/babel.config.js` — Babel config for Jest
- `supabase/migrations/20260716000004_grades_rls.sql` — grades RLS write policies
- `supabase/migrations/20260717000005_grades_unique.sql` — grades UNIQUE constraint

### Modified Files
- `mobile/src/app/(app)/_layout.tsx` — added screen routes for grades/topics/topic
- `mobile/src/app/(app)/index.tsx` — added "Browse Content" link
- `mobile/package.json` — added Jest devDependencies + test scripts
- `supabase/seed.sql` — idempotent grade inserts

## Test Results
- **Unit tests**: 25/25 passing (Jest, ~1s)
- **E2E tests**: 10/10 passing (7 auth + 3 CRUD, Playwright)
- **Curl smoke tests**: 10/10 passing (from prior session)

## Running Tests
```bash
# Unit tests
cd mobile && npm test

# E2E tests (requires supabase start + expo dev server)
cd mobile && PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --config=playwright.config.ts

# Curl smoke tests
# (from bash, requires supabase start)
```
