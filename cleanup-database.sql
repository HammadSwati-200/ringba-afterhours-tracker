-- Database Cleanup Script
-- This will delete all existing test/messy data
-- Run this in your Supabase SQL Editor

-- 1. View current data before cleanup
SELECT 
  call_center,
  COUNT(*) as total_calls,
  MIN(call_date) as earliest_call_date,
  MAX(call_date) as latest_call_date,
  MIN(created_at) as earliest_created,
  MAX(created_at) as latest_created
FROM calls
GROUP BY call_center
ORDER BY call_center;

-- 2. Delete all existing records (CAREFUL - this will delete everything!)
-- Uncomment the line below to actually delete:
-- DELETE FROM calls;

-- 3. Verify deletion
-- SELECT COUNT(*) as remaining_records FROM calls;

-- 4. Optional: Update existing records to fix call_date to match created_at
-- (Use this if you want to keep the data but fix the dates)
-- UPDATE calls 
-- SET call_date = created_at 
-- WHERE call_date < '2025-11-01';

-- 5. After cleanup, your n8n webhook should insert new data with correct dates
-- Make sure your n8n workflow is sending the correct timestamp for call_date
