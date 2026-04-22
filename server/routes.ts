// Force server restart
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import express from "express";
import { z } from "zod";
import logger from "./lib/logger";

function getBaseUrl(req: Request): string {
  const origin = req.headers.origin;
  if (origin) return origin;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return process.env.BASE_URL || "http://localhost:5000";
}
import { checkUniversalSafety, checkAndLogSafety } from "./lib/universalSafety";
import { getCountryFromIP } from "./lib/crisisHotlines";
import { storage } from "./storage";
import crudRouter from "./api/crud";
import authRouter from "./routes/auth";
import chatServiceRouter from "./routes/chatService";
import creditsRouter from "./routes/credits";
import adminRouter from "./routes/admin/index";
import personasRouter from "./routes/personas";
import webhooksRouter, { reportTrackdeskConversion } from "./routes/webhooks";
import userStatsRouter from "./routes/userStats";
import migrateRouter from "./routes/migrate";
import astrologyRouter from "./routes/astrology";
import quizRouter from "./routes/quiz";
import {
  runHealthCheck,
  runReadinessCheck,
  getMetrics,
  recordApiRequest,
  recordApiError,
} from "./lib/healthCheck";
import { isTier1State, migrateAndEmailFunnelUser } from "./lib/funnelMigrationEmail";
import {
  generateReading1,
  generateReading2,
  generateFutureValidation,
  generateCrisisReveal,
  generateCrisisCost,
  generateCrisisUrgency,
  generateShadowSummary,
  generateValueExplain,
  generateCrisis,
  handleObjection,
  generateManifestReveal,
  generateManifestPersonalize,
} from "./lib/claude";
import {
  saveConversation,
  getConversationByEmail,
  markPurchased,
  updateStripeData,
  getConversationByStripeSession,
  markUpsellOffered,
  markUpsellPurchased,
  saveShippingAddress,
  markUpsell2Offered,
  markUpsell2Purchased,
  saveShipping2Address,
} from "./lib/db";
import Stripe from "stripe";
import type { ChatRequest, CheckoutRequest } from "../shared/types";
import {
  addSubscriberToList,
  addPaidSubscriber,
  addUpsellSubscriber,
  addUpsell2Subscriber,
} from "./lib/aweber";
import { sendFacebookEvent } from "./lib/facebook";

// Zod schemas for request validation
const upsellChargeSchema = z.object({
  checkoutSessionId: z.string().min(1),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
});

const upsellFallbackSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  bucket: z.string().min(1),
  originalSessionId: z.string().min(1),
});

const shippingSaveSchema = z.object({
  paymentIntentId: z.string().min(1),
  firstName: z.string().min(1),
  email: z.string().email(),
  address: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postal: z.string().min(1),
    country: z.string().min(1),
  }),
});

const upsell2ChargeSchema = z.object({
  checkoutSessionId: z.string().min(1),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  type: z.enum(["full", "downsell"]),
});

const upsell2FallbackSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  bucket: z.string().min(1),
  originalSessionId: z.string().min(1),
  type: z.enum(["full", "downsell"]),
});

const upsell2ReadingSchema = z.object({
  type: z.enum(["manifest_reveal", "manifest_personalize"]),
  userData: z.object({
    firstName: z.string(),
    bucket: z.string(),
    concern: z.string().optional(),
    personName: z.string().optional(),
  }),
  concern: z.string().optional(),
});

