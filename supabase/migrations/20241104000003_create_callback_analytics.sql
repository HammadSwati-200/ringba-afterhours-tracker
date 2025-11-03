-- Create a view to identify callbacks
-- A callback is defined as a call from the same phone number that occurs 
-- within 24 hours after an initial after-hours call

CREATE OR REPLACE VIEW callback_analysis AS
WITH after_hours_calls AS (
    -- Identify all after-hours calls
    SELECT 
        id,
        call_id,
        call_center,
        call_center_id,
        caller_phone,
        call_date,
        EXTRACT(HOUR FROM call_date) as call_hour,
        EXTRACT(DOW FROM call_date) as day_of_week
    FROM calls
    WHERE 
        -- After hours: before 9 AM or after 5 PM, or weekends
        (EXTRACT(HOUR FROM call_date) < 9 OR 
         EXTRACT(HOUR FROM call_date) >= 17 OR 
         EXTRACT(DOW FROM call_date) IN (0, 6))
),
next_day_calls AS (
    -- Find all calls that might be callbacks
    SELECT 
        c.id,
        c.call_id,
        c.call_center,
        c.call_center_id,
        c.caller_phone,
        c.call_date
    FROM calls c
    WHERE 
        -- During business hours: 9 AM to 5 PM on weekdays
        EXTRACT(HOUR FROM c.call_date) >= 9 AND 
        EXTRACT(HOUR FROM c.call_date) < 17 AND
        EXTRACT(DOW FROM c.call_date) NOT IN (0, 6)
)
SELECT 
    ah.call_id as after_hours_call_id,
    ah.call_date as after_hours_call_date,
    ah.call_center,
    ah.call_center_id,
    ah.caller_phone,
    nd.call_id as callback_call_id,
    nd.call_date as callback_date,
    EXTRACT(EPOCH FROM (nd.call_date - ah.call_date))/3600 as hours_until_callback,
    CASE 
        WHEN nd.call_id IS NOT NULL THEN true 
        ELSE false 
    END as has_callback
FROM after_hours_calls ah
LEFT JOIN next_day_calls nd ON 
    ah.caller_phone = nd.caller_phone AND
    nd.call_date > ah.call_date AND
    nd.call_date <= ah.call_date + INTERVAL '48 hours' AND
    nd.call_center_id = ah.call_center_id;

COMMENT ON VIEW callback_analysis IS 'Analyzes after-hours calls and identifies which ones resulted in callbacks during business hours';

-- Create a materialized view for callback statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS callback_statistics AS
SELECT 
    DATE(after_hours_call_date) as analysis_date,
    call_center,
    call_center_id,
    
    -- Total after-hours calls
    COUNT(*) as total_after_hours_calls,
    
    -- Calls that resulted in callbacks
    COUNT(*) FILTER (WHERE has_callback = true) as total_callbacks,
    
    -- Callback rate
    ROUND(
        (COUNT(*) FILTER (WHERE has_callback = true)::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0) * 100),
        2
    ) as callback_rate_percentage,
    
    -- Average time until callback (in hours)
    AVG(hours_until_callback) FILTER (WHERE has_callback = true) as avg_hours_to_callback,
    
    -- Unique callers who called after hours
    COUNT(DISTINCT caller_phone) as unique_after_hours_callers,
    
    -- Unique callers who called back
    COUNT(DISTINCT caller_phone) FILTER (WHERE has_callback = true) as unique_callbacks

FROM callback_analysis
GROUP BY DATE(after_hours_call_date), call_center, call_center_id;

-- Create indexes for the callback statistics
CREATE UNIQUE INDEX idx_callback_stats_date_center ON callback_statistics(analysis_date, call_center_id);
CREATE INDEX idx_callback_stats_date ON callback_statistics(analysis_date);
CREATE INDEX idx_callback_stats_center ON callback_statistics(call_center);

COMMENT ON MATERIALIZED VIEW callback_statistics IS 'Pre-computed callback statistics including callback rates and timing';

-- Create a function to refresh callback statistics
CREATE OR REPLACE FUNCTION refresh_callback_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY callback_statistics;
END;
$$;

COMMENT ON FUNCTION refresh_callback_statistics IS 'Refreshes the callback_statistics materialized view';
