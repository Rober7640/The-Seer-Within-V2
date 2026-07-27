# Dollar-Wallet Migration — copy-paste SQL

Companion to `docs/dollar-wallet-go-live-runbook.md`. Every statement here is meant to be
pasted into a prod SQL console **in order**.

> **Schema verified against PRODUCTION 2026-07-27.** Every column referenced below exists on
> prod, and prod's coin-bearing columns are identical to local — 13 columns across 7 tables,
> all `integer`. There is no live balance column the migration skips.
> `users.welcome_coins_granted_at` matches a `%coin%` search but is a `timestamp` (it records
> *when* the welcome grant was given) and must never be multiplied — §C correctly touches only
> `coin_balance` and `total_coins_used`.

> **Connection:** prod `DATABASE_URL` must use the **:5432 session pooler**, not `:6543`.
> Port 6543 throws intermittent `42P01 relation does not exist` under load — it would abort
> a migration halfway.

> **The one thing to understand before starting.** The forward conversion is
> `ROUND(x * 299 / 60)`. Rounding is **lossy**, so `ROUND(y * 60 / 299)` does **not** reliably
> return the original number. There is no arithmetic undo. **The snapshot in §B is the only
> real rollback.** Do not skip it.

Replace the `20260727` suffix with your actual cutover date throughout.

---

## §A. Pre-flight (read-only — run before anything, confirm the numbers look sane)

```sql
-- Has the migration already run? Expect 0 rows on a virgin prod.
SELECT config_key, config_value FROM system_config WHERE config_key = 'wallet_unit';

-- What will be converted.
SELECT count(*) AS users_with_balance, COALESCE(sum(coin_balance),0) AS total_coins
FROM users WHERE coin_balance > 0;

SELECT count(*) AS personas_at_legacy_60 FROM personas WHERE coins_per_minute = 60;

SELECT count(*) AS active_promo_grants, COALESCE(sum(coins_remaining),0) AS promo_coins
FROM promo_grants WHERE coins_remaining > 0;

-- Current per-guide rates. On a virgin prod every active guide should read 60.
SELECT slug, coins_per_minute, free_coins, is_active FROM personas ORDER BY slug;
```

### A1. Integer-overflow headroom — MUST pass before §C

Every coin column is `integer` (max 2,147,483,647) and §C multiplies by ~4.98. Any row above
**431,000,000** overflows and aborts the whole transaction. Realistically impossible, but a
single bad test row would kill the migration mid-cutover, so check rather than assume:

```sql
SELECT
  (SELECT COALESCE(max(coin_balance),0)     FROM users)        AS max_user_balance,
  (SELECT COALESCE(max(total_coins_used),0) FROM users)        AS max_user_used,
  (SELECT COALESCE(max(coins_granted),0)    FROM promo_grants) AS max_promo_granted,
  431000000 AS overflow_threshold;
```

All three must be well under the threshold.

### A2. The `ON CONFLICT` target must actually exist — MUST pass before §C

§C ends with `INSERT ... ON CONFLICT (config_key)`. That requires a UNIQUE index or constraint
on `system_config.config_key`. If prod lacks one, the statement raises
`there is no unique or exclusion constraint matching the ON CONFLICT specification`, and because
§C is one transaction **the entire migration rolls back** — after appearing to work.

```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'system_config' AND indexdef ILIKE '%UNIQUE%';
```

Expect an index on `(config_key)`. If none exists, either add one first:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS system_config_config_key_key
  ON system_config (config_key);
```

…or replace step 4 of §C with a plain conditional insert:

```sql
DELETE FROM system_config WHERE config_key = 'wallet_unit';
INSERT INTO system_config (config_key, config_value, config_type)
  VALUES ('wallet_unit', 'cents', 'text');
```

---

## §B. Backup — the real rollback path (run immediately before §C)

Two layers. Do **both**.

**B1 — Supabase point-in-time snapshot.** Take it from the dashboard and note the timestamp.
This is your outer safety net if anything outside these three tables goes wrong.

**B2 — Column snapshots.** These are what §F restores from:

```sql
DROP TABLE IF EXISTS _bak_users_wallet_20260727;
CREATE TABLE _bak_users_wallet_20260727 AS
  SELECT id, coin_balance, total_coins_used FROM users;

