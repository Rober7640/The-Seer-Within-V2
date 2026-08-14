---
name: v1-funnel-live-audit
description: "READ-ONLY analysis of REAL V1 (Evelyn 'Original Conversion Funnel') data, covering the fb-tarot, fb-palm and bare-v1 landers — the 'find real issues' half of the V1 loop, the counterpart to V2's persona-audit. Use when conversions/sales/revenue are DOWN or UP and nobody knows why; when asked to audit the live V1 funnel or a lander; to see where real users drop off; to find which ad hook or tarot card/palm sign is actually earning; to check a live A/B test's arms, a losing arm holding most of the traffic, or a price test for corruption; to check payment reconciliation, abandoned carts, upsell take-rates, or the palm derail on real data. Two modes: audit (is anything broken?) and diagnose (why did the number move?). It only RECOMMENDS fixes; it never writes. The live read is flag-gated + confirmation-required."
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

## Which mode? Start here

| The question you were asked | Run |
|---|---|
| "Is anything broken?" · routine health check · payments, price corruption, derail | **audit** — `audit-live.mjs` |
| "Conversions are down — why?" · a number moved and nobody knows why | **diagnose** — `diagnose-live.mjs` |
| "Which ad/hook/card should we scale?" | **diagnose** (§3 ranks landers by revenue per 1,000) |
| "Is this A/B test costing us money?" | **diagnose** (§4 tallies every running arm) |

Run **both** when a drop is reported: audit rules out a defect, diagnose finds the cause.
They share `lib/live-db.mjs`, so they can never disagree about what counts as a sale.

## Run it

