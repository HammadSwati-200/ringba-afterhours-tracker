-- Create a materialized view for analytics
-- This will pre-compute daily statistics for better performance

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics AS
SELECT 
    DATE(call_date) as analysis_date,
    call_center,
    call_center_id,
    
    -- Total calls for the day
    COUNT(*) as total_calls,
    
    -- Total after-hours calls
    COUNT(*) FILTER (WHERE 
        EXTRACT(HOUR FROM call_date) < 9 OR 
        EXTRACT(HOUR FROM call_date) >= 17 OR 
        EXTRACT(DOW FROM call_date) IN (0, 6)
    ) as total_after_hours,
    
    -- Unique callers
    COUNT(DISTINCT caller_phone) as unique_callers,
    
    -- Average call duration
    AVG(duration)::INTEGER as avg_duration,
    
    -- Total call time
    SUM(duration) as total_duration,
    
    -- Duplicate calls count
    COUNT(*) FILTER (WHERE is_duplicate = true) as duplicate_calls
    
FROM calls
GROUP BY DATE(call_date), call_center, call_center_id;

-- Create indexes on the materialized view for faster queries
CREATE UNIQUE INDEX idx_daily_analytics_date_center ON daily_analytics(analysis_date, call_center_id);
CREATE INDEX idx_daily_analytics_date ON daily_analytics(analysis_date);
CREATE INDEX idx_daily_analytics_center ON daily_analytics(call_center);

-- Add comments
COMMENT ON MATERIALIZED VIEW daily_analytics IS 'Pre-computed daily statistics for after-hours call analysis';

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics;
END;
$$;

COMMENT ON FUNCTION refresh_daily_analytics IS 'Refreshes the daily_analytics materialized view. Call this periodically or after bulk inserts.';
