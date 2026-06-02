// Central definition of the V1-style ad funnels that mirror the base V1
// funnel (/, /chat, /welcome1, /welcome2, /success) at a URL prefix.
//
// Each funnel gets its own:
//   - URL prefix (e.g. /fb2)
//   - Stripe product-name suffix (e.g. " - FB2") for finance attribution
//   - AWeber tag suffix (e.g. "-fb2") for list segmentation
//   - PostHog `funnel` property value (e.g. "fb2")
// The per-funnel Facebook Pixel lives separately in shared/fbPixelConfig.ts.
//
// To add another funnel (e.g. /fb3): add one entry below + a matching
// fbPixelConfig route + the App.tsx routes. Everything that routes through
// these helpers (product naming, AWeber tags, redirects, PostHog) updates
// automatically.

export type FunnelParam = "v1-fb" | "v1-fb2" | "v1-gdn";

export interface FunnelDef {
  // Value sent to the backend and stored in Stripe metadata.funnel.
  param: FunnelParam;
  // URL prefix the funnel is mounted at (no trailing slash).
  prefix: string;
  // Suffix appended to customer-visible Stripe product names.
  productSuffix: string;
  // Suffix appended to the "seer-within*" AWeber tags.
  aweberSuffix: string;
  // PostHog `funnel` property value.
  posthog: string;
}

export const FUNNELS: readonly FunnelDef[] = [
  { param: "v1-fb", prefix: "/fb", productSuffix: " - FB", aweberSuffix: "-fb", posthog: "fb" },
  { param: "v1-fb2", prefix: "/fb2", productSuffix: " - FB2", aweberSuffix: "-fb2", posthog: "fb2" },
  { param: "v1-gdn", prefix: "/gdn", productSuffix: " - GDN", aweberSuffix: "-gdn", posthog: "gdn" },
];

// Resolve the funnel that owns a URL path. The trailing-slash check means
// "/fb2" does NOT match the "/fb" prefix, so the two funnels stay distinct.
export function funnelDefForPath(path: string): FunnelDef | null {
  for (const f of FUNNELS) {
    if (path === f.prefix || path.startsWith(`${f.prefix}/`)) return f;
  }
  return null;
}

// Resolve a funnel by its backend param ("v1-fb" / "v1-fb2" / "v1-gdn").
// Returns null for any other value (undefined, "", base V1 traffic, unknowns).
export function funnelDefForParam(param: unknown): FunnelDef | null {
  return FUNNELS.find((f) => f.param === param) ?? null;
}
