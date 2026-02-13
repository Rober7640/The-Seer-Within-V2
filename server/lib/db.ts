import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { conversations, type Conversation, type InsertConversation } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

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
  console.log('DB: Saving conversation for:', data.email);
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

      console.log('DB: Updated existing conversation:', existing[0].id);
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

      console.log('DB: Created new conversation:', inserted[0]?.id);
      return inserted[0]?.id || null;
    }
  } catch (error) {
    console.error("DB ERROR - Database save error:", error);
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
    console.error("Database fetch error:", error);
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
    console.error("Database purchase update error:", error);
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
          mainPurchaseAmount: stripeData.mainPurchaseAmount,
        });
      console.log(`Created new conversation for ${email} with Stripe session`);
    }
  } catch (error) {
    console.error("Database Stripe update error:", error);
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
    console.error("Database fetch by session error:", error);
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
    console.error("Database upsell offered update error:", error);
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
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    console.error("Database upsell purchase update error:", error);
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
): Promise<void> {
  try {
    await db
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
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    console.error("Database shipping save error:", error);
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
    console.error("Database upsell2 offered update error:", error);
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
        updatedAt: new Date(),
      })
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    console.error("Database upsell2 purchase update error:", error);
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
): Promise<void> {
  try {
    await db
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
      .where(eq(conversations.stripeSessionId, sessionId));
  } catch (error) {
    console.error("Database shipping2 save error:", error);
  }
}
