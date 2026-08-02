// LiveThreadLander — the "Live Thread" arrival surface for /evelyn.
//
// Spec: docs/superpowers/specs/2026-08-01-live-thread-arrival-design.md
// Plan: docs/superpowers/plans/2026-08-01-live-thread-evelyn.md (Task 11)
//
// The reader clicked a link in one of Evelyn's daily emails. The short-link
// redirector already resolved that campaign into a `continueSeed` — the line
// that continues the email, in Evelyn's voice — and this component is the page
// that renders it as a chat thread the reader can answer immediately, before
// any signup ask.
//
// Frames, in order:
//   Frame 1   — Evelyn's continueSeed bubble + a real compose bar.
//   Frame 1.5 — the reader's reply is POSTed to /api/evelyn-lander/reply and
//               PARKED server-side (pendingReply). Only once that write lands
//               does the email field appear. That ordering is the whole point:
//               the reply must survive even if the reader abandons here or
//               account detection fails, so it is never gated behind an email.
//   Frame 2 / 2b / 2c — one confirmation bubble per /check-email outcome.
//
// This is a FUNCTIONAL SKELETON matching the wireframes' behaviour contract,
// not final visual styling (plan §Task 11 Step 4 says so explicitly). It follows
// the chat-bubble conventions already in EvelynLanderPage.tsx / evelyn-lander/
// so the two arms of the experiment look like the same product.

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Lock } from "lucide-react";
import CrisisDisclaimer from "@/components/CrisisDisclaimer";
import { createTimeoutSignal } from "@/lib/timeoutSignal";

// The three outcomes of POST /api/evelyn-lander/check-email
// (server/routes/evelynLander.ts:849-945). Named exactly as the route returns
// them so the union and the wire format cannot drift.
export type LiveThreadOutcome = "verified_match" | "unverified_match" | "no_match";

interface Props {
  continueSeed: string;
  sessionToken: string;
  onOutcome: (outcome: LiveThreadOutcome, email: string) => void;
  /**
   * Best-effort email hint from the link's `?email={!email}` merge tag, used to
   * prefill the Frame 1.5 field (spec §Decisions, "read by the redirector to
   * prefill the Frame 1.5 email field and nothing else"). NEVER trusted for
   * identity — the reader still submits it and /check-email still resolves the
   * account from what's actually submitted; this only saves a typing step on
   * the most conversion-critical field in the flow.
   *
   * Type and `?? ""` handling deliberately match the sibling arm's identical
   * prop (EvelynQuizMechanic.tsx:74, :85), which is already fed
   * `params.email` (string | null) by EvelynLanderPage.tsx:566.
   */
  prefillEmail?: string | null;
}

// Both budgets bound a client -> our-API round trip over a possibly poor mobile
// connection, matching EvelynLanderPage's START_TIMEOUT_MS reasoning (10s: rides
// out a cold mobile network without false-triggering on ordinary latency).
//
// /check-email gets a little more room because it does strictly more work inside
// the request than /reply does: a DB lookup, a magic-link mint, and an awaited
// outbound Resend call (evelynLander.ts:762). Its Resend failure path is already
// caught server-side, so the extra budget covers a slow send, not a hung one.
const REPLY_TIMEOUT_MS = 10_000;
const CHECK_EMAIL_TIMEOUT_MS = 12_000;

// Mirrors replySchema's `.max(2000)` (evelynLander.ts:86) so an over-long reply
// is prevented in the textarea rather than bounced as an opaque 400.
const MAX_REPLY_LENGTH = 2000;

// Deliberately loose — this exists only to stop an obvious typo burning one of
// the reader's 10/hr accountDetectionLimiter attempts. The server's
// `z.string().email()` remains the real validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EVELYN_AVATAR = "/uploads/avatars/evelyn-cross.png";

// Spec Frame 1: "If the code is missing, unresolvable, or not yet paired with
// content ... fall back to a generic-but-still-in-character opener — never to
// the old quiz." Task 12 passes a resolved seed, but rendering an EMPTY opening
// bubble would be the one unrecoverable first impression, so guard here too.
const FALLBACK_SEED =
  "You came back — good. I've been holding a thread for you since that email went out. Tell me what's been sitting with you, and I'll tell you what's actually underneath it.";

