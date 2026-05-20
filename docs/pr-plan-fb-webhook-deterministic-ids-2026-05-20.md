# PR Plan — V1/V1-FB Webhook FB Events + Deterministic Client Event IDs + Server-side Lead

**Date drafted:** 2026-05-20
**Status:** Designed, not yet committed. Session paused mid-implementation (first Edit was rejected — file unchanged).
**Branch suggestion:** `fb-webhook-events-and-deterministic-ids` off `sync-development-with-production`
**Combined scope:** tasks #1 + #2 from the FB/Stape rollout sequence (shipped together because dedup needs both sides to use matching IDs).

## Context

Boss reported (2026-05-19) that V1 funnel was losing ~5 main + 2-3 upsell1 + 2-3 upsell2 FB events per day. Investigation found:

1. **All V1/V1-FB FB events fire client-side only.** If the browser tab closes / adblock blocks `/api/fb-event`, events are lost.
2. **The Stripe webhook fires ZERO Facebook events.** It handles `checkout.session.completed` for Trackdesk affiliate reporting but does nothing FB-related.
3. **`payment_intent.succeeded` is not subscribed/handled at all.** The 1-click upsells use `paymentIntents.create` (off_session) which fires `payment_intent.succeeded` — currently ignored entirely. This is the smoking gun for Upsell2 showing only 6 events in 7 days.
4. **Lead has the same gap.** `/api/lead` saves to DB + AWeber + Trackdesk but does not fire FB Lead. The client's separate `trackLead()` → `/api/fb-event` call is the only CAPI path.

This PR is **step 1** of the 4-step plan (see memory: `stape-setup-procedure-and-retrofit.md`):
1. **THIS PR** — webhook patch + deterministic client IDs + server-side Lead
2. Phase 0 — EMQ baseline (already captured to memory: `fb-emq-baseline-pre-stape.md`)
3. Phases 1-4 — Stape retrofit for V1/V1-FB

## Decisions locked (from 2026-05-19 + 2026-05-20 conversations)

| Decision | Choice |
|---|---|
| Order of operations | **A** — webhook first, then Stape |
| Tasks #1 + #2 sequencing | Ship together in **one PR** (this one) |
| Helper location | `server/lib/facebook.ts` (alongside `fireV2PurchaseEvent`) |
| Failed-payment custom event | **No** — out of scope |
| Lead in scope | **Yes** — server-side fire from `/api/lead` |
| EvelynLanderCTA | **Skip** — currently dead code, leave alone |
| fbp/fbc for Lead | Option **A** — client passes them in `/api/lead` body |
| Pixel shared with royalnumerology.com | Acknowledged — safe to proceed for Seer Within; long-term hygiene conversation deferred |

## Event ID scheme (CRITICAL — client and server must match)

`mainSessionId` = the ORIGINAL main-purchase Checkout Session id. Upsell events key off `metadata.originalSession`, not the upsell session/PI id, so client and server land on the same id regardless of whether the upsell went 1-click or fallback-Checkout.

| Event | Product | Funnel | event_name | event_id |
|---|---|---|---|---|
| Main purchase | `energy_clearing_ritual` | any | `Purchase` | `purchase_${mainSessionId}` |
| Upsell 1 | `protection_ritual` | any | `Upsell` | `upsell_u1_${mainSessionId}` |
| Upsell 2 (V1) | `manifestation_bracelet` | `undefined` | `Upsell` | `upsell_u2_${mainSessionId}` |
| Upsell 2 (V1-FB) | `manifestation_bracelet` | `v1-fb` | `Upsell2` | `upsell2_${mainSessionId}` |
| Lead | n/a | any | `Lead` | `lead_${sha256(email).slice(0,16)}` |

For Lead, both sides hash the lowercased+trimmed email with SHA-256 and take the first 16 hex chars. Server uses Node `crypto`, client uses Web Crypto (`crypto.subtle.digest`). Client `trackLead` becomes async.

## Files to change

