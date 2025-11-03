# Database Cleanup & Date Fix Guide

## Problem

Your `call_date` field shows March 2025, but calls are actually recent. This is because your Ringba webhook is sending incorrect dates.

## What I Changed

1. ✅ **Dashboard now filters by `created_at` instead of `call_date`**

   - This means it shows calls based on when they were inserted into the database
   - Your recent calls will now appear immediately

2. ✅ **Changed default filter to "Last 7 Days"**
   - Dashboard will show recent calls by default

## How to Clean Up Your Database

### Option 1: Delete All Test Data (Recommended)

Go to Supabase SQL Editor and run:

```sql
DELETE FROM calls;
```

### Option 2: Fix the Dates (Keep existing data)

Go to Supabase SQL Editor and run:

```sql
UPDATE calls
SET call_date = created_at
WHERE call_date < '2025-11-01';
```

## Fix Your n8n Webhook

Your n8n workflow needs to send the **correct timestamp** for `call_date`.

### Check your n8n workflow:

1. Make sure `call_date` is set to the **actual call time** from Ringba
2. It should be in ISO format: `2025-11-04T12:30:00Z`
3. Don't hardcode old dates like March 2025

### Example of correct n8n data:

```json
{
  "call_date": "{{ $now.toISO() }}", // Current time
  "created_at": "{{ $now.toISO() }}" // Will auto-set if not provided
}
```

## Testing

1. Clean up the database (delete or update)
2. Send a new test call through n8n
3. Check the dashboard - it should appear in "Last 7 Days"
4. Verify the call_date is correct in Supabase

## Important Notes

- The dashboard now uses `created_at` for filtering, so old data won't interfere
- For after-hours detection, we still use `call_date` (make sure n8n sends correct time!)
- If `call_date` is wrong, after-hours detection will be incorrect