DROP TABLE IF EXISTS _bak_personas_rate_20260727;
CREATE TABLE _bak_personas_rate_20260727 AS
  SELECT id, slug, coins_per_minute, free_coins FROM personas;

DROP TABLE IF EXISTS _bak_promo_grants_20260727;
CREATE TABLE _bak_promo_grants_20260727 AS
  SELECT id, coins_granted, coins_remaining, coins_spent FROM promo_grants;

-- Confirm the snapshots are populated BEFORE migrating.
SELECT
  (SELECT count(*) FROM _bak_users_wallet_20260727)  AS users_backed_up,
  (SELECT count(*) FROM _bak_personas_rate_20260727) AS personas_backed_up,
  (SELECT count(*) FROM _bak_promo_grants_20260727)  AS promos_backed_up;
```

Those three counts must match the live table counts. If any is 0, **stop**.

---

## §C. The migration (one transaction)

Equivalent to what `npx tsx scripts/migrate-coins-to-cents.ts --apply` executes. Run either the
script or this SQL — **not both.**

> **⚠️ Step 0 is not optional.** The `users` and `promo_grants` updates have no natural guard
> (unlike `personas`, which is protected by `WHERE coins_per_minute = 60`). Running this block
> twice multiplies every balance twice: a 3:00 wallet becomes **14:57** — verified, not
> theoretical. The TypeScript script refuses to re-run; raw SQL pasted into a console has no
> such protection, so step 0 adds it. It aborts the whole transaction if the migration already
> ran, leaving the data untouched.

```sql
BEGIN;

-- 0. IDEMPOTENCY GUARD — abort loudly if this has already been applied.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM system_config
             WHERE config_key = 'wallet_unit' AND config_value = 'cents') THEN
    RAISE EXCEPTION
      'ALREADY MIGRATED: system_config.wallet_unit is already ''cents''. Aborting so balances are not converted twice.';
  END IF;
END $$;

-- 1. Wallets: preserve MINUTES (N coins @60/min → same minutes @299¢/min)
UPDATE users SET
  coin_balance     = ROUND(coin_balance::numeric     * 299 / 60),
  total_coins_used = ROUND(total_coins_used::numeric * 299 / 60);

-- 2. Personas: legacy 60 coins/min → 299¢/min ($2.99); free grant preserves minutes.
--    The WHERE guard deliberately leaves any already-customised rate alone.
UPDATE personas SET
  free_coins       = ROUND(free_coins::numeric * 299 / 60),
  coins_per_minute = 299
WHERE coins_per_minute = 60;

-- 3. Promo grants: preserve promo minutes
UPDATE promo_grants SET
  coins_granted   = ROUND(coins_granted::numeric   * 299 / 60),
  coins_remaining = ROUND(coins_remaining::numeric * 299 / 60),
  coins_spent     = ROUND(coins_spent::numeric     * 299 / 60);

-- 4. Mark migrated so the app and the script never double-convert
INSERT INTO system_config (config_key, config_value, config_type)
  VALUES ('wallet_unit', 'cents', 'text')
  ON CONFLICT (config_key) DO UPDATE SET config_value = 'cents';

COMMIT;
```

---

## §D. Set the premium per-guide rates (only if shipping divergent pricing)

§C leaves every guide at the flat $2.99. Run this **only** if you are shipping
Luna $3.50 / Marcus $4.25.

`free_coins` must be reset alongside the rate, otherwise the guide silently stops giving a
3:00 free trial (897¢ at $4.25/min is 2:07, not 3:00). The admin editor does **not** do this
for you — it changes the rate only.

```sql
BEGIN;
UPDATE personas SET coins_per_minute = 350, free_coins = 3 * 350  -- $3.50/min, 3:00 free = 1050
  WHERE slug = 'luna-voss';
UPDATE personas SET coins_per_minute = 425, free_coins = 3 * 425  -- $4.25/min, 3:00 free = 1275
  WHERE slug = 'marcus-stone';
COMMIT;
```

---

## §E. Verify (run within minutes of the deploy — do not walk away first)

```sql
-- 1. Flag is set.
SELECT config_value FROM system_config WHERE config_key = 'wallet_unit';   -- expect: cents

