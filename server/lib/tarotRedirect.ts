// ── /fb-tarot/c → /fb-tarot/b ────────────────────────────────────────────────
//
// Every NEW tarot lander ships on /b (see the version registry in
// client/src/content/tarotReads.ts), but a large number of live Facebook ads
// still point at /c, and their destination URLs cannot be edited without the ad
// losing its accumulated engagement and social proof. Rather than carry two URL
// shapes indefinitely — and have the team reason about which is which — /c is
// redirected to /b here.
//
// 🔴 THE QUERY STRING IS THE PAYLOAD, NOT DECORATION, so it is forwarded
// VERBATIM. Two separate things break if it is dropped:
//   • `hook`, `card` and `deck` — parseTarotParams() returns null without them,
//     and the visitor silently falls through to the generic Evelyn greeting
//     instead of her card reading. The funnel does not error, it just stops
//     being the funnel, which is the worst kind of failure to notice.
//   • `fbclid` — the Meta pixel turns this into the `_fbc` cookie, and `_fbc` is
//     what the Conversions API sends to match a purchase back to the ad click
//     (see getFbClickId in client/src/lib/facebook.ts). Our pixel init is lazy,
//     so `_fbc` is only ever written on a page whose URL still carries fbclid.
//     Lose it in the hop and every downstream CAPI event degrades to a weaker
//     match — invisible in our own reporting, visible in Meta's attribution.
//
// Slicing the raw `req.originalUrl` rather than re-serialising `req.query` is
// deliberate: re-serialising re-encodes and re-orders keys, and collapses
// repeated params. The query string is somebody else's data (Meta's, the ad
// platform's) — pass it through untouched.
//
// 🔴 302, NOT 301. A 301 is cached by the browser indefinitely, so a rollback
// would never reach anyone who had already been redirected once. 302 keeps this
// reversible by a redeploy alone.
//
// This is SERVER-side (rather than a navigate() inside TarotBridge) so the hop
// happens before any JavaScript runs. A client-side redirect would render /c,
// fire its PageView, then fire a second PageView on /b — double-counting every
// visitor in both the pixel and PostHog.
//
// ⚠️ DELIBERATELY NOT APPLIED TO /fb-palm/c. On the tarot funnel the route is
// only a FALLBACK — the server decides the opener (resolveTarotVersion) — so
// moving a visitor from /c to /b changes nothing about what she sees. On fb-palm
// there is no such experiment: parsePalmParams reads the version straight off the
// URL and branches on it, so redirecting palm /c → /b would silently switch live
// palm traffic from the interactive LLM opener to the pre-written one. That is a
// real content change nobody has asked for or tested.

export const TAROT_C_PATH = '/fb-tarot/c';
export const TAROT_B_PATH = '/fb-tarot/b';

/**
 * The /b URL a /c request should be redirected to.
 *
 * `originalUrl` is Express's raw, still-encoded request target (path + query),
 * e.g. `/fb-tarot/c?hook=cards-return&fbclid=IwAR123`. Everything from the first
 * `?` onward is carried across unchanged; a request with no query string yields a
 * bare `/fb-tarot/b`.
 *
 * Fragments never reach the server, so there is nothing to preserve there.
 */
export function tarotBTarget(originalUrl: string): string {
  const q = originalUrl.indexOf('?');
  return q === -1 ? TAROT_B_PATH : `${TAROT_B_PATH}${originalUrl.slice(q)}`;
}
