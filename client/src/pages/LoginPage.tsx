import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, UserPlus, Mail } from "lucide-react";
import { trackLead } from "@/lib/facebook";
import { trackABConversion } from "@/hooks/useABTest";
// Open-redirect protection: `next` may only point at /reading (with optional
// query/hash). Anything else is silently dropped so we never bounce a user
// off-platform after auth.
function sanitiseNext(raw: string | null): string | null {
  if (!raw) return null;
  return /^\/reading(?:[?#].*)?$/.test(raw) ? raw : null;
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get("returnTo");
  const personaParam = searchParams.get("persona");
  const nextParam = sanitiseNext(searchParams.get("next"));
  const modeParam = searchParams.get("mode");
  const emailParam = searchParams.get("email");
  // /evelyn lander handoff params — passed through to the register API call so the
  // server can link the lander session row to the new user and schedule Drip 1.
  const sourceParam = searchParams.get("source");
  const bucketParam = searchParams.get("bucket");
  const landerSessionTokenParam = searchParams.get("landerSessionToken");

  const [isSignUp, setIsSignUp] = useState(modeParam === "signup");
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerificationSent, setShowVerificationSent] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  // The free-minutes figure to print on the "check your email" screen, as resolved
  // BY THE SERVER at registration and returned on the /register response.
  //
  // This used to be `sourceParam === "evelyn-lander" ? "5" : "3"` — a third,
  // independent copy of a number that server/lib/welcomeGrantTier.ts and
  // getFreeMinutesForSignup() exist to define exactly once. It had already drifted:
  // a Live Thread reader (one who typed a reply into /evelyn before signing up)
  // is granted, and quoted in the verification email, TEN minutes — but this screen,
  // which their eyes are on while that email is in flight, said five.
  //
  // null means "the server didn't tell us" (an older cached bundle, or a shape
  // change). The copy below then drops the number entirely rather than inventing
  // one, because a missing figure is recoverable and a wrong figure is not.
  const [freeMinutes, setFreeMinutes] = useState<number | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Auto-login after an email-verification click. The server lands the user here as
  // /login?verified=success|already[&token=<JWT>][&persona=<slug>]. We forward a
  // just-verified user straight into their reading whenever we have a token —
  // either from the URL (cross-device) or already stored on this device
  // (same-device signup, or an earlier click that stored it). Two robustness points
  // vs the old version, which could leave the user on this login window until they
  // clicked the email link a second time:
  //   1. Fall back to a stored token when the URL token is missing/stripped
  //      (some email in-app browsers drop query params on the first open).
  //   2. Use a FULL page load (not a client-side navigate) so /reading boots with
  //      the token read fresh from localStorage — avoids a stale-auth race that
  //      could bounce a just-verified user back to this window.
  // Guarded on `verified`, so normal login/signup and every lander funnel are
  // untouched (they never carry that param).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified !== "success" && verified !== "already") return;

    const urlToken = params.get("token");
    if (urlToken) localStorage.setItem("seer_auth_token", urlToken);

    const persona = params.get("persona");
    const personaQuery = persona ? `?persona=${persona}` : "";

    if (localStorage.getItem("seer_auth_token")) {
      // Clean the token out of browser history, then hard-navigate for a clean
      // auth boot on /reading.
      window.history.replaceState({}, "", "/login?verified=" + verified);
      window.location.assign(`/reading${personaQuery}`);
      return;
    }

    // Verified but no credentials available at all (e.g. link opened cold on a
    // second device with no token) — fall back to the sign-in window.
    setVerificationSuccess(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const personaRedirect = personaParam ? `/reading?persona=${personaParam}` : null;

      if (isSignUp) {
        const data = await register(
          email,
          password,
          firstName,
          personaParam || undefined,
          sourceParam || bucketParam || landerSessionTokenParam
            ? {
                ...(sourceParam ? { source: sourceParam } : {}),
                ...(bucketParam ? { bucket: bucketParam } : {}),
                ...(landerSessionTokenParam ? { landerSessionToken: landerSessionTokenParam } : {}),
              }
            : undefined,
        );
        // Fire Lead for lander signups that carry FB-attributed paid traffic:
        // /evelyn ('evelyn-lander') and the generalized persona landers
        // ('persona-lander' → Marcus/Luna/Nova/Maren). Direct /login signups
        // outside the FB-attribution flow stay silent.
        if (sourceParam === 'evelyn-lander' || sourceParam === 'persona-lander') {
          trackLead(email, firstName).catch(() => { /* non-blocking */ });
        }
        // Phase 4c: signup is the primary metric for the evelyn_lander_mechanic
        // A/B. This fires for the CHATBOX arm, whose brand-new signup routes
        // through /login (source=evelyn-lander). The QUIZ arm registers inline via
        // magic-register and fires its own trackABConversion there. Both are
        // matched to the visitor's lander exposure by the ab_vid cookie, and the
        // convert endpoint is idempotent (one conversion per visitor per test).
        if (sourceParam === 'evelyn-lander') {
          trackABConversion('evelyn_lander');
        }
        if (data.requiresVerification) {
          setShowVerificationSent(true);
          setResendEmail(email);
          setFreeMinutes(typeof data.freeMinutes === "number" ? data.freeMinutes : null);
          return;
        }
      } else {
        // Forward returnTo as the redirect so a passwordless account's emailed sign-in
        // link returns the user to where they came from (e.g. /6-6, where the promo claims).
        const data = await login(email, password, returnTo ?? undefined);
        if (!returnTo && !nextParam && !personaParam && data?.user?.defaultPersonaSlug) {
          if (data.user.defaultPersonaAvailable) {
            navigate(`/reading?persona=${data.user.defaultPersonaSlug}`);
          } else {
            navigate("/personas?unavailable=1");
          }
          return;
        }
      }
      // Redirect priority: existing returnTo (legacy contract) > sanitised next
      // (new param from /evelyn lander) > persona-derived > default /reading.
      navigate(returnTo ?? nextParam ?? personaRedirect ?? "/reading");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("NO_PASSWORD")) {
        // Server already sent the magic link from the login endpoint
        setMagicLinkSent(true);
      } else {
        setError(
          msg.includes("401")
            ? "Invalid email or password"
            : msg || "Something went wrong",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resendEmail,
          // Forward source so the resent email keeps the lander-specific
          // "5 free minutes" copy instead of reverting to the 3-min default.
          ...(sourceParam ? { source: sourceParam } : {}),
          ...(personaParam ? { persona: personaParam } : {}),
        }),
      });
      if (res.ok) {
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to resend verification email");
      }
    } catch {
      setError("Failed to resend verification email");
    } finally {
      setResendLoading(false);
    }
  };

  // Show verification sent screen after registration
  if (showVerificationSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />

        <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <CardTitle className="font-serif text-xl text-gray-900">
                Check Your Email
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              We sent a verification link to <strong>{resendEmail}</strong>.
              Please check your email and click the link to activate your account
              and receive your {freeMinutes !== null ? `${freeMinutes} ` : ""}free minutes.
            </p>
            <p className="text-xs text-gray-400">
              The link expires in 24 hours.
            </p>

            <div className="pt-2 space-y-2">
              <Button
                onClick={handleResendVerification}
                disabled={resendLoading}
                variant="outline"
                className="w-full text-sm"
              >
                {resendLoading ? (
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Resend Verification Email"
                )}
              </Button>

              <button
                onClick={() => {
                  setShowVerificationSent(false);
                  setIsSignUp(false);
                }}
                className="text-xs text-purple-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <CosmicBackground />

        <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <CardTitle className="font-serif text-xl text-gray-900">
                Check Your Email
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              We sent a sign-in link to <strong>{email}</strong>.
              Click the link in your email to continue your reading.
            </p>
            <p className="text-xs text-gray-400">
              Don't see it? Check your spam folder.
            </p>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setError(null);
                }}
                className="text-xs text-purple-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle className="font-serif text-xl text-gray-900">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
          </div>
          <p className="text-xs text-gray-500">
            {isSignUp
              ? "Start your journey with a personal guide"
              : "Sign in to continue your reading"}
          </p>
        </CardHeader>
        <CardContent>
          {verificationSuccess && (
            <p className="text-green-700 text-xs p-2 bg-green-50 rounded-lg text-center mb-4">
              Email verified successfully! Sign in to start your reading.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-red-600 text-xs p-2 bg-red-50 rounded-lg text-center">
                {error}
              </p>
            )}

            {isSignUp && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={isSignUp}
                  className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                  placeholder="Your first name"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 8 : 1}
                className="w-full bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm border border-gray-200 focus:border-purple-500 focus:outline-none focus:bg-white"
                placeholder={isSignUp ? "Min 8 characters" : "Your password"}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {!isSignUp && (
            <div className="mt-3 text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setVerificationSuccess(false);
              }}
              className="text-xs text-purple-600 hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
