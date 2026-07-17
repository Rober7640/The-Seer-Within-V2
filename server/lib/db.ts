import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { conversations, type Conversation, type InsertConversation } from "@shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import logger from "./logger";
import { activeStripeAccountTag } from "./stripeAccount";

// Override pg's default timestamp parsers to ALWAYS treat as UTC.
// OID 1114 = timestamp without time zone
// OID 1184 = timestamp with time zone
// Without this, pg parses "timestamp without time zone" in the server's LOCAL
// timezone, causing a 5.5-hour billing error when the server runs in IST.
pg.types.setTypeParser(1114, (str: string) => new Date(str.replace(' ', 'T') + 'Z'));
pg.types.setTypeParser(1184, (str: string) => new Date(str));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,                    // Up from default 10 — supports 200-500 concurrent users
  min: 2,                     // Keep 2 connections warm at all times
  idleTimeoutMillis: 30000,   // Release idle connections after 30s
  connectionTimeoutMillis: 3000, // Fail fast if pool is exhausted (vs hanging forever)
});

// Prevent idle connection drops from crashing the process
pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message });
});

// Kill runaway queries after 8 seconds so they don't hold connections under load
pool.on('connect', (client) => {
  // Force UTC so pg's timestamp parser always creates correct Date objects,
  // regardless of the server's local timezone (fixes IST billing bug).
  client.query("SET timezone = 'UTC'").catch((err) => {
    logger.error('CRITICAL: Failed to set timezone to UTC on DB connection', { error: err.message });
  });
  client.query('SET statement_timeout = 8000').catch((err) => {
    logger.error('Failed to set statement_timeout on DB connection', { error: err.message });
  });
});

export const db = drizzle(pool, {
  logger: {
    logQuery(query: string, params: unknown[]) {
      // Only log billing-related queries to avoid noise
      if (query.includes('coins_charged') || query.includes('coin_balance') || query.includes('duration_seconds')) {
        logger.info('DRIZZLE_SQL', { query: query.substring(0, 500), params: JSON.stringify(params).substring(0, 300) });
      }
    },
  },
});

export interface ConversationRecord {
  id?: string;
  email: string;
  firstName: string;
  location?: string;
  timeOfDay?: string;
  bucket?: string;
  subBucket?: string;
  personName?: string;
  concern?: string;
  deeperResponse?: string;
  vision?: string;
  emotionalResponse?: string;
  blockSource?: string;
  commitmentResponse?: string;
  purchased?: boolean;
  purchaseType?: string;
  objectionCount?: number;
  conversationState?: string;
  messages?: string;
}

export async function saveConversation(data: ConversationRecord): Promise<string | null> {
  logger.info('DB: Saving conversation for:', data.email);
  try {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.email, data.email))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(conversations)
        .set({
          firstName: data.firstName,
          location: data.location,
          timeOfDay: data.timeOfDay,
          bucket: data.bucket,
          subBucket: data.subBucket,
          personName: data.personName,
          concern: data.concern,
          deeperResponse: data.deeperResponse,
          vision: data.vision,
          emotionalResponse: data.emotionalResponse,
          blockSource: data.blockSource,
          commitmentResponse: data.commitmentResponse,
          purchased: data.purchased,
          purchaseType: data.purchaseType,
          objectionCount: data.objectionCount,
          conversationState: data.conversationState,
          messages: data.messages,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, existing[0].id));

      logger.info('DB: Updated existing conversation:', existing[0].id);
      return existing[0].id;
    } else {
      const inserted = await db
        .insert(conversations)
        .values({
          email: data.email,
          firstName: data.firstName,
          location: data.location,
          timeOfDay: data.timeOfDay,
          bucket: data.bucket,
          subBucket: data.subBucket,
          personName: data.personName,
          concern: data.concern,
          deeperResponse: data.deeperResponse,
          vision: data.vision,
          emotionalResponse: data.emotionalResponse,
          blockSource: data.blockSource,
          commitmentResponse: data.commitmentResponse,
          purchased: data.purchased,
          purchaseType: data.purchaseType,
          objectionCount: data.objectionCount,
          conversationState: data.conversationState,
          messages: data.messages,
        })
        .returning({ id: conversations.id });

      logger.info('DB: Created new conversation:', inserted[0]?.id);
      return inserted[0]?.id || null;
    }
  } catch (error) {
    logger.error("DB ERROR - Database save error:", error);
    return null;
  }
}

export async function getConversationByEmail(email: string): Promise<Conversation | null> {
  try {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.email, email))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    logger.error("Database fetch error:", error);
    return null;
  }
}

// Lookup by the conversation's own random UUID. Used by the emailed recovery
// link: the id is unguessable, so unlike a lookup keyed on email it can't be
// used to enumerate other people's readings.
export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    logger.error("Database fetch error:", error);
    return null;
  }
}

export async function markPurchased(email: string, purchaseType: "main" | "downsell"): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        purchased: true,
        purchaseType,
        updatedAt: new Date(),
      })
      .where(eq(conversations.email, email));
  } catch (error) {
    logger.error("Database purchase update error:", error);
  }
}

