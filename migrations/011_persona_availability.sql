ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS availability_schedule TEXT,
  ADD COLUMN IF NOT EXISTS online_override TEXT,
  ADD COLUMN IF NOT EXISTS override_expires_at TIMESTAMP;
