// EvelynQuizMechanic — the /evelyn lander (tap-quiz that has fully replaced the
// open chatbox, boss decision 2026-06-30). A 3-tap single-select quiz that, for a
// brand-new visitor, captures name+email INLINE (mirroring the Aiden quiz) and
// signs them up via /api/auth/magic-register, then shows a "check your email"
// screen that polls for verification. Known/returning visitors (arrived via an
// AWeber magic-link, existing V2, etc.) skip the gate and hand off through the
// lander's shared onComplete (handleCta), which does the magic-login / login
// redirect exactly as before.
//
// Reporting parity with Aiden: the taps also populate the persona-generic
// aiden_quiz_sessions table via /api/quiz/start + /api/quiz/answer with
// personaSlug='evelyn-cross', so the funnel (started → completed_quiz →
// completed_signup → completed_verification) is queryable in the DB by
// persona_slug, not just in PostHog.
//
// VISUAL: the layout mirrors AidenQuizPage (rounded-2xl/shadow-2xl card, logo
// header, overlapping avatar, star/stats intro block, italic persona quote,
// top progress bar + "Step N of 3", press-scale options, avatar-glow loader).
// This is presentational parity ONLY — Evelyn keeps her own avatar, name, voice,
// questions, ratings/quote/data, and every handler/prop/effect is unchanged.

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Sparkles } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { track as trackPH, identifyUser as identifyPH } from "@/lib/posthog";
import { trackLead } from "@/lib/facebook";
import { authFetch } from "@/hooks/useAuth";
import { getEmailAppLink } from "@/lib/aidenQuizData";
import { EVELYN_QUIZ, type QuizOption } from "@/lib/evelynQuizData";

const AUTH_TOKEN_KEY = "seer_auth_token";
const PERSONA_SLUG = "evelyn-cross";
const QUIZ_TOKEN_KEY = "evelyn_quiz_token";
const EVELYN_AVATAR = "/uploads/avatars/evelyn-cross.png";

type Phase = "intro" | "quiz" | "transition" | "gate" | "checking_email";

// Map an Evelyn quiz question id to its aiden_quiz_sessions column key.
const ANSWER_FIELD: Record<string, "q1Topic" | "q2Feeling" | "q3Outcome"> = {
  topic: "q1Topic",
  feeling: "q2Feeling",
  outcome: "q3Outcome",
};

/**
 * @param onComplete the lander's handleCta — the shared hand-off used for
 *   returning/known users (magic-login / login redirect).
 * @param onAlreadyHaveAccount the lander's existing-login escape hatch.
 * @param isReturningUser true when /start resolved a known segment (v2_active,
 *   v2_password, v1_migrated, token_magic). Such users skip the inline gate.
 * @param landerSessionToken the /evelyn lander session token — links the signup to
 *   the lander session so the post-verification drip fires.
 * @param bucket the lander bucket (from the URL) for drip personalisation.
 * @param prefillEmail optional email from the URL to prefill the gate.
 * @param readingDest where a verified user lands (/reading?persona=evelyn-cross).
 */
