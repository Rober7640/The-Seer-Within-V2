// Which funnels make the phone number COMPULSORY on the main Stripe Checkout
// (main $35 and downsell $25 — both go through /api/checkout).
//
// Every V1 reading funnel does:
//   · ROOT (theseerwithin.com) — the one funnel that sends no `funnel` param.
//   · /fb, /fb2, /gdn, /fb-palm, /fb-read (tea + coffee), /fb-tarot (every
//     tarot lander: love, money and soulmate).
//
// Still a CLOSED allow-list rather than "always on": a funnel added later
// doesn't pick up the field silently — checkoutPhone.test.ts fails until the
// new funnel is deliberately placed in or out of this set.
import type { FunnelParam } from "@shared/funnelConfig";

const PHONE_FUNNELS: ReadonlySet<FunnelParam> = new Set<FunnelParam>([
  "v1-fb",
  "v1-fb2",
  "v1-gdn",
  "v1-palm",
  "v1-read",
  "v1-tarot",
]);

export function collectsPhoneAtCheckout(funnel: FunnelParam | undefined): boolean {
  return funnel === undefined || PHONE_FUNNELS.has(funnel);
}
