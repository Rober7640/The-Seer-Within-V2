# BE-03 End-to-End: Shared /offers/upsell/ Client + Judgement Day — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make offer 03 (Judgement Day) a fully clickable, locally-testable funnel: booking → order bump → Upsell 1 → Upsell 2 → thank-you, using NEW shared `/offers/upsell/` pages that resolve the offer + pitch from the booking session, with 03's own pitch and a thank-you=Entry page built from Joel's copy.

**Architecture:** New decoupled upsell pages at `/offers/upsell/welcome1|2` read `?session_id=` → `/api/backend/upsell/user-data` (returns `offer`) → pick the pitch from an offer-keyed registry → render via the EXISTING upsell hooks (parametrized to accept copy + backend-mode explicitly, defaults preserve V1/02) and the existing `components/upsell/*`. 03 booking moves under `/offers/wiccan/judgement-day` (page-only, no A/B). Attribution is session-based (Plan 1), so stats stay correct regardless of URL.

**Tech Stack:** React + wouter, TypeScript, TanStack Query, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-shared-backend-upsell-engine-design.md` (this is plan 2 of 2 — the client half; §1, §2, §6, plus 03's booking/thank-you/go-live wiring).

**Depends on:** Plan 1 (merged) — `be_upsell_orders`, per-offer attribution, `/api/backend/upsell/*` endpoints all present.

**Worktree:** At execution, branch `feat/be03-offers-upsell` off `feat/be-02-golive` (which carries Plan 1) via superpowers:using-git-worktrees.

## Global Constraints

- **V1 and 02 upsell behaviour must stay BYTE-IDENTICAL.** The existing `/tarot/twin-flame/welcome1|2` and V1's `/welcome1|2` render exactly as before. Any hook parametrization uses OPTIONAL params that DEFAULT to the current URL-based behaviour. A test/manual check must confirm 02 is unchanged.
- **03 is PAGE-ONLY:** no A/B router, no experiment seeded. Booking posts `treatment: 'page'`. `/offers/wiccan/judgement-day` renders the 2-step text booking directly; a `/chat` route may remain but is not wired live.
- **The new `/offers/upsell/` pages are BACKEND-ONLY:** they call `/api/backend/upsell/{user-data,charge,shipping}` exclusively, and fire NO V1 tracking (no Meta/Google/Trackdesk). They must never route to V1 endpoints.
- **Physical products/lists are shared and unchanged** (Plan 1): U1 `be_protection_ritual`, U2 `be_bracelet`.
- **Everything under `/offers/`:** 03 booking `/offers/wiccan/judgement-day`, thank-you `/offers/wiccan/judgement-day/success`, shared upsells `/offers/upsell/welcome1|2`.
- **Thank-you = Joel's `03-T1` content** (an ACT intake-gate that tells her to reply to the delivery email with her Entry). NO on-page Entry form in this plan — the Entry-capture mechanism (email-reply vs form) is a separate fulfilment decision, out of scope.
- **Judgement copy reuses V1 defaults for everything `03-U` doesn't rewrite** (the file says so explicitly). Only the rewritten beats are 03-specific.
- Test runner: **vitest** for unit (`npx vitest run <path>`), **Playwright** for the funnel walk. Typecheck `npm run check`.

## Reference files (implementers READ these for verbatim context)

- Copy contract: `client/src/lib/upsellCopy/types.ts` (`Upsell1Copy`, `Upsell2Copy`, chains, `displayName`).
- Reference pitch: `client/src/lib/upsellCopy/twinFlame.ts` (mirror its shape for judgement).
- V1 defaults: `client/src/lib/upsellCopy/v1.ts` (`V1_UPSELL1`, `V1_UPSELL2`, `V1_CHAIN_1`, `V1_CHAIN_2`).
- Copy resolver: `client/src/lib/backendOffers.ts` (pathname-based today; we ADD offer-keyed).
- Hooks: `client/src/hooks/useUpsellChat.ts`, `client/src/hooks/useUpsell2Chat.ts`.
- Reference pages: `client/src/pages/UpsellPage.tsx`, `client/src/pages/Upsell2Page.tsx`.
- Components barrel: `client/src/components/upsell/index.ts` (`QuickReplies`, `UpsellCTA`, `Upsell2CTA`, `Upsell2DownsellCTA`, `ShippingForm`, `ProcessingOverlay`, `UpsellComplete`) + `CosmicBackground`, `BackgroundMusic`.
- Booking: `client/src/pages/JudgementBookingPage.tsx`, `client/src/lib/judgementBooking.ts`, `client/src/lib/funnel.ts`.
- Thank-you model: `client/src/pages/TwinFlameThankYouPage.tsx`; 03 copy: `improve-v1/v1-one-time-BEs/copy/03/03-T1-thank-you-page.md`.
- Catalog + routes: `shared/backendOffers.ts`, `client/src/App.tsx`, `server/routes/backendOffers.ts` (checkout success_url).

---

### Task 1: Offer-keyed upsell pitch registry

**Files:**
- Modify: `client/src/lib/backendOffers.ts`
- Test: `client/src/lib/backendOffers.test.ts` (create if absent)

**Interfaces:**
- Produces:
  - `BACKEND_UPSELL_PITCH: Record<BackendOfferKey, { upsell1: Upsell1Copy; upsell2: Upsell2Copy }>`
  - `upsell1CopyForOffer(offer: BackendOfferKey): Upsell1Copy`
  - `upsell2CopyForOffer(offer: BackendOfferKey): Upsell2Copy`
- Consumes: `type BackendOfferKey` (`@shared/backendOffers`); `Upsell1Copy`/`Upsell2Copy` (`./upsellCopy/types`); `TWIN_FLAME_UPSELL1/2` (`./upsellCopy/twinFlame`); `JUDGEMENT_UPSELL1/2` (`./upsellCopy/judgement`, Task 2 — until Task 2 lands, temporarily point judgement at the twin-flame objects so this task compiles; Task 2 swaps them in).

- [ ] **Step 1: Write the failing test**

Create/append `client/src/lib/backendOffers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { upsell1CopyForOffer, upsell2CopyForOffer } from './backendOffers';
import { TWIN_FLAME_UPSELL1 } from './upsellCopy/twinFlame';

describe('offer-keyed upsell pitch registry', () => {
  it('returns twin-flame copy for the twin-flame key', () => {
    expect(upsell1CopyForOffer('twin-flame')).toBe(TWIN_FLAME_UPSELL1);
  });
  it('returns a valid Upsell1Copy for judgement-day (has the 03 confirmation)', () => {
    const c = upsell1CopyForOffer('judgement-day');
    expect(Array.isArray(c.CONFIRMATION)).toBe(true);
    expect(c.CONFIRMATION[0]).toContain('page is open'); // 03-U U1a first beat
  });
  it('returns Upsell2Copy for both offers', () => {
    expect(upsell2CopyForOffer('twin-flame').PATH_A_OPEN.length).toBeGreaterThan(0);
    expect(upsell2CopyForOffer('judgement-day').PATH_A_OPEN.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/lib/backendOffers.test.ts`
Expected: FAIL — `upsell1CopyForOffer` not exported (and, until Task 2, the judgement assertion fails).

- [ ] **Step 3: Add the offer-keyed registry to `client/src/lib/backendOffers.ts`**

Add these imports and exports (keep the existing pathname-based `upsell1Copy`/`upsell2Copy` and `OFFERS` map untouched):

```ts
import type { BackendOfferKey } from '@shared/backendOffers';
// Task 2 provides JUDGEMENT_UPSELL1/2. Until it lands, alias twin-flame so this
// file compiles; Task 2 replaces this import.
import { JUDGEMENT_UPSELL1, JUDGEMENT_UPSELL2 } from './upsellCopy/judgement';

/**
 * The pitch registry keyed by OFFER, for the shared /offers/upsell/ pages, which
 * resolve the offer from the booking session (not the URL). The pathname-based
 * upsell1Copy/upsell2Copy above stay for 02's own prefix-mounted pages.
 */
