-- Down for 2026-09-13-be-08-editions.sql.
--
-- ⛔ DESTRUCTIVE. Dropping be_08_editions throws away every published edition — the spreads
-- each paid order was dealt from (be_orders pins them by id + version). Re-publishable from
-- local/08-marcus/editions.json ONLY if that file still holds every version ever sold.
-- Dropping fulfilment_note loses the support queue. Take a dump first.
--
-- ⛔ Touches nothing 07 owns, and nothing from 2026-09-13-be-08-marcus.sql.

ALTER TABLE be_orders DROP COLUMN IF EXISTS fulfilment_note;
DROP TABLE IF EXISTS be_08_editions;
