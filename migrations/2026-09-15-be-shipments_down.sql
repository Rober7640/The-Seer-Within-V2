-- Down for 2026-09-15-be-shipments.sql.
--
-- ⛔ DESTRUCTIVE. Dropping be_shipments throws away every parcel's address, whether it was
-- posted, its tracking link and why it was cancelled. The addresses can be re-read from
-- Stripe; the shipped/cancelled history and tracking cannot. Take a dump first.
--
-- Touches nothing else — be_orders and every other backend table are left exactly as
-- they are.

DROP INDEX IF EXISTS idx_be_shipments_email;
DROP INDEX IF EXISTS idx_be_shipments_payment_intent;
DROP INDEX IF EXISTS idx_be_shipments_offer;
DROP INDEX IF EXISTS idx_be_shipments_status;
DROP TABLE IF EXISTS be_shipments;