export const BACKEND_UPSELL_PITCH: Record<BackendOfferKey, { upsell1: Upsell1Copy; upsell2: Upsell2Copy }> = {
  'twin-flame': { upsell1: TWIN_FLAME_UPSELL1, upsell2: TWIN_FLAME_UPSELL2 },
  'judgement-day': { upsell1: JUDGEMENT_UPSELL1, upsell2: JUDGEMENT_UPSELL2 },
};

export function upsell1CopyForOffer(offer: BackendOfferKey): Upsell1Copy {
  return BACKEND_UPSELL_PITCH[offer].upsell1;
}
export function upsell2CopyForOffer(offer: BackendOfferKey): Upsell2Copy {
  return BACKEND_UPSELL_PITCH[offer].upsell2;
}
```

⚠ This task depends on Task 2's `judgement.ts`. Execute Task 2 FIRST if building strictly in order, OR create a minimal `judgement.ts` stub (re-exporting the twin-flame objects) to unblock, then complete it in Task 2. Recommended: **build Task 2 before Task 1** — reorder locally.

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run client/src/lib/backendOffers.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add client/src/lib/backendOffers.ts client/src/lib/backendOffers.test.ts && git commit -m "feat(be03): offer-keyed upsell pitch registry"`

---

### Task 2: `judgementUpsellCopy` (03's pitch)

