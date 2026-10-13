/**
 * The live Stripe-vs-Payments.AI split — what is in it, and how an order says which
 * processor it is on.
 *
 * The split itself is an ordinary experiment (`GATEWAY_EXPERIMENT_KEY`), started and
 * paused from /admin/experiments. This file holds the two things that must NOT be
 * left to experiment config:
 *
 *   1. PAI_ELIGIBLE_LANDERS — the hard allow-list. An experiment's scope can be edited
 *      in the admin; this cannot. Even a mis-scoped or concluded test can only ever put
 *      a buyer on Payments.AI on a lander listed here, i.e. one whose every write (lists,
 *      tags, bump key, pixel ids) has been walked through on Payments.AI. A NEW funnel is
 *      Stripe until somebody adds it here on purpose.
 *   2. isPaiOrderId — how every later step (welcome1, upsells, shipping) knows which
 *      processor an order is on, from the id in the URL alone. Stripe orders never
 *      reach a single new line of code on their way through.
 */

/** Admin experiment that assigns the gateway. Arm 0 (control) MUST be 'stripe'. */
export const GATEWAY_EXPERIMENT_KEY = 'v1_gateway_split_2026';

export const GATEWAY_ARM_STRIPE = 'stripe';
export const GATEWAY_ARM_PAI = 'paymentsai';

/**
 * Every lander Payments.AI may serve. `hook: null` = the funnel's own lander with no
 * tarot hook (e.g. /fb). Tarot entries are (funnel, hook) — the deck is not listed
 * because these hooks only run on the default face-down deck.
 *
 * Lewis, 2026-10-12 — the landers with live FB traffic (Rubie):
 *   /fb-tarot/c?hook=cards-meant-alone · /fb-tarot/c?hook=cards-come-back
 * Neither hook is a soulmate or money lander, so both file to the shared V1 AWeber
 * lists with the default bump key — the path that was walked on Payments.AI.
 *
 * ⏸️ /fb is OUT for now (Lewis, 2026-10-13): /fb is running its own $35 vs
 * $35 + bump test, and splitting the same buyers by gateway too would muddy both
 * reports. Everything else for /fb (its /fb/checkout page, the upsell paths) is still
 * built and tested — putting it back is `{ funnel: 'v1-fb', hook: null }` here plus
 * "v1-fb" in the experiment's scope.
 */
export const PAI_ELIGIBLE_LANDERS: ReadonlyArray<{ funnel: string; hook: string | null }> = [
  { funnel: 'v1-tarot', hook: 'cards-meant-alone' },
  { funnel: 'v1-tarot', hook: 'cards-come-back' },
];

export function paiEligibleLander(funnel: unknown, hook: unknown): boolean {
  if (typeof funnel !== 'string') return false;
  const h = typeof hook === 'string' && hook.trim() ? hook.trim() : null;
  return PAI_ELIGIBLE_LANDERS.some((l) => l.funnel === funnel && l.hook === h);
}

/**
 * A Payments.AI order id. Their transaction ids are `txn_…`; Stripe Checkout sessions
 * are `cs_…`. The two never overlap, so this needs no DB read — which is the point:
 * a Stripe order is recognised as Stripe without any new lookup on its path.
 */
export function isPaiOrderId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith('txn_');
}