export default function EvelynQuizMechanic({
  onComplete,
  onAlreadyHaveAccount,
  isReturningUser,
  landerSessionToken,
  bucket,
  prefillEmail,
  readingDest,
}: {
  onComplete: () => void;
  onAlreadyHaveAccount?: () => void;
  isReturningUser: boolean;
  landerSessionToken: string;
  bucket: string | null;
  prefillEmail?: string | null;
  readingDest: string;
}) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Gate form state
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [confirmed18, setConfirmed18] = useState(false);
  const [gateError, setGateError] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [existingAccount, setExistingAccount] = useState<{ firstName: string; hasPassword: boolean } | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);

  // Check-your-email state
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Quiz analytics session token (populates aiden_quiz_sessions for persona_slug='evelyn-cross').
  const quizSessionToken = useRef<string>(
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem(QUIZ_TOKEN_KEY)) || crypto.randomUUID(),
  );

  // Track pending timers so a mid-transition unmount never fires setState/onComplete
  // after the component is gone.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // Poll for email verification while on the checking_email screen.
  useEffect(() => {
    if (phase !== "checking_email") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            if (pollRef.current) clearInterval(pollRef.current);
            navigate(readingDest);
          }
        }
      } catch {
        /* transient — keep polling */
      }
    }, 3000);
    const resendTimer = setTimeout(() => setShowResend(true), 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(resendTimer);
    };
  }, [phase, navigate, readingDest]);

  function beginQuiz() {
    try {
      sessionStorage.setItem(QUIZ_TOKEN_KEY, quizSessionToken.current);
    } catch {
      /* sessionStorage disabled — analytics token just won't survive refresh */
    }
    // Create the quiz-session analytics row (non-blocking).
    fetch("/api/quiz/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: quizSessionToken.current, personaSlug: PERSONA_SLUG }),
    }).catch(() => {});
    trackPH("quiz_started", { funnel: "evelyn" });
    setPhase("quiz");
  }

  function pick(opt: QuizOption) {
    if (selected) return; // ignore double-taps while auto-advancing
    setSelected(opt.value);
    const q = EVELYN_QUIZ[step];
    const nextAnswers = { ...answers, [q.id]: opt.value };
    setAnswers(nextAnswers);
    trackPH("quiz_answer", { funnel: "evelyn", step: q.id, value: opt.value });

    const isLast = step === EVELYN_QUIZ.length - 1;
    // Persist the answer to the DB funnel row (non-blocking).
    fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: quizSessionToken.current,
        [ANSWER_FIELD[q.id]]: opt.value,
        ...(isLast ? { completedQuiz: true } : {}),
      }),
    }).catch(() => {});

    later(() => {
      if (!isLast) {
        setStep((s) => s + 1);
        setSelected(null);
      } else {
        setPhase("transition");
        trackPH("quiz_completed", { funnel: "evelyn" });
        // Brief "reading the energy" beat, then either the shared hand-off
        // (returning users) or the inline signup gate (brand-new users).
        later(() => {
          if (isReturningUser) {
            onComplete();
          } else {
            setPhase("gate");
          }
        }, 1200);
      }
    }, 280);
  }

  const handleGateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setGateError("");
      setGateLoading(true);
      setExistingAccount(null);
      setSuggestedEmail(null);
      try {
        // fetch() directly (not apiRequest) so we can read the 409 EXISTING_ACCOUNT body.
        const res = await fetch("/api/auth/magic-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            firstName: firstName.trim(),
            confirmed18Plus: confirmed18,
            persona: PERSONA_SLUG,
            source: "evelyn-lander",
            landerSessionToken,
            bucket: bucket ?? undefined,
            quizSessionToken: quizSessionToken.current,
            quizData: {
              topic: answers.topic ?? "",
              feeling: answers.feeling ?? "",
              outcome: answers.outcome ?? "",
            },
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
          setTurnstileResetKey((k) => k + 1);
          setGateLoading(false);
          return;
        }

        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        // Lead + identify now that the account exists and email is captured.
        trackLead(email.trim(), firstName.trim()).catch(() => {});
        identifyPH(email.trim(), { funnel: "evelyn", first_name: firstName.trim() });
        trackPH("lead_captured", { funnel: "evelyn", step: "gate" });
        setRegisteredEmail(email.trim());
        setRegisteredName(firstName.trim());
        setPhase("checking_email");
      } catch {
        setGateError("Something went wrong. Please try again.");
      } finally {
        setGateLoading(false);
      }
    },
    [email, firstName, confirmed18, landerSessionToken, bucket, answers, turnstileToken],
  );

  const handleSendMagicLink = useCallback(async () => {
    setMagicLinkLoading(true);
    try {
      await fetch("/api/auth/send-magic-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setMagicLinkSent(true);
    } catch {
      /* non-blocking */
    }
    setMagicLinkLoading(false);
  }, [email]);

  const handleResendVerification = useCallback(async () => {
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, persona: PERSONA_SLUG }),
      });
      setResendSent(true);
      setTimeout(() => setResendSent(false), 5000);
    } catch {
      /* non-blocking */
    }
    setResendLoading(false);
  }, [registeredEmail]);

  function goToLogin() {
    const emailQp = registeredEmail || email ? `&email=${encodeURIComponent(registeredEmail || email)}` : "";
    navigate(`/login?next=${encodeURIComponent(readingDest)}${emailQp}`);
  }

  const q = EVELYN_QUIZ[step];
  const currentStep = phase === "quiz" ? step : -1;
  const progressPercent = currentStep >= 0 ? ((currentStep + 1) / EVELYN_QUIZ.length) * 100 : 0;

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

      {/* Logo Area */}
      <div className="mb-8 flex items-center gap-3 animate-fade-in text-center relative z-10">
        <Sparkles className="w-10 h-10 text-purple-300 filter drop-shadow-lg" />
        <h1 className="font-serif text-3xl md:text-4xl text-secondary drop-shadow-md">
          The Seer Within
        </h1>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full mx-auto relative z-10 border border-white/20">
        {/* INTRO SCREEN */}
        {phase === "intro" && (
          <div className="text-center animate-fadeIn">
            {/* Avatar */}
            <div className="flex justify-center mb-6 -mt-16">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-purple-100">
                <img
                  src={EVELYN_AVATAR}
                  alt="Evelyn Cross"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl text-gray-900 tracking-widest mb-1">
              EVELYN CROSS
            </h2>
            <p className="text-gray-500 text-sm mb-4">Intuitive Reader &amp; Spiritual Guide</p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
              <span className="text-yellow-500">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span>4.9</span>
              <span>&#183;</span>
              <span>10,000+ readings</span>
              <span>&#183;</span>
              <span>20 years reading energy</span>
            </div>

            {/* Divider */}
            <div className="w-16 h-0.5 bg-gray-200 mx-auto my-6" />

            {/* Quote */}
            <p className="text-gray-600 italic text-sm leading-relaxed mb-8 px-4">
              "I don't tell you what you want to hear &mdash; I read what's actually there.
              The energy around you leaves traces: what's blocking your heart, where your
              money is stuck, and what your path is quietly asking of you."
            </p>

            {/* Free minutes badge */}
            <div className="inline-block bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 mb-6">
              <span className="text-sm text-purple-900">&#127873; 5 FREE minutes to get started</span>
            </div>

            {/* Lead-in (Evelyn's voice) */}
            <p className="text-gray-600 text-sm mb-4">
              Three quick taps and I'll tune into what the energy is showing me about you.
            </p>

            {/* CTA */}
            <button
              onClick={beginQuiz}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              Begin My Reading &rarr;
            </button>

            {/* Sign in link */}
            {onAlreadyHaveAccount && (
              <p className="mt-4 text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  onClick={onAlreadyHaveAccount}
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}

        {/* QUIZ QUESTIONS */}
        {phase === "quiz" && (
          <div key={step} className="animate-slideIn">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <img
                src={EVELYN_AVATAR}
                alt="Evelyn Cross"
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-400 shadow-md"
              />
            </div>

            {/* Step indicator */}
            <p className="text-center text-xs text-gray-400 mb-2">
              Step {currentStep + 1} of {EVELYN_QUIZ.length}
            </p>

            {/* Question */}
            <p className="text-center text-lg text-gray-800 leading-relaxed mb-8 px-2">
              {q.prompt}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => pick(opt)}
                  disabled={!!selected}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 disabled:cursor-default ${
                    selected === opt.value
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
        {phase === "transition" && (
          <div className="text-center animate-fadeIn">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-400/40 blur-xl scale-125 animate-pulse" />
                <img
                  src={EVELYN_AVATAR}
                  alt="Evelyn Cross"
                  className="relative w-24 h-24 rounded-full object-cover border-2 border-purple-400 shadow-lg"
                />
              </div>
            </div>
            <p className="text-lg text-gray-700 italic">
              Reading the energy around your answers&hellip;
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* SIGNUP GATE */}
        {phase === "gate" && (
          <div className="animate-fadeIn">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <img
                src={EVELYN_AVATAR}
                alt="Evelyn Cross"
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-400 shadow-md"
              />
            </div>

            {/* Gate copy (Evelyn's voice) */}
            <p className="text-center text-gray-700 leading-relaxed mb-8 px-2">
              Your reading is ready, love. Tell me where to send it and I'll open it for you.
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
                <span className="text-sm text-gray-600">I confirm I am 18 years or older</span>
              </label>

              {/* Invisible Turnstile CAPTCHA */}
              <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />

              {/* Existing account notice */}
              {existingAccount && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm">
                  {magicLinkSent ? (
                    <>
                      <p className="text-gray-800 mb-1">
                        I sent a sign-in link to <strong>{email}</strong>
                      </p>
                      <p className="text-gray-500 text-xs">Tap it and I'll open your reading.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800 mb-2">
                        Welcome back, {existingAccount.firstName}. You already have an account with this email.
                      </p>
                      {existingAccount.hasPassword ? (
                        <button
                          type="button"
                          onClick={goToLogin}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-sm transition-all duration-200"
                        >
                          Sign in to continue
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
                              Sending&hellip;
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
              {gateError && <p className="text-red-600 text-sm text-center">{gateError}</p>}

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
                  disabled={!firstName.trim() || !email.trim() || !confirmed18 || gateLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {gateLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Opening your reading&hellip;
                    </span>
                  ) : (
                    "Show me my reading →"
                  )}
                </button>
              )}
            </form>

            {/* Footer */}
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-gray-500">&#127873; Your first 5 minutes are free</p>
              {onAlreadyHaveAccount && (
                <p className="text-sm text-gray-400">
                  Already have an account?{" "}
                  <button
                    onClick={onAlreadyHaveAccount}
                    className="text-purple-600 hover:text-purple-700 underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* CHECK YOUR EMAIL SCREEN */}
        {phase === "checking_email" && (
          <div className="text-center animate-fadeIn">
            {/* Avatar */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-400/30 blur-lg scale-110 animate-pulse" />
                <img
                  src={EVELYN_AVATAR}
                  alt="Evelyn Cross"
                  className="relative w-20 h-20 rounded-full object-cover border-2 border-purple-400 shadow-md"
                />
              </div>
            </div>

            <h2 className="font-serif text-xl text-gray-900 font-semibold mb-2">Check your email</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6 px-2">
              One last step, {registeredName}. I sent a secure link to{" "}
              <span className="text-gray-900 font-medium">{registeredEmail}</span>. Tap it and I'll open
              your reading right away.
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
              Waiting for verification&hellip;
            </div>

            {/* Spam reminder */}
            <p className="text-xs text-gray-400 mb-6">
              Check your spam or promotions folder if you don't see it in 30 seconds.
            </p>

            {/* Resend button (appears after 30s) */}
            {showResend && (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading || resendSent}
                className="text-sm text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
              >
                {resendSent ? "Verification email sent!" : resendLoading ? "Sending…" : "Didn't get it? Resend"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
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
        <p>&copy; {new Date().getFullYear()} The Seer Within. For Entertainment Purposes Only.</p>
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
