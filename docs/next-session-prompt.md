Read `docs/session-20260716-scaffold.md` and `docs/requirements.md` first.

Waves 0 and 1 are complete. The project has:
- Expo app scaffolded and running
- Supabase initialized with custom ports (54331-54337)
- Full DB schema (subjects, topics, study_materials, questions, exam_attempts) with RLS
- Seed data (3 users, grades, subjects, topics, questions)
- MCQ Zod validation utility in `mobile/src/utils/mcq-schema.ts`
- LLM prompt template for teachers in `docs/llm-prompt-template.md`

### Next Session — Suggested Starting Point

Wave 2 (Auth UI) can begin immediately since the DB schema is in place:

**Wave 2 — Auth Implementation (8 tasks)**
1. **Auth provider setup** — Supabase client, session management context hook in `mobile/src/utils/supabase.ts`
2. **Sign-up screen** — email + password + role selection (teacher/student), creates profile with pending status
3. **Sign-in screen** — email + password, checks approval status, redirects by role
4. **Auth gate** — `Stack.Protected` wrapper for authenticated routes
5. **Admin approval screens** — list pending teachers + students, approve/reject
6. **Teacher pending screen** — show pending students for teacher approval
7. **Password reset** — wire "Forgot password" link to Supabase Auth built-in
8. **Auth smoke tests** — curl + Playwright E2E

See `.omo/plans/phase1-plan.md` for the full Wave 2-4 breakdown.

### What Not to Redo
- All DB schema decisions were Oracle-reviewed and are production-ready for Phase 1
- The seed.sql is correct (includes identities, raw_app_meta_data, instance_id, etc.)
- Ports are custom (54331-54337) — don't try default ports

### To Start Dev Environment
```bash
cd ~/workspace/yeda
supabase start          # DB + Auth on custom ports
cd mobile && npx expo start --web   # Expo dev server
```