interface Bubble {
  role: "assistant" | "user";
  content: string;
}

interface CrisisState {
  hotlineName: string;
  hotlineNumber: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Confirmation copy — one bubble per outcome.
//
// CRITICAL constraint, and the reason none of these say "sent": /check-email
// returns `verified_match` in three situations, and only ONE of them dispatches
// mail. A non-active (banned/suspended/flagged) account gets the outcome but no
// magic link (evelynLander.ts:715-721), and a missing evelyn-cross persona row
// gets the outcome but no magic link (evelynLander.ts:729-732) — both
// deliberate, so the route can never be used as an account-status oracle. The
// `unverified_match` send is fire-and-forget too (sendVerificationEmail swallows
// its own failures), and `no_match` sends nothing at all by design: that reader
// has no account yet, so registration is still ahead of them.
//
// So the copy tells the reader where to LOOK and always names a path that works
// even if nothing lands. That is true in every case, including the ones where
// no mail was ever dispatched.
// ---------------------------------------------------------------------------
function confirmationCopy(outcome: LiveThreadOutcome, email: string): string {
  switch (outcome) {
    case "verified_match":
      return (
        `I know you — good. Check ${email} for a one-tap link straight back to this thread. ` +
        `If nothing lands in a few minutes, sign in the usual way instead — I'll still have what you just told me.`
      );
    case "unverified_match":
      return (
        `Good — I've got it saved. There's an account under ${email} that was never confirmed, so look for the ` +
        `confirmation link in your inbox. One tap and you're back here, with what you just told me waiting.`
      );
    case "no_match":
      // Frame 2b, deliberately in the future tense: nothing has been emailed to
      // this reader, and nothing will be until they finish activating. Promising
      // an inbox here would be false for 100% of no_match readers.
      return (
        `Good — I've got it saved. Nothing's set up under ${email} yet — activating your account is what ` +
        `unlocks your free minutes and lets me answer what you just told me.`
      );
  }
}

export default function LiveThreadLander({
  continueSeed,
  sessionToken,
  onOutcome,
  prefillEmail,
}: Props) {
  const seed = continueSeed.trim() || FALLBACK_SEED;

  const [messages, setMessages] = useState<Bubble[]>([{ role: "assistant", content: seed }]);
  const [stage, setStage] = useState<"reply" | "email" | "done">("reply");

  const [replyDraft, setReplyDraft] = useState("");
  // Seeded once from the merge-tag hint. Not synced to later prop changes on
  // purpose: this is the reader's own editable field from first render onward,
  // and re-seeding it would clobber a correction they had already typed.
  const [emailDraft, setEmailDraft] = useState(prefillEmail ?? "");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LiveThreadOutcome | null>(null);

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<CrisisState | null>(null);

  // Double-submit guard. The `sending`/`checking` state flags drive the UI
  // (spinner + disabled controls), but state is applied asynchronously, so they
  // are not a safe *mutual-exclusion* primitive on their own: a second click or
  // a held-down Enter key can dispatch a second handler before React re-renders
  // with the flag set. This ref flips SYNCHRONOUSLY on the first call and is
  // cleared in a finally, so exactly one request per intent reaches either
  // endpoint. It is one shared lock across all three actions on purpose — none
  // of them are ever legitimately concurrent.
  const inFlight = useRef(false);

  // A long continueSeed plus a long reply can overflow the thread's scroll box,
  // which would push the confirmation bubble — the whole payoff of the flow —
  // out of view. Same anchor EvelynLanderPage uses for the same reason.
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, stage]);

  async function handleSendReply() {
    const text = replyDraft.trim();
    if (!text || inFlight.current) return;

    inFlight.current = true;
    setSending(true);
    setErrorMsg(null);

    // Optimistic: their words become a sent bubble immediately (Frame 1.5 shows
    // the reply as a real chat bubble, not form input), and the compose bar
    // shows a spinner, so the wait is never a blank screen.
    const priorMessages = messages;
    setMessages([...priorMessages, { role: "user", content: text }]);
    setReplyDraft("");

    const { signal, cleanup } = createTimeoutSignal(REPLY_TIMEOUT_MS);
    try {
      const res = await fetch("/api/evelyn-lander/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, reply: text }),
        signal,
      });

      if (!res.ok) {
        // Nothing was parked server-side, so we must NOT advance to the email
        // step (spec: the save blocks the field from becoming interactive).
        // Roll the optimistic bubble back and put their text back in the box —
        // the same rollback-and-restore EvelynLanderPage.handleSend already
        // uses — so the artifact this whole feature exists to preserve is
        // visibly still in their hands and one tap from being retried.
        restoreDraft(priorMessages, text);
        if (res.status === 429) {
          // landerTurnLimiter is 30 per HOUR (rateLimiter.ts), not per minute.
          // "Give it a minute" would send them straight into a second 429; the
          // copy has to name the window it's actually gated by.
          setErrorMsg("That's a lot at once. Give it an hour, then send it again.");
        } else if (res.status === 404) {
          // The lander session row doesn't exist (its only INSERT lives in
          // /start, which must have failed). Retrying this exact call would
          // 404 forever, so point at the one action that can fix it — but a
          // refresh DISCARDS replyDraft (React state, no sessionStorage
          // backing) and the reply was never stored server-side on a 404, so
          // we must tell them to copy it first rather than reassure them it's
          // safe. Steering someone toward a refresh while implying their words
          // survive it would break the one promise this whole feature exists
          // to keep.
          setErrorMsg("This page lost its place. Copy what you wrote, refresh, and send it again.");
        } else {
          setErrorMsg("Something interrupted the connection. Try sending it again.");
        }
        return;
      }

      const data = await res.json();

      // Hard-crisis block (evelynLander.ts:456-471): `ok:false` +
      // `blocked:'safety'`, the reply was NOT stored, and `reply` carries a
      // country-specific hotline message. This is the branch that matters most:
      // a distressed reader must get support, not a signup form. So the hotline
      // lands in the thread as a message from Evelyn, the disclaimer banner
      // renders below it, and we stay on Frame 1 — no email field, no advance.
      //
      // The compose bar deliberately stays ENABLED. Halting the page outright
      // would leave someone who just reached out with no way to say anything
      // else; leaving it open means a different reply still gets through, and
      // the hotline stays visible in the thread above it either way. We do NOT
      // restore the flagged text into the box (that would only invite an
      // immediate re-send of the same words).
      if (data?.ok === false && data?.blocked === "safety") {
        // The route only takes this branch when safety.response is truthy, so
        // `reply` is always populated in practice — but an EMPTY support bubble
        // is the one thing that must never render here, so it has a floor.
        const hotline =
          typeof data.reply === "string" && data.reply.trim().length > 0
            ? data.reply
            : "I'm glad you told me. I'm not the right kind of help for this on my own — please reach out to the line below, right now, and talk to someone who is.";
        setMessages([
          ...priorMessages,
          { role: "user", content: text },
          { role: "assistant", content: hotline },
        ]);
        if (data.crisisDisclaimer) setCrisis(data.crisisDisclaimer as CrisisState);
        return;
      }

      // Everything else is `{ ok: true }` — safe, soft-crisis-but-safe, or a
      // non-crisis violation (all of which ARE stored, evelynLander.ts:473-499).
      // Exactly two branches to handle, per the route's own documented contract.
      setStage("email");
    } catch (err) {
      // Network failure, or a timeout (TimeoutError on modern browsers /
      // AbortError on createTimeoutSignal's fallback path). Same treatment as a
      // non-ok response: their words come back, nothing advances.
      console.error("[LiveThreadLander] /reply failed:", err);
      restoreDraft(priorMessages, text);
      setErrorMsg("Something interrupted the connection. Try sending it again.");
    } finally {
      cleanup();
      setSending(false);
      inFlight.current = false;
    }
  }

  function restoreDraft(priorMessages: Bubble[], text: string) {
    setMessages(priorMessages);
    setReplyDraft(text);
  }

  // Shared by the first submit and the resend — identical request, so the two
  // can never drift. Returns the parsed outcome, or null when the caller should
  // show an error instead.
  async function postCheckEmail(email: string): Promise<
    { ok: true; outcome: LiveThreadOutcome } | { ok: false; message: string }
  > {
    const { signal, cleanup } = createTimeoutSignal(CHECK_EMAIL_TIMEOUT_MS);
    try {
      const res = await fetch("/api/evelyn-lander/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // sessionToken is OPTIONAL on the route but we ALWAYS send it. It is
        // what stamps `resolved_user_id` onto this lander session
        // (evelynLander.ts:830-847), which is the only link between the reply
        // parked a moment ago and the account the reader is about to sign into.
        // Task 10's replay finds the pendingReply through exactly that column —
        // omit this and a returning reader's reply is orphaned and never
        // replayed, which breaks the entire continuity chain this feature is.
        body: JSON.stringify({ email, sessionToken }),
        signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          // accountDetectionLimiter is 10 per HOUR in production
          // (rateLimiter.ts:90-107) — the tightest limiter in this flow, and
          // the one carrier-NAT mobile traffic realistically shares an IP into.
          // "A few minutes" would be a straight-up wrong instruction that sends
          // them into a second 429, so the copy names the real window.
          return {
            ok: false,
            message: "That's as many tries as we can take from here right now. Give it an hour and try again.",
          };
        }
        if (res.status === 400) {
          return { ok: false, message: "That email doesn't look right — check it and try again." };
        }
        return { ok: false, message: "Something interrupted the connection. Try again." };
      }

      const data = await res.json();
      const value = data?.outcome;
      if (value !== "verified_match" && value !== "unverified_match" && value !== "no_match") {
        // A 200 with a shape we don't recognise. Treat it as a failure rather
        // than advancing into a confirmation state we can't render honestly.
        console.error("[LiveThreadLander] unrecognised /check-email outcome:", value);
        return { ok: false, message: "Something interrupted the connection. Try again." };
      }
      return { ok: true, outcome: value };
    } catch (err) {
      console.error("[LiveThreadLander] /check-email failed:", err);
      return { ok: false, message: "Something interrupted the connection. Try again." };
    } finally {
      cleanup();
    }
  }

  async function handleSubmitEmail() {
    const value = emailDraft.trim();
    if (!value || inFlight.current) return;
    if (!EMAIL_RE.test(value)) {
      setErrorMsg("That email doesn't look right — check it and try again.");
      return;
    }

    inFlight.current = true;
    setChecking(true);
    setErrorMsg(null);

    try {
      const result = await postCheckEmail(value);
      if (!result.ok) {
        // Stay on the email step with their address still typed in. The reply
        // is already parked server-side at this point, so a failure here costs
        // them a retry, never the thing they wrote.
        setErrorMsg(result.message);
        return;
      }
      setSubmittedEmail(value);
      setOutcome(result.outcome);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: confirmationCopy(result.outcome, value) },
      ]);
      setStage("done");
      onOutcome(result.outcome, value);
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  }

  // Spec Frame 2/2c both promise "Resend available now". Re-runs the identical
  // detection, which re-sends on every call by design (both sibling auth routes
  // behave the same way — see the route's own comment). Only offered for the two
  // outcomes where something was supposed to be mailed.
  //
  // Deliberately does NOT re-fire onOutcome or overwrite `outcome`: Task 12 has
  // already routed on the first result, and a second callback could double-fire
  // that navigation. The only realistic way the outcome could change between two
  // clicks seconds apart is the reader verifying in another tab — in which case
  // they are already through and no longer looking at this page.
  async function handleResend() {
    if (!submittedEmail || inFlight.current) return;

    inFlight.current = true;
    setResending(true);
    setResendMsg(null);

    try {
      const result = await postCheckEmail(submittedEmail);
      setResendMsg(result.ok ? "Sent again — give it a minute to land." : result.message);
    } finally {
      setResending(false);
      inFlight.current = false;
    }
  }

  const sendDisabled = sending || replyDraft.trim().length === 0;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-6 pb-6 space-y-4">
          {/* Header — persona identity + the "secure" cue from the wireframe */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <img
                  src={EVELYN_AVATAR}
                  alt="Evelyn Cross"
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-300/50"
                />
                <Sparkles className="w-3 h-3 text-purple-500 absolute -top-0.5 -right-0.5" />
              </div>
              <h1 className="font-serif text-base text-gray-900">Evelyn Cross</h1>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              <Lock className="w-3 h-3" />
              secure
            </span>
          </div>

          {/* The thread */}
          <div className="border-t border-purple-100 pt-4 space-y-3 max-h-[55vh] overflow-y-auto">
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Crisis banner — reuses the same component the real chat renders
              (ChatServicePage.tsx:2433) so the support surface is identical
              wherever a reader hits it. */}
          {crisis && (
            <CrisisDisclaimer
              hotlineName={crisis.hotlineName}
              hotlineNumber={crisis.hotlineNumber}
              country={crisis.country}
            />
          )}

          {/* Live region for every failure in this flow — errors are surfaced
              here and nowhere else, so without it a screen-reader user who taps
              Send and gets a 429 hears nothing change at all.
              - "polite", not "assertive": it must not cut off the bubble that
                may still be being read out.
              - role="status" pairs with aria-live for AT that honours only one.
              - The element is rendered UNCONDITIONALLY so the live region is
                registered at mount, before any text is injected; a region
                created and populated in the same DOM insertion is not reliably
                announced. `empty:hidden` toggles only `display`, so the node
                stays permanently in the DOM while costing zero layout (an
                always-present empty <p> would otherwise take a space-y gap). */}
          <p
            className="text-sm text-red-600 text-center empty:hidden"
            role="status"
            aria-live="polite"
          >
            {errorMsg}
          </p>

          {/* Frame 1 — compose bar */}
          {stage === "reply" && (
            <div className="flex items-end gap-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Type your reply..."
                maxLength={MAX_REPLY_LENGTH}
                disabled={sending}
                rows={2}
                className="flex-1 resize-none rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <Button
                type="button"
                onClick={handleSendReply}
                disabled={sendDisabled}
                size="icon"
                aria-label="Send"
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* Frame 1.5 — the single email field both branches read from. Only
              reachable once /reply has confirmed the reply is parked. */}
          {stage === "email" && (
            <div className="space-y-2 border-t border-purple-100 pt-4">
              <p className="text-sm text-gray-700">Save this so Evelyn can answer it:</p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmitEmail();
                  }
                }}
                placeholder="your@email.com"
                maxLength={254}
                disabled={checking}
                className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <Button
                type="button"
                onClick={handleSubmitEmail}
                disabled={checking || emailDraft.trim().length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                {checking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}

          {/* Frames 2 / 2b / 2c — the footer under the confirmation bubble */}
          {stage === "done" && outcome && submittedEmail && (
            <div className="space-y-2 border-t border-purple-100 pt-4 text-center">
              {outcome === "no_match" ? (
                // Frame 2b. No mail has been dispatched and none will be until
                // they activate, so this stays in the future tense. Task 12's
                // onOutcome handler is what carries them into registration.
                <p className="text-sm text-gray-600">
                  We'll email you a one-click link. No password needed.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">✉️ {submittedEmail}</p>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-purple-700 hover:underline disabled:text-gray-400"
                    >
                      {resending ? "Sending..." : "Send it again"}
                    </button>
                    <span className="text-gray-300">·</span>
                    <Link href="/login" className="text-purple-700 hover:underline">
                      Sign in instead
                    </Link>
                  </div>
                  {/* Same always-rendered live-region treatment as errorMsg
                      above: the resend result is otherwise a silent change. */}
                  <p
                    className="text-xs text-gray-500 empty:hidden"
                    role="status"
                    aria-live="polite"
                  >
                    {resendMsg}
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Same bubble treatment as EvelynLanderPage's chat arm, so the two experiment
// arms read as one product.
function ChatBubble({ role, content }: { role: "assistant" | "user"; content: string }) {
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
