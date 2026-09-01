// Helpers for the parallel V1-style ad funnels mounted at a URL prefix.
// V1 (email traffic) lives at /, /chat, /welcome1, /welcome2, /success.
// V1-FB (/fb), V1-FB2 (/fb2), and V1-GDN (/gdn) mirror the same components at
// their prefix so each ad platform can segment Lead/IC/Purchase/Upsell by URL
// and Stripe products carry a per-funnel suffix ("- FB" / "- FB2" / "- GDN")
// for finance-side attribution.
//
// Funnel definitions (prefix, product suffix, PostHog name, etc.) live in
// shared/funnelConfig.ts so the client + server agree.

import { funnelDefForPath, type FunnelParam } from "@shared/funnelConfig";

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

// True when the current path belongs to a Facebook-pixel-driven ad funnel
// (/fb or /fb2). Gates Facebook-Pixel-specific behavior (e.g. the "Upsell2"
// event name) that must NOT fire for the Google /gdn funnel.
export function isFbFunnel(pathname?: string): boolean {
  const def = funnelDefForPath(pathname ?? currentPath());
  return def?.param === "v1-fb" || def?.param === "v1-fb2";
}

// Returns the funnel identifier to send to the backend (or undefined to leave
// V1 requests byte-identical to today).
export function currentFunnel(pathname?: string): FunnelParam | undefined {
  return funnelDefForPath(pathname ?? currentPath())?.param;
}

// Email-gate toggle. `?noemail=1` on ANY funnel link skips the in-chat email
// capture and routes straight into the reading. Orthogonal to the funnel, so
// it works on every current + future funnel URL with no duplication. `=0`
// (or absent) keeps today's email-required behavior.
//
// Stickiness: the URL param wins and is persisted for the tab so the arm
// survives a refresh or the welcome-back restore (when the param is no longer
// on the URL). We use sessionStorage, not localStorage, so the no-email arm is
// scoped to this tab/visit and can never leak into a later, unrelated visit on
// the same browser — keeping every other funnel byte-identical for normal
// traffic.
const NOEMAIL_KEY = "seer_noemail";

/**
 * Query params off a URL that may have arrived through an EMAIL.
 *
 * 🔴 WHY THIS IS NOT JUST `new URLSearchParams(location.search)`. In HTML mail an
 * `&` inside an href is correctly written as the entity `&amp;`. A browser decodes
 * that when it follows the link, so a genuine click is fine — but the entity
 * survives whenever the raw href is copied out of the message, and whenever a
 * client renders a plain-text part. The query then parses with the entity glued to
 * the NEXT parameter's name: `?resume=<id>&amp;src=recovery` yields `resume` plus a
 * param literally called `amp;src`, so `get("src")` is null and everything keyed on
 * it silently does nothing.
 *
 * That is not hypothetical — it is exactly how the first live test of the recovery
 * marker came back unmarked (2026-08-17): the reading resumed perfectly, because
 * `resume` happens to come FIRST and is therefore the one parameter the mangling
 * cannot reach. Any param after it is exposed, and `resume` itself would be exposed
 * the moment anything is prepended to the query.
 *
 * Undoing the entity first costs nothing on a well-formed URL and makes every
 * caller tolerant of it.
 */
export function linkParams(search?: string): URLSearchParams {
  const raw = search ?? (typeof window === "undefined" ? "" : window.location.search);
  return new URLSearchParams(raw.replace(/&amp;/gi, "&"));
}

export function skipEmail(search?: string): boolean {
  if (typeof window === "undefined") return false;
  const p = linkParams(search);
  if (p.has("noemail")) {
    const on = p.get("noemail") !== "0";
    try {
      if (on) window.sessionStorage.setItem(NOEMAIL_KEY, "1");
      else window.sessionStorage.removeItem(NOEMAIL_KEY);
    } catch {
      /* sessionStorage unavailable (private mode) — fall back to URL only */
    }
    return on;
  }
  // Param absent → honor the choice made earlier in this tab session.
  try {
    return window.sessionStorage.getItem(NOEMAIL_KEY) === "1";
  } catch {
    return false;
  }
}