1. `server/lib/facebook.ts` — add `fireStripePurchaseEvent` helper + import `getConversationByStripeSession`
2. `server/routes/webhooks.ts` — add FB firing inside existing `checkout.session.completed`; new `payment_intent.succeeded` handler
3. `server/routes.ts` — extract `fbc`/`fbp` from `/api/lead` body, add non-blocking FB Lead fire
4. `client/src/lib/facebook.ts` — add `shortHashSha256` helper, make `trackLead` async, add `mainSessionId` param to purchase tracking functions
5. `client/src/hooks/useConversation.ts` — pass `fbp`/`fbc` in `/api/lead` POST body
6. `client/src/pages/UpsellPage.tsx` — pass `sid` to `trackPurchase`
7. `client/src/pages/Upsell2Page.tsx` — pass `sid` to `trackUpsellPurchase` (suffix `u1`)
8. `client/src/pages/SuccessPage.tsx` — pass `sid` to `trackUpsellPurchase` (suffix `u2`) and `trackUpsell2Purchase`

## Manual step (must happen before deploy)

**Stripe Dashboard** → Developers → Webhooks → the Trackdesk webhook endpoint (whichever endpoint uses `STRIPE_TRACKDESK_WEBHOOK_SECRET`) → Add events:

- `payment_intent.succeeded`

Without this, the new PI handler will never fire — 1-click upsell events will continue to be lost.

---

## Code

### 1. `server/lib/facebook.ts`

**Change import line at top:**

```ts
// BEFORE
import { db } from './db';

// AFTER
import { db, getConversationByStripeSession } from './db';
```

**Insert the entire block below directly above the line that says `// LEGACY — kept dormant (zero callers as of 2026-05-12) for potential`:**

