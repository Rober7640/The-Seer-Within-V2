/**
 * The checkout step tracking Tim (Payments.AI) recommended in his approval-rate
 * report, so we can see WHERE buyers drop off before they pay:
 *
 *   1. checkout_page_viewed     — Checkout page viewed
 *   2. checkout_field_started   — First field filled in
 *   3. checkout_card_completed  — Card details completed
 *   4. checkout_pay_clicked     — Pay button clicked (or Apple Pay / Google Pay approved)
 *   5. checkout_payment_result  — Payment approved (or declined / needs 3DS / error)
 *
 * "Across both variants": steps 1 and 5 fire for Stripe too. Stripe's checkout is
 * Stripe's own page, so steps 2-4 cannot be seen there — for Stripe, step 1 is "sent
 * to Stripe's page" and step 5 is the existing server-side `purchase_completed`
 * (which every Payments.AI purchase fires too, with `payment_gateway`).
 *
 * Every event carries `gateway` and `page` ('main' = the main checkout, 'upsell' =
 * the backup card page after a 1-click upsell was refused). No name, email, phone or
 * card detail is ever sent.
 */
import { trackBeforeLeaving } from './posthog';

// Every step is sent AT ONCE (sendBeacon), never batched: a checkout navigates away
// quickly (approval, 3DS, Stripe), and the local probe (18 Nov) lost batched steps
// that way. A handful of events per buyer, so the extra requests cost nothing.
const send = trackBeforeLeaving;

export type CheckoutGateway = 'stripe' | 'paymentsai';
export type CheckoutPage = 'main' | 'upsell';

export interface CheckoutStepContext {
  gateway: CheckoutGateway;
  page: CheckoutPage;
  funnel?: string | null;
  /** upsell1 / upsell2, on the upsell backup page. */
  upsell_step?: string | null;
  amount_cents?: number;
}

const props = (ctx: CheckoutStepContext, extra: Record<string, unknown> = {}) => ({
  gateway: ctx.gateway,
  page: ctx.page,
  ...(ctx.funnel ? { funnel: ctx.funnel } : {}),
  ...(ctx.upsell_step ? { upsell_step: ctx.upsell_step } : {}),
  ...(typeof ctx.amount_cents === 'number' ? { amount_cents: ctx.amount_cents } : {}),
  ...extra,
});

/** 1. The checkout page is on screen. For Stripe: she is being sent to Stripe's page. */
export function trackCheckoutViewed(ctx: CheckoutStepContext) {
  send('checkout_page_viewed', props(ctx));
}

/** 2. She typed into the first field (whichever one). Once per page. */
export function trackFieldStarted(ctx: CheckoutStepContext, field: string) {
  send('checkout_field_started', props(ctx, { field }));
}

/** 3. Card number, expiry and CVV all complete. Once per page. */
export function trackCardCompleted(ctx: CheckoutStepContext) {
  send('checkout_card_completed', props(ctx));
}

/** 4. She pressed Pay (card), or approved Apple Pay / Google Pay on the pay sheet. */
export function trackPayClicked(ctx: CheckoutStepContext, method: 'card' | 'wallet', wallet?: string) {
  send('checkout_pay_clicked', props(ctx, { method, ...(wallet ? { wallet } : {}) }));
}

export type PaymentResult = 'approved' | 'declined' | 'needs_3ds' | 'error';

/** 5. What happened after Pay. */
export function trackPaymentResult(
  ctx: CheckoutStepContext,
  result: PaymentResult,
  method?: 'card' | 'wallet',
) {
  send('checkout_payment_result', props(ctx, { result, ...(method ? { method } : {}) }));
}
