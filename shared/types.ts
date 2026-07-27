// Shared types between client and server

export type Bucket = 'love' | 'money' | 'purpose' | 'someone'

export type ConversationState =
  | 'INIT'
  | 'GREETING'
  | 'NAME_CAPTURE'
  | 'BUCKET_SELECTION'
  | 'PERSON_NAME_CAPTURE'
  | 'EMAIL_CAPTURE'
  | 'READING_1'
  | 'READING_2'
  | 'FUTURE_PACING'
  | 'CRISIS_REVEAL'
  | 'CRISIS_COST'
  | 'CRISIS_URGENCY'
  | 'PERMISSION_ASK'
  | 'PITCH'
  | 'OBJECTION_HANDLING'
  | 'CHECKOUT'
  | 'POST_PURCHASE'
  | 'UPSELL_PITCH'
  | 'UPSELL_CTA'
  | 'UPSELL_PROCESSING'
  | 'UPSELL_SHIPPING'
  | 'UPSELL_DECLINED'
  | 'COMPLETE'

export interface UserData {
  firstName: string | null
  email: string | null
  bucket: Bucket | null
  subBucket: string | null
  personName: string | null
  concern: string | null
  desires: string | null
  location: string | null
  timeOfDay: string | null
  objectionCount: number
  // V1 price split test — populated server-side from the conversation row;
  // drives pitch copy + button labels + Stripe charge + tracking values.
  priceDollars?: number
  downsellDollars?: number
  // The assigned price-variant id (e.g. '35', '45_fb', '55-35'). Carried on
  // userData so the client pitch AND the server prompt builders can branch on
  // the variant's close style, not just its numbers.
  priceVariantId?: string
  // V1 prompt A/B (v1_clearing_theme_palm_2026) — the assigned arm for this
  // session ('control' | 'woven'). Set once client-side from /api/ab/assign
  // (or the ?clearing= preview override) and carried on userData so both the
  // server prompt builders and the client pitch branch on the same arm.
  // Absent/undefined ⇒ control (byte-identical to today).
  promptVariant?: 'control' | 'woven'
  // fb-palm identity carry (fix for the derail in improve-v1/04-fb-palm-derail-PROVEN.md).
  // Persisted client-side at palm name-capture from the tapped sign/option, then honored
  // by the shared reading/crisis prompt builders. ONLY set for palm traffic — every other
  // funnel leaves these undefined, so the builders' palm block is skipped and their prompts
  // stay byte-identical. palmReading = the archetype (e.g. "the gathering heart"); palmMark =
  // the physical tell (e.g. "a trident, three lines rising to one").
  palmReading?: string
  palmMark?: string
}

// Sliding-scale close ("$55 anchor / $35 grace") — price variants whose id
// starts with this prefix pitch the FULL offering at priceCents ($55) and tell
// the seeker they may offer downsellCents ($35) instead if money is a strain.
// Same product, same ritual, same post-purchase path — ONLY the offering
// differs. Funnel-scoped ids compose naturally ('55-35', '55-35_fb', …).
export const SLIDING_CLOSE_VARIANT_PREFIX = '55-35'

export function isSlidingCloseVariant(id?: string | null): boolean {
  return !!id && id.startsWith(SLIDING_CLOSE_VARIANT_PREFIX)
}

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal: string
  country: string
}

export interface ChatRequest {
  action: 'reading' | 'reading1' | 'reading2' | 'futureValidation' | 'crisisReveal' | 'crisisCost' | 'crisisUrgency' | 'shadowSummary' | 'valueExplain' | 'crisis' | 'objection' | 'palmOpener' | 'palmReflect'
  userData: UserData
  input: string
  objectionCount?: number
  // Palm "quiz bridge" Version C — the sign + option the visitor tapped on the
  // lander, injected into Evelyn's first turn. Server validates against fixed
  // enums. palmSign defaults to 'thumb' when absent (original behavior).
  palmSign?: string
  palmHook?: string
  palmThumb?: string
}

export interface ChatResponse {
  messages: string[]
}

export interface LocationResponse {
  city: string | null
  country: string | null
}

