// /client/src/types/chat.ts

export type ConversationState =
  | 'INIT'
  | 'GREETING'
  | 'NAME_CAPTURE'
  | 'PALM_REFLECT'        // /fb-palm Version C: awaiting her answer to the opener question
  | 'BUCKET_SELECTION'
  | 'BUCKET_CLARIFICATION'
  | 'PERSON_NAME_CAPTURE'
  | 'EMAIL_CAPTURE'
  // Deepening phase - multiple rounds of engagement
  | 'DEEPENING_1'        // Initial concern sharing
  | 'DEEPENING_2'        // Follow-up question after first reading
  // Reading phase - Barnum statements and insights
  | 'READING_1'          // First set of insights
  | 'READING_2'          // Deeper insights, hints at blocks
  // Future pacing
  | 'FUTURE_PACING'      // What do they want?
  | 'FUTURE_VALIDATION'  // Mirror back, ask how it would feel
  // Crisis phase - expanded
  | 'CRISIS_REVEAL'      // Soft intro to the block
  | 'CRISIS_COST'        // What has this cost them?
  | 'CRISIS_URGENCY'     // Why now? Window closing
  // Pitch phase
  | 'PERMISSION_ASK'     // Honest permission request
  | 'VALUE_EXPLAIN'      // What they get
  | 'PITCH'              // CTA
  | 'OBJECTION_HANDLING'
  | 'DOWNSELL'
  | 'GRACEFUL_EXIT'
  | 'END'
  // Upsell states
  | 'POST_PURCHASE'      // Just returned from Stripe
  | 'UPSELL_PITCH'       // Delivering upsell messages
  | 'UPSELL_CTA'         // Showing accept/decline buttons
  | 'UPSELL_PROCESSING'  // Processing 1-click payment
  | 'UPSELL_SHIPPING'    // Collecting shipping address
  | 'UPSELL_DECLINED'    // User declined, soft exit
  | 'COMPLETE'           // Flow finished
  // Legacy states (for backwards compatibility)
  | 'DEEPENING'
  | 'READING'
  | 'CRISIS_INTRO'

export type Bucket = 'love' | 'money' | 'purpose' | 'someone'

export type MessageType = 'bot' | 'user' | 'system'

export interface Message {
  id: string
  type: MessageType
  content: string
}

export interface UserData {
  firstName: string | null
  email: string | null
  bucket: Bucket | null
  subBucket: string | null
  personName: string | null
  concern: string | null
  desires: string | null
  deeperResponse: string | null
  emotionalResponse: string | null
  blockSource: string | null
  commitmentResponse: string | null
  location: string | null
  timeOfDay: string | null
  objectionCount: number
  // V1 price split test — assigned at lead capture, drives pitch + button + tracking values
  priceDollars?: number
  downsellDollars?: number
  // The assigned price-variant id (e.g. '35', '45_fb', '55-35'). A '55-35*' id
  // switches the close to the sliding-scale pitch ($55 full offering, $35
  // welcome if money is a strain — same clearing). Absent ⇒ classic close.
  priceVariantId?: string
  // V1 prompt A/B (v1_clearing_theme_palm_2026) — assigned arm for this session,
  // set once from /api/ab/assign (or the ?clearing= preview override). Carried on
  // userData so the server prompt builders + client pitch branch on the same arm.
  // Undefined ⇒ control (byte-identical). See improve-v1/09.
  promptVariant?: 'control' | 'woven'
  // fb-palm identity carry (derail fix — improve-v1/04-fb-palm-derail-PROVEN.md).
  // Set at palm name-capture from the tapped sign/option; honored by the shared
  // reading/crisis prompt builders. ONLY palm traffic sets these — every other
  // funnel leaves them undefined, so those prompts stay byte-identical.
  palmReading?: string
  palmMark?: string
  // fb-palm COMMITMENT GATE (v1_palm_commitment_gate_2026) — true when this lead
  // bucketed into the gated arm, so the close renders the 3-checkbox commitment
  // card instead of the plain purchase button. Assigned by the EXPERIMENT
  // framework at lead capture, deliberately NOT by the price-variant pool: a pool
  // arm is only drawn for emails with no stored variant, which would have excluded
  // every returning visitor (23% of palm sessions but 57% of its main buys) from
  // the treatment while leaving them all in control. UI only — never a price.
  // Undefined/false ⇒ today's PurchaseCTA, byte-identical.
  commitmentGate?: boolean
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

export interface ChatState {
  state: ConversationState
  messages: Message[]
  userData: UserData
  isTyping: boolean
  inputEnabled: boolean
  inputPlaceholder: string
  inputType: 'text' | 'email'
  showBucketButtons: boolean
  showPermissionButton: boolean
  showPurchaseCTA: boolean
  showDownsellCTA: boolean
  // Upsell state
  showUpsellCTA: boolean
  showShippingForm: boolean
  isUpsellProcessing: boolean
  checkoutSessionId: string | null
  upsellPaymentId: string | null
  shippingAddress: ShippingAddress | null
}

export const BUCKET_LABELS: Record<Bucket, string> = {
  love: 'Love & Relationships',
  money: 'Money & Abundance',
  purpose: 'My Life Purpose',
  someone: 'Someone Specific',
}