```bash
# 1) VERIFY locally first (reads the :5433 sandbox, proves the queries + canary). Safe, no flag.
node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs

# 2) The REAL read-only audit against the live shared DB — deliberate, two-key:
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/audit-live.mjs --live --days 30

# 3) DIAGNOSE a move. Auto-detects the busiest funnel; --funnel tarot|palm|other|all.
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/diagnose-live.mjs --live

#    Both halves of the comparison MUST sit inside one traffic regime — see the rules below.
LIVE_AUDIT_CONFIRM=1 node .../diagnose-live.mjs --live --funnel tarot --days 14 --split 7
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

## What DIAGNOSE reports (`diagnose-live.mjs`)

- **1. WHEN** — weekly leads / sales / revenue / **$ per 1,000 leads** / **$ per buyer**. Flags a
  week-over-week revenue-per-1k fall, and warns when volume grew enough that rate regression is expected.
- **2. WHERE** — the five funnel steps (lead→pitch→checkout→paid→U1→U2), recent vs prior, with the
  one verdict that matters: *localised drop* (defect/change) vs *everything sagging* (traffic mix).
- **3. WHICH AD** — every lander ranked by **revenue per 1,000 visitors**, broken into
  `main/buyer · bump · U1 take · U2 take · back/buyer · rev/buyer`, and led by a **coverage
  line** stating what share of the funnel the table actually sees. Flags a hook holding
  >30% of traffic while earning below median, and a hook whose buyers skip the back end.
- **4. WHICH TEST** — every running experiment tallied with the *correct* join for its subject type,
  with its **real age in days** and a two-proportion z-test. Flags a losing arm holding more than
  its fair share of traffic, costed as a total **and a daily rate**.
- **5. MEASUREMENT INTEGRITY** — `ab_visitor_id` coverage **scoped per test**, un-joinable exposures,
  assigned split vs configured weights, and buyers who were never offered upsell-2.

## Reading the output — rules that cost money to learn

Each of these is a mistake this script made on a real run before it was fixed. The script now
guards them, but it can only guard what it can see — you still have to read it this way.

| Rule | Why |
|---|---|
| **Compare like with like.** Both halves must sit inside one traffic regime. | Comparing a 5,000-lead week against the 200-lead week before scaling manufactures a decline at *every* step and sends you bug-hunting. The script now refuses a verdict past a 5× volume ratio — honour it, don't override it. |
| **Several steps sagging together = traffic mix. One step = a defect.** | The single most useful signal here. Getting it backwards costs days: on the first real run it looked like the order bump had broken checkout, and the arm tally cleared the bump completely. |
| **Rank landers by revenue per 1,000 — NEVER by buy-rate.** | They genuinely disagree. `cards-someone-else` had the best conversion of any tarot hook (9.0%) and near the worst revenue, because its buyers took upsell-1 at 11%. Buy-rate would have you scale the wrong ad. |
| **Read `rev/buyer` next to conversion.** | Front-end price is near-constant, so the whole spread in $/1k is the BACK end. A hook at 4.6% earning $53/buyer and one at 5.8% earning $81/buyer are two different problems: the first is an *offer-match* problem, not an ad problem. |
| **A losing arm holding the majority of traffic is worth acting on BEFORE significance.** | "Not significant yet" is not "costing nothing". Re-weight to 50/50 and let it resolve — that is free. Waiting for p<0.05 while 70% of traffic sits on the worse arm is a decision to keep paying. |
| **An even 50/50 split is a test running correctly.** | Don't flag it. Only a share meaningfully above the arm's configured weight is a misallocation. |
| **Scope every measurement-integrity check to the test's own start date and funnel.** | `ab_visitor_id` read as "79% missing" over a calendar window and **100% present** since the test that uses it began. A column at 100% reported as broken sends someone to fix nothing. |
| **`user`-keyed experiments are V2 chat tests.** | They buy through `credit_purchases` and never touch `conversations`. Tallying them here prints a healthy test as zero-buyer. The script skips them by name. |
| **Every figure carries its own window — quote it, and quote a test's loss as a DAILY RATE.** | The funnel totals are the `--days` window, but a test can only be measured over the days it has run. A ~$730 loss read as monthly is a shrug; the same loss over 3.6 days is $200/day and still running, which is the number that justifies acting today. §4 now prints each test's real age from its exposures (not `started_at` — a test can be started and sit idle). |
| **A ratio's numerator and denominator must be the same population, filtered the same way.** | The most flattering error on this page. A numerator counting conversations of any age over a denominator limited to the window reported the lander table at **98% coverage** when it truly covers **~80%** — and 98% invites you to quote its totals as the funnel's. §3 now scopes both sides identically, and takes the denominator as the UNION of the two ways a session identifies as a funnel's (its `price_variant` *or* an exposure labelling it) because neither alone is complete — 178 tarot-labelled sessions carry a *palm* `price_variant`. |

## Output

`audit-runs/v1-funnel-live-audit/report.md` (audit) and `diagnose.md` (diagnose) — both
gitignored — plus console.

## Proven

Verified 2026-07-16 against the local `:5433` sandbox (canary `25006 ✔`, all seven sections run), then run
**read-only against the live shared DB (2-day window)** with explicit confirmation — canary fired, host
redacted, zero writes.

⚠️ **"paid" is a CONFIRMED sale, not the raw `purchased` flag.** `purchased` is set at checkout-CLICK
(before payment), so it overcounts sales by the abandon rate (the first live run inflated "paid" ~2.5×).
`PAID = main_paid_at IS NOT NULL OR (purchased AND upsell_offered)` — the same definition the
`/admin/price-test` dashboard uses. Even so, this is a DB-side proxy: **true payment reconciliation
requires the Stripe cross-check** (the optional phase below). Section C prints the optimistic-vs-confirmed
spread so the gap is visible, never hidden.

## Optional next phase (not yet built)

A **Stripe cross-check** (read-only `retrieve`/`list` via `server/lib/stripeAccount.getStripeForRow`):
for a sample of paid rows, compare the stored `price_amount_cents` to the amount Stripe actually charged —
catching a corruption that agrees between the row and the display but diverges from the real charge.
Kept out of v1 so the core DB audit verifies locally without live-Stripe access.

**DIAGNOSE mode verified 2026-08-14** against the live shared DB (read-only, canary `25006 ✔`).
Rebuilt, from scratch and unprompted, all four findings from that day's manual fb-tarot
investigation — the mis-weighted B/C test, the traffic concentrated on the lowest-earning hook,
the upsell-2 reach gap, and the order bump's exoneration — and additionally CORRECTED one
conclusion the manual pass had got wrong (`ab_visitor_id` coverage, see the rules table).

Sibling skills: **`v1-funnel-audit`** (synthetic flow/charge regression, sandbox) · **`v1-funnel-eval`**
(prompt-quality scoring, offline).
