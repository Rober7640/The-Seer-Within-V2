-- Reverses 024. Dropping the column loses the authored image for every send
-- that had one; the drafts still carry it, so a re-render restores them.
ALTER TABLE email_link_codes DROP COLUMN IF EXISTS card_image_url;