```ts
// ============================================================
// V1 / V1-FB Stripe-triggered FB event firing (webhook path)
// ============================================================
//
// Server-side counterpart to the client-side Pixel fires in
// UpsellPage.tsx, Upsell2Page.tsx, SuccessPage.tsx. Recovers events
// when the browser tab closes / adblock blocks `/api/fb-event`.
//
// Event ID scheme is deterministic and MUST match the client. The
// client-side equivalent lives in client/src/lib/facebook.ts —
// keep both in sync.
//
//   Purchase  (energy_clearing_ritual)      → `purchase_${mainSessionId}`
//   Upsell    (protection_ritual)           → `upsell_u1_${mainSessionId}`
//   Upsell    (manifestation_bracelet, V1)  → `upsell_u2_${mainSessionId}`
//   Upsell2   (manifestation_bracelet, /fb) → `upsell2_${mainSessionId}`
//
// `mainSessionId` is the ORIGINAL main-purchase Checkout Session id.
// Upsell events key off `metadata.originalSession`, not the upsell
// session/PI id, so client and server land on the same id regardless
// of whether the upsell went 1-click or fallback-Checkout.

const FB_PRODUCT_NAMES: Record<string, string> = {
  energy_clearing_ritual: 'Energy Clearing Ritual',
  protection_ritual: 'Volcanic Stone (aka Black Lava)',
  manifestation_bracelet: 'Manifestation Bracelet',
};

function resolveStripeEventName(
  product: string,
  funnel?: string,
): 'Purchase' | 'Upsell' | 'Upsell2' | null {
  switch (product) {
    case 'energy_clearing_ritual':
      return 'Purchase';
    case 'protection_ritual':
      return 'Upsell';
    case 'manifestation_bracelet':
      return funnel === 'v1-fb' ? 'Upsell2' : 'Upsell';
    default:
      return null;
  }
}

function makeStripeEventId(
  eventName: 'Purchase' | 'Upsell' | 'Upsell2',
  product: string,
  mainSessionId: string,
): string {
  if (eventName === 'Purchase') return `purchase_${mainSessionId}`;
  if (eventName === 'Upsell2') return `upsell2_${mainSessionId}`;
  // Upsell — must disambiguate U1 (protection_ritual) from U2
  // (manifestation_bracelet on V1) since both share event_name.
  const suffix = product === 'protection_ritual' ? 'u1' : 'u2';
  return `upsell_${suffix}_${mainSessionId}`;
}

function eventSourceUrlForStripeEvent(product: string, funnel?: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const prefix = funnel === 'v1-fb' ? '/fb' : '';
  switch (product) {
    case 'energy_clearing_ritual':
      return `${baseUrl}${prefix}/welcome1`;
    case 'protection_ritual':
      return `${baseUrl}${prefix}/welcome2`;
    case 'manifestation_bracelet':
      return `${baseUrl}${prefix}/success`;
    default:
      return `${baseUrl}${prefix}/`;
  }
}

interface StripeFbEventParams {
  // Pass the id we want surfaced in logs/dashboards — Checkout Session id
  // for main + fallback paths, PaymentIntent id for 1-click paths.
  stripeRefId: string;
  // Original main-purchase Checkout Session id. For the main Purchase fire
  // this equals stripeRefId. For upsells, this is metadata.originalSession.
  mainSessionId: string;
  product: string;
  type?: string;
  funnel?: string;
  amountCents: number;
  email?: string;
  firstName?: string;
}

export async function fireStripePurchaseEvent(
  params: StripeFbEventParams,
): Promise<void> {
  try {
    const eventName = resolveStripeEventName(params.product, params.funnel);
    if (!eventName) {
      logger.warn('fireStripePurchaseEvent: unknown product, skipping', {
        product: params.product,
      });
      return;
    }

    const eventId = makeStripeEventId(eventName, params.product, params.mainSessionId);

    // Backfill email/firstName when missing (1-click upsell PIs don't
    // carry them in metadata; pull from the original conversation row).
    let email = params.email;
    let firstName = params.firstName;
    if ((!email || !firstName) && params.mainSessionId) {
      try {
        const conv = await getConversationByStripeSession(params.mainSessionId);
        email = email || conv?.email || undefined;
        firstName = firstName || conv?.firstName || undefined;
      } catch (err) {
        logger.warn('fireStripePurchaseEvent: DB backfill failed', {
          err: String(err),
          mainSessionId: params.mainSessionId,
        });
      }
    }

    const contentName = FB_PRODUCT_NAMES[params.product] ?? '';

    await sendFacebookEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrlForStripeEvent(params.product, params.funnel),
      value: params.amountCents / 100,
      currency: 'USD',
      contentName,
      userData: { email, firstName },
    });

    logger.info('FB Stripe event fired', {
      eventName,
      eventId,
      product: params.product,
      funnel: params.funnel ?? 'v1',
      stripeRefId: params.stripeRefId,
      valueUsd: params.amountCents / 100,
    });
  } catch (err) {
    logger.error('fireStripePurchaseEvent failed', {
      err: String(err),
      stripeRefId: params.stripeRefId,
      product: params.product,
    });
  }
}

// ============================================================
// Server-side Lead event firing (called from /api/lead)
// ============================================================
//
// Lead survival cannot depend on the browser successfully calling
// `/api/fb-event` after `/api/lead` returns — if the tab closes or
// adblock blocks the second POST, FB never sees the Lead. Firing
// inside `/api/lead` itself (non-blocking) closes that gap.
//
// event_id is `lead_${sha256(email).slice(0,16)}` — deterministic,
// matches client-side trackLead so Pixel + CAPI dedup cleanly.

export interface LeadFbEventParams {
  email: string;
  firstName?: string;
  funnel?: string;
  userAgent?: string;
  clientIpAddress?: string;
  fbc?: string;
  fbp?: string;
}

export function makeLeadEventId(email: string): string {
  const normalized = email.toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return `lead_${hash.slice(0, 16)}`;
}

export async function fireLeadEvent(params: LeadFbEventParams): Promise<void> {
  try {
    if (!params.email) return;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const prefix = params.funnel === 'v1-fb' ? '/fb' : '';
    const eventSourceUrl = `${baseUrl}${prefix}/chat`;
    await sendFacebookEvent({
      eventName: 'Lead',
      eventId: makeLeadEventId(params.email),
      eventSourceUrl,
      contentName: 'Email Capture',
      userData: {
        email: params.email,
        firstName: params.firstName,
        userAgent: params.userAgent,
        clientIpAddress: params.clientIpAddress,
        fbc: params.fbc,
        fbp: params.fbp,
      },
    });
    logger.info('FB Lead event fired (server-side)', {
      email: params.email,
      funnel: params.funnel ?? 'v1',
    });
  } catch (err) {
    logger.error('fireLeadEvent failed', { err: String(err), email: params.email });
  }
}

```

