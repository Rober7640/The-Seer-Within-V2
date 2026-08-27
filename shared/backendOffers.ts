// The backend deck's offer catalog — and the ONE place a backend price is written.
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase A, asset S1/S5.
//
// ── Why this lives in shared/ ────────────────────────────────────────────────────
// The booking screens PRINT a price and the checkout endpoint CHARGES one. If those
// two numbers live in two files they will eventually disagree, and the disagreement
// is only ever discovered by a buyer. So the screens import their constants from
// here, and `resolveBackendCharge()` below — the only thing that decides what Stripe
// is told — reads the same rows.
//
// ── The one security rule ────────────────────────────────────────────────────────
// The browser posts { offer, treatment, bump, amountCents?, firstName? } and NOTHING
// that sets a price. A fixed offer's price is looked up here; a pay-what-you-want
// offer's amount is the only number the buyer can supply, and it is floor-checked
// here, server-side. If the client could send a price, anyone could buy a $35 reading
// for one cent.
//
// ── Why the Stripe product keys are new strings ──────────────────────────────────
// Every branch of the live Stripe webhook is keyed on `metadata.product`, and skips a
// value it does not recognise (the same trick `bracelet_*` uses — see
// server/routes/products.ts). `be_*` is unknown to all of them, so no backend order
// can fire a Meta CAPI Purchase, a Google Ads conversion, a PostHog funnel event, or
// any soulmate/V1 branch. Six funnels share that webhook and none of them may move.
//
// 🔴 NEVER add `trackdeskClickId` to a backend checkout's metadata. The webhook's
// Trackdesk branch defaults an unrecognised product to conversionType 'sale', which
// would book a backend reading as a main-funnel affiliate sale.

export type BackendOfferKey = 'twin-flame' | 'judgement-day';

/** Which of the two booking treatments sold it — decides where a cancel returns to. */
export type BookingTreatment = 'page' | 'chat';

// ─── The numbers ───────────────────────────────────────────────────────────────
// Exported individually as well as through the catalog, because the booking screens
// want a bare constant and the server wants a row. Same value either way.

/** 02 — fixed price. */
export const TWIN_FLAME_PRICE_CENTS = 3500;
export const TWIN_FLAME_BUMP_CENTS = 1277;

// ⛔ 02's bump gets its OWN key, exactly as 03's does. n8n exact-matches this
// string to decide what to fulfil, so reusing V1's `double_reading` would post her
// a second reading instead of the Astro Force instructional (copy: 02-C4).
export const TWIN_FLAME_BUMP_PRODUCT_KEY = 'astro_force';

// 03 — pay-what-you-want floor, decision D4 (2026-08-08). ⛔ Enforced, never
// printed, and never spoken mid-keystroke. The booking screens own the "never
// spoken" half; this file owns the enforcement.
export const JUDGEMENT_MIN_CENTS = 1700;

// Fixed price on a pay-what-you-want offer, and coherent: the WORKING is priced by
// what she can give; the instructional is a defined product with a defined price.
export const JUDGEMENT_BUMP_CENTS = 1277;

// ⛔ 03's bump key — see the note on 02's above.
export const JUDGEMENT_BUMP_PRODUCT_KEY = 'unburdening';

/**
 * The ceiling on a pay-what-you-want amount.
 *
 * Not a price — a typo guard. The letter anchors $300, so a four-figure gift is
 * real but rare, and a five-figure one is almost always a slipped decimal point.
 * We REFUSE above this rather than charging it: a wrong charge she has to dispute
 * costs far more than a checkout she has to retry. The screens surface the refusal.
 */
export const BACKEND_PWYW_MAX_CENTS = 100_000;

// ─── The catalog ───────────────────────────────────────────────────────────────

export type BackendPricing =
  | { model: 'fixed'; priceCents: number }
  | { model: 'pwyw'; minCents: number; maxCents: number };

export interface BackendOfferBump {
  /** ⛔ n8n exact-matches this. Add keys; never rename one. */
  productKey: string;
  cents: number;
  /** What Stripe prints on its own page and on her card statement line item. */
  stripeName: string;
}

