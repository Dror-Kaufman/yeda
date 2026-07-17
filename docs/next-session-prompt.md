Read `docs/session-20260716-scaffold.md`, `docs/session-20260716-auth.md`, `docs/session-20260717-content-management.md`, `docs/session-20260717-mcq-pipeline.md`, and `docs/requirements.md` first.

Waves 0-3 + Wave 4 items 1-3 are complete. The project has:
- Expo app scaffolded with Expo Router, Supabase client, auth context
- Full DB schema (profiles, grades, subjects, topics, study_materials, questions, exam_attempts)
- Auth flow: sign-up (with role selection), sign-in (blocks pending/rejected), admin/teacher approval screens
- Content Management: grade/subject/topic screens with CRUD, Browse Content link on home
- `showPrompt()` utility replacing iOS-only `Alert.prompt` (web-safe)
- RLS on all tables using `auth.jwt()` (not table subqueries — avoids PG15 recursion)
- Grades UNIQUE constraint on name (seed deduped)
- 25 Jest unit tests (prompt utility + MCQ schema validation) — all passing
- 12 Playwright E2E tests (7 auth + 3 CRUD + 2 MCQ paste) — all passing (1 pre-existing flaky: content-crud cancel dialog)
- 3 seed users: admin/teacher/student@yeda.com (password123), student is `pending_approval`
- **MCQ paste → publish pipeline**: Manage Questions screen + Paste MCQ Bank screen with Zod validation, preview, inline edit/delete, batch publish
- **Seed data subjects were wiped at some point** — if subjects/topics don't show on the Browse Content chain, re-run the seed SQL via docker exec (see `supabase/seed.sql`)

### Next Session — Suggested Starting Point

**Wave 4 remaining (items 4-8):**
1. ~~MCQ paste screen — Teacher pastes LLM JSON output → parse → validate against Zod schema~~ ✅
2. ~~MCQ preview + edit — List parsed questions, edit/delete individual questions before publishing~~ ✅
3. ~~Publish MCQ bank — Transactional insert into `questions` table~~ ✅
4. **Exercise mode** — Random question draw, hint before answering, explanation after, no timer, no score
5. **Exam mode** — Time limit + question count, no hints during exam, score + explanations on submit
6. **Study mode** — Inline Google Docs rendering via iframe
7. **Score tracking** — `exam_attempts` insert on exam submit, display past results
8. **LaTeX rendering** — Integrate KaTeX on web, verify math renders correctly

### What's Already Done (don't redo)
- **RLS**: All policies use `auth.jwt() -> 'user_metadata' ->> 'role'` — no table subqueries, no recursion risk
- **Seed users**: GoTrue bcrypt with `$2a$` prefix (via `crypt()`), all identities + metadata fields set
- **Auth context**: `signIn()` blocks pending/rejected users, `sessionReady` ref prevents racy redirects
- **E2E tests**: Use UUID-based targeting for approval tests, avoid `select=email` on profiles table
- **Ports**: Custom ports 54331-54337 (not Supabase defaults)
- **Questions**: Normalized columns (not JSONB), CHECKing options array_length=4, correct_index 0-3
- **Zod schemas**: `mcq-schema.ts` has validation for question, options, correctIndex, hint, explanation — fully unit-tested
- **CRUD pattern**: All screens use `showPrompt()` (not `Alert.prompt`) for text input
- **Grades UNIQUE**: `UNIQUE(name)` enforced at DB level, seed deduped
- **Jest setup**: 25 unit tests covering prompt utility + MCQ schema validation
- **Prompt mocking in E2E**: Use `page.evaluate(() => window.prompt = () => 'text')` — Playwright has no native prompt API
- **MCQ paste pipeline**: Manage Questions screen + Paste/MCQ Bank screen exist at `topic/[topicId]/manage-questions/`

### Gotchas From This Session
- **`Alert.alert` is a silent no-op on react-native-web**: Use inline state for errors/confirmations, not `Alert.alert`. The existing screens (grades/subjects/topics) have non-functional delete confirmations because of this.
- **Seed data subjects can get wiped**: If the Browse Content chain shows no subjects under a grade, re-insert seed data via `docker exec`.

### To Start Dev Environment
```bash
cd ~/workspace/yeda && supabase start
cd mobile && npx expo start --web
```

### Running Tests
```bash
# Unit tests
cd mobile && npm test

# E2E tests (supabase + expo dev server must be running)
cd mobile && PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --config=playwright.config.ts
```
