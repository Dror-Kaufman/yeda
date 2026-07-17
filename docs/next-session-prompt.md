Read `docs/session-20260716-scaffold.md`, `docs/session-20260716-auth.md`, `docs/session-20260717-content-management.md`, `docs/session-20260717-mcq-pipeline.md`, `docs/session-20260717-wave4.md`, and `docs/requirements.md` first.

**Wave 4 is complete.** The project now has all 4 learning modes:

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
- **LaTeX rendering**: `<LatexText>` component parsing $...$ / $$...$$ via KaTeX
- 25 Jest unit tests — all passing
- 12 Playwright E2E tests — all passing (1 pre-existing flaky: content-crud cancel dialog)
- 3 seed users: admin/teacher/student@yeda.com (password123), student is `pending_approval`

### Suggested Next Steps

**Polish / Gap Items:**
1. **Add Material screen** — teacher UI to add study materials (title + Google Docs URL) per topic. Currently the "Add Material" button shows "Coming in Wave 4".
2. **E2E tests for Exercise/Exam/Study modes** — the new screens have no Playwright coverage. Test navigation, question answering, timer behavior, and results display.
3. **Replace `Alert.alert` with inline UI** — `Alert.alert` is a silent no-op on react-native-web. The delete confirmations in grades/subjects/topics screens are broken. Use inline confirmation state instead.
4. **Exam results history** — list past exam attempts per topic so students can review their history.

**Phase 2 items (next major wave):**
5. **Add Material screen** — teachers upload study materials (Google Docs URL + title + description)
6. **Google OAuth** — add social login option
7. **Full progress tracking** — per-question history, progress bars per topic
8. **AI-powered MCQ generation** — generate questions from raw text uploads
9. **Hebrew / RTL support**
10. **File manager enhancements** — drag-drop, search, grid/list view

### Keep In Mind
- **`Alert.alert` is a silent no-op on web** — don't use it for any new UI. Use inline state-driven confirmation dialogs.
- **`Alert.prompt` is iOS-only** — use `showPrompt()` from `src/utils/prompt.ts`.
- **No `dangerouslySetInnerHTML` prop on RN View** — use the ref-based `HtmlView` pattern from `LatexText.tsx` instead.
- **CSS imports need type decl** — `declare module '*.css' {}` in a `.d.ts` file.
- **Expo Router deep nested routes** — each nested route (e.g., `exercise/session`) must have its own `Stack.Screen` entry in the layout.
- **Seed data subjects can get wiped** — re-run seed via docker exec if Browse Content shows empty.

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