// ─── The backend deck's offers ─────────────────────────────────────────────
// NOT entries in shared/funnelConfig.ts, deliberately. That file drives the
// Stripe product suffix, the AWeber tag and the `funnel` param the client
// sends to the charge endpoints — and no backend offer has its own Stripe yet,
// with their bump identifiers still owed (00h "NOT built"). Registering one
// there would quietly attach it to V1's money paths. These prefixes are
// client-side URL knowledge only: which copy the shared upsell components run,
// and where /welcome1 hands off to next.
//
// The copy each prefix resolves to lives in lib/backendOffers.ts. This file
// deliberately holds no copy, so routing can never depend on it.
export const TWIN_FLAME_PREFIX = "/tarot/twin-flame"; // 02 Twin Flame Tarot
export const JUDGEMENT_PREFIX = "/wiccan/judgement-day"; // 03 Judgement Day

export const BACKEND_OFFER_PREFIXES = [
  TWIN_FLAME_PREFIX,
  JUDGEMENT_PREFIX,
] as const;

// The prefix the path belongs to, or null for V1 and the ad funnels.
export function backendOfferPrefix(pathname?: string): string | null {
  const p = pathname ?? currentPath();
  return (
    BACKEND_OFFER_PREFIXES.find(
      (prefix) => p === prefix || p.startsWith(`${prefix}/`),
    ) ?? null
  );
}

export function isBackendOffer(pathname?: string): boolean {
  return backendOfferPrefix(pathname) !== null;
}

export function isTwinFlameOffer(pathname?: string): boolean {
  return backendOfferPrefix(pathname) === TWIN_FLAME_PREFIX;
}

export function isJudgementOffer(pathname?: string): boolean {
  return backendOfferPrefix(pathname) === JUDGEMENT_PREFIX;
}

// ─── Her first name, carried down from the letter ──────────────────────────
// She arrives from an AWeber letter, and AWeber knows her name. The letter's
// CTA carries it as `?fn=`, the booking page keeps it for the tab, and checkout
// will send it on as Stripe `metadata.firstName` — which is the difference
// between "Thank you, Sarah" and "Thank you, Friend" on every screen after the
// money. `displayName()` stays as the safety net for a forwarded letter.
//
// sessionStorage, not localStorage, and for the same reason as the no-email
// arm: a name belongs to this visit and must never leak into a later, unrelated
// one on the same browser.
const FIRST_NAME_KEY = "seer_fn";

// Names have spaces and apostrophes, so the letter URL-encodes it and
// URLSearchParams decodes it back. Anything absurdly long is somebody playing
// with the query string, not a name.
const MAX_FIRST_NAME = 40;

export function bookingFirstName(search?: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(search ?? window.location.search).get("fn");
  if (raw !== null) {
    const name = raw.trim().slice(0, MAX_FIRST_NAME);
    try {
      if (name) window.sessionStorage.setItem(FIRST_NAME_KEY, name);
      else window.sessionStorage.removeItem(FIRST_NAME_KEY);
    } catch {
      /* sessionStorage unavailable (private mode) — fall back to URL only */
    }
    return name || null;
  }
  // Param absent → the name this tab already arrived with, if any.
  try {
    return window.sessionStorage.getItem(FIRST_NAME_KEY) || null;
  } catch {
    return null;
  }
}

// Prefix a V1 path with the active funnel's prefix when the user is in an ad
// funnel, otherwise leave it alone. Use for in-funnel navigation so the user
// stays inside their own funnel for the entire flow.
export function funnelPath(v1Path: string, pathname?: string): string {
  const path = pathname ?? currentPath();
  const def = funnelDefForPath(path);
  if (def) {
    if (v1Path === "/") return def.prefix;
    return `${def.prefix}${v1Path}`;
  }
  // A backend offer mounts only the two upsell steps and its thank-you page
  // under its prefix. Without this, /tarot/twin-flame/welcome1 would hand off
  // to V1's /welcome2 and the buyer would drop out of the offer's copy
  // mid-flow.
  //
  // ⚠ "/" is deliberately NOT in this list: no backend offer has a lander,
  // because the buyer arrives from an email letter. It still falls through to
  // V1's.
  const offerPrefix = backendOfferPrefix(path);
  if (
    offerPrefix &&
    (v1Path === "/welcome1" || v1Path === "/welcome2" || v1Path === "/success")
  ) {
    return `${offerPrefix}${v1Path}`;
  }
  return v1Path;
}

