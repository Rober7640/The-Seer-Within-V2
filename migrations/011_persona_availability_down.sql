ALTER TABLE personas
  DROP COLUMN IF EXISTS availability_schedule,
  DROP COLUMN IF EXISTS online_override,
  DROP COLUMN IF EXISTS override_expires_at;
