// Helpers for the parallel V1-FB funnel mounted at /eve_1/*.
// V1 (email traffic) lives at /, /chat, /welcome1, /welcome2, /success.
// V1-FB (Facebook ad traffic) mirrors the same components at the /eve_1 prefix
// so Facebook Events Manager can segment Lead/IC/Purchase/Upsell by URL and
// Stripe products carry a "- FB" suffix for finance-side attribution.

export const FB_FUNNEL_PREFIX = "/eve_1";
export const FB_FUNNEL_PARAM = "v1-fb";

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

export function isFbFunnel(pathname?: string): boolean {
  const p = pathname ?? currentPath();
  return p === FB_FUNNEL_PREFIX || p.startsWith(`${FB_FUNNEL_PREFIX}/`);
}

// Returns the funnel identifier to send to the backend (or undefined to leave
// V1 requests byte-identical to today).
export function currentFunnel(pathname?: string): "v1-fb" | undefined {
  return isFbFunnel(pathname) ? FB_FUNNEL_PARAM : undefined;
}

// Prefix a V1 path with /eve_1 when the user is in the FB funnel, otherwise
// leave it alone. Use for in-funnel navigation so the user stays inside their
// own funnel for the entire flow.
export function funnelPath(v1Path: string, pathname?: string): string {
  if (!isFbFunnel(pathname)) return v1Path;
  if (v1Path === "/") return FB_FUNNEL_PREFIX;
  return `${FB_FUNNEL_PREFIX}${v1Path}`;
}
