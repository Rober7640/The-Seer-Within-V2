// EvelynLanderPage — chat-first lander for /evelyn.
//
// Flow (PRD docs/prd-evelyn-lander.md §5–§6):
//   1. /api/evelyn-lander/start resolves segment + returns Evelyn's static opener.
//   2. User sends a message → /api/evelyn-lander/turn → Evelyn replies (Haiku).
//   3. Cap is 2 user messages. After turn 2 the input is disabled and the
//      primary CTA card appears.
//   4. CTA → /api/evelyn-lander/cta → segment-aware navigation.
//
// Anonymous session id lives in sessionStorage so a refresh resumes the
// server-side turn counter on the same session row.

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { calculateTypingDelay, sleep } from "@/lib/typingAnimation";
// Moved out of this file into a shared lib so LiveThreadLander (Task 11) can
// reuse the SAME helper — importing it back out of this page would create a
// cycle, since this page renders that component. Implementation unchanged.
import { createTimeoutSignal } from "@/lib/timeoutSignal";
import { track as trackPH } from "@/lib/posthog";
import { useABVariant } from "@/hooks/useABTest";
import EvelynQuizMechanic from "@/pages/evelyn-lander/EvelynQuizMechanic";

// The lander MECHANIC is a Phase 4c structural A/B (`evelyn_lander_mechanic`):
// control 'chatbox' = the open 2-turn chat below; treatment 'quiz' = the 3-tap
// quiz. The quiz shipped as the sole surface first (boss decision 2026-06-30);
// the experiment is now re-wired so that when it is Started, visitors split 50/50
// chatbox vs quiz. While it is OFF the lander defaults to 'quiz' (unchanged prod
// behaviour). The chatbox is also reachable via a non-prod `?mechanic=chatbox`
// override for QA.

const AUTH_TOKEN_KEY = "seer_auth_token";
const EVELYN_PERSONA_SLUG = "evelyn-cross";
const READING_DEST = `/reading?persona=${EVELYN_PERSONA_SLUG}`;
const SESSION_KEY = "evelyn_lander_token";
const HISTORY_KEY = "evelyn_lander_history";
const MAX_USER_TURNS = 2;
// Bounds how long a caller can be stuck waiting on /start (e.g. a stalled
// mobile connection) before we give up and fall through to the catch block,
// which never rethrows — the caller always gets control back within this
// budget. Two different budgets for two different costs of waiting:
//
// - Anonymous chat flow (`START_TIMEOUT_MS`, 10s): worth waiting longer for,
//   because timing out here doesn't just lose attribution — /start is the
//   ONLY call that creates the lander session row server-side. If it never
//   completes, no row exists, and the chat that renders anyway (postStart's
//   catch falls back to a client-only placeholder opener) is a dead end:
//   the later /turn and /cta calls 404 against a session that was never
//   created (server/routes/evelynLander.ts — session lookup in both
//   handlers). 10s rides out a slow/cold mobile network + server round trip
//   without false-triggering on ordinary latency (server's own outbound
//   timeouts elsewhere in this codebase use 5s for third-party calls; this
//   is a client→our-API call over a possibly poor connection, so it gets
//   more slack).
// - Already-logged-in redirect (`REDIRECT_START_TIMEOUT_MS`, 4s, operator
//   ruling): the reader sees nothing while this runs — no chat, no risk of
//   a dead-end session — and pre-Task-5 this redirect was instant. Waiting
//   here buys ONLY attribution for that one visit; if it times out, the
//   catch's `applyState=false` path already returns having written no
//   state, and the effect proceeds straight to navigate() same as any other
//   failure. A long stall reads as a broken page and the bounce it risks
//   costs more than one unrecorded visit, so this budget is kept short
//   deliberately.
const START_TIMEOUT_MS = 10_000;
const REDIRECT_START_TIMEOUT_MS = 4_000;

type Segment = "v2_active" | "v2_password" | "v1_migrated" | "brand_new" | "token_magic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StartResponse {
  segment: Segment;
  firstName: string | null;
  isReturning: boolean;
  opener: string;
}

interface TurnResponse {
  reply: string;
  ctaReady: boolean;
  blocked?: "cap" | "safety";
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
  mechanic: string | null; // non-prod preview override (?mechanic=quiz|chatbox)
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
    mechanic: sp.get("mechanic"),
  };
}

