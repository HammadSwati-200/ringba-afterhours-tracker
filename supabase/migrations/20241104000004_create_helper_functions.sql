-- Helper function to check if a call is after hours
CREATE OR REPLACE FUNCTION is_after_hours(call_timestamp TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    call_hour INTEGER;
    day_of_week INTEGER;
BEGIN
    call_hour := EXTRACT(HOUR FROM call_timestamp);
    day_of_week := EXTRACT(DOW FROM call_timestamp);
    
    -- After hours: before 9 AM or after 5 PM, or weekends (Saturday=6, Sunday=0)
    RETURN (call_hour < 9 OR call_hour >= 17 OR day_of_week IN (0, 6));
END;
$$;

COMMENT ON FUNCTION is_after_hours IS 'Returns true if the given timestamp falls outside business hours (9 AM - 5 PM, Mon-Fri)';

-- Helper function to get business hours calls count for a phone number
CREATE OR REPLACE FUNCTION get_callback_count(
    phone TEXT,
    after_hours_date TIMESTAMPTZ,
    center_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    callback_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO callback_count
    FROM calls
    WHERE 
        caller_phone = phone
        AND call_center_id = center_id
        AND call_date > after_hours_date
        AND call_date <= after_hours_date + INTERVAL '48 hours'
        AND NOT is_after_hours(call_date);
    
    RETURN COALESCE(callback_count, 0);
END;
$$;

COMMENT ON FUNCTION get_callback_count IS 'Returns the number of business-hours callbacks for a given phone number after an after-hours call';

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM refresh_daily_analytics();
    PERFORM refresh_callback_statistics();
    
    RAISE NOTICE 'All analytics views refreshed successfully';
END;
$$;

COMMENT ON FUNCTION refresh_all_analytics IS 'Refreshes all materialized views for analytics. Run this after bulk data imports or periodically.';
