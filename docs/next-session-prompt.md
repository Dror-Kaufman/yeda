Read `docs/session-20260716-scaffold.md`, `docs/session-20260716-auth.md`, `docs/session-20260717-content-management.md`, `docs/session-20260717-mcq-pipeline.md`, `docs/session-20260717-wave4.md`, `docs/session-20260717-wave4-complete.md`, `docs/session-20260717-back-navigation.md`, and `docs/requirements.md` first.

**Wave 4 is complete.** All 4 learning modes plus all gap items done:

| Mode | Status | Details |
|------|--------|---------|
| **Exercise** | ✅ | Random questions, hints before answering, explanations after, no timer/score |
| **Exam** | ✅ | Timer, question count picker, no hints during exam, score + explanations on submit |
| **Study** | ✅ | Google Docs inline via iframe, material list + viewer screens |
| **LaTeX** | ✅ | KaTeX on web via `<LatexText>` component, CSS imported globally |

### What's Built (cumulative)
- Expo app scaffolded with Expo Router, Supabase client, auth context
- Full DB schema (profiles, grades, subjects, topics, study_materials, questions, exam_attempts)
- Auth flow: sign-up, sign-in (blocks pending/rejected), admin/teacher approval screens
- Content Management: grade/subject/topic CRUD, Browse Content
- MCQ paste → publish pipeline (Zod validation, preview, edit/delete, batch publish)
- **Exercise mode**: count picker → questions with hints/explanations
- **Exam mode**: count + time picker → timed session → score + review
- **Study mode**: material list → Google Docs iframe viewer
- **Add Material screen**: teacher form to add study materials per topic
- **Inline confirmation dialogs**: `ConfirmDialog` component replacing `Alert.alert` everywhere
- **Exam history**: past attempt list with expandable question review
- **LaTeX rendering**: `<LatexText>` component parsing $...$ / $$...$$ via KaTeX
- 25 Jest unit tests — all passing
- 14 Playwright E2E tests — all passing, all self-cleaning
- 5 seed users: admin/teacher/student/unapproved_student@yeda.com (password123)

### Suggested Next Steps (Phase 2)

1. **Google OAuth** — add social login option alongside email/password
2. **Full progress tracking** — per-question history, progress bars per topic
3. **AI-powered MCQ generation** — generate questions from raw text uploads
4. **Hebrew / RTL support** — full right-to-left layout for Hebrew users
5. **File manager enhancements** — drag-drop, search, grid/list view for study materials

### Keep In Mind
- **`Alert.alert` is a silent no-op on web** — don't use it for any new UI. Use inline state-driven confirmation dialogs (`ConfirmDialog`).
- **`Alert.prompt` is iOS-only** — use `showPrompt()` from `src/utils/prompt.ts`.
- **No `dangerouslySetInnerHTML` prop on RN View** — use the ref-based `HtmlView` pattern from `LatexText.tsx` instead.
- **CSS imports need type decl** — `declare module '*.css' {}` in a `.d.ts` file.
- **Expo Router deep nested routes** — each nested route (e.g., `exercise/session`) must have its own `Stack.Screen` entry in the layout.
- **Seed data subjects can get wiped** — re-run seed via docker exec if Browse Content shows empty.
- **Safe back navigation** — All back buttons use `useSafeBack(fallback)` from `src/utils/useSafeBack.ts` instead of bare `router.back()`. For any new screen with a back button, import and use `useSafeBack` with an appropriate fallback route.
- **E2E tests must clean up after themselves** — use `afterAll` with `docker exec psql` or `SERVICE_ROLE_KEY`. See AGENTS.md for pattern.
- **Service role key bypasses RLS** — use for test cleanup, especially `auth.users` which isn't exposed via REST API.
- **Dedicated seed user for edge cases** — `unapproved_student@yeda.com` is the canonical pending-approval user; don't use `student@yeda.com` for that.

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
