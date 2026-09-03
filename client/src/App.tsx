import { useEffect, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "./lib/facebook";
import { initPostHog, track as trackPH, registerUTMs } from "./lib/posthog";
import { getPostHogFunnel, getPostHogStep, skipEmail } from "./lib/funnel";
import { syncTarotAttribution } from "./lib/tarotAttribution";
import { ChatServiceLayout } from "@/components/ChatServiceLayout";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import PalmBridge from "@/pages/PalmBridge";
import TarotBridge from "@/pages/TarotBridge";
import ReadBridge from "@/pages/ReadBridge";
import ChatPage from "@/pages/ChatPage";
import SuccessPage from "@/pages/SuccessPage";
import UpsellTestPage from "@/pages/UpsellTestPage";
import UpsellPage from "@/pages/UpsellPage";
import Upsell2Page from "@/pages/Upsell2Page";
import PrivacyPage from "@/pages/PrivacyPage";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import OrderSuccessPage from "@/pages/OrderSuccessPage";
import TermsPage from "@/pages/TermsPage";
import RefundPage from "@/pages/RefundPage";
import FAQPage from "@/pages/FAQPage";

// Chat service pages (lazy loaded)
const LoginPage = lazyWithRetry(() => import("@/pages/LoginPage"));
const ChatServicePage = lazyWithRetry(() => import("@/pages/ChatServicePage"));
const CreditsPage = lazyWithRetry(() => import("@/pages/CreditsPage"));
const PersonasDirectory = lazyWithRetry(() => import("@/pages/PersonasDirectory"));
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const WelcomeChatPage = lazyWithRetry(() => import("@/pages/WelcomeChatPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyWithRetry(() => import("@/pages/ResetPasswordPage"));
const MagicAuthPage = lazyWithRetry(() => import("@/pages/MagicAuthPage"));
const SetPasswordPage = lazyWithRetry(() => import("@/pages/SetPasswordPage"));
const AidenQuizPage = lazyWithRetry(() => import("@/pages/AidenQuizPage"));
const EvelynLanderPage = lazyWithRetry(() => import("@/pages/EvelynLanderPage"));
const PersonaLanderPage = lazyWithRetry(() => import("@/pages/PersonaLanderPage"));

// DEV-only paywall design preview (Problem 4). Gated below by import.meta.env.DEV
// so it is excluded from the production bundle.
const PaywallPreviewPage = lazyWithRetry(() => import("@/pages/PaywallPreviewPage"));

// Soulmate Sketch funnel pages (lazy loaded)
const SoulmateLandingPage = lazyWithRetry(() => import("@/pages/SoulmateLandingPage"));
const SoulmateProcessPage = lazyWithRetry(() => import("@/pages/SoulmateProcessPage"));
const SoulmateSalesPage = lazyWithRetry(() => import("@/pages/SoulmateSalesPage"));
const SoulmateUpsellPage = lazyWithRetry(() => import("@/pages/SoulmateUpsellPage"));
const SoulmateUpsell2Page = lazyWithRetry(() => import("@/pages/SoulmateUpsell2Page"));
const SoulmateThankYouPage = lazyWithRetry(() => import("@/pages/SoulmateThankYouPage"));
// Backend deck, offer 02 — the two booking treatments, PREVIEW ONLY. Lazy so
// they cost the live funnels nothing. Deliberately absent from the FB PageView
// list above: no traffic reaches these, and firing the pixel would pollute it.
const TwinFlameBooking = lazyWithRetry(() => import("@/pages/TwinFlameBooking"));
const TwinFlameBookingPage = lazyWithRetry(() => import("@/pages/TwinFlameBookingPage"));
const TwinFlameBookingChat = lazyWithRetry(() => import("@/pages/TwinFlameBookingChat"));
const TwinFlameThankYouPage = lazyWithRetry(() => import("@/pages/TwinFlameThankYouPage"));
const JudgementBookingPage = lazyWithRetry(() => import("@/pages/JudgementBookingPage"));
const JudgementBookingChat = lazyWithRetry(() => import("@/pages/JudgementBookingChat"));
const JudgementThankYouPage = lazyWithRetry(() => import("@/pages/JudgementThankYouPage"));
// Shared /offers/upsell/ pages — offer + pitch resolved from the booking
// SESSION rather than the URL prefix, so one route pair serves every backend
// offer in the deck. Lazy for the same reason as the booking pages above.
const OffersUpsell1 = lazyWithRetry(() => import("@/pages/offers/OffersUpsell1"));
const OffersUpsell2 = lazyWithRetry(() => import("@/pages/offers/OffersUpsell2"));

// Admin pages (lazy loaded)
const AdminLogin = lazyWithRetry(() => import("@/pages/admin/AdminLogin"));
const PersonasDashboard = lazyWithRetry(() => import("@/pages/admin/PersonasDashboard"));
const PersonaEditor = lazyWithRetry(() => import("@/pages/admin/PersonaEditor"));
const PromptsEditor = lazyWithRetry(() => import("@/pages/admin/PromptsEditor"));
const AnalyticsDashboard = lazyWithRetry(() => import("@/pages/admin/AnalyticsDashboard"));
const UsersList = lazyWithRetry(() => import("@/pages/admin/UsersList"));
const UserDetail = lazyWithRetry(() => import("@/pages/admin/UserDetail"));
const SafetyDashboard = lazyWithRetry(() => import("@/pages/admin/SafetyDashboard"));
const IntentConfigEditor = lazyWithRetry(() => import("@/pages/admin/IntentConfigEditor"));
const FollowUpsDashboard = lazyWithRetry(() => import("@/pages/admin/FollowUpsDashboard"));
const EmailDripMigratedV1 = lazyWithRetry(() => import("@/pages/admin/EmailDripMigratedV1"));
const EmailDripNewV1 = lazyWithRetry(() => import("@/pages/admin/EmailDripNewV1"));
const AidenFollowUpsPage = lazyWithRetry(() => import("@/pages/admin/AidenFollowUpsPage"));
const EvelynFollowUpsPage = lazyWithRetry(() => import("@/pages/admin/EvelynFollowUpsPage"));
const PersonaFollowUpsPage = lazyWithRetry(() => import("@/pages/admin/PersonaFollowUpsPage"));
const MarketplacePage = lazyWithRetry(() => import("@/pages/admin/MarketplacePage"));
const SettingsPage = lazyWithRetry(() => import("@/pages/admin/SettingsPage"));
// Kept until the live V1 main-price split (system_config.v1_price_variants) is
// migrated onto the experiments framework — it's the only readout for that
// still-live test (the framework's v1_main_price_2026 ships draft/OFF).
const PriceTestDashboard = lazyWithRetry(() => import("@/pages/admin/PriceTestDashboard"));
const ExperimentsDashboard = lazyWithRetry(() => import("@/pages/admin/ExperimentsDashboard"));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    initPostHog();
    // Capture UTM params from the ENTRY url as PostHog super-properties so every
    // event this session carries the traffic source (task 1.6). Runs after
    // initPostHog() so PostHog is ready; no-op when there are no utm_* params.
    registerUTMs();
    // No-optin: capture `?noemail` from the ENTRY url the moment the app loads,
    // before any in-funnel navigation (e.g. the palm bridge → /fb-palm/chat)
    // rebuilds the query string and drops it. skipEmail() persists the choice
    // to tab-scoped sessionStorage. This is a strict no-op for any url without
    // `?noemail` — it only writes when the param is present — so every existing
    // funnel/lander is unaffected.
    skipEmail();
  }, []);

  useEffect(() => {
    // PostHog $pageview on EVERY route change — including the V2 chat routes
    // (/login, /reading, /credits, /personas) that previously fired nothing —
    // so the full journey is attributed. UTM super-props (registered on mount)
    // auto-attach. Runs after the mount effect's initPostHog(); track() is a no-op
    // until PostHog is initialised. (task 1.6)
    trackPH('$pageview', { path: location });

    // V1 funnel + the two V2 lander surfaces (/aiden, /evelyn) that have
    // FB-attributed paid traffic. Other V2 routes (/login, /reading,
    // /credits, /personas) intentionally stay quiet for the FB PageView pixel.
    const isTrackedFunnel =
      location === '/' ||
      location === '/chat' ||
      location === '/welcome1' ||
      location === '/welcome2' ||
      location === '/success' ||
      location === '/upsell-test' ||
      location.startsWith('/fb') ||
      location.startsWith('/gdn') ||
      location === '/aiden' ||
      location === '/evelyn' ||
      location === '/marcus' ||
      location === '/luna' ||
      location === '/nova' ||
      location === '/maren' ||
      location.startsWith('/soulmate') ||
      // Facebook-compliance storefront — PAGEVIEW ONLY (Lewis, 2026-07-14). Meta sees the
      // traffic, so these visitors are retargetable. It does NOT see the bracelet sales:
      // resolveStripeEventName() returns null for `bracelet_*`, so no Purchase event fires
      // and storefront revenue can never be mistaken for funnel revenue.
      location === '/home' ||
      location.startsWith('/products/') ||
      location === '/order/success';
    if (isTrackedFunnel) {
      trackPageView();
    }

    // PostHog page tracking — Phase 1 (soulmate) + Phase 2 (v1, fb, evelyn, aiden).
    const funnel = getPostHogFunnel(location);
    if (funnel) {
      const urlParams = new URLSearchParams(window.location.search);
      // /fb-tarot: resolve the deck/hook/card ONCE per route and remember it for the
      // tab. Must run before lander_view so the very first event already carries the
      // right deck, and so the upsell steps — which Stripe redirects to with no query
      // string at all — can still be attributed. See lib/tarotAttribution.ts.
      const tarot =
        funnel === 'tarot'
          ? syncTarotAttribution(location, window.location.search)
          : undefined;
      trackPH('lander_view', {
        funnel,
        step: getPostHogStep(location),
        path: location,
        // Palm multi-sign / tarot multi-deck: tag which ad concept was quizzed so
        // the funnel can be broken down per sign (palm) / deck (tarot). Reuses the
        // same `sign` breakdown key so existing insights keep working.
        //
        // Tarot used to read `?deck=` with a hardcoded 'decode-him' fallback. The ad
        // URLs are CLEAN (no &deck=), so that fallback fired on every visitor and
        // labelled them with a deck they never saw — and one whose placeholder art is
        // byte-identical to the palm thumbs strip. It now comes from the resolver,
        // which validates against the registry and defaults to DEFAULT_DECK.
        sign:
          funnel === 'palm'
            ? (urlParams.get('sign') || 'thumb')
            : tarot?.deck,
        // deck / facing / hook / version / card / panel. `facing` is registry-driven,
        // so a face-up deck splits face-up vs face-down with no change here.
        ...(tarot ?? {}),
        utm_source: urlParams.get('utm_source') || undefined,
        utm_campaign: urlParams.get('utm_campaign') || undefined,
        utm_medium: urlParams.get('utm_medium') || undefined,
      });
    }
  }, [location]);

  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* DEV-only paywall design preview (Problem 4) — never in prod build */}
        {import.meta.env.DEV && (
          <Route path="/paywall-preview" component={PaywallPreviewPage} />
        )}

        {/* Existing funnel routes (V1 — email traffic) */}
        {/* The root "/" serves the original Evelyn LandingPage. Between 2026-07-23
            and 2026-07-27 it temporarily served the FB-compliance HomePage
            (storefront) so Facebook's reviewer landed on the compliant page at the
            domain root; that swap is now REVERTED (agency approval, Joel 2026-07-27).
            The storefront itself is unchanged and still reachable at /home below.
            TO RE-SWAP: change this one line back to `component={HomePage}`. */}
        <Route path="/" component={LandingPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/welcome1" component={UpsellPage} />
        <Route path="/welcome2" component={Upsell2Page} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/upsell-test" component={UpsellTestPage} />

        {/* V1-FB funnel routes (Facebook ad traffic) — same components, new
            URLs so FB Events Manager can segment by event_source_url and
            Stripe products carry the "- FB" suffix. */}
        <Route path="/fb" component={LandingPage} />
        <Route path="/fb/chat" component={ChatPage} />
        <Route path="/fb/welcome1" component={UpsellPage} />
        <Route path="/fb/welcome2" component={Upsell2Page} />
        <Route path="/fb/success" component={SuccessPage} />

        {/* V1-FB2 funnel routes — clone of /fb on its own pixel + "- FB2"
            Stripe suffix. Same components, new URLs. */}
        <Route path="/fb2" component={LandingPage} />
        <Route path="/fb2/chat" component={ChatPage} />
        <Route path="/fb2/welcome1" component={UpsellPage} />
        <Route path="/fb2/welcome2" component={Upsell2Page} />
        <Route path="/fb2/success" component={SuccessPage} />

        {/* V1-PALM funnel — palm/thumb "quiz bridge" lander. /fb-palm root
            renders PalmBridge (not LandingPage); chat + upsells reuse the shared
            V1 components and carry the "- PALM" Stripe suffix. */}
        <Route path="/fb-palm" component={PalmBridge} />
        <Route path="/fb-palm/b" component={PalmBridge} />
        <Route path="/fb-palm/c" component={PalmBridge} />
        <Route path="/fb-palm/chat" component={ChatPage} />
        <Route path="/fb-palm/welcome1" component={UpsellPage} />
        <Route path="/fb-palm/welcome2" component={Upsell2Page} />
        <Route path="/fb-palm/success" component={SuccessPage} />

        {/* V1-TAROT funnel — "decode-him card" quiz-bridge lander. A SEPARATE
            funnel/route (not a palm sign): /fb-tarot root renders TarotBridge;
            chat + upsells reuse the shared V1 components and carry the "- TAROT"
            Stripe suffix. Version A/B/C split mirrors /fb-palm. */}
        {/* V1-READ funnel — the device-agnostic quiz bridge. ONE component
            renders every instrument (dream, tea, …) from the shared registry in
            shared/readDevices.ts, chosen by ?device=. Adding a device needs no
            change here. Version A/B/C split mirrors /fb-palm and /fb-tarot. */}
        <Route path="/fb-read" component={ReadBridge} />
        <Route path="/fb-read/b" component={ReadBridge} />
        <Route path="/fb-read/c" component={ReadBridge} />
        <Route path="/fb-read/chat" component={ChatPage} />
        <Route path="/fb-read/welcome1" component={UpsellPage} />
        <Route path="/fb-read/welcome2" component={Upsell2Page} />
        <Route path="/fb-read/success" component={SuccessPage} />

        <Route path="/fb-tarot" component={TarotBridge} />
        <Route path="/fb-tarot/b" component={TarotBridge} />
        <Route path="/fb-tarot/c" component={TarotBridge} />
        <Route path="/fb-tarot/chat" component={ChatPage} />
        <Route path="/fb-tarot/welcome1" component={UpsellPage} />
        <Route path="/fb-tarot/welcome2" component={Upsell2Page} />
        <Route path="/fb-tarot/success" component={SuccessPage} />

        {/* V1-GDN funnel routes (Google Display Network ad traffic) — same
            components, new URLs so Google Ads can segment by page and Stripe
            products carry the "- GDN" suffix. */}
        <Route path="/gdn" component={LandingPage} />
        <Route path="/gdn/chat" component={ChatPage} />
        <Route path="/gdn/welcome1" component={UpsellPage} />
        <Route path="/gdn/welcome2" component={Upsell2Page} />
        <Route path="/gdn/success" component={SuccessPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/refund" component={RefundPage} />
        <Route path="/faq" component={FAQPage} />

        {/* Facebook-compliance storefront. ADDITIVE — separate pages at separate URLs;
            the root lander at "/" is deliberately untouched (Lewis, 2026-07-14). */}
        <Route path="/home" component={HomePage} />
        <Route path="/products/:slug" component={ProductPage} />
        <Route path="/order/success" component={OrderSuccessPage} />

        {/* Persona-specific landers (no layout wrapper) */}
        <Route path="/aiden" component={AidenQuizPage} />
        <Route path="/evelyn" component={EvelynLanderPage} />

        {/* Generalized chat landers — one component, persona via slug. */}
        <Route path="/marcus">{() => <PersonaLanderPage personaSlug="marcus-stone" />}</Route>
        <Route path="/luna">{() => <PersonaLanderPage personaSlug="luna-voss" />}</Route>
        <Route path="/nova">{() => <PersonaLanderPage personaSlug="nova-sharma" />}</Route>
        <Route path="/maren">{() => <PersonaLanderPage personaSlug="maren-soleil" />}</Route>

        {/* Soulmate Sketch funnel — specific paths BEFORE /soulmate catch-all */}
        <Route path="/soulmate/process" component={SoulmateProcessPage} />
        <Route path="/soulmate/reading" component={SoulmateSalesPage} />
        <Route path="/soulmate/gift" component={SoulmateUpsellPage} />
        <Route path="/soulmate/gift2" component={SoulmateUpsell2Page} />
        <Route path="/soulmate/thank-you" component={SoulmateThankYouPage} />

        {/* Backend deck, offer 02 — the two candidate booking treatments, for
            review only. Nothing links here and neither one charges: the button
            logs and stops. Stripe gets wired to the winner in phase 2.
            Spec: improve-v1/v1-one-time-BEs/copy/02/02-C1-booking-page.md */}
        {/* LIVE entry: assigns page vs chat (be_02_booking_treatment_2026) and renders
            the arm. The two /preview-* routes below stay for QA. */}
        <Route path="/tarot/twin-flame" component={TwinFlameBooking} />
        <Route path="/tarot/twin-flame/preview-page" component={TwinFlameBookingPage} />
        <Route path="/tarot/twin-flame/preview-chat" component={TwinFlameBookingChat} />
        {/* 02's upsells are V1's components, as every other funnel's are. Only
            the opening beats differ (lib/upsellCopy/twinFlame.ts) — a tarot
            buyer is never told her Energy Clearing Ritual is scheduled.
            Deliberately absent from the FB PageView list above, like the two
            preview routes: nothing links here yet and Stripe is unwired, so
            there is no traffic to attribute. Preview with ?demo=true. */}
        <Route path="/tarot/twin-flame/welcome1" component={UpsellPage} />
        <Route path="/tarot/twin-flame/welcome2" component={Upsell2Page} />
        {/* 02's own thank-you (02-T1). NOT V1's /success, which tells her an
            "Energy Clearing Ritual" begins tonight — a product she never
            bought. Receipt-shaped and sells nothing, by spec. */}
        <Route path="/tarot/twin-flame/success" component={TwinFlameThankYouPage} />

        {/* Backend deck, offer 03 — Judgement Day (ACT · pay-what-you-want ·
            three nights · needs her reply). Review only, like 02: nothing links
            here and nothing charges — the booking button logs and stops.
            The booking page sits at the offer root because that is where the
            letter's {{BOOKING_URL}} points; 02 has two preview paths only
            because two treatments were competing.
            Spec: improve-v1/v1-one-time-BEs/copy/03/03-C1-booking-page.md */}
        {/* Two candidate treatments, as 02 has: the page at the offer root
            (where the letter's {{BOOKING_URL}} points) and the chat beside it.
            ⚠ 03's chat carries the deck's only text input — pay-what-you-want
            has one thing only the buyer can supply. */}
        <Route path="/offers/wiccan/judgement-day/chat" component={JudgementBookingChat} />
        <Route path="/offers/wiccan/judgement-day" component={JudgementBookingPage} />
        {/* 03's own thank-you (03-T1) — an INTAKE GATE, not a receipt (P7).
            Reached via successPath + `?s=<session_id>` (OffersUpsell2's
            navigate call, BACKEND_OFFER_CATALOG['judgement-day'].successPath).
            No bump delivery block here, unlike 02's — see JudgementThankYouPage. */}
        <Route path="/offers/wiccan/judgement-day/success" component={JudgementThankYouPage} />

        {/* Shared /offers/upsell/ pages — the deck-wide Upsell 1 → Upsell 2
            chain. Offer + pitch are resolved from the booking SESSION
            (session_id), not this URL, so this one route pair works for every
            backend offer (02, 03, …) without a per-offer prefix mount. Always
            backend-mode; fires no V1 tracking. */}
        <Route path="/offers/upsell/welcome1" component={OffersUpsell1} />
        <Route path="/offers/upsell/welcome2" component={OffersUpsell2} />

        <Route path="/soulmate" component={SoulmateLandingPage} />

        {/* Auth routes (no layout wrapper) */}
        <Route path="/login" component={LoginPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password/:token" component={ResetPasswordPage} />
        <Route path="/verify-email/:token">
          {(params: { token: string }) => {
            const search = window.location.search;
            window.location.href = `/api/auth/verify-email/${params.token}${search}`;
            return null;
          }}
        </Route>
        <Route path="/magic-auth" component={MagicAuthPage} />
        <Route path="/set-password" component={SetPasswordPage} />

        {/* Chat service routes with layout */}
        <Route path="/chat/:personaSlug">
          {(params) => (
            <ChatServiceLayout showNav={false}>
              <ChatServicePage params={params} />
            </ChatServiceLayout>
          )}
        </Route>
        <Route path="/reading">
          <ChatServiceLayout showNav={false}>
            <ChatServicePage />
          </ChatServiceLayout>
        </Route>
        <Route path="/credits">
          <ChatServiceLayout maxWidth="2xl" centerContent>
            <CreditsPage />
          </ChatServiceLayout>
        </Route>
        <Route path="/personas">
          <ChatServiceLayout requiresAuth={false}>
            <PersonasDirectory />
          </ChatServiceLayout>
        </Route>
        {/* 7/7 promo landing — same guide directory with a promo headline. Emailed
            users arrive here auto-logged-in via /magic-auth?t=...&redirect=/7-7, and the
            claim grants 7 free minutes per guide (promoMode). */}
        <Route path="/7-7">
          <ChatServiceLayout requiresAuth={false}>
            <PersonasDirectory promoMode />
          </ChatServiceLayout>
        </Route>
        {/* 6/6 promo ended (campaign expired 2026-06-07). Old links — including the
            emailed /magic-auth?t=...&redirect=/6-6 auto-login — now land on the normal
            guide directory. The promo backend stays in place (inert, reusable). */}
        <Route path="/6-6">
          <Redirect to="/personas" />
        </Route>
        <Route path="/dashboard">
          <ChatServiceLayout maxWidth="3xl" centerContent>
            <Dashboard />
          </ChatServiceLayout>
        </Route>
        <Route path="/welcome-chat">
          <ChatServiceLayout showNav={false}>
            <WelcomeChatPage />
          </ChatServiceLayout>
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/personas/new" component={PersonaEditor} />
        <Route path="/admin/personas/:id" component={PersonaEditor} />
        <Route path="/admin/personas" component={PersonasDashboard} />
        <Route path="/admin/prompts" component={PromptsEditor} />
        <Route path="/admin/analytics" component={AnalyticsDashboard} />
        <Route path="/admin/users/:id" component={UserDetail} />
        <Route path="/admin/users" component={UsersList} />
        <Route path="/admin/safety" component={SafetyDashboard} />
        <Route path="/admin/intent-configs/:personaId" component={IntentConfigEditor} />
        <Route path="/admin/intent-configs" component={IntentConfigEditor} />
        <Route path="/admin/follow-ups" component={FollowUpsDashboard} />
        <Route path="/admin/email-drip/migrated-v1" component={EmailDripMigratedV1} />
        <Route path="/admin/email-drip/new-v1" component={EmailDripNewV1} />
        <Route path="/admin/aiden-follow-ups" component={AidenFollowUpsPage} />
        <Route path="/admin/evelyn-follow-ups" component={EvelynFollowUpsPage} />
        <Route path="/admin/persona-follow-ups" component={PersonaFollowUpsPage} />
        <Route path="/admin/marketplace" component={MarketplacePage} />
        <Route path="/admin/settings" component={SettingsPage} />
        <Route path="/admin/price-test" component={PriceTestDashboard} />
        <Route path="/admin/experiments" component={ExperimentsDashboard} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function SentryFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep text-white">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6">An unexpected error occurred. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={SentryFallback}>
      <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb", currency: "USD" }}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </PayPalScriptProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
