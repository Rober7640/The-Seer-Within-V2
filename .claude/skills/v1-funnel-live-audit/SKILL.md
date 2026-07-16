---
name: v1-funnel-live-audit
description: "READ-ONLY analysis of REAL V1 (Evelyn 'Original Conversion Funnel') data — the 'find real issues' half of the V1 loop, the counterpart to V2's persona-audit. Reads the live shared Postgres (read-only, with a proven canary) to surface what REAL users actually hit: conversation-flow drop-off, payment reconciliation gaps, abandoned carts, price-variant corruption in the wild, upsell take-rates, and the fb-palm derail's real impact — then prints a prioritized report. It only RECOMMENDS fixes; it never writes. Use when asked to: find real V1 issues, audit the live funnel/payments, see where real users drop off, check the live price test for corruption, measure the palm derail on real data. Verify LOCALLY first; the live read is flag-gated + confirmation-required."
---

# v1-funnel-live-audit — read-only audit of REAL V1 funnel data

The V1 loop has three skills. The other two are **synthetic** — they prove the *code* is
correct against a sandbox user (`v1-funnel-audit`) and score *prompt quality* offline
(`v1-funnel-eval`). **This one finds the REAL problems**: it reads what actual users did in the
live `conversations` table and reports where they drop off, which payments didn't reconcile,
abandoned carts, price corruption in the wild, upsell take-rates, and how often the fb-palm
derail bites real sessions. It is the V1 counterpart to V2's `persona-audit`.

**It only reads and recommends — it never changes anything.** Findings feed the loop:
**live-audit (find) → `v1-funnel-eval` (score a fix) → `v1-funnel-audit` (regression-check) → human ships.**

## Safety contract (identical to V2's `scripts/pull-buyer-transcripts.ts`)

1. **Read-only, enforced + proven.** Every query runs inside `BEGIN TRANSACTION READ ONLY`, and a
   startup **canary** attempts a write inside that transaction and **ABORTS unless Postgres rejects
   it with SQLSTATE `25006`**. Read-only is proven at the transaction level, not assumed by convention.
2. **Explicit target.** A `localhost`/`127.0.0.1` DB is **LOCAL mode** (safe, no flag) — used to verify
   the queries. A non-local (shared/production) DB requires **both** `--live` **and** the env
   `LIVE_AUDIT_CONFIRM=1`; otherwise it prints the intended target and aborts. (Dev and prod share one
   DB, so any non-local target *is* production.)
3. **PII-safe.** The DB host is redacted in all output; the report is **aggregates only** (no raw
   emails or transcripts) and is written under the gitignored `audit-runs/` tree.

## Run it

```bash
# 1) VERIFY locally first (reads the :5433 sandbox, proves the queries + canary). Safe, no flag.
node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs

# 2) The REAL read-only audit against the live shared DB — deliberate, two-key:
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs --live --days 30
```

- Default (no `--live`) reads `DATABASE_URL` from **`.env.sandbox`** (the local sandbox).
- `--live` reads `DATABASE_URL` from **`.env`** (the shared/production DB) — and refuses unless
  `LIVE_AUDIT_CONFIRM=1` is also set.
- `--days N` scopes to the last N days (anchored to `created_at`); omit for all-time.

## What it reports (from `conversations`, read-only)

- **A. Overview** — volume, paid count/rate, revenue, date span.
- **B. Funnel drop-off** — leads → engaged (gave a concern) → reached pitch → paid → upsell-1 offered →
  bought → upsell-2, with step conversion, plus where non-buyers stopped (`conversation_state`). Points
  at the biggest leak. (*"engaged" is based on a **persisted** concern, so it can under-count buyers whose
  concern wasn't saved before they paid.*)
- **C. Payment reconciliation** — `purchased=true` but `main_paid_at` NULL (browser-confirmed, webhook not
  stamped) and the inverse (webhook-confirmed, browser missed). The migration-019 under-count class, measured live.
- **D. Abandoned carts** — a checkout session was created but never completed; count + rate.
- **E. Price-variant integrity** — the **"45-corruption" class in the wild**: paid rows with NULL main or
  grace cents (a corrupted config key that breaks the grace charge), and price *drift* within one arm.
  Reuses the expected-price logic from `scripts/price-test-correctness-check.mjs`.
- **F. Upsell health** — U1/U2 offered → bought take-rates; purchases recorded with a NULL amount.
- **G. fb-palm derail — real transcripts** — scans real palm sessions' stored `messages`: of those that
  carry the palm identity in the opener, how many DROP it by the reading/crisis. Quantifies the known-open
  derail (`improve-v1/04-fb-palm-derail-PROVEN.md §3`, unshipped) on real users.

Ends with a **prioritized issues list** (🔴 high / ⚠️ worth-a-look). Exits non-zero if any 🔴.

## Output

`audit-runs/v1-funnel-live-audit/report.md` (gitignored) + console.

## Proven

Verified 2026-07-16 against the local `:5433` sandbox: canary fired (`rejected SQLSTATE 25006 ✔`), all
seven sections executed, report written, no false 🔴 on clean data. The live read-only run is
confirmation-gated and has not been run without explicit go-ahead.

## Optional next phase (not yet built)

A **Stripe cross-check** (read-only `retrieve`/`list` via `server/lib/stripeAccount.getStripeForRow`):
for a sample of paid rows, compare the stored `price_amount_cents` to the amount Stripe actually charged —
catching a corruption that agrees between the row and the display but diverges from the real charge.
Kept out of v1 so the core DB audit verifies locally without live-Stripe access.

Sibling skills: **`v1-funnel-audit`** (synthetic flow/charge regression, sandbox) · **`v1-funnel-eval`**
(prompt-quality scoring, offline).
