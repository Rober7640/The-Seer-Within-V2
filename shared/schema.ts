import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  location: text("location"),
  timeOfDay: text("time_of_day"),
  bucket: text("bucket"),
  subBucket: text("sub_bucket"),
  personName: text("person_name"),
  concern: text("concern"),
  deeperResponse: text("deeper_response"),
  vision: text("vision"),
  emotionalResponse: text("emotional_response"),
  blockSource: text("block_source"),
  commitmentResponse: text("commitment_response"),
  purchased: boolean("purchased").default(false),
  purchaseType: text("purchase_type"),
  objectionCount: integer("objection_count").default(0),
  conversationState: text("conversation_state"),
  messages: text("messages"),
  
  // Stripe fields
  stripeSessionId: text("stripe_session_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  // Which Stripe account created the IDs on this row ('A' primary / 'B' backup).
  // NULL = legacy rows predating the backup-account work → treat as 'A'. Stripe
  // object IDs only resolve against their creating account, so refunds/disputes/
  // reconciliation must use getStripeFor(this).
  stripeAccount: text("stripe_account"),
  mainPurchaseAmount: integer("main_purchase_amount"),

  // Server-side "front-end payment actually completed" signal, stamped by the
  // Stripe checkout.session.completed webhook (browser-independent). The legacy
  // paid signal used by the price-test dashboard — purchased && upsell_offered —
  // UNDER-counts, because upsell_offered only flips when the buyer's browser
  // reaches /welcome1; a buyer who pays then closes the tab is real revenue that
  // never gets flagged and is indistinguishable from an abandoned cart. Nullable:
  // null on historical rows (dashboard falls back to the legacy signal) until a
  // one-time Stripe backfill stamps them.
  mainPaidAt: timestamp("main_paid_at"),

  // V1 price split test (variant assigned at lead capture, drives all price displays + Stripe charge)
  priceVariant: text("price_variant"),
  priceAmountCents: integer("price_amount_cents"),
  downsellAmountCents: integer("downsell_amount_cents"),
  upsell1AmountCents: integer("upsell1_amount_cents"),

  // The `ab_vid` visitor cookie this conversation came from — the bridge between a
  // LANDER-time experiment and the purchase it eventually produced.
  //
  // WHY THIS EXISTS. Every other V1 experiment (price, commitment gate, order bump)
  // assigns at LEAD CAPTURE, bucketed on the email hash, and its exposure row carries
  // `conversationId` — so tallyV1Main joins exposure→conversation directly and this
  // column is not needed. The tarot VERSION test (B smart-template vs C LLM opener)
  // cannot work that way: it changes the very FIRST chat message, so it must be
  // assigned before an email exists, on the anonymous visitor cookie instead.
  //
  // That leaves the exposure keyed on a visitor id and the purchase keyed on an email,
  // with nothing joining them. Writing the visitor id here at lead capture is that
  // join — and it has to be a COLUMN rather than an exposure-context field because
  // exposures are unique(experiment_key, subject_id) and written exactly once, at
  // lander time, when no conversation row exists yet to point at.
  //
  // Consequence for the numbers: the denominator is everyone who REACHED THE CHAT, not
  // everyone who left an email. That is the whole point here — B and C differ before
  // the email step (C asks an open question and reads the answer with the LLM; B
  // delivers the read and asks her name), so an email-time denominator would hide the
  // effect being measured.
  //
  // Nullable, no default, never back-filled: every existing row reads exactly as it
  // does today, and any funnel that does not set it is simply absent from this join.
  abVisitorId: text("ab_visitor_id"),

  // V1 ORDER BUMP ("double reading") — the extra chat turn between the buy CTA
  // and the Stripe redirect. Rides the SAME checkout session as the main offer
  // (one PaymentIntent, two line items), so it has no session/payment id of its
  // own — stripeSessionId above covers both lines.
  //
  // 🔴 bumpAmountCents is deliberately SEPARATE from mainPurchaseAmount, which
  // keeps meaning "the main offer alone" ($35). Folding the bump into it would
  // silently inflate the V1 price test and /admin/price-test, which both sum
  // main_purchase_amount as main-offer revenue. The experiment tally adds this
  // column back explicitly — see tallyV1Main in server/lib/experiments.ts.
  //
  // All four are nullable / default-false, so every existing row reads exactly
  // as it does today (no bump offered, no bump bought, no bump revenue).
  bumpOffered: boolean("bump_offered").default(false),
  bumpPurchased: boolean("bump_purchased").default(false),
  bumpBucket: text("bump_bucket"),
  bumpAmountCents: integer("bump_amount_cents"),

  // Upsell 1 tracking (Protection Ritual + Lava Stone)
  upsellOffered: boolean("upsell_offered").default(false),
  upsellPurchased: boolean("upsell_purchased").default(false),
  upsellPaymentId: text("upsell_payment_id"),
  upsellAmount: integer("upsell_amount"),
  
  // Upsell 2 tracking (Manifestation Bracelet)
  upsell2Offered: boolean("upsell2_offered").default(false),
  upsell2Purchased: boolean("upsell2_purchased").default(false),
  upsell2PaymentId: text("upsell2_payment_id"),
  upsell2Amount: integer("upsell2_amount"),
  upsell2Type: text("upsell2_type"),
  
  // Shipping address (for upsell physical products)
  shippingName: text("shipping_name"),
  shippingLine1: text("shipping_line1"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostal: text("shipping_postal"),
  shippingCountry: text("shipping_country"),
  
  // Upsell 2 shipping address (if different from upsell 1)
  shipping2Name: text("shipping2_name"),
  shipping2Line1: text("shipping2_line1"),
  shipping2Line2: text("shipping2_line2"),
  shipping2City: text("shipping2_city"),
  shipping2State: text("shipping2_state"),
  shipping2Postal: text("shipping2_postal"),
  shipping2Country: text("shipping2_country"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// ============================================================
// Chat Service Tables (Multi-Persona Support)
// ============================================================

// 1. Personas - Core persona configuration
export const personas = pgTable("personas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  avatarUrl: text("avatar_url"),

  // Persona behavior
  baseSystemPrompt: text("base_system_prompt").notNull(),
  personality: text("personality"), // JSON: tone, style, specialties
  categories: text("categories"), // JSON array: ["love", "money", "purpose"]

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  accuracyRank: integer("accuracy_rank"),  // null = unranked; 1 = top of "Voted Most Accurate"

  // Per-persona pricing (fully admin-editable). Dollar-wallet model (2026-07-23):
  // a coin is a CENT. free_coins = free minutes × rate (897¢ = 3:00 @ $2.99/min);
  // coins_per_minute = CENTS per minute = $/min × 100 (299 = $2.99/min).
  freeCoins: integer("free_coins").default(897).notNull(),
  coinsPerMinute: integer("coins_per_minute").default(299).notNull(),
  customPricing: text("custom_pricing"), // JSON array: PricingTier[]

  // Session timeout (configurable per advisor, default 30 minutes)
  sessionTimeoutMinutes: integer("session_timeout_minutes").default(30).notNull(),

  // Per-persona AI model overrides (null = use global default from system_config)
  aiModel: text("ai_model"),        // conversation model override, e.g. "claude-sonnet-4-5-20250929"
  basicModel: text("basic_model"),   // greeting/summarization model override, e.g. "claude-haiku-4-5-20251001"

  // Per-persona email sender identity (used for follow-up and session timeout emails)
  fromEmail: text("from_email"),  // e.g. "evelyn@theseerwithin.com" — falls back to FOLLOW_UP_FROM_EMAIL env var
  fromName: text("from_name"),    // e.g. "Evelyn Cross" — falls back to FOLLOW_UP_FROM_NAME env var

  // Availability scheduling
  availabilitySchedule: text("availability_schedule"), // JSON: { timezone, windows: [{days, startTime, endTime}] }
  onlineOverride: text("online_override"),             // null | 'online' | 'offline'
  overrideExpiresAt: timestamp("override_expires_at"), // optional expiry for the override
  cyclicBreakSchedule: text("cyclic_break_schedule"),  // JSON: { enabled, availableMinutes, breakMinutes } — e.g. 30 min on, 7 min break

  // Social proof stats (admin-editable)
  yearsExperience: integer("years_experience"),  // e.g. 12 — shown on persona card
  readingsCount: integer("readings_count"),       // e.g. 3200 — shown on persona card

  // Reviews & ratings (admin-managed)
  overallRating: real("overall_rating"),  // e.g. 4.8 — admin-set display rating

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_personas_active_sort").on(table.isActive, table.sortOrder),
]);

// 1b. Persona Reviews - Admin-managed testimonials displayed on persona profiles
export const personaReviews = pgTable("persona_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),

  reviewerName: text("reviewer_name").notNull(),
  reviewText: text("review_text"),          // optional — reviewer may leave no text
  starRating: integer("star_rating").notNull(), // 1–5

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_persona_reviews_persona_created").on(table.personaId, table.createdAt),
]);

// 2. Persona Prompts - Versioned prompts per persona with A/B testing
export const personaPrompts = pgTable("persona_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),

  promptType: text("prompt_type").notNull(), // system, greeting, summary, context_injection
  promptContent: text("prompt_content").notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // A/B testing
  variantLabel: text("variant_label"), // "A", "B", etc.
  trafficPercent: integer("traffic_percent").default(100).notNull(),

  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Users - Authenticated user accounts
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  firstName: text("first_name").notNull(),
  location: text("location"),

  // Age confirmation (18+ gate)
  confirmed18Plus: boolean("confirmed_18_plus").default(false).notNull(),
  confirmed18PlusAt: timestamp("confirmed_18_plus_at"),

  // Email verification
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),

  // Wallet balance in CENTS (a coin is a cent; dollar-wallet model 2026-07-23).
  // Minutes are derived per-guide: cents ÷ that guide's coins_per_minute(cents/min).
  coinBalance: integer("coin_balance").default(0).notNull(),
  totalCoinsUsed: integer("total_coins_used").default(0).notNull(),
  // Welcome free-coin grant marker — stamped once when the sign-up welcome grant is
  // applied (at registration when ENABLE_FREE_MINS_AT_REGISTRATION is on for the funnel,
  // otherwise at /verify-email). Idempotency guard so the grant fires exactly once even
  // if the reg-time flag is toggled between a user's registration and verification.
  welcomeCoinsGrantedAt: timestamp("welcome_coins_granted_at"),

  // Multi-persona
  defaultPersonaId: varchar("default_persona_id").references(() => personas.id, { onDelete: "set null" }),

  // Account status
  accountStatus: text("account_status").default("active").notNull(), // active, suspended, banned, flagged_for_review
  lastLoginAt: timestamp("last_login_at"),

  // Suspension tracking
  suspensionReason: text("suspension_reason"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by"),

  // Password reset
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  passwordChangedAt: timestamp("password_changed_at"),

  // Fraud detection / device tracking
  registrationIp: text("registration_ip"),
  lastLoginIp: text("last_login_ip"),
  registrationUserAgent: text("registration_user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  accountFlags: text("account_flags"), // JSON array: ["ip_flagged", "manual_review", etc.]

  // Migration from funnel
  migratedFromConversationId: varchar("migrated_from_conversation_id"),

  // FB-attribution funnel — set once at signup based on entry surface
  // ('aiden' for /aiden quiz, 'evelyn' for /evelyn lander). Null for V1
  // and direct /login signups. Read server-side by fireV2PurchaseEvent
  // to decide whether to fire and how to set event_source_url.
  signupFunnel: text("signup_funnel"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_users_last_login").on(table.lastLoginAt),
  index("idx_users_account_status").on(table.accountStatus),
]);

// 4. Chat Sessions - Individual conversation sessions
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  coinsCharged: integer("coins_charged").default(0).notNull(),
  // Portion of coins_charged that came from a promo grant (rest came from real balance).
  // Lets endChatSession refund over-billing back to the correct source (real first, then promo).
  promoCoinsCharged: integer("promo_coins_charged").default(0).notNull(),
  status: text("status").default("active").notNull(), // active, ended, out_of_credits

  lastTopic: text("last_topic"),
  lastBucket: text("last_bucket"),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  lastMessageAt: timestamp("last_message_at"),

  // A/B testing - which prompt variant was used
  promptVariantId: varchar("prompt_variant_id"),

  // Snapshot of pricing applied to this session (JSON, for audit)
  pricingApplied: text("pricing_applied"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Heartbeat and cleanup query: WHERE status = 'active' AND ended_at IS NULL
  index("idx_chat_sessions_status_ended").on(table.status, table.endedAt),
  // Session lookup per user: WHERE user_id = ? AND persona_id = ? AND status = 'active'
  index("idx_chat_sessions_user_persona_status").on(table.userId, table.personaId, table.status),
  // Session list per user: WHERE user_id = ?
  index("idx_chat_sessions_user_id").on(table.userId),
  // Cleanup query on idle sessions
  index("idx_chat_sessions_last_message").on(table.lastMessageAt),
]);

// 5. Chat Messages - Individual messages in sessions
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),

  // TRUE for rows copied from a prior session by "Continue Reading" so the model
  // has context — NOT words spoken in this session. Exclude from transcript
  // analytics, message counts, and memory extraction (2026-07-14 churn fix).
  isContextCopy: boolean("is_context_copy").default(false).notNull(),

  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Most critical: fetching all messages for a session (memory manager, chat history)
  index("idx_chat_messages_session_sent").on(table.sessionId, table.sentAt),
  index("idx_chat_messages_user").on(table.userId),
]);

