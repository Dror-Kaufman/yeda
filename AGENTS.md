# Yeda — Learning Platform

## Session Startup
When starting a new session, read `docs/next-session-prompt.md` first — it contains the handoff from the previous session with current state and suggested next steps. If the user says "let's keep going", "continue", or similar, follow that document.

## Tech Stack
- **Mobile & Web**: Expo (React Native + TypeScript) with `react-native-web` as web target
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Row-Level Security)
- **Routing**: Expo Router (file-based routing)
- **Auth (Phase 1)**: Email + password via Supabase Auth
- **Auth (Phase 2)**: Add Google OAuth
- **Math Rendering**: LaTeX via KaTeX (Phase 1)
- **Language (Phase 1)**: English
- **Language (Phase 2)**: Hebrew + full RTL layout support

## Project Structure
```
yeda/
├── AGENTS.md              # This file — project conventions, gotchas, commands
├── docs/                  # Product and design docs
│   ├── requirements.md    # Requirements document
│   ├── session-*.md       # Per-session summaries
│   └── next-session-prompt.md  # Handoff for next session
├── .omo/
│   ├── plans/             # Structured work plans
│   ├── notepads/          # Execution notes per work phase
│   ├── evidence/          # QA evidence
│   └── boulder.json       # Machine-readable work tracking
├── supabase/
│   ├── config.toml        # Supabase local dev config
│   ├── schema.sql         # DDL + RLS policies (source of truth)
│   ├── seed.sql           # Test data (inserts into auth.users + app tables)
│   ├── migrations/        # Timestamped SQL migrations
│   └── functions/         # Edge Functions (Deno/TypeScript)
├── mobile/                # Expo app (React Native + TypeScript)
│   ├── src/app/           # File-based routes (Expo Router)
│   │   ├── (app)/         # Protected (authenticated) routes group
│   │   ├── _layout.tsx    # Root layout (auth gate)
│   │   └── index.tsx      # Entry point
│   ├── src/components/ui/ # Shared UI components
│   ├── src/constants/     # Design tokens, theme
│   ├── src/utils/         # Helpers, API wrappers, types
│   ├── src/e2e/           # Playwright E2E tests
│   └── ...
└── .gitignore
```

## Users & Roles
| Role | Description |
|---|---|
| **Admin** | Platform administrators — approves teacher registrations, full system management |
| **Teacher** | Uploads and manages course material, approves student registrations |
| **Student** | Practices, studies, and takes exams on uploaded material |

## Registration Flow
1. Anyone can sign up and select their role (teacher or student).
2. **Teacher registrations** require **admin approval** before the teacher can upload content.
3. **Student registrations** start in `PENDING_APPROVAL` status. They cannot sign in until approved.
4. Pending student registrations appear in a pool that **admins and teachers** can view and approve.
5. Once approved, the student can sign in and access the platform freely.
6. There are **no notifications** for approvals. Teachers periodically check the pending list; students try signing in to discover their status.

## Schema Management
- Edit `supabase/schema.sql` as the single source of truth for DDL + RLS
- Copy changes to a timestamped migration: `supabase/migrations/YYYYMMDDHHMMSS_schema.sql`
- `supabase start` auto-detects and applies migrations

### ⚠️ CRITICAL: supabase stop + start Does NOT Re-apply Migrations
`supabase stop && supabase start` restores DB from Docker volumes. Migrations and seed.sql are **not** re-applied. To update schema on a running instance, use `docker exec`:
```bash
docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "ALTER TYPE <enum> ADD VALUE '<new_value>';"
```

### Seed Data — GoTrue bcrypt Gotcha
GoTrue (Go) expects bcrypt hashes with the `$2a$` prefix. Node.js `bcryptjs` generates `$2b$`, which Go's bcrypt rejects.

**✅ Correct (SQL seed):**
```sql
INSERT INTO auth.users (id, email, encrypted_password, ...)
VALUES ('...', 'user@example.com', crypt('password123', gen_salt('bf', 10)), ...);
```

**NULL→Empty String Fields** in `auth.users`:
```sql
INSERT INTO auth.users (
  id, email, encrypted_password,
  confirmation_token, recovery_token,
  email_change_token_current, email_change_token_new,
  reauthentication_token,
  email_change, phone_change, phone_change_token
) VALUES (
  gen_random_uuid(), 'user@example.com',
  crypt('password123', gen_salt('bf', 10)),
  '', '', '', '', '',
  '', '', ''
);
```

### ⚠️ Seed Data — Missing Fields That Block Login
When inserting directly into `auth.users`, seed users will fail login with "Invalid login credentials" unless these fields are set:

| Field | Required Value | Why |
|-------|---------------|-----|
| `instance_id` | `'00000000-0000-0000-0000-000000000000'` | GoTrue checks this |
| `aud` | `'authenticated'` | JWT audience claim |
| `role` | `'authenticated'` | JWT role claim |
| `raw_app_meta_data` | `jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))` | GoTrue uses this to determine login providers |

