Read `docs/requirements.md`, `docs/session-20260717-wave4-complete.md`, and `docs/session-20260721-rls-tightening.md` first.

**Status**: Wave 4 complete + RLS tightened for content tables.

### What's Built (cumulative)
- Expo app scaffolded with Expo Router, Supabase client, auth context
- Full DB schema (profiles, grades, subjects, topics, study_materials, questions, exam_attempts) with RLS
- Auth flow: sign-up, sign-in (blocks pending/rejected), admin/teacher approval screens
- Content Management: grade/subject/topic CRUD, Browse Content
- MCQ paste → publish pipeline (Zod validation, preview, edit/delete, batch publish)
- **Exercise mode**: count picker → questions with hints/explanations
- **Exam mode**: count + time picker → timed session → score + review
- **Study mode**: material list → Google Docs iframe viewer
- **Add Material screen**: teacher form to add study materials per topic
- **Inline confirmation dialogs**: ConfirmDialog replacing Alert.alert everywhere
- **Exam history**: past attempt list with expandable question review
- **LaTeX rendering**: LatexText component parsing $...$ / $$...$$ via KaTeX
- **Grade/Subject count displays**: Grade cards show subject count, subject cards show topic count
- 25 Jest unit tests — all passing
- 14 Playwright E2E tests — all passing, all self-cleaning
- 5 seed users: admin/teacher/student/unapproved_student@yeda.com (password123)

### RLS Security Posture
- All 6 app tables have RLS enabled
- Questions: students see published only, teachers see own, admins see all
- Exam attempts: students see own, teachers see attempts on their topics, admins see all
- Profiles: users see own, teachers see students, admins see all
- Grades/subjects/topics/study_materials: **authenticated users only** (no longer world-readable)
- Last migration: `20260721000006_rls_authenticated_select.sql`

### Suggested Next Steps (Phase 2)
1. **Google OAuth** — add social login option alongside email/password
2. **Full progress tracking** — per-question history, progress bars per topic
3. **AI-powered MCQ generation** — generate questions from raw text uploads
4. **Hebrew / RTL support** — full right-to-left layout for Hebrew users
5. **File manager enhancements** — drag-drop, search, grid/list view for study materials

### Keep In Mind
- **Alert.alert is a silent no-op on web** — don't use it. Use inline state-driven confirmation dialogs (ConfirmDialog).
- **Alert.prompt is iOS-only** — use showPrompt() from src/utils/prompt.ts.
- **No dangerouslySetInnerHTML prop on RN View** — use the ref-based HtmlView pattern from LatexText.tsx.
- **CSS imports need type decl** — declare module '*.css' {} in a .d.ts file.
- **Expo Router deep nested routes** — each nested route must have its own Stack.Screen entry.
- **Seed data subjects can get wiped** — re-run seed via docker exec if Browse Content shows empty.
- **Safe back navigation** — All back buttons use useSafeBack(fallback) from src/utils/useSafeBack.ts.
- **E2E tests must clean up after themselves** — use afterAll with docker exec psql or SERVICE_ROLE_KEY.
- **Service role key bypasses RLS** — use for test cleanup, especially auth.users.
- **Dedicated seed user for edge cases** — unapproved_student@yeda.com is the canonical pending-approval user.
- **RLS changes via docker exec** — supabase stop && start doesn't re-apply migration policy changes. Use `docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "..."` for live changes.
- **Auth.role() = 'authenticated'** — use this pattern for restricting SELECT to logged-in users only.
- **World-readable tables were tightened** — grades, subjects, topics, study_materials now require authentication.

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