// 5b. Saved Messages - User-bookmarked messages
export const savedMessages = pgTable("saved_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_saved_messages_user_message").on(table.userId, table.messageId),
  index("idx_saved_messages_user_session").on(table.userId, table.sessionId),
]);

// 6. User Memory - Persistent conversation context (per-persona)
export const userMemory = pgTable("user_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),

  memoryType: text("memory_type").notNull(), // session_summary, long_term_context
  summary: text("summary").notNull(),
  fullContext: text("full_context"), // JSON stringified details

  sourceSessionId: varchar("source_session_id").references(() => chatSessions.id, { onDelete: "set null" }),
  importance: integer("importance").default(5).notNull(), // 1-10
  category: text("category"), // love, money, purpose, general

  expiresAt: timestamp("expires_at"), // Deprecated: retention is now activity-based (inactive users 6+ months)
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Primary filter: load memories for a user+persona, ordered by importance
  index("idx_user_memory_user_persona").on(table.userId, table.personaId),
  // Cleanup: find all memories for inactive users
  index("idx_user_memory_user_id").on(table.userId),
]);

// 7. Credit Purchases - Transaction log
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),

  packageType: text("package_type").notNull(), // "starter", "popular", "best_value", "premium"
  coinsPurchased: integer("coins_purchased").notNull(),
  bonusCoins: integer("bonus_coins").default(0).notNull(),
  priceUsd: integer("price_usd").notNull(), // in cents

  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  // Which Stripe account created these IDs ('A' primary / 'B' backup). NULL =
  // legacy rows → treat as 'A'. See getStripeFor() for tag-aware lookups.
  stripeAccount: text("stripe_account"),
  paypalOrderId: varchar('paypal_order_id', { length: 64 }),
  paypalCaptureId: varchar('paypal_capture_id', { length: 64 }),
  status: text("status").default("pending").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_credit_purchases_user_status").on(table.userId, table.status),
  index("idx_credit_purchases_stripe").on(table.stripeSessionId),
  index("idx_credit_purchases_paypal").on(table.paypalOrderId),
]);

