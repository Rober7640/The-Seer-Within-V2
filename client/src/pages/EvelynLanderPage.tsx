// EvelynLanderPage (skeleton phase): segment resolution + auth handoff.
//
// Phase 1 (this file): URL params → /api/evelyn-lander/start → greeting +
// "Continue" CTA → /api/evelyn-lander/cta → route to the right destination
// (/reading, /login, /set-password, register).
//
// Phase 2 (later): Haiku-driven 2-3 turn chat injected between the greeting
// and the CTA. The skeleton already renders the CTA card so phase 2 just
// adds the chat panel above it.

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { trackPageView } from "@/lib/facebook";

const AUTH_TOKEN_KEY = "seer_auth_token";
const EVELYN_PERSONA_SLUG = "evelyn-cross";
const READING_DEST = `/reading?persona=${EVELYN_PERSONA_SLUG}`;
const SESSION_KEY = "evelyn_lander_token";

type Segment = "v2_active" | "v2_password" | "v1_migrated" | "brand_new" | "token_magic";

interface StartResponse {
  segment: Segment;
  firstName: string | null;
  isReturning: boolean;
}

interface CtaResponse {
  action:
    | "magic_login"
    | "login_with_email"
    | "login_no_password"
    | "register"
    | "already_logged_in";
  jwt?: string;
}

interface LanderParams {
  token: string | null;
  email: string | null;
  bucket: string | null;
  src: string | null;
  campaign: string | null;
  name: string | null;
}

function readParams(): LanderParams {
  const sp = new URLSearchParams(window.location.search);
  // Accept both `token` (PRD spec) and `t` (existing email-link convention).
  const token = sp.get("token") ?? sp.get("t");
  return {
    token: token,
    email: sp.get("email"),
    bucket: sp.get("bucket"),
    src: sp.get("src"),
    campaign: sp.get("campaign"),
    name: sp.get("name"),
  };
}

function getSessionToken(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function EvelynLanderPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [phase, setPhase] = useState<"loading" | "ready" | "handing_off" | "error">("loading");
  const [segment, setSegment] = useState<Segment | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const params = readParams();
  const sessionToken = getSessionToken();

  useEffect(() => {
    trackPageView();
  }, []);

  // PRD §3 critical rule: logged-in V2 user skips the lander entirely.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      clearSessionToken();
      navigate(READING_DEST, { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Resolve segment via /start once auth state is settled and user is anonymous.
  useEffect(() => {
    if (authLoading || user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/evelyn-lander/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            email: params.email ?? undefined,
            token: params.token ?? undefined,
            bucket: params.bucket ?? undefined,
            src: params.src ?? undefined,
            campaign: params.campaign ?? undefined,
            name: params.name ?? undefined,
          }),
        });
        if (!res.ok) throw new Error(`start failed: ${res.status}`);
        const data: StartResponse = await res.json();
        if (cancelled) return;
        setSegment(data.segment);
        setFirstName(data.firstName);
        setPhase("ready");
      } catch (err: any) {
        if (cancelled) return;
        // PRD §9: param-validation / start failures fall through gracefully.
        setSegment("brand_new");
        setFirstName(params.name ?? null);
        setPhase("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleCta() {
    setPhase("handing_off");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/evelyn-lander/cta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          // Re-pass the magic token so server can re-validate at handoff time.
          token: params.token ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(`cta failed: ${res.status}`);
      const data: CtaResponse = await res.json();
      const emailQp = params.email ? `&email=${encodeURIComponent(params.email)}` : "";
      const nextQp = `&next=${encodeURIComponent(READING_DEST)}`;

      switch (data.action) {
        case "magic_login":
          if (data.jwt) {
            localStorage.setItem(AUTH_TOKEN_KEY, data.jwt);
          }
          clearSessionToken();
          navigate(READING_DEST, { replace: true });
          return;
        case "login_with_email":
        case "login_no_password":
          // V2-with-password: standard login. V1-migrated: same destination,
          // server-side NO_PASSWORD detection auto-sends a magic link from /login.
          clearSessionToken();
          navigate(`/login?${emailQp.slice(1)}${nextQp}`, { replace: true });
          return;
        case "register":
          clearSessionToken();
          navigate(`/login?mode=signup${emailQp}`, { replace: true });
          return;
        case "already_logged_in":
          clearSessionToken();
          navigate(READING_DEST, { replace: true });
          return;
      }
    } catch (err: any) {
      setPhase("ready");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  // Greeting copy by segment (skeleton — phase 2 will replace this with Haiku output).
  const greetingTitle = greetingFor(segment, firstName, params.bucket);
  const ctaLabel = ctaLabelFor(segment);
  const subCopy = subCopyFor(segment, firstName);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="/uploads/avatars/evelyn-cross.png"
                alt="Evelyn Cross"
                className="w-24 h-24 rounded-full object-cover border-2 border-purple-300/50"
              />
              <Sparkles className="w-5 h-5 text-purple-500 absolute -top-1 -right-1" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl text-gray-900">{greetingTitle}</h1>
            {subCopy && <p className="text-sm text-gray-600">{subCopy}</p>}
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleCta}
              disabled={phase === "handing_off"}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              {phase === "handing_off" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                ctaLabel
              )}
            </Button>

            <button
              onClick={() => {
                clearSessionToken();
                const emailQp = params.email ? `?email=${encodeURIComponent(params.email)}` : "";
                navigate(`/login${emailQp}`);
              }}
              className="text-xs text-purple-700 hover:underline"
            >
              I already have an account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function greetingFor(
  segment: Segment | null,
  firstName: string | null,
  bucket: string | null,
): string {
  const name = firstName ? firstName : "";
  if (segment === "token_magic" || segment === "v2_password" || segment === "v1_migrated") {
    return name ? `Welcome back, ${name}.` : "Welcome back.";
  }
  if (bucket === "love") return "Tell me what your heart needs clarity on.";
  if (bucket === "money") return "Let's look at the money question together.";
  if (bucket === "purpose") return "Your path is shifting. I want to read it with you.";
  return "I'm Evelyn. Let me read for you.";
}

function ctaLabelFor(segment: Segment | null): string {
  if (segment === "v1_migrated") return "Set up your account";
  return "Continue your reading";
}

function subCopyFor(segment: Segment | null, firstName: string | null): string | null {
  if (segment === "brand_new") return "3 free minutes when you join.";
  if (segment === "v1_migrated") return "We've kept your history — just need a password.";
  if (segment === "token_magic") return "One tap. We've got you signed in.";
  if (segment === "v2_password" && firstName) return `Welcome back, ${firstName}.`;
  return null;
}
