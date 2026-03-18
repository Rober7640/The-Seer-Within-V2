import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, real, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  mainPurchaseAmount: integer("main_purchase_amount"),
  
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

  // Per-persona pricing (fully admin-editable)
  freeCoins: integer("free_coins").default(180).notNull(),
  coinsPerMinute: integer("coins_per_minute").default(60).notNull(),
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
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),

  // Email verification
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),

  // Coin balance (60 coins = 1 minute)
  coinBalance: integer("coin_balance").default(0).notNull(),
  totalCoinsUsed: integer("total_coins_used").default(0).notNull(),

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

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_migration_drip_user_seq").on(table.userId, table.sequenceNumber),
  index("idx_migration_drip_status").on(table.status, table.sentAt),
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
