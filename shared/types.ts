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

// Coin system: 60 coins = 1 minute of chat, billed in 15-second blocks
export const COINS_PER_MINUTE = 60;
export const BILLING_INTERVAL_SECONDS = 15;
export const COINS_PER_INTERVAL = COINS_PER_MINUTE / (60 / BILLING_INTERVAL_SECONDS); // 15 coins per 15s block

export function coinsToMinutes(coins: number): number {
  return Math.floor(coins / COINS_PER_MINUTE);
}

export function minutesToCoins(minutes: number): number {
  return minutes * COINS_PER_MINUTE;
}

/** Calculate coins charged for a given number of elapsed seconds */
export function secondsToCoins(seconds: number, coinsPerMinute: number = COINS_PER_MINUTE): number {
  const coinsPerInterval = coinsPerMinute / (60 / BILLING_INTERVAL_SECONDS);
  return Math.floor(seconds / BILLING_INTERVAL_SECONDS) * coinsPerInterval;
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

// Default global pricing (used when persona has no custom pricing)
export const DEFAULT_PRICING: PersonaPricing = {
  freeCoins: 180,
  tiers: [
    { packageType: 'popular',    coins: 360,  bonusCoins: 180,  totalCoins: 540,  priceUsd: 1999, label: '540 coins' },
    { packageType: 'best_value', coins: 540,  bonusCoins: 360,  totalCoins: 900,  priceUsd: 2999, label: '900 coins' },
    { packageType: 'premium',    coins: 1000, bonusCoins: 800,  totalCoins: 1800, priceUsd: 4999, label: '1800 coins', badge: 'MOST POPULAR' },
    { packageType: 'whale',      coins: 2000, bonusCoins: 2500, totalCoins: 4500, priceUsd: 9999, label: '4500 coins', badge: 'BEST DEAL' },
  ],
}
