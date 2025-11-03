-- Enable Row Level Security (RLS) on the calls table
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to read all calls
CREATE POLICY "Allow authenticated users to read calls"
ON calls
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows service role to insert calls (for n8n automation)
CREATE POLICY "Allow service role to insert calls"
ON calls
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create a policy that allows service role to update calls
CREATE POLICY "Allow service role to update calls"
ON calls
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON calls TO authenticated;
GRANT ALL ON calls TO service_role;

GRANT SELECT ON daily_analytics TO authenticated;
GRANT SELECT ON callback_statistics TO authenticated;
GRANT SELECT ON callback_analysis TO authenticated;

-- Allow service role to refresh materialized views
GRANT EXECUTE ON FUNCTION refresh_daily_analytics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_callback_statistics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_all_analytics TO service_role;

COMMENT ON POLICY "Allow authenticated users to read calls" ON calls IS 'Allows authenticated users to view call data';
COMMENT ON POLICY "Allow service role to insert calls" ON calls IS 'Allows n8n automation (using service role key) to insert new calls';
