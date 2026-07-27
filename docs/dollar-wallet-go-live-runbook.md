# Dollar-Wallet Go-Live Runbook (coin → cent cutover)

**Change:** switch the V2 chat wallet from the internal "coin = 1 second" model to a real
**dollar wallet where 1 coin = 1 cent**, rate `personas.coins_per_minute` = cents/min
(default **299 = $2.99/min**). Customers see dollars + minutes; nothing shows "coins."

**Branch:** `feat/per-minute-pricing` (currently local + uncommitted)
**Author:** Mike / Claude · **Created:** 2026-07-24
**Companion docs:** `docs/coin-to-minute-build-plan.md`, `docs/per-persona-pricing-plan.md`
**Migration:** `scripts/migrate-coins-to-cents.ts` (dry-run prints the prod SQL used below)

> **Status: NOT YET SCHEDULED.** This runbook is the checklist that has to go fully green
> *before* a cutover date is picked. Do not deploy the code to Production without running the
> migration in the same maintenance window — see §1.

---

## 0. What actually changes (plain language)

- Today a "coin" is a **second** of chat and every guide burns at 60/min. Balances, free
  trials, and promo grants are all stored in those second-coins.
- After cutover a "coin" is a **cent**. A $10 pack grants 1000 coins (= $10). Evelyn's rate
  is 299 (= $2.99/min), so the app *derives* minutes from `balance ÷ rate` per guide.
- **Every existing balance must be multiplied by 299/60** so nobody's *time* changes. A user
  who has 3:00 today (180 old-coins) must end up with 897 new-coins — still 3:00 at $2.99/min.
  That multiply is the migration. It also converts persona free-grants and promo grants.

---

## 1. The core risk — the "5× window" (read this first)

**There is no feature flag.** The new code *always* does cents math; nothing in the app checks
whether the database has been migrated. So the database and the running code must flip together.
If they disagree, every balance is mis-valued by ~5× (299 ÷ 60 ≈ 4.98):

| Situation | What a customer with 30:00 (1800 old-coins) sees | Who gets hurt |
|---|---|---|
| **New code live, DB NOT migrated** | 1800 read as 1800¢ = **$18 ≈ 6 min** — loses ~80% of their time, and bills ~5× too fast | ❌ **customer robbed → chargebacks** |
| **DB migrated, old code still live** | balance ×5 but billed at the old rate → **~5× free time** | 💸 revenue leak (recoverable, no customer harm) |
| **DB migrated AND new code live** | 9000¢ = $90 = 30:00 at $2.99/min — **unchanged** ✅ | nobody |

**Conclusion:** the only safe cutover eliminates the window. Run the migration and deploy the
new code inside **one short maintenance pause** at a low-traffic hour, with **no chat sessions
billing in between.** If something stalls mid-cutover, the fail-safe order below leaves you in
the *revenue-leak* row, never the *customer-robbed* row.

---

## 2. Pre-flight — all must be GREEN before scheduling a date

### 2a. Land the code
- [ ] Commit the branch (the whole dollar-wallet change is currently uncommitted working tree;
      `scripts/migrate-coins-to-cents.ts` is untracked).
- [ ] Open PR `feat/per-minute-pricing` → `rober/development`; get it reviewed and merged.
- [ ] **Merge note (low risk):** since the branch base (`dd0436f`), Lewis's development work
      touches 4 of the same files, all *additive, in unrelated regions*:
      `shared/types.ts` (+8, fb-palm identity), `shared/schema.ts` (+13, thumb-angle experiment
      columns — **not** the wallet columns), `package.json` (+1), `improve-v2/eval/cases.json`
      (+294, B16/B12 cases — take both). Resolve by keeping both sides; then re-run `test:price`.

### 2b. Prove it on dev / staging
- [ ] `npm run test:price` → **133/133** green after the merge.
- [ ] Run the app against a migrated dev DB and do a **real Stripe test purchase** ($10 →
      wallet shows **+$10** → chat bills at $2.99/min → paywall fires at $0). Repeat for **PayPal
      sandbox**. (This end-to-end purchase round-trip is the one thing unit tests can't cover and
      has NOT been done yet.)
