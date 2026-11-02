// Standalone post-purchase SMS opt-in — the Twilio 30446 fix (see server/lib/smsConsent.ts).
//
//   GET  /api/sms-optin/status?session_id=cs_…  → should the thank-you page show the box?
//   POST /api/sms-optin  { sessionId, phone, agree: true } → record her YES.
//
// Shown ONLY after a PAID Stripe checkout on a switched-on funnel/lander (same
// SMS_CONSENT_FUNNELS switch + tea/coffee lock as the old checkout question). The
// funnel and lander are read from the Stripe session itself, never from the browser.
// Nothing here touches the purchase: no charge, no order row, no upsell.

import { Router, type Request, type Response, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type Stripe from "stripe";
import { funnelDefForParam, type FunnelParam } from "@shared/funnelConfig";
import { isReadDevice, type ReadDevice } from "@shared/readDevices";
import {
  SMS_OPTIN_BUTTON_LABEL,
  SMS_OPTIN_CHECKBOX_LABEL,
  SMS_OPTIN_DISCLOSURE_BODY,
  SMS_OPTIN_HEADING,
  SMS_OPTIN_SOURCE,
  SMS_OPTIN_VERSION,
  normalizeOptInPhone,
  showsPostPurchaseSmsOptIn,
  smsOptInRecordText,
} from "../lib/smsConsent";
import logger from "../lib/logger";

type PaidSession = Pick<Stripe.Checkout.Session, "id" | "payment_status" | "metadata" | "customer_details">;

export interface SmsOptInDeps {
  retrieveSession(sessionId: string): Promise<PaidSession>;
  upsertOptIn: typeof import("../lib/db").upsertSmsOptIn;
  getConsent: typeof import("../lib/db").getSmsConsentForSession;
  /** Public site address for the Terms / Privacy links. */
  policyBase(req: Request): string;
  /** Feature switch override for tests; default = SMS_CONSENT_FUNNELS env. */
  enabled?: () => Set<string> | undefined;
  now?: () => Date;
}

const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function sessionFunnel(s: PaidSession): FunnelParam | undefined {
  return funnelDefForParam(s.metadata?.funnel)?.param;
}
function sessionDevice(s: PaidSession): ReadDevice | undefined {
  const v = s.metadata?.readDevice;
  return isReadDevice(v) ? v : undefined;
}

export function createSmsOptInRouter(deps: SmsOptInDeps): Router {
  const router = Router();
  const now = deps.now ?? (() => new Date());
  const isTestEnv = process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true";
  const limiter: RequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv,
  });

  // Eligible = real paid session on a switched-on funnel/lander. Anything else ⇒ null.
  async function eligibleSession(sessionId: unknown): Promise<PaidSession | null> {
    if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) return null;
    let s: PaidSession;
    try {
      s = await deps.retrieveSession(sessionId);
    } catch {
      return null;
    }
    if (s.payment_status !== "paid") return null;
    if (!showsPostPurchaseSmsOptIn(sessionFunnel(s), sessionDevice(s), deps.enabled?.())) return null;
    return s;
  }

  router.get("/status", async (req: Request, res: Response) => {
    try {
      const s = await eligibleSession(req.query.session_id);
      if (!s) return res.json({ show: false });
      const base = deps.policyBase(req).replace(/\/+$/, "");
      const existing = await deps.getConsent(s.id).catch(() => null);
      res.json({
        show: true,
        heading: SMS_OPTIN_HEADING,
        checkboxLabel: SMS_OPTIN_CHECKBOX_LABEL,
        buttonLabel: SMS_OPTIN_BUTTON_LABEL,
        disclosure: SMS_OPTIN_DISCLOSURE_BODY,
        termsUrl: `${base}/terms`,
        privacyUrl: `${base}/privacy`,
        alreadyOptedIn: !!(existing?.consented && !existing.optedOutAt),
      });
    } catch (err) {
      logger.error("sms-optin status error:", err);
      res.json({ show: false });
    }
  });

  router.post("/", limiter, async (req: Request, res: Response) => {
    const { sessionId, phone, agree } = req.body ?? {};
    // Consent must be an explicit tick. Anything but literal true is refused.
    if (agree !== true) return res.status(400).json({ error: "Please tick the box to agree." });
    const e164 = normalizeOptInPhone(phone);
    if (!e164) return res.status(400).json({ error: "Please enter a valid mobile number." });
    try {
      const s = await eligibleSession(sessionId);
      if (!s) return res.status(404).json({ error: "This offer isn't available." });
      const base = deps.policyBase(req).replace(/\/+$/, "");
      const ip = req.ip || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
      const result = await deps.upsertOptIn({
        stripeSessionId: s.id,
        email: s.customer_details?.email ?? null,
        phone: e164,
        consentText: smsOptInRecordText(base),
        consentVersion: SMS_OPTIN_VERSION,
        ip: ip ? ip.slice(0, 64) : null,
        funnel: sessionFunnel(s) ?? "root",
        source: SMS_OPTIN_SOURCE,
        consentedAt: now(),
      });
      if (result === "conflict") return res.status(409).json({ error: "We already have your answer for this order." });
      res.json({ ok: true });
    } catch (err) {
      logger.error("sms-optin save error:", err);
      res.status(500).json({ error: "Sorry, that didn't save. Please try again." });
    }
  });

  return router;
}
