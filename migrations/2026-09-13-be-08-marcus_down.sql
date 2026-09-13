-- Down for 2026-09-13-be-08-marcus.sql.
--
-- ⛔ DESTRUCTIVE. Dropping be_08_draws throws away which cards each paid order was dealt —
-- the thing every already-sent reading was written from. Dropping be_send_attempts throws
-- away the only record of which of her four emails went out. Neither is reconstructable
-- from Stripe. Take a dump first.
--
-- ⛔ Touches nothing 07 owns. be_07_draws, be_07_reading_grades and the 07 columns on
--    be_orders / be_order_intake are left exactly as they are.

DROP TABLE IF EXISTS be_send_attempts;
DROP TABLE IF EXISTS be_08_draws;

ALTER TABLE be_orders DROP COLUMN IF EXISTS lens_method_version;
ALTER TABLE be_orders DROP COLUMN IF EXISTS lens_card;
ALTER TABLE be_orders DROP COLUMN IF EXISTS due_at;
ALTER TABLE be_orders DROP COLUMN IF EXISTS edition_version;
ALTER TABLE be_orders DROP COLUMN IF EXISTS edition_id;

ALTER TABLE be_order_intake DROP COLUMN IF EXISTS speed_bump;
ALTER TABLE be_order_intake DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE be_order_intake DROP COLUMN IF EXISTS full_birth_name;
ALTER TABLE be_order_intake DROP COLUMN IF EXISTS display_first_name;
ALTER TABLE be_order_intake DROP COLUMN IF EXISTS edition_version;
ALTER TABLE be_order_intake DROP COLUMN IF EXISTS edition_id;
