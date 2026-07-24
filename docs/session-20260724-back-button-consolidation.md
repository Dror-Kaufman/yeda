# Session 2026-07-24: Back Button Consolidation

## What Was Built

### 1. `useSafeBack` — Platform-aware back navigation
- **Web**: Now uses `window.history.back()` (guarded by `window.history.length > 1`) instead of `router.canGoBack()` + fallback. This makes the in-app back button behave exactly like the browser back button — works after page refresh and direct URL entry, which React Navigation's in-memory stack doesn't handle.
- **Native**: Original `router.canGoBack()` → `router.back()` / fallback logic unchanged.
- Single file change: `src/utils/useSafeBack.ts`

### 2. Back button appearance consolidated
Standardized all back buttons to `← Back` (Unicode arrow `\u2190`) with `typography.body` + `colors.primary`.

### Screens Updated
| Screen | Change |
|---|---|
| `topics/[subjectId]/index.tsx` | Changed `"Back"` → `← Back`, removed extra `fontWeight` |
| `grades/[gradeId]/index.tsx` | Added back button (was missing) |
| `grades/index.tsx` | Added `← Back` → home |
| `admin/approvals.tsx` | Added `← Back` → home |
| `teacher/pending.tsx` | Added `← Back` → home |
| `(auth)/sign-in.tsx` | Added `← Back` (no fallback) |
| `(auth)/sign-up.tsx` | Added `← Back` → sign-in |
| `(auth)/forgot-password.tsx` | Added `← Back` → sign-in |
| `(app)/index.tsx` | **Not touched** — homepage, no back button |

## Known Issues
- Exam Mode E2E test is flaky — 20 questions in seed DB × "All questions" option pushes it past 30s timeout. Pre-existing, unrelated to this session.

## Tests
- 25 unit tests: all passing
- 13/14 E2E: passing (1 pre-existing timeout)
