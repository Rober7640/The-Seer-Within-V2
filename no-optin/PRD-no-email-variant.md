# PRD — No-Email ("No-Optin") Chat Variant

**Status:** Phase 1 (MVP) built and manually tested — works.
**Branch:** `fb-no-email-toggle`
**Date:** 2026-06-11
**Owner:** mediabuyers@ezyabsorb.com

---

## 1. Problem / Goal

The original conversion funnel chat (Evelyn Cross) **stops mid-conversation to ask
for the user's email** before it will deliver the reading. We want to test a
variation that **does not ask for email**, to see whether removing that friction
improves conversion to the paid offer.

Constraint that shaped the design: we keep launching **new funnel URLs** (e.g.
`/fb`, `/fb2`, `/gdn`, `/fb-palm`, and more to come). We do **not** want to
duplicate every funnel just to make a no-email copy. The toggle must work on
**any** funnel — current and future — with no per-funnel duplication.

---

## 2. Solution Overview

A single **URL query parameter, `?noemail=1`**, that turns the in-chat email
capture off. It is **orthogonal to the funnel**: it rides on top of whatever
funnel the visitor is on, so it works everywhere automatically.

| Link | Behavior |
|------|----------|
| `/chat` | Email required (today's behavior, unchanged) |
| `/chat?noemail=1` | Email skipped → straight into the reading |
| `/fb?noemail=1` | Same toggle, on the FB funnel |
| `/fb-palm?noemail=1` | Same toggle, on the palm funnel |
| `…?noemail=0` | Explicitly email-required (same as no param) |

To run the test, the ad's destination URL just gets `?noemail=1` appended. No new
funnel, pixel, AWeber tag, or PostHog suffix needed.

### Why a query param (not a new funnel, not a worktree)

- **No duplication.** One code path; the param decides behavior at runtime.
- **Works on future funnels for free.** A new `/fb-whatever` honors `?noemail=1`
  the day it ships.
- We briefly considered building it as a separate code copy in a `no-optin`
  worktree — rejected, because the param approach is one small additive change to
  the shared codebase and there is nothing to keep in sync.

---

## 3. Conversation Flow Change

### Today (email required)

```
NAME → [BUCKET / PERSON NAME] → "where should I send your visions?" →
EMAIL_CAPTURE → DEEPENING_1 → reading → pitch → checkout
```

### No-email variant (`?noemail=1`)

```
NAME → [BUCKET / PERSON NAME] → DEEPENING_1 → reading → pitch → checkout
```

The `EMAIL_CAPTURE` state is simply never entered. The "anchor our connection /
where should I send them" lines (which only exist to justify the email ask) are
replaced with a soft transition straight into the reading.

Email is **still captured at Stripe checkout for buyers** — so we lose
*non-buyer* lead emails only, not buyer emails.

---

## 4. What Was Built (Phase 1 — done)

All changes are client-side.

| File | Change |
|------|--------|
| `client/src/lib/funnel.ts` | New `skipEmail()` helper — reads `?noemail=1` from the URL. Default off (`?noemail=0` or absent → email required). |
| `client/src/hooks/useConversation.ts` | Import `skipEmail`; branch the **3** email entry points to route to `DEEPENING_1` instead of `EMAIL_CAPTURE` when the toggle is on. |

The three email entry points that now check `skipEmail()`:

1. **Palm traffic** — after name capture (`handleNameCapture`).
2. **"Someone specific" bucket** — after the person's name (`handlePersonNameCapture`).
3. **Other buckets** (love / money / purpose) — after bucket select (`handleBucketSelect`).

`skipEmail()` (current MVP form):

```ts
export function skipEmail(search?: string): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(search ?? window.location.search);
  return p.has("noemail") && p.get("noemail") !== "0";
}
```

---

## 5. Known Trade-offs (what turning email off costs)

These are inherent to skipping email, not bugs:

- **No lead capture.** `/api/lead` never fires → no AWeber subscriber, no
  Facebook / Google / PostHog `Lead` event, no lead attribution for non-buyers.
  We grow no email list from people who don't buy.
- **No conversation persistence / no V2 migration.** DB save is email-gated
  (`useConversation.ts` — `if (!chat.userData.email) return`). No email → nothing
  saved, and no V2 account migration (which triggers at `DEEPENING_2`+).
- **Price split-test is bypassed.** The $35/$25-vs-variant price is assigned at
  lead capture, keyed by email. No email → falls back to the default $35/$25.
- **Buyer emails still arrive** via the Stripe checkout page.

---

## 6. Phase 2 — Not Yet Built (production hardening)

Do these before running real paid traffic:

1. **Persist the choice into the session.** Phase 1 reads the live URL only. If a
   user refreshes `/chat` without the param, or the welcome-back restore runs, the
   toggle is lost. Store the decision in the saved session (e.g.
   `chat.userData.skipEmail`) and read from there on restore.
2. **Guard Stripe customer creation.** `server/routes.ts` does
   `stripe.customers.list({ email })` then `customers.create({ email })`. With
   `email` undefined, `list()` returns arbitrary recent customers and the session
   could attach to a **random existing customer**. Skip pre-creating a customer
   when there's no email and let Stripe Checkout collect it.
3. **Tag the variant in PostHog.** Record `email_gate: 'on' | 'off'` at session
   start so the A/B is measurable. Without this we can't read the result.
4. **(Optional) Per-funnel default.** If we later want a funnel to default to
   no-email without a param, add `requireEmail?: boolean` to `FunnelDef` in
   `shared/funnelConfig.ts`; have `skipEmail()` fall back to it when the param is
   absent (URL param still wins).

---

## 7. Bugs Found While Testing (pre-existing, now fixed / noted)

These were surfaced during testing but are **not** caused by the no-email change —
they live in the shared flow and affect every funnel.

### 7a. Crisis-detection false positive — FIXED

`client/src/lib/intent.ts` matched `end (my|it all)` with **no word boundary**, so
benign phrases containing the substring "end my" — e.g. **"spend my life",**
"send my", "bend my" — falsely triggered the suicide-crisis response and killed
the conversation.

- **Fix:** anchored to `\bend (my life|it all)\b` (mirrors the server-side filter,
  which was already correct).
- **Impact:** "spend my life" is extremely common in a *love* funnel, so this was
  likely misfiring on real traffic and silently killing conversions.

### 7b. Welcome-back resurrects a terminal `END` state — NOTED, not yet fixed

The crisis handler sets `state: 'END', inputEnabled: false`. The welcome-back
restore ("Let's continue where we left off…") happily restores a session that's
in `END`, re-enables input, but `END` has no handler in `handleSend` → typed text
hits the `default` branch and **goes nowhere** (chat appears frozen).

- Lower severity now that 7a is fixed (legit users won't get parked in `END`
  falsely), but real. **Suggested fix:** welcome-back should not restore
  `END`/`COMPLETE` as "continue" — start fresh instead.
- **Workaround during testing:** clear the saved session —
  `localStorage.removeItem('seer_conversation'); location.reload();`

---

## 8. How to Test

```bash
npm run dev        # backend on :5000 (serves client too). NOT dev:client (frontend-only → /api 404s)
```

- No-email: `http://localhost:5000/chat?noemail=1`
- Email (compare): `http://localhost:5000/chat`
- Palm variant: `http://localhost:5000/fb-palm?noemail=1`

If a session gets stuck, reset:
`localStorage.removeItem('seer_conversation'); location.reload();`

---

## 9. Open Questions

- Do we want non-buyer lead capture back via a lighter mechanism (e.g. capture
  email *after* the reading, optional), or accept zero non-buyer leads for this
  test?
- Funnel-level default (`requireEmail`) — needed, or is the URL param enough?
- Success metric: comparing **chat → checkout conversion** between
  `noemail=1` and email-required arms (requires the PostHog tag from Phase 2).
