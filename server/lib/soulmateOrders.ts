import { eq } from "drizzle-orm";
import { db } from "./db";
import { soulmateOrders, type SoulmateOrder } from "@shared/schema";
import logger from "./logger";

export interface ShippingPayload {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone?: string;
}

export interface BillingPayload {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

export async function getSoulmateOrderByEmail(email: string): Promise<SoulmateOrder | null> {
  if (!email) return null;
  try {
    const [row] = await db
      .select()
      .from(soulmateOrders)
      .where(eq(soulmateOrders.email, email.toLowerCase()))
      .limit(1);
    return row || null;
  } catch (err) {
    logger.error("soulmateOrders.get error:", err);
    return null;
  }
}

export async function upsertSoulmateOrderShipping(params: {
  email: string;
  firstName?: string;
  shipping: ShippingPayload;
  billing?: BillingPayload;
  billingSameAsShipping: boolean;
}): Promise<void> {
  const { email, firstName, shipping, billing, billingSameAsShipping } = params;
  if (!email) return;

  const normEmail = email.toLowerCase();
  const now = new Date();

  const shippingFields = {
    shippingName: shipping.name,
    shippingLine1: shipping.line1,
    shippingLine2: shipping.line2 || null,
    shippingCity: shipping.city,
    shippingState: shipping.state,
    shippingPostal: shipping.postal,
    shippingCountry: shipping.country || "US",
    shippingPhone: shipping.phone || null,
    billingSameAsShipping,
    billingLine1: billingSameAsShipping ? null : (billing?.line1 || null),
    billingLine2: billingSameAsShipping ? null : (billing?.line2 || null),
    billingCity: billingSameAsShipping ? null : (billing?.city || null),
    billingState: billingSameAsShipping ? null : (billing?.state || null),
    billingPostal: billingSameAsShipping ? null : (billing?.postal || null),
    billingCountry: billingSameAsShipping ? null : (billing?.country || null),
    updatedAt: now,
  };

  try {
    await db
      .insert(soulmateOrders)
      .values({
        email: normEmail,
        firstName: firstName || null,
        ...shippingFields,
      })
      .onConflictDoUpdate({
        target: soulmateOrders.email,
        set: {
          ...(firstName ? { firstName } : {}),
          ...shippingFields,
        },
      });
  } catch (err) {
    logger.error("soulmateOrders.upsertShipping error:", err);
    throw err;
  }
}

export async function recordSoulmatePurchase(params: {
  email: string;
  product: "sketch" | "bracelet" | "tuner";
  paymentIntentId: string;
  amountCents: number;
}): Promise<void> {
  const { email, product, paymentIntentId, amountCents } = params;
  if (!email) return;

  const normEmail = email.toLowerCase();
  const now = new Date();

  const fieldMap = {
    sketch: { sketchPiId: paymentIntentId, sketchCents: amountCents, sketchAt: now },
    bracelet: { braceletPiId: paymentIntentId, braceletCents: amountCents, braceletAt: now },
    tuner: { tunerPiId: paymentIntentId, tunerCents: amountCents, tunerAt: now },
  } as const;

  try {
    await db
      .insert(soulmateOrders)
      .values({
        email: normEmail,
        ...fieldMap[product],
      })
      .onConflictDoUpdate({
        target: soulmateOrders.email,
        set: {
          ...fieldMap[product],
          updatedAt: now,
        },
      });
  } catch (err) {
    logger.error("soulmateOrders.recordPurchase error:", err);
  }
}
