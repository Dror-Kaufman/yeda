# Session 2026-07-17 — Wave 4 Complete + E2E Fixes

## What Was Done

### Wave 4 Remaining Items
1. **Add Material screen** — `topic/[topicId]/add-material/index.tsx`: Teacher form with title/description/URL fields, inserts into `study_materials`. Route registered in `(app)/_layout.tsx`.
2. **Replace `Alert.alert` with inline UI** — Created `components/ui/ConfirmDialog.tsx`. Purged `Alert.alert` from all 6 screens: grades index, grades detail, topics, manage-questions, admin approvals, teacher pending.
3. **Exam results history** — `topic/[topicId]/exam/history.tsx`: Lists past attempts per topic with expandable question review. Route registered, link wired on exam intro screen.
4. **E2E tests for learning modes** — `learning-modes.spec.ts` (402 lines): Covers Study (material list + viewer), Exercise (complete question flow), and Exam (timer, all questions, results review).

### E2E Bug Fixes
1. **Blocks pending student test flaky** — `student@yeda.com` was already `active` in DB from test artifacts. Added `unapproved_student@yeda.com` to seed data and changed test to use it. This user is never touched by other tests.
2. **Exercise mode timeout** — mcq-paste's cleanup used teacher JWT + RLS which silently failed, letting 11 E2E questions accumulate. Fixed: mcq-paste `afterAll` uses `SERVICE_ROLE_KEY` (bypasses RLS). Also reduced wait times in exercise loop.
3. **Added cleanup to all E2E tests** — `auth.spec.ts` and `learning-modes.spec.ts` now clean up test-created auth users via `docker exec psql` in `afterAll`. mcq-paste uses `SERVICE_ROLE_KEY`.

### Final Test Results
- **14/14 E2E tests pass** — 0 flaky, 0 failures
- **25/25 Jest unit tests pass**

## Key Decisions
- Used `SERVICE_ROLE_KEY` for test cleanup instead of teacher JWT — RLS policies can silently reject deletes
- Used `docker exec psql` for `auth.users` cleanup — not exposed via REST API
- Dedicated seed user `unapproved_student@yeda.com` for pending-approval tests
- Unique email patterns with `Date.now()` for all test-created users

## State
- Wave 4 fully complete
- DB has orphan cleanup handled in test `afterAll` hooks
- Seed data includes 5 users: admin, teacher, student, unapproved_student, plus sample grades/subjects/topics/questions/materials
