-- Down for 2026-09-03-be-07-daily.sql.
--
-- ⛔ DESTRUCTIVE. Dropping be_07_draws throws away the record of which cards each
-- morning dealt — the thing every already-sent reading was written from. Dropping
-- be_07_reading_grades throws away the only record that a failed reading was sent
-- anyway. Neither is reconstructable from Stripe. Take a dump first.

DROP TABLE IF EXISTS be_order_intake;
DROP TABLE IF EXISTS be_07_reading_grades;
DROP TABLE IF EXISTS be_07_draws;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question_3;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question_2;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question;
ALTER TABLE be_orders DROP COLUMN IF EXISTS topic;
ALTER TABLE be_orders DROP COLUMN IF EXISTS tier;
ALTER TABLE be_orders DROP COLUMN IF EXISTS draw_date;
ALTER TABLE be_orders DROP COLUMN IF EXISTS spread_key;
