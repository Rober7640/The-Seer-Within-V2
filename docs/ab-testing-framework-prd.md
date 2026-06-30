# PRD — Unified A/B Experiment Framework + Dashboard

**Status:** Draft for review · **Date:** 2026-06-28 · **Owner:** (tbd)
**Related:** `docs/posthog-evelyn-purchase-findings.md` §3.13–3.15 (paywall test), this is the generalization of that work.

---

## 1. Why

We want to run A/B tests continuously. Today there are **four parallel, incompatible experiment systems** (see §3), each with its own assignment, storage, and measurement — and the only generic one is dormant and slightly broken. Setting up a test means a developer hand-wiring code + hand-editing the DB. That doesn't scale.

**Goal:** one framework + one dashboard so that **most tests are self-serve (no developer)**, every test is measured the same trustworthy way, and the rare test that needs new UI is a *small* dev task instead of a from-scratch build.

### The core distinction that defines what's possible

| Test type | Example | Who sets it up |
|---|---|---|
| **① Config test** — varies a *value* the code already reads | copy, price, default tier, traffic %, on/off, which persona, timing | **Dashboard, no dev** |
| **② Structural test** — varies *what the UI/flow is* | redesigned modal, new flow, quiz-vs-chatbox (the paywall rebuild) | **Dev builds the variant once**, then run/measure from the dashboard |

No dashboard can generate a new React component, so ② always needs a dev. The framework's job is to make ② *cheap* (dev writes only the new variant + registers it; assignment, logging, ramp/stop, results are free) and ① *zero-dev*.

**Non-negotiable principle:** **measure from the app DB, not PostHog.** PostHog under-fires purchases (~34%, §3.10). The framework's results come from exposure rows joined to outcome rows in Postgres.

---

## 2. Current state (what we're consolidating)

Four systems, disagreeing on every axis:

| System | Assignment unit | Sticky? | Storage | Measurement | Dashboard |
|---|---|---|---|---|---|
| **Generic page-copy** (`ab_tests`/`ab_events`, `useABTest`) | cookie `ab_vid` | ✅ md5 bucket | `ab_events` | dashboard `/:id/results` | ✅ CRUD `/admin/ab-testing` — **dormant** (no page calls `useABTest`); **route bug** (`/api/admin/ab-tests` vs mounted `/ab-testing`) |
| **V1 price split** (`priceVariant.ts`) | email / conversation | ✅ weighted | `conversations` columns | `/admin/price-test` (read-only) | view-only; weights hand-edited in `system_config.v1_price_variants` |
| **Prompt A/B** (`promptManager.ts`) | — | ❌ **per-call `Math.random`** | `chat_sessions.promptVariantId` | session counts only (`/admin/analytics/prompts`) | partial (PromptsEditor) |
| **Paywall copy** (`experiments.ts`, new) | `user.id` | ✅ sha256 | `paywall_views` | CLI `tallyPaywall.ts` | none (DB toggle) |

Shared infra that already exists and we should reuse:
- **`system_config`** single-row-per-key + a consistent read pattern (TTL cache + safe fallback).
- **Admin auth** (`requireAdmin`, `adminFetch`, JWT vs `admin_users`).
- **Config-write pattern** in `server/routes/admin/settings.ts` (select→update/insert→invalidate cache).
- **`ab_events` / `useABTest`** — the closest skeleton to a generic exposure logger.

---

## 3. Proposed architecture

### 3.1 Data model (new — dedicated tables, not `system_config` blobs)

Experiments have structure (variants, weights, lifecycle, scoping), so they get real tables rather than JSON in `system_config`.

