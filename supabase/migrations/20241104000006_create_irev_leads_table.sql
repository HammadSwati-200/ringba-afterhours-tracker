-- Create irev_leads table for tracking revenue and conversion data
CREATE TABLE IF NOT EXISTS public.irev_leads (
  id BIGSERIAL PRIMARY KEY,
  
  -- Lead identification
  lead_uuid UUID NOT NULL,
  order_id TEXT,
  
  -- Location data
  ip TEXT,
  country TEXT,
  
  -- Revenue data
  revenue DECIMAL(10, 2) DEFAULT 0,
  payout DECIMAL(10, 2) DEFAULT 0,
  
  -- Status tracking
  sale_status TEXT,
  credit_limit_status TEXT,
  credit_limit_amount TEXT,
  credit_score INTEGER,
  
  -- Funnel and traffic data
  funnel_name TEXT,
  traffic_source TEXT,
  checkout_source TEXT,
  ad_name TEXT,
  lander TEXT,
  
  -- Product information
  product TEXT,
  product_list TEXT,
  
  -- Attribution
  affiliate_id TEXT,
  offer_id TEXT,
  
  -- Customer data
  age INTEGER,
  
  -- Timestamps
  timestampz TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_irev_leads_lead_uuid ON public.irev_leads(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_irev_leads_timestampz ON public.irev_leads(timestampz);
CREATE INDEX IF NOT EXISTS idx_irev_leads_created_at ON public.irev_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_irev_leads_traffic_source ON public.irev_leads(traffic_source);
CREATE INDEX IF NOT EXISTS idx_irev_leads_product ON public.irev_leads(product);
CREATE INDEX IF NOT EXISTS idx_irev_leads_affiliate_id ON public.irev_leads(affiliate_id);

-- Enable RLS
ALTER TABLE public.irev_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all data
CREATE POLICY "Allow authenticated users to read irev leads"
  ON public.irev_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for service role to do everything
CREATE POLICY "Allow service role full access to irev leads"
  ON public.irev_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_irev_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_irev_leads_updated_at_trigger
  BEFORE UPDATE ON public.irev_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_irev_leads_updated_at();

-- Add comment to table
COMMENT ON TABLE public.irev_leads IS 'Stores revenue and conversion tracking data from irev webhooks';
