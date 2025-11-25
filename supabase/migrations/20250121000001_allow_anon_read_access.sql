-- Allow anonymous users to read from calls table
CREATE POLICY "Allow anon users to read calls"
ON public.calls
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read from irev_leads table
CREATE POLICY "Allow anon users to read irev leads"
ON public.irev_leads
FOR SELECT
TO anon
USING (true);

-- Grant SELECT permissions to anon role
GRANT SELECT ON public.calls TO anon;
GRANT SELECT ON public.irev_leads TO anon;

COMMENT ON POLICY "Allow anon users to read calls" ON public.calls IS 'Allows frontend application to read call data using anon key';
COMMENT ON POLICY "Allow anon users to read irev leads" ON public.irev_leads IS 'Allows frontend application to read lead data using anon key';