```ts
// experiments — one row per test (the registry the dashboard manages)
experiments {
  id            uuid pk
  key           text unique         // 'paywall_copy_2026', 'evelyn_price_q3', ...
  name          text
  description   text
  status        text                // 'draft' | 'running' | 'paused' | 'done'
  subjectType   text                // 'user' | 'visitor' | 'email'  (assignment unit)
  variants      jsonb               // [{ key:'A', weight:50, payload:{...} }, { key:'B', weight:50, payload:{...} }]
  scope         jsonb               // optional filters, e.g. { personaId, route, funnel } — null = global
  conversion    jsonb               // how to score: { type:'credit_purchase', windowDays:7 } | { type:'event', name:'...' }
  startedAt     timestamp
  endedAt       timestamp
  winnerVariant text
  createdBy / updatedBy → admin_users
  createdAt / updatedAt
}

// experiment_exposures — one row per first exposure per subject (the denominator)
experiment_exposures {
  id             uuid pk
  experimentKey  text     // FK-ish to experiments.key
  subjectId      text     // user.id | visitor cookie | email (per subjectType)
  variant        text
  surface        text     // 'buy_credits_modal' | 'credits_page' | 'lander' | ...
  context        jsonb    // { personaId, isOutOfCredits, route, ... }
  createdAt      timestamp
  // unique (experimentKey, subjectId) keeps it to first-exposure; later opens are no-ops
}

// experiment_conversions — generic outcome log (for non-purchase tests)
experiment_conversions {
  id, experimentKey, subjectId, variant, value (numeric, e.g. revenue), createdAt
}
```

`experiment_exposures` **replaces** `paywall_views` and `ab_events` going forward. Purchase-based tests join exposures → `credit_purchases` (no separate conversion log needed); event/funnel tests write `experiment_conversions`.

### 3.2 Assignment (server)

One helper, generalizing `paywallVariant()`:

```ts
assign(experimentKey, subjectId, context?) : { variant, payload } | null
// - loads experiment (cached ~30s), returns control/null if status!='running'
// - applies scope filter (e.g. context.personaId must match scope.personaId)
// - sticky: bucket = sha256(subjectId + experimentKey) % 100, walked against variant weights
// - non-prod QA override: ?exp.<key>=<variant>
logExposure(experimentKey, subjectId, variant, surface, context)  // upsert-once into experiment_exposures
```

