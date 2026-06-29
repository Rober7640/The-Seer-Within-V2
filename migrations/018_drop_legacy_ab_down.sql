-- Down migration 018: recreate the legacy A/B split-testing tables (rollback).
-- Structure mirrors the former shared/schema.ts definitions. Data is NOT restored.
CREATE TABLE IF NOT EXISTS ab_tests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  element text NOT NULL,
  name text NOT NULL,
  variants text NOT NULL,
  traffic_split text NOT NULL DEFAULT '50/50',
  status text NOT NULL DEFAULT 'draft',
  winner_variant_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id varchar NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  visitor_id text NOT NULL,
  event_type text NOT NULL,
  page text NOT NULL,
  metadata text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ab_events_test_variant ON ab_events (test_id, variant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ab_events_visitor ON ab_events (visitor_id, test_id);
