import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { QUIZ_QUESTIONS, getEmailAppLink } from "@/lib/aidenQuizData";
// Note: we use fetch() directly instead of apiRequest() because apiRequest
// throws on non-200 responses, and we need to read the 409 body for EXISTING_ACCOUNT.
import { trackPageView, trackLead, trackInitiateCheckout } from "@/lib/facebook";

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
  const [existingAccount, setExistingAccount] = useState<{ firstName: string } | null>(null);

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

  // Track page view
  useEffect(() => {
    trackPageView();
  }, []);

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
          trackLead("");
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
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === "EXISTING_ACCOUNT") {
            setExistingAccount({ firstName: data.firstName || "there" });
          } else {
            setGateError(data.error || "Something went wrong. Please try again.");
          }
          setGateLoading(false);
          return;
        }

        // Store JWT and transition
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem("seer-pending-persona", "aiden-powers");
        setRegisteredEmail(email.trim());
        setRegisteredName(firstName.trim());
        setFlowState("checking_email");
      } catch (err: any) {
        setGateError("Something went wrong. Please try again.");
      } finally {
        setGateLoading(false);
      }
    },
    [email, firstName, confirmed18, quizSessionToken, answers],
  );

  const handleResendVerification = useCallback(async () => {
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      setResendSent(true);
      setTimeout(() => setResendSent(false), 5000);
    } catch {}
    setResendLoading(false);
  }, [registeredEmail]);

  const handleRescueHatch = useCallback(async () => {
    setRescueLoading(true);
    trackInitiateCheckout(9.99, "USD");
    try {
      const res = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: "starter", successPath: "/chat/aiden-powers" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {}
    setRescueLoading(false);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-bg-deep">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStep =
    flowState === "q1" ? 0 : flowState === "q2" ? 1 : flowState === "q3" ? 2 : -1;
  const progressPercent =
    currentStep >= 0 ? ((currentStep + 1) / 3) * 100 : 0;

  return (
    <div className="min-h-screen bg-bg-deep text-white flex flex-col">
      {/* Progress bar (quiz only) */}
      {currentStep >= 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/10">
          <div
            className="h-full bg-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* INTRO SCREEN */}
          {flowState === "intro" && (
            <div className="text-center animate-fadeIn">
              {/* Avatar */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl scale-110" />
                  <img
                    src="/uploads/avatars/aiden-powers.png"
                    alt="Aiden Powers"
                    className="relative w-32 h-32 rounded-full object-cover border-2 border-purple-400/50"
                  />
                </div>
              </div>

              <h1 className="text-2xl font-serif tracking-widest mb-1">
                AIDEN POWERS
              </h1>
              <p className="text-purple-300 text-sm mb-4">Master Numerologist</p>

              {/* Stats */}
              <div className="flex items-center justify-center gap-2 text-sm text-white/60 mb-6">
                <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
                <span>4.6</span>
                <span>&#183;</span>
                <span>9,614 readings</span>
                <span>&#183;</span>
                <span>23 years experience</span>
              </div>

              {/* Quote */}
              <p className="text-white/80 italic text-sm leading-relaxed mb-8 px-4">
                "I don't guess &mdash; I decode. Your birth left behind a mathematical blueprint
                that reveals your Life Path, your current cycle, and what this year's numbers
                are telling you to do."
              </p>

              {/* Free minutes badge */}
              <div className="inline-block bg-purple-900/40 border border-purple-500/30 rounded-lg px-4 py-2 mb-6">
                <span className="text-sm">&#127873; 3 FREE minutes to get started</span>
              </div>

              {/* CTA */}
              <button
                onClick={handleStartQuiz}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25"
              >
                Start My Reading &rarr;
              </button>

              {/* Sign in link */}
              <p className="mt-4 text-sm text-white/50">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                  className="text-purple-400 hover:text-purple-300 underline"
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
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-400/50"
                />
              </div>

              {/* Step indicator */}
              <p className="text-center text-xs text-white/40 mb-2">
                Step {currentStep + 1} of 3
              </p>

              {/* Question */}
              <p className="text-center text-lg leading-relaxed mb-8 px-2 whitespace-pre-line">
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
                        ? "border-purple-400 bg-purple-500/30 scale-[0.98]"
                        : "border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm leading-relaxed">{opt.label}</span>
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
                  <div className="absolute inset-0 rounded-full bg-purple-500/40 blur-xl scale-125 animate-pulse" />
                  <img
                    src="/uploads/avatars/aiden-powers.png"
                    alt="Aiden Powers"
                    className="relative w-24 h-24 rounded-full object-cover border-2 border-purple-400/50"
                  />
                </div>
              </div>
              <p className="text-lg text-white/80 italic">
                "Let me look into this..."
              </p>
              <div className="mt-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
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
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-400/50"
                />
              </div>

              {/* Urgency copy */}
              <p className="text-center text-white/90 leading-relaxed mb-8 px-2">
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-colors"
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-colors"
                />

                {/* 18+ checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed18}
                    onChange={(e) => setConfirmed18(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400 focus:ring-offset-0"
                  />
                  <span className="text-sm text-white/70">
                    I confirm I am 18 years or older
                  </span>
                </label>

                {/* Existing account notice */}
                {existingAccount && (
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-3 text-sm">
                    <p className="text-white/80 mb-2">
                      Welcome back, {existingAccount.firstName}! An account with this email already exists.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                      className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-sm transition-all duration-200"
                    >
                      Sign in to continue your reading
                    </button>
                  </div>
                )}

                {/* Error */}
                {gateError && (
                  <p className="text-red-400 text-sm text-center">{gateError}</p>
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
                <p className="text-sm text-white/50">
                  &#127873; Your first 3 minutes are free
                </p>
                <p className="text-sm text-white/40">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/login?returnTo=/chat/aiden-powers")}
                    className="text-purple-400 hover:text-purple-300 underline"
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
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-lg scale-110 animate-pulse" />
                  <img
                    src="/uploads/avatars/aiden-powers.png"
                    alt="Aiden Powers"
                    className="relative w-20 h-20 rounded-full object-cover border-2 border-purple-400/50"
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6 px-2">
                One last step, {registeredName}. I sent you a secure link to{" "}
                <span className="text-white font-medium">{registeredEmail}</span>.
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
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm mb-6">
                <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                Waiting for verification...
              </div>

              {/* Spam reminder */}
              <p className="text-xs text-white/30 mb-6">
                Check your spam or promotions folder if you don't see it in 30 seconds.
              </p>

              {/* Resend button (appears after 30s) */}
              {showResend && (
                <div className="mb-4">
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendSent}
                    className="text-sm text-purple-400 hover:text-purple-300 underline disabled:opacity-50"
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
                  className="text-sm text-white/40 hover:text-white/60 underline"
                >
                  Wrong email? Change it
                </button>
              </div>

              {/* Rescue hatch (appears after 60s) */}
              {showRescue && (
                <div className="border-t border-white/10 pt-6 mt-2">
                  <p className="text-sm text-white/50 mb-3">
                    Can't find the email?
                  </p>
                  <button
                    onClick={handleRescueHatch}
                    disabled={rescueLoading}
                    className="w-full py-3 rounded-xl border border-purple-500/40 bg-purple-900/30 hover:bg-purple-900/50 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {rescueLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      </div>

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
