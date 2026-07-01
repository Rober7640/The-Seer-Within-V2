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

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-6 pb-6 space-y-5">
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <img
                src="/uploads/avatars/evelyn-cross.png"
                alt="Evelyn Cross"
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-300/50"
              />
              <Sparkles className="w-4 h-4 text-purple-500 absolute -top-1 -right-1" />
            </div>
            <h1 className="font-serif text-lg text-gray-900">Evelyn Cross</h1>
          </div>

          {phase === "intro" && (
            <div className="space-y-4 text-center border-t border-purple-100 pt-5">
              <p className="font-serif text-base text-gray-800 leading-relaxed">
                Three quick taps and I'll tune into what the energy is showing me about you.
              </p>
              <Button
                onClick={beginQuiz}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Begin my reading
              </Button>
            </div>
          )}

          {phase === "quiz" && (
            <div className="space-y-4 border-t border-purple-100 pt-5">
              <div className="flex items-center justify-center gap-1.5">
                {EVELYN_QUIZ.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-purple-600" : i < step ? "w-3 bg-purple-300" : "w-3 bg-purple-100"
                    }`}
                  />
                ))}
              </div>
              <p className="font-serif text-base text-gray-900 text-center leading-relaxed">{q.prompt}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => pick(opt)}
                    disabled={!!selected}
                    className={`w-full text-left rounded-md border px-4 py-3 text-sm transition-colors disabled:cursor-default ${
                      selected === opt.value
                        ? "border-purple-500 bg-purple-50 text-purple-900"
                        : "border-purple-200 bg-white text-gray-800 hover:border-purple-400 hover:bg-purple-50/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "transition" && (
            <div className="space-y-4 text-center border-t border-purple-100 pt-6 pb-2">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-serif text-base text-gray-800">Reading the energy around your answers…</p>
            </div>
          )}

          {phase === "gate" && (
            <div className="space-y-4 border-t border-purple-100 pt-5">
              <p className="font-serif text-base text-gray-800 text-center leading-relaxed">
                Your reading is ready, love. Tell me where to send it and I'll open it for you.
              </p>

              <form onSubmit={handleGateSubmit} className="space-y-3">
                <input
                  type="text"
                  name="firstName"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-md bg-white border border-purple-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
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
                  className="w-full px-4 py-3 rounded-md bg-white border border-purple-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed18}
                    onChange={(e) => setConfirmed18(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-400 focus:ring-offset-0"
                  />
                  <span className="text-xs text-gray-600">I confirm I am 18 years or older</span>
                </label>

                <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />

                {existingAccount && (
                  <div className="bg-purple-50 border border-purple-200 rounded-md px-4 py-3 text-sm">
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
                            className="w-full mt-1 py-2.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-sm"
                          >
                            Sign in to continue
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendMagicLink}
                            disabled={magicLinkLoading}
                            className="w-full mt-1 py-2.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-sm disabled:opacity-50"
                          >
                            {magicLinkLoading ? "Sending…" : "Send me a sign-in link"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {gateError && <p className="text-red-600 text-sm text-center">{gateError}</p>}

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

                {!existingAccount && (
                  <Button
                    type="submit"
                    disabled={!firstName.trim() || !email.trim() || !confirmed18 || gateLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white disabled:opacity-40"
                  >
                    {gateLoading ? "Opening your reading…" : "Show me my reading →"}
                  </Button>
                )}
              </form>

              <p className="text-center text-xs text-gray-500">🎁 Your first 5 minutes are free</p>
            </div>
          )}

          {phase === "checking_email" && (
            <div className="space-y-4 text-center border-t border-purple-100 pt-5">
              <h2 className="font-serif text-lg text-gray-900">Check your email</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                One last step, {registeredName}. I sent a secure link to{" "}
                <span className="text-gray-900 font-medium">{registeredEmail}</span>. Tap it and I'll open your
                reading right away.
              </p>

              {(() => {
                const emailApp = getEmailAppLink(registeredEmail);
                if (!emailApp) return null;
                return (
                  <a
                    href={emailApp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium"
                  >
                    📧 {emailApp.label}
                  </a>
                );
              })()}

              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin" />
                Waiting for verification…
              </div>

              <p className="text-xs text-gray-400">
                Check your spam or promotions folder if you don't see it in 30 seconds.
              </p>

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

          {(phase === "intro" || phase === "quiz" || phase === "gate") && onAlreadyHaveAccount && (
            <div className="text-center">
              <button onClick={onAlreadyHaveAccount} className="text-xs text-purple-700 hover:underline">
                I already have an account
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