// Initialize Stripe only if key is provided
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe =
  stripeKey && stripeKey !== "sk_test_placeholder"
    ? new Stripe(stripeKey)
    : null;

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Health check endpoint - visit this URL to verify production server is running
  app.get("/api/health-check", async (req: Request, res: Response) => {
    logger.info("Health check called");
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      stripeConfigured: !!stripe,
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Comprehensive health endpoint - checks all dependencies (DB, Stripe, Anthropic, Resend, memory)
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const result = await runHealthCheck();
      const statusCode = result.status === 'unhealthy' ? 503 : 200;
      return res.status(statusCode).json(result);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  // Readiness probe - lightweight check for load balancer / orchestrator
  app.get("/api/ready", async (_req: Request, res: Response) => {
    try {
      const result = await runReadinessCheck();
      return res.status(result.ready ? 200 : 503).json(result);
    } catch (error) {
      return res.status(503).json({ ready: false });
    }
  });

  // Prometheus-format metrics endpoint
  app.get("/api/metrics", async (_req: Request, res: Response) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.send(metrics);
    } catch (error) {
      return res.status(500).send('# Error collecting metrics\n');
    }
  });

  // Track API request/error counts for Prometheus metrics
  app.use("/api", (req: Request, res: Response, next) => {
    recordApiRequest();
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        recordApiError();
      }
    });
    next();
  });

  // Serve uploaded persona avatars (persists across builds)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), { maxAge: '30d' }));

  // CRUD API routes (secured with API key)
  app.use("/api/v1", crudRouter);

  // Chat service routes
  app.use("/api/auth", authRouter);
  app.use("/api/chat-service", chatServiceRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/personas", personasRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/user", userStatsRouter);
  app.use("/api/migrate", migrateRouter);
  app.use("/api/astrology", astrologyRouter);
  app.use("/api/quiz", quizRouter);

  // Diagnostic endpoint to test Stripe session retrieval
  // Usage: GET /api/upsell/test-session/cs_xxx (replace cs_xxx with actual Stripe session ID)
  app.get(
    "/api/upsell/test-session/:sessionId",
    async (req: Request, res: Response) => {
      const sessionId = req.params.sessionId as string;
      logger.info(`=== TEST SESSION ENDPOINT CALLED for ${sessionId} ===`);

      if (!stripe) {
        return res.json({
          error: "Stripe not configured",
          stripeConfigured: false,
        });
      }

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const sessionAny = session as any;

        return res.json({
          success: true,
          sessionId: session.id,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
          metadata: session.metadata,
          paymentIntent: session.payment_intent,
          collectedShipping:
            sessionAny.collected_information?.shipping_details || null,
          topLevelShipping: sessionAny.shipping_details || null,
        });
      } catch (error: any) {
        logger.error("Test session error:", error);
        return res.json({
          success: false,
          error: error.message,
        });
      }
    },
  );

  // Chat API - Claude integration
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { action, userData, input, objectionCount } =
        req.body as ChatRequest;

      // Universal safety check — same protections as V2 chat service
      if (input && typeof input === "string") {
        const userIP = req.ip || (req.headers['x-forwarded-for'] as string) || undefined;
        const countryCode = await getCountryFromIP(userIP);
        const safetyResult = await checkAndLogSafety(input, {
          ipAddress: userIP,
          userAgent: req.headers['user-agent'] || undefined,
          countryCode,
        });
        if (!safetyResult.safe && safetyResult.response) {
          return res.json({
            messages: [safetyResult.response],
          });
        }
      }

      let result: {
        messages: string[];
        needsClarification?: boolean;
        detectedTopic?: string;
      };

      switch (action) {
        // New expanded flow actions
        case "reading1":
          result = await generateReading1(userData, input);
          break;
        case "reading2":
          result = await generateReading2(userData, input);
          break;
        case "futureValidation":
          result = await generateFutureValidation(userData, input);
          break;
        case "crisisReveal":
          result = await generateCrisisReveal(userData, input);
          break;
        case "crisisCost":
          result = await generateCrisisCost(userData, input);
          break;
        case "crisisUrgency":
          result = await generateCrisisUrgency(userData, input);
          break;
        case "shadowSummary":
          result = await generateShadowSummary(userData);
          break;
        case "valueExplain":
          result = await generateValueExplain(userData);
          break;
        // Legacy actions
        case "reading":
          result = await generateReading1(userData, input);
          break;
        case "crisis":
          result = await generateCrisis(userData, input);
          break;
        case "objection":
          result = await handleObjection(userData, input, objectionCount || 1);
          break;
        default:
          return res.status(400).json({ error: "Invalid action" });
      }

      return res.json(result);
    } catch (error) {
      logger.error("Chat API error:", error);
      return res.json({
        messages: ["I sense something shifting...", "Let me focus..."],
      });
    }
  });

  // Helper: resolve location string from request IP (returns "City, Country" or null)
  async function resolveLocationFromIP(req: Request): Promise<string | null> {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      const ip =
        typeof forwarded === "string"
          ? forwarded.split(",")[0]?.trim()
          : req.socket.remoteAddress || "";

      if (
        !ip ||
        ip === "::1" ||
        ip.startsWith("127.") ||
        ip.startsWith("192.168.") ||
        ip === "::ffff:127.0.0.1"
      ) {
        return null;
      }

      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=city,country`,
      );
      const data = await response.json();

      if (data.city) {
        return `${data.city}${data.country ? `, ${data.country}` : ""}`;
      }
      return data.country || null;
    } catch {
      return null;
    }
  }

  // Location API - IP geolocation
  app.get("/api/location", async (req: Request, res: Response) => {
    try {
      const forwarded = req.headers["x-forwarded-for"];
      const ip =
        typeof forwarded === "string"
          ? forwarded.split(",")[0]?.trim()
          : req.socket.remoteAddress || "";

      if (
        !ip ||
        ip === "::1" ||
        ip.startsWith("127.") ||
        ip.startsWith("192.168.") ||
        ip === "::ffff:127.0.0.1"
      ) {
        return res.json({ city: null, country: null });
      }

      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=city,country`,
      );
      const data = await response.json();

      return res.json({
        city: data.city || null,
        country: data.country || null,
      });
    } catch (error) {
      logger.error("Location API error:", error);
      return res.json({ city: null, country: null });
    }
  });

  // Checkout API - Stripe integration
  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const {
        email,
        firstName,
        bucket,
        type = "main",
        trackdeskClickId,
      } = req.body as CheckoutRequest & { trackdeskClickId?: string };

      // Mark as purchased in Supabase (optimistic - will be confirmed by webhook in production)
      if (email) {
        await markPurchased(email, type as "main" | "downsell");
      }

      // Check if Stripe is configured
      if (!stripe) {
        logger.warn("Stripe not configured - returning mock checkout URL");
        return res.json({ url: "/success" });
      }

      // Price in cents
      const priceAmount = type === "downsell" ? 2500 : 3500;

      // Create or get existing customer
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customer = customers.data[0];
      if (!customer) {
        customer = await stripe.customers.create({ email, name: firstName });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Energy Clearing Ritual",
                description: `Personalized reading for ${firstName}`,
              },
              unit_amount: priceAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        payment_intent_data: {
          description: "Energy Clearing Ritual",
          setup_future_usage: "off_session",
          metadata: {
            firstName,
            bucket,
            email,
            app: "the-seer-within",
            product: "energy_clearing_ritual",
          },
        },
        success_url: `${getBaseUrl(req)}/welcome1?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getBaseUrl(req)}/chat?cancelled=true`,
        metadata: {
          firstName,
          email,
          bucket,
          type,
          app: "the-seer-within",
          product: "energy_clearing_ritual",
          ...(trackdeskClickId && { trackdeskClickId }),
        },
      });

      // Save Stripe session ID to database for upsell flow (upsert - creates if not exists)
      // This MUST complete before we return the URL to prevent race conditions
      if (email) {
        try {
          await updateStripeData(
            email,
            {
              stripeSessionId: session.id,
              stripeCustomerId: customer.id,
              mainPurchaseAmount: priceAmount,
            },
            {
              firstName,
              bucket,
            },
          );
          logger.info(`Saved Stripe session ${session.id} for ${email}`);
        } catch (dbError) {
          // Log but don't fail - the fallback in /api/upsell/user-data will handle this
          logger.error("Failed to save Stripe session to DB:", dbError);
        }
      }

      return res.json({ url: session.url });
    } catch (error) {
      logger.error("Checkout error:", error);
      return res.status(500).json({ error: "Checkout failed" });
    }
  });

  // Lead capture endpoint - saves to Supabase and AWeber
  app.post("/api/lead", async (req: Request, res: Response) => {
    try {
      const { email, firstName, bucket, location, timeOfDay, trackdeskClickId } = req.body;

      logger.info("Lead captured:", { email, firstName, bucket });

      // Server-side fallback if frontend didn't resolve location
      const resolvedLocation = location || await resolveLocationFromIP(req);

      // Save to database
      await saveConversation({
        email,
        firstName,
        bucket,
        location: resolvedLocation || null,
        timeOfDay: timeOfDay || null,
      });

      // Add to AWeber email list (non-blocking)
      addSubscriberToList({
        email,
        name: firstName,
        tags: [bucket || "website", "seer-within"],
      })
        .then((result) => {
          if (result.success) {
            logger.info(`AWeber: Added ${email} to list`);
          } else {
            logger.warn(`AWeber: Failed to add ${email}:`, result.error);
          }
        })
        .catch((err) => {
          logger.warn("AWeber error (non-blocking):", err);
        });

      // Report Lead conversion to Trackdesk (non-blocking)
      if (trackdeskClickId && email) {
        reportTrackdeskConversion({
          clickId: trackdeskClickId,
          conversionType: "lead",
          externalId: email,
          customerId: email,
        }).catch((err) => {
          logger.warn("Trackdesk lead error (non-blocking):", err);
        });
      }

      return res.json({ success: true });
    } catch (error) {
      logger.error("Lead capture error:", error);
      return res.status(500).json({ error: "Failed to capture lead" });
    }
  });

  // Save conversation progress endpoint
  app.post("/api/save-progress", async (req: Request, res: Response) => {
    try {
      const { userData, conversationState, messages } = req.body;

      if (!userData.email) {
        return res.status(400).json({ error: "Email required" });
      }

      // Server-side fallback if frontend didn't resolve location
      const resolvedLocation = userData.location || await resolveLocationFromIP(req);

      await saveConversation({
        email: userData.email,
        firstName: userData.firstName,
        location: resolvedLocation,
        timeOfDay: userData.timeOfDay,
        bucket: userData.bucket,
        subBucket: userData.subBucket,
        personName: userData.personName,
        concern: userData.concern,
        vision: userData.desires,
        deeperResponse: userData.deeperResponse,
        emotionalResponse: userData.emotionalResponse,
        blockSource: userData.blockSource,
        commitmentResponse: userData.commitmentResponse,
        objectionCount: userData.objectionCount,
        conversationState: conversationState,
        messages: JSON.stringify(messages),
      });

      // Tier 1 funnel migration: auto-create V2 account and send personalized
      // email when user reaches DEEPENING_2 or beyond (non-blocking)
      if (conversationState && isTier1State(conversationState) && userData.email) {
        migrateAndEmailFunnelUser({
          email: userData.email,
          firstName: userData.firstName,
          bucket: userData.bucket,
          subBucket: userData.subBucket,
          concern: userData.concern,
          deeperResponse: userData.deeperResponse,
          vision: userData.desires,
          emotionalResponse: userData.emotionalResponse,
          blockSource: userData.blockSource,
          personName: userData.personName,
          location: resolvedLocation,
          timeOfDay: userData.timeOfDay,
        }).catch((err) => {
          logger.error('Funnel migration background error', { error: err?.message });
        });
      }

      return res.json({ success: true });
    } catch (error) {
      logger.error("Save progress error:", error);
      return res.status(500).json({ error: "Failed to save progress" });
    }
  });

  // Get conversation by email (for cross-device restore)
  app.get("/api/conversation/:email", async (req: Request, res: Response) => {
    try {
      const email = Array.isArray(req.params.email)
        ? req.params.email[0]
        : req.params.email;
      const conversation = await getConversationByEmail(email);

      if (!conversation) {
        return res.status(404).json({ error: "Not found" });
      }

      return res.json({
        userData: {
          firstName: conversation.firstName,
          email: conversation.email,
          bucket: conversation.bucket,
          subBucket: conversation.subBucket,
          personName: conversation.personName,
          concern: conversation.concern,
          desires: conversation.vision,
          location: conversation.location,
          timeOfDay: conversation.timeOfDay,
          objectionCount: conversation.objectionCount || 0,
        },
        conversationState: conversation.conversationState,
        messages: conversation.messages
          ? JSON.parse(conversation.messages)
          : [],
      });
    } catch (error) {
      logger.error("Get conversation error:", error);
      return res.status(500).json({ error: "Failed to get conversation" });
    }
  });

  // ============================================
  // UPSELL ROUTES
  // ============================================

  // Get user data for upsell page by session ID (marks upsell offered)
  app.get("/api/upsell/user-data", async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.session_id as string;

      if (!sessionId) {
        return res.status(400).json({ error: "Missing session_id" });
      }

      // Fetch from database by stripe session ID
      let conversation = await getConversationByStripeSession(sessionId);

      // FALLBACK: If not found in database, fetch directly from Stripe and create the record
      // This handles race conditions where the redirect is faster than the database write
      if (!conversation && stripe) {
        logger.info(`Session ${sessionId} not in DB, fetching from Stripe...`);

        try {
          const stripeSession = await stripe.checkout.sessions.retrieve(
            sessionId,
            {
              expand: ["customer", "payment_intent"],
            },
          );

          // Only proceed if payment was successful
          if (stripeSession.payment_status === "paid") {
            const email =
              stripeSession.customer_email || stripeSession.metadata?.email;
            const firstName = stripeSession.metadata?.firstName || "Friend";
            const bucket = stripeSession.metadata?.bucket;
            const customerId =
              typeof stripeSession.customer === "string"
                ? stripeSession.customer
                : stripeSession.customer?.id;

            if (email) {
              // Create the missing database record with all Stripe data
              await updateStripeData(
                email,
                {
                  stripeSessionId: sessionId,
                  stripeCustomerId: customerId || "",
                  mainPurchaseAmount: stripeSession.amount_total || 3500,
                },
                {
                  firstName,
                  bucket,
                },
              );

              logger.info(
                `Created DB record for ${email} from Stripe fallback`,
              );

              // Now fetch the freshly created record
              conversation = await getConversationByStripeSession(sessionId);
            }
          } else {
            logger.warn(
              `Stripe session ${sessionId} not paid: ${stripeSession.payment_status}`,
            );
          }
        } catch (stripeErr) {
          logger.error("Stripe fallback error:", stripeErr);
        }
      }

      if (!conversation) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Mark upsell as offered
      await markUpsellOffered(sessionId);

      // Add to AWeber paid list with Stripe order ID (non-blocking)
      if (stripe && conversation.email) {
        stripe.checkout.sessions
          .retrieve(sessionId, { expand: ["payment_intent"] })
          .then((session) => {
            if (
              session.payment_status === "paid" &&
              session.payment_intent
            ) {
              const paymentIntentId =
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent.id;

              const purchaseType = session.metadata?.type || "main";

              addPaidSubscriber({
                email: conversation!.email!,
                name: conversation!.firstName || undefined,
                stripeOrderId: paymentIntentId,
                tags: [
                  conversation!.bucket || "seer-within",
                  "paid",
                  purchaseType === "downsell" ? "downsell" : "initial-purchase",
                ],
              })
                .then((result) => {
                  if (result.success) {
                    logger.info(
                      `AWeber Paid: Added ${conversation!.email} to paid list (${purchaseType})`,
                    );
                  } else {
                    logger.warn(
                      `AWeber Paid: Failed to add ${conversation!.email}:`,
                      result.error,
                    );
                  }
                })
                .catch((err) => {
                  logger.warn("AWeber paid list error (non-blocking):", err);
                });
            }
          })
          .catch((err) => {
            logger.warn("Stripe session retrieve error (non-blocking):", err);
          });
      }

      return res.json({
        firstName: conversation.firstName,
        email: conversation.email,
        bucket: conversation.bucket,
        personName: conversation.personName,
        stripeCustomerId: conversation.stripeCustomerId,
        mainPurchaseAmount: conversation.mainPurchaseAmount || 3500,
      });
    } catch (error) {
      logger.error("Get upsell user data error:", error);
      return res.status(500).json({ error: "Failed to get user data" });
    }
  });

  // Get order details for success page (read-only, doesn't mark upsell offered)
  app.get("/api/order/details", async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.session_id as string;

      if (!sessionId) {
        return res.status(400).json({ error: "Missing session_id" });
      }

      // Fetch from database by stripe session ID
      const conversation = await getConversationByStripeSession(sessionId);

      if (!conversation) {
        return res.status(404).json({ error: "Order not found" });
      }

      return res.json({
        firstName: conversation.firstName,
        email: conversation.email,
        bucket: conversation.bucket,
        upsellPurchased: conversation.upsellPurchased || false,
        upsellAmount: conversation.upsellAmount || null,
        upsell2Purchased: conversation.upsell2Purchased || false,
        upsell2Amount: conversation.upsell2Amount || null,
      });
    } catch (error) {
      logger.error("Get order details error:", error);
      return res.status(500).json({ error: "Failed to get order details" });
    }
  });

  // Verify and confirm fallback upsell purchase (server-side Stripe verification)
  app.post(
    "/api/upsell/confirm-fallback",
    async (req: Request, res: Response) => {
      logger.info("=== CONFIRM-FALLBACK ENDPOINT CALLED ===");
      logger.info("Request body:", JSON.stringify(req.body));

      try {
        const { originalSessionId, fallbackSessionId } = req.body;

        if (!originalSessionId) {
          logger.info("Missing originalSessionId");
          return res.status(400).json({ error: "Missing originalSessionId" });
        }

        // If no Stripe, just mark as purchased (dev mode)
        if (!stripe) {
          logger.info("No Stripe configured - dev mode");
          await markUpsellPurchased(
            originalSessionId,
            "fallback_checkout_dev",
            4700,
          );
          return res.json({ success: true });
        }

        // If we have a fallback session ID, verify the payment completed
        if (fallbackSessionId) {
          logger.info(`Retrieving Stripe session: ${fallbackSessionId}`);

          // Retrieve the session - shipping_details is not expandable, it's included by default
          const session =
            await stripe.checkout.sessions.retrieve(fallbackSessionId);

          logger.info("Session payment_status:", session.payment_status);
          logger.info("Session metadata:", JSON.stringify(session.metadata));

          if (session.payment_status !== "paid") {
            logger.info("Payment not completed");
            return res.status(400).json({ error: "Payment not completed" });
          }

          // Verify this session is for protection ritual product
          if (session.metadata?.product !== "protection_ritual") {
            logger.info("Invalid session - wrong product metadata");
            return res.status(400).json({ error: "Invalid session" });
          }

          // Verify session is tied to the original checkout session
          if (session.metadata?.originalSession !== originalSessionId) {
            logger.info(
              `Session mismatch: expected ${originalSessionId}, got ${session.metadata?.originalSession}`,
            );
            return res.status(400).json({ error: "Session mismatch" });
          }

          // Mark upsell as purchased in DB
          logger.info(
            `Marking upsell purchased for session ${originalSessionId}, payment ${session.payment_intent}`,
          );
          await markUpsellPurchased(
            originalSessionId,
            session.payment_intent as string,
            4700,
          );
          logger.info("markUpsellPurchased completed");

          // Save shipping address from fallback checkout to database
          // Try multiple Stripe API paths for shipping data (varies by API version)
          const sessionAny = session as any;
          logger.info(
            "Session shipping_details:",
            JSON.stringify(sessionAny.shipping_details),
          );
          logger.info(
            "Session collected_information:",
            JSON.stringify(sessionAny.collected_information),
          );
          logger.info("Session shipping:", JSON.stringify(sessionAny.shipping));

          const shippingDetails =
            sessionAny.shipping_details ||
            sessionAny.collected_information?.shipping_details ||
            sessionAny.shipping;
          logger.info(
            "Extracted shippingDetails:",
            JSON.stringify(shippingDetails),
          );

          if (shippingDetails?.address) {
            try {
              await saveShippingAddress(originalSessionId, {
                name: shippingDetails.name || "",
                line1: shippingDetails.address?.line1 || "",
                line2: shippingDetails.address?.line2 || undefined,
                city: shippingDetails.address?.city || "",
                state: shippingDetails.address?.state || "",
                postal: shippingDetails.address?.postal_code || "",
                country: shippingDetails.address?.country || "",
              });
              logger.info(
                `Saved shipping address from fallback checkout for session ${originalSessionId}`,
              );
            } catch (shippingErr) {
              logger.error(
                "Failed to save fallback shipping address:",
                shippingErr,
              );
            }
          } else {
            logger.warn(
              `No shipping details found in fallback session ${fallbackSessionId}`,
            );
          }

          // Add to AWeber upsell paid list with shipping details (non-blocking)
          // Fall back to DB conversation email if Stripe session email is null
          const upsell1Conversation =
            await getConversationByStripeSession(originalSessionId);
          const customerEmail =
            session.customer_email ||
            session.metadata?.email ||
            upsell1Conversation?.email;
          const customerName =
            session.metadata?.firstName || upsell1Conversation?.firstName;
          logger.info(
            `AWeber upsell - email: ${customerEmail}, name: ${customerName}`,
          );

          if (customerEmail) {
            addUpsellSubscriber({
              email: customerEmail,
              name: customerName,
              stripeOrderId: session.payment_intent as string,
              tags: ["seer-within-upsell"],
              shipping: shippingDetails?.address
                ? {
                    name: shippingDetails.name || "",
                    line1: shippingDetails.address?.line1 || "",
                    line2: shippingDetails.address?.line2 || "",
                    city: shippingDetails.address?.city || "",
                    state: shippingDetails.address?.state || "",
                    postal: shippingDetails.address?.postal_code || "",
                    country: shippingDetails.address?.country || "",
                  }
                : undefined,
            })
              .then(() => {
                logger.info("AWeber upsell subscriber added successfully");
              })
              .catch((err) =>
                logger.error("AWeber upsell fallback list error:", err),
              );
          } else {
            logger.info("No customer email found anywhere - skipping AWeber");
          }

          logger.info("=== CONFIRM-FALLBACK SUCCESS ===");
          return res.json({ success: true });
        }

        logger.info("Missing fallbackSessionId");
        return res.status(400).json({ error: "Missing fallbackSessionId" });
      } catch (error) {
        logger.error("Confirm fallback error:", error);
        return res.status(500).json({ error: "Failed to confirm purchase" });
      }
    },
  );

  // Upsell 1-Click Charge
  app.post("/api/upsell/charge", async (req: Request, res: Response) => {
    try {
      // Validate request body with Zod
      const parseResult = upsellChargeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const { checkoutSessionId, email, firstName } = parseResult.data;

      if (!stripe) {
        logger.warn("Stripe not configured - returning fallback");
        return res.json({ success: false, fallback: true });
      }

      const session = await stripe.checkout.sessions.retrieve(
        checkoutSessionId,
        {
          expand: ["payment_intent", "payment_intent.payment_method"],
        },
      );

      // Validate session is paid
      if (session.payment_status !== "paid") {
        logger.warn("Session not paid:", session.id, session.payment_status);
        return res.json({
          success: false,
          fallback: true,
          error: "Session not paid",
        });
      }

      // Validate session ownership - check email matches
      if (
        email &&
        session.customer_email &&
        session.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        logger.warn(
          "Session email mismatch:",
          session.customer_email,
          "vs",
          email,
        );
        return res.status(403).json({
          success: false,
          error: "Session ownership verification failed",
        });
      }

      if (!session.customer || !session.payment_intent) {
        logger.warn("Missing customer or payment intent:", session.id);
        return res.json({ success: false, fallback: true });
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

      // Validate the original payment succeeded
      if (paymentIntent.status !== "succeeded") {
        logger.warn("Original payment not succeeded:", paymentIntent.status);
        return res.json({ success: false, fallback: true });
      }

      // Get the payment method - could be string or object
      let paymentMethodId: string | null = null;
      if (typeof paymentIntent.payment_method === "string") {
        paymentMethodId = paymentIntent.payment_method;
      } else if (
        paymentIntent.payment_method &&
        typeof paymentIntent.payment_method === "object"
      ) {
        paymentMethodId = paymentIntent.payment_method.id;
      }

      if (!paymentMethodId) {
        logger.warn("No reusable payment method found");
        return res.json({ success: false, fallback: true });
      }

      const upsellPayment = await stripe.paymentIntents.create({
        amount: 4700,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: "Volcanic Stone (aka Black Lava)",
        metadata: {
          product: "protection_ritual",
          originalSession: checkoutSessionId,
        },
      });

      if (upsellPayment.status === "succeeded") {
        // Mark upsell purchased in database
        await markUpsellPurchased(checkoutSessionId, upsellPayment.id, 4700);

        // Return success immediately to user, then handle AWeber and Stripe update in background
        // This ensures fast response while shipping form submission completes
        const customerEmail = email || session.customer_email;

        // Add subscriber to AWeber upsell list immediately (without shipping — shipping
        // is added later when /api/shipping/save fires, using update_existing: true).
        // This ensures the subscriber is on the list even if the user abandons the shipping form.
        if (customerEmail) {
          addUpsellSubscriber({
            email: customerEmail,
            name: firstName,
            stripeOrderId: upsellPayment.id,
            tags: ["seer-within-upsell"],
          })
            .then(() => logger.info("1-click upsell: AWeber subscriber added (without shipping — shipping added on form submit)"))
            .catch((err) => logger.error("1-click upsell: AWeber error:", err));
        }

        return res.json({
          success: true,
          paymentIntentId: upsellPayment.id,
        });
      } else if (
        upsellPayment.status === "requires_action" ||
        upsellPayment.status === "requires_confirmation"
      ) {
        // Card requires authentication - fallback to full checkout
        logger.info("Payment requires action, falling back to checkout");
        return res.json({ success: false, fallback: true });
      } else {
        return res.json({ success: false, fallback: true });
      }
    } catch (error: any) {
      logger.error("Upsell charge error:", error?.message || error);

      // Handle Stripe-specific errors that require fallback
      const fallbackCodes = [
        "card_declined",
        "authentication_required",
        "payment_intent_unexpected_state",
        "payment_intent_authentication_failure",
      ];

      if (fallbackCodes.includes(error?.code)) {
        return res.json({ success: false, fallback: true });
      }

      return res.json({ success: false, fallback: true });
    }
  });

  // Upsell Fallback Checkout
  app.post(
    "/api/upsell/fallback-checkout",
    async (req: Request, res: Response) => {
      try {
        // Validate request body with Zod
        const parseResult = upsellFallbackSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error:
              "Invalid request: " +
              parseResult.error.errors.map((e) => e.message).join(", "),
          });
        }

        const { email, firstName, bucket, originalSessionId } =
          parseResult.data;
        const trackdeskClickId = req.body?.trackdeskClickId as string | undefined;

        if (!stripe) {
          logger.warn("Stripe not configured - returning mock URL");
          return res.json({
            url: `/welcome2?session_id=${encodeURIComponent(originalSessionId)}&fallback_session_id=mock_fallback`,
          });
        }

        const session = await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Volcanic Stone (aka Black Lava)",
                  description: "Charged black lava protection talisman",
                },
                unit_amount: 4700,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          payment_intent_data: {
            description: "Volcanic Stone (aka Black Lava)",
            metadata: {
              product: "protection_ritual",
              originalSession: originalSessionId,
              firstName,
              email,
            },
          },
          shipping_address_collection: {
            allowed_countries: ["US", "CA", "GB", "AU", "NZ", "SG"],
          },
          success_url: `${getBaseUrl(req)}/welcome2?session_id=${encodeURIComponent(originalSessionId)}&fallback_session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getBaseUrl(req)}/welcome1?session_id=${encodeURIComponent(originalSessionId)}&declined=true`,
          metadata: {
            app: "the-seer-within",
            product: "protection_ritual",
            originalSession: originalSessionId,
            firstName,
            bucket,
            ...(trackdeskClickId && { trackdeskClickId }),
          },
        });

        return res.json({ url: session.url });
      } catch (error) {
        logger.error("Fallback checkout error:", error);
        return res.status(500).json({ error: "Checkout failed" });
      }
    },
  );

  // ============================================
  // SHIPPING ROUTE
  // ============================================

  // Zod schema for shipping with session ID
  const shippingWithSessionSchema = z.object({
    sessionId: z.string().min(1),
    address: z.object({
      name: z.string().min(1),
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postal: z.string().min(1),
      country: z.string().min(1),
    }),
  });

  app.post("/api/shipping/save", async (req: Request, res: Response) => {
    try {
      // Try new schema first (sessionId-based)
      const newSchemaResult = shippingWithSessionSchema.safeParse(req.body);

      if (newSchemaResult.success) {
        const { sessionId, address } = newSchemaResult.data;

        // Save to database using session ID
        const saved = await saveShippingAddress(sessionId, address);

        if (!saved) {
          logger.error("Shipping save FAILED — 0 rows updated", { sessionId, address });
          return res.status(500).json({ error: "Failed to save shipping address — session not found" });
        }

        logger.info("Upsell shipping saved to DB:", {
          sessionId,
          address,
          createdAt: new Date().toISOString(),
        });

        // Update AWeber and Stripe with shipping data now that it's saved.
        // Uses retry to handle race condition where upsellPaymentId may not
        // be committed yet (1-click charge and shipping save can overlap).
        (async () => {
          try {
            let conversation =
              await getConversationByStripeSession(sessionId);
            if (!conversation) return;

            // If upsellPaymentId isn't set yet, retry after 2 seconds
            // (the 1-click charge may still be committing)
            if (!conversation.upsellPaymentId) {
              logger.info("Shipping save: upsellPaymentId not found, retrying in 2s...");
              await new Promise((r) => setTimeout(r, 2000));
              conversation = await getConversationByStripeSession(sessionId);
            }
            // One more retry after 3 more seconds if still missing
            if (!conversation?.upsellPaymentId) {
              logger.info("Shipping save: upsellPaymentId still not found, retrying in 3s...");
              await new Promise((r) => setTimeout(r, 3000));
              conversation = await getConversationByStripeSession(sessionId);
            }

            if (!conversation) return;

            const shippingData = {
              name: address.name,
              line1: address.line1,
              line2: address.line2 || "",
              city: address.city,
              state: address.state,
              postal: address.postal,
              country: address.country,
            };

            // Update AWeber with shipping data (update_existing: true handles dedup)
            if (
              conversation.upsellPurchased &&
              conversation.upsellPaymentId &&
              conversation.email
            ) {
              addUpsellSubscriber({
                email: conversation.email,
                name: conversation.firstName || undefined,
                stripeOrderId: conversation.upsellPaymentId,
                tags: ["seer-within-upsell", "shipping-confirmed"],
                shipping: shippingData,
              })
                .then(() => {
                  logger.info(
                    "Shipping save: AWeber upsell subscriber updated with shipping",
                  );
                })
                .catch((err) =>
                  logger.error("Shipping save: AWeber update error:", err),
                );
            }

            // Update Stripe payment intent metadata with shipping
            if (stripe && conversation.upsellPaymentId) {
              try {
                await stripe.paymentIntents.update(
                  conversation.upsellPaymentId,
                  {
                    metadata: {
                      product: "protection_ritual",
                      originalSession: sessionId,
                      shipping_name: address.name,
                      shipping_line1: address.line1,
                      shipping_line2: address.line2 || "",
                      shipping_city: address.city,
                      shipping_state: address.state,
                      shipping_postal: address.postal,
                      shipping_country: address.country,
                    },
                  },
                );
                logger.info(
                  "Shipping save: Updated Stripe payment with shipping metadata",
                );
              } catch (stripeErr) {
                logger.error(
                  "Shipping save: Failed to update Stripe metadata:",
                  stripeErr,
                );
              }
            } else {
              logger.warn("Shipping save: upsellPaymentId not found after retries — Stripe metadata not updated", { sessionId });
            }
          } catch (bgErr) {
            logger.error(
              "Shipping save: Background AWeber/Stripe update error:",
              bgErr,
            );
          }
        })();

        return res.json({ success: true });
      }

      // Fallback to legacy schema (paymentIntentId-based)
      const parseResult = shippingSaveSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const { paymentIntentId, firstName, email, address } = parseResult.data;

      logger.info("Upsell order to ship (legacy):", {
        paymentIntentId,
        firstName,
        email,
        address,
        createdAt: new Date().toISOString(),
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error("Shipping save error:", error);
      return res.status(500).json({ error: "Failed to save address" });
    }
  });

  // ============================================
  // UPSELL 2 ROUTES (Manifestation Bracelet)
  // ============================================

  app.get("/api/upsell2/user-data", async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) {
        return res.status(400).json({ error: "Missing session_id" });
      }

      const conversation = await getConversationByStripeSession(sessionId);
      if (!conversation) {
        return res.status(404).json({ error: "Session not found" });
      }

      await markUpsell2Offered(sessionId);

      return res.json({
        firstName: conversation.firstName,
        email: conversation.email,
        bucket: conversation.bucket || "love",
        concern: conversation.concern || "",
        personName: conversation.personName || "",
        upsellPurchased: conversation.upsellPurchased || false,
        hasShipping: !!conversation.shippingLine1,
        shipping: conversation.shippingLine1
          ? {
              name: conversation.shippingName,
              line1: conversation.shippingLine1,
              line2: conversation.shippingLine2,
              city: conversation.shippingCity,
              state: conversation.shippingState,
              postal: conversation.shippingPostal,
              country: conversation.shippingCountry,
            }
          : null,
      });
    } catch (error) {
      logger.error("Upsell2 user-data error:", error);
      return res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  app.post("/api/upsell2/reading", async (req: Request, res: Response) => {
    try {
      const parseResult = upsell2ReadingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const { type, userData, concern } = parseResult.data;
      const userDataForClaude = {
        firstName: userData.firstName,
        bucket: userData.bucket,
        concern: concern || userData.concern || "",
        personName: userData.personName,
      };

      let result;
      if (type === "manifest_reveal") {
        result = await generateManifestReveal(
          userDataForClaude as any,
          concern || userData.concern || "",
        );
      } else {
        result = await generateManifestPersonalize(
          userDataForClaude as any,
          concern || userData.concern || "",
        );
      }

      return res.json(result);
    } catch (error) {
      logger.error("Upsell2 reading error:", error);
      return res.status(500).json({ error: "Failed to generate reading" });
    }
  });

  app.post("/api/upsell2/charge", async (req: Request, res: Response) => {
    try {
      const parseResult = upsell2ChargeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const { checkoutSessionId, email, firstName, type } = parseResult.data;
      const amount = type === "full" ? 4700 : 3000;

      if (!stripe) {
        logger.warn("Stripe not configured - returning fallback");
        return res.json({ success: false, fallback: true });
      }

      const session = await stripe.checkout.sessions.retrieve(
        checkoutSessionId,
        {
          expand: ["payment_intent", "payment_intent.payment_method"],
        },
      );

      if (session.payment_status !== "paid") {
        logger.warn(
          "Upsell2: Session not paid:",
          session.id,
          session.payment_status,
        );
        return res.json({
          success: false,
          fallback: true,
          error: "Session not paid",
        });
      }

      if (
        email &&
        session.customer_email &&
        session.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        logger.warn(
          "Upsell2: Session email mismatch:",
          session.customer_email,
          "vs",
          email,
        );
        return res.status(403).json({
          success: false,
          error: "Session ownership verification failed",
        });
      }

      if (!session.customer || !session.payment_intent) {
        logger.warn(
          "Upsell2: Missing customer or payment intent:",
          session.id,
        );
        return res.json({ success: false, fallback: true });
      }

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;

      if (paymentIntent.status !== "succeeded") {
        logger.warn(
          "Upsell2: Original payment not succeeded:",
          paymentIntent.status,
        );
        return res.json({ success: false, fallback: true });
      }

      let paymentMethodId: string | null = null;
      if (typeof paymentIntent.payment_method === "string") {
        paymentMethodId = paymentIntent.payment_method;
      } else if (
        paymentIntent.payment_method &&
        typeof paymentIntent.payment_method === "object"
      ) {
        paymentMethodId = paymentIntent.payment_method.id;
      }

      if (!paymentMethodId) {
        logger.warn("Upsell2: No reusable payment method found");
        return res.json({ success: false, fallback: true });
      }

      const productName =
        type === "full"
          ? "Manifestation Bracelet"
          : "Manifestation Bracelet (Standard)";

      const upsell2Payment = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: productName,
        metadata: {
          product: "manifestation_bracelet",
          type,
          originalSession: checkoutSessionId,
        },
      });

      if (upsell2Payment.status === "succeeded") {
        await markUpsell2Purchased(
          checkoutSessionId,
          upsell2Payment.id,
          amount,
          type,
        );

        const customerEmail = email || session.customer_email;

        (async () => {
          try {
            // First check if shipping already exists (Path A — reused from Upsell 1)
            let conversation =
              await getConversationByStripeSession(checkoutSessionId);

            if (!conversation?.shipping2Line1 && !conversation?.shippingLine1) {
              // Path B — shipping form will be submitted separately; wait for it
              logger.info(
                "Upsell2 1-click: No shipping yet, waiting 3 seconds for form submission...",
              );
              await new Promise((resolve) => setTimeout(resolve, 3000));
              conversation =
                await getConversationByStripeSession(checkoutSessionId);
            }

            if (!conversation?.shipping2Line1 && !conversation?.shippingLine1) {
              logger.info(
                "Upsell2 1-click: Shipping still not found, retrying in 2 seconds...",
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              conversation =
                await getConversationByStripeSession(checkoutSessionId);
            }

            const hasShipping2 = !!conversation?.shipping2Line1;
            const hasShipping1 = !!conversation?.shippingLine1;

            if (hasShipping2 && conversation) {
              try {
                await stripe.paymentIntents.update(upsell2Payment.id, {
                  metadata: {
                    product: "manifestation_bracelet",
                    type,
                    originalSession: checkoutSessionId,
                    shipping_name: conversation.shipping2Name || "",
                    shipping_line1: conversation.shipping2Line1 || "",
                    shipping_line2: conversation.shipping2Line2 || "",
                    shipping_city: conversation.shipping2City || "",
                    shipping_state: conversation.shipping2State || "",
                    shipping_postal: conversation.shipping2Postal || "",
                    shipping_country: conversation.shipping2Country || "",
                  },
                });
                logger.info(
                  "Upsell2 1-click: Updated Stripe with shipping2 metadata",
                );
              } catch (stripeErr) {
                logger.error(
                  "Upsell2 1-click: Failed to update Stripe metadata:",
                  stripeErr,
                );
              }
            } else if (hasShipping1 && conversation) {
              try {
                await stripe.paymentIntents.update(upsell2Payment.id, {
                  metadata: {
                    product: "manifestation_bracelet",
                    type,
                    originalSession: checkoutSessionId,
                    shipping_name: conversation.shippingName || "",
                    shipping_line1: conversation.shippingLine1 || "",
                    shipping_line2: conversation.shippingLine2 || "",
                    shipping_city: conversation.shippingCity || "",
                    shipping_state: conversation.shippingState || "",
                    shipping_postal: conversation.shippingPostal || "",
                    shipping_country: conversation.shippingCountry || "",
                  },
                });
                logger.info(
                  "Upsell2 1-click: Updated Stripe with shipping1 metadata (reused)",
                );
              } catch (stripeErr) {
                logger.error(
                  "Upsell2 1-click: Failed to update Stripe metadata:",
                  stripeErr,
                );
              }
            }

            if (customerEmail) {
              addUpsell2Subscriber({
                email: customerEmail,
                name: firstName,
                stripeOrderId: upsell2Payment.id,
                tags: ["seer-within-upsell2", `bracelet-${type}`],
                shipping:
                  hasShipping2 && conversation
                    ? {
                        name: conversation.shipping2Name || "",
                        line1: conversation.shipping2Line1 || "",
                        line2: conversation.shipping2Line2 || "",
                        city: conversation.shipping2City || "",
                        state: conversation.shipping2State || "",
                        postal: conversation.shipping2Postal || "",
                        country: conversation.shipping2Country || "",
                      }
                    : hasShipping1 && conversation
                      ? {
                          name: conversation.shippingName || "",
                          line1: conversation.shippingLine1 || "",
                          line2: conversation.shippingLine2 || "",
                          city: conversation.shippingCity || "",
                          state: conversation.shippingState || "",
                          postal: conversation.shippingPostal || "",
                          country: conversation.shippingCountry || "",
                        }
                      : undefined,
              })
                .then(() => {
                  logger.info(
                    "Upsell2 1-click: AWeber subscriber added to list 6939683",
                  );
                })
                .catch((err) =>
                  logger.error("Upsell2 1-click: AWeber error:", err),
                );
            }
          } catch (bgErr) {
            logger.error("Upsell2 1-click: Background task error:", bgErr);
          }
        })();

        return res.json({
          success: true,
          paymentIntentId: upsell2Payment.id,
        });
      } else if (
        upsell2Payment.status === "requires_action" ||
        upsell2Payment.status === "requires_confirmation"
      ) {
        logger.info(
          "Upsell2: Payment requires action, falling back to checkout",
        );
        return res.json({ success: false, fallback: true });
      } else {
        return res.json({ success: false, fallback: true });
      }
    } catch (error: any) {
      logger.error("Upsell2 charge error:", error?.message || error);

      const fallbackCodes = [
        "card_declined",
        "authentication_required",
        "payment_intent_unexpected_state",
        "payment_intent_authentication_failure",
      ];

      if (fallbackCodes.includes(error?.code)) {
        return res.json({ success: false, fallback: true });
      }

      return res.json({ success: false, fallback: true });
    }
  });

  app.post(
    "/api/upsell2/fallback-checkout",
    async (req: Request, res: Response) => {
      try {
        const parseResult = upsell2FallbackSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            error:
              "Invalid request: " +
              parseResult.error.errors.map((e) => e.message).join(", "),
          });
        }

        const { email, firstName, bucket, originalSessionId, type } =
          parseResult.data;
        const amount = type === "full" ? 4700 : 3000;

        if (!stripe) {
          logger.warn("Stripe not configured - returning mock URL");
          return res.json({
            url: `/success?upsell2=true&session_id=${encodeURIComponent(originalSessionId)}&fallback_session_id=mock_fallback`,
          });
        }

        const productName =
          type === "full"
            ? "Manifestation Bracelet (Attuned)"
            : "Manifestation Bracelet (Standard)";

        const session = await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: productName,
                  description:
                    "Eight-stone manifestation bracelet attuned to your energy",
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          payment_intent_data: {
            description: productName,
            metadata: {
              product: "manifestation_bracelet",
              type,
              originalSession: originalSessionId,
              firstName,
              email,
            },
          },
          shipping_address_collection: {
            allowed_countries: ["US", "CA", "GB", "AU", "NZ", "SG"],
          },
          success_url: `${getBaseUrl(req)}/success?upsell2=true&session_id=${encodeURIComponent(originalSessionId)}&fallback_session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getBaseUrl(req)}/welcome2?session_id=${encodeURIComponent(originalSessionId)}&declined=true`,
          metadata: {
            app: "the-seer-within",
            product: "manifestation_bracelet",
            type,
            originalSession: originalSessionId,
            firstName,
            bucket,
          },
        });

        return res.json({ url: session.url });
      } catch (error) {
        logger.error("Upsell2 fallback checkout error:", error);
        return res.status(500).json({ error: "Checkout failed" });
      }
    },
  );

  app.post("/api/upsell2/shipping", async (req: Request, res: Response) => {
    try {
      const parseResult = shippingWithSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const { sessionId, address } = parseResult.data;

      const saved = await saveShipping2Address(sessionId, address);

      if (!saved) {
        logger.error("Upsell2 shipping save FAILED — 0 rows updated", { sessionId, address });
        return res.status(500).json({ error: "Failed to save shipping address — session not found" });
      }

      logger.info("Upsell2 bracelet shipping saved to DB:", {
        sessionId,
        address,
        createdAt: new Date().toISOString(),
      });

      // Non-blocking: Update AWeber and Stripe with shipping data now that it's saved
      (async () => {
        try {
          const conversation = await getConversationByStripeSession(sessionId);
          if (!conversation) return;

          // Update AWeber with shipping data (update_existing: true handles dedup)
          if (
            conversation.upsell2Purchased &&
            conversation.upsell2PaymentId &&
            conversation.email
          ) {
            addUpsell2Subscriber({
              email: conversation.email,
              name: conversation.firstName || undefined,
              stripeOrderId: conversation.upsell2PaymentId,
              tags: [
                "seer-within-upsell2",
                `bracelet-${conversation.upsell2Type || "full"}`,
                "shipping-confirmed",
              ],
              shipping: {
                name: address.name,
                line1: address.line1,
                line2: address.line2 || "",
                city: address.city,
                state: address.state,
                postal: address.postal,
                country: address.country,
              },
            })
              .then(() => {
                logger.info(
                  "Upsell2 shipping save: AWeber subscriber updated with shipping",
                );
              })
              .catch((err) =>
                logger.error(
                  "Upsell2 shipping save: AWeber update error:",
                  err,
                ),
              );
          }

          // Update Stripe payment intent metadata with shipping
          if (stripe && conversation.upsell2PaymentId) {
            try {
              await stripe.paymentIntents.update(
                conversation.upsell2PaymentId,
                {
                  metadata: {
                    product: "manifestation_bracelet",
                    type: conversation.upsell2Type || "full",
                    originalSession: sessionId,
                    shipping_name: address.name,
                    shipping_line1: address.line1,
                    shipping_line2: address.line2 || "",
                    shipping_city: address.city,
                    shipping_state: address.state,
                    shipping_postal: address.postal,
                    shipping_country: address.country,
                  },
                },
              );
              logger.info(
                "Upsell2 shipping save: Updated Stripe payment with shipping metadata",
              );
            } catch (stripeErr) {
              logger.error(
                "Upsell2 shipping save: Failed to update Stripe metadata:",
                stripeErr,
              );
            }
          }
        } catch (bgErr) {
          logger.error(
            "Upsell2 shipping save: Background AWeber/Stripe update error:",
            bgErr,
          );
        }
      })();

      return res.json({ success: true });
    } catch (error) {
      logger.error("Upsell2 shipping save error:", error);
      return res.status(500).json({ error: "Failed to save address" });
    }
  });

  // Verify and confirm fallback upsell2 purchase (server-side Stripe verification)
  app.post(
    "/api/upsell2/confirm-fallback",
    async (req: Request, res: Response) => {
      logger.info("=== UPSELL2 CONFIRM-FALLBACK ENDPOINT CALLED ===");
      logger.info("Request body:", JSON.stringify(req.body));

      try {
        const { originalSessionId, fallbackSessionId } = req.body;

        if (!originalSessionId) {
          logger.info("Missing originalSessionId");
          return res.status(400).json({ error: "Missing originalSessionId" });
        }

        // If no Stripe, just mark as purchased (dev mode)
        if (!stripe) {
          logger.info("No Stripe configured - dev mode");
          await markUpsell2Purchased(
            originalSessionId,
            "fallback_checkout_dev",
            4700,
            "full",
          );
          return res.json({ success: true });
        }

        if (!fallbackSessionId) {
          logger.info("Missing fallbackSessionId");
          return res.status(400).json({ error: "Missing fallbackSessionId" });
        }

        logger.info(`Retrieving Stripe session: ${fallbackSessionId}`);
        const session =
          await stripe.checkout.sessions.retrieve(fallbackSessionId);

        logger.info("Session payment_status:", session.payment_status);
        logger.info("Session metadata:", JSON.stringify(session.metadata));

        if (session.payment_status !== "paid") {
          logger.info("Payment not completed");
          return res.status(400).json({ error: "Payment not completed" });
        }

        // Verify this session is for manifestation bracelet product
        if (session.metadata?.product !== "manifestation_bracelet") {
          logger.info("Invalid session - wrong product metadata");
          return res.status(400).json({ error: "Invalid session" });
        }

        // Verify session is tied to the original checkout session
        if (session.metadata?.originalSession !== originalSessionId) {
          logger.info(
            `Session mismatch: expected ${originalSessionId}, got ${session.metadata?.originalSession}`,
          );
          return res.status(400).json({ error: "Session mismatch" });
        }

        const braceletType = session.metadata?.type || "full";
        const amount =
          session.amount_total || (braceletType === "full" ? 4700 : 3000);

        // Mark upsell2 as purchased in DB
        logger.info(
          `Marking upsell2 purchased for session ${originalSessionId}, payment ${session.payment_intent}`,
        );
        await markUpsell2Purchased(
          originalSessionId,
          session.payment_intent as string,
          amount,
          braceletType,
        );
        logger.info("markUpsell2Purchased completed");

        // Save shipping address from fallback checkout to database
        // Try multiple Stripe API paths for shipping data (varies by API version)
        const sessionAny = session as any;
        logger.info(
          "Session shipping_details:",
          JSON.stringify(sessionAny.shipping_details),
        );
        logger.info(
          "Session collected_information:",
          JSON.stringify(sessionAny.collected_information),
        );
        logger.info("Session shipping:", JSON.stringify(sessionAny.shipping));

        const shippingDetails =
          sessionAny.shipping_details ||
          sessionAny.collected_information?.shipping_details ||
          sessionAny.shipping;
        logger.info(
          "Extracted shippingDetails:",
          JSON.stringify(shippingDetails),
        );

        if (shippingDetails?.address) {
          try {
            await saveShipping2Address(originalSessionId, {
              name: shippingDetails.name || "",
              line1: shippingDetails.address?.line1 || "",
              line2: shippingDetails.address?.line2 || undefined,
              city: shippingDetails.address?.city || "",
              state: shippingDetails.address?.state || "",
              postal: shippingDetails.address?.postal_code || "",
              country: shippingDetails.address?.country || "",
            });
            logger.info(
              `Saved shipping2 address from fallback checkout for session ${originalSessionId}`,
            );
          } catch (shippingErr) {
            logger.error(
              "Failed to save fallback shipping2 address:",
              shippingErr,
            );
          }
        } else {
          logger.warn(
            `No shipping details found in fallback session ${fallbackSessionId}`,
          );
        }

        // Add to AWeber upsell2 paid list with shipping details (non-blocking)
        // Fall back to DB conversation email if Stripe session email is null
        const conversation =
          await getConversationByStripeSession(originalSessionId);
        const customerEmail =
          session.customer_email ||
          session.metadata?.email ||
          conversation?.email;
        const customerName =
          session.metadata?.firstName || conversation?.firstName;
        logger.info(
          `AWeber upsell2 - email: ${customerEmail}, name: ${customerName}`,
        );

        if (customerEmail) {
          addUpsell2Subscriber({
            email: customerEmail,
            name: customerName,
            stripeOrderId: session.payment_intent as string,
            tags: ["seer-within-upsell2", `bracelet-${braceletType}`],
            shipping: shippingDetails?.address
              ? {
                  name: shippingDetails.name || "",
                  line1: shippingDetails.address?.line1 || "",
                  line2: shippingDetails.address?.line2 || "",
                  city: shippingDetails.address?.city || "",
                  state: shippingDetails.address?.state || "",
                  postal: shippingDetails.address?.postal_code || "",
                  country: shippingDetails.address?.country || "",
                }
              : undefined,
          })
            .then(() => {
              logger.info("AWeber upsell2 subscriber added successfully");
            })
            .catch((err) =>
              logger.error("AWeber upsell2 fallback list error:", err),
            );
        } else {
          logger.info("No customer email found anywhere - skipping AWeber");
        }

        logger.info("=== UPSELL2 CONFIRM-FALLBACK SUCCESS ===");
        return res.json({ success: true });
      } catch (error) {
        logger.error("Upsell2 confirm fallback error:", error);
        return res.status(500).json({ error: "Failed to confirm purchase" });
      }
    },
  );

  // ============================================
  // FACEBOOK CONVERSIONS API
  // ============================================

  const fbEventSchema = z.object({
    eventName: z.string().min(1),
    eventId: z.string().min(1),
    eventSourceUrl: z.string().optional(),
    userAgent: z.string().optional(),
    fbc: z.string().optional(),
    fbp: z.string().optional(),
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    value: z.number().optional(),
    currency: z.string().optional(),
    content_name: z.string().optional(),
  });

  app.post("/api/fb-event", async (req: Request, res: Response) => {
    try {
      const parseResult = fbEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error:
            "Invalid request: " +
            parseResult.error.errors.map((e) => e.message).join(", "),
        });
      }

      const {
        eventName,
        eventId,
        eventSourceUrl,
        userAgent,
        fbc,
        fbp,
        email,
        firstName,
        value,
        currency,
        content_name,
      } = parseResult.data;

      const forwarded = req.headers["x-forwarded-for"];
      const clientIpAddress =
        typeof forwarded === "string"
          ? forwarded.split(",")[0]?.trim()
          : req.socket.remoteAddress || undefined;

      const result = await sendFacebookEvent({
        eventName,
        eventId,
        eventSourceUrl,
        value,
        currency,
        contentName: content_name,
        userData: {
          email,
          firstName,
          userAgent,
          clientIpAddress,
          fbc,
          fbp,
        },
      });

      return res.json(result);
    } catch (error) {
      logger.error("FB event error:", error);
      return res.status(500).json({ error: "Failed to send event" });
    }
  });

  return httpServer;
}
