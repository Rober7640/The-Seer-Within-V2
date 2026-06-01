// Per-funnel Facebook Pixel routing config.
//
// To add a new funnel pixel later:
//   1. Add an entry below with the new Pixel ID + the URL path prefixes
//      that funnel owns.
//   2. Add a matching Meta CAPI tag in Stape GTM with an
//      event_source_url-contains trigger.
// That's it — every event-firing helper already routes through here.

export interface FbPixelEntry {
  pixelId: string;
  // URL path prefixes that route to this funnel. First match wins.
  // The `default` entry is the catch-all fallback; leave its routes empty.
  routes: string[];
}

export const FB_PIXEL_CONFIG: Record<string, FbPixelEntry> = {
  default: {
    pixelId: '446814716830295',
    routes: [],
  },
  soulmate: {
    pixelId: '738651185965027',
    routes: [
      '/soulmate',
      '/soulmate-sales',
      '/soulmate-upsell',
      '/soulmate-upsell-2',
      '/soulmate-thank-you',
    ],
  },
  // /fb2 ad funnel reuses the soulmate pixel (browser-side). Server-side CAPI
  // routing to this pixel is handled in sGTM by an event_source_url-contains
  // "/fb2" trigger. /fb (no entry) stays on the default pixel.
  fb2: {
    pixelId: '738651185965027',
    routes: [
      '/fb2',
    ],
  },
};

export function resolveFunnelFromUrl(urlOrPath: string): string {
  let path: string;
  try {
    path = new URL(urlOrPath).pathname;
  } catch {
    path = urlOrPath;
  }

  for (const [funnelName, entry] of Object.entries(FB_PIXEL_CONFIG)) {
    if (funnelName === 'default') continue;
    if (entry.routes.some((route) => path.startsWith(route))) {
      return funnelName;
    }
  }
  return 'default';
}

export function getPixelIdForFunnel(funnel: string): string {
  return FB_PIXEL_CONFIG[funnel]?.pixelId ?? FB_PIXEL_CONFIG.default.pixelId;
}

export function getPixelIdForUrl(urlOrPath: string): string {
  return getPixelIdForFunnel(resolveFunnelFromUrl(urlOrPath));
}