function getSessionToken(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, fresh);
  return fresh;
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(HISTORY_KEY);
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: any): m is ChatMessage =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    );
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage full / disabled — chat just won't survive refresh.
  }
}

export default function EvelynLanderPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [phase, setPhase] = useState<"loading" | "chat" | "handing_off">("loading");
  const [segment, setSegment] = useState<Segment | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userTurns, setUserTurns] = useState(0);
  const [ctaReady, setCtaReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Cloudflare Turnstile — required on the first user message (PRD §7.3).
  // Token is single-use; resetKey bumps issue a fresh one after each send.
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const params = readParams();
  const sessionToken = getSessionToken();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Resolve the lander MECHANIC via the `evelyn_lander_mechanic` structural A/B
  // (visitor-scoped, scope.route='evelyn_lander', element='mechanic'): control
  // 'chatbox' = the open 2-turn chat below; treatment 'quiz' = the 3-tap quiz.
  // While the experiment is OFF (draft/paused) /assign omits it and useABVariant
  // falls back to the 'quiz' default, so prod stays 100% quiz — byte-identical to
  // the previous hard-pin. When an admin Starts the test, visitors split 50/50
  // sticky by the ab_vid cookie. The mechanic only changes the ENGAGEMENT layer;
  // BOTH arms run the same /start (creates the lander session) and finish through
  // the same handleCta (segment-aware routing + session linkage), so the 5-min
  // grant and the drip are identical regardless of mechanic. A non-prod
  // `?mechanic=quiz|chatbox` override wins for manual QA.
  const overrideMechanic =
    import.meta.env.DEV && (params.mechanic === "quiz" || params.mechanic === "chatbox")
      ? params.mechanic
      : null;
  const assignment = useABVariant("evelyn_lander", "mechanic", "quiz");
  const mechanic = overrideMechanic ?? assignment.variant;
  // Hold first paint until the assignment resolves so we never flash the default
  // mechanic and then swap. A DEV override is immediately ready.
  const mechanicReady = overrideMechanic != null ? true : assignment.ready;

  function goToExistingLogin() {
    clearSession();
    const emailQp = params.email ? `?email=${encodeURIComponent(params.email)}` : "";
    navigate(`/login${emailQp}`);
  }

  // Auto-scroll to newest message when the thread grows.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  // Resolve segment + opener via /start. Shared by both the anonymous chat
  // flow and the already-logged-in redirect below, so the lander session gets
  // written (and, for a logged-in caller, the server's JWT branch resolves
  // `v2_active`) before anyone leaves this page.
  //
  // `isCancelled` lets a caller's effect suppress the state updates if it
  // unmounted/re-ran mid-flight; it defaults to "never cancelled" for callers
  // that don't need that guard.
  //
  // `applyState` lets a caller skip the UI-facing state writes (segment/
  // firstName/messages/phase) entirely while still making the request and
  // getting the same error handling. The already-logged-in redirect passes
  // `false`: it only needs the POST to land (session recorded, JWT resolved
  // server-side) and is about to navigate away, so there's nothing to render
  // and no reason to ever flip `phase` away from "loading" on that path. This
  // is what keeps the render gate below (`phase === "loading"`) *structurally*
  // true for a logged-in visitor, not just true-by-timing.
  //
  // `timeoutMs` bounds how long the fetch can hang (via createTimeoutSignal,
  // see its comment for the browser-support story) so a stalled connection
  // can't leave a caller awaiting this forever — see requirement 3 in the
  // task brief ("network error, 500, timeout"). Two callers, two budgets:
  // START_TIMEOUT_MS (anonymous) vs. REDIRECT_START_TIMEOUT_MS (logged-in
  // redirect) — see the comment on those constants for why they differ. A
  // timeout surfaces as a TimeoutError DOMException on modern browsers, or
  // an AbortError on the older-browser fallback path; both land in the
  // existing catch block and are treated like any other failure — it never
  // rethrows, so `await postStart(...)` always resolves.
  async function postStart({
    isCancelled = () => false,
    applyState = true,
    timeoutMs = START_TIMEOUT_MS,
  }: {
    isCancelled?: () => boolean;
    applyState?: boolean;
    timeoutMs?: number;
  } = {}): Promise<void> {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs);
    try {
      // Send the stored JWT if there is one, so /start can resolve an
      // already-signed-in reader to `v2_active` instead of `brand_new`.
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch("/api/evelyn-lander/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
        body: JSON.stringify({
          sessionToken,
          email: params.email ?? undefined,
          token: params.token ?? undefined,
          bucket: params.bucket ?? undefined,
          src: params.src ?? undefined,
          campaign: params.campaign ?? undefined,
          name: params.name ?? undefined,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`start failed: ${res.status}`);
      const data: StartResponse = await res.json();
      if (isCancelled() || !applyState) return;
      setSegment(data.segment);
      setFirstName(data.firstName);
      const initial: ChatMessage[] = [{ role: "assistant", content: data.opener }];
      setMessages(initial);
      saveHistory(initial);
      setPhase("chat");
    } catch (err) {
      // Breadcrumb so a silent failure here (including the older-browser
      // signal-construction TypeError this used to swallow without a trace)
      // is findable in production instead of invisible. Matches this
      // codebase's existing swallow-but-log convention for recoverable
      // client-side fetch failures (see e.g. useConversation.ts, useUpsellChat.ts).
      console.error("[EvelynLanderPage] postStart failed:", err);
      if (isCancelled() || !applyState) return;
      // No lander session row was created on this failure (that INSERT lives
      // entirely inside the /start handler — see server/routes/evelynLander.ts).
      // The chat below is a client-only placeholder standing in for a session
      // that doesn't exist server-side: the later /turn and /cta calls will
      // 404 against it (session lookups in the same file) unless a retry or
      // page refresh gets a real /start call through first.
      setSegment("brand_new");
      setFirstName(params.name ?? null);
      const fallback: ChatMessage[] = [
        {
          role: "assistant",
          content:
            "I'm Evelyn. I read for love, money, and purpose. Tell me what's on your mind today and I'll see what comes through.",
        },
      ];
      setMessages(fallback);
      saveHistory(fallback);
      setPhase("chat");
    } finally {
      cleanup();
    }
  }

  // PRD §3 critical rule: logged-in V2 user skips the lander entirely. We now
  // await /start first (with the caller's JWT attached, applyState=false so
  // it never touches render state) so the visit still gets recorded — and
  // the server can resolve `v2_active` — before we send them on to /reading.
  // postStart swallows its own failures internally (see its catch block) and
  // is bounded by REDIRECT_START_TIMEOUT_MS (short — see that constant's
  // comment for why this path uses a different budget than the anonymous
  // flow), so it always settles: a network error, a 500, or a stalled
  // connection can never strand a logged-in reader on the lander waiting on
  // this await.
  //
  // This effect closes over `postStart` (a fresh function identity every
  // render) without listing it as a dependency. That's deliberate, not an
  // oversight: exhaustive-deps' own suggested fix — adding `postStart` — would
  // make this effect re-run on every unrelated re-render while it's in
  // flight (new identity each time), firing a fresh /start POST each time.
  // authLoading/user are what actually gate this effect's meaning; they each
  // settle once per mount (see useAuth.ts:68-111), so listing only those
  // (plus the stable `navigate` from wouter) is correct.
  //
  // Note: `user`'s identity can in principle change again after that initial
  // settle via useAuth's cross-instance AUTH_SYNC_EVENT listener
  // (useAuth.ts:114-121), which would re-run this effect. On /evelyn today
  // nothing else mounts a second useAuth() instance to broadcast that event,
  // so it can't fire in practice — and if it ever did, it'd be benign: the
  // repeat /start insert is idempotent server-side, and the stale run's
  // navigate is already gated by `cancelled`.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let cancelled = false;
    (async () => {
      await postStart({
        isCancelled: () => cancelled,
        applyState: false,
        timeoutMs: REDIRECT_START_TIMEOUT_MS,
      });
      if (!cancelled) {
        clearSession();
        navigate(READING_DEST, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  // Resolve segment + opener via /start. Fires on mount for BOTH arms (parallel
  // with /assign, not serialized behind it) so the lander session exists for the
  // shared handleCta and there's no added latency while the experiment is OFF.
  // The quiz arm ignores the opener; it just needs the session.
  useEffect(() => {
    if (authLoading || user) return;

    // If we have history from a refresh, restore it and skip the /start call.
    const restored = loadHistory();
    if (restored.length > 0) {
      setMessages(restored);
      setUserTurns(restored.filter((m) => m.role === "user").length);
      setSegment(null);
      setFirstName(params.name ?? null);
      setPhase("chat");
      return;
    }

    let cancelled = false;
    postStart({ isCancelled: () => cancelled }); // applyState/timeoutMs use their defaults (true / START_TIMEOUT_MS)
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending || userTurns >= MAX_USER_TURNS) return;

    setErrorMsg(null);
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    saveHistory(nextHistory);
    setDraft("");
    setSending(true);

    const requestStart = Date.now();

    try {
      const res = await fetch("/api/evelyn-lander/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          userMessage: text,
          // Server only verifies on first user message; after that we omit it.
          ...(userTurns === 0 ? { turnstileToken } : {}),
          // Send everything BEFORE the new user message — server appends it.
          history: messages,
        }),
      });
      if (!res.ok) {
        // Surface Turnstile failures specifically so the user gets actionable copy.
        let code: string | undefined;
        try {
          const body = await res.json();
          code = body?.code;
        } catch {
          // ignore non-JSON error bodies
        }
        // Roll back the optimistic user message + reissue a fresh Turnstile token.
        setMessages(messages);
        saveHistory(messages);
        setDraft(text);
        setTurnstileResetKey((k) => k + 1);
        if (code === "TURNSTILE_FAILED") {
          setErrorMsg("Security check failed. Please try again in a moment.");
        } else if (res.status === 429) {
          setErrorMsg("You're sending messages too quickly. Take a breath and try again shortly.");
        } else {
          setErrorMsg("Something interrupted the connection. Try sending again.");
        }
        return;
      }
      const data: TurnResponse = await res.json();

      // Hold the reply behind a read-speed delay so it doesn't feel instant.
      // Subtract elapsed network time so we don't double-wait when Haiku is slow.
      const elapsed = Date.now() - requestStart;
      const remaining = calculateTypingDelay(data.reply) - elapsed;
      if (remaining > 0) await sleep(remaining);

      const finalHistory: ChatMessage[] = [...nextHistory, { role: "assistant", content: data.reply }];
      setMessages(finalHistory);
      saveHistory(finalHistory);
      setUserTurns((n) => n + 1);
      // Token was single-use; bump resetKey so the widget issues a fresh one
      // even though we won't send it on subsequent turns (defensive — keeps the
      // widget healthy if a refresh resumes mid-session).
      setTurnstileResetKey((k) => k + 1);
      if (data.ctaReady) setCtaReady(true);
    } catch {
      // Roll back the user message on hard failure so the user can retry.
      setMessages(messages);
      saveHistory(messages);
      setDraft(text);
      setErrorMsg("Something interrupted the connection. Try sending again.");
    } finally {
      setSending(false);
    }
  }

  async function handleCta() {
    setPhase("handing_off");
    setErrorMsg(null);
    trackPH("lander_cta_clicked", { funnel: "evelyn", step: "landing" });
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
          clearSession();
          navigate(READING_DEST, { replace: true });
          return;
        case "login_with_email":
        case "login_no_password":
          // V2-with-password: standard login. V1-migrated: same destination,
          // server-side NO_PASSWORD detection auto-sends a magic link from /login.
          clearSession();
          navigate(`/login?${emailQp.slice(1)}${nextQp}`, { replace: true });
          return;
        case "register": {
          // Persona context must travel through the register flow so the
          // verification email URL embeds ?persona=evelyn-cross. Without it,
          // post-verification the user lands on /reading with no persona and
          // gets bounced to /personas instead of Evelyn's chat.
          //
          // We also pass `source=evelyn-lander` + `landerSessionToken` so the
          // /api/auth/register handler can (a) link the lander session row to
          // the new user and (b) schedule the Evelyn unverified-track drip.
          // `bucket` is forwarded too so Drip 1's static content can use the
          // bucket-specific phrase.
          const sourceQp = `&source=evelyn-lander&landerSessionToken=${encodeURIComponent(sessionToken)}`;
          const bucketQp = params.bucket ? `&bucket=${encodeURIComponent(params.bucket)}` : "";
          clearSession();
          navigate(
            `/login?mode=signup${emailQp}&persona=${EVELYN_PERSONA_SLUG}${sourceQp}${bucketQp}`,
            { replace: true },
          );
          return;
        }
        case "already_logged_in":
          clearSession();
          navigate(READING_DEST, { replace: true });
          return;
      }
    } catch {
      setPhase("chat");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  // One gate for BOTH arms: wait for auth, the mechanic assignment, AND /start
  // (so the lander session exists before the quiz can hand off via handleCta).
  // A logged-in user stays here (phase never leaves 'loading') until the
  // redirect effect fires: it calls postStart with applyState=false, which
  // structurally skips every setSegment/setFirstName/setMessages/setPhase
  // call on that path (see postStart's own comment above) rather than relying
  // on scheduler/microtask ordering to avoid a flash. So neither arm ever
  // renders for a logged-in user — this component either shows the spinner
  // or is in the middle of unmounting via navigate().
  if (authLoading || !mechanicReady || phase === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  // The tap-quiz mechanic (the live /evelyn surface). Brand-new visitors sign up
  // INLINE on the quiz (name+email → magic-register) and see a "check your email"
  // screen; returning/known visitors skip that and hand off through the SAME
  // handleCta (segment-aware magic-login / login redirect). `isReturningUser` is
  // true for any resolved non-brand-new segment. A still-unresolved segment (null)
  // is treated as brand-new so a new visitor is never blocked from signing up.
  if (mechanic === "quiz") {
    return (
      <EvelynQuizMechanic
        onComplete={handleCta}
        onAlreadyHaveAccount={goToExistingLogin}
        isReturningUser={segment != null && segment !== "brand_new"}
        landerSessionToken={sessionToken}
        bucket={params.bucket}
        prefillEmail={params.email}
        readingDest={READING_DEST}
      />
    );
  }

  const ctaLabel = ctaLabelFor(segment);
  const subCopy = subCopyFor(segment, firstName);
  const inputDisabled = userTurns >= MAX_USER_TURNS || sending || phase === "handing_off";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-6 pb-6 space-y-4">
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

          <div className="border-t border-purple-100 pt-4 space-y-3 max-h-[55vh] overflow-y-auto">
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {errorMsg && <p className="text-sm text-red-600 text-center">{errorMsg}</p>}

          {!ctaReady && (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    inputDisabled
                      ? "Continue your reading to keep going with Evelyn."
                      : "Tell Evelyn what's on your mind…"
                  }
                  disabled={inputDisabled}
                  rows={2}
                  className="flex-1 resize-none rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={inputDisabled || draft.trim().length === 0}
                  size="icon"
                  className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 text-center">
                {userTurns === 0
                  ? "Two messages with Evelyn — then we'll keep going."
                  : "One more message before we continue."}
              </p>
            </div>
          )}

          {ctaReady && (
            <div className="space-y-3 border-t border-purple-100 pt-4">
              {subCopy && <p className="text-sm text-gray-600 text-center">{subCopy}</p>}
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
            </div>
          )}

          <div className="text-center">
            <button
              onClick={goToExistingLogin}
              className="text-xs text-purple-700 hover:underline"
            >
              I already have an account
            </button>
          </div>

          {/* Invisible Turnstile — required on the first user message. */}
          <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />
        </CardContent>
      </Card>
    </div>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "assistant") {
    return (
      <div className="flex">
        <div className="bg-purple-50 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%] text-sm leading-relaxed font-serif">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start w-full animate-fade-in">
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function ctaLabelFor(segment: Segment | null): string {
  if (segment === "v1_migrated") return "Set up your account";
  return "Continue your reading";
}

function subCopyFor(segment: Segment | null, firstName: string | null): string | null {
  if (segment === "brand_new") return "5 free minutes when you join.";
  if (segment === "v1_migrated") return "We've kept your history — just need a password.";
  if (segment === "token_magic") return "One tap. We've got you signed in.";
  if (segment === "v2_password" && firstName) return `Welcome back, ${firstName}.`;
  return null;
}
