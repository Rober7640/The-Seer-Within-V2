# V2 Paywall redesign (Variant B) — local turn-on & kill runbook

**Scope:** localhost only. For real/production users the experiment stays `draft` (everyone sees Variant A, today's UI). Actually starting the live A/B is **Joel's decision** — this document only proves readiness and documents the switch.

**Experiment key:** `paywall_copy_2026` · **Phase 1 scope:** Evelyn Cross only · **Arms:** A (control) / B (redesign), 50/50, sticky per `user.id`.

---

## How the switch actually works (verified)

The authoritative control is the **`experiments` table** (not the legacy `system_config.paywall_copy_experiment` row, and not `paywall_views`). `server/lib/experiments.ts` → `assign()` returns the **control arm (A) for everyone unless `status = 'running'`**. Flipping `status` away from `running` is the kill-switch; while not running, **no exposures are logged**.

The local row already exists:

```
key=paywall_copy_2026  status=draft
scope={"personaId":"<evelyn-id>"}
variants=[{"key":"A","weight":50},{"key":"B","weight":50}]
```

---

## 1. QA / view Variant B WITHOUT enabling (preferred for local review)

Append `?paywallVariant=B` to any paywall surface. Works only in non-prod (`NODE_ENV !== 'production'`, or `ALLOW_PAYWALL_QA_OVERRIDE=true`); inert for real prod users.

```
http://localhost:5008/credits?personaId=<evelyn-id>&paywallVariant=B
http://localhost:5008/reading?persona=evelyn-cross&paywallVariant=B
```

Force the control for comparison with `?paywallVariant=A`.

> Local port is **5008** (`.env` `PORT=5008`). Note: `playwright.config.ts` still targets `:5000` — a known local mismatch; use `:5008` by hand.

## 2. Start the A/B (local)

Preferred: the admin UI **`/admin/experiments`** → start `paywall_copy_2026` (it has a start guard that validates arms/scope).

Direct (local DB) equivalent:

```sql
UPDATE experiments
   SET status = 'running', started_at = COALESCE(started_at, now())
 WHERE key = 'paywall_copy_2026';
```

Now enrolled Evelyn users are bucketed 50/50, sticky per `user.id`; every other persona stays on A.

## 3. Kill instantly

```sql
UPDATE experiments SET status = 'draft' WHERE key = 'paywall_copy_2026';
```

`status` of `draft`/`paused`/`concluded` → `assign()` returns A for everyone, byte-identical to today. (`paused` keeps the data; `draft` is the pre-start state.)

## 4. Measurement (conversion by arm)

Tracking is the unified **`experiment_exposures`** table (denominator — one row per first exposure per subject, written by `POST /api/credits/checkout-view` → `logExposure` while the test is running) and **`credit_purchases`** (numerator). The legacy `paywall_views` table and `tallyPaywall.ts` are **deprecated** — do not use.

Run the tally:

```
npx tsx --env-file=.env server/scripts/tallyExperiment.ts paywall_copy_2026
```

Primary metric: exposure → first completed purchase, by variant. Guardrails: revenue per viewer, tier-mix/ARPPU (B pre-selects the mid "MOST CHOSEN" tile), refund rate, checkout-completion % (hold the checkout plumbing constant during the copy test).

---

## Verified locally (2026-10-14)

- `GET /api/credits/pricing?personaId=<evelyn>` → her real `$15/$25` tiers (not the `$10/$20/$30` defaults); dollar-wallet invariant holds.
- `?paywallVariant=B` → `variant:"B"`, tiers re-badged (`MOST CHOSEN` on the mid tile + `recommended`, `BEST VALUE` on the top), honest flat `$2.99/min` ladder line (no false "bigger packs" discount), no "non-refundable" in B.
- Setting `status='running'` + an authenticated `checkout-view` wrote an `experiment_exposures` row; reverting to `draft` restored control. Kill-switch confirmed.

## Still needs a human (can't be scripted)

- Eyeball the four B surfaces in a real browser (modal, out-of-credits, `/credits` store, payment sheet) across the three triggers (0:00 mid-chat, low-balance banner, "Continue Reading").
- Complete a **Stripe sandbox** and a **PayPal sandbox** purchase under B; confirm coins granted + reading resumes (requires entering sandbox card/login by hand).