// 8. Admin Users - Super admin accounts
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("super_admin").notNull(),
  displayName: text("display_name").notNull(),
  lastLoginAt: timestamp("last_login_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 9. System Config - Global settings & prompts
export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: text("config_key").notNull().unique(),
  configValue: text("config_value").notNull(),
  configType: text("config_type").notNull(), // text, number, json, prompt
  description: text("description"),
  lastEditedBy: varchar("last_edited_by").references(() => adminUsers.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// Persona Safety, Intent & Follow-Up Tables
// ============================================================

// 10. Safety Violations - Universal safety logging
export const safetyViolations = pgTable("safety_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),

  violationType: text("violation_type").notNull(), // crisis, inappropriate, prompt_injection, harassment, gibberish, non_english, minor
  userMessage: text("user_message").notNull(),
  systemResponse: text("system_response").notNull(),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_safety_violations_user_created").on(table.userId, table.createdAt),
  index("idx_safety_violations_type_created").on(table.violationType, table.createdAt),
  index("idx_safety_violations_flagged").on(table.flaggedForReview, table.createdAt),
]);

// 11. Persona Intent Configs - Per-persona intent/bucket/character configuration
export const personaIntentConfigs = pgTable("persona_intent_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(), // tarot, astrology, mediumship, etc.

  conversationBuckets: text("conversation_buckets").notNull(), // JSON array
  intents: text("intents").notNull(), // JSON array
  characterRules: text("character_rules").notNull(), // JSON object

  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_persona_intent_configs_persona").on(table.personaId, table.isActive, table.version),
]);

// 12. Conversation States - Per-session conversation tracking
export const conversationStates = pgTable("conversation_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  currentBucket: text("current_bucket"),
  turnCount: integer("turn_count").default(0).notNull(),
  detectedIntents: text("detected_intents"), // JSON array

  userEngagement: text("user_engagement").default("medium").notNull(), // high, medium, low
  lastIntentConfidence: real("last_intent_confidence").default(0.5).notNull(),

  bucketTransitions: text("bucket_transitions"), // JSON array

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_conversation_states_session").on(table.sessionId),
  index("idx_conversation_states_user_persona").on(table.userId, table.personaId, table.createdAt),
]);

// 13. Follow-Up Emails - Re-engagement email tracking
export const followUpEmails = pgTable("follow_up_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  lastSessionId: varchar("last_session_id").references(() => chatSessions.id, { onDelete: "set null" }),

  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed, bounced
  sentAt: timestamp("sent_at"),
  deliveryStatus: text("delivery_status"),
  resendEmailId: text("resend_email_id"),

  opened: boolean("opened").default(false).notNull(),
  clicked: boolean("clicked").default(false).notNull(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  sequenceNumber: integer("sequence_number").default(1).notNull(), // 1=day2, 2=day5, 3=day7

  generatedBy: text("generated_by").default("claude-haiku").notNull(),
  generationTokens: integer("generation_tokens"),
  daysSinceLastSession: integer("days_since_last_session"),

  unsubscribeToken: text("unsubscribe_token").notNull().unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_follow_up_emails_user_persona").on(table.userId, table.personaId, table.createdAt),
  index("idx_follow_up_emails_status").on(table.status, table.sentAt),
]);

// 14. User Follow-Up Preferences - Per-user email preferences
export const userFollowUpPreferences = pgTable("user_follow_up_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  enableFollowUps: boolean("enable_follow_ups").default(true).notNull(),
  followUpDays: integer("follow_up_days").default(2).notNull(),
  maxFollowUpsPerMonth: integer("max_follow_ups_per_month").default(4).notNull(),

  followUpsSentThisMonth: integer("follow_ups_sent_this_month").default(0).notNull(),
  lastFollowUpSentAt: timestamp("last_follow_up_sent_at"),

  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeReason: text("unsubscribe_reason"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_follow_up_prefs_enabled").on(table.enableFollowUps, table.lastFollowUpSentAt),
]);

// 15. Magic Link Tokens - One-click re-engagement login from follow-up emails
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  personaSlug: text("persona_slug").notNull(), // denormalised for fast redirect
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),               // null = not yet used
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_magic_link_tokens_user").on(table.userId, table.expiresAt),
]);

// 15b. Promo Grants - per-persona promotional coin wallets (e.g. the 6/6 launch promo).
// A separate pot the billing path spends BEFORE users.coin_balance, scoped to one
// persona, that expires after the campaign window. Real balances are never touched.
// Reusable across campaigns via campaign_tag (one active grant per user+persona+campaign).
export const promoGrants = pgTable("promo_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  campaignTag: text("campaign_tag").notNull(), // e.g. 'promo-6-6' — groups a campaign's grants

  coinsGranted: integer("coins_granted").notNull(),       // original grant (e.g. 360 = 6 min)
  coinsRemaining: integer("coins_remaining").notNull(),   // spent down by the billing path
  coinsSpent: integer("coins_spent").default(0).notNull(),// running total spent (audit)

  expiresAt: timestamp("expires_at").notNull(),           // use-it-or-lose-it window
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Spend lookup: WHERE user_id=? AND persona_id=? AND expires_at>now AND coins_remaining>0
  index("idx_promo_grants_user_persona").on(table.userId, table.personaId),
  // No-double-grant safeguard for the one-time seeding script (ON CONFLICT DO NOTHING)
  uniqueIndex("idx_promo_grants_unique").on(table.userId, table.personaId, table.campaignTag),
]);

