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
  action: 'reading' | 'reading1' | 'reading2' | 'futureValidation' | 'crisisReveal' | 'crisisCost' | 'crisisUrgency' | 'shadowSummary' | 'valueExplain' | 'crisis' | 'objection'
  userData: UserData
  input: string
  objectionCount?: number
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
  packageType: string    // "starter", "popular", "best_value", "premium"
  coins: number          // base coins (e.g. 525)
  bonusCoins: number     // bonus on top (e.g. 230)
  totalCoins: number     // coins + bonusCoins (e.g. 755)
  priceUsd: number       // in cents, e.g. 2499 = $24.99
  label: string          // display label, e.g. "525 coins"
  badge?: string         // optional badge, e.g. "BEST VALUE"
}

export interface PersonaPricing {
  freeCoins: number
  tiers: PricingTier[]
}

// Default global pricing (used when persona has no custom pricing)
export const DEFAULT_PRICING: PersonaPricing = {
  freeCoins: 180,
  tiers: [
    { packageType: 'starter',    coins: 180,  bonusCoins: 0,    totalCoins: 180,  priceUsd: 999,   label: '180 coins' },
    { packageType: 'popular',    coins: 360,  bonusCoins: 180,  totalCoins: 540,  priceUsd: 1999,  label: '540 coins' },
    { packageType: 'best_value', coins: 540,  bonusCoins: 360,  totalCoins: 900,  priceUsd: 2999,  label: '900 coins', badge: 'MOST POPULAR' },
    { packageType: 'premium',    coins: 720,  bonusCoins: 1080, totalCoins: 1800, priceUsd: 3999,  label: '1800 coins' },
  ],
}
