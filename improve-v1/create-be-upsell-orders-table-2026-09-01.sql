-- ============================================================================
-- CREATE the be_upsell_orders table. One row per backend upsell PaymentIntent,
-- stamped with the originating offer so upsell revenue attributes to its lander.
-- Mirrors shared/schema.ts (beUpsellOrders). Idempotent. Run ONCE on PROD.
-- (Dev gets it via `npm run db:push`.)
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS be_upsell_orders (
  id                       varchar PRIMARY KEY DEFAULT gen_random_uuid(),

  stripe_payment_intent_id text NOT NULL UNIQUE,
  booking_session_id       text,

  offer                    text NOT NULL,
  offer_number             text NOT NULL,

  product                  text NOT NULL,
  tier                     text NOT NULL DEFAULT 'full',

  amount_cents             integer NOT NULL,
  currency                 text NOT NULL DEFAULT 'usd',

  email                    text,
  first_name               text,

  created_at               timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_be_upsell_orders_offer   ON be_upsell_orders (offer, created_at);
CREATE INDEX IF NOT EXISTS idx_be_upsell_orders_product ON be_upsell_orders (product);

SELECT to_regclass('public.be_upsell_orders') AS be_upsell_orders_exists; -- expect 'be_upsell_orders'

COMMIT;
