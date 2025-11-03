-- Create the main calls table for tracking Ringba after-hours call activity
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL,
    call_center TEXT NOT NULL,
    call_center_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    caller_email TEXT,
    duration INTEGER NOT NULL,
    total_length INTEGER NOT NULL,
    from_dial_length INTEGER NOT NULL,
    from_connect_length INTEGER NOT NULL,
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    call_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_mode TEXT NOT NULL,
    webhook_url TEXT,
    
    -- Ensure call_id is unique across all records
    CONSTRAINT unique_call_id UNIQUE (call_id)
);

-- Create indexes for optimal query performance
-- Index on caller_phone for matching callbacks
CREATE INDEX idx_calls_caller_phone ON calls(caller_phone);

-- Index on call_date for time-based analytics
CREATE INDEX idx_calls_call_date ON calls(call_date);

-- Composite index for common query patterns (call center + date range)
CREATE INDEX idx_calls_call_center_date ON calls(call_center, call_date);

-- Index on created_at for recent records lookup
CREATE INDEX idx_calls_created_at ON calls(created_at);

-- Add helpful comments to the table
COMMENT ON TABLE calls IS 'Stores Ringba after-hours call activity data from n8n automation';
COMMENT ON COLUMN calls.call_id IS 'Unique identifier from Ringba';
COMMENT ON COLUMN calls.caller_phone IS 'Phone number of the caller - used for callback matching';
COMMENT ON COLUMN calls.call_date IS 'Timestamp when the call occurred';
COMMENT ON COLUMN calls.is_duplicate IS 'Flag to identify duplicate calls';
COMMENT ON COLUMN calls.duration IS 'Call duration in seconds';
