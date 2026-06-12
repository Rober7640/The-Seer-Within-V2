// PersonaLanderPage — generalized chat-first lander for the additional personas
// (Marcus /marcus, Luna /luna, Nova /nova, Maren /maren). Persona-agnostic port of
// EvelynLanderPage: the only input is the personaSlug prop; everything else (display
// name, avatar, opener, voice) comes from the server via /api/persona-lander/:slug.
//
// Flow:
//   1. /start resolves segment + returns the persona's static opener + display info.
//   2. User sends a message → /turn → persona replies (Haiku).
//   3. Cap is 2 user messages. After turn 2 the input disables and the CTA appears.
//   4. CTA → /cta → segment-aware navigation (register carries persona context).

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { calculateTypingDelay, sleep } from "@/lib/typingAnimation";
import { track as trackPH } from "@/lib/posthog";

const AUTH_TOKEN_KEY = "seer_auth_token";
const MAX_USER_TURNS = 2;
const LANDER_SOURCE = "persona-lander";

type Segment = "v2_active" | "v2_password" | "v1_migrated" | "brand_new" | "token_magic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PersonaInfo {
  slug: string;
  displayName: string;
  avatarUrl: string;
}

interface StartResponse {
  persona: PersonaInfo;
  segment: Segment;
  firstName: string | null;
  isReturning: boolean;
  opener: string;
  brandNewSubCopy: string;
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
  const token = sp.get("token") ?? sp.get("t");
  return {
    token,
    email: sp.get("email"),
    bucket: sp.get("bucket"),
    src: sp.get("src"),
    campaign: sp.get("campaign"),
    name: sp.get("name"),
  };
}

