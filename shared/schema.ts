import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
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
  sortOrder: integer("sort_order").default(0).notNull(),

  // Per-persona pricing (fully admin-editable)
  freeMinutes: integer("free_minutes").default(3).notNull(),
  customPricing: text("custom_pricing"), // JSON array: [{ packageType, minutes, priceUsd, label }]

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

  // Credit tracking
  creditMinutes: integer("credit_minutes").default(3).notNull(),
  totalMinutesUsed: integer("total_minutes_used").default(0).notNull(),

  // Multi-persona
  defaultPersonaId: varchar("default_persona_id").references(() => personas.id, { onDelete: "set null" }),

  // Account status
  accountStatus: text("account_status").default("active").notNull(),
  lastLoginAt: timestamp("last_login_at"),

  // Migration from funnel
  migratedFromConversationId: varchar("migrated_from_conversation_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Chat Sessions - Individual conversation sessions
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  minutesCharged: integer("minutes_charged").default(0).notNull(),
  status: text("status").default("active").notNull(), // active, ended, out_of_credits

  lastTopic: text("last_topic"),
  lastBucket: text("last_bucket"),

  // A/B testing - which prompt variant was used
  promptVariantId: varchar("prompt_variant_id"),

  // Snapshot of pricing applied to this session (JSON, for audit)
  pricingApplied: text("pricing_applied"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
});

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
});

// 7. Credit Purchases - Transaction log
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),

  packageType: text("package_type").notNull(), // "15min", "30min", or custom
  minutesPurchased: integer("minutes_purchased").notNull(),
  priceUsd: integer("price_usd").notNull(), // in cents

  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").default("pending").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
