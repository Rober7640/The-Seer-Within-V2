# Backup Stripe Account — Go-Live Runbook

**Status:** Code complete (all 3 phases), local-only — **not yet pushed to dev/prod** (as of 2026-06-26).
**Companion docs:** [`backup-stripe-account-plan.md`](./backup-stripe-account-plan.md) (the plan & rationale).

This runbook is the operational checklist: how to ship the code, prepare Account B,
test it, and — on the bad day — actually switch. The code follows **one principle**:
while `ACTIVE_STRIPE_ACCOUNT=A`, nothing about today's payment flow changes. Account B
stays dormant until a human flips one switch.

---

## What the code already does

| Phase | What it gives you | Key files |
|-------|-------------------|-----------|
| 1 | All Stripe calls resolve the **active account** from `ACTIVE_STRIPE_ACCOUNT`; webhooks verify against **both** accounts' secrets | `server/lib/stripeAccount.ts` |
| 2 | Every payment row is tagged with `stripe_account`; refund/reconciliation lookups use the **creating** account | `shared/schema.ts`, `server/lib/db.ts`, `server/routes/credits.ts`, `server/lib/reconciliationProcessor.ts` |
| 3 | "Smoke alarm" — real charge failures with **account-level** errors raise a throttled alert | `server/lib/stripeAccountAlert.ts` |

**Detection is automatic. The switch is manual, by design.**

---

## Part A — One-time prep (do this while everything is calm)

### A1. Build Account B in the Stripe dashboard
> ⚠️ **Gating prerequisite:** Account B must be a **genuinely separate legal entity / bank /
> statement descriptor.** Stripe auto-links and freezes duplicate accounts for the same
> business; a linked B can be frozen alongside A exactly when you need it. (Confirmed handled 2026-06-26.)

- [ ] Open & verify Account B (business + bank details).
- [ ] **Products/prices: not required to recreate.** All checkouts build the product name
      + price inline (`price_data`) at charge time, so Account B needs **no** pre-made
      Product/Price objects for payments to work. If you still want them in B's catalog for
      dashboard/receipt tidiness, the full list of customer-facing names and prices is in
      **[Appendix — Product / charge reference](#appendix--product--charge-reference)**.
- [ ] Create **two** webhook endpoints in Account B's dashboard, pointing at the same URLs:
  - `…/api/webhooks/stripe`  → capture signing secret → `STRIPE_TRACKDESK_WEBHOOK_SECRET_B`
  - `…/api/credits/webhook`  → capture signing secret → `STRIPE_CREDITS_WEBHOOK_SECRET_B`
  - Subscribe each to the same events Account A's endpoints use (at minimum
    `checkout.session.completed`, plus `payment_intent.succeeded` if A has it).
- [ ] Redo per-account dashboard settings: **Apple Pay / domain verification**, **statement
      descriptor**, and dispute-evidence templates.

### A2. Set environment variables

**Account A (already live — unchanged):**
```
STRIPE_SECRET_KEY=sk_live_…
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_…
STRIPE_TRACKDESK_WEBHOOK_SECRET=whsec_…      # /api/webhooks/stripe
STRIPE_CREDITS_WEBHOOK_SECRET=whsec_…         # /api/credits/webhook
```

**The switch flag (default A):**
```
ACTIVE_STRIPE_ACCOUNT=A
```

**Account B (set now, kept dormant — harmless while A is active):**
```
STRIPE_SECRET_KEY_B=sk_live_…
STRIPE_TRACKDESK_WEBHOOK_SECRET_B=whsec_…
STRIPE_CREDITS_WEBHOOK_SECRET_B=whsec_…
```
> Webhook verification accepts **both** accounts' secrets, so leaving the `_B` secrets set
> while `ACTIVE_STRIPE_ACCOUNT=A` changes nothing.

**Smoke-alarm delivery (optional — without these the alarm is log-only):**
```
STRIPE_ALERT_EMAIL_TO=ops@…           # comma-separated
STRIPE_ALERT_WEBHOOK_URL=https://…    # Slack/generic incoming webhook
```