### 2. `server/routes/webhooks.ts`

**Add to imports at the top (line 11):**

```ts
// BEFORE
import { fireV2PurchaseEvent } from '../lib/facebook';

// AFTER
import { fireV2PurchaseEvent, fireStripePurchaseEvent } from '../lib/facebook';
```

**Replace the existing `checkout.session.completed` block (lines 653-682) with this expanded version:**

```ts
// Handle checkout.session.completed
if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const trackdeskClickId = metadata.trackdeskClickId;
  const product = metadata.product;
  const email = metadata.email || metadata.firstName || session.customer_email || '';

  logger.info(`Stripe webhook: checkout.session.completed — product=${product}, session=${session.id}`);

  // ---- Trackdesk affiliate reporting (existing behavior) ----
  if (trackdeskClickId) {
    const amountTotal = (session.amount_total || 0) / 100; // cents to dollars
    const externalId = product === 'protection_ritual'
      ? `${metadata.originalSession || session.id}_upsell1`
      : session.id;
    reportTrackdeskConversion({
      clickId: trackdeskClickId,
      conversionType: 'sale',
      amount: amountTotal,
      externalId,
      customerId: email,
    });
  } else {
    logger.info('Stripe webhook: No trackdeskClickId in metadata, skipping affiliate tracking');
  }

  // ---- FB server-side event firing (NEW) ----
  if (product && (session.amount_total ?? 0) > 0) {
    const mainSessionId = metadata.originalSession || session.id;
    fireStripePurchaseEvent({
      stripeRefId: session.id,
      mainSessionId,
      product,
      type: metadata.type,
      funnel: metadata.funnel,
      amountCents: session.amount_total ?? 0,
      email: metadata.email || session.customer_email || undefined,
      firstName: metadata.firstName || undefined,
    }).catch(() => { /* logged inside */ });
  }
}

// Handle payment_intent.succeeded — only for 1-click upsells
// (main-purchase PIs are owned by a Checkout Session and handled above).
if (event.type === 'payment_intent.succeeded') {
  const pi = event.data.object as Stripe.PaymentIntent;
  const metadata = pi.metadata || {};

  // Filter: 1-click upsells set metadata.originalSession.
  // Main purchases (which also fire payment_intent.succeeded as a
  // side-effect of their Checkout Session completing) do NOT set it.
  if (!metadata.originalSession) {
    logger.info(`Stripe webhook: payment_intent.succeeded skipped (no originalSession), pi=${pi.id}`);
    return res.json({ received: true });
  }

  logger.info(`Stripe webhook: payment_intent.succeeded — product=${metadata.product}, pi=${pi.id}`);

  if (metadata.product && pi.amount > 0) {
    fireStripePurchaseEvent({
      stripeRefId: pi.id,
      mainSessionId: metadata.originalSession,
      product: metadata.product,
      type: metadata.type,
      funnel: metadata.funnel,
      amountCents: pi.amount,
      email: metadata.email,
      firstName: metadata.firstName,
    }).catch(() => { /* logged inside */ });
  }
}
```

### 3. `server/routes.ts` — `/api/lead` handler

