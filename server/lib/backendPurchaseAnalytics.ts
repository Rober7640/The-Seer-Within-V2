//
// PostHog `purchase_completed` for BACKEND (`be_*`) offers ONLY. Kept in its own file,
// deliberately separate from purchaseAnalytics.ts: that builder is shared across six
// V1/soulmate products and BE must never perturb it. This is the ONLY PostHog emitter
// for backend revenue — Meta CAPI, Google Ads and Trackdesk stay blind to `be_*` by
// design (see server/routes/backendOffers.ts header). PostHog-only, on purpose.

export interface BackendPurchaseInput {
  /** Stripe metadata.product, e.g. 'be_twin_flame' | 'be_protection_ritual' | 'be_bracelet'. */
  product?: string;
  /** Backend offer key, e.g. 'twin-flame'. */
  offer?: string;
  /** Amount ACTUALLY charged, in cents (session.amount_total / pi.amount). */
  amountCents: number;
  email: string;
  /** Browser PostHog distinct id, threaded through Stripe metadata. Falls back to email. */
  distinctId?: string;
  /** Marketing link UTMs, threaded through Stripe metadata. Joel may put his tag in ANY of
   *  them — we don't force a convention, so all five are captured. */
  utm?: Utms;
  /** Deterministic PostHog dedupe id: stripe_session_id (booking/hosted) or pi.id (1-click). */
  dedupeId: string;
  /** The bump's product code, present only when the order bump was bought (booking only). */
  bumpProduct?: string;
}

/** The five standard UTM params. Joel's link may carry his tag in any one of them. */
export type Utms = Partial<
  Record<'utm_campaign' | 'utm_source' | 'utm_medium' | 'utm_content' | 'utm_term', string>
>;
const UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'] as const;

/** Extract the five UTMs off a Stripe metadata bag (threaded there at checkout/charge). */
export function utmsFromMetadata(
  meta: Record<string, string | undefined> | null | undefined,
): Utms {
  const m = meta ?? {};
  const out: Utms = {};
  for (const k of UTM_KEYS) {
    const v = m[k];
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}

export interface BackendPurchaseEvent {
  distinctId: string;
  event: 'purchase_completed';
  uuid: string;
  properties: Record<string, unknown>;
}

// be_* product → funnel step. Unknown be_ products still emit (revenue is never dropped)
// with step 'other'.
const BACKEND_STEP: Record<string, string> = {
  be_twin_flame: 'sales',
  be_judgement_day: 'sales',
  be_protection_ritual: 'upsell1',
  be_bracelet: 'upsell2',
};

// offer key → PostHog funnel name (matches Joel's `twinflame_...` tag family).
const BACKEND_FUNNEL: Record<string, string> = {
  'twin-flame': 'twinflame',
  'judgement-day': 'judgement',
};

export function buildBackendPurchaseEvent(input: BackendPurchaseInput): BackendPurchaseEvent {
  const step = (input.product && BACKEND_STEP[input.product]) || 'other';
  const funnel = (input.offer && BACKEND_FUNNEL[input.offer]) || input.offer || 'backend';
  const utm = input.utm ?? {};
  // All five UTMs, present-or-null, so whichever one Joel used is always a filterable
  // property (and the four he didn't use are explicitly null, never missing).
  const utmProps: Record<string, string | null> = {};
  for (const k of UTM_KEYS) utmProps[k] = utm[k] ?? null;
  return {
    distinctId: input.distinctId || input.email,
    event: 'purchase_completed',
    uuid: input.dedupeId,
    properties: {
      funnel,
      step,
      product: input.product ?? null,
      payment_method: 'stripe',
      amount_cents: input.amountCents,
      email: input.email,
      is_backend: true,
      bump: !!input.bumpProduct,
      bump_product: input.bumpProduct ?? null,
      ...utmProps,
    },
  };
}
