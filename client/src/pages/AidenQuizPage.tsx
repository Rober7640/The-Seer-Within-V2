import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Sparkles } from "lucide-react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { QUIZ_QUESTIONS, getEmailAppLink } from "@/lib/aidenQuizData";
// Note: we use fetch() directly instead of apiRequest() because apiRequest
// throws on non-200 responses, and we need to read the 409 body for EXISTING_ACCOUNT.
import { trackLead, trackInitiateCheckout } from "@/lib/facebook";
import TurnstileWidget from "@/components/TurnstileWidget";
import { CosmicBackground } from "@/components/CosmicBackground";

const AUTH_TOKEN_KEY = "seer_auth_token";

type FlowState =
  | "loading"
  | "intro"
  | "q1"
  | "q2"
  | "q3"
  | "transition"
  | "gate"
  | "checking_email";

interface QuizAnswers {
  topic: string;
  feeling: string;
  outcome: string;
}

export default function AidenQuizPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [flowState, setFlowState] = useState<FlowState>("loading");
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");

  // Gate form state
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed18, setConfirmed18] = useState(false);
  const [gateError, setGateError] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState<{ firstName: string; hasPassword: boolean } | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);

  // Check email state
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [showRescue, setShowRescue] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const rescueTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Quiz session token for analytics
  const [quizSessionToken] = useState(() => {
    const stored = sessionStorage.getItem("aiden_quiz_token");
    if (stored) return stored;
    const token = crypto.randomUUID();
    sessionStorage.setItem("aiden_quiz_token", token);
    return token;
  });

  // Auth-based routing
  useEffect(() => {
    if (authLoading) return;
    if (user?.emailVerified) {
      navigate("/chat/aiden-powers");
    } else if (user && !user.emailVerified) {
      setRegisteredEmail(user.email);
      setRegisteredName(user.firstName);
      setFlowState("checking_email");
    } else {
      setFlowState("intro");
    }
  }, [authLoading, user, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    };
  }, []);

  // Start verification polling when entering checking_email
  useEffect(() => {
    if (flowState !== "checking_email") return;

    // Poll every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            if (pollRef.current) clearInterval(pollRef.current);
            navigate("/chat/aiden-powers");
          }
        }
      } catch {}
    }, 3000);

    // Show resend button after 30s
    resendTimerRef.current = setTimeout(() => setShowResend(true), 30000);

    // Show rescue hatch after 60s
    rescueTimerRef.current = setTimeout(() => setShowRescue(true), 60000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
      if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
    };
  }, [flowState, navigate]);

  const handleQuizOption = useCallback(
    (questionId: string, value: string) => {
      setSelectedOption(value);
      const newAnswers = { ...answers, [questionId]: value };

      // Fire quiz analytics
      const answerPayload: Record<string, string> = {};
      if (questionId === "topic") answerPayload.q1Topic = value;
      if (questionId === "feeling") answerPayload.q2Feeling = value;
      if (questionId === "outcome") answerPayload.q3Outcome = value;

      fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: quizSessionToken, ...answerPayload }),
      }).catch(() => {});

      // Auto-advance after highlight
      setTimeout(() => {
        setSelectedOption(null);
        setAnswers(newAnswers);
        setSlideDirection("left");

        if (questionId === "topic") setFlowState("q2");
        else if (questionId === "feeling") setFlowState("q3");
        else if (questionId === "outcome") {
          // Mark quiz complete
          fetch("/api/quiz/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionToken: quizSessionToken, completedQuiz: true }),
          }).catch(() => {});
          setFlowState("transition");
        }
      }, 250);
    },
    [answers, quizSessionToken],
  );

  const handleStartQuiz = useCallback(() => {
    // Create quiz analytics session
    fetch("/api/quiz/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: quizSessionToken, personaSlug: "aiden-powers" }),
    }).catch(() => {});

    setSlideDirection("left");
    setFlowState("q1");
  }, [quizSessionToken]);

  // Transition screen timer
  useEffect(() => {
    if (flowState === "transition") {
      const timer = setTimeout(() => setFlowState("gate"), 2500);
      return () => clearTimeout(timer);
    }
  }, [flowState]);

  const handleGateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setGateError("");
      setGateLoading(true);
      setExistingAccount(null);
      setSuggestedEmail(null);

      try {
        const res = await fetch("/api/auth/magic-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            firstName: firstName.trim(),
            confirmed18Plus: confirmed18,
            persona: "aiden-powers",
            quizSessionToken,
            quizData: answers as QuizAnswers,
            turnstileToken,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "EXISTING_ACCOUNT") {
            setExistingAccount({ firstName: data.firstName || "there", hasPassword: !!data.hasPassword });
          } else if (data.code === "INVALID_EMAIL" && data.suggestedCorrection) {
            setSuggestedEmail(data.suggestedCorrection);
            setGateError(data.error || "Please check your email address.");
          } else {
            setGateError(data.error || "Something went wrong. Please try again.");
          }
          // Turnstile tokens are single-use — reset so the next submit gets a fresh one.
          setTurnstileResetKey(k => k + 1);
          setGateLoading(false);
          return;
        }

        // Store JWT and transition
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem("seer-pending-persona", "aiden-powers");
        // Fire Lead now: account is created via magic-register, email captured.
        // Server has already stamped users.signupFunnel = 'aiden'.
        trackLead(email.trim(), firstName.trim()).catch(() => { /* non-blocking */ });
        setRegisteredEmail(email.trim());
        setRegisteredName(firstName.trim());
        setFlowState("checking_email");
      } catch (err: any) {
        setGateError("Something went wrong. Please try again.");
      } finally {
        setGateLoading(false);
      }
    },
    [email, firstName, confirmed18, quizSessionToken, answers, turnstileToken],
  );

  const handleResendVerification = useCallback(async () => {
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, persona: "aiden-powers" }),
      });
      setResendSent(true);
      setTimeout(() => setResendSent(false), 5000);
    } catch {}
    setResendLoading(false);
  }, [registeredEmail]);

  const handleRescueHatch = useCallback(async () => {
    setRescueLoading(true);
    // Fire InitiateCheckout for the Aiden rescue-hatch checkout. Gate on
    // signupFunnel for parity with /credits payment paths — in practice the
    // user always has signupFunnel='aiden' here since they signed up via this
    // page, but the explicit gate keeps the firing condition consistent.
    if (user?.signupFunnel === 'aiden') {
      trackInitiateCheckout(9.99, "USD", "Aiden Rescue");
    }
    try {
      const res = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: "aiden_rescue", successPath: "/chat/aiden-powers" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {}
    setRescueLoading(false);
  }, [user?.signupFunnel]);

  const handleSendMagicLink = useCallback(async () => {
    setMagicLinkLoading(true);
    try {
      await fetch("/api/auth/send-magic-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setMagicLinkSent(true);
    } catch {}
    setMagicLinkLoading(false);
  }, [email]);

  const handleChangeEmail = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setEmail(registeredEmail);
    setFirstName(registeredName);
    setShowResend(false);
    setShowRescue(false);
    setFlowState("gate");
  }, [registeredEmail, registeredName]);

  if (flowState === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  const currentStep =
    flowState === "q1" ? 0 : flowState === "q2" ? 1 : flowState === "q3" ? 2 : -1;
  const progressPercent =
    currentStep >= 0 ? ((currentStep + 1) / 3) * 100 : 0;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      {/* Progress bar (quiz only) */}
      {currentStep >= 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Logo Area (matches Evelyn lander) */}
      <div className="mb-8 flex items-center gap-3 animate-fade-in text-center relative z-10">
        <Sparkles className="w-10 h-10 text-purple-300 filter drop-shadow-lg" />
        <h1 className="font-serif text-3xl md:text-4xl text-secondary drop-shadow-md">
          The Seer Within
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto relative z-10 border border-white/20">
        {/* INTRO SCREEN */}
        {flowState === "intro" && (
          <div className="text-center animate-fadeIn">
            {/* Avatar */}
            <div className="flex justify-center mb-6 -mt-16">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-purple-100">
                <img
                  src="/uploads/avatars/aiden-powers.png"
                  alt="Aiden Powers"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl text-gray-900 tracking-widest mb-1">
              AIDEN POWERS
            </h2>
            <p className="text-gray-500 text-sm mb-4">Master Numerologist</p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
              <span className="text-yellow-500">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
              <span>4.6</span>
              <span>&#183;</span>
              <span>9,614 readings</span>
              <span>&#183;</span>
              <span>23 years experience</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-gray-200 mx-auto my-6" />

            {/* Quote */}
            <p className="text-gray-600 italic text-sm leading-relaxed mb-8 px-4">
              "I don't guess &mdash; I decode. Your birth left behind a mathematical blueprint
              that reveals your Life Path, your current cycle, and what this year's numbers
              are telling you to do."
            </p>

            {/* Free minutes badge */}
            <div className="inline-block bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 mb-6">
              <span className="text-sm text-purple-900">&#127873; 10 FREE minutes to get started</span>
            </div>

            {/* CTA */}
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              Start My Reading &rarr;
            </button>

            {/* Sign in link */}
            <p className="mt-4 text-sm text-gray-500">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                className="text-purple-600 hover:text-purple-700 underline"
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        {/* QUIZ QUESTIONS */}
        {(flowState === "q1" || flowState === "q2" || flowState === "q3") && (
          <div
            key={flowState}
            className="animate-slideIn"
          >
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <img
                src="/uploads/avatars/aiden-powers.png"
                alt="Aiden Powers"
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-400 shadow-md"
              />
            </div>

            {/* Step indicator */}
            <p className="text-center text-xs text-gray-400 mb-2">
              Step {currentStep + 1} of 3
            </p>

            {/* Question */}
            <p className="text-center text-lg text-gray-800 leading-relaxed mb-8 px-2 whitespace-pre-line">
              {QUIZ_QUESTIONS[currentStep].prompt}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {QUIZ_QUESTIONS[currentStep].options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    handleQuizOption(QUIZ_QUESTIONS[currentStep].id, opt.value)
                  }
                  disabled={selectedOption !== null}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${
                    selectedOption === opt.value
                      ? "border-purple-500 bg-purple-100 scale-[0.98]"
                      : "border-gray-200 bg-gray-50 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  <span className="text-sm text-gray-800 leading-relaxed">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TRANSITION SCREEN */}
        {flowState === "transition" && (
          <div className="text-center animate-fadeIn">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-400/40 blur-xl scale-125 animate-pulse" />
                <img
                  src="/uploads/avatars/aiden-powers.png"
                  alt="Aiden Powers"
                  className="relative w-24 h-24 rounded-full object-cover border-2 border-purple-400 shadow-lg"
                />
              </div>
            </div>
            <p className="text-lg text-gray-700 italic">
              "Let me look into this..."
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* SIGNUP GATE */}
        {flowState === "gate" && (
          <div className="animate-fadeIn">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <img
                src="/uploads/avatars/aiden-powers.png"
                alt="Aiden Powers"
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-400 shadow-md"
              />
            </div>

            {/* Urgency copy */}
            <p className="text-center text-gray-700 leading-relaxed mb-8 px-2">
              "If you walk away, I lose your read. Everything I've picked up &mdash; gone.
              It takes 10 seconds to save it."
            </p>

            <form onSubmit={handleGateSubmit} className="space-y-4">
              <input
                type="text"
                name="firstName"
                placeholder="Your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
              />
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setExistingAccount(null);
                  setGateError("");
                }}
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
              />

              {/* 18+ checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed18}
                  onChange={(e) => setConfirmed18(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-400 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-600">
                  I confirm I am 18 years or older
                </span>
              </label>

              {/* Invisible Turnstile CAPTCHA */}
              <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />

              {/* Existing account notice */}
              {existingAccount && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm">
                  {magicLinkSent ? (
                    <>
                      <p className="text-gray-800 mb-1">
                        We sent a sign-in link to <strong>{email}</strong>
                      </p>
                      <p className="text-gray-500 text-xs">
                        Check your inbox and click the link to continue your reading.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800 mb-2">
                        Welcome back, {existingAccount.firstName}! An account with this email already exists.
                      </p>
                      {existingAccount.hasPassword ? (
                        <button
                          type="button"
                          onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-sm transition-all duration-200"
                        >
                          Sign in to continue your reading
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendMagicLink}
                          disabled={magicLinkLoading}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50"
                        >
                          {magicLinkLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Sending...
                            </span>
                          ) : (
                            "Send me a sign-in link"
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {gateError && (
                <p className="text-red-600 text-sm text-center">{gateError}</p>
              )}

              {/* Did you mean? suggestion */}
              {suggestedEmail && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(suggestedEmail);
                      setSuggestedEmail(null);
                      setGateError("");
                    }}
                    className="text-purple-600 hover:text-purple-700 text-sm underline"
                  >
                    Did you mean <strong>{suggestedEmail}</strong>?
                  </button>
                </div>
              )}

              {/* CTA — hidden when existing account detected */}
              {!existingAccount && (
                <button
                  type="submit"
                  disabled={
                    !firstName.trim() ||
                    !email.trim() ||
                    !confirmed18 ||
                    gateLoading
                  }
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {gateLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save & Continue My Reading \u2192"
                  )}
                </button>
              )}
            </form>

            {/* Footer */}
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-gray-500">
                &#127873; Your first 10 minutes are free
              </p>
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

        {/* CHECK YOUR EMAIL SCREEN */}
        {flowState === "checking_email" && (
          <div className="text-center animate-fadeIn">
            {/* Avatar */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-400/30 blur-lg scale-110 animate-pulse" />
                <img
                  src="/uploads/avatars/aiden-powers.png"
                  alt="Aiden Powers"
                  className="relative w-20 h-20 rounded-full object-cover border-2 border-purple-400 shadow-md"
                />
              </div>
            </div>

            <h2 className="font-serif text-xl text-gray-900 font-semibold mb-2">Check your email</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 px-2">
              One last step, {registeredName}. I sent you a secure link to{" "}
              <span className="text-gray-900 font-medium">{registeredEmail}</span>.
              Tap it and I'll open your reading right away.
            </p>

            {/* Deep link button */}
            {(() => {
              const emailApp = getEmailAppLink(registeredEmail);
              if (!emailApp) return null;
              return (
                <a
                  href={emailApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25 mb-6"
                >
                  &#128231; {emailApp.label}
                </a>
              );
            })()}

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-6">
              <div className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin" />
              Waiting for verification...
            </div>

            {/* Spam reminder */}
            <p className="text-xs text-gray-400 mb-6">
              Check your spam or promotions folder if you don't see it in 30 seconds.
            </p>

            {/* Resend button (appears after 30s) */}
            {showResend && (
              <div className="mb-4">
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading || resendSent}
                  className="text-sm text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
                >
                  {resendSent
                    ? "Verification email sent!"
                    : resendLoading
                    ? "Sending..."
                    : "Didn't get it? Resend"}
                </button>
              </div>
            )}

            {/* Change email link */}
            <div className="mb-6">
              <button
                onClick={handleChangeEmail}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Wrong email? Change it
              </button>
            </div>

            {/* Rescue hatch (appears after 60s) */}
            {showRescue && (
              <div className="border-t border-gray-200 pt-6 mt-2">
                <p className="text-sm text-gray-600 mb-3">
                  Can't find the email?
                </p>
                <button
                  onClick={handleRescueHatch}
                  disabled={rescueLoading}
                  className="w-full py-3 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {rescueLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      Redirecting to checkout...
                    </span>
                  ) : (
                    "Start My Reading \u2014 $9.99 (3 min included)"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer (matches Evelyn lander) */}
      <footer className="mt-8 text-white/40 text-xs text-center space-y-2 relative z-10">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/privacy">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Privacy Policy</span>
          </Link>
          <span>·</span>
          <Link href="/terms">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Terms of Service</span>
          </Link>
          <span>·</span>
          <Link href="/refund">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Refund Policy</span>
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.</p>
      </footer>

      {/* Global animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
