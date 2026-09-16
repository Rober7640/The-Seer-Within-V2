-- Backend-deck shipments — one parcel per paid PHYSICAL backend booking (06 Wishing
-- Bracelet, 09 Heart Cleanser Love Charm).
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds, so unrelated drift in schema.ts would reach production with it.
--
-- ⚠ Apply BEFORE deploying the code that writes it. Until the table exists every physical
--   backend sale logs "be_shipments: WRITE FAILED" and the operator gets the fallback
--   "NOT RECORDED" alert instead — the parcel is not lost, but mark-shipped cannot work.
--
-- Purely additive: one new table, four indexes, and ADD COLUMN IF NOT EXISTS lines. Nothing
-- is dropped, rewritten or back-filled, and no existing row is read or modified. Safe to
-- re-run (IF NOT EXISTS / IF EXISTS throughout).
--
-- Amended 2026-09-16 (Joel, "skip"): + seven address columns on the EXISTING be_upsell_orders
-- table, at the bottom of this file. The post-purchase upsells no longer ask a 09/06 buyer to
-- retype the address she gave at checkout, so the upsell ORDER ROW is now the place that
-- records where that upsell's parcel goes.
-- ⚠ Apply before deploying, exactly like the table below. Until those columns exist every
--   backend upsell order insert fails and its attribution row is lost — non-fatal (she is
--   still charged, and the address is still on the Stripe PaymentIntent the shipper reads),
--   but the row someone packs from would be missing.
--
-- Amended 2026-09-15, before it was applied anywhere: + bump_purchased / bump_product_key for
-- 09's order bump (Reiki charging before packing, 09-C3). ⛔ Deliberately touches nothing
-- on be_orders — production may lack the 07/08 be_orders columns, and this table must not
-- depend on that table being healthy (no foreign key on be_order_id, on purpose).

CREATE TABLE IF NOT EXISTS be_shipments (
  id                        VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The booking Checkout session = the order. UNIQUE so the webhook and the order-lookup
  -- retry can both upsert: exactly one row per session, however often Stripe retries.
  stripe_session_id         TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id  TEXT,
  -- Soft link to be_orders.id. NULL when the be_orders write failed. No FK on purpose.
  be_order_id               VARCHAR,

  offer                     TEXT NOT NULL,            -- pixiu-bracelet | heart-cleanser
  offer_number              TEXT NOT NULL,            -- 06 | 09
  sku                       TEXT NOT NULL,            -- the offer's Stripe product, e.g. be_heart_cleanser
  quantity                  INTEGER NOT NULL DEFAULT 1,

  -- The order bump (checkout's metadata.bump = '1'). 09's is Reiki charging BEFORE PACKING,
  -- a real service done by hand (09-C3), so the operator alert leads with it.
  bump_purchased            BOOLEAN NOT NULL DEFAULT false,
  bump_product_key          TEXT,                     -- e.g. reiki_charge; NULL without the bump

  email                     TEXT,
  -- The SHIPPING address from Stripe Checkout. ⛔ Never the billing address.
  recipient_name            TEXT,
  phone                     TEXT,
  line1                     TEXT,
  line2                     TEXT,
  city                      TEXT,
  state                     TEXT,
  postal_code               TEXT,
  country                   TEXT,                     -- ISO alpha-2
  -- Paid, but Stripe carried no usable shipping address. The operator alert says so.
  address_missing           BOOLEAN NOT NULL DEFAULT false,

  status                    TEXT NOT NULL DEFAULT 'pending',   -- pending | shipped | cancelled

  -- Filled by POST /api/admin/shipments/:id/shipped.
  carrier                   TEXT,
  tracking_number           TEXT,
  tracking_url              TEXT,                     -- https only
  shipped_at                TIMESTAMPTZ,
  -- The AWeber shipped-tag write that sends her tracking email. NULL + error ⇒ re-POST retries.
  shipped_list_written_at   TIMESTAMPTZ,
  shipped_list_error        TEXT,

  -- The "post this parcel" email to ORDERS_NOTIFY_EMAIL. NULL + error ⇒ retried later.
  operator_alerted_at       TIMESTAMPTZ,
  operator_alert_error      TEXT,

  cancelled_at              TIMESTAMPTZ,
  cancel_reason             TEXT,                     -- e.g. 'refunded'

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No-ops on a fresh run (the CREATE above has both columns). They exist so a database that
-- ran this file's FIRST version (without the bump columns) still gets them.
ALTER TABLE be_shipments ADD COLUMN IF NOT EXISTS bump_purchased BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE be_shipments ADD COLUMN IF NOT EXISTS bump_product_key TEXT;

CREATE INDEX IF NOT EXISTS idx_be_shipments_status ON be_shipments (status, created_at);
CREATE INDEX IF NOT EXISTS idx_be_shipments_offer ON be_shipments (offer, created_at);
-- charge.refunded finds the parcel by its PaymentIntent.
CREATE INDEX IF NOT EXISTS idx_be_shipments_payment_intent ON be_shipments (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_be_shipments_email ON be_shipments (email);

-- ── be_upsell_orders · where an UPSELL parcel goes (added 2026-09-16) ───────────────────
-- Both backend upsells ship a physical object (the Protection Ritual's charged stone, the
-- Manifestation Bracelet). The address rides on the upsell PaymentIntent — copied from the
-- BOOKING checkout for a `collectsShipping` offer (09, 06), where the chat no longer asks
-- for it, or typed into the shipping form on every other offer — and is recorded here by
-- server/lib/beUpsellOrders.ts.
--
-- ⚠ `ALTER TABLE IF EXISTS` on purpose: be_upsell_orders is created from shared/schema.ts
--   and has no CREATE migration of its own, so on a database where it was never pushed this
--   is a no-op notice instead of a failed migration.
-- ⛔ Existing rows keep NULLs. That is honest — nobody recorded an address on the row at the
--    time, and it is still readable on the Stripe payment.
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS line1          TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS line2          TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS city           TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS state          TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS postal_code    TEXT;
ALTER TABLE IF EXISTS be_upsell_orders ADD COLUMN IF NOT EXISTS country        TEXT;  -- ISO alpha-2

-- Verify:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'be_shipments' ORDER BY ordinal_position;
--
-- Every paid parcel not yet posted:
--   SELECT id, offer, recipient_name, country, address_missing, created_at
--   FROM be_shipments WHERE status = 'pending' ORDER BY created_at;
--
-- Every pending parcel that must be Reiki-charged before it is packed (09-C3):
--   SELECT id, recipient_name, country, created_at FROM be_shipments
--   WHERE status = 'pending' AND bump_purchased AND bump_product_key = 'reiki_charge'
--   ORDER BY created_at;
--
-- Every parcel whose operator alert never went out:
--   SELECT id, stripe_session_id, operator_alert_error FROM be_shipments
--   WHERE operator_alerted_at IS NULL AND status = 'pending';
--
-- Every shipped parcel whose tracking email write failed:
--   SELECT id, stripe_session_id, shipped_list_error FROM be_shipments
--   WHERE status = 'shipped' AND shipped_list_written_at IS NULL;