export interface BackendOffer {
  key: BackendOfferKey;
  /** The deck's number, as every doc cites it. */
  number: '02' | '03';
  /** What Stripe shows her at checkout. */
  stripeName: string;
  stripeDescription: string;
  /** `metadata.product`. ⛔ Must start with the `be_` prefix — see the header. */
  stripeProduct: string;
  pricing: BackendPricing;
  bump: BackendOfferBump;
  /** Where each treatment sends her back to when she cancels out of Stripe. */
  bookingPath: Record<BookingTreatment, string>;
  /** Where Stripe returns her after paying. Gets `?s=<session>` appended. */
  successPath: string;
  /**
   * Does everything AFTER the money exist for this offer?
   *
   * 🔴 A per-offer gate, deliberately separate from the client's
   * BACKEND_CHECKOUT_LIVE switch — otherwise flipping that one switch would take
   * EVERY offer live at once, including one whose `successPath` is still a 404 and
   * whose fulfilment cannot start. The checkout endpoint refuses a `false` outright,
   * so the refusal survives any client change.
   *
   * Set it true only when the offer's thank-you screen renders and (on an ACT offer)
   * its intake exists. ⛔ A paid product must never fail to arrive.
   */
  readyForMoney: boolean;
  /**
   * ACT offers only: her Entry form, sent to AWeber as `entry_url` so the woman who
   * closes the thank-you page can still be asked for the one thing fulfilment needs.
   *
   * ⚠ UNDEFINED means "that screen does not exist yet", and nothing is sent — an
   * emailed link to a 404 is worse than no link. 03's Entry form is workflow step
   * A6; set this the day it renders and the AWeber field starts filling itself.
   */
  entryPath?: string;
}

export const BACKEND_OFFER_CATALOG: Record<BackendOfferKey, BackendOffer> = {
  'twin-flame': {
    key: 'twin-flame',
    number: '02',
    stripeName: 'The Twin Flame Tarot Reading',
    stripeDescription: 'A twelve-card reading, written for you and sent within 24 hours.',
    stripeProduct: 'be_twin_flame',
    pricing: { model: 'fixed', priceCents: TWIN_FLAME_PRICE_CENTS },
    bump: {
      productKey: TWIN_FLAME_BUMP_PRODUCT_KEY,
      cents: TWIN_FLAME_BUMP_CENTS,
      stripeName: '+ Astro Force instructional',
    },
    bookingPath: {
      page: '/tarot/twin-flame/preview-page',
      chat: '/tarot/twin-flame/preview-chat',
    },
    successPath: '/tarot/twin-flame/success',
    // Its thank-you screen renders (TwinFlameThankYouPage, route registered) and 02 is
    // a READING offer, so nothing is needed from her before fulfilment can start.
    readyForMoney: true,
  },
  'judgement-day': {
    key: 'judgement-day',
    number: '03',
    stripeName: 'Judgement Day',
    stripeDescription: 'A three-night working, opened on your behalf.',
    stripeProduct: 'be_judgement_day',
    pricing: {
      model: 'pwyw',
      minCents: JUDGEMENT_MIN_CENTS,
      maxCents: BACKEND_PWYW_MAX_CENTS,
    },
    bump: {
      productKey: JUDGEMENT_BUMP_PRODUCT_KEY,
      cents: JUDGEMENT_BUMP_CENTS,
      stripeName: '+ The Unburdening instructional',
    },
    bookingPath: {
      page: '/wiccan/judgement-day',
      chat: '/wiccan/judgement-day/chat',
    },
    successPath: '/wiccan/judgement-day/success',
    // entryPath: '/wiccan/judgement-day/entry',  ← A6. See the field's note.
    //
    // 🔴 FALSE UNTIL A6. Two reasons, either one sufficient: `successPath` above has no
    // route yet, so a buyer would land on a 404 holding a receipt; and 03 is an ACT
    // offer whose booking screens ask for the Entry NOWHERE, so we would be taking
    // money for work that cannot be started. Flip this in the same commit that makes
    // the thank-you/Entry screen render, and set `entryPath` with it.
    readyForMoney: false,
  },
};

/** ⛔ Every backend Stripe product starts with this, and nothing else in the repo does. */
export const BACKEND_STRIPE_PRODUCT_PREFIX = 'be_';

export function isBackendOfferKey(value: unknown): value is BackendOfferKey {
  return typeof value === 'string' && value in BACKEND_OFFER_CATALOG;
}

export function isBookingTreatment(value: unknown): value is BookingTreatment {
  return value === 'page' || value === 'chat';
}

/** The webhook's way back from `metadata.product` to the offer that was sold. */
export function backendOfferForStripeProduct(
  product: string | null | undefined,
): BackendOffer | null {
  if (!product) return null;
  return (
    Object.values(BACKEND_OFFER_CATALOG).find((o) => o.stripeProduct === product) ?? null
  );
}

/**
 * The Stripe Dashboard "Description" label for a backend order.
 *
 * ⚠ Operator-only — this feeds `payment_intent_data.description`, NOT the line
 * items, so it never shows on the buyer's receipt. Prefixed `BE <nn>` so a
 * backend sale is unmistakable at a glance among the six V1 funnels' orders.
 * (Decision: identify BE in the dashboard, keep the buyer's receipt clean.)
 */
