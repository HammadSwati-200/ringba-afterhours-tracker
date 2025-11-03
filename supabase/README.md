# Ringba After-Hours Tracker - Supabase Database Schema

This directory contains the SQL migration files for the Ringba After-Hours Tracker database.

## Database Overview

The database is designed to track after-hours call activity from Ringba and analyze callback behavior.

### Main Components

1. **`calls` table** - Stores all call records from Ringba
2. **`daily_analytics` materialized view** - Pre-computed daily statistics
3. **`callback_analysis` view** - Real-time callback matching
4. **`callback_statistics` materialized view** - Pre-computed callback rates and metrics
5. **Helper functions** - Utility functions for queries and analytics

## Schema Details

### Calls Table

Primary table storing all incoming call data from n8n automation.

**Columns:**

- `id` - UUID primary key (auto-generated)
- `call_id` - Unique Ringba call identifier
- `call_center` - Name of the call center
- `call_center_id` - ID of the call center
- `agent_name` - Name of the agent who handled the call
- `caller_phone` - Phone number of the caller
- `caller_email` - Email of the caller (optional)
- `duration` - Call duration in seconds
- `total_length` - Total call length
- `from_dial_length` - Time spent dialing
- `from_connect_length` - Time spent connected
- `is_duplicate` - Flag for duplicate calls
- `call_date` - When the call occurred (timestamptz)
- `created_at` - When the record was created (timestamptz)
- `execution_mode` - n8n execution mode
- `webhook_url` - Webhook URL (optional)

**Indexes:**

- `idx_calls_caller_phone` - For callback matching
- `idx_calls_call_date` - For time-based queries
- `idx_calls_call_center_date` - Composite index for common queries
- `idx_calls_created_at` - For recent records
- `unique_call_id` - Ensures call_id uniqueness

### Analytics Views

#### daily_analytics (Materialized View)

Pre-computed daily statistics including:

- Total calls per day
- After-hours calls count
- Unique callers
- Average and total duration
- Duplicate calls count

**Refresh:** Call `refresh_daily_analytics()` or `refresh_all_analytics()`

#### callback_analysis (View)

Real-time view that:

- Identifies after-hours calls (before 9 AM, after 5 PM, or weekends)
- Matches them with callbacks (business hours calls within 48 hours)
- Calculates time until callback

#### callback_statistics (Materialized View)

Pre-computed callback metrics:

- Total after-hours calls
- Total callbacks
- Callback rate percentage
- Average time to callback
- Unique caller counts

**Refresh:** Call `refresh_callback_statistics()` or `refresh_all_analytics()`

## Helper Functions

### `is_after_hours(call_timestamp)`

Returns `true` if the timestamp is outside business hours (9 AM - 5 PM, Mon-Fri).

### `get_callback_count(phone, after_hours_date, center_id)`

Returns the count of callbacks for a specific phone number after an after-hours call.

### `refresh_daily_analytics()`

Refreshes the `daily_analytics` materialized view.

### `refresh_callback_statistics()`

Refreshes the `callback_statistics` materialized view.

### `refresh_all_analytics()`

Refreshes all materialized views at once.

## Setup Instructions

### 1. Initialize Supabase (if not already done)

```bash
npm install supabase --save-dev
npx supabase init
```

### 2. Link to Your Supabase Project

```bash
npx supabase link --project-ref your-project-ref
```

### 3. Apply Migrations

```bash
npx supabase db push
```

Or apply migrations manually in the Supabase SQL Editor by running each file in order.

## Usage from n8n

### Inserting Call Data

Use the Supabase node in n8n with the following configuration:

**Operation:** Insert row  
**Table:** calls  
**Authentication:** Use your Supabase service role key (not anon key)

**Example payload mapping:**

```json
{
  "call_id": "{{ $json.callId }}",
  "call_center": "{{ $json.callCenter }}",
  "call_center_id": "{{ $json.callCenterId }}",
  "agent_name": "{{ $json.agentName }}",
  "caller_phone": "{{ $json.callerPhone }}",
  "caller_email": "{{ $json.callerEmail }}",
  "duration": {{ $json.duration }},
  "total_length": {{ $json.totalLength }},
  "from_dial_length": {{ $json.fromDialLength }},
  "from_connect_length": {{ $json.fromConnectLength }},
  "is_duplicate": {{ $json.isDuplicate }},
  "call_date": "{{ $json.callDate }}",
  "execution_mode": "{{ $json.executionMode }}",
  "webhook_url": "{{ $json.webhookUrl }}"
}
```

### Refreshing Analytics

Set up a scheduled n8n workflow to refresh analytics daily:

```sql
SELECT refresh_all_analytics();
```

## Querying Analytics

### Get Today's After-Hours Stats

```sql
SELECT *
FROM daily_analytics
WHERE analysis_date = CURRENT_DATE;
```

### Get Callback Rate for Last 7 Days

```sql
SELECT
    analysis_date,
    call_center,
    total_after_hours_calls,
    total_callbacks,
    callback_rate_percentage
FROM callback_statistics
WHERE analysis_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY analysis_date DESC;
```

### Find Callers Who Haven't Called Back

```sql
SELECT DISTINCT
    after_hours_call_id,
    caller_phone,
    after_hours_call_date,
    call_center
FROM callback_analysis
WHERE has_callback = false
    AND after_hours_call_date >= CURRENT_DATE - INTERVAL '7 days';
```

### Get Average Callback Time by Call Center

```sql
SELECT
    call_center,
    ROUND(AVG(avg_hours_to_callback), 2) as avg_callback_hours
FROM callback_statistics
WHERE analysis_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY call_center;
```

## Business Hours Definition

**Business Hours:** Monday - Friday, 9:00 AM - 5:00 PM  
**After Hours:**

- Before 9:00 AM
- After 5:00 PM
- Weekends (Saturday & Sunday)

**Callback Window:** 48 hours after the initial after-hours call

## Maintenance

### Regular Tasks

1. **Refresh materialized views** - Run daily or after bulk imports:

   ```sql
   SELECT refresh_all_analytics();
   ```

2. **Monitor table size** - Check periodically:

   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('calls'));
   ```

3. **Archive old data** - Consider archiving data older than 1-2 years

### Performance Tips

- Materialized views improve query performance significantly
- Refresh views during off-peak hours
- Use indexes for custom queries on frequently filtered columns
- Monitor query performance with `EXPLAIN ANALYZE`

## Security

- Row Level Security (RLS) is enabled on the `calls` table
- Authenticated users can read all data
- Only service role can insert/update (for n8n automation)
- Use service role key in n8n, anon key for frontend queries

## Support

For issues or questions about the database schema, refer to the Supabase documentation or the project README.