// 16. Session Feedback - User-submitted ratings after a session
export const sessionFeedback = pgTable("session_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),

  starRating: integer("star_rating").notNull(), // 1–5
  feedbackText: text("feedback_text"),           // optional written feedback

  // Moderation
  approved: boolean("approved").default(false).notNull(),
  displayName: text("display_name"),             // null = opted out; set = user chose to show their name

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_session_feedback_persona").on(table.personaId, table.createdAt),
  index("idx_session_feedback_user").on(table.userId, table.createdAt),
  uniqueIndex("idx_session_feedback_unique_session").on(table.sessionId),
]);

// 17. Top-Up Emails - Credit replenishment email tracking
export const topupEmails = pgTable("topup_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }), // last persona used

  // Segment that triggered this email
  segment: text("segment").notNull(), // 'empty_tank' | 'free_tier_dropoff' | 'loyal_refill' | 'dormant_low_balance'

  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  coinBalanceAtSend: integer("coin_balance_at_send").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  resendEmailId: text("resend_email_id"),

  generatedBy: text("generated_by").default("claude-haiku").notNull(),
  generationTokens: integer("generation_tokens"),

  unsubscribeToken: text("unsubscribe_token").notNull().unique(),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_topup_emails_user_created").on(table.userId, table.createdAt),
  index("idx_topup_emails_status").on(table.status, table.sentAt),
]);

// 18. Migration Drip Emails - V1→V2 migration email sequence tracking
export const migrationDripEmails = pgTable("migration_drip_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  sequenceNumber: integer("sequence_number").notNull(), // 1, 2, or 3
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  resendEmailId: text("resend_email_id"),

  generatedBy: text("generated_by").default("claude-haiku").notNull(),
  generationTokens: integer("generation_tokens"),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  unsubscribeToken: text("unsubscribe_token").unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_migration_drip_user_seq").on(table.userId, table.sequenceNumber),
  index("idx_migration_drip_status").on(table.status, table.sentAt),
]);

// 19. Aiden Follow-Up Emails - Nurture sequences for Aiden users.
// Two drip tracks share this table, discriminated by sequence_type:
//   - 'unverified'           : +10m / +24h / +48h from magic-register (pre-verification)
//   - 'verified_nopurchase'  : +1h  / +25h / +49h from verification (post-verify, pre-purchase)
export const aidenFollowupEmails = pgTable("aiden_followup_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Discriminator for which drip this row belongs to. DB default preserves pre-existing rows
  // on the original unverified track; inserts explicitly set this from here on.
  sequenceType: text("sequence_type").default("unverified").notNull(), // 'unverified' | 'verified_nopurchase'

  sequenceNumber: integer("sequence_number").notNull(), // 1, 2, or 3
  scheduledFor: timestamp("scheduled_for").notNull(),

  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed, skipped
  sentAt: timestamp("sent_at"),
  resendEmailId: text("resend_email_id"),

  attemptCount: integer("attempt_count").default(0).notNull(),
  errorMessage: text("error_message"),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  unsubscribeToken: text("unsubscribe_token").unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_aiden_followup_user_seq").on(table.userId, table.sequenceNumber),
  index("idx_aiden_followup_status_scheduled").on(table.status, table.scheduledFor),
  index("idx_aiden_followup_type_status_scheduled").on(table.sequenceType, table.status, table.scheduledFor),
]);

// 21. Evelyn Follow-Up Emails - Nurture sequences for /evelyn lander signups.
// Two drip tracks share this table, discriminated by sequence_type:
//   - 'unverified'           : +10m / +24h / +48h from lander signup (pre-verification)
//   - 'verified_nopurchase'  : +1h  / +25h / +49h from verification (post-verify, pre-purchase)
// Mirrors aiden_followup_emails in shape but is independent (different persona,
// different scheduling triggers, different env-flag gates).
export const evelynFollowupEmails = pgTable("evelyn_followup_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  sequenceType: text("sequence_type").default("unverified").notNull(), // 'unverified' | 'verified_nopurchase'

  sequenceNumber: integer("sequence_number").notNull(), // 1, 2, or 3
  scheduledFor: timestamp("scheduled_for").notNull(),

  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed, skipped
  sentAt: timestamp("sent_at"),
  resendEmailId: text("resend_email_id"),

  attemptCount: integer("attempt_count").default(0).notNull(),
  errorMessage: text("error_message"),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  unsubscribeToken: text("unsubscribe_token").unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_evelyn_followup_user_seq").on(table.userId, table.sequenceNumber),
  index("idx_evelyn_followup_status_scheduled").on(table.status, table.scheduledFor),
  index("idx_evelyn_followup_type_status_scheduled").on(table.sequenceType, table.status, table.scheduledFor),
]);

// 20. Email Suppression - Central list of every email that's opted out.
// Populated by: public /unsubscribe (partner emails), our own token-click unsubs,
// Resend bounce webhooks, Resend spam-complaint webhooks. Single source of truth
// for CAN-SPAM compliance exports to partners (GPBL, etc.).
export const emailSuppression = pgTable("email_suppression", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(), // lowercased + trimmed before insert
  reason: text("reason").notNull(),
  // 'user_unsubscribed' | 'bounced' | 'spam_complaint' | 'partner_unsub'
  source: text("source").notNull(),
  // 'theseerwithin' | 'gpbl' | 'resend' | 'aweber_import' | 'other'
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  suppressedAt: timestamp("suppressed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_suppression_suppressed_at").on(table.suppressedAt),
]);

// ============================================================
// Insert Schemas (Zod validation)
// ============================================================

