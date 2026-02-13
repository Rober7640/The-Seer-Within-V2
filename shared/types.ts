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

// Per-persona pricing types
export interface PricingTier {
  packageType: string   // e.g. "15min", "30min", "60min"
  minutes: number       // e.g. 15, 30, 60
  priceUsd: number      // in cents, e.g. 1500 = $15.00
  label: string         // display label, e.g. "15 Minutes"
}

export interface PersonaPricing {
  freeMinutes: number
  tiers: PricingTier[]
}

// Default global pricing (used when persona has no custom pricing)
export const DEFAULT_PRICING: PersonaPricing = {
  freeMinutes: 3,
  tiers: [
    { packageType: '15min', minutes: 15, priceUsd: 1500, label: '15 Minutes' },
    { packageType: '30min', minutes: 30, priceUsd: 2500, label: '30 Minutes' },
  ],
}