**Update import block (find the existing `fireV2PurchaseEvent` import or `sendFacebookEvent` import — likely near the top of the file):**

Confirmed: `sendFacebookEvent` is already used at routes.ts:2347 inside `/api/fb-event`, so it's already imported. Add `fireLeadEvent` to that same import.

**Update the `/api/lead` body destructuring (line 586):**

```ts
// BEFORE
const { email, firstName, bucket, location, timeOfDay, trackdeskClickId } = req.body;

// AFTER
const { email, firstName, bucket, location, timeOfDay, trackdeskClickId, fbp, fbc } = req.body;
```

**Add the FB Lead fire block immediately after the Trackdesk block (after line 634, before `return res.json(...)` at line 636):**

```ts
// Report Lead event to Facebook (server-side, non-blocking).
// Mirrors the client-side trackLead() fire — both use the same
// deterministic eventID (lead_${sha256(email).slice(0,16)}) so
// FB dedupes them as one event.
if (email) {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIpAddress =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress || undefined;
  fireLeadEvent({
    email,
    firstName,
    funnel,
    userAgent: req.headers['user-agent'] as string | undefined,
    clientIpAddress,
    fbc,
    fbp,
  }).catch((err) => {
    logger.warn('FB Lead event error (non-blocking):', err);
  });
}
```

### 4. `client/src/lib/facebook.ts`

**Add helper near top of file (after `getFbBrowserId()` around line 45):**

```ts
// Deterministic event-ID hash. MUST match the server-side equivalent
// in server/lib/facebook.ts so Pixel + CAPI dedup cleanly. Uses
// Web Crypto SHA-256 (async); first 16 hex chars only.
async function shortHashSha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
```

**Replace `trackLead` (lines 91-104) with async version:**

```ts
export async function trackLead(email: string, firstName?: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const eventId = `lead_${await shortHashSha256(normalized)}`;

  // value/currency intentionally omitted: Meta Events Manager flags
  // value=0 as a data-quality issue, and the spec lists both as optional
  // for the Lead event since email capture has no realized monetary value.
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: 'Email Capture',
    }, { eventID: eventId });
  }

  sendServerEvent('Lead', eventId, { email, firstName, content_name: 'Email Capture' });
}
```

**Replace `trackPurchase` (lines 132-154) — add `mainSessionId` param:**

```ts
export function trackPurchase(
  value: number = 35,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Energy Clearing Ritual',
  mainSessionId?: string,
): void {
  const eventId = mainSessionId
    ? `purchase_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  sendServerEvent('Purchase', eventId, {
    value,
    currency,
    email,
    content_name: contentName,
  });
}
```

**Replace `trackUpsellPurchase` (lines 193-218) — add `mainSessionId` and `upsellSlot` params:**

```ts
export function trackUpsellPurchase(
  value: number,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Manifestation Bracelet',
  mainSessionId?: string,
  // 'u1' = protection_ritual, 'u2' = manifestation_bracelet (V1 funnel).
  // Required to disambiguate U1 from U2 within the shared "Upsell" event_name.
  upsellSlot: 'u1' | 'u2' = 'u2',
): void {
  const dedupKey = `upsell_purchase_tracked_${contentName}_${value}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(dedupKey)) {
    return;
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(dedupKey, 'true');
  }

  const eventId = mainSessionId
    ? `upsell_${upsellSlot}_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'Upsell', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  sendServerEvent('Upsell', eventId, {
    value,
    currency,
    email,
    content_name: contentName,
  });
}
```

**Replace `trackUpsell2Purchase` (lines 225-255) — add `mainSessionId` param:**

```ts
export function trackUpsell2Purchase(
  value: number,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Manifestation Bracelet',
  mainSessionId?: string,
): void {
  const dedupKey = `upsell2_purchase_tracked_${contentName}_${value}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(dedupKey)) {
    return;
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(dedupKey, 'true');
  }

  const eventId = mainSessionId
    ? `upsell2_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', 'Upsell2', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  sendServerEvent('Upsell2', eventId, {
    value,
    currency,
    email,
    content_name: contentName,
  });
}
```

### 5. `client/src/hooks/useConversation.ts` — `/api/lead` POST + async trackLead

**Around line 363, expand the `/api/lead` body to include fbp/fbc cookies:**

```ts
// BEFORE
const leadRes = await fetch('/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: input.trim(),
    firstName: currentChat.userData.firstName,
    bucket: currentChat.userData.bucket,
    trackdeskClickId: getTrackdeskClickId(),
    funnel: currentFunnel(),
  }),
})

