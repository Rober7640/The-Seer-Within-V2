// Which funnels make the phone number COMPULSORY on the main Stripe Checkout
// (main $35 and downsell $25 — both go through /api/checkout).
//
//   · ROOT (theseerwithin.com) — the one funnel that sends no `funnel` param.
//   · /fb       (v1-fb)
//   · /fb-tarot (v1-tarot) — every tarot lander: love, money and soulmate.
//
// Everything else (/fb2, /gdn, /fb-palm, /fb-read) is deliberately left without
// a phone field. A CLOSED allow-list, so a funnel added later never picks up the
// field by accident.
import type { FunnelParam } from "@shared/funnelConfig";

const PHONE_FUNNELS: ReadonlySet<FunnelParam> = new Set<FunnelParam>([
  "v1-fb",
  "v1-tarot",
]);

export function collectsPhoneAtCheckout(funnel: FunnelParam | undefined): boolean {
  return funnel === undefined || PHONE_FUNNELS.has(funnel);
}