Additionally, **each seed user MUST have a corresponding row in `auth.identities`**:
```sql
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(), 'user@example.com', user_id,
  jsonb_build_object('sub', user_id, 'email', 'user@example.com', 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
);
```

The safest approach: wrap everything in a `DO $$ ... END $$` block to capture generated UUIDs via `RETURNING id INTO`. See `supabase/seed.sql` for a working example.

## Local Dev Flow
1. `supabase start` — pulls images, applies migrations, seeds data
2. Migrations auto-detected from `supabase/migrations/*.sql`
3. Seed from `supabase/seed.sql` (configured in `config.toml`)
4. Access Studio at `http://127.0.0.1:54333`
5. DB at `postgresql://postgres:postgres@127.0.0.1:54332/postgres`
6. Auth API at `http://127.0.0.1:54331/auth/v1`
7. REST API at `http://127.0.0.1:54331/rest/v1`
8. Expo dev: `npx expo start --web` (from `mobile/`)

## RLS Gotchas
- **AVOID table subqueries in policies**: Helper functions that `SELECT` from the same table their calling policy is on cause `stack depth limit exceeded` (PostgreSQL 15+). Use `auth.jwt() -> 'user_metadata' ->> 'role'` directly instead — no recursion, simpler, and row-level safe.
- Explicit FK-based joins (e.g., `child:children(name)`) return **arrays** even for `to-one` relationships. Always access via `[0]`.
- The `profiles` table has **no `email` column** — email lives in `auth.users`. When querying profiles via REST API, don't `select=email`.

## Expo Router Gotchas
- `<Stack>` only accepts `<Stack.Screen>` and `<Stack.Protected>` as direct children. Using `<>` fragments inside `<Stack>` causes `"can't convert symbol to string"` runtime error.
- `Stack.Protected guard={condition}` — when `guard` is falsy, children are excluded from rendering.
- `href: null` on `<Tabs.Screen>` does **not** cascade to sub-routes. Each sub-route needs its own entry.
- Route folder renames require updating `Tabs.Screen name` in the layout.

## Auth Gotchas
- **Auth blocking at app layer**: Supabase Auth API always returns tokens on successful password auth. Blocking pending/rejected users must be done in the auth context's `signIn()`, not at the API level.
- **`sessionReady` ref**: When using `Stack.Protected`, the layout needs a ref-based guard to prevent the sign-in redirect from firing before the profile fetch completes. See `auth-context.tsx` for the pattern.
- **E2E approval test targeting**: When many pending users exist, clicking the first "Approve" won't make "No pending approvals" appear. Use the user's UUID from the API signup response to target the specific user.

## React Native + Web Gotchas
- **`Alert.prompt` is iOS-only**: Does not exist on Android or react-native-web. Use `showPrompt()` utility in `src/utils/prompt.ts` which wraps `window.prompt` in `setTimeout(0)` for cross-platform compatibility.
- **Playwright has no `page.prompt()`**: Mock prompt dialogs via `page.evaluate(() => window.prompt = () => 'text')` before triggering the prompt action.
- **`jest.spyOn(Platform, 'OS', 'get')` fails in Node env**: `Platform.OS` is a plain string, not a getter, in Node environment. Use `Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true })` instead.
- **`jest-expo` + jsdom conflict**: RN preset's setup.js redefines `window`, conflicting with `@jest-environment jsdom`. Don't use jsdom with jest-expo; mock globals manually via `Object.defineProperty(globalThis, 'window', ...)`.

## Content Management Gotchas
- **Grades need UNIQUE constraint + dedup**: Before adding `UNIQUE(name)` to grades, clean any duplicate rows from seed data or the migration will fail.
- **`supabase stop && start` doesn't re-apply migrations**: Not just for `ALTER TYPE` — also for policy changes. Always use `docker exec` for live DB changes.
- **Seed data subjects can get wiped**: If Browse Content shows no subjects under a grade, re-insert via `docker exec` using seed.sql's content block.

## Web Platform Gotchas
- **`Alert.alert` is a silent no-op on react-native-web**: It shows nothing and callbacks never fire. Use inline state-driven UI for errors/confirmations instead. This affects ALL delete confirmations in the existing codebase too.
- **`Alert.prompt` is iOS-only**: Already documented, but worth repeating — crashes on web and Android. Use `showPrompt()` from `src/utils/prompt.ts` instead.
- **`dangerouslySetInnerHTML` not in RN View TypeScript types**: Even though react-native-web supports it at runtime, the React Native types don't include it. Use a ref-based approach: `const ref = useRef<View>(null); useEffect(() => { (ref.current as any).innerHTML = html; }, [html]); return <View ref={ref} />;`. See `src/components/LatexText.tsx` for a working example.
- **CSS side-effect imports need type declaration**: Importing CSS files like `import 'katex/dist/katex.min.css'` requires `declare module '*.css' {}` in a `.d.ts` file (see `src/global.d.ts`).
- **Google Docs iframe embedding blocked by SameSite cookies**: Modern browsers block third-party cookies in cross-site iframes. Google Docs requires cookies even in `/preview?embedded=true` mode. The cookie consent screen cannot be bypassed via URL parameters. The only reliable fix is opening the Google Doc URL in a new tab instead of embedding. See `session-20260724-topic-screen-streamline.md` for details.

