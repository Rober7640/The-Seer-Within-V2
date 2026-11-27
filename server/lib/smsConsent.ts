// SMS consent at checkout — the optional "Can we text you?" question on the main
// Stripe Checkout (main $35 and downsell $25, both via /api/checkout).
//
// WHY. Joel wants texts that bring V1 buyers into the V2 chat (1 Oct 2026). A
// compulsory phone field is NOT consent to marketing texts: Twilio will not
// approve the sender (10DLC campaign or toll-free verification) without a clean
// opt-in, and US law (TCPA) requires express written consent for automated
// marketing texts. So the buyer gets a separate, optional, unanswered-by-default
// question, with the standard disclosure beside it. Saying nothing — or "No" —
// buys exactly as before and gets no texts.
//
// WHAT STRIPE ALLOWS. Checkout has no tickbox for this: the only option is a
// custom field (text / numeric / dropdown). We use an OPTIONAL DROPDOWN with no
// default, so nothing is pre-selected. The disclosure goes in custom_text.submit,
// which renders directly above the Pay button (markdown links allowed, 1200 chars).
//
// 🔴 OFF BY DEFAULT. Shown only on funnels listed in the SMS_CONSENT_FUNNELS env
// var (comma-separated FunnelParams, plus "root" for the no-funnel root funnel).
// Unset = no funnel shows it, so this code is inert on any server that doesn't set
// the var — including Production if the branch is ever merged before go-live.
// It also only ever shows where the phone is collected (checkoutPhone.ts): consent
// without a number is meaningless.
//
// THE RECORD. The webhook writes one sms_consents row per paid order that was
// shown the question (yes OR no), with the exact wording shown, its version, the
// buyer's IP at checkout and the conversation id — Joel's consent table. Stripe
// also keeps the answer on the session itself (Dashboard → payment → custom fields).
import { localeDef } from "@shared/locales";
import { requestLocale } from "./locale";
import type Stripe from "stripe";
import type { FunnelParam } from "@shared/funnelConfig";
import type { ReadDevice } from "@shared/readDevices";
import { collectsPhoneAtCheckout } from "./checkoutPhone";

// Stripe custom-field key. Alphanumeric only (Stripe rule).
export const SMS_CONSENT_FIELD_KEY = "smsconsent";

// Bump this whenever ANY customer-facing wording below changes, so each stored
// record says which wording that buyer actually saw.
export const SMS_CONSENT_VERSION = "2026-10-08-v2";

// Brand as it appears on the website and in the policies. Twilio's reviewers
// check that the brand in the opt-in, the policies and the texts all match.
export const SMS_BRAND = "The Seer Within";

// Stripe caps a custom label at 50 characters. Stripe adds its own "Optional" tag.
export const SMS_CONSENT_LABEL = `Get texts from ${SMS_BRAND}?`;

export const SMS_CONSENT_YES_LABEL = "Yes, text me";
export const SMS_CONSENT_NO_LABEL = "No, thanks";

// The standard US disclosure (CTIA / Twilio): who is texting, that it is recurring
// automated marketing, consent is not a condition of purchase, frequency, cost,
// STOP + HELP, and links to the terms and the privacy policy.
export function smsConsentDisclosure(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return (
    `**Text messages (optional):** By choosing "${SMS_CONSENT_YES_LABEL}" above, you agree to receive ` +
    `recurring automated marketing text messages from ${SMS_BRAND} at the phone number provided. ` +
    `Consent is not a condition of purchase. Up to 3 msgs/week. Msg & data rates may apply. ` +
    `Reply STOP to opt out, HELP for help. ` +
    `[Terms](${base}/terms) · [Privacy Policy](${base}/privacy)`
  );
}

// The full wording a buyer saw, stored on her consent record.
export function smsConsentRecordText(baseUrl: string): string {
  return (
    `${SMS_CONSENT_LABEL} [${SMS_CONSENT_YES_LABEL} / ${SMS_CONSENT_NO_LABEL}] — ` +
    smsConsentDisclosure(baseUrl)
  );
}