// AFTER
const fbpMatch = typeof document !== 'undefined'
  ? document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/)
  : null;
const fbcMatch = typeof document !== 'undefined'
  ? document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/)
  : null;
const leadRes = await fetch('/api/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: input.trim(),
    firstName: currentChat.userData.firstName,
    bucket: currentChat.userData.bucket,
    trackdeskClickId: getTrackdeskClickId(),
    funnel: currentFunnel(),
    fbp: fbpMatch ? decodeURIComponent(fbpMatch[1]) : undefined,
    fbc: fbcMatch ? decodeURIComponent(fbcMatch[1]) : undefined,
  }),
})
```

**Around line 388, `trackLead` is now async — change to fire-and-forget (existing code is wrapped in a try; check it doesn't await trackLead. If not awaiting, no change needed; if awaiting, just add `.catch(() => {})` since failures are silent):**

```ts
// AFTER (line 388)
trackLead(input.trim(), currentChat.userData.firstName || undefined).catch(() => {/* non-blocking */})
trackGAdsLead()
```

### 6. `client/src/pages/UpsellPage.tsx`

**Update line 83 — pass `sid` as `mainSessionId`:**

```ts
// BEFORE
trackPurchase(purchaseAmount, "USD", data.email);

// AFTER
trackPurchase(purchaseAmount, "USD", data.email, "Energy Clearing Ritual", sid);
```

### 7. `client/src/pages/Upsell2Page.tsx`

**Update line 136 — pass `sid` as `mainSessionId` and `'u1'` slot:**

```ts
// BEFORE
trackUpsellPurchase(47, "USD", data.email, "Protection Ritual + Lava Stone");

// AFTER
trackUpsellPurchase(47, "USD", data.email, "Protection Ritual + Lava Stone", sid, 'u1');
```

### 8. `client/src/pages/SuccessPage.tsx`

**Update lines 161-163 — pass `sessionId` as `mainSessionId`:**

```ts
// BEFORE
if (isFbFunnel()) {
  trackUpsell2Purchase(amount, "USD", data.email, "Manifestation Bracelet");
} else {
  trackUpsellPurchase(amount, "USD", data.email, "Manifestation Bracelet");
}

