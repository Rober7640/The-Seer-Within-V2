import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "./lib/facebook";
import { ChatServiceLayout } from "@/components/ChatServiceLayout";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import ChatPage from "@/pages/ChatPage";
import SuccessPage from "@/pages/SuccessPage";
import UpsellTestPage from "@/pages/UpsellTestPage";
import UpsellPage from "@/pages/UpsellPage";
import Upsell2Page from "@/pages/Upsell2Page";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RefundPage from "@/pages/RefundPage";
import FAQPage from "@/pages/FAQPage";

// Chat service pages (lazy loaded)
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ChatServicePage = lazy(() => import("@/pages/ChatServicePage"));
const CreditsPage = lazy(() => import("@/pages/CreditsPage"));
const PersonasDirectory = lazy(() => import("@/pages/PersonasDirectory"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const WelcomeChatPage = lazy(() => import("@/pages/WelcomeChatPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const MagicAuthPage = lazy(() => import("@/pages/MagicAuthPage"));
const SetPasswordPage = lazy(() => import("@/pages/SetPasswordPage"));
const AidenQuizPage = lazy(() => import("@/pages/AidenQuizPage"));
const EvelynLanderPage = lazy(() => import("@/pages/EvelynLanderPage"));

// Admin pages (lazy loaded)
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const PersonasDashboard = lazy(() => import("@/pages/admin/PersonasDashboard"));
const PersonaEditor = lazy(() => import("@/pages/admin/PersonaEditor"));
const PromptsEditor = lazy(() => import("@/pages/admin/PromptsEditor"));
const AnalyticsDashboard = lazy(() => import("@/pages/admin/AnalyticsDashboard"));
const UsersList = lazy(() => import("@/pages/admin/UsersList"));
const UserDetail = lazy(() => import("@/pages/admin/UserDetail"));
const SafetyDashboard = lazy(() => import("@/pages/admin/SafetyDashboard"));
const IntentConfigEditor = lazy(() => import("@/pages/admin/IntentConfigEditor"));
const FollowUpsDashboard = lazy(() => import("@/pages/admin/FollowUpsDashboard"));
const EmailDripMigratedV1 = lazy(() => import("@/pages/admin/EmailDripMigratedV1"));
const EmailDripNewV1 = lazy(() => import("@/pages/admin/EmailDripNewV1"));
const AidenFollowUpsPage = lazy(() => import("@/pages/admin/AidenFollowUpsPage"));
const EvelynFollowUpsPage = lazy(() => import("@/pages/admin/EvelynFollowUpsPage"));
const MarketplacePage = lazy(() => import("@/pages/admin/MarketplacePage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const PriceTestDashboard = lazy(() => import("@/pages/admin/PriceTestDashboard"));

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
    // V1 funnel only — V2 persona system intentionally does not fire FB PageView.
    const isV1Funnel =
      location === '/' ||
      location === '/chat' ||
      location === '/welcome1' ||
      location === '/welcome2' ||
      location === '/success' ||
      location === '/upsell-test' ||
      location.startsWith('/eve_1');
    if (isV1Funnel) {
      trackPageView();
    }
  }, [location]);

  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* Existing funnel routes (V1 — email traffic) */}
        <Route path="/" component={LandingPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/welcome1" component={UpsellPage} />
        <Route path="/welcome2" component={Upsell2Page} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/upsell-test" component={UpsellTestPage} />

        {/* V1-FB funnel routes (Facebook ad traffic) — same components, new
            URLs so FB Events Manager can segment by event_source_url and
            Stripe products carry the "- FB" suffix. */}
        <Route path="/eve_1" component={LandingPage} />
        <Route path="/eve_1/chat" component={ChatPage} />
        <Route path="/eve_1/welcome1" component={UpsellPage} />
        <Route path="/eve_1/welcome2" component={Upsell2Page} />
        <Route path="/eve_1/success" component={SuccessPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/refund" component={RefundPage} />
        <Route path="/faq" component={FAQPage} />

        {/* Persona-specific landers (no layout wrapper) */}
        <Route path="/aiden" component={AidenQuizPage} />
        <Route path="/evelyn" component={EvelynLanderPage} />

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
        <Route path="/admin/marketplace" component={MarketplacePage} />
        <Route path="/admin/settings" component={SettingsPage} />
        <Route path="/admin/price-test" component={PriceTestDashboard} />

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
