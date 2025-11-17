# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ringba After-Hours Tracker: A Next.js application for tracking after-hours calls and callback rates across 30 Ringba call centers with real-time analytics.

## Development Commands

```bash
npm install           # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

## Environment Setup

Required environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Architecture Overview

**Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Supabase, Tailwind CSS 4, Shadcn UI

**Client-Side Only**: All data processing happens in the browser. No server routes or server components.

**Entry Points**:
- `app/page.tsx` - Main entry, renders Dashboard
- `app/Dashboard.tsx` - Core analytics UI and business logic
- `app/login/page.tsx` - Authentication screen

**Data Layer**:
- Supabase client: `lib/supabase-client.ts` (browser client only)
- Tables: `calls` (Ringba webhook data), `irev_leads` (lead tracking)
- Auth: Supabase Auth with RLS policies (anon key has SELECT only)

## Critical Business Logic

### After-Hours Classification (`app/Dashboard.tsx`)

**Lead Classification** (uses window-based approach):
- Uses `getDailyWindows()` to create in-hours and after-hours time windows for each call center
- Leads are classified by checking if their timestamp falls within these windows
- **CRITICAL**: The function handles weekend gaps (e.g., Friday 5pm → Monday 9am for Mon-Fri centers)

**Call Classification**:
1. **In-Hours Calls**: Non-SMS calls that occur during business hours
2. **After-Hours Calls**: SMS or DID calls that occur during in-hours windows (these are "recovery" callbacks)

**SMS/DID Detection**:
- **SMS**: `publisher_name` contains "SMS" (case-insensitive)
- **DID**: `CC_Number` (stripped of +1) matches any DID in `ALL_DIDS` array

**Important**: After-hours logic relies on specific data fields (`publisher_name`, `CC_Number`). Do not change these without verifying data contracts.

### 48-Hour Callback Detection

For each after-hours call, find an in-hours call with:
- Same `caller_phone`
- Same `call_center`
- Occurred within 48 hours AFTER the original call

Implementation in `Dashboard.tsx` - see callback matching logic.

### Call Center Configuration (`lib/call-center-hours.ts`)

30 call centers with configurable:
- Operating hours (start/end in 24-hour format, supports half-hours)
- Timezone (PST/MST)
- Days of week (0=Sunday, 6=Saturday)
- DID numbers for identification

**Lenient ID Matching**: IDs are normalized (underscores removed), so `CC_14` matches `CC14`.

**No Hours = In-Hours**: Centers without configured hours return `false` from `isAfterHours()` (treated as always open).

### Data Fetching Pattern

**Pagination**: Manual pagination via `.range(page*1000, (page+1)*1000-1)` loops for both tables
- Filtered by `created_at`/`timestampz` date range
- Ordered by descending timestamp
- Loads all matching records in 1000-record chunks

**Date Filters**:
- Component: `components/date-range-picker.tsx`
- Presets: This Week, Last Week, Last 7 Days, This Month, This Year
- Default: Last 7 days
- Syncs to URL query params when non-default: `startDate`, `endDate`, `callCenter`, `filter`

## Database Schema

**Migrations Order** (in `supabase/migrations/`):
1. `20241104000001_create_calls_table.sql` - Main calls table with indexes
2. `20241104000006_create_irev_leads_table.sql` - Leads table with trigger
3. `20241104000005_enable_rls.sql` - Row-Level Security policies

**RLS Policies**:
- `authenticated` users: SELECT on both tables
- `service_role`: Full access (used by n8n webhook ingestion)
- Frontend anon key: Read-only

**Key Indexes**:
- `calls`: caller_phone, call_date, call_center+call_date composite
- `irev_leads`: phone_number_norm, timestampz, cid

## Important Patterns

**Timezone Handling**: Currently uses naive JS Date objects. Hours in config are PST/MST local time. For precise timezone handling, consider `date-fns-tz`.

**ID Normalization**: Call center IDs are matched with underscores removed to handle variations (`CC_14`, `CC14`).

**Fallback Fields**: Some queries use `created_at` as fallback for `call_date` - maintain consistency.

**DID Detection**: `DID_TO_CALL_CENTER` map in `Dashboard.tsx` must be kept in sync with `callCenterHours` DIDs.

## Adding a New Call Center

1. Add entry to `callCenterHours` array in `lib/call-center-hours.ts`:
   - Set `id`, `name`, `did` (normalized, no +1)
   - Configure `startHour`, `endHour`, `timezone`, `daysOfWeek`
2. If DID-based detection needed, update `DID_TO_CALL_CENTER` map in `Dashboard.tsx`
3. Add DID to `ALL_DIDS` array in `Dashboard.tsx`

## UI Components

**Framework**: Shadcn UI components in `components/ui/`
- Radix UI primitives with Tailwind CSS v4
- Styling utilities: `lib/utils.ts` (cn function)

**Key Components**:
- `components/date-range-picker.tsx` - Date filtering with presets
- `components/ui/table.tsx` - Data table display
- `components/ui/card.tsx` - Stat cards

## Export Functionality

Dashboard supports JSON and CSV exports of filtered data. Implementation in `Dashboard.tsx`.

## Recent Fixes (2025-01-15)

**Fixed Critical Bugs**:
1. **Weekend Gap Handling**: `getDailyWindows()` now properly creates after-hours windows across weekends (e.g., Friday close → Monday open). Previously, leads from Friday evening through Sunday were lost.
2. **Consistent Lead Classification**: Consolidated to use ONLY `getDailyWindows()` approach throughout. Removed inconsistent dual-method classification that was causing different results.
3. **Independent After-Hours Call Detection**: After-hours calls (SMS/DID during in-hours) are now detected independently of lead matching. Previously showed 0 if no matching leads existed.

**What Changed**:
- Lines 742-760: Weekend gap handling in `getDailyWindows()`
- Lines 853-890: Lead classification now uses consistent window-based approach
- Lines 801-842: After-hours call detection simplified and made independent

## Common Pitfalls

- **Time zones**: Now uses `date-fns-tz` for proper timezone conversion (PST/MST). Browser timezone no longer affects classification.
- **SMS detection**: Checks for: SMS, Text, TXT, Message, Messaging (case-insensitive).
- **Missing fields**: `CC_Number` and `publisher_name` may be null/undefined. Handle gracefully.
- **Call center hours**: Some centers have no configured hours - this is intentional (treated as always in-hours).
- **Lead totals**: In-hours + After-hours should now equal total leads. If not, check window logic.
- **DST transitions**: The system uses IANA timezones which handle DST automatically. On DST transition days (e.g., March 10 spring forward, November 3 fall back), times will shift correctly. No special handling needed.

## File Organization

```
app/
  Dashboard.tsx        # Core business logic and UI
  page.tsx             # Main entry point
  login/page.tsx       # Auth screen
  layout.tsx           # Root layout and metadata

lib/
  supabase-client.ts   # Supabase browser client
  call-center-hours.ts # Call center config and helpers
  utils.ts             # Tailwind utilities

components/
  ui/                  # Shadcn UI components
  date-range-picker.tsx

supabase/
  migrations/          # SQL migrations (run in order)
```