-- 2. Nothing left on the legacy rate. MUST be 0 — a 60 here means $0.60/min.
SELECT count(*) AS still_at_60 FROM personas WHERE coins_per_minute = 60 AND is_active;

-- 3. Every active guide's rate + the free trial it actually buys.
SELECT slug,
       coins_per_minute AS cents_per_min,
       free_coins,
       ROUND(free_coins::numeric / coins_per_minute, 2) AS free_minutes  -- expect 3.00
FROM personas WHERE is_active ORDER BY slug;

-- 4. THE IMPORTANT ONE — minutes preserved for real wallets.
--    before_min and after_min must match to ~0.01. If after_min is ~5x before_min,
--    the multiply ran twice; if ~1/5, the code deployed against un-migrated data.
SELECT u.id,
       b.coin_balance AS before_coins,
       u.coin_balance AS after_cents,
       ROUND(b.coin_balance::numeric / 60,  2) AS before_min,
       ROUND(u.coin_balance::numeric / 299, 2) AS after_min
FROM users u
JOIN _bak_users_wallet_20260727 b ON b.id = u.id
WHERE b.coin_balance > 0
ORDER BY b.coin_balance DESC
LIMIT 10;
```

Then, from the repo (this reads the same things and exits non-zero on failure, so it can gate
the release):

```
npm run verify:wallet -- --expect luna-voss=350,marcus-stone=425
```

---

## §F. Rollback

**Order matters: redeploy the OLD build first, then restore the data.** Old code on migrated
data over-credits customers; new code on restored data robs them. Over-crediting is the safer
state to sit in for a few minutes.

```sql
BEGIN;

UPDATE users u SET
  coin_balance     = b.coin_balance,
  total_coins_used = b.total_coins_used
FROM _bak_users_wallet_20260727 b
WHERE u.id = b.id;

UPDATE personas p SET
  coins_per_minute = b.coins_per_minute,
  free_coins       = b.free_coins
FROM _bak_personas_rate_20260727 b
WHERE p.id = b.id;

UPDATE promo_grants g SET
  coins_granted   = b.coins_granted,
  coins_remaining = b.coins_remaining,
  coins_spent     = b.coins_spent
FROM _bak_promo_grants_20260727 b
WHERE g.id = b.id;

-- Clear the idempotency flag so a future attempt can migrate again.
DELETE FROM system_config WHERE config_key = 'wallet_unit';

COMMIT;
```

Then confirm a known user is back:

```sql
SELECT u.id, u.coin_balance, b.coin_balance AS expected
FROM users u JOIN _bak_users_wallet_20260727 b ON b.id = u.id
WHERE u.coin_balance <> b.coin_balance;      -- expect 0 rows
```

### Two limits of this rollback — know them before you start

1. **Rows created after the snapshot are not in it.** `UPDATE ... FROM` only touches matching
   ids, so anyone who signed up post-cutover keeps a cents-denominated balance that old code
   will read as seconds — they'll appear to have ~5× the time. Find them with:
   ```sql
   SELECT id, email, coin_balance FROM users
   WHERE id NOT IN (SELECT id FROM _bak_users_wallet_20260727);
   ```
   Decide per row (usually: divide by 299/60, or leave as goodwill).

2. **Real purchases after the cutover were granted in cents.** Restoring the snapshot erases
   them. Past the first live purchase, rollback means manually re-granting those buyers.
   **Agree the point-of-no-return before you begin** — realistically, the first completed
   purchase.

---

## §G. Cleanup (only after a few days of clean running)

```sql
DROP TABLE IF EXISTS _bak_users_wallet_20260727;
DROP TABLE IF EXISTS _bak_personas_rate_20260727;
DROP TABLE IF EXISTS _bak_promo_grants_20260727;
```

---

## Standing hazard after go-live

Never let anything run `npm run seed` from a build older than `8947624`. That version contains

```sql
UPDATE personas SET coins_per_minute = 60;   -- no WHERE clause
```

which wipes every guide's rate. Post-migration that means **$0.60/min** and a ~15-minute free
trial, with nothing alarming. It is what erased Luna's $3.50 on dev. Re-running the migration
will **not** repair it (the `wallet_unit` guard makes it a no-op) — recovery is §D plus
`npm run verify:wallet`.