export function backendOrderDescriptor(
  key: BackendOfferKey,
  bumpPurchased: boolean,
): string {
  const offer = BACKEND_OFFER_CATALOG[key];
  const base = `BE ${offer.number} · ${offer.stripeName}`;
  if (!bumpPurchased) return base;
  return `${base} + ${offer.bump.stripeName.replace(/^\+\s*/, '')}`;
}

// ─── What she is actually charged ──────────────────────────────────────────────

export interface BackendChargeRequest {
  offer: BackendOfferKey;
  /** Took the order bump. ⚠ Ships unchecked — opt-in only (negative-option rules). */
  bump?: boolean;
  /** Pay-what-you-want offers only. Ignored entirely on a fixed-price offer. */
  amountCents?: number | null;
}

export interface BackendChargeLine {
  name: string;
  description?: string;
  amountCents: number;
}

export type BackendChargeResult =
  | {
      ok: true;
      offer: BackendOffer;
      /** What the reading itself costs — the fixed price, or what she chose to give. */
      readingCents: number;
      /** 0 when she did not take the bump. */
      bumpCents: number;
      totalCents: number;
      bumpPurchased: boolean;
      lines: BackendChargeLine[];
    }
  | {
      ok: false;
      code:
        | 'unknown_offer'
        | 'not_ready'
        | 'amount_missing'
        | 'amount_below_floor'
        | 'amount_too_large';
      message: string;
    };

/**
 * Decide what Stripe is told: the offer must exist, must be open for money, and its
 * price must resolve. THE one entry point for the checkout endpoint.
 *
 * ⛔ A fixed-price offer NEVER reads `amountCents`. That is the whole defence against
 * a browser posting its own price.
 */
export function resolveBackendCharge(req: BackendChargeRequest): BackendChargeResult {
  const offer = BACKEND_OFFER_CATALOG[req.offer];
  if (!offer) {
    return { ok: false, code: 'unknown_offer', message: 'That offer does not exist.' };
  }

  // ⛔ Never take money for an offer whose after-the-money screens do not exist.
  if (!offer.readyForMoney) {
    return {
      ok: false,
      code: 'not_ready',
      message: 'This booking is not open yet. Please try again shortly.',
    };
  }

  return priceBackendOffer(offer, req);
}

/**
 * The money rules alone, for one offer.
 *
 * Split out from the readiness gate above so an offer's arithmetic stays provable
 * before it opens — 03's pay-what-you-want floor is testable today, months before its
 * intake screen lets it take a penny.
 *
 * Pure: no server, no database, no Stripe.
 */
export function priceBackendOffer(
  offer: BackendOffer,
  req: Omit<BackendChargeRequest, 'offer'>,
): BackendChargeResult {
  let readingCents: number;

  if (offer.pricing.model === 'fixed') {
    readingCents = offer.pricing.priceCents;
  } else {
    const given = req.amountCents;
    if (given === null || given === undefined || !Number.isFinite(given)) {
      return {
        ok: false,
        code: 'amount_missing',
        message: 'Please enter the amount you would like to give.',
      };
    }
    // Cents are whole. A fractional cent is a client bug, and rounding it silently
    // would charge a number she was never shown.
    if (!Number.isInteger(given)) {
      return {
        ok: false,
        code: 'amount_missing',
        message: 'Please enter the amount you would like to give.',
      };
    }
    if (given < offer.pricing.minCents) {
      // ⛔ The floor is enforced, never printed. The message says what to do, not
      // what the number is — the screens are written on the same rule.
      return {
        ok: false,
        code: 'amount_below_floor',
        message: 'Please enter a slightly larger amount to continue.',
      };
    }
    if (given > offer.pricing.maxCents) {
      return {
        ok: false,
        code: 'amount_too_large',
        message: 'That amount looks larger than you meant. Please check it.',
      };
    }
    readingCents = given;
  }

  const bumpPurchased = req.bump === true;
  const bumpCents = bumpPurchased ? offer.bump.cents : 0;

  const lines: BackendChargeLine[] = [
    {
      name: offer.stripeName,
      description: offer.stripeDescription,
      amountCents: readingCents,
    },
  ];
  if (bumpPurchased) {
    lines.push({ name: offer.bump.stripeName, amountCents: bumpCents });
  }

  return {
    ok: true,
    offer,
    readingCents,
    bumpCents,
    totalCents: readingCents + bumpCents,
    bumpPurchased,
    lines,
  };
}