- [ ] Confirm a pre-existing dev user's balance shows the **same minutes** after migration as before.

### 2c. Prep the production migration
- [ ] Dry-run the migration against **prod** to see real counts (read-only, writes nothing):
      ```
      npx tsx scripts/migrate-coins-to-cents.ts        # NO --apply → dry run + prints SQL
      ```
      Confirm the printed user / persona / promo counts look sane. ⚠️ Prod `DATABASE_URL` must be
      the **:5432 session pooler**, not :6543 (see memory: 6543 is broken).
- [ ] Confirm the **current** per-guide rates on prod (`SELECT slug, coins_per_minute FROM personas`).
      On a virgin prod every active guide reads 60.
      **DECISION 2026-07-27: shipping DIVERGENT rates — Luna $3.50 (350), Marcus $4.25 (425),
      everyone else $2.99 (299).** The migration itself only produces the flat 299; the premium
      rates are a separate statement afterwards (§D of the SQL companion). Whenever a rate is set,
      that guide's `free_coins` must be reset to `3 × rate` or it silently stops giving a 3:00
      free trial — the admin editor changes the rate only.
- [ ] Line up a DB backup / snapshot plan (§4) and a named low-traffic window.
- [ ] **All copy-paste SQL — backup, migration, premium rates, verification, rollback — is in
      `docs/dollar-wallet-migration-sql.md`.** The backup/rollback round-trip in that file was
      verified against a real DB (simulated wipe → byte-identical restore, 0 drifted rows).

---

## 3. The cutover (execute in order, minimise the gap)

> Fail-safe ordering = **migrate first, deploy second.** If the deploy stalls after the SQL,
> you land in the *revenue-leak* row (customers over-credited), never *robbed*.

1. [ ] **Announce + freeze.** At the chosen low-traffic time, stop new chat sessions from
       billing across the swap. Simplest: put up a brief "back in a few minutes" state, or run at
       a genuinely dead hour. End/close any **active** sessions first — a session that started
       pre-migration snapshots the old rate and would bill inconsistently if it checkpoints after.
2. [ ] **Snapshot.** Take a Supabase point-in-time marker (or dump `users`, `personas`,
       `promo_grants`). This is the real rollback path — the forward multiply rounds, so an inverse
       multiply is **not** a clean undo.
3. [ ] **Run the migration SQL on prod** (one transaction, idempotent — guarded by
       `system_config.wallet_unit`). Paste from the dry-run output; it is:
       ```sql
       BEGIN;
       -- 1. Wallets: preserve minutes (N coins → same minutes at 299¢/min)
       UPDATE users SET
         coin_balance     = ROUND(coin_balance::numeric     * 299 / 60),
         total_coins_used = ROUND(total_coins_used::numeric * 299 / 60);
       -- 2. Personas: legacy 60 coins/min → 299¢/min; free grant preserves minutes
       UPDATE personas SET
         free_coins       = ROUND(free_coins::numeric * 299 / 60),
         coins_per_minute = 299
       WHERE coins_per_minute = 60;
       -- 3. Promo grants: preserve promo minutes
       UPDATE promo_grants SET
         coins_granted   = ROUND(coins_granted::numeric   * 299 / 60),
         coins_remaining = ROUND(coins_remaining::numeric * 299 / 60),
         coins_spent     = ROUND(coins_spent::numeric     * 299 / 60);
       -- 4. Mark migrated (idempotency guard — makes any re-run a no-op)
       INSERT INTO system_config (config_key, config_value, config_type)
         VALUES ('wallet_unit', 'cents', 'text')
         ON CONFLICT (config_key) DO UPDATE SET config_value = 'cents';
       COMMIT;
       ```
4. [ ] **Verify the SQL landed:** `SELECT config_value FROM system_config WHERE config_key='wallet_unit';`
       → `cents`. Spot-check one known user: their `coin_balance` should be ~5× its pre-migration
       value, and `personas.coins_per_minute` = 299 for all.
5. [ ] **Deploy the new code** (merge `development` → `Production`, Railway deploy).
6. [ ] **Confirm the running instance is on the new build** (deploy hash / health check).
7. [ ] **Unfreeze** — allow sessions again.

