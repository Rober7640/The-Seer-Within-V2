import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

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