// "v1-read,root" → Set. Unknown tokens are ignored (a typo never turns it on
// somewhere unexpected — it just doesn't turn it on).
export function parseSmsConsentFunnels(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// 🔴 /fb-read carries three landers (tea, coffee, dream) on ONE funnel key, so the
// env switch alone can't tell them apart. Lewis, 7 Oct 2026: the question goes on
// the tea + coffee landers ONLY. A v1-read checkout with any other device — or none
// — never shows it. Fixed in code on purpose: an env typo can't widen it.
export const SMS_CONSENT_READ_DEVICES: ReadonlySet<ReadDevice> = new Set<ReadDevice>(["tea", "coffee"]);

export function showsSmsConsent(
  funnel: FunnelParam | undefined,
  readDevice: ReadDevice | undefined,
  enabled: Set<string> = parseSmsConsentFunnels(process.env.SMS_CONSENT_FUNNELS),
): boolean {
  // The SMS program is a US number under US rules (TCPA wording, carrier rates).
  // A session in another market never sees it. English sessions are US: unchanged.
  if (localeDef(requestLocale()).market.country !== "US") return false;
  if (!collectsPhoneAtCheckout(funnel)) return false;
  if (funnel === "v1-read" && !(readDevice && SMS_CONSENT_READ_DEVICES.has(readDevice))) return false;
  return enabled.has(funnel ?? "root");
}

// Spread into stripe.checkout.sessions.create. Empty object when not shown, so
// the session is byte-identical to before for every other funnel.
export function smsConsentSessionParams(
  funnel: FunnelParam | undefined,
  readDevice: ReadDevice | undefined,
  baseUrl: string,
  enabled?: Set<string>,
): Pick<Stripe.Checkout.SessionCreateParams, "custom_fields" | "custom_text"> {
  if (!smsConsentCheckoutEnabled()) return {};
  if (!showsSmsConsent(funnel, readDevice, enabled)) return {};
  return {
    custom_fields: [
      {
        key: SMS_CONSENT_FIELD_KEY,
        label: { type: "custom", custom: SMS_CONSENT_LABEL },
        type: "dropdown",
        optional: true,
        // No default_value: nothing is pre-selected. A pre-filled "Yes" is not consent.
        dropdown: {
          options: [
            { label: SMS_CONSENT_YES_LABEL, value: "yes" },
            { label: SMS_CONSENT_NO_LABEL, value: "no" },
          ],
        },
      },
    ],
    custom_text: {
      submit: { message: smsConsentDisclosure(baseUrl) },
    },
  };
}

// Session metadata stamped alongside the question, so the webhook can tell
// "shown and skipped" (record a no) from "never shown" (record nothing), and can
// rebuild the EXACT wording shown (version + the site address in its links) and
// store the buyer's IP.
export function smsConsentSessionMetadata(
  funnel: FunnelParam | undefined,
  readDevice: ReadDevice | undefined,
  baseUrl: string,
  ip: string | undefined,
  enabled?: Set<string>,
): Record<string, string> {
  if (!smsConsentCheckoutEnabled()) return {};
  if (!showsSmsConsent(funnel, readDevice, enabled)) return {};
  return {
    smsConsentVersion: SMS_CONSENT_VERSION,
    smsConsentBase: baseUrl.slice(0, 200),
    ...(ip && { smsConsentIp: ip.slice(0, 64) }),
  };
}

// true = she chose "Yes"; false = shown but "No" or left blank; null = never shown.
export function readSmsConsent(session: Pick<Stripe.Checkout.Session, "custom_fields" | "metadata">): boolean | null {
  if (!session.metadata?.smsConsentVersion) return null;
  const field = (session.custom_fields ?? []).find((f) => f.key === SMS_CONSENT_FIELD_KEY);
  return field?.dropdown?.value === "yes";
}

// ── STANDALONE POST-PURCHASE OPT-IN (2026-11-02) ─────────────────────────────
//
// WHY. Twilio rejected the toll-free verification on 28 Oct (30446): a consent
// question inside the checkout counts as BUNDLED with the purchase. Twilio
// compliance (Judy, 29 Oct) approved this replacement: a SEPARATE step after
// payment, with its own phone box, an UNTICKED checkbox, the full disclosure and
// its own "Text me" button that has nothing to do with the purchase.
//
// So on the funnels/landers where the checkout question used to show, it no longer
// does: smsConsentCheckoutEnabled() is false, the Stripe session carries no consent
// field, and the webhook (readSmsConsent ⇒ null) writes nothing. The opt-in lives on
// the thank-you page instead and writes its own record (source below) ONLY when she
// ticks the box and presses the button — no record is a "no".
//
// SAME SWITCH as before: SMS_CONSENT_FUNNELS + the tea/coffee lock above. Unset = off.

/** Checkout dropdown retired in favour of the standalone opt-in (Twilio 30446). */
export function smsConsentCheckoutEnabled(): boolean {
  return false;
}

export const SMS_OPTIN_VERSION = "2026-11-02-standalone-v1";
export const SMS_OPTIN_SOURCE = "post_purchase_optin";
export const SMS_OPTIN_HEADING = `Would you like text messages from ${SMS_BRAND}?`;
export const SMS_OPTIN_CHECKBOX_LABEL = `Yes, send me marketing and promotional text messages from ${SMS_BRAND}`;
export const SMS_OPTIN_BUTTON_LABEL = "Text me";

/** The disclosure as shown beside the box (the page adds the Terms + Privacy links). */
export const SMS_OPTIN_DISCLOSURE_BODY =
  `By ticking the box and pressing "${SMS_OPTIN_BUTTON_LABEL}", you agree to receive recurring automated ` +
  `marketing and promotional text messages from ${SMS_BRAND} at the number above. ` +
  `This is optional and separate from your purchase — consent is not a condition of any purchase. ` +
  `Up to 3 msgs/week. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`;

export function smsOptInDisclosure(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${SMS_OPTIN_DISCLOSURE_BODY} Terms: ${base}/terms · Privacy Policy: ${base}/privacy`;
}

/** The exact wording stored on her record. */
export function smsOptInRecordText(baseUrl: string): string {
  return `${SMS_OPTIN_HEADING} [checkbox, unticked by default] ${SMS_OPTIN_CHECKBOX_LABEL} [button] ${SMS_OPTIN_BUTTON_LABEL} — ${smsOptInDisclosure(baseUrl)}`;
}

/** Same funnels + landers the checkout question covered. */
export function showsPostPurchaseSmsOptIn(
  funnel: FunnelParam | undefined,
  readDevice: ReadDevice | undefined,
  enabled?: Set<string>,
): boolean {
  return showsSmsConsent(funnel, readDevice, enabled);
}

/**
 * The number she typed ⇒ E.164, or null. US/Canada 10 digits (optionally with a
 * leading 1) become +1…; anything typed with a leading + keeps its country code
 * (8–15 digits). Everything else is refused rather than guessed.
 */
export function normalizeOptInPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 30) return null;
  if (/[^\d\s()+.\-]/.test(s)) return null;
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
