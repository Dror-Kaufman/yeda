Session: Requirements Gathering (2026-07-16)

What was built:
- docs/requirements.md — complete requirements document for Yeda (learning platform)

Key Decisions:
- Framework: Expo (React Native) + react-native-web for cross-platform web + future native
- Backend: Supabase (PostgreSQL, Auth, Storage, RLS)
- File Manager UX: Custom-built (basic Phase 1, full Phase 2)
- Authorization: Profiles table with role column + Supabase RLS
- Content Model: Fully normalized (grades -> subjects -> topics -> questions)
- Modes: Study (Google Docs reading), Exercise (MCQ with hints + explanations), Exam (MCQ timed, no hints)
- Study Material: Google Docs share link embed
- Auth: Email/password Phase 1, Google OAuth Phase 2
- MCQ Creation: Teacher uses external LLM with our prompt, pastes structured output -> parse -> preview -> edit -> publish
- Progress Tracking: Minimal Phase 1 (exam scores), Full Phase 2
- Language: English Phase 1, Hebrew + RTL Phase 2
- Registration: Open sign-up, admin approves teachers, teachers/admins approve students
- Deployment: Supabase free tier for Phase 1
- Phase 3 Migration: LaTeX and Google Docs use WebView on native

Key File:
- docs/requirements.md (sole artifact, 188 lines)
