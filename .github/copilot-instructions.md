# AI agent guide for ringba-afterhours-tracker

Purpose: help AI coding agents be productive immediately in this repo. Keep changes aligned with these patterns and files.

Architecture overview

- UI: Next.js App Router (see `app/`), all data work happens client-side. Entry is `app/page.tsx` which renders `app/Dashboard.tsx`. Login screen at `app/login/page.tsx`. Root metadata/theme in `app/layout.tsx`.
- Data: Supabase Postgres with two primary tables: `calls` and `public.irev_leads`. Client uses `@supabase/supabase-js` via `lib/supabase-client.ts` and public env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No server routes or server components at present; aggregations (classification, grouping, export) are computed in the browser inside `Dashboard.tsx`.

Key domain logic (read before changing)

- After-hours vs in-hours classification lives in `app/Dashboard.tsx`:
  - SMS heuristic: if `publisher_name` includes "SMS" → treat as after-hours.
  - DID heuristic: if `CC_Number` (stripped of `+1`) matches any DID in `DID_TO_CALL_CENTER` → treat as after-hours.
  - Otherwise → treat as in-hours.
- 48-hour callback detection: for each after-hours call, find an in-hours call with the same `caller_phone` and same `call_center` occurring within 48 hours after the original. See `Dashboard.tsx`.
- Call center config is in `lib/call-center-hours.ts`: array `callCenterHours` plus helpers `isAfterHours`, `formatOperatingHours`, `getCallCenterName`.
  - IDs are matched leniently (underscores removed) so `CC_14` matches `CC14`.
  - If a center has no hours, `isAfterHours` returns false (treated as in-hours) and `formatOperatingHours` returns "No hours configured".

Data fetching pattern

- Paginates Supabase queries manually with `.range(page*1000, (page+1)*1000-1)` loops for both `calls` and `irev_leads`, filtered by `created_at`/`timestampz` and ordered desc. See `loadStats()` in `Dashboard.tsx`.
- Date filters come from the Date Range Picker (`components/date-range-picker.tsx`), with quick presets (This Week, Last Week, Last 7 Days, This Month, This Year). Default is last 7 days.
- Filters sync to URL query params when non-default: `startDate`, `endDate`, `callCenter`, `filter` (see effects in `Dashboard.tsx`).

DB schema and permissions (supabase/migrations)

- `20241104000001_create_calls_table.sql` defines `calls` with useful indexes and unique `call_id`. `20241104000006_create_irev_leads_table.sql` defines `public.irev_leads` with indexes and an `updated_at` trigger.
- `20241104000005_enable_rls.sql` enables RLS on both, allows SELECT for `authenticated`, and full insert/update for `service_role` (used by n8n ingestion). The frontend anon key can only read.
- Grants reference views/functions `daily_analytics`, `callback_statistics`, `callback_analysis`, and `refresh_*` helpers. These objects are not present in this repo; ensure they exist in your DB or remove/adjust the grants.

Common tasks

- Dev: `npm run dev`, build: `npm run build`, start: `npm start`, lint: `npm run lint`. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Add a new call center: update `lib/call-center-hours.ts` (id, did, hours, timezone, days) and, if needed, `DID_TO_CALL_CENTER` in `app/Dashboard.tsx` so DID-based after-hours detection works.
- Exporting: `Dashboard.tsx` supports JSON/CSV exports for the current selection.

Conventions & pitfalls

- Time zones: `isAfterHours` uses naive JS Date; hours in config are PST/MST. If precision is needed, replace with a tz-aware lib (e.g., date-fns-tz) consistently.
- After-hours logic relies on `publisher_name` containing "SMS" and presence of `CC_Number`; adjust only if data contracts change.
- Some queries use `created_at` as a fallback for `call_date`; be consistent when adding code paths.
- UI styling uses Tailwind CSS v4 and Shadcn components under `components/ui/*`.

File pointers

- Core: `app/Dashboard.tsx` (stats/logic/UI), `components/date-range-picker.tsx`, `lib/call-center-hours.ts`, `lib/supabase-client.ts`.
- DB: `supabase/migrations/*.sql`, `supabase/README.md` (describes intended analytics objects—verify presence in DB).

If anything above is unclear (e.g., actual presence of analytics views/functions in your Supabase project), please confirm and I can refine these instructions.