**Files:**
- Create: `client/src/lib/upsellCopy/judgement.ts`
- Test: `client/src/lib/upsellCopy/judgement.test.ts`

**Interfaces:**
- Produces: `JUDGEMENT_UPSELL1: Upsell1Copy`, `JUDGEMENT_UPSELL2: Upsell2Copy`.
- Consumes: `Upsell1Copy`/`Upsell2Copy`/chains (`./types`); `V1_UPSELL1`, `V1_UPSELL2`, `V1_CHAIN_1`, `V1_CHAIN_2` (`./v1`).

**Source of truth for the copy:** `improve-v1/v1-one-time-BEs/copy/03/03-U-upsell-beats.md`. Author `judgement.ts` to MIRROR `twinFlame.ts`'s structure. Rules from the copy file:
- "Everything not rewritten below is V1's copy, unchanged" → for every `Upsell1Copy`/`Upsell2Copy` field NOT given a 03 value in `03-U`, spread from `V1_UPSELL1`/`V1_UPSELL2` (i.e. `export const JUDGEMENT_UPSELL1 = { ...V1_UPSELL1, <overrides> }`).
- 03-specific overrides for U1: `CONFIRMATION` (3 msgs), `GAP` (4), `RISK` (5), `QUESTION_1` + `QUESTION_1_REPLIES` (3 replies: yes/maybe/unsure), `AFTER_Q1` (branches yes/maybe/unsure/default), and the bucket block (`bucketMessages`) per `03-U1b` (love/money/purpose/someone; msgs 2&3 are V1's unchanged, 1&4 are 03's — reproduce the exact strings from the copy). `acceptLabel` — derive a 03-appropriate label (e.g. "Yes, guard what's opening"); `placeholderNames: ['Friend']`.
- 03-specific overrides for U2: `PATH_A_OPEN` (6 msgs), `PATH_B_OPEN` (6 msgs) per `03-U2a`. Everything else (INTRODUCE/STONES/PRICE/DOWNSELL/etc.) = V1's, since `03-U` only rewrote the path opens. `REVEAL`/`PERSONALIZE`: set to `null` (no 03 Claude segment) OR V1's, matching how the hook treats null (read the hook — if null triggers a Claude call, prefer V1's static arrays). `{duration}` token in PATH_A/B merges from intake; per the copy's build note, if absent the hook should cut the clause — confirm the hook's `{duration}` handling; if it doesn't support it, drop `{duration}` clauses to a safe static phrasing and note it.
- **Chain:** judgement keeps V1's question flow OR mirrors twin-flame's "questions absorbed" chain? `03-U` KEEPS `QUESTION_1` (it's "the strongest question in the deck"), so U1 uses a chain that ROUTES THROUGH the question (unlike twin-flame which skips it). Use `V1_CHAIN_1` as the base (it routes RISK→QUESTION_1). For U2, `03-U` provides only path opens; use `V1_CHAIN_2`.

- [ ] **Step 1: Write the failing test**

Create `client/src/lib/upsellCopy/judgement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { JUDGEMENT_UPSELL1, JUDGEMENT_UPSELL2 } from './judgement';

describe('judgement (03) upsell copy', () => {
  it('U1 opens on the 03 confirmation beats', () => {
    expect(JUDGEMENT_UPSELL1.CONFIRMATION[0]).toContain('page is open');
    expect(JUDGEMENT_UPSELL1.CONFIRMATION.length).toBe(3);
  });
  it('U1 keeps the strongest question and its three replies', () => {
    expect(JUDGEMENT_UPSELL1.QUESTION_1).toContain('holding a little back');
    expect(JUDGEMENT_UPSELL1.QUESTION_1_REPLIES.map((r) => r.value)).toEqual(['yes', 'maybe', 'unsure']);
    expect(Object.keys(JUDGEMENT_UPSELL1.AFTER_Q1)).toEqual(expect.arrayContaining(['yes', 'maybe', 'unsure', 'default']));
  });
  it('U1 bucket block keeps V1 msgs 2&3 and 03 msgs 1&4 for `someone`', () => {
    const msgs = JUDGEMENT_UPSELL1.bucketMessages('someone', 'Alex');
    expect(msgs.join(' ')).toContain('Alex'); // personName merge in msg 1/4
  });
  it('U2 opens on the 03 path beats and reuses V1 for the rest', () => {
    expect(JUDGEMENT_UPSELL2.PATH_A_OPEN[0]).toContain('page and the stone');
    expect(JUDGEMENT_UPSELL2.PATH_B_OPEN.length).toBe(6);
    expect(JUDGEMENT_UPSELL2.PRICE.length).toBeGreaterThan(0); // inherited from V1
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run client/src/lib/upsellCopy/judgement.test.ts` → FAIL (module missing).

- [ ] **Step 3: Author `client/src/lib/upsellCopy/judgement.ts`**

Read `twinFlame.ts` and `v1.ts` first. Build `JUDGEMENT_UPSELL1`/`JUDGEMENT_UPSELL2` as `{ ...V1_UPSELL1, <03 overrides> }` / `{ ...V1_UPSELL2, <03 overrides> }`, transcribing the exact message arrays from `improve-v1/v1-one-time-BEs/copy/03/03-U-upsell-beats.md`:
- `CONFIRMATION` = the 3 `UPSELL_CONFIRMATION` lines ("It's done, {firstName}. Your page is open…", "The three nights start…", "But before I go — there's something the Closing won't reach…").
- `GAP` = the 4 `UPSELL_GAP` lines. `RISK` = the 5 `UPSELL_RISK` lines. `QUESTION_1` = "Tell me honestly — since all this, have you found yourself holding a little back from people who had nothing to do with it?" with replies yes/maybe/unsure. `AFTER_Q1` = the 4 branches verbatim.
- `bucketMessages(bucket, personName)` = per `03-U1b`: for each of love/money/purpose/someone, msg1 (03) + V1 msgs 2&3 (pull from `V1_UPSELL1.bucketMessages` for that bucket, indices 1–2) + msg4 (03). The `someone` bucket interpolates `{personName}`.
- U2: `PATH_A_OPEN` (6 msgs, with the `{duration}` handling decided above), `PATH_B_OPEN` (6 msgs). Everything else spreads from `V1_UPSELL2`.
- `chain: V1_CHAIN_1` (U1, keeps the question) / `chain: V1_CHAIN_2` (U2). `pauses`: keep V1's or set light 03 pauses; `placeholderNames: ['Friend']`.

Then in Task 1's `backendOffers.ts`, ensure the import `{ JUDGEMENT_UPSELL1, JUDGEMENT_UPSELL2 }` resolves.

- [ ] **Step 4: Run to verify it passes** — `npx vitest run client/src/lib/upsellCopy/judgement.test.ts` → PASS. Also `npm run check`.

- [ ] **Step 5: Commit** — `git add client/src/lib/upsellCopy/judgement.ts client/src/lib/upsellCopy/judgement.test.ts && git commit -m "feat(be03): judgement-day upsell pitch (from 03-U beats)"`

---

### Task 3: Parametrize the upsell hooks (copy + backend-mode injectable, defaults unchanged)

**Files:**
- Modify: `client/src/hooks/useUpsellChat.ts`
- Modify: `client/src/hooks/useUpsell2Chat.ts`
- Test: manual + the 02 regression check in Task 8 (behavioural; the hooks are integration code).

**Interfaces:**
- `useUpsellChat` and `useUpsell2Chat` gain an OPTIONAL options argument (extend their existing params object). New optional fields:
  - `copyOverride?: Upsell1Copy` (resp. `Upsell2Copy`) — when provided, the hook uses it instead of `upsell1Copy()`/`upsell2Copy()` (the URL-based resolver).
  - `backendOverride?: boolean` — when provided, the hook uses it instead of `isTwinFlameOffer()` to choose the `/api/backend/upsell/*` endpoints and to skip V1 tracking.
- Defaults: both `undefined` → hook behaves EXACTLY as today (URL-based). This guarantees V1/02 are byte-identical.

- [ ] **Step 1: Read both hooks in full.** Identify the two seams in each:
  1. The copy resolution: `const copy = useMemo(() => upsell1Copy(), [])` (resp. `upsell2Copy()`).
  2. The backend detection: `const beFunnel = isTwinFlameOffer()` (used for endpoint selection + the V1-tracking guard).

- [ ] **Step 2: Add the optional params + apply the override, minimally.**

In `useUpsellChat.ts`, change the copy line to honour the override:

```ts
const copy = useMemo(() => opts?.copyOverride ?? upsell1Copy(), [opts?.copyOverride]);
```

and the backend line:

```ts
const beFunnel = opts?.backendOverride ?? isTwinFlameOffer();
```

(Use whatever the hook's existing param object is named; add `copyOverride?: Upsell1Copy` and `backendOverride?: boolean` to its type. Do the analogous change in `useUpsell2Chat.ts` with `Upsell2Copy`.)

⚠ Do NOT change any other logic. Every existing caller passes no override → identical behaviour.

- [ ] **Step 3: Typecheck** — `npm run check` (no NEW errors). The existing `UpsellPage`/`Upsell2Page` still compile (they pass no new args).

- [ ] **Step 4: Commit** — `git add client/src/hooks/useUpsellChat.ts client/src/hooks/useUpsell2Chat.ts && git commit -m "feat(be03): allow injecting upsell copy + backend-mode into the hooks (defaults unchanged)"`

---

### Task 4: New shared `/offers/upsell/` pages

**Files:**
- Create: `client/src/pages/offers/OffersUpsell1.tsx`
- Create: `client/src/pages/offers/OffersUpsell2.tsx`
- Modify: `client/src/App.tsx` (lazy imports + routes)
- Test: route smoke in Task 8.

**Interfaces:**
- Consumes: `useUpsellChat`/`useUpsell2Chat` with `copyOverride`+`backendOverride:true` (Task 3); `upsell1CopyForOffer`/`upsell2CopyForOffer` (Task 1); `isBackendOfferKey`/`BACKEND_OFFER_CATALOG` (`@shared/backendOffers`); the `components/upsell/*` barrel + `CosmicBackground`.
- Route contract: `/offers/upsell/welcome1?session_id=<cs_…>` and `/offers/upsell/welcome2?session_id=<cs_…>`.

- [ ] **Step 1: Read `UpsellPage.tsx` and `Upsell2Page.tsx` in full** — the new pages mirror their structure (load user-data, render the hook's messages + CTA + shipping), with three differences: (a) they always run backend-mode, (b) they resolve copy from the session's `offer`, (c) navigation targets `/offers/upsell/...` and the offer's success page.

- [ ] **Step 2: Build `OffersUpsell1.tsx`**

Skeleton (fill render from `UpsellPage.tsx`'s JSX, reusing the same components):

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { CosmicBackground } from '@/components/CosmicBackground';
import { QuickReplies, UpsellCTA, ShippingForm } from '@/components/upsell';
import { useUpsellChat } from '@/hooks/useUpsellChat';
import { upsell1CopyForOffer } from '@/lib/backendOffers';
import { isBackendOfferKey, BACKEND_OFFER_CATALOG, type BackendOfferKey } from '@shared/backendOffers';

export default function OffersUpsell1() {
  const [, navigate] = useLocation();
  const sessionId = new URLSearchParams(window.location.search).get('session_id') ?? '';
  const [userData, setUserData] = useState<any>(null);
  const [offer, setOffer] = useState<BackendOfferKey | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sessionId) { setError(true); return; }
    fetch(`/api/backend/upsell/user-data?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!isBackendOfferKey(d.offer)) return Promise.reject();
        setOffer(d.offer);
        setUserData(d);
      })
      .catch(() => setError(true));
  }, [sessionId]);

  const copy = useMemo(() => (offer ? upsell1CopyForOffer(offer) : null), [offer]);

  // On decline OR completion, go to Upsell 2 carrying the session.
  const goNext = () => navigate(`/offers/upsell/welcome2?session_id=${encodeURIComponent(sessionId)}`);

  if (error) return /* graceful fallback UI (see UpsellPage's error branch) */ null;
  if (!userData || !copy || !offer) return null; // brief load

  return <OffersUpsell1Inner userData={userData} sessionId={sessionId} copy={copy} onNext={goNext} />;
}
```

Then an inner component that calls the hook with overrides and renders (mirror `UpsellPage`'s body — messages list, typing, `QuickReplies`, `UpsellCTA`, `ShippingForm`), passing `copyOverride: copy, backendOverride: true` into `useUpsellChat`, and calling `onNext()` when the hook signals complete/declined:

```tsx
function OffersUpsell1Inner({ userData, sessionId, copy, onNext }) {
  const chat = useUpsellChat({ userData, sessionId, copyOverride: copy, backendOverride: true /* + whatever existing required params UpsellPage passes */ });
  // render exactly as UpsellPage does; when chat.isComplete → onNext()
  useEffect(() => { if (chat.isComplete) onNext(); }, [chat.isComplete]);
  return (/* CosmicBackground + message list + footer(QuickReplies/UpsellCTA/ShippingForm), copied from UpsellPage */);
}
```

⚠ Match `UpsellPage.tsx`'s EXACT hook-param shape and render — read it and reproduce; do not invent prop names.

- [ ] **Step 3: Build `OffersUpsell2.tsx`** — same pattern with `useUpsell2Chat` + `upsell2CopyForOffer(offer)` + `Upsell2CTA`/`Upsell2DownsellCTA`. On completion, navigate to the offer's success page: `navigate(`${BACKEND_OFFER_CATALOG[offer].successPath}?s=${encodeURIComponent(sessionId)}`)`.

- [ ] **Step 4: Register routes in `App.tsx`**

```tsx
const OffersUpsell1 = lazy(() => import("@/pages/offers/OffersUpsell1"));
const OffersUpsell2 = lazy(() => import("@/pages/offers/OffersUpsell2"));
// …in the <Switch>:
<Route path="/offers/upsell/welcome1" component={OffersUpsell1} />
<Route path="/offers/upsell/welcome2" component={OffersUpsell2} />
```

- [ ] **Step 5: Typecheck** — `npm run check` (no new errors). **Commit** — `git commit -m "feat(be03): shared /offers/upsell/ pages (session-driven offer + pitch)"`

---

### Task 5: Move 03 booking under `/offers/`

**Files:**
- Modify: `client/src/lib/funnel.ts` (`JUDGEMENT_PREFIX`)
- Modify: `client/src/pages/JudgementBookingPage.tsx` (`BOOKING_PATH`)
- Modify: `shared/backendOffers.ts` (judgement `bookingPath`, `successPath`)
- Modify: `client/src/App.tsx` (judgement routes)

- [ ] **Step 1:** In `funnel.ts`: `export const JUDGEMENT_PREFIX = "/offers/wiccan/judgement-day";`
- [ ] **Step 2:** In `JudgementBookingPage.tsx`: `const BOOKING_PATH = '/offers/wiccan/judgement-day';`
- [ ] **Step 3:** In `shared/backendOffers.ts` judgement entry: `bookingPath: { page: '/offers/wiccan/judgement-day', chat: '/offers/wiccan/judgement-day/chat' }`, `successPath: '/offers/wiccan/judgement-day/success'`.
- [ ] **Step 4:** In `App.tsx`, update the judgement routes to the new paths (keep the two components):

```tsx
<Route path="/offers/wiccan/judgement-day/chat" component={JudgementBookingChat} />
<Route path="/offers/wiccan/judgement-day" component={JudgementBookingPage} />
```

- [ ] **Step 5:** `npm run check` clean. Grep to confirm no stray `/wiccan/judgement-day` (non-/offers) remains: `grep -rn "\"/wiccan/judgement-day" client shared server | grep -v "/offers/"` → empty. **Commit** — `git commit -m "feat(be03): move Judgement Day booking under /offers/wiccan/judgement-day"`

---

### Task 6: 03 thank-you = Entry page (from Joel's 03-T1)

**Files:**
- Create: `client/src/pages/JudgementThankYouPage.tsx`
- Modify: `client/src/App.tsx` (lazy import + route `/offers/wiccan/judgement-day/success`)

- [ ] **Step 1: Read `TwinFlameThankYouPage.tsx`** (the structural model) and `improve-v1/v1-one-time-BEs/copy/03/03-T1-thank-you-page.md` (the content).

- [ ] **Step 2: Build `JudgementThankYouPage.tsx`** — mirror `TwinFlameThankYouPage`'s shell (CosmicBackground, card, `?session_id=` → `/api/order/details` fetch for firstName), but render the `03-T1` copy, with the P7 inversion (the **reply/Entry instruction ABOVE the delivery promise**). Key content, `%FIRSTNAME%` → the fetched name:
  - Heading: "Your page is open, {firstName}."
  - "Now the part only you can do" → **"Go to your inbox and reply to the email I've just sent you. Tell me who it is. What they did…"** (the Entry = her email reply; NO on-page form).
  - "Then what happens" (Entry, Transfer, Closing; record titled "{firstName} — your account is closed").
  - No bump delivery on this page (unlike 02).
- [ ] **Step 3: Route** in `App.tsx`:

```tsx
const JudgementThankYouPage = lazy(() => import("@/pages/JudgementThankYouPage"));
<Route path="/offers/wiccan/judgement-day/success" component={JudgementThankYouPage} />
```

- [ ] **Step 4:** `npm run check` clean. **Commit** — `git commit -m "feat(be03): Judgement Day thank-you/Entry page (03-T1)"`

---

### Task 7: Wire booking → upsell chain + flip readyForMoney

**Files:**
- Modify: `shared/backendOffers.ts` (judgement `upsellEntryPath`, `readyForMoney`)

- [ ] **Step 1:** In the judgement-day catalog entry, add `upsellEntryPath: '/offers/upsell/welcome1',` and set `readyForMoney: true,` (remove the "FALSE UNTIL A6" comment; A6/thank-you now renders via Task 6). Leave `entryPath` commented (the on-site Entry form is out of scope; the thank-you directs her to reply by email).

Confirm the flow the checkout produces (already in `server/routes/backendOffers.ts`): booking `success_url` = `${origin}${offer.upsellEntryPath}?session_id={CHECKOUT_SESSION_ID}` → `/offers/upsell/welcome1?session_id=…` (Task 4) → welcome2 → `${successPath}?s=…` (Task 6). No server change needed.

- [ ] **Step 2:** `npm run check` + run the existing backend catalog tests: `npx vitest run server/lib/backendOffers.test.ts` (the `readyForMoney`/catalog shape assertions still pass). **Commit** — `git commit -m "feat(be03): turn on Judgement Day upsells + checkout (readyForMoney)"`

---

### Task 8: Local end-to-end run + 02 regression check

**Files:**
- Create: `improve-v1/v1-one-time-BEs/scripts/walk-03-full.mjs` (Playwright walk), OR extend the existing `walk-03-booking*.mjs`.

- [ ] **Step 1: Bring up the app locally** against `seer_local` with checkout on and Stripe TEST. Port 5000 is AirPlay — start on another port (e.g. `PORT=5050`). Set `VITE_BACKEND_CHECKOUT_LIVE=true` (build-time) and dev Stripe TEST keys. Seed nothing for 03 (page-only, no experiment). Ensure `be_orders` + `be_upsell_orders` exist in `seer_local` (they do — provisioned in Plan 1).

- [ ] **Step 2: Walk 03 end-to-end in a browser/Playwright:** `/offers/wiccan/judgement-day` → tick the 4 gate boxes → step 2 (give ≥ $17) → optional bump → checkout (Stripe TEST card) → lands `/offers/upsell/welcome1?session_id=…` → accept/decline U1 → `/offers/upsell/welcome2` → accept/decline U2 (+ downsell) → `/offers/wiccan/judgement-day/success` (thank-you renders the 03-T1 copy). Assert: no 404, no dead-air, the upsell copy shown is 03's ("page is open", "holding a little back"), and after an accepted upsell a `be_upsell_orders` row exists with `offer='judgement-day'` (query via `server/scripts/be-upsell-stats.ts`).

- [ ] **Step 3: 02 REGRESSION — prove twin-flame is unchanged.** Load `/tarot/twin-flame/welcome1?session_id=<a paid 02 test session>` (or the preview) and confirm it renders the twin-flame copy exactly as before, hitting `/api/backend/upsell/*`. (The hooks' overrides default off, so this should be identical — verify.)

- [ ] **Step 4: Commit** the walk script + a short evidence note under `improve-v1/evidence/`. `git commit -m "test(be03): local end-to-end funnel walk + 02 regression"`

---

## Self-Review

**Spec coverage:** shared `/offers/upsell/` pages (T4) ✅; offer-keyed pitch registry (T1) ✅; judgementUpsellCopy (T2) ✅; 03 `/offers/` URL move (T5) ✅; booking→upsell wiring (T7) ✅; thank-you=Entry from 03-T1 (T6) ✅; hooks reused not duplicated, V1 byte-identical (T3 + T8 Step 3) ✅; local end-to-end (T8) ✅.

**Ordering note:** Build **Task 2 before Task 1** (Task 1 imports judgement copy). Tasks 3→4 (pages need the parametrized hooks). Tasks 5,6,7 can follow. Task 8 last.

**Placeholder scan:** The render bodies of T4's pages and T6's page reference "copy from UpsellPage/TwinFlameThankYouPage" rather than inlining ~200 lines of JSX — this is deliberate for faithful reuse; the implementer READS the named file and reproduces its structure. All interfaces, param names, routes, and copy sources are concrete.

**Out of scope (flagged):** the on-site Entry FORM + its storage/`entryPath` (the thank-you directs to email reply per 03-T1); the 03 product PDF + delivery email (Joel); any 03 A/B.
