CREATE TABLE IF NOT EXISTS transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  original_blob_url TEXT,
  enhanced_blob_url TEXT,
  prompt_used TEXT,
  style_key TEXT,
  style_name TEXT,
  processing_time_ms INTEGER,
  original_size_bytes INTEGER,
  enhanced_size_bytes INTEGER,
  opt_in BOOLEAN DEFAULT false,
  user_agent TEXT,
  ip_hash TEXT,
  referrer TEXT
);

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  transformation_id UUID REFERENCES transformations(id),
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  device_type TEXT,
  screen_size TEXT
);

CREATE INDEX IF NOT EXISTS idx_transformations_created ON transformations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformations_style ON transformations(style_key);
CREATE INDEX IF NOT EXISTS idx_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON usage_events(session_id);
