# Session 2026-07-17 — Safe Back Navigation + Google Docs Link Fix

## What was built

### Google Docs Link Fix
- Replaced the placeholder Google Docs URL in `supabase/seed.sql` (`example-quadratic-equations`) with the real document link.
- Inserted the corrected study material record into the running database.

### Safe Back Navigation (`useSafeBack` hook)
Investigated and fixed the "The action 'GO_BACK' was not handled by any navigator" error that occurred intermittently when pressing back buttons.

**Root cause**: `router.back()` fails when the current screen is the first/only screen in the Stack navigator — there's nothing to pop to. This happens on direct URL navigation (web), page refresh, or rapid double-tap.

**Solution**: Created a `useSafeBack(fallback?)` hook in `src/utils/useSafeBack.ts` that:
1. Checks `router.canGoBack()` first — preserves normal stack behavior when history exists.
2. Falls back to `router.dismissTo(fallback)` when there's no history — navigates to a known parent route safely.

**Files changed** (13 files):
- `src/utils/useSafeBack.ts` — new hook (canGoBack → back(), else dismissTo(fallback))
- `topic/[topicId]/index.tsx` — fallback to home `'/(app)'`
- `topics/[subjectId]/index.tsx` — fallback to grades `'/(app)/grades'`
- `study/index.tsx` — fallback to topic
- `study/view.tsx` — fallback to study list
- `exercise/index.tsx` — fallback to topic
- `exercise/session.tsx` — fallback to exercise intro
- `exam/index.tsx` — fallback to topic
- `exam/session.tsx` — fallback to topic
- `exam/history.tsx` — fallback to exam intro
- `add-material/index.tsx` — fallback to topic
- `manage-questions/index.tsx` — fallback to topic
- `manage-questions/paste.tsx` — fallback to manage questions

## Key decisions
- Chose the `canGoBack` + `dismissTo` pattern after researching official Expo Router docs and community best practices. The docs explicitly recommend `canGoBack()` for modal back buttons.
- Used specific fallback routes per screen (not just home for everything) so users maintain context.
- Implemented as a reusable hook so future screens get the same protection.

## Gotchas
- The `exercise/session.tsx` error/empty states had duplicate `router.back()` calls with nearly identical context — required careful targeted edits.
- `add-material/index.tsx` lost a closing brace during automated edit; caught by `tsc --noEmit`.

## What's next
- No new features opened. Project is in a stable state after Wave 4 completion.