export interface CheckoutRequest {
  email: string
  firstName: string
  bucket: string
  type?: 'main' | 'downsell'
}

export interface CheckoutResponse {
  url: string | null
  error?: string
}

export interface UpsellChargeRequest {
  checkoutSessionId: string
}

export interface UpsellChargeResponse {
  success: boolean
  paymentIntentId?: string
  fallback?: boolean
  error?: string
}

export interface UpsellFallbackRequest {
  email: string
  firstName: string
  bucket: string
  originalSessionId: string
}

export interface ShippingSaveRequest {
  paymentIntentId: string
  firstName: string
  email: string
  address: ShippingAddress
}

// ─── Wallet unit: a "coin" is ONE CENT ────────────────────────────────────────
// Dollar-wallet model (2026-07-23). `users.coin_balance` holds CENTS — a real
// dollar balance worth the same amount with every guide. Each persona's
// `personas.coins_per_minute` holds CENTS PER MINUTE ( = $/min × 100 ), so the
// time a balance buys is computed PER-GUIDE at display: seconds = cents ÷ (rate/60).
// Nothing customer-facing shows "coins" — the funnel shows dollars + minutes.
//
// The billing engine keeps the parameter name "coinsPerMinute" for continuity; it
// now carries cents/min. The reference (default) rate is $2.99/min = 299.
export const PRICE_PER_MINUTE_USD = 2.99;
export const CENTS_PER_MINUTE_DEFAULT = Math.round(PRICE_PER_MINUTE_USD * 100); // 299
export const COINS_PER_MINUTE = CENTS_PER_MINUTE_DEFAULT; // 299 (cents/min at the default rate)
export const BILLING_INTERVAL_SECONDS = 15;
export const BLOCKS_PER_MINUTE = 60 / BILLING_INTERVAL_SECONDS; // 4 blocks per minute
export const FREE_TRIAL_MINUTES = 3;

/** Whole minutes a balance represents at a given rate (floored). Prefer
 *  coinsToClock for anything user-facing; this stays for analytics/math. */
export function coinsToMinutes(coins: number, coinsPerMinute: number = COINS_PER_MINUTE): number {
  return Math.floor(coins / coinsPerMinute);
}

/** Wallet cents for a number of minutes at a given rate (default rate if omitted).
 *  Used for fixed grants (free trial, promo, welcome) so "N minutes" is exact. */
export function minutesToCoins(minutes: number, coinsPerMinute: number = COINS_PER_MINUTE): number {
  return Math.round(minutes * coinsPerMinute);
}

/**
 * Cents charged for a number of elapsed seconds at a given cents/min rate.
 * Bills only COMPLETED 15-second blocks and FLOORS the total, so it can never
 * charge more than the elapsed time justifies — exact at whole-minute boundaries
 * (60s @ 299 → 299), customer-favourable on partial blocks. At the legacy 60/min
 * rate it still yields 15 per block, so any pre-existing 60-based call site is
 * unchanged.
 */
export function secondsToCoins(seconds: number, coinsPerMinute: number = COINS_PER_MINUTE): number {
  const blocks = Math.floor(seconds / BILLING_INTERVAL_SECONDS);
  return Math.floor((blocks * coinsPerMinute) / BLOCKS_PER_MINUTE);
}

// Per-persona pricing types
export interface PricingTier {
  packageType: string    // "popular", "best_value", "premium", "whale" (legacy: "starter")
  coins: number          // base coins (e.g. 525)
  bonusCoins: number     // bonus on top (e.g. 230)
  totalCoins: number     // coins + bonusCoins (e.g. 755)
  priceUsd: number       // in cents, e.g. 2499 = $24.99
  label: string          // display label, e.g. "525 coins"
  badge?: string         // optional badge, e.g. "BEST VALUE"
  recommended?: boolean  // the mid "MOST CHOSEN" default tile (paywall variant B)
}

export interface PersonaPricing {
  freeCoins: number
  tiers: PricingTier[]
}

