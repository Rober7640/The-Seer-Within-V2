import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { initPostHog, registerUTMs } from "./lib/posthog";
import "./index.css";

// FB Pixel init is lazy — handled inside client/src/lib/facebook.ts the first
// time an event is fired to a pixel. This prevents fbq('init') from auto-firing
// a PageView to every configured pixel regardless of URL.

// PostHog must be initialised BEFORE React renders. React flushes effects
// child-first, so a page component's mount effect (e.g. PalmBridge's
// palm_bridge_view) runs before App's own mount effect — meaning any event
// fired on mount was dropped by track()'s `if (!initialized) return` guard.
// Registering the UTM super-properties here too means those same mount-time
// events carry their traffic source. Both calls are idempotent, so App's
// existing mount effect stays a harmless no-op.
initPostHog();
registerUTMs();

// Initialize Sentry for client-side error monitoring
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Hide the Stripe promotional badge that overlaps the chat send button.
// Stripe dynamically injects a fixed-position iframe/div badge at the bottom-right
// after Elements loads. A MutationObserver catches it regardless of timing.
const hideStripeBadge = () => {
  const observer = new MutationObserver(() => {
    // Stripe badge: a]fixed-position element linking to stripe.com
    document.querySelectorAll<HTMLElement>('a[href*="stripe.com"]').forEach((el) => {
      if (el.style.position === 'fixed' || el.closest('[style*="position: fixed"]')) {
        el.style.display = 'none';
      }
    });
    // Also catch fixed-position iframes injected by Stripe at body level
    document.querySelectorAll<HTMLIFrameElement>('body > iframe').forEach((iframe) => {
      const style = iframe.getAttribute('style') || '';
      if (style.includes('position: fixed') && style.includes('z-index')) {
        // Skip Stripe payment input frames — only hide the badge
        const name = iframe.getAttribute('name') || '';
        if (!name.includes('__privateStripeMetricsController')) {
          iframe.style.display = 'none';
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hideStripeBadge);
} else {
  hideStripeBadge();
}
