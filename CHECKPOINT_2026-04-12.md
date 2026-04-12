# Checkpoint 2026-04-12

## Current branch

- Working branch: `codex/bulk-create-user-password-reset`
- Restore point branch: `codex/restore-point-20260412`
- Latest pushed commit: `38bb7ab` - `Allow preview-only password reset bypass`

## What is already done

- Fixed dashboard summary cards to reflect real counts instead of hard-coded `0`.
- Fixed evidence upload modal sizing and row rendering so all mapped population rows show.
- Added numeric formatting for additional-info values in the evidence modal.
- Improved evidence modal table readability.
- Added admin evidence download filtering, row checkboxes, and filtered/selected bulk download UX.
- Updated login page to try both:
  - `{employee_id}@tongyanginc.co.kr`
  - mapped real email from `src/data/employeeEmailMap.ts`
- Added Vercel server route for password reset:
  - `api/admin/reset-user-passwords.ts`
- Updated `vercel.json` so `/api/*` is not swallowed by the SPA rewrite.

## Verified findings

- `101130` can log in with:
  - `sangwoo.kim@tongyanginc.co.kr`
  - password `101130`
- `101119` and `101842` still fail login with their employee-id passwords.
- Their `profiles` rows do exist and are active.
- For `101119`, `101842`, and `101130`, `profiles.initial_password` is `null`.
- Existing remote Supabase function `bulk-create-users` updates users, but does **not** reset actual Auth passwords.
- Even when invoked by an admin token with 117 active users, it returns `updated: 117` but login state for `101119` and `101842` does not change.

## Root cause

The current login failures are not caused by missing employee IDs in `profiles`.

They are caused by **Auth passwords not being reset to employee IDs** for some existing users.

## Current blocker

The prepared Vercel password reset route cannot actually execute `auth.admin.updateUserById()` yet because Vercel environment variables do **not** contain:

- `SUPABASE_SERVICE_ROLE_KEY`

This was verified by pulling Vercel environment variables locally:

- preview: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- production: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

Without `SUPABASE_SERVICE_ROLE_KEY`, the only reliable reset path is blocked.

## Files changed in code

- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/evidence/EvidenceUploadModal.tsx`
- `src/pages/admin/AdminPage.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/data/employeeEmailMap.ts`
- `api/admin/reset-user-passwords.ts`
- `vercel.json`

## Important local-only files

These are useful for continuing the investigation, but are not committed right now:

- `.vercel/project.json`
- `login-audit-report.md`
- `tmp-login-audit.json`

`supabase/.temp/` is not important and can be ignored.

## Best next action

Best next step is still:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env
2. Deploy
3. Call `POST /api/admin/reset-user-passwords`
4. Verify login for:
   - `101119`
   - `101842`
   - a sample of other active users

## If another Codex continues

Ask it to:

- read `CONTEXT.md`
- read this file
- continue from branch `codex/bulk-create-user-password-reset`
- treat the current primary blocker as missing `SUPABASE_SERVICE_ROLE_KEY`
- avoid redoing the already verified `bulk-create-users` experiments