export const insertPersonaSchema = createInsertSchema(personas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonaPromptSchema = createInsertSchema(personaPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserMemorySchema = createInsertSchema(userMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSafetyViolationSchema = createInsertSchema(safetyViolations).omit({
  id: true,
  createdAt: true,
});

export const insertPersonaReviewSchema = createInsertSchema(personaReviews).omit({
  id: true,
  createdAt: true,
});

export const insertPersonaIntentConfigSchema = createInsertSchema(personaIntentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationStateSchema = createInsertSchema(conversationStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowUpEmailSchema = createInsertSchema(followUpEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserFollowUpPreferenceSchema = createInsertSchema(userFollowUpPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionFeedbackSchema = createInsertSchema(sessionFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertTopupEmailSchema = createInsertSchema(topupEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================
// Type Exports
// ============================================================

export type Persona = typeof personas.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;

export type PersonaPrompt = typeof personaPrompts.$inferSelect;
export type InsertPersonaPrompt = z.infer<typeof insertPersonaPromptSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type UserMemory = typeof userMemory.$inferSelect;
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;

export type CreditPurchase = typeof creditPurchases.$inferSelect;
export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

export type SafetyViolation = typeof safetyViolations.$inferSelect;
export type InsertSafetyViolation = z.infer<typeof insertSafetyViolationSchema>;

export type PersonaIntentConfig = typeof personaIntentConfigs.$inferSelect;
export type InsertPersonaIntentConfig = z.infer<typeof insertPersonaIntentConfigSchema>;

export type ConversationState = typeof conversationStates.$inferSelect;
export type InsertConversationState = z.infer<typeof insertConversationStateSchema>;

export type FollowUpEmail = typeof followUpEmails.$inferSelect;
export type InsertFollowUpEmail = z.infer<typeof insertFollowUpEmailSchema>;

export type UserFollowUpPreference = typeof userFollowUpPreferences.$inferSelect;
export type InsertUserFollowUpPreference = z.infer<typeof insertUserFollowUpPreferenceSchema>;

export type SavedMessage = typeof savedMessages.$inferSelect;

export type PersonaReview = typeof personaReviews.$inferSelect;
export type InsertPersonaReview = z.infer<typeof insertPersonaReviewSchema>;

export type SessionFeedback = typeof sessionFeedback.$inferSelect;

export type TopupEmail = typeof topupEmails.$inferSelect;
export type InsertTopupEmail = z.infer<typeof insertTopupEmailSchema>;
export type InsertSessionFeedback = z.infer<typeof insertSessionFeedbackSchema>;

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;

// Checkout Views - Tracks when users open payment modals (for conversion reporting)
export const checkoutViews = pgTable("checkout_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  packageType: text("package_type").notNull(),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),
  source: text("source").notNull(), // "buy_credits_modal", "out_of_credits", "teaser", "credits_page"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_checkout_views_user").on(table.userId),
  index("idx_checkout_views_created").on(table.createdAt),
]);

// Paywall A/B views — denominator for the Problem-4 paywall experiment.
// One row per paywall surface open, tagged with the assigned variant.
// See docs/posthog-evelyn-purchase-findings.md §3.14.
export const paywallViews = pgTable("paywall_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  experimentKey: text("experiment_key").notNull().default("paywall_copy_2026"),
  variant: text("variant").notNull(),                 // 'A' | 'B'
  surface: text("surface").notNull(),                 // 'buy_credits_modal' | 'credits_page' | 'payment_modal' | ...
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),
  isOutOfCredits: boolean("is_out_of_credits").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_paywall_views_user_created").on(table.userId, table.createdAt),
  index("idx_paywall_views_exp_variant").on(table.experimentKey, table.variant),
]);
export type PaywallView = typeof paywallViews.$inferSelect;

// ============================================================
// Unified A/B Experiment Framework — Phase 1
// (PRD: docs/ab-testing-framework-prd.md §3.1). Dedicated tables — NOT
// system_config JSON — so experiments have real lifecycle/scoping and the
// dashboard (Phase 2) can query them directly. Generalizes the Problem-4
// paywall test. `experiment_exposures` supersedes `paywall_views`/`ab_events`.
// ============================================================

// One variant of an experiment. `weight` is a relative share (need not sum to
// 100); `payload` is arbitrary JSON the code reads (copy/price/threshold/...).
export interface ExperimentVariant {
  key: string;                          // 'A' (control, listed first) | 'B' | ...
  weight: number;                       // relative share; <=0 = never assigned
  payload?: Record<string, unknown>;    // values config-tests read; {} for structural tests
}

// Optional enrolment filter. null/absent field = no filter on that axis.
export interface ExperimentScope {
  personaId?: string | null;            // only enrol this persona (Phase-1 paywall = Evelyn)
  funnel?: string | string[] | null;    // only enrol these V1 funnel(s) (e.g. 'v1-fb', or
                                        // ['v1-palm','v1-tarot']) — V1 price/UI tests. A bare
                                        // string is one funnel; an array enrols any funnel in it,
                                        // for a UI test deliberately run across several funnels
  sign?: string | null;                 // only enrol this fb-palm sign (e.g. 'thumb-angle') — narrows
                                        // a funnel-scoped price test to ONE lander, so a per-lander
                                        // price test never touches the rest of v1-palm's traffic
  route?: string;                       // page/surface for visitor page-copy tests (e.g. 'soulmate_landing')
  element?: string;                     // which element the variant copy targets (e.g. 'headline')
  // Only enrol these /fb-tarot ad URLs, as (hook, deck) PAIRS. Pairs rather than bare
  // hooks because several hooks run on more than one live URL — `cards-return` runs
  // clean (default face-down deck) AND on `&deck=arcana-mfh` (face-UP) — so a hook
  // list cannot say which of them is in the test. Absent = no lander filter.
  // Matching lives in matchesLanderScope() (server/lib/experiments.ts).
  landers?: LanderScope[] | null;
  // Pin each subject to the variant on their FIRST logged exposure, instead of
  // re-deriving it from the CURRENT weights on every call.
  //
  // 🔴 This is what makes editing weights on a RUNNING test safe, and the admin PATCH
  // refuses a live weight edit unless it is set. Buckets are permanently sticky, but
  // the bucket→variant MAP moves with the weights, so re-weighting an unfrozen test
  // silently reassigns visitors who have already seen the other arm — their logged
  // exposure then disagrees with what they were subsequently shown.
  //
  // Safe to switch on at any time, including mid-flight: the exposure log is the
  // record of what a subject actually saw, so freezing to it can only ever stop
  // future drift, never introduce it. Absent/false = today's behaviour exactly.
  freezeAssignment?: boolean;
  [k: string]: unknown;
}

// One enrolled /fb-tarot lander: the question the headline asked × the cards shown.
export interface LanderScope {
  hook: string;
  deck: string;
}

// How a subject's outcome is scored when tallying.
export interface ExperimentConversion {
  // credit_purchase = join to credit_purchases (V2); upsell1_funnel = V1
  // conversations Upsell-1 take-rate; v1_main_funnel = V1 main/downsell purchase;
  // event = generic visitor conversion.
  type: "credit_purchase" | "upsell1_funnel" | "v1_main_funnel" | "event";
  windowDays?: number;                  // attribution window after first exposure (default 7)
  name?: string;                        // event name (type='event')
  targetN?: number;                     // pre-registered per-arm exposure target (fixed-horizon,
                                        // no peeking): the verdict + declare-winner are gated until
                                        // every arm reaches it. 0/absent = no gate.
}

// experiments — one row per test (the registry the dashboard manages).
export const experiments = pgTable("experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),                         // 'paywall_copy_2026', ...
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),           // 'draft' | 'running' | 'paused' | 'done'
  subjectType: text("subject_type").notNull().default("user"), // 'user' | 'visitor' | 'email'
  variants: jsonb("variants").$type<ExperimentVariant[]>().notNull(),
  scope: jsonb("scope").$type<ExperimentScope | null>(),       // null = global
  conversion: jsonb("conversion").$type<ExperimentConversion | null>(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  winnerVariant: text("winner_variant"),
  createdBy: varchar("created_by").references(() => adminUsers.id),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Experiment = typeof experiments.$inferSelect;

// experiment_exposures — one row per FIRST exposure per subject (the denominator).
// unique(experiment_key, subject_id) makes logging idempotent: later opens are
// no-ops, so exposures are only ever logged while a test is RUNNING (the first
// in-test exposure). `context` must stay PII-free (ids/flags only — emails are
// hashed before becoming a subject_id).
//
// subject_id is intentionally plain text with NO FK: it is polymorphic across
// subjectType (user.id | visitor cookie | hashed email), so it can't reference
// users.id the way paywall_views did. Trade-off: deleting a user does NOT cascade
// here, so user-deletion should also delete matching exposures (subject_id =
// user.id) — a follow-up for when exposures go live (the test ships OFF, so none
// are written yet). Orphaned UUID exposures carry no PII.
export const experimentExposures = pgTable("experiment_exposures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentKey: text("experiment_key").notNull(),
  subjectId: text("subject_id").notNull(),            // user.id | visitor cookie | hashed email
  variant: text("variant").notNull(),
  surface: text("surface").notNull(),                 // 'buy_credits_modal' | 'credits_page' | ...
  context: jsonb("context").$type<Record<string, unknown> | null>(), // { personaId, isOutOfCredits, ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_experiment_exposures_key_subject").on(table.experimentKey, table.subjectId),
  index("idx_experiment_exposures_key_variant").on(table.experimentKey, table.variant),
]);
export type ExperimentExposure = typeof experimentExposures.$inferSelect;

// experiment_conversions — generic outcome log for non-purchase ('event') tests
// (e.g. visitor page-copy lander conversions). Purchase tests join credit_purchases
// /conversations instead; this is the denominator-agnostic numerator for event
// metrics. value is optional (cents) for revenue-bearing events; 0 = a plain count.
export const experimentConversions = pgTable("experiment_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentKey: text("experiment_key").notNull(),
  subjectId: text("subject_id").notNull(),            // same subject id space as exposures
  variant: text("variant").notNull(),                 // the arm the subject was exposed to
  event: text("event"),                               // optional event name
  value: integer("value").default(0).notNull(),       // optional revenue in cents (0 = count-only)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_experiment_conversions_key_subject").on(table.experimentKey, table.subjectId),
]);
export type ExperimentConversionRow = typeof experimentConversions.$inferSelect;

// Aiden Quiz Sessions - Analytics + abuse audit for the /aiden quiz funnel
export const aidenQuizSessions = pgTable("aiden_quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  personaSlug: text("persona_slug").notNull().default("aiden-powers"),

  // Quiz answers
  q1Topic: text("q1_topic"),
  q2Feeling: text("q2_feeling"),
  q3Outcome: text("q3_outcome"),

  // Funnel progress
  completedQuiz: boolean("completed_quiz").default(false).notNull(),
  completedSignup: boolean("completed_signup").default(false).notNull(),
  completedVerification: boolean("completed_verification").default(false).notNull(),

  // Linked user (set after registration)
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"),

  // Fraud/analytics signals
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamps
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  signedUpAt: timestamp("signed_up_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_aiden_quiz_user").on(table.userId),
  index("idx_aiden_quiz_created").on(table.personaSlug, table.createdAt),
]);

export const insertAidenQuizSessionSchema = createInsertSchema(aidenQuizSessions);
export type AidenQuizSession = typeof aidenQuizSessions.$inferSelect;
export type InsertAidenQuizSession = z.infer<typeof insertAidenQuizSessionSchema>;

// Evelyn lander sessions: tracks each visit to /evelyn for analytics + segment routing.
// Mirrors aidenQuizSessions in shape but the lander is a chat, not a quiz.
export const evelynLanderSessions = pgTable("evelyn_lander_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),

  // Resolved segment from URL params + DB lookup
  // 'v2_active' | 'v2_password' | 'v1_migrated' | 'brand_new' | 'token_magic'
  resolvedSegment: text("resolved_segment").notNull(),
  resolvedUserId: varchar("resolved_user_id").references(() => users.id, { onDelete: "set null" }),

  // Inputs (param-derived, sanitised, redacted where needed)
  emailParamHash: text("email_param_hash"),
  bucket: text("bucket"),
  src: text("src"),
  campaign: text("campaign"),
  pendingReply: text("pending_reply"),
  // When the parked reply was replayed into a real chat session. A SEPARATE marker
  // rather than nulling pending_reply: that text is also the durable evidence for
  // the 10-minute Live Thread welcome grant, which is re-derived at verification
  // time and on every /check-email resend — clearing it would silently drop those
  // readers back to 5 minutes. See server/lib/liveThreadEngagement.ts's header.
  pendingReplyConsumedAt: timestamp("pending_reply_consumed_at"),
  // The safety verdict POST /reply reached on pending_reply, at the moment it was
  // written and with that request's context. NULL means the text passed. A non-null
  // violation type means the normal chat path would have intercepted these words
  // with a canned response instead of generating against them (chatEngine.ts's
  // step-1 safety gate), so the replay must not smuggle them into the model later.
  // The text is still stored and the reader is still let through — that is the
  // operator's Task 6 ruling and this does not touch it.
  pendingReplyViolationType: text("pending_reply_violation_type"),
  // The persona's answer to pending_reply, generated ONCE before any billing session
  // exists (GET /api/chat-service/live-thread/:personaSlug — free, like /greeting) and
  // shown to the reader on their first /reading load. Persisted rather than kept in the
  // browser so replayPendingReply() can insert it alongside the reply when the session
  // finally starts: otherwise the screen would show an answer the database has never
  // seen, and the persona would answer the same disclosure a second time. Also makes a
  // reload free — a stored answer is returned as-is, never regenerated. See migration 023.
  pendingReplyResponse: text("pending_reply_response"),
  hadToken: boolean("had_token").default(false).notNull(),

  // Funnel progress (chat layer fills these later)
  turnCount: integer("turn_count").default(0).notNull(),
  ctaClicked: boolean("cta_clicked").default(false).notNull(),
  ctaAction: text("cta_action"),

  // Fraud/analytics signals
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  ctaClickedAt: timestamp("cta_clicked_at"),
}, (table) => [
  index("idx_evelyn_lander_user").on(table.resolvedUserId),
  index("idx_evelyn_lander_segment").on(table.resolvedSegment, table.startedAt),
]);

export const insertEvelynLanderSessionSchema = createInsertSchema(evelynLanderSessions);
export type EvelynLanderSession = typeof evelynLanderSessions.$inferSelect;
export type InsertEvelynLanderSession = z.infer<typeof insertEvelynLanderSessionSchema>;

// Email link codes: the content snapshot behind an opaque short link (/e/:code)
// sent in a marketing email, so the lander can continue the specific reading
// the reader clicked from rather than greeting them as a stranger.
export const emailLinkCodes = pgTable("email_link_codes", {
  code: varchar("code").primaryKey(),
  personaSlug: text("persona_slug").notNull(),
  campaign: text("campaign").notNull(),
  readingRecap: text("reading_recap"),
  openLoop: text("open_loop"),
  continueSeed: text("continue_seed").notNull(),
  // Lander context the legacy `?bucket=&src=` query string used to carry. The
  // short link has no room for it (and query params get stripped in transit),
  // so it rides on the row and /e/:code rebuilds the query string from here.
  // bucket is functionally load-bearing, not analytics: it selects Drip 1's
  // bucket-specific phrase (evelynVerifiedDripGenerator BUCKET_PHRASES).
  bucket: text("bucket"),
  src: text("src"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_link_codes_campaign").on(table.campaign),
  // One live code per (persona, campaign). The email-rendering pipeline
  // (render-aweber.mjs) is read-then-write on this pair so a re-render reuses
  // the code already sitting in a scheduled broadcast; this makes that
  // invariant something the database enforces rather than something the
  // pipeline merely assumes.
  uniqueIndex("uq_email_link_codes_persona_campaign").on(table.personaSlug, table.campaign),
]);

export const insertEmailLinkCodeSchema = createInsertSchema(emailLinkCodes);
export type EmailLinkCode = typeof emailLinkCodes.$inferSelect;
export type InsertEmailLinkCode = z.infer<typeof insertEmailLinkCodeSchema>;

// Generalized persona lander sessions: ONE shared table for every additional
// persona's chat lander (Marcus, Luna, Nova, Maren, ...). Same shape as
// evelyn_lander_sessions, plus a persona_slug discriminator so a single engine +
// route + admin view can serve all of them. Evelyn/Aiden keep their own tables.
export const personaLanderSessions = pgTable("persona_lander_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),

  // Which persona's lander this visit belongs to (personas.slug).
  personaSlug: text("persona_slug").notNull(),

  // Resolved segment from URL params + DB lookup
  // 'v2_active' | 'v2_password' | 'v1_migrated' | 'brand_new' | 'token_magic'
  resolvedSegment: text("resolved_segment").notNull(),
  resolvedUserId: varchar("resolved_user_id").references(() => users.id, { onDelete: "set null" }),

  // Inputs (param-derived, sanitised, redacted where needed)
  emailParamHash: text("email_param_hash"),
  bucket: text("bucket"),
  src: text("src"),
  campaign: text("campaign"),
  hadToken: boolean("had_token").default(false).notNull(),

  // Funnel progress (chat layer fills these later)
  turnCount: integer("turn_count").default(0).notNull(),
  ctaClicked: boolean("cta_clicked").default(false).notNull(),
  ctaAction: text("cta_action"),

  // Fraud/analytics signals
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  ctaClickedAt: timestamp("cta_clicked_at"),
}, (table) => [
  index("idx_persona_lander_user").on(table.resolvedUserId),
  index("idx_persona_lander_persona").on(table.personaSlug, table.startedAt),
  index("idx_persona_lander_segment").on(table.resolvedSegment, table.startedAt),
]);

export const insertPersonaLanderSessionSchema = createInsertSchema(personaLanderSessions);
export type PersonaLanderSession = typeof personaLanderSessions.$inferSelect;
export type InsertPersonaLanderSession = z.infer<typeof insertPersonaLanderSessionSchema>;

// Generalized persona follow-up emails: ONE shared table for the verified-not-purchased
// 10-email nurture drip of every additional persona (Marcus, Luna, Nova, Maren, ...),
// discriminated by persona_slug. Same shape as evelyn_followup_emails so the admin view
// and processor stay uniform. Evelyn/Aiden keep their own tables.
export const personaFollowupEmails = pgTable("persona_followup_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Which persona this nurture row belongs to (personas.slug).
  personaSlug: text("persona_slug").notNull(),

  // Kept for parity with the evelyn/aiden tables + future drip tracks. Today only
  // 'verified_nopurchase' is produced here.
  sequenceType: text("sequence_type").default("verified_nopurchase").notNull(),

  sequenceNumber: integer("sequence_number").notNull(), // 1..10
  scheduledFor: timestamp("scheduled_for").notNull(),

  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),

  status: text("status").default("pending").notNull(), // pending, sent, failed, skipped
  sentAt: timestamp("sent_at"),
  resendEmailId: text("resend_email_id"),

  attemptCount: integer("attempt_count").default(0).notNull(),
  errorMessage: text("error_message"),

  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  unsubscribeToken: text("unsubscribe_token").unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_persona_followup_user_seq").on(table.userId, table.sequenceNumber),
  index("idx_persona_followup_status_scheduled").on(table.status, table.scheduledFor),
  index("idx_persona_followup_persona_status_scheduled").on(table.personaSlug, table.status, table.scheduledFor),
]);

export const insertPersonaFollowupEmailSchema = createInsertSchema(personaFollowupEmails);
export type PersonaFollowupEmail = typeof personaFollowupEmails.$inferSelect;
export type InsertPersonaFollowupEmail = z.infer<typeof insertPersonaFollowupEmailSchema>;

// Soulmate lander sessions: linkage row between a /soulmate landing-form submit
// and the V2 user we passwordless-create at that moment. Used by isFromSoulmateLander()
// in auth.ts to decide eligibility for the 5-min (300-coin) onboarding grant and
// the post-verify Evelyn drip — mirrors the evelynLanderSessions role exactly.
export const soulmateLanderSessions = pgTable("soulmate_lander_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  resolvedUserId: varchar("resolved_user_id").references(() => users.id, { onDelete: "set null" }),
  landerPath: text("lander_path"),
  utmSource: text("utm_source"),
  utmCampaign: text("utm_campaign"),
  utmMedium: text("utm_medium"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  // Intake snapshot — captured at /api/soulmate/lead so the email-CTA hydration
  // path can rebuild the sales-page sessionStorage shape without re-asking the
  // user. AWeber custom_fields hold the same data; this is the local-of-record.
  birthMonth: text("birth_month"),
  birthDay: text("birth_day"),
  birthYear: text("birth_year"),
  preference: text("preference"),
  ageRange: text("age_range"),
  ethnicity: text("ethnicity"),
  // Single token per lead reused across the AWeber drip's CTAs. Resolves via
  // GET /api/soulmate/intake/:token. Revoked on sketch purchase + unsubscribe.
  intakeToken: text("intake_token"),
  intakeTokenExpiresAt: timestamp("intake_token_expires_at"),
  intakeTokenRevokedAt: timestamp("intake_token_revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_soulmate_lander_user").on(table.resolvedUserId),
  index("idx_soulmate_lander_email").on(table.email),
  uniqueIndex("idx_soulmate_lander_intake_token").on(table.intakeToken),
]);

export const insertSoulmateLanderSessionSchema = createInsertSchema(soulmateLanderSessions);
export type SoulmateLanderSession = typeof soulmateLanderSessions.$inferSelect;
export type InsertSoulmateLanderSession = z.infer<typeof insertSoulmateLanderSessionSchema>;

// The legacy ab_tests / ab_events split-testing tables were retired in Phase 5 —
// all A/B tests now run on the unified `experiments` / `experiment_exposures` /
// `experiment_conversions` tables above. (Dropped via migrations/018_drop_legacy_ab.sql.)

// ============================================================
// Soulmate Sketch Funnel Orders
// One row per email. Shipping collected once on first physical-product upsell
// (bracelet or tuner) and reused thereafter.
// ============================================================

export const soulmateOrders = pgTable("soulmate_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),

  sketchPiId: text("sketch_pi_id"),
  sketchCents: integer("sketch_cents"),
  sketchAt: timestamp("sketch_at"),

  braceletPiId: text("bracelet_pi_id"),
  braceletCents: integer("bracelet_cents"),
  braceletAt: timestamp("bracelet_at"),

  tunerPiId: text("tuner_pi_id"),
  tunerCents: integer("tuner_cents"),
  tunerAt: timestamp("tuner_at"),

  shippingName: text("shipping_name"),
  shippingLine1: text("shipping_line1"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostal: text("shipping_postal"),
  shippingCountry: text("shipping_country").default("US"),
  shippingPhone: text("shipping_phone"),

  billingSameAsShipping: boolean("billing_same_as_shipping").notNull().default(true),
  billingLine1: text("billing_line1"),
  billingLine2: text("billing_line2"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingPostal: text("billing_postal"),
  billingCountry: text("billing_country"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SoulmateOrder = typeof soulmateOrders.$inferSelect;
export type InsertSoulmateOrder = typeof soulmateOrders.$inferInsert;

// ============================================================
// Bracelet Orders — the Facebook-compliance storefront (/products/:slug)
//
// A NEW, STANDALONE table. Nothing else references it and it references nothing.
// Facebook required an ACTIVE buy button with a price, so these are REAL orders for
// REAL physical goods — somebody has to be able to see what to ship, to whom.
//
// One row per Stripe Checkout session. `stripeSessionId` is UNIQUE so the webhook can
// upsert idempotently: Stripe retries checkout.session.completed, and the buyer may also
// land on the thank-you page, which reads the same session. Neither may create a duplicate.
//
// ⚠️ Create it with migrations/2026-07-14-bracelet-orders.sql (a plain CREATE TABLE IF NOT
// EXISTS). Do NOT `npm run db:push` — dev and prod share ONE database, and push diffs the
// WHOLE schema, so any unrelated drift would be applied to production at the same time.
// ============================================================

export const braceletOrders = pgTable("bracelet_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Stripe is the source of truth for money. UNIQUE => idempotent upsert.
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // What they bought.
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),

  // Who they are.
  email: text("email"),
  customerName: text("customer_name"),
  phone: text("phone"),

  // Where it ships.
  shippingName: text("shipping_name"),
  shippingLine1: text("shipping_line1"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostal: text("shipping_postal"),
  shippingCountry: text("shipping_country"),

  // Fulfilment state — an operator flips this once the parcel is posted.
  status: text("status").notNull().default("paid"), // paid | shipped | refunded | cancelled
  shippedAt: timestamp("shipped_at"),
  trackingNumber: text("tracking_number"),

  // Did the buyer + operator confirmation emails go out?
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bracelet_orders_status").on(table.status, table.createdAt),
  index("idx_bracelet_orders_email").on(table.email),
]);

export type BraceletOrder = typeof braceletOrders.$inferSelect;
export type InsertBraceletOrder = typeof braceletOrders.$inferInsert;

// ============================================================
// BACKEND DECK ORDERS (be_orders)
// ============================================================
// Every purchase from the one-time backend offers — 02 Twin Flame, 03 Judgement Day,
// and the two that follow. ONE table for the whole deck, keyed by `offer`, for the same
// reason there is one AWeber customer list: a woman who buys 02 and then 03 is one
// customer with two orders, and every query about "backend revenue" wants one place.
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md (asset S4).
//
// One row per Stripe Checkout session. `stripeSessionId` is UNIQUE so the webhook can
// upsert idempotently: Stripe retries checkout.session.completed, and the thank-you page
// reads the same session as a backstop. Neither may create a duplicate.
//
// 🔴 WHY THE ROW MATTERS EVEN THOUGH STRIPE HAS THE MONEY: `customer_list_written_at`.
// The AWeber write IS the thank-you send (workflow rule 8) — a Campaign triggered by the
// offer tag. A failed write is a woman who paid and got nothing, and without a column
// recording it, nobody can find her. This is the table you query to answer "who paid and
// was never emailed".
//
// ⚠️ Create it with migrations/2026-08-10-be-orders.sql (a plain CREATE TABLE IF NOT
// EXISTS). Do NOT `npm run db:push` — dev and prod share ONE database, and push diffs the
// WHOLE schema, so any unrelated drift would be applied to production at the same time.
// ============================================================

export const beOrders = pgTable("be_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Stripe is the source of truth for money. UNIQUE => idempotent upsert.
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Which offer, in the deck's own vocabulary (shared/backendOffers.ts).
  offer: text("offer").notNull(),               // twin-flame | judgement-day
  offerNumber: text("offer_number").notNull(),  // 02 | 03
  // Which booking treatment sold it — the page or the chat. The two are an A/B on
  // mechanism, and without this column the test has no readout.
  treatment: text("treatment"),                 // page | chat

  // The money, split so a pay-what-you-want offer stays analysable: `reading_cents`
  // is what she chose to give (or the fixed price), `amount_cents` is what Stripe
  // actually took. They differ by the bump, and only by the bump.
  readingCents: integer("reading_cents").notNull(),
  bumpPurchased: boolean("bump_purchased").notNull().default(false),
  bumpCents: integer("bump_cents").notNull().default(0),
  // ⛔ n8n exact-matches this to decide what to fulfil. Never rename a key.
  bumpProductKey: text("bump_product_key"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),

  // Who she is. `first_name` comes down the chain from the AWeber letter's ?fn=,
  // through Stripe metadata — the difference between "Thank you, Sarah" and "Thank
  // you, Friend" on every screen after the money.
  email: text("email"),
  firstName: text("first_name"),

  status: text("status").notNull().default("paid"), // paid | refunded | cancelled

  // The AWeber write that fires her thank-you. See the header.
  customerListWrittenAt: timestamp("customer_list_written_at"),
  customerListError: text("customer_list_error"),

  // Fulfilment. `reading_body` stores what was ACTUALLY sent (asset S24), so a re-send
  // is identical and support can read what she got.
  readingBody: text("reading_body"),
  readingUrl: text("reading_url"),
  deliveredAt: timestamp("delivered_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_be_orders_offer").on(table.offer, table.createdAt),
  index("idx_be_orders_email").on(table.email),
  // The "paid but never emailed" query, which is the one that finds a broken send.
  index("idx_be_orders_list_written").on(table.customerListWrittenAt),
]);

export type BeOrder = typeof beOrders.$inferSelect;
export type InsertBeOrder = typeof beOrders.$inferInsert;