// AFTER
if (isFbFunnel()) {
  trackUpsell2Purchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId);
} else {
  trackUpsellPurchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId, 'u2');
}
```

---

## Testing plan (dev/staging before prod)

### Pre-flight
1. Confirm `FB_TEST_EVENT_CODE` env var is set in dev to a value from Meta Events Manager → Test Events tab
2. Confirm `STRIPE_TRACKDESK_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` test-mode values are in dev `.env`
3. **Run Stripe Dashboard manual step in test mode:** add `payment_intent.succeeded` to the webhook subscription on the TEST endpoint

### V1 path (`/`) — full funnel
1. Open `/chat`, enter email → Lead should appear in Test Events (both Pixel + CAPI, same `event_id`)
2. Complete reading → click checkout
3. Use Stripe test card `4242 4242 4242 4242` → land on `/welcome1` → Purchase event appears
4. Click Upsell 1 ($47) → 1-click attempt → if succeeds, land on `/welcome2` → Upsell event appears (with `event_id` = `upsell_u1_{mainSessionId}`)
5. Click Upsell 2 → 1-click → land on `/success` → Upsell event appears (with `event_id` = `upsell_u2_{mainSessionId}`)

### V1-FB path (`/fb`) — same funnel, different event for U2
1. Same steps as V1 but at `/fb` paths
2. On step 5, expect `Upsell2` event (not `Upsell`) with `event_id` = `upsell2_{mainSessionId}`

### Verification checklist per event
- [ ] Appears in Meta Events Manager → Test Events
- [ ] Both Pixel and CAPI sources show
- [ ] Same `event_id` on both sources (dedup intact)
- [ ] `event_source_url` matches funnel (`theseerwithin.com/welcome1` vs `theseerwithin.com/fb/welcome1`)
- [ ] `value` and `currency` correct
- [ ] `user_data.em` (hashed email) present
- [ ] No duplicate event with different `event_id` (means client and server out of sync)

### Tab-close stress test (the actual fix being verified)
1. Trigger main checkout, complete payment in Stripe, then CLOSE the tab before redirect lands on `/welcome1`
2. Wait 30s
3. Confirm in Test Events: **Purchase event still arrived** (from webhook) — this is the gap closing

### 1-click upsell stress test
1. Complete main + arrive at `/welcome1`
2. Click "Yes" on Upsell 1 → before the page updates, CLOSE the tab
3. Wait 30s
4. Confirm in Test Events: **Upsell event arrived** (from `payment_intent.succeeded` handler) — confirms the new handler works

### Lead robustness test
1. Submit email in `/chat`
2. In DevTools Network panel, BLOCK requests to `/api/fb-event` (e.g., simulate adblock)
3. Confirm in Test Events: **Lead event still arrives** (from `/api/lead` server-side fire)

## Production rollout

1. Merge PR to `rober/development` (per memory: that's the primary push target)
2. Deploy to production
3. **Manually add `payment_intent.succeeded` to production Stripe webhook subscription**
4. Monitor first hour:
   - Event volume in Meta Events Manager (should not drop)
   - Upsell2 daily count (should climb from ~6/wk baseline toward ~50/wk+ within 7 days)
5. After 7 days, evaluate:
   - Did total events go UP? (expected yes, because of recovered tab-close cases)
   - Did dedup stay clean? (no spike in suspicious duplicate `event_id`s)

## Rollback plan

If event volume spikes suspiciously (suggests double-firing without dedup):

1. **Quick:** revert just the webhook handlers (delete the FB firing blocks from `webhooks.ts`), leave client deterministic IDs in place. Client→`/api/fb-event` continues as today.
2. **Full:** `git revert` the merge commit.

## Out of scope (next PRs)

- V2 Lead server-side firing (Aiden / Evelyn signup endpoints) — graduates with V2 Stape rollout
- Per-funnel CAPI endpoint env vars (`FB_CAPI_ENDPOINT_V1`, etc.) — task #5 / Phase 2 of Stape rollout
- EvelynLanderCTA cleanup — defer (dead code today, do not touch)
- Meta's "update recommended" warnings on Lead/IC/Purchase/Upsell2 (need richer `user_data` fields like `client_ip_address`, `_fbp`, `_fbc`, hashed phone, hashed last_name) — separate ticket
- Verifying the pixel name discrepancy (`Zodiac Numerology (Live)` shown on Pixel ID `446814716830295` — used for both theseerwithin.com and royalnumerology.com; safe to proceed for now)

## Related context (memory pointers)

- `stape-setup-procedure-and-retrofit.md` — the 4-step master plan
- `v1-funnel-fb-events-webhook-gap.md` — the root-cause memory this PR closes
- `fb-emq-baseline-pre-stape.md` — May 13-19 baseline to compare against
- `fb-events-v2-architecture.md` — V2 event architecture (NOT affected by this PR; reference only)
- `team-and-remotes.md` — push to `rober/development`
- `tooling-no-gh-cli.md` — use GitHub compare URL handoff for PR creation
- `feedback-explain-plainly-no-overselling.md` — never guarantee tracking changes without dev test
