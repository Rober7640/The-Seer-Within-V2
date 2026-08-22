/**
 * The nineteen /fb-tarot SOULMATE landers, as one roster.
 *
 * 🔑 THIS FILE IS THE SINGLE SOURCE. `client/src/content/tarotReads.ts` imports these
 * arrays for its angle mapping and `shared/soulmateLander.ts` imports them for the
 * lead/bump split, so the copy registry and the money plumbing can never disagree
 * about which landers are "soulmate". A second hand-maintained roster on the server
 * is exactly the drift this codebase avoids everywhere else — see the note at the top
 * of shared/moneyLander.ts, which got to key on `bucket` and therefore needed none.
 *
 * 🔴 PURE DATA, NO `process.env`, NO IMPORTS. This module is pulled into the BROWSER
 * bundle through tarotReads.ts. The env reads and the Stripe/AWeber decisions live in
 * shared/soulmateLander.ts, which is server-only, precisely so that nothing in this
 * file can drag `process` into the client build.
 *
 * Two families, from docs/fb-ad-test-queue.md:
 *   A · soulmate × age      11 landers — ONE angle; the age band lives in the ad set
 *   B · soulmate × keyword   8 landers — one angle PER KEYWORD, the variable under test
 */

/** A · soulmate × age. Eleven landers, four bands × WHY / HOW-LONG / BINARY. */
export const SOULMATE_AGEBAND_LANDER_HOOKS = [
  'cards-slipping-past',
  'cards-choosing-wrong',
  'cards-found-me-yet',
  'cards-keeps-waiting',
  'cards-missed-chance',
  'cards-after-marriage',
  'cards-second-time',
  'cards-best-years',
  'cards-too-late-love',
  'cards-longer-to-wait',
  'cards-allowed-to-want',
] as const;

/** B · soulmate × keyword — "blocked", the only keyword reproducing across both buckets. */
export const SOULMATE_KEYWORD_BLOCKED_LANDER_HOOKS = [
  'cards-blocking-soulmate',
  'cards-blocked-before',
] as const;

/** B · soulmate × keyword — "connection". A real, specific man is in the picture. */
export const SOULMATE_KEYWORD_CONNECTION_LANDER_HOOKS = [
  'cards-connection-soulmate',
  'cards-connection-nothing',
] as const;

/** B · soulmate × keyword — "energy". She wants it READ, not judged. */
export const SOULMATE_KEYWORD_ENERGY_LANDER_HOOKS = [
  'cards-energy-away',
  'cards-energy-soulmate',
] as const;

/** B · soulmate × keyword — "healing". Selects for trauma disclosure; handled per-hook. */
export const SOULMATE_KEYWORD_HEALING_LANDER_HOOKS = [
  'cards-waiting-to-heal',
  'cards-heal-first',
] as const;

/**
 * All nineteen, flattened — the roster the lead/bump split matches on.
 *
 * Derived from the five family arrays rather than re-typed, so adding a lander to a
 * family cannot leave it out of the split (or vice versa). A test pins the count and
 * asserts every entry is a real hook in the registry.
 */
export const SOULMATE_LANDER_HOOKS: readonly string[] = [
  ...SOULMATE_AGEBAND_LANDER_HOOKS,
  ...SOULMATE_KEYWORD_BLOCKED_LANDER_HOOKS,
  ...SOULMATE_KEYWORD_CONNECTION_LANDER_HOOKS,
  ...SOULMATE_KEYWORD_ENERGY_LANDER_HOOKS,
  ...SOULMATE_KEYWORD_HEALING_LANDER_HOOKS,
];