### A3. Apply the schema migration
Two additive, nullable columns (`conversations.stripe_account`, `credit_purchases.stripe_account`).
`NULL` = legacy rows → treated as Account A, so **no backfill is needed**.

- [x] **Local dev DB** — done 2026-06-26.
- [ ] **Production DB** — run **before** deploying the code that writes these columns:
  ```
  npm run db:push
  ```
  Expect an additive `ALTER TABLE … ADD COLUMN stripe_account text` on both tables. Safe, no data loss.

---

## Part B — Test before trusting (dev environment)

The code is dormant, but Stripe failures are silent. **Do not call it production-safe on
review alone** — run these against a dev/test Stripe setup:

- [ ] **Account A still works (regression):** with `ACTIVE_STRIPE_ACCOUNT=A`, complete a
      V1 funnel checkout and a V2 coin purchase. Confirm coins/credits granted and rows
      written with `stripe_account = 'A'`.
- [ ] **Both webhook endpoints validate:** send a test event to `…/api/webhooks/stripe`
      and `…/api/credits/webhook`; confirm 200 + correct DB effect.
- [ ] **Dual-secret webhooks:** with both A and B secrets set, confirm an A-signed event
      still validates (during handover, A's late events must keep working).
- [ ] **Switch dry-run:** set `ACTIVE_STRIPE_ACCOUNT=B` (with B's test keys), restart,
      complete a test purchase; confirm it lands in **Account B** and rows tag `'B'`.
      Then set back to `A`.
- [ ] **Smoke alarm:** force an account-level error (e.g. a deliberately invalid/revoked
      `STRIPE_SECRET_KEY`) and confirm a `[STRIPE-ACCOUNT-ALARM]` ERROR log (and email/
      webhook if configured). Confirm a normal **card decline** does **not** trip it.

---

## Part C — Switch day (the actual failover)

Trigger: the smoke alarm fires, or you otherwise learn Account A is restricted/terminated.

1. **Confirm it's real.** Open the Stripe dashboard for Account A. Verify the account is
   genuinely restricted/terminated — **not** a Stripe-wide outage (a backup does NOT help
   for an outage; both accounts are on the same Stripe — just wait it out) and **not** a
   payout/reserve hold (charging still works; switching won't help).
2. **Flip the switch (both vars must change together):**
   ```
   ACTIVE_STRIPE_ACCOUNT = A → B
   VITE_STRIPE_PUBLISHABLE_KEY = <Account A pk> → <Account B pk>
   ```
   > The publishable key only matters for the on-page card form (`StripeCardForm.tsx`);
   > everything else is redirect checkout. But if it doesn't match the active account, that
   > form throws — so always change **both**.
3. **Redeploy.** New charges now go to Account B (a few minutes).
4. **Verify the switch:**
   - [ ] Complete one real (small) purchase end-to-end → confirms B is charging.
   - [ ] New rows show `stripe_account = 'B'`.
   - [ ] `GET /api/health-check` returns `stripeConfigured: true`.
   - [ ] No new `[STRIPE-ACCOUNT-ALARM]` for Account B.

### Servicing old Account A payments after the switch
Account A's secret key stays valid for **reading**, so refunds/disputes/reconciliation on
old A payments keep working — the code routes them by each row's `stripe_account` tag
(`getStripeForRow`). **Keep `STRIPE_SECRET_KEY` (A) set** after switching.

### Rollback (if you switched in error)
Set `ACTIVE_STRIPE_ACCOUNT=A` and `VITE_STRIPE_PUBLISHABLE_KEY` back to A's key, redeploy.
Rows created during the B window stay tagged `'B'` and are correctly serviced on B.

---

## Operational notes

- **Dispute / recovery lookups:** include `stripe_account` in the SELECT so you know which
  account dashboard to open. A row created before this work (or `NULL`) = Account A.
  (Relates to the V1 recovery-checkout playbook and the dispute SQL-handoff workflow.)
- **What the backup does NOT solve:** Stripe-wide outage (wait) and payout/reserve holds
  (banking, not charging). Only **account restricted/terminated** is addressed.
- **Known accepted edge case:** a single `conversations` row aggregates main + upsell
  payment IDs under one `stripe_account` tag. A switch that happens *mid-funnel* (between
  the main purchase and an upsell) could leave older IDs mistagged. Rare (a switch is a
  deploy during a dead account); documented rather than over-engineered into a per-ID tag.
- **Alarm throttle:** account-level alerts are throttled to once per 15 minutes; the ERROR
  log line (`[STRIPE-ACCOUNT-ALARM]`) is always written.

---

## Quick reference — all backup-Stripe env vars

| Var | Purpose |
|-----|---------|
| `ACTIVE_STRIPE_ACCOUNT` | `A` (default) or `B` — the live account |
| `STRIPE_SECRET_KEY` / `_B` | Secret key per account |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Publishable key — swap to B's on switch |
| `STRIPE_TRACKDESK_WEBHOOK_SECRET` / `_B` | `/api/webhooks/stripe` signing secret |
| `STRIPE_CREDITS_WEBHOOK_SECRET` / `_B` | `/api/credits/webhook` signing secret |
| `STRIPE_ALERT_EMAIL_TO` | Smoke-alarm email recipients (optional) |
| `STRIPE_ALERT_WEBHOOK_URL` | Smoke-alarm Slack/generic webhook (optional) |

---

## Appendix — Product / charge reference

> **Important:** the app does **not** use pre-created Stripe Product/Price objects. Every
> charge sets the product name + amount **inline** at checkout time (`price_data` /
> PaymentIntent `description`). So you do **not** need to create any of these in Account B
> for payments to work. This list exists only if you want B's dashboard/receipts to match.
>
> Names marked *(dynamic)* are built from variables at runtime — a funnel suffix (e.g.
> ` - FB2`, ` - GDN`), the persona name, the price variant, or the coin count — so there
> isn't a single fixed string. Prices are illustrative of current values and can change via
> price variants / per-persona pricing.

### V1 funnel (single-session reading + upsells)

| Product (customer-facing name) | Price (current) | Notes |
|---|---|---|
| **Energy Clearing Ritual** *(dynamic suffix)* | $45 / $25 downsell, or $59 / $42 (variant-driven; `$35` is a stale fallback) | Main reading. Desc: "Personalized reading for {firstName}" |
| **Volcanic Stone (aka Black Lava)** — or **Protection Ritual + Volcanic Stone** *(FB funnels)* | ~$47 (variant) | Upsell 1. Desc: "Charged black lava protection talisman" |
| **Manifestation Bracelet** / **Manifestation Bracelet (Attuned)** / **Manifestation Bracelet (Standard)** *(dynamic suffix)* | $47 full / $30 downsell | Upsell 2 |

### Soulmate funnel

| Product | Price | Notes |
|---|---|---|
| **Psychic Soulmate Love Sketch & Reading** | main offer | Desc: "Complete soulmate sketch for {firstName} — 24hr delivery" |
| **Rose Quartz Soulmate Attraction Bracelet** | upsell | |
| **528 Hz Frequency of Love Tuner Necklace** | upsell | Desc: "Mindfulness necklace tuned to 528 Hz — the Love Frequency" |

### V2 chat service — coin packs *(dynamic)*

Name pattern: **`{Persona} - {coins} Coins (+{bonus} bonus)`** (e.g. "Luna - 540 Coins (+180 bonus)").
Personas: **Evelyn Cross, Marcus Stone, Luna, Nova, Maren, Aiden** (per-persona pricing can override the defaults below).

| Pack (`packageType`) | Coins (total) | Price |
|---|---|---|
| `popular` | 540 | $19.99 |
| `best_value` | 900 | $29.99 |
| `premium` (MOST POPULAR) | 1,800 | $49.99 |
| `whale` (BEST DEAL) | 4,500 | $99.99 |
| `welcome` (one-time) | 160 | $2.99 |
| `starter` / `aiden_rescue` | 180 | $9.99 |

> Source of truth in code: V1/soulmate names in `server/routes.ts`; coin packs in
> `shared/types.ts` (`DEFAULT_PRICING`) + special tiers in `server/routes/credits.ts`.
