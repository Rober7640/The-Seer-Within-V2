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

export function skipEmail(search?: string): boolean {
  if (typeof window === "undefined") return false;
  const p = new URLSearchParams(search ?? window.location.search);
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

// Prefix a V1 path with the active funnel's prefix when the user is in an ad
// funnel, otherwise leave it alone. Use for in-funnel navigation so the user
// stays inside their own funnel for the entire flow.
export function funnelPath(v1Path: string, pathname?: string): string {
  const def = funnelDefForPath(pathname ?? currentPath());
  if (!def) return v1Path;
  if (v1Path === "/") return def.prefix;
  return `${def.prefix}${v1Path}`;
}

// ─── PostHog funnel helpers (Option B naming) ──────────────────────────────
// Same path → funnel decision logic, returns the PostHog `funnel` property
// value used across Phase 1 (soulmate) and Phase 2 (v1, fb, fb2, gdn, evelyn,
// aiden). Kept separate from currentFunnel() because the backend depends on
// its "v1-fb" | "v1-fb2" | "v1-gdn" | undefined contract.

export type PostHogFunnel = "soulmate" | "fb" | "fb2" | "gdn" | "palm" | "v1" | "evelyn" | "aiden";

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
    case "palm": {
      // Compute the step relative to the funnel's URL prefix so /fb, /fb2, /gdn
      // and /fb-palm share one mapping (e.g. /fb2/welcome1 → upsell1). For palm
      // the prefix root is the bridge lander → "landing".
      const def = funnelDefForPath(p);
      const sub = def ? p.slice(def.prefix.length) : "";
      // "" = the funnel landing; "/b" & "/c" = the palm Version-B/C bridge landings.
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
  }
}
