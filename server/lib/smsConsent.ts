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
import type Stripe from "stripe";
import type { FunnelParam } from "@shared/funnelConfig";
import type { ReadDevice } from "@shared/readDevices";
import { collectsPhoneAtCheckout } from "./checkoutPhone";

// Stripe custom-field key. Alphanumeric only (Stripe rule).
export const SMS_CONSENT_FIELD_KEY = "smsconsent";

// Bump this whenever ANY customer-facing wording below changes, so each stored
// record says which wording that buyer actually saw.
export const SMS_CONSENT_VERSION = "2026-10-01-v1";

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
    `Consent is not a condition of purchase. Msg frequency varies. Msg & data rates may apply. ` +
    `Reply STOP to cancel, HELP for help. ` +
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
