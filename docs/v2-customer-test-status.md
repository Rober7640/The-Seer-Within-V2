# V2 Customer-Facing Test Status

**Branch:** `feat/v2-paywall-optimization` · **As of:** 2026-10-15 · **Run mode:** test server (`DISABLE_RATE_LIMIT=true` → new accounts auto-verified + free-trial granted) on `:5008` (macOS AirPlay holds `:5000`; the port-aware `playwright.config.ts` handles this).

How to run the green customer suite:
```bash
npx playwright test \
  tests/auth.spec.ts tests/personas.spec.ts tests/credits.spec.ts \
  tests/paywall-experiment.spec.ts tests/paywall-purchase-journeys.spec.ts \
  tests/paywall-live-customer.spec.ts tests/chat.spec.ts \
  tests/system2-new-user.spec.ts tests/session-lifecycle.spec.ts \
  tests/system2-auth-edge-cases.spec.ts tests/system2-credit-edges.spec.ts
```

## ✅ Green — comprehensive customer coverage

| Area | Spec | What it proves (customer-visible) |
|---|---|---|
| Auth | `auth.spec.ts`, `system2-auth-edge-cases.spec.ts` (C1a–d,f,g) | register, login, wrong/duplicate/weak-password errors, expired token, logout via avatar "Sign Out", concurrent tabs |
| Personas | `personas.spec.ts` | directory, category filter, detail modal, guest "Start Reading" → auth modal, `$/min` pricing |
| Credits store | `credits.spec.ts`, `system2-credit-edges.spec.ts` | dollar balance, standard $10/$20/$30/$50 packs & $/min, custom-amount floor, purchase history, free trial exact |
| Paywall | `paywall-experiment.spec.ts` | variant A & B render, honest flat-rate copy, no "non-refundable" in B, dev preview |
| **Purchase** | `paywall-purchase-journeys.spec.ts`, `paywall-live-customer.spec.ts` | **real Stripe test-card** buys: $10, $20, custom amount, variant-B sheet; **declined card → error + no credit**; above-max refused; purchase recorded in history; balance credited exactly |
| Core reading/chat | `chat.spec.ts` | open guide → send (suggested question) → **real Evelyn reply** → time counts down → follow-up → End-Reading confirm → switch guide |
| New-user journey | `system2-new-user.spec.ts` (B1–B7) | free trial granted, browse+auth-modal, first reply, buy-path reachable, real card purchase, logout/return with balance intact, one shared wallet across guides |
| Session lifecycle | `session-lifecycle.spec.ts` | session recorded + wallet never negative, time counts down, history preserved server-side across refresh, longer conversation retained, end + restart |

## ⚠️ Pre-existing stale AI-chat specs — NOT yet rewritten (documented debt)

These predate this branch and fail only because of a **chat-UI relabel** (the features work — verified by the rewritten `chat.spec`/`session-lifecycle`/`system2-new-user`). They were de-scoped by decision (large, AI-dependent rewrite). Each needs the same selector migration:

| Stale spec | Fix pattern to apply |
|---|---|
| `tests/memory.spec.ts` | start via suggested-question (not `"Begin Reading"`); route `/reading?persona=…` (not `/chat-service`); logout via avatar "Sign Out"; verify memory via `/api/chat-service/*` where UI differs |
| `tests/system2-chat-robustness.spec.ts` (C2a–e) | textarea `getByPlaceholder(/type your message/i)` + Enter; start via suggested question |
| `tests/system2-session-state.spec.ts` (C6a–d) | history is server-side (`/api/chat-service/sessions` + `/session/:id/messages`), reading UI resets on reload by design |
| `tests/system2-memory-edges.spec.ts` (C4a–e) | same chat-flow selectors; isolate memory via API |
| `tests/system2-auth-edge-cases.spec.ts` **C1e only** | `"Begin Reading"`→ suggested question; `"End Session"`→ "End Reading" (confirm modal); logout via avatar "Sign Out" |

**Canonical current selectors (for whoever finishes these):**
- Route: `/reading?persona=<slug>` · start a reading by clicking a **suggested-question button** (first message creates the session)
- Composer: `getByPlaceholder(/type your message/i)` then `.press('Enter')`
- End: `"End Reading"` → confirm modal `"End this reading?"` → second `"End Reading"`
- Logout: `button[aria-haspopup="menu"]` (avatar) → menuitem `"Sign Out"` (on pages that show the nav; the reading page hides it)
- Time: `m:ss` text (client countdown; server balance only reconciles with background jobs enabled — off locally)
- Balance / history (deterministic): `/api/credits/balance`, `/api/chat-service/sessions`, `/api/chat-service/session/:id/messages`
