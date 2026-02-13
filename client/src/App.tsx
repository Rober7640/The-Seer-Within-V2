import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "./lib/facebook";
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

// Chat service pages (lazy loaded)
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ChatServicePage = lazy(() => import("@/pages/ChatServicePage"));
const CreditsPage = lazy(() => import("@/pages/CreditsPage"));
const PersonasDirectory = lazy(() => import("@/pages/PersonasDirectory"));

// Admin pages (lazy loaded)
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const PersonasDashboard = lazy(() => import("@/pages/admin/PersonasDashboard"));
const PersonaEditor = lazy(() => import("@/pages/admin/PersonaEditor"));
const PromptsEditor = lazy(() => import("@/pages/admin/PromptsEditor"));
const AnalyticsDashboard = lazy(() => import("@/pages/admin/AnalyticsDashboard"));
const UsersList = lazy(() => import("@/pages/admin/UsersList"));
const UserDetail = lazy(() => import("@/pages/admin/UserDetail"));

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
    trackPageView();
  }, [location]);

  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* Existing funnel routes */}
        <Route path="/" component={LandingPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/welcome1" component={UpsellPage} />
        <Route path="/welcome2" component={Upsell2Page} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/upsell-test" component={UpsellTestPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/refund" component={RefundPage} />

        {/* Chat service routes */}
        <Route path="/login" component={LoginPage} />
        <Route path="/reading" component={ChatServicePage} />
        <Route path="/credits" component={CreditsPage} />
        <Route path="/personas" component={PersonasDirectory} />

        {/* Admin routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/personas/new" component={PersonaEditor} />
        <Route path="/admin/personas/:id" component={PersonaEditor} />
        <Route path="/admin/personas" component={PersonasDashboard} />
        <Route path="/admin/prompts" component={PromptsEditor} />
        <Route path="/admin/analytics" component={AnalyticsDashboard} />
        <Route path="/admin/users/:id" component={UserDetail} />
        <Route path="/admin/users" component={UsersList} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