// Default global pricing (used when a persona has no custom pricing).
//
// DOLLAR WALLET (2026-07-23): a coin is a cent, so a pack grants exactly the
// dollars paid — totalCoins === priceUsd (both cents). The customer only ever
// sees dollars + minutes; minutes are derived per-guide at that guide's $/min.
// To change the platform rate, change personas.coins_per_minute (cents/min); the
// packs — pure dollar amounts — do not change.
export const DEFAULT_PRICING: PersonaPricing = {
  freeCoins: minutesToCoins(FREE_TRIAL_MINUTES), // 3 free minutes at the default rate = 897¢
  tiers: [
    { packageType: 'popular',    coins: 1000, bonusCoins: 0, totalCoins: 1000, priceUsd: 1000, label: '$10' },
    { packageType: 'best_value', coins: 2000, bonusCoins: 0, totalCoins: 2000, priceUsd: 2000, label: '$20' },
    { packageType: 'premium',    coins: 3000, bonusCoins: 0, totalCoins: 3000, priceUsd: 3000, label: '$30', badge: 'MOST POPULAR' },
    { packageType: 'whale',      coins: 5000, bonusCoins: 0, totalCoins: 5000, priceUsd: 5000, label: '$50' },
  ],
}

// ONE-TIME WELCOME PACK — a deliberate loss-leader, NOT the flat rate: pay $2.99
// and receive ~2:40 of reading (≈$7.98 of wallet at the default rate). Defined by
// the TIME it grants so it survives the coin→cent switch, and lives here rather
// than as a literal in both the server tier table and the client modal, which is
// how the two could silently drift.
export const WELCOME_PACK_SECONDS = 160; // 2:40
export const WELCOME_PACK_COINS = Math.ceil((WELCOME_PACK_SECONDS / 60) * CENTS_PER_MINUTE_DEFAULT); // 798¢ ≈ 2:40
export const WELCOME_PACK_PRICE_CENTS = 299;

// CUSTOM TOP-UP (the "Custom Amount" field in the paywall):
// The customer types any dollar amount and receives exactly that many dollars of
// wallet (a coin is a cent). The floor is enforced against the persona's cheapest
// pack at the call site; MAX is the absolute platform cap (fraud / fat-finger guard).
export const CUSTOM_TOPUP_MAX_USD = 200;
export const CUSTOM_PACKAGE_TYPE = 'custom';

/**
 * Wallet cents bought for a whole-dollar USD amount. In the dollar wallet a coin
 * IS a cent, so this is just dollars → cents. SINGLE SOURCE OF TRUTH for the
 * custom top-up so the "= X min" preview and the granted balance always agree.
 */
export function usdToCoins(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Same, for a cents amount (Stripe / PayPal charge in cents) — identity, since a
 *  coin is a cent. Kept as a named function so call sites still read intently. */
export function usdCentsToCoins(cents: number): number {
  return Math.round(cents);
}

/** Minutes a balance represents at a given rate, floored to 1 decimal so we never
 *  overstate the time bought (897¢ @ 299 → "3.0 min"). Defaults to the reference
 *  rate; pass the guide's rate for a per-guide figure. */
export function coinsToMinutesDisplay(coins: number, coinsPerMinute: number = COINS_PER_MINUTE): number {
  return Math.floor((coins / coinsPerMinute) * 10) / 10;
}

/** A balance as a m:ss clock at a given rate, e.g. 897¢ @ 299 → "3:00". This is
 *  the ONE time format the customer sees everywhere (balances, packs, the live
 *  meter), so a value never switches between "3.0 min" and "3:00". Pass the
 *  guide's rate; floors to the whole second so it never overstates the time. */
export function coinsToClock(coins: number, coinsPerMinute: number = COINS_PER_MINUTE): string {
  // Multiply BEFORE dividing so exact-whole values don't lose a second to floating
  // point (e.g. (n / cpm) * 60). Scaling first keeps the arithmetic exact, and the
  // floor still guarantees we never overstate the time.
  return secondsToClock(Math.floor((coins * 60) / coinsPerMinute));
}

/** A number of SECONDS as the same m:ss clock. The live in-chat countdown works in
 *  seconds rather than coins, and used to format itself inline — two implementations
 *  of one format, which is how the header and the meter ended up a second apart on
 *  the $50 pack. Both now come through here. */
export function secondsToClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
