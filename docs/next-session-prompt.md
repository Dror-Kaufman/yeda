Read `docs/session-20260716-scaffold.md` and `docs/session-20260716-auth.md` and `docs/requirements.md` first.

Waves 0-2 are complete. The project has:
- Expo app scaffolded with Expo Router, Supabase client, auth context
- Full DB schema (profiles, grades, subjects, topics, study_materials, questions, exam_attempts)
- Auth flow: sign-up (with role selection), sign-in (blocks pending/rejected), admin/teacher approval screens
- RLS on all tables using `auth.jwt()` (not table subqueries — avoids PG15 recursion)
- 7 Playwright E2E tests + 10 curl smoke tests — all passing
- 3 seed users: admin/teacher/student@yeda.com (password123), student is `pending_approval`

### Next Session — Suggested Starting Point

Wave 3 or Wave 4 depending on priority:

**Wave 3 — Content Management** (depends on B1 schema, parallel-able with Wave 2)
1. Grade selection screen
2. Subject selection within grade
3. Topic list (showing study materials + MCQ bank count)
4. Topic detail (teacher: add/edit Google Docs link, manage MCQs)
5. CRUD for grades/subjects/topics (teacher + admin only)
6. RLS verification

**Wave 4 — MCQ Pipeline + Player** (depends on B1 + B2)
1. MCQ paste → parse → preview → publish flow
2. Exercise mode (hints, explanations, no timer)
3. Exam mode (timed, scored, no hints)
4. Study mode (Google Docs via iframe/WebView)
5. Score tracking
6. LaTeX rendering (KaTeX on web, WebView on native)

See `.omo/plans/phase1-plan.md` for the full Wave 3-4 breakdown.

### What's Already Done (don't redo)
- **RLS**: All policies use `auth.jwt() -> 'user_metadata' ->> 'role'` — no table subqueries, no recursion risk
- **Seed users**: GoTrue bcrypt with `$2a$` prefix (via `crypt()`), all identities + metadata fields set
- **Auth context**: `signIn()` blocks pending/rejected users, `sessionReady` ref prevents racy redirects
- **E2E tests**: Use UUID-based targeting for approval tests, avoid `select=email` on profiles table
- **Ports**: Custom ports 54331-54337 (not Supabase defaults)
- **Questions**: Normalized columns (not JSONB), CHECKing options array_length=4, correct_index 0-3

### To Start Dev Environment
```bash
cd ~/workspace/yeda && supabase start
cd mobile && npx expo start --web
```
