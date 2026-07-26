# Handoff — V2: Pay-to-enter before the email→chat reading

## Goal
For V2 email arrivals, gate the chat behind PAYMENT before the reading starts — click email → pay → then chat, instead of today's free-greeting-then-chat (3–7 free minutes granted on signup). Monetizes entry, aligned with the "readings are the LTV engine / paid frontend offer" thesis. **V2 only.**

## Read first (open lazily, as each step needs)
- Memory index (already loaded each session): `reading-framing-vs-credits-audit` (has this as the NEW next experiment), `readings-are-ltv-engine`, `email-the-tell-winning-formula`, `paywall-redesign-problem4`, `ab-testing-framework` — the decided strategy + why. Read these FIRST; they hold the context so it isn't relitigated.
- Entry flow: `client/src/pages/EvelynLanderPage.tsx` (segment routing v2_active/brand_new/…; `READING_DEST` ~line 36) → `client/src/pages/ChatServicePage.tsx` (chat entry, free-greeting fetch, out-of-credits) → `server/routes/chatService.ts:57` (free `GET /greeting/:personaSlug`).
- Free-minutes grant on signup: `server/routes/auth.ts` register handler — the "free to enter" that pay-first must override for this cohort.
- Paywall to REUSE (don't rebuild): `client/src/components/paywall/` (`paywallCopy.ts` A/B copy, `PaywallCard`, `CreditsStoreView`), `client/src/pages/CreditsPage.tsx`, `OutOfCreditsModal`/`BuyCreditsModal` (Stripe/PayPal inside). Today the paywall only fires when out of credits mid-chat.
- Continuity just shipped, MUST NOT break: PR #44 / `docs/superpowers/plans/2026-07-26-email-chat-reading-continuity.md`; `server/lib/arrivalReading.ts` (arrival keyed off `evelyn_lander_sessions.campaign`, 24h window).

## State
- Done: email→chat reading continuity — **PR #44** (base `feat/persona-forks-aiden-luna`), NOT yet merged.
- NEXT ACTION: **brainstorm the pay-to-enter design** — new feature, so run `superpowers:brainstorming` first, resolving the Open threads, then write a plan.

## Locked decisions
- V2 only; V1 funnel untouched.
- Builds ON continuity (PR #44): the `campaign` / `evelyn_lander_sessions` arrival context must survive the payment detour so Evelyn still continues the reading in chat.
- Reuse the existing paywall/credit/Stripe machinery — no parallel system.
- Ship behind a flag/experiment, preview-first, operator reviews before live (repo convention).

## Open threads (decide in brainstorm)
- What IS the entry payment? Discrete "reading" at a low frontend price (~$17 per the LTV doc) vs. buy-a-minutes-pack vs. $X unlock. Ties to reading-framing "option B" (countable reading unit).
- Where does the gate sit — lander pre-signup, post-signup pre-`/reading`, or interstitial before the greeting — and how per segment (new / returning / already-has-credits)?
- The 3–7 free minutes on signup: remove for this cohort? keep for non-email traffic? (Core tension: "pay first" vs "free minutes".)
- Scope: only email-arrivals? only Evelyn? all V2 entry?
- A/B pay-to-enter vs free-entry to measure conversion + LTV (framework at `/admin/experiments`).

## Guardrails
- Payment = real Stripe money, outward-facing — build/test in sandbox; confirm before any live checkout; never flip the experiment live without operator go.
- Do NOT break PR #44's continuity chain (arrival campaign context; greeting cache / lander-link timing).
- Don't relitigate the reading-framing / readings-are-LTV thesis — decided, in memory.
- Brainstorm before code (superpowers process).

NEXT ACTION: run `superpowers:brainstorming` on the pay-to-enter flow, starting from the Open threads.
