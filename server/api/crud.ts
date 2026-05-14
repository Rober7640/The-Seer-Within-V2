import { Request, Response, NextFunction, Router } from "express";
import { db } from "../lib/db";
import { conversations, insertConversationSchema } from "../../shared/schema";
import { eq, and, SQL } from "drizzle-orm";
import logger from "../lib/logger";

// Valid column names for filtering (maps query param to schema column)
const columnMap: Record<string, any> = {
  id: conversations.id,
  email: conversations.email,
  firstName: conversations.firstName,
  location: conversations.location,
  timeOfDay: conversations.timeOfDay,
  bucket: conversations.bucket,
  subBucket: conversations.subBucket,
  personName: conversations.personName,
  concern: conversations.concern,
  deeperResponse: conversations.deeperResponse,
  vision: conversations.vision,
  emotionalResponse: conversations.emotionalResponse,
  blockSource: conversations.blockSource,
  commitmentResponse: conversations.commitmentResponse,
  purchased: conversations.purchased,
  purchaseType: conversations.purchaseType,
  objectionCount: conversations.objectionCount,
  stripeSessionId: conversations.stripeSessionId,
  stripeCustomerId: conversations.stripeCustomerId,
  stripePaymentMethodId: conversations.stripePaymentMethodId,
  mainPurchaseAmount: conversations.mainPurchaseAmount,
  upsellOffered: conversations.upsellOffered,
  upsellPurchased: conversations.upsellPurchased,
  upsellPaymentId: conversations.upsellPaymentId,
  upsellAmount: conversations.upsellAmount,
  shippingName: conversations.shippingName,
  shippingLine1: conversations.shippingLine1,
  shippingLine2: conversations.shippingLine2,
  shippingCity: conversations.shippingCity,
  shippingState: conversations.shippingState,
  shippingPostalCode: conversations.shippingPostalCode,
  shippingCountry: conversations.shippingCountry,
  downsellOffered: conversations.downsellOffered,
  downsellPurchased: conversations.downsellPurchased,
  downsellAmount: conversations.downsellAmount,
  // Also support snake_case versions for convenience
  first_name: conversations.firstName,
  time_of_day: conversations.timeOfDay,
  sub_bucket: conversations.subBucket,
  person_name: conversations.personName,
  deeper_response: conversations.deeperResponse,
  emotional_response: conversations.emotionalResponse,
  block_source: conversations.blockSource,
  commitment_response: conversations.commitmentResponse,
  purchase_type: conversations.purchaseType,
  objection_count: conversations.objectionCount,
  stripe_session_id: conversations.stripeSessionId,
  stripe_customer_id: conversations.stripeCustomerId,
  stripe_payment_method_id: conversations.stripePaymentMethodId,
  main_purchase_amount: conversations.mainPurchaseAmount,
  upsell_offered: conversations.upsellOffered,
  upsell_purchased: conversations.upsellPurchased,
  upsell_payment_id: conversations.upsellPaymentId,
  upsell_amount: conversations.upsellAmount,
  shipping_name: conversations.shippingName,
  shipping_line1: conversations.shippingLine1,
  shipping_line2: conversations.shippingLine2,
  shipping_city: conversations.shippingCity,
  shipping_state: conversations.shippingState,
  shipping_postal_code: conversations.shippingPostalCode,
  shipping_country: conversations.shippingCountry,
  downsell_offered: conversations.downsellOffered,
  downsell_purchased: conversations.downsellPurchased,
  downsell_amount: conversations.downsellAmount,
};

const router = Router();

// API Key authentication middleware
const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
  }

  next();
};

// Apply authentication to all routes
router.use(authenticateApiKey);

// GET all conversations (with universal column filtering)
// Usage: GET /conversations?email=user@example.com&bucket=love&purchased=true
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    // Build filters from query params (excluding api_key)
    const filters: SQL[] = [];
    const appliedFilters: string[] = [];
    
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'api_key') continue; // Skip auth param
      
      const column = columnMap[key];
      if (column && typeof value === 'string') {
        // Handle boolean conversion
        let filterValue: any = value;
        if (value === 'true') filterValue = true;
        else if (value === 'false') filterValue = false;
        
        filters.push(eq(column, filterValue) as any);
        appliedFilters.push(key);
      }
    }
    
    let result;
    if (filters.length > 0) {
      result = await db
        .select()
        .from(conversations)
        .where(and(...filters) as any);
    } else {
      result = await db.select().from(conversations);
    }
    
    return res.json({ 
      data: result, 
      count: result.length,
      filters: appliedFilters.length > 0 ? appliedFilters : undefined
    });
  } catch (error) {
    logger.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET single conversation by ID
router.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id) as any)
      .limit(1);

    if (conversation.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.json({ data: conversation[0] });
  } catch (error) {
    logger.error("Error fetching conversation:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// GET conversation by email
router.get("/conversations/email/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.email, email) as any);

    return res.json({ data: conversation, count: conversation.length });
  } catch (error) {
    logger.error("Error fetching conversation by email:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// POST create new conversation
router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const parsed = insertConversationSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.errors 
      });
    }

    const inserted = await db
      .insert(conversations)
      .values(parsed.data)
      .returning();

    return res.status(201).json({ data: inserted[0] });
  } catch (error) {
    logger.error("Error creating conversation:", error);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

// PUT update conversation by ID
router.put("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if conversation exists
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id) as any)
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updated = await db
      .update(conversations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(conversations.id, id) as any)
      .returning();

    return res.json({ data: updated[0] });
  } catch (error) {
    logger.error("Error updating conversation:", error);
    return res.status(500).json({ error: "Failed to update conversation" });
  }
});

// PATCH partial update conversation by ID
router.patch("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if conversation exists
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id) as any)
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updated = await db
      .update(conversations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(conversations.id, id) as any)
      .returning();

    return res.json({ data: updated[0] });
  } catch (error) {
    logger.error("Error updating conversation:", error);
    return res.status(500).json({ error: "Failed to update conversation" });
  }
});

// DELETE conversation by ID
router.delete("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if conversation exists
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id) as any)
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await db.delete(conversations).where(eq(conversations.id, id) as any);

    return res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    logger.error("Error deleting conversation:", error);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
