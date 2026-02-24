import { sql } from '@vercel/postgres';

async function setup() {
  console.log('Creating transformations table...');
  await sql`
    CREATE TABLE IF NOT EXISTS transformations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      session_id TEXT NOT NULL,
      original_blob_url TEXT NOT NULL,
      enhanced_blob_url TEXT NOT NULL,
      prompt_used TEXT,
      style_tag TEXT,
      processing_time_ms INTEGER NOT NULL DEFAULT 0,
      original_size_bytes INTEGER NOT NULL DEFAULT 0,
      enhanced_size_bytes INTEGER NOT NULL DEFAULT 0,
      original_dimensions TEXT,
      enhanced_dimensions TEXT,
      opt_in BOOLEAN NOT NULL DEFAULT false,
      user_agent TEXT,
      ip_hash TEXT
    )
  `;

  console.log('Creating usage_events table...');
  await sql`
    CREATE TABLE IF NOT EXISTS usage_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transformation_id UUID REFERENCES transformations(id) ON DELETE SET NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ip_hash TEXT,
      user_agent TEXT,
      referrer TEXT,
      device_type TEXT,
      screen_size TEXT
    )
  `;

  console.log('Creating indexes...');
  await sql`CREATE INDEX IF NOT EXISTS idx_transformations_created ON transformations(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transformations_opt_in ON transformations(opt_in) WHERE opt_in = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_transformations_style ON transformations(style_tag)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_type ON usage_events(event_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_session ON usage_events(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_created ON usage_events(created_at DESC)`;

  console.log('Database setup complete!');
}

setup().catch(console.error);
