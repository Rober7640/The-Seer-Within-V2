-- The card a letter is about, shown as its own bubble in the lander thread
-- between the line that NAMES it and the line that asks the reader for
-- something (Joel, 2026-08-20: the Devil letter should show the Devil).
--
-- Nullable, and null for most sends: the fence, the list and the song show no
-- card. Values arrive from the send drafts via render-aweber.mjs, the same road
-- big_idea travels — there is deliberately no data in this migration.
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS card_image_url text;