- **Sticky by hash** (no per-call randomness) → fixes the prompt-A/B non-stickiness bug as a side effect.
- **Subject unit** is per-experiment: `user.id` for logged-in product tests, visitor cookie for anonymous lander tests, email for the V1 funnel.
- Same `assign()` is called server-side wherever the variant is needed (so it's authoritative, like the paywall does in `/pricing` + `/checkout-view`).

### 3.3 Variant payloads — how ① config tests stay zero-dev

A variant's `payload` is arbitrary JSON the code reads. Examples:
- Paywall copy: `{ header, cta, refundLine, defaultTier }`
- Price: `{ mainCents, downsellCents }`
- Banner timing: `{ lowBalanceSecondsLeft: 90 }`

The dashboard edits `payload`; code reads `assign(key, id).payload.header`. **Changing copy/price/threshold = editing JSON in the dashboard, no deploy.** For ② structural tests, `payload` is usually empty and `variant` drives a registered code branch.

### 3.4 Measurement (server + dashboard)

Generalize `tallyPaywall.ts` into `tally(experimentKey, { window })`:
- Cohort = first `experiment_exposures` per subject in-window.
- Conversion per `experiments.conversion`: `credit_purchase` (completed within `windowDays` of first exposure) **or** `experiment_conversions` event.
- Returns per-variant: exposures, conversions, rate, revenue/subject, ARPPU, + **SRM check** (observed split vs configured weights) + **two-proportion z-test**.
- **Guardrails** surfaced alongside the primary metric: revenue/subject, tier-mix, refund rate (where available) — so you don't "win" by pushing the cheap tier.
- **No peeking:** dashboard shows progress toward a pre-registered N and only surfaces a verdict at N.

### 3.5 Admin API (reuse `requireAdmin` + settings.ts upsert pattern)

```
GET    /api/admin/experiments              list
POST   /api/admin/experiments              create (draft)
PATCH  /api/admin/experiments/:key         edit (variants/weights/payload/scope/status)
POST   /api/admin/experiments/:key/start | /pause | /declare-winner
GET    /api/admin/experiments/:key/results live tally + guardrails + SRM + significance
```

### 3.6 Dashboard (one page, `/admin/experiments`)

```
┌────────────────────────────────────────────────────────────┐
│  Experiments                                   [ + New test ]│
│  ● paywall_copy_2026   running   B +14%  p=.03  n=1,420/arm  │
│  ● evelyn_price_q3     paused    —                            │
│  ○ quiz_vs_chatbox     draft                                  │
├────────────────────────────────────────────────────────────┤
│  paywall_copy_2026                          [ Pause ][ Edit ] │
│  Variants:  A 50%   B 50%        Scope: persona=Evelyn        │
│  ┌──────────┬─────────┬────────┬──────┬──────────┬─────────┐ │
│  │ variant  │ exposed │ conv % │ lift │ rev/user │  ARPPU  │ │
│  │ A        │   1,420 │  3.1%  │  —   │  $0.71   │ $22.9   │ │
│  │ B        │   1,408 │  3.5%  │ +14% │  $0.86   │ $24.6   │ │
│  └──────────┴─────────┴────────┴──────┴──────────┴─────────┘ │
│  SRM ok (50.1/49.9) · z=2.1 p=.03 · N target 1,500/arm ▓▓▓░ │
│  Guardrails: refund 1.1% vs 0.9% · tier-mix shift +8pp mid   │
│            [ Declare B winner ]  (enabled at N)              │
└────────────────────────────────────────────────────────────┘
```
- Create/edit **config** variants (copy/price/payload) inline → live, no dev.
- For **structural** tests, the dev has registered the variant keys; the dashboard just runs/ramps/measures them.

---

## 4. How each test type flows (end state)

**① Config test (e.g. new CTA copy, no dev):** Dashboard → New test → pick surface, define A/B payloads, weights, scope → Start → watch results → Declare winner → set winner to 100% (or bake in).

**② Structural test (e.g. new modal, dev once):**
1. Dev builds the variant component and reads `assign(key, userId).variant` to branch (exactly the early-return pattern used in the paywall integration).
2. Dev registers the experiment key + variant keys (one entry).
3. Everything else — assignment, exposure logging, dashboard, ramp/stop, tally — is reusable. No new tables, no new measurement code.

This is the whole win: the paywall rebuild took a full session; the *next* structural test is ~the component + one line.

### Worked example — "quiz vs chat box" lander test (a structural test)

Varies the lander *mechanic* (Aiden-style tap-quiz vs. Evelyn-style open chat box), not a value — so it is **②, not a config change.** What it takes:

**Dev, once (in the IDE):**
1. Make both mechanics renderable on one lander. *Mostly already exists* — `AidenQuizPage` (tap-quiz) and `EvelynLanderPage` / `PersonaLanderPage` (open box). This is the "port Aiden's quiz onto `/evelyn`" item (findings §3.8), so it's "expose both", not "build from scratch".
2. One branch: `assign('evelyn_lander_mechanic', visitorId).variant === 'quiz' ? <Quiz/> : <ChatBox/>`.
3. Register the experiment once (key, variant keys, `subjectType:'visitor'`, scope = the lander route).

**Then you operate it from the dashboard** — split, ramp, pause, results. No dev to run it.

**Two things that make lander tests harder than the price test:**
- **Subject = anonymous visitor cookie**, not `user.id` (landers are pre-login) → needs the **visitor assignment path** (Phase 4). The price + paywall tests had clean logged-in identities.
- **Attributing the purchase** back to the variant needs the visitor→user **identity stitch** (the §1 gap in the findings doc). Cleanest first cut: make **signup/registration** the primary metric (clean, pre-stitch); treat purchase as secondary once stitching exists.

So quiz-vs-chatbox lands in **Phase 4** (it depends on the visitor path + the structural-test registration pattern), not Phase 3.

---

## 5. Migration plan (fold the 4 systems in; retire dupes)

| System | Action | Risk |
|---|---|---|
| **Paywall** | Re-point `paywallVariant()` → `assign('paywall_copy_2026', userId)`; log to `experiment_exposures`; tally via generic. Behavior identical. | Low (already isolated, off) |
| **Generic page-copy** | Fix the `/ab-tests`↔`/ab-testing` route bug; migrate `ab_events`→`experiment_exposures`; actually wire `useABTest` into the lander surfaces it was meant for. | Low–med (dormant today) |
| **V1 price** | Wrap assignment in `assign(..., email)`; dual-write exposures (keep `conversations` columns for legacy continuity); port `/admin/price-test` readout onto the generic tally. | Med (live revenue path — migrate carefully, keep legacy columns) |
| **Prompt A/B** | Switch from per-call `Math.random` → sticky `assign()`. **Behavior change** (a user gets a stable prompt variant) — decision needed. Add conversion (not just session counts). | Med (changes live behavior — gate + verify) |

Retire `ab_events` + per-system toggles once migrated; keep one framework.

---

## 6. Decisions (locked 2026-06-28 — Phase 0 done)

1. **Storage:** ✅ **Dedicated `experiments` + `experiment_exposures` tables** (not `system_config` JSON) — structured lifecycle, clean to query, real dashboard on top.
2. **Prompt A/B stickiness:** deferred to **Phase 4** (it's a behavior change; handle it when migrating prompts, behind a flag + verification).
3. **Stats model:** **fixed-horizon** (pre-register N, no peeking) for v1; sequential testing is a later option.
4. **Migration order:** **incremental** — shared core + paywall first (Phase 1), price test self-serve (Phase 3), prompt + page-copy (Phase 4). Not all at once.
5. **Visitor/anonymous tests:** design `subjectType` in from the start (`user | visitor | email`), but **wire the user/email paths first**; the **visitor cookie path lands in Phase 4** (it's what quiz-vs-chatbox lander tests need — see §4 worked example).

---

## 7. Phased delivery — each phase ends with an AUDIT + E2E GATE

We build in small phases. **No phase starts until the previous one passes its gate and you sign off.** Each phase is independently shippable and leaves the app in a safe, working state (live behaviour unchanged until a test is deliberately enabled).

### The phase gate (uniform — applies after every phase)

A phase is **done** only when all four pass:

1. **Audit (correctness + safety)** — `/code-review` clean on the phase diff; TypeScript clean (no new errors vs. baseline); the phase's specific **audit checklist** (below) all checked; no regression to existing flows.
2. **E2E (automated)** — the phase's tests added to `tests/` and **passing**; the existing suite still green; covers both the happy path and the safety property (e.g. "control unchanged", "kill-switch reverts").
3. **Manual verification** — a real run/screenshot of the phase's headline behaviour (the `/run` or `verify` flow), attached to the phase notes.
4. **Sign-off** — you review the audit + E2E results and approve before the next phase begins.

> Safety rule across all phases: every experiment ships **disabled**; an enabled test never alters the control arm; a kill-switch reverts everyone to control instantly. The paywall integration already follows this — every phase inherits it.

---

### Phase 0 — Lock decisions _(no code)_ ✅ DONE
Decisions locked in §6 (dedicated tables · fixed-horizon stats · incremental migration · visitor path in Phase 4). **Next up: Phase 1.**

### Phase 1 — Core framework, paywall folded in _(no new UI)_
Build `experiments` + `experiment_exposures` tables (+ idempotent migration), `assign()` / `logExposure()` / `tally()`, and re-point the existing paywall test onto the generic `assign()`.
- **Audit checklist:** assignment deterministic + sticky over 1000 calls · experiment OFF ⇒ everyone `'A'` · variant A **byte-identical** · migration additive + reversible · no PII in exposures · config cache invalidation works.
- **E2E:** extend `tests/paywall-experiment.spec.ts` to prove A/B still render via the generic `assign()`; assert generic `tally()` == current `tallyPaywall.ts` on seeded data; existing credits/checkout specs still green.
- **Exit:** paywall test runs on the new framework, still OFF, **zero behaviour change**. _Medium._

### Phase 2 — Read-only dashboard _(visibility first)_
`/admin/experiments`: list experiments + per-experiment results (conversion, rev/subject, ARPPU, SRM, significance) — **DB-sourced**, admin-auth, **no write paths yet** (cannot change anything live).
- **Audit checklist:** dashboard numbers match a hand-computed tally on seeded data · admin-only (non-admin blocked) · purely read-only · no PostHog dependency.
- **E2E:** seed a known experiment's exposures + purchases → dashboard shows the exact expected per-arm conversion/revenue; non-admin is rejected.
- **Exit:** you can watch the paywall (and price, read-only) tests live in one place. _Medium._

### Phase 3 — Self-serve **price/config** tests _(your live use case — U1 $37/$47)_
Create / edit / ramp / pause / declare-winner for **config** experiments from the UI (variant payloads + weights), with a config-write API + cache invalidation. **Migrate the V1 price test** (main / downsell / U1 / U2) onto it so your $37-vs-$47 becomes fully dashboard-managed.
- **Audit checklist (highest stakes — touches live pricing/revenue):** a price change applies to the correct arm and **only** that arm · sticky assignment unchanged · **no double-charge / no mid-session price flip** · kill-switch reverts to control instantly · invalid/zero price rejected · legacy `conversations` price columns preserved for reporting continuity.
- **E2E (Stripe/PayPal sandbox):** create a price test in the UI → two visitors get different **sticky** prices → each checkout charges the right amount → `tally()` attributes correctly → ramp-to-0 / declare-winner behaves.
- **Exit:** you create, run, and decide a **price test end-to-end from the dashboard — no dev, no DB editing.** _Medium–large._

### Phase 4 — Remaining migrations + structural-test path
Fold prompt A/B (make it **sticky** — gated behaviour change, per §6) and revive the dormant page-copy framework (fix the `/ab-tests`↔`/ab-testing` route bug, wire `useABTest` into real surfaces). Document the one-time pattern for a **structural** test (variant component + single registration).
- **Audit checklist:** each migrated system behaves identically (or intentionally better) · no orphaned assignments · prompt-stickiness change verified in isolation behind a flag.
- **E2E:** one per migrated system.
- **Exit:** all four legacy systems run on the one framework. _Medium, incremental._

### Phase 5 — Hardening + retire duplicates
SRM alerting, refund-rate guardrail, pre-registered-N gating in the UI; then **delete** the superseded `ab_events` table, `/admin/price-test`, and the old `/admin/ab-testing` once nothing depends on them.
- **Audit + full regression E2E.**
- **Exit:** exactly **one** A/B framework remains. _Medium._

> **Order note:** Phase 1 folds the paywall first because it's already isolated + OFF (safest first migration). Your **live price test lands in Phase 3** — if you'd rather get price-testing self-serve sooner, we can swap Phase 3 ahead of the paywall-specific polish, but Phase 1 (the shared core) must come first regardless.

## 8. Definition of done (whole project)
- A non-developer creates, starts, ramps, pauses, and declares a winner on a **config/price** test entirely in `/admin/experiments` — no deploy, no DB editing.
- A developer adds a **structural** test by writing only the variant component + one registration; assignment/logging/measurement are reused.
- Assignment is sticky per subject, config-gated, scope-aware, with a non-prod QA override.
- Results are **DB-sourced** (conversion + revenue/subject + ARPPU + SRM + significance) and gate the verdict on a pre-registered N.
- The paywall + price tests both run on the framework; the generic `tally()` reconciles with `tallyPaywall.ts` / `/admin/price-test`.
- **Every phase passed its audit + E2E gate with sign-off**, and at most **one** A/B framework remains.
