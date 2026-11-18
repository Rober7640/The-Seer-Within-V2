import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import { initPostHog, registerUTMs } from "./lib/posthog";
import { captureLocale, settleLocale } from "./lib/locale";
import { localeServesPath, localeCoversPage } from "./l10n/coverage";
import { loadLocale } from "./lib/i18n";
import { localeDef } from "@shared/locales";
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

// Locale: `?lang=` on the entry URL, else the session cookie, else English
// (client/src/lib/locale.ts). English mounts exactly as before. Any other
// locale first fetches its own bundle (catalog + data twins) so the very first
// bubble is already translated. If this page is not covered in that locale
// (another funnel, an untranslated tarot lander) or the bundle fails to load,
// the visit settles on English — never a half-translated page.
const locale = captureLocale();
const mount = () => createRoot(document.getElementById("root")!).render(<App />);
if (locale === "en") {
  mount();
} else if (!localeServesPath(locale, window.location.pathname)) {
  settleLocale("en");
  mount();
} else {
  loadLocale(locale)
    .then(() => {
      const ok = localeCoversPage(locale, window.location.pathname, window.location.search);
      settleLocale(ok ? locale : "en");
      if (ok) document.documentElement.lang = localeDef(locale).htmlLang;
    })
    .catch((err) => { console.error("[locale] bundle failed to load", err); settleLocale("en"); })
    .finally(mount);
}

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
