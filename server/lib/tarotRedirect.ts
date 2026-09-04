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
// 🔴 THIS IS A CONTENT CHANGE, NOT A ROUTING TIDY-UP — do not read it as inert.
// The route is only a FALLBACK for hooks INSIDE v1_tarot_version_bc_2026, where
// resolveTarotVersion overrides the URL. That test scopes to four (hook, deck)
// pairs; for the other ~64 hooks matchesLanderScope returns false, assign() yields
// the control arm with applied:false, and resolveTarotVersion hands back the URL's
// OWN version (server/lib/experiments.ts). So on every out-of-scope lander this
// redirect swaps C's interactive LLM opener for B's whole pre-written read.
//
// That is the POINT — it is how the funnel standardises on Version B (operator
// decision, 2026-08-17, after B was declared the winner of the version test). It is
// recorded here because an earlier draft of this comment claimed the redirect was
// behaviour-neutral, which is true only for those four landers.
//
// ⚠️ DELIBERATELY NOT APPLIED TO /fb-palm/c. There is no palm version experiment at
// all: parsePalmParams reads the version straight off the URL and branches on it, so
// redirecting palm /c → /b would switch live palm traffic from the interactive LLM
// opener to the pre-written one — the same class of change as above, but one nobody
// has asked for or tested.

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

// ── VERSION C CAMPAIGN EXEMPTION (2026-09-04) ────────────────────────────────
//
// Operator decision (Joel, via Lewis): Rubie is running a paid campaign that must
// actually deliver VERSION C — the interactive opener that asks one question and
// writes the reading live from her answer — not Version B's pre-written read. The
// redirect above would otherwise swallow those ads, because /c has been folded into
// /b since 2026-08-18 and every /c URL currently lands on B.
//
// 🔴 THIS IS AN EXEMPTION, NOT A ROLLBACK. Every hook NOT listed here still
// redirects to /b exactly as before, so the older live ads — the ones whose Facebook
// URLs cannot be edited without losing their engagement — are untouched. Turning the
// redirect off wholesale would have flipped all of them back to C in one go, which is
// a funnel-wide content change nobody asked for.
//
// ⚠️ THE LIST IS KEYED ON `hook` ALONE, not (hook, deck). The ad URLs carry no
// `deck` param — the deck is resolved client-side — so hook is the only thing the
// server can match on here. Consequence worth knowing: ANY /c ad on one of these
// hooks now serves C, not only Rubie's new ones.
//
// ✅ Verified before shipping, for all 45: each is a live registry hook, each is in
// the `validHooks` roster in routes.ts (so the chat handoff cannot 400 on the Version
// C reflect step), each has a crafted TAROT_QUESTION opener rather than a
// type-checker placeholder, and each carries its own TAROT_HOOK_CONTEXT and
// TAROT_HOOK_TENDENCY entry — so the live-written reading keeps its family's bans
// instead of falling back to the generic default. Version C generates copy at
// request time, so those bans are the only guard it has.
//
// 🔴 `cards-will-commit` is DELIBERATELY ABSENT though it was on the campaign list.
// It is one of the four landers inside the concluded v1_tarot_version_bc_2026, where
// the winner rollout in assign() overrides whatever the URL says — so exempting it
// here would have changed nothing, and freeing it properly would mean either
// re-opening that test (restarting a live split on three landers nobody asked about)
// or removing a lander from a scope the admin guard holds append-only. One hook was
// not worth either.
export const TAROT_C_EXEMPT_HOOKS: ReadonlySet<string> = new Set([
  'cards-after-marriage',
  'cards-allowed-to-want',
  'cards-alone-a-decade',
  'cards-alone-for-years',
  'cards-alone-heavier-now',
  'cards-alone-rest-of-life',
  'cards-best-years',
  'cards-blocked-before',
  'cards-blocking-soulmate',
  'cards-choosing-wrong',
  'cards-come-back',
  'cards-connection-kept-alive',
  'cards-connection-nothing',
  'cards-connection-soulmate',
  'cards-destined-alone',
  'cards-destined-or-not-yet',
  'cards-empty-house-alone',
  'cards-energy-away',
  'cards-energy-soulmate',
  'cards-ever-back',
  'cards-found-me-yet',
  'cards-god-mean-me-alone',
  'cards-gods-intention-alone',
  'cards-god-with-me-alone',
  'cards-heal-first',
  'cards-held-alone',
  'cards-how-long-alone',
  'cards-keeps-waiting',
  'cards-know-not-destined-alone',
  'cards-longer-to-wait',
  'cards-love-never-stays',
  'cards-love-not-happened-yet',
  'cards-meant-alone-still-time',
  'cards-met-already',
  'cards-missed-chance',
  'cards-more-years-alone',
  'cards-moved-on',
  'cards-real-connection-coming',
  'cards-second-time',
  'cards-slipping-past',
  'cards-too-late-love',
  'cards-too-late-or-now',
  'cards-waiting-to-heal',
  'cards-wait-on-connection',
  'cards-wont-commit',
])

/**
 * Should this /fb-tarot/c request be redirected to /b?
 *
 * True for everything except the campaign hooks above, which must reach the Version C
 * bridge intact. Parsing is deliberately forgiving in the directions that fail SAFE:
 * a missing, unparseable or unknown `hook` redirects, which is today's behaviour.
 * Only an exact, known hook opts out.
 *
 * `hook` is read off the raw `originalUrl` rather than `req.query` so this stays a
 * pure function of the request target and can be unit-tested without an Express
 * request object. Repeated `hook` params take the FIRST value, matching how the
 * bridge reads it client-side.
 */
export function shouldRedirectTarotC(originalUrl: string): boolean {
  const q = originalUrl.indexOf('?')
  if (q === -1) return true
  const hook = new URLSearchParams(originalUrl.slice(q + 1)).get('hook')
  if (!hook) return true
  return !TAROT_C_EXEMPT_HOOKS.has(hook.trim().toLowerCase())
}