// Fallback display info derived from the slug, used during load / on a /start error
// (so the header + a generic opener render without a round-trip).
function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function PersonaLanderPage({ personaSlug }: { personaSlug: string }) {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const SESSION_KEY = `persona_lander_token_${personaSlug}`;
  const HISTORY_KEY = `persona_lander_history_${personaSlug}`;
  const READING_DEST = `/reading?persona=${personaSlug}`;
  const fallbackName = titleCaseSlug(personaSlug);
  const fallbackFirstName = fallbackName.split(" ")[0];

  const [phase, setPhase] = useState<"loading" | "chat" | "handing_off">("loading");
  const [persona, setPersona] = useState<PersonaInfo>({
    slug: personaSlug,
    displayName: fallbackName,
    avatarUrl: `/uploads/avatars/${personaSlug}.png`,
  });
  const [segment, setSegment] = useState<Segment | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [subCopyText, setSubCopyText] = useState<string>("3 free minutes when you join.");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userTurns, setUserTurns] = useState(0);
  const [ctaReady, setCtaReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const params = readParams();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  function getSessionToken(): string {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  }
  const sessionToken = getSessionToken();

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
  function saveHistory(msgs: ChatMessage[]) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
    } catch {
      /* sessionStorage full/disabled */
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  // Logged-in user skips the lander entirely.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      clearSession();
      navigate(READING_DEST, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Resolve segment + opener via /start.
  useEffect(() => {
    if (authLoading || user) return;

    const restored = loadHistory();
    if (restored.length > 0) {
      setMessages(restored);
      setUserTurns(restored.filter((m) => m.role === "user").length);
      setFirstName(params.name ?? null);
      setPhase("chat");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/persona-lander/${personaSlug}/start`, {
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
        setPersona(data.persona);
        setSegment(data.segment);
        setFirstName(data.firstName);
        if (data.brandNewSubCopy) setSubCopyText(data.brandNewSubCopy);
        const initial: ChatMessage[] = [{ role: "assistant", content: data.opener }];
        setMessages(initial);
        saveHistory(initial);
        setPhase("chat");
      } catch {
        if (cancelled) return;
        setSegment("brand_new");
        setFirstName(params.name ?? null);
        const fallback: ChatMessage[] = [
          {
            role: "assistant",
            content: `I'm ${fallbackFirstName}. Tell me what's on your mind today and I'll see what comes through.`,
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

    const requestStart = Date.now();

    try {
      const res = await fetch(`/api/persona-lander/${personaSlug}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          userMessage: text,
          ...(userTurns === 0 ? { turnstileToken } : {}),
          history: messages,
        }),
      });
      if (!res.ok) {
        let code: string | undefined;
        try {
          const body = await res.json();
          code = body?.code;
        } catch {
          /* non-JSON error body */
        }
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

      const elapsed = Date.now() - requestStart;
      const remaining = calculateTypingDelay(data.reply) - elapsed;
      if (remaining > 0) await sleep(remaining);

      const finalHistory: ChatMessage[] = [...nextHistory, { role: "assistant", content: data.reply }];
      setMessages(finalHistory);
      saveHistory(finalHistory);
      setUserTurns((n) => n + 1);
      setTurnstileResetKey((k) => k + 1);
      if (data.ctaReady) setCtaReady(true);
    } catch {
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
    trackPH("lander_cta_clicked", { funnel: personaSlug, step: "landing" });
    try {
      const res = await fetch(`/api/persona-lander/${personaSlug}/cta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          token: params.token ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(`cta failed: ${res.status}`);
      const data: CtaResponse = await res.json();
      const emailQp = params.email ? `&email=${encodeURIComponent(params.email)}` : "";
      const nextQp = `&next=${encodeURIComponent(READING_DEST)}`;

      switch (data.action) {
        case "magic_login":
          if (data.jwt) localStorage.setItem(AUTH_TOKEN_KEY, data.jwt);
          clearSession();
          navigate(READING_DEST, { replace: true });
          return;
        case "login_with_email":
        case "login_no_password":
          clearSession();
          navigate(`/login?${emailQp.slice(1)}${nextQp}`, { replace: true });
          return;
        case "register": {
          // Persona context travels through register so the verification email URL
          // embeds ?persona=<slug>; source + landerSessionToken let the register
          // handler link the lander session row (Phase-2 drip enrollment reads it).
          const sourceQp = `&source=${LANDER_SOURCE}&landerSessionToken=${encodeURIComponent(sessionToken)}`;
          const bucketQp = params.bucket ? `&bucket=${encodeURIComponent(params.bucket)}` : "";
          clearSession();
          navigate(
            `/login?mode=signup${emailQp}&persona=${personaSlug}${sourceQp}${bucketQp}`,
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

  if (authLoading || phase === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  const ctaLabel = segment === "v1_migrated" ? "Set up your account" : "Continue your reading";
  const subCopy = subCopyFor(segment, firstName, subCopyText);
  const firstNameForCopy = persona.displayName.split(" ")[0];
  const inputDisabled = userTurns >= MAX_USER_TURNS || sending || phase === "handing_off";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <img
                src={persona.avatarUrl}
                alt={persona.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-300/50"
              />
              <Sparkles className="w-4 h-4 text-purple-500 absolute -top-1 -right-1" />
            </div>
            <h1 className="font-serif text-lg text-gray-900">{persona.displayName}</h1>
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
                      ? `Continue your reading to keep going with ${firstNameForCopy}.`
                      : `Tell ${firstNameForCopy} what's on your mind…`
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
                  ? `Two messages with ${firstNameForCopy} — then we'll keep going.`
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
                const emailQp = params.email ? `?email=${encodeURIComponent(params.email)}` : "";
                navigate(`/login${emailQp}`);
              }}
              className="text-xs text-purple-700 hover:underline"
            >
              I already have an account
            </button>
          </div>

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

function subCopyFor(
  segment: Segment | null,
  firstName: string | null,
  brandNewSubCopy: string,
): string | null {
  if (segment === "brand_new") return brandNewSubCopy;
  if (segment === "v1_migrated") return "We've kept your history — just need a password.";
  if (segment === "token_magic") return "One tap. We've got you signed in.";
  if (segment === "v2_password" && firstName) return `Welcome back, ${firstName}.`;
  return null;
}
