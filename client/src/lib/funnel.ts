// Helpers for the parallel ad-traffic funnels mounted at /fb/* and /gdn/*.
// V1 (email traffic) lives at /, /chat, /welcome1, /welcome2, /success.
// /fb (Facebook ads) and /gdn (Google Display Network ads) mirror the same
// components at a path prefix so the ad platforms can segment Lead/IC/Purchase
// /Upsell by URL and Stripe products carry a per-funnel suffix ("- FB"/"- GDN")
// for finance-side attribution.

export const FB_FUNNEL_PREFIX = "/fb";
export const FB_FUNNEL_PARAM = "v1-fb";
export const GDN_FUNNEL_PREFIX = "/gdn";
export const GDN_FUNNEL_PARAM = "v1-gdn";

export type FunnelParam = "v1-fb" | "v1-gdn";

const MARKETING_FUNNELS: { prefix: string; param: FunnelParam }[] = [
  { prefix: FB_FUNNEL_PREFIX, param: FB_FUNNEL_PARAM },
  { prefix: GDN_FUNNEL_PREFIX, param: GDN_FUNNEL_PARAM },
];

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function matchFunnel(pathname?: string): { prefix: string; param: FunnelParam } | null {
  const p = pathname ?? currentPath();
  return (
    MARKETING_FUNNELS.find((f) => p === f.prefix || p.startsWith(`${f.prefix}/`)) ?? null
  );
}

// FB-only check — gates Facebook-Pixel-specific behavior (e.g. the "Upsell2"
// event name) that must NOT fire for the Google (/gdn) funnel.
export function isFbFunnel(pathname?: string): boolean {
  const p = pathname ?? currentPath();
  return p === FB_FUNNEL_PREFIX || p.startsWith(`${FB_FUNNEL_PREFIX}/`);
}

// Returns the funnel identifier to send to the backend (or undefined to leave
// V1 requests byte-identical to today).
export function currentFunnel(pathname?: string): FunnelParam | undefined {
  return matchFunnel(pathname)?.param;
}

// Prefix a V1 path with the active funnel's prefix (/fb or /gdn) when the user
// is in an ad funnel, otherwise leave it alone. Use for in-funnel navigation so
// the user stays inside their own funnel for the entire flow.
export function funnelPath(v1Path: string, pathname?: string): string {
  const f = matchFunnel(pathname);
  if (!f) return v1Path;
  if (v1Path === "/") return f.prefix;
  return `${f.prefix}${v1Path}`;
}

// ─── PostHog funnel helpers (Option B naming) ──────────────────────────────
// Same path → funnel decision logic, returns the PostHog `funnel` property
// value used across Phase 1 (soulmate) and Phase 2 (v1, fb, evelyn, aiden).
// Kept separate from currentFunnel() because the backend depends on its
// "v1-fb" | undefined contract for Stripe product suffixing.

export type PostHogFunnel = "soulmate" | "fb" | "gdn" | "v1" | "evelyn" | "aiden";

// Strip query, hash, trailing slash, lowercase. Mirrors the fix in 83fa6a5
// so URL variants like /evelyn/ or /aiden?utm=x don't drop to "unknown".
function normalize(path: string): string {
  return (path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/").toLowerCase();
}

export function getPostHogFunnel(pathname?: string): PostHogFunnel | null {
  const p = normalize(pathname ?? currentPath());
  if (p === "/soulmate" || p.startsWith("/soulmate/")) return "soulmate";
  if (p === "/fb" || p.startsWith("/fb/")) return "fb";
  if (p === "/gdn" || p.startsWith("/gdn/")) return "gdn";
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
      if (p === "/fb") return "landing";
      if (p === "/fb/chat") return "chat";
      if (p === "/fb/welcome1") return "upsell1";
      if (p === "/fb/welcome2") return "upsell2";
      if (p === "/fb/success") return "thank_you";
      return "unknown";
    case "gdn":
      if (p === "/gdn") return "landing";
      if (p === "/gdn/chat") return "chat";
      if (p === "/gdn/welcome1") return "upsell1";
      if (p === "/gdn/welcome2") return "upsell2";
      if (p === "/gdn/success") return "thank_you";
      return "unknown";
    case "evelyn":
      return "landing";
    case "aiden":
      return "landing";
  }
}
