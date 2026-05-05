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
import { trackPageView } from "@/lib/facebook";

const AUTH_TOKEN_KEY = "seer_auth_token";
const EVELYN_PERSONA_SLUG = "evelyn-cross";
const READING_DEST = `/reading?persona=${EVELYN_PERSONA_SLUG}`;
const SESSION_KEY = "evelyn_lander_token";
const HISTORY_KEY = "evelyn_lander_history";
const MAX_USER_TURNS = 2;

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

  const params = readParams();
  const sessionToken = getSessionToken();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to newest message when the thread grows.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  useEffect(() => {
    trackPageView();
  }, []);

  // PRD §3 critical rule: logged-in V2 user skips the lander entirely.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      clearSession();
      navigate(READING_DEST, { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Resolve segment + opener via /start.
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
        const initial: ChatMessage[] = [{ role: "assistant", content: data.opener }];
        setMessages(initial);
        saveHistory(initial);
        setPhase("chat");
      } catch {
        if (cancelled) return;
        // PRD §9: param-validation / start failures fall through gracefully.
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
      }
    })();
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

    try {
      const res = await fetch("/api/evelyn-lander/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          userMessage: text,
          // Send everything BEFORE the new user message — server appends it.
          history: messages,
        }),
      });
      if (!res.ok) throw new Error(`turn failed: ${res.status}`);
      const data: TurnResponse = await res.json();

      const finalHistory: ChatMessage[] = [...nextHistory, { role: "assistant", content: data.reply }];
      setMessages(finalHistory);
      saveHistory(finalHistory);
      setUserTurns((n) => n + 1);
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
        case "register":
          clearSession();
          navigate(`/login?mode=signup${emailQp}`, { replace: true });
          return;
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

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
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
              onClick={() => {
                clearSession();
                const emailQp = params.email
                  ? `?email=${encodeURIComponent(params.email)}`
                  : "";
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
    <div className="flex">
      <div className="bg-purple-50 rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
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
