-- Down migration 019: drop the server-side paid signal column.
ALTER TABLE conversations DROP COLUMN IF EXISTS main_paid_at;