export async function updateStripeData(
  email: string,
  stripeData: {
    stripeSessionId: string;
    stripeCustomerId: string;
    stripePaymentMethodId?: string;
    mainPurchaseAmount?: number;
  },
  userData?: {
    firstName?: string;
    bucket?: string;
  }
): Promise<void> {
  try {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.email, email))
      .orderBy(desc(conversations.createdAt))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(conversations)
        .set({
          stripeSessionId: stripeData.stripeSessionId,
          stripeCustomerId: stripeData.stripeCustomerId,
          stripePaymentMethodId: stripeData.stripePaymentMethodId,
          stripeAccount: activeStripeAccountTag(),
          mainPurchaseAmount: stripeData.mainPurchaseAmount,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, existing[0].id));
    } else {
      await db
        .insert(conversations)
        .values({
          email: email,
          firstName: userData?.firstName || 'Friend',
          bucket: userData?.bucket,
          stripeSessionId: stripeData.stripeSessionId,
          stripeCustomerId: stripeData.stripeCustomerId,
          stripePaymentMethodId: stripeData.stripePaymentMethodId,
          stripeAccount: activeStripeAccountTag(),
          mainPurchaseAmount: stripeData.mainPurchaseAmount,
        });
      logger.info(`Created new conversation for ${email} with Stripe session`);
    }
  } catch (error) {
    logger.error("Database Stripe update error:", error);
  }
}

export async function getConversationByStripeSession(sessionId: string): Promise<Conversation | null> {
  try {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.stripeSessionId, sessionId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    logger.error("Database fetch by session error:", error);
    return null;
  }
}

export async function markUpsellOffered(sessionId: string): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        upsellOffered: true,
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    logger.error("Database upsell offered update error:", error);
  }
}

// Stamp the browser-independent "front-end payment actually completed" signal
// from the Stripe checkout.session.completed webhook. Matched by the checkout
// session id that /api/checkout saved on the row (updateStripeData) BEFORE
// payment, so it lands even when the buyer never loads /welcome1 (the case the
// legacy upsell_offered signal misses). Idempotent: the `main_paid_at IS NULL`
// guard makes Stripe's webhook retries no-ops. Reporting-only — nothing in the
// funnel / checkout / pricing / variant-assignment reads this column.
export async function markMainPaid(sessionId: string): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        mainPaidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.stripeSessionId, sessionId),
          isNull(conversations.mainPaidAt),
        ),
      );
  } catch (error) {
    logger.error("Database markMainPaid update error:", error);
  }
}

export async function markUpsellPurchased(
  sessionId: string,
  upsellPaymentId: string,
  upsellAmount: number
): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        upsellPurchased: true,
        upsellPaymentId,
        upsellAmount,
        // Upsell PI is created on the active account; in normal flow this matches
        // the row's existing tag (same account as the main purchase).
        stripeAccount: activeStripeAccountTag(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    logger.error("Database upsell purchase update error:", error);
  }
}

export async function saveShippingAddress(
  sessionId: string,
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  }
): Promise<boolean> {
  try {
    const result = await db
      .update(conversations)
      .set({
        shippingName: address.name,
        shippingLine1: address.line1,
        shippingLine2: address.line2 || null,
        shippingCity: address.city,
        shippingState: address.state,
        shippingPostal: address.postal,
        shippingCountry: address.country,
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId))
      .returning({ id: conversations.id });

    if (result.length === 0) {
      logger.error("saveShippingAddress: 0 rows updated — no conversation found for session", { sessionId });
      return false;
    }
    logger.info("saveShippingAddress: shipping saved successfully", { sessionId, rowsUpdated: result.length });
    return true;
  } catch (error) {
    logger.error("Database shipping save error:", error);
    return false;
  }
}

export async function markUpsell2Offered(sessionId: string): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        upsell2Offered: true,
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    logger.error("Database upsell2 offered update error:", error);
  }
}

export async function markUpsell2Purchased(
  sessionId: string,
  upsell2PaymentId: string,
  upsell2Amount: number,
  upsell2Type: string
): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({
        upsell2Purchased: true,
        upsell2PaymentId,
        upsell2Amount,
        upsell2Type,
        stripeAccount: activeStripeAccountTag(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    logger.error("Database upsell2 purchase update error:", error);
  }
}

export async function saveShipping2Address(
  sessionId: string,
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  }
): Promise<boolean> {
  try {
    const result = await db
      .update(conversations)
      .set({
        shipping2Name: address.name,
        shipping2Line1: address.line1,
        shipping2Line2: address.line2 || null,
        shipping2City: address.city,
        shipping2State: address.state,
        shipping2Postal: address.postal,
        shipping2Country: address.country,
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId))
      .returning({ id: conversations.id });

    if (result.length === 0) {
      logger.error("saveShipping2Address: 0 rows updated — no conversation found for session", { sessionId });
      return false;
    }
    logger.info("saveShipping2Address: shipping2 saved successfully", { sessionId, rowsUpdated: result.length });
    return true;
  } catch (error) {
    logger.error("Database shipping2 save error:", error);
    return false;
  }
}