---

## 4. Post-cutover verification (within ~15 min, before walking away)

- [ ] `GET /api/credits/pricing` returns cents-based packs at **$2.99/min** for every persona,
      with a top-level `coinsPerMinute` of 299.
- [ ] Log in as a **real pre-existing customer** (or the test account) → balance shows the **same
      minutes** as before the cutover, expressed in dollars in the nav badge.
- [ ] **One real low-value purchase** on prod ($10 pack, live card) → wallet increases by **$10**,
      chat bills correctly, receipt/Stripe product name reads in minutes not coins. Refund it after.
- [ ] Watch logs for **`BILLING_CORRUPTION_DETECTED` / `BILLING_ANOMALY`** — should stay silent.
      The safety caps are now rate-aware, so a normal session must not trip them.
- [ ] Confirm a free-trial signup grants **3:00** (897¢), and a promo/voucher grants its intended
      minutes.

---

## 5. Rollback

**Trigger:** customers report wrong balances, billing anomalies in logs, or the purchase test
mis-grants.

1. [ ] **Redeploy the previous Production build** (old coin=second code).
2. [ ] **Restore `users`, `personas`, `promo_grants` from the §3.2 snapshot.** Do **not** try an
       inverse `× 60 / 299` — it rounds and won't perfectly restore cents-level balances.
3. [ ] **Clear the idempotency flag** so a future re-run migrates again:
       `DELETE FROM system_config WHERE config_key='wallet_unit';` (or set it back to the prior value).
4. [ ] Post-restore, spot-check the same known user is back to their original balance.

> Because code rollback + data restore are two separate steps, keep the maintenance window open
> until §4 is green. Rolling back after real post-cutover purchases/charges have landed is messier
> (those grants were in cents) — decide the point-of-no-return before starting.

---

## 6. Known caveats (non-blocking, but know them)

- **Analytics across the cutover date mix units.** The migration converts *live* balances only.
  Historical `chat_sessions.coins_charged` and `credit_purchases` rows stay in old second-coins;
  new rows are in cents. Any report that SUMs those columns across the cutover date is comparing
  two units — segment by date, or convert, when reading them.
- **Per-persona divergent $/min is SHIPPING (decision 2026-07-27, supersedes "deferred").**
  Luna $3.50, Marcus $4.25, the rest $2.99. Tested end-to-end: a real Stripe test purchase against
  Luna credits the exact dollars paid (the wallet is shared — a pack costs the same for everyone,
  only the time it buys differs), and the money-path Playwright suite asserts each guide renders
  its own rate. Whenever any rate changes, reset that guide's `free_coins` to `3 × rate` — the
  admin editor does not, which is how Marcus ended up offering 2:07 free instead of 3:00.
- **🔴 Never run `npm run seed` from a build older than `8947624`.** It contains
  `UPDATE personas SET coins_per_minute = 60` with **no WHERE clause**, wiping every guide's rate.
  Post-migration that reads as **$0.60/min** with a ~15-minute free trial and nothing alarms. This
  already destroyed Luna's $3.50 once on dev. Re-running the migration will NOT repair it — the
  `wallet_unit` guard makes it a no-op. Recovery is the premium-rate SQL plus `npm run verify:wallet`.
- **`OutOfCreditsModal.tsx` is dead code** (nothing renders it) — its stale fallback prices can't
  reach a customer. Safe to delete separately.

---

## 7. Sign-off

| Gate | Owner | Done |
|---|---|---|
| Branch committed + PR merged to development | Mike / Robert | ☐ |
| `test:price` 133/133 after merge | Mike | ☐ |
| Stripe **and** PayPal purchase round-trip on dev | Mike | ☐ |
| Prod migration dry-run reviewed (counts sane) | Joel / Robert | ☐ |
| Backup/snapshot plan confirmed | Robert | ☐ |
| Maintenance window scheduled (low-traffic) | Joel | ☐ |
| Cutover executed (§3) | Robert | ☐ |
| Post-cutover verification green (§4) | Mike / Joel | ☐ |
