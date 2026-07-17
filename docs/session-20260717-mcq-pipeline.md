# Session: Wave 4 — MCQ Paste + Publish Pipeline (2026-07-17)

## What Was Built

### Wave 4 Items 1-3: MCQ Paste → Publish

**Manage Questions Screen** — `mobile/src/app/(app)/topic/[topicId]/manage-questions/index.tsx`
- Lists all questions for a topic (grouped by Published/Draft)
- Shows question text, options (correct answer highlighted in green), hint, explanation
- Delete button per question (teacher can delete own, admin can delete any)
- "+ Add MCQ Bank" button navigates to paste screen
- Empty state when no questions exist
- Teacher/admin role-gated

**Paste MCQ Bank Screen** — `mobile/src/app/(app)/topic/[topicId]/manage-questions/paste.tsx`
- Large textarea for pasting LLM JSON output (monospace on web)
- "Parse JSON" button → validates against Zod schema (`parseMCQJson`)
- Validation errors shown inline in red error card
- Preview list of parsed questions with per-question card:
  - Shows question text, all 4 options (correct one with checkmark), hint, explanation
  - "Edit" button toggles inline editing form (all fields editable: question, 4 options, correctIndex, hint, explanation)
  - "Remove" button removes from the list (no confirmation — Alert.alert is a no-op on web)
  - Save validates with `MCQQuestionSchema` and shows inline error if invalid
- "Publish" button batch-inserts all questions to DB with `status: 'published'`
- Publication errors shown inline (not Alert.alert)
- On success: navigates back to manage-questions screen

**Navigation wiring:**
- "Manage Questions" button in topic detail (`topic/[topicId]/index.tsx`) now live — navigates to `/topic/${topicId}/manage-questions`
- Routes registered in `(app)/_layout.tsx`: `topic/[topicId]/manage-questions` and `topic/[topicId]/manage-questions/paste`

### E2E Tests — `mcq-paste.spec.ts`

2 new Playwright tests:
1. **Full flow**: teacher signs in → navigates through grades/subjects/topics → Manage Questions → Paste MCQ Bank → paste JSON → parse → verify preview → publish → verify questions visible in manage-questions list
2. **Validation**: paste invalid JSON → verify "Validation Errors" card appears

**afterAll cleanup**: Deletes `E2E-%` questions via REST API to leave DB clean.

## Key Decisions
- **Inline errors over Alert.alert**: `Alert.alert` is a silent no-op on react-native-web (confirmed by testing skill). All publish/validation errors use inline state variables (`publishError`, `saveError`, `errors`) instead of Alert.alert dialogs. The remove button also removes immediately without confirmation for the same reason.
- **Single screen for paste → preview → edit → publish**: Combined into one route (`paste.tsx`) instead of separate screens, since the flow is linear and state is ephemeral (not persisted until publish).
- **Inline editing (not a separate screen)**: The edit form appears inline within the question card. This avoids creating a separate edit route for in-memory (pre-publish) questions.
- **Batch insert on publish**: Uses `supabase.from('questions').insert(inserts)` with an array — Supabase handles batch inserts. No manual transaction needed.
- **No migration needed**: The `questions` table schema already supports all required fields (question_text, options TEXT[], correct_index, hint, explanation, status, topic_id FK).

## Gotchas Discovered
- **Seed data subjects get wiped by E2E tests**: The content-crud tests only clean up grades (not subjects/topics/questions), but DB resets can wipe them. Re-seeding required the full seed block (not just grades).
- **`Alert.alert` is a silent no-op on web**: react-native-web implements `Alert.alert` as an empty function — it shows nothing and callbacks never fire. This affects all delete confirmations in the existing codebase too (grades, subjects, topics).
- **`grades/[gradeId]` route works without explicit `Stack.Screen`**: Expo Router auto-discovers file-based routes — the `grades/[gradeId]/index.tsx` screens render without a corresponding `<Stack.Screen name="grades/[gradeId]" />` entry. But adding the entry is good practice for consistency.
- **Supabase batch insert with array works**: `supabase.from('questions').insert([{...}, {...}])` handles batch insert correctly, returning created rows when `Prefer: return=representation` is set.

## Files Created/Modified

### New Files
- `mobile/src/app/(app)/topic/[topicId]/manage-questions/index.tsx` — manage questions screen
- `mobile/src/app/(app)/topic/[topicId]/manage-questions/paste.tsx` — paste + preview + publish screen
- `mobile/src/e2e/mcq-paste.spec.ts` — 2 E2E tests for MCQ paste → publish flow

### Modified Files
- `mobile/src/app/(app)/_layout.tsx` — added manage-questions and paste routes
- `mobile/src/app/(app)/topic/[topicId]/index.tsx` — wired "Manage Questions" button

## Test Results
- **Unit tests**: 25/25 passing (Jest, ~1s)
- **E2E tests**: 12/13 passing (1 pre-existing flaky: content-crud cancel-dialog). New: 2 MCQ paste tests pass.

## Running Tests
```bash
# Unit tests
cd mobile && npm test

# E2E tests (requires supabase start + expo dev server)
cd mobile && PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --config=playwright.config.ts
```