## Expo Router Gotchas (added 2026-07-17)
- **Deep nested routes need explicit Stack.Screen entries**: Both `topic/[topicId]/exercise` AND `topic/[topicId]/exercise/session` must each be registered in the layout's `<Stack>`. Omitting the intermediate parent route causes navigation failures.
- **Back buttons must use `useSafeBack(fallback)`**: Never use bare `router.back()` — it crashes with "GO_BACK was not handled by any navigator" when the screen is the first in the stack. Import `useSafeBack` from `src/utils/useSafeBack.ts` and pass a fallback route (e.g., `useSafeBack('/topic/${topicId}')`). The hook checks `router.canGoBack()` first, then falls back to `router.dismissTo(fallback)`.

## npm Gotchas
- **Installing packages can break jest-expo**: `npm install <pkg>` can remove `@react-native/jest-preset` from node_modules. Fix with: `npm install --save-dev @react-native/jest-preset --legacy-peer-deps`.

## Supabase Realtime
- Channel names must be unique per subscription. Use dynamic names: `` `events-${Date.now()}-${Math.random()}` `` and track with `useRef` for cleanup.
- Never hardcode channel names — `channel()` returns the already-subscribed one if the name matches.

## Design Tokens
Define colors, spacing, typography in `mobile/src/constants/theme.ts`. Reuse instead of hardcoding.

## Session Wrap-up Procedure
When the user says "wrap up" (or equivalent), do the following:

1. **Summarize**: Write `docs/session-YYYYMMDD-topic.md` covering what was built, key decisions, and relevant context for future sessions.
2. **Update `docs/next-session-prompt.md`**: Write a prompt for the next session listing what's remaining, what's completed, and suggested next steps.
3. **Update AGENTS.md**: Capture any new conventions, gotchas, or friction points discovered during the session.
4. **Update relevant docs**: Refresh existing docs if this session changed assumptions or added new details.
5. **Commit**: `git add -A && git commit -m "<summary of work>"` with a clear message.
6. **Push**: `git push` (create remote with `gh repo create` if none exists).

## Commands Reference
| Task | Command |
|------|---------|
| Supabase local dev start | `supabase start` |
| Stop local dev | `supabase stop` |
| Expo web dev | `npx expo start --web` (from `mobile/`) |
| Push schema to prod | `supabase db push` |
| Deploy edge functions | `supabase functions deploy <name>` |
| Generate types from DB | `supabase gen types typescript --linked > utils/supabase-types.ts` |
| Query local DB | `docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "SELECT ..."` |
| Auth smoke test | `curl -X POST http://127.0.0.1:54331/auth/v1/token?grant_type=password -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"password123"}'` |
| E2E tests (auth) | `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --config=playwright.config.ts` (from `mobile/`) |
| Check auth logs | `docker logs supabase_auth_yeda --tail 20` |
| ALTER TYPE enum | `docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "ALTER TYPE <enum> ADD VALUE '<value>';"` |
| Run unit tests | `npm test` (from `mobile/`) |
| Install deps | `npm install <pkg> --legacy-peer-deps` from `mobile/` |

## Testing Workflow
Whenever making changes, write or update tests at the appropriate level:

| Level | When to use | Example |
|-------|-------------|---------|
| **Curl smoke test** | Backend changes (schema, RLS, auth) — verify API endpoint returns expected data | `curl -X POST ... /auth/v1/token` to confirm login works |
| **Playwright E2E** | UI/flow changes (screens, navigation, auth flow) — verify user-facing behavior | New screen → add E2E test covering render, interaction, and navigation |
| **Unit test (Jest)** | Utility/logic functions — verify pure function or mocked-service output | Date formatting, validation logic, schema parsing |

- Run ALL existing test levels before committing to confirm nothing broke.
- For bugs: first write a failing test that reproduces the bug, then fix the code.
- **E2E tests must clean up after themselves**: Use `test.afterAll` with `docker exec psql` or `SERVICE_ROLE_KEY` (service_role key bypasses RLS) to delete test-created auth users and app data. Use `docker exec -i supabase_db_yeda psql -U postgres -d postgres -c "DELETE FROM auth.users WHERE email LIKE 'pattern-%@yeda.com';"` for `auth.users` cleanup (not accessible via REST API). Use unique email patterns (e.g., `test-${Date.now()}@yeda.com`) so cleanup doesn't accidentally delete seed users.

## Phase 3 Migration Notes
- LaTeX rendering: Keep LaTeX strings as plain text. On web use KaTeX, on native use `<WebView>` wrapper.
- Google Docs embedding: Store embed URL as plain string. On web use iframe, on native use `<WebView>`.
