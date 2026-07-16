# Session: Wave 2 — Auth Implementation + E2E Testing (2026-07-16)

## What Was Built

### Wave 2 — Auth Implementation (8 tasks)

**Auth Provider & Context**
- `mobile/src/utils/supabase.ts` — Supabase client singleton with anon key
- `mobile/src/utils/auth-context.tsx` — `SessionProvider` + `useSession()` hook with:
  - `signIn()` — email/password, fetches profile, blocks pending/rejected users with specific error messages
  - `signUp()` — email/password + role + display name, returns created profile
  - `signOut()` — clears session + profile
  - `isAuthorized` — `!!session && profile?.status === 'active'`
  - `sessionReady` ref pattern to prevent racy layout redirects before profile fetch completes

**Auth Screens**
- `mobile/src/app/_layout.tsx` — root layout with `SessionProvider` wrapper, auth gate via SessionGuard
- `mobile/src/app/index.tsx` — redirect to `(auth)/sign-in` or `(app)` based on auth state
- `mobile/src/app/(auth)/sign-in.tsx` — email/password form, handles pending/rejected errors inline
- `mobile/src/app/(auth)/sign-up.tsx` — email/password + display name + role selector (teacher/student), success message
- `mobile/src/app/(auth)/forgot-password.tsx` — email input, calls `supabase.auth.resetPasswordForEmail()`

**Protected App Screens**
- `mobile/src/app/(app)/_layout.tsx` — `Stack.Protected` auth gate, redirects unauthenticated users
- `mobile/src/app/(app)/index.tsx` — home screen with role-based menu (admin→approvals, teacher→pending students, student→"no content")
- `mobile/src/app/(app)/admin/approvals.tsx` — list pending teachers+students with Approve/Reject
- `mobile/src/app/(app)/teacher/pending.tsx` — list pending students with Approve

### RLS Policies Rewritten
Original migration `20260716000003_profiles_rls.sql` used helper functions `is_admin()`/`is_admin_or_teacher()` that queried `profiles` table — this caused **infinite recursion** in PostgreSQL 15+ when the policy itself is on `profiles`. Fixed by rewriting all policies in-session using `auth.jwt() -> 'user_metadata' ->> 'role'` directly (no table subqueries).

Policies on `public.profiles`:
| Policy | Type | Logic |
|--------|------|-------|
| Admins can read all profiles | SELECT | `user_metadata.role = 'admin'` |
| Admins can update profiles | UPDATE | `user_metadata.role = 'admin'` |
| Teachers can read student profiles | SELECT | `user_metadata.role IN ('admin','teacher')` |
| Teachers can update student profiles | UPDATE | `user_metadata.role = 'teacher'` |
| Users can insert own profile | INSERT | `auth.uid() = id` |
| Users can read own profile | SELECT | `auth.uid() = id` |

### Testing

**Playwright E2E** (`mobile/src/e2e/auth.spec.ts`) — 7 tests, all passing:
1. Admin sign-in
2. Teacher sign-in
3. Blocks pending student from signing in
4. Signs up new student → "Account created" message
5. Signs up new teacher → "Account created" message
6. Admin approves a pending student (uses API response UUID for targeted selection)
7. Signs out

**Curl Smoke Tests** — 10 tests, all passing:
1. REST API health check
2. Admin sign-in (returns token + correct email)
3. Teacher sign-in
4. Student sign-in (Auth API returns token — app layer blocks, expected)
5. RLS: Admin reads all profiles
6. RLS: Student reads only own profile
7. Sign-up creates user with correct ID
8. New profile status is `pending_approval` (via DB trigger)
9. Cleanup

## Key Decisions
- **Auth blocking at app layer**: Supabase Auth API always returns tokens on successful password auth. Blocking pending/rejected users happens in `signIn()` in `auth-context.tsx`, not at the API level. This is the correct design — Supabase Auth doesn't know about our profile statuses.
- **RLS via `auth.jwt()`**: Avoid table subqueries in RLS policies that reference the same table. Use `auth.jwt() -> 'user_metadata'` directly instead. This is simpler and avoids PostgreSQL 15+ recursion protection.
- **`sessionReady` ref**: A ref that tracks whether the initial session fetch + profile load has completed. This prevents the layout from rendering the sign-in redirect before the profile is fetched, which was causing racy behavior for pending users.

## Gotchas Discovered
- **RLS recursion (PostgreSQL 15+)**: Helper functions that `SELECT` from the table their calling policy is on cause `stack depth limit exceeded`. Fix: inline the logic with `auth.jwt()` or use `SECURITY DEFINER`.
- **`profiles` has no `email` column**: Email lives in `auth.users`. When querying profiles via REST API, don't `select=email`.
- **Sign-up success locator**: After sign-up, the app shows "Account created" text. The old locator looked for "pending approval" which matched a hidden sign-in form element.
- **Approval test targeting**: When many pending users exist, clicking the first "Approve" won't make "No pending approvals" appear. Use the user's UUID from the API signup response to target the specific user.

## Files Created/Modified
- `mobile/src/utils/supabase.ts` — Supabase client singleton (**new**)
- `mobile/src/utils/auth-context.tsx` — SessionProvider + useSession hook (**new**)
- `mobile/src/app/_layout.tsx` — root layout with SessionProvider (**modified**)
- `mobile/src/app/index.tsx` — auth-aware redirect (**modified**)
- `mobile/src/app/(auth)/sign-in.tsx` — sign-in screen (**new**)
- `mobile/src/app/(auth)/sign-up.tsx` — sign-up with role selection (**new**)
- `mobile/src/app/(auth)/forgot-password.tsx` — password reset (**new**)
- `mobile/src/app/(app)/_layout.tsx` — protected layout with Stack.Protected (**new**)
- `mobile/src/app/(app)/index.tsx` — home screen with role menu (**new**)
- `mobile/src/app/(app)/admin/approvals.tsx` — admin approval screen (**new**)
- `mobile/src/app/(app)/teacher/pending.tsx` — teacher pending screen (**new**)
- `mobile/src/e2e/auth.spec.ts` — 7 Playwright E2E tests (**new**)
- `mobile/playwright.config.ts` — Playwright config (**new**)
- `mobile/.env` — environment variables (**new**)
- `supabase/migrations/20260716000003_profiles_rls.sql` — original (replaced by inline RLS) (**existing**)
- `supabase/seed.sql` — updated student status to `pending_approval` (**modified**)
- `docs/session-20260716-auth.md` — this file (**new**)

## Running Tests
```bash
cd mobile
# E2E tests (supabase must be running + expo dev server)
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --config=playwright.config.ts

# Curl smoke tests
# (run from bash, requires supabase start)
```