// ─── PostHog funnel helpers (Option B naming) ──────────────────────────────
// Same path → funnel decision logic, returns the PostHog `funnel` property
// value used across Phase 1 (soulmate) and Phase 2 (v1, fb, fb2, gdn, evelyn,
// aiden). Kept separate from currentFunnel() because the backend depends on
// its "v1-fb" | "v1-fb2" | "v1-gdn" | undefined contract.

export type PostHogFunnel =
  | "soulmate" | "fb" | "fb2" | "gdn" | "palm" | "tarot" | "read" | "v1" | "evelyn" | "aiden"
  | "marcus" | "luna" | "nova" | "maren" | "seven-seven";

// Generalized persona landers → their PostHog funnel name. One route each.
const PERSONA_LANDER_FUNNELS: Record<string, PostHogFunnel> = {
  "/marcus": "marcus",
  "/luna": "luna",
  "/nova": "nova",
  "/maren": "maren",
};

// Strip query, hash, trailing slash, lowercase. Mirrors the fix in 83fa6a5
// so URL variants like /evelyn/ or /aiden?utm=x don't drop to "unknown".
function normalize(path: string): string {
  return (path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/").toLowerCase();
}

export function getPostHogFunnel(pathname?: string): PostHogFunnel | null {
  const p = normalize(pathname ?? currentPath());
  if (p === "/soulmate" || p.startsWith("/soulmate/")) return "soulmate";
  const adDef = funnelDefForPath(p);
  if (adDef) return adDef.posthog as PostHogFunnel;
  if (p === "/evelyn" || p.startsWith("/evelyn/")) return "evelyn";
  if (p === "/aiden" || p.startsWith("/aiden/")) return "aiden";
  // 7/7 promo lander (email traffic, e.g. AWeber blast with utm_source=aweber).
  // Registering it here is all that's needed for App.tsx to fire `lander_view`
  // with the URL's utm_source/campaign/medium attached.
  if (p === "/7-7") return "seven-seven";
  if (PERSONA_LANDER_FUNNELS[p]) return PERSONA_LANDER_FUNNELS[p];
  if (p === "/" || p === "/chat" || p === "/welcome1" || p === "/welcome2" || p === "/success") {
    return "v1";
  }
  return null;
}

export function getPostHogStep(pathname?: string): string {
  const p = normalize(pathname ?? currentPath());
  const funnel = getPostHogFunnel(p);
  if (!funnel) return "unknown";

  switch (funnel) {
    case "soulmate":
      if (p === "/soulmate") return "landing";
      if (p === "/soulmate/process") return "process";
      if (p === "/soulmate/reading") return "sales";
      if (p === "/soulmate/gift") return "upsell1";
      if (p === "/soulmate/gift2") return "upsell2";
      if (p === "/soulmate/thank-you") return "thank_you";
      return "unknown";
    case "v1":
      if (p === "/") return "landing";
      if (p === "/chat") return "chat";
      if (p === "/welcome1") return "upsell1";
      if (p === "/welcome2") return "upsell2";
      if (p === "/success") return "thank_you";
      return "unknown";
    case "fb":
    case "fb2":
    case "gdn":
    case "palm":
    case "read":
    case "tarot": {
      // Compute the step relative to the funnel's URL prefix so /fb, /fb2, /gdn,
      // /fb-palm and /fb-tarot share one mapping (e.g. /fb2/welcome1 → upsell1).
      // For the palm + tarot bridges the prefix root is the bridge lander → "landing".
      const def = funnelDefForPath(p);
      const sub = def ? p.slice(def.prefix.length) : "";
      // "" = the funnel landing; "/b" & "/c" = the bridge Version-B/C landings.
      if (sub === "" || sub === "/b" || sub === "/c") return "landing";
      if (sub === "/chat") return "chat";
      if (sub === "/welcome1") return "upsell1";
      if (sub === "/welcome2") return "upsell2";
      if (sub === "/success") return "thank_you";
      return "unknown";
    }
    case "evelyn":
      return "landing";
    case "aiden":
      return "landing";
    case "marcus":
    case "luna":
    case "nova":
    case "maren":
      return "landing";
    case "seven-seven":
      return "landing";
  }
}
