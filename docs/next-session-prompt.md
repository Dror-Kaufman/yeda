Read `docs/session-20260716-scaffold.md`, `docs/session-20260716-auth.md`, `docs/session-20260717-content-management.md`, and `docs/requirements.md` first.

Waves 0-3 are complete. The project has:
- Expo app scaffolded with Expo Router, Supabase client, auth context
- Full DB schema (profiles, grades, subjects, topics, study_materials, questions, exam_attempts)
- Auth flow: sign-up (with role selection), sign-in (blocks pending/rejected), admin/teacher approval screens
- Content Management: grade/subject/topic screens with CRUD, Browse Content link on home
- `showPrompt()` utility replacing iOS-only `Alert.prompt` (web-safe)
- RLS on all tables using `auth.jwt()` (not table subqueries — avoids PG15 recursion)
- Grades UNIQUE constraint on name (seed deduped)
- 10 Playwright E2E tests (7 auth + 3 CRUD) + 10 curl smoke tests + 25 Jest unit tests — all passing
- 3 seed users: admin/teacher/student@yeda.com (password123), student is `pending_approval`

### Next Session — Suggested Starting Point

**Wave 4 — MCQ Pipeline + Player** (depends on B1 + B2 — both done):
1. **MCQ paste screen** — Teacher pastes LLM JSON output → parse → validate against Zod schema
2. **MCQ preview + edit** — List parsed questions, edit/delete individual questions before publishing
3. **Publish MCQ bank** — Transactional insert into `questions` table
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
