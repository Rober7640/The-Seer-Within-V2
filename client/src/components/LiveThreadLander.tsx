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
//   Frame 1   — Evelyn's opener, revealed as SEVERAL bubbles with typing
//               pacing, plus a real compose bar.
//   Frame 1.5 — the reader's reply is POSTed to /api/evelyn-lander/reply and
//               PARKED server-side (pendingReply). Only once that write lands
//               does Evelyn answer, and her answer is what asks for the email.
//               That ordering is the whole point: the reply must survive even
//               if the reader abandons here or account detection fails, so it
//               is never gated behind an email.
//   Frame 2 / 2b / 2c — one confirmation bubble per /check-email outcome.
//
// ── 2026-08-19 REBUILD (Joel's flow feedback) ───────────────────────────────
// Three changes, all to how this READS; the network contract is untouched.
//
//  1. MULTI-BUBBLE OPENER. It was one bubble holding the whole seed. The seed is
//     now split (lib/chatBubbles.ts) and revealed bubble by bubble behind typing
//     dots, because "a few messages" is what a person sends and one paragraph is
//     what a notice sends. The bubbles come from the EMAIL's own authored copy —
//     see chatBubbles.ts for why the seed is the only field that can be shown.
//  2. CHAT PARITY. The shell was a Card floating on the cosmic background. It now
//     uses the same frame, header, bubble classes and typing indicator as the
//     real chat (ChatPage.tsx / ChatServicePage.tsx), so a reader who continues
//     into /reading sees the same room they were already standing in.
//  3. EVELYN ASKS FOR THE EMAIL. It used to jump straight from the reader's reply
//     to a form panel labelled, in the third person, "Save this so Evelyn can
//     answer it:" — she was described rather than speaking, which read as a
//     system prompt wearing her name. She now answers first, in character, and
//     the ask lives in her own bubble with the input sitting in the composer
//     where her last question can be answered like any other.
//
// Her two answering bubbles are SCRIPTED, not generated. This is the highest-
// intent moment in the funnel and an LLM call here would buy personalisation at
// the cost of latency, spend and a failure mode on the one step that must not
// fail. They are written to be true for all three /check-email outcomes, since
// which one applies is not known until after the email is submitted.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Button } from "@/components/ui/button";
import { Send, Lock } from "lucide-react";
import CrisisDisclaimer from "@/components/CrisisDisclaimer";
import { createTimeoutSignal } from "@/lib/timeoutSignal";
import { splitIntoBubbles } from "@/lib/chatBubbles";
import { calculateTypingDelay, calculatePauseBetweenMessages, sleep } from "@/lib/typingAnimation";

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

// ---------------------------------------------------------------------------
// Typing pacing.
//
// Same SHAPE as the live chat — dots in a bubble, one message at a time — using
// the same helpers, but with the opener capped tighter than
// calculateTypingDelay's own 5s ceiling. In chat, a reader who just sent
// something will wait; here they have just landed from an email and a page that
// shows nothing but dots for eight seconds is a page they leave. Capped, three
// bubbles land in ~5s, which is roughly the time it takes to read the first two.
//
// The composer stays live throughout regardless (see flushOpener) so this pacing
// can never hold anyone up.
// ---------------------------------------------------------------------------
const OPENER_FIRST_TYPING_MS = 600;
const OPENER_MAX_TYPING_MS = 1_600;
const OPENER_PAUSE_MS = 500;
/** Her reply to the reader gets the real chat pause, and a slightly longer cap. */
const RESPONSE_MAX_TYPING_MS = 1_800;

// ---------------------------------------------------------------------------
// Evelyn's answer to the reply, and the email ask inside it.
//
// TRUE FOR EVERY OUTCOME. When these render, /reply has returned ok — so the
// words ARE parked server-side and "held" is literal. The ask names IDENTITY
// ("how I know it's you"), never a send: /check-email mails nothing at all on
// no_match, and its verified_match branch has two paths that also send nothing
// (see confirmationCopy below). Promising an inbox here would be false for a
// large share of readers, and which share is not knowable until they submit.
// ---------------------------------------------------------------------------
const RESPONSE_BUBBLES = [
  "Okay. I've got what you wrote — it's held on my side now, it isn't going anywhere.",
  "Before I take this any further: what's the email you read my letter on? That's how I know it's you, and how I keep this thread instead of starting you over.",
];

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
  // FALLBACK_SEED is inlined here rather than kept as a module constant so the
  // "never render a blank bubble" floor sits next to the only place it applies.
  const seed =
    continueSeed.trim() ||
    "You came back — good. I've been holding a thread for you since that email went out. Tell me what's been sitting with you, and I'll tell you what's actually underneath it.";

  // The opener's bubbles, resolved once. Empty is impossible (`seed` has a
  // floor), but splitIntoBubbles can return [] for blank input, so the guard
  // below still treats an empty list as "nothing left to reveal".
  const openerBubbles = useMemo(() => splitIntoBubbles(seed), [seed]);

  const [messages, setMessages] = useState<Bubble[]>([]);
  // 'responding' is Evelyn answering the reply. It is a stage of its own so the
  // compose bar is gone while she types — without it a reader could fire a
  // second reply into a thread that is mid-answer, and /reply would park it over
  // the first.
  const [stage, setStage] = useState<"reply" | "responding" | "email" | "done">("reply");
  const [isTyping, setIsTyping] = useState(false);

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

  // Set while the opener is still being revealed; calling it drops the rest of
  // the animation on the floor and prints every remaining bubble at once. See
  // flushOpener.
  const openerFlushRef = useRef<(() => void) | null>(null);

  // A long opener plus a long reply can overflow the thread's scroll box, which
  // would push the confirmation bubble — the whole payoff of the flow — out of
  // view. Same anchor EvelynLanderPage uses for the same reason. `isTyping` is a
  // dependency because the dots appearing also grow the box.
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, stage, isTyping]);

  // -------------------------------------------------------------------------
  // The opener animation.
  //
  // Runs once on mount. `cancelled` covers unmount mid-reveal (React 18 StrictMode
  // double-invokes effects in dev, and the reader can navigate at any time), so no
  // state update ever lands on a dead component.
  //
  // The flush path exists because the pacing must never cost anyone a turn: a
  // reader who types and sends while she is still "typing" gets the rest of her
  // opener printed instantly, ahead of their own message, so the thread stays in
  // the order it was actually said.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let revealed = 0;

    openerFlushRef.current = () => {
      cancelled = true;
      openerFlushRef.current = null;
      setIsTyping(false);
      if (revealed < openerBubbles.length) {
        const rest = openerBubbles.slice(revealed).map((content) => ({
          role: "assistant" as const,
          content,
        }));
        revealed = openerBubbles.length;
        setMessages((prev) => [...prev, ...rest]);
      }
    };

    (async () => {
      for (let i = 0; i < openerBubbles.length; i++) {
        const text = openerBubbles[i];
        const typingMs =
          i === 0
            ? OPENER_FIRST_TYPING_MS
            : Math.min(calculateTypingDelay(text), OPENER_MAX_TYPING_MS);

        setIsTyping(true);
        await sleep(typingMs);
        if (cancelled) return;
        setIsTyping(false);
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
        revealed = i + 1;

        if (i < openerBubbles.length - 1) {
          await sleep(OPENER_PAUSE_MS);
          if (cancelled) return;
        }
      }
      openerFlushRef.current = null;
    })();

    return () => {
      cancelled = true;
      openerFlushRef.current = null;
    };
  }, [openerBubbles]);

  /** Print any un-revealed opener bubbles immediately. No-op once it has run. */
  function flushOpener() {
    openerFlushRef.current?.();
  }

  /**
   * Evelyn's answer to the reply, then the email ask. Runs only after /reply has
   * confirmed the words are parked, so `stage` moves to 'email' at the END of it
   * — the field appearing is the last beat of her asking for it, not a separate
   * form that opens alongside.
   *
   * Not cancellable on unmount by design: it is a fire-and-forget sequence whose
   * only writes are setState, and the component unmounting mid-way means the
   * reader has already navigated (the no_match handoff is the only navigation and
   * it cannot fire before this finishes). React's dev warning for a stray update
   * would be the worst outcome here, so this stays simple.
   */
  async function playResponse() {
    for (let i = 0; i < RESPONSE_BUBBLES.length; i++) {
      const text = RESPONSE_BUBBLES[i];
      setIsTyping(true);
      await sleep(Math.min(calculateTypingDelay(text), RESPONSE_MAX_TYPING_MS));
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      if (i < RESPONSE_BUBBLES.length - 1) {
        await sleep(calculatePauseBetweenMessages());
      }
    }
    setStage("email");
  }

  async function handleSendReply() {
    const text = replyDraft.trim();
    if (!text || inFlight.current) return;

    inFlight.current = true;
    setSending(true);
    setErrorMsg(null);

    // Anything of hers still queued goes in FIRST, so the transcript reads in
    // the order it was said rather than showing her finishing a thought after
    // the reader had already answered it.
    flushOpener();

    // Optimistic: their words become a sent bubble immediately (Frame 1.5 shows
    // the reply as a real chat bubble, not form input), and the compose bar
    // shows a spinner, so the wait is never a blank screen.
    //
    // `priorMessages` is read from the setter rather than from `messages` so the
    // rollback baseline includes the bubbles flushOpener may have just added —
    // reading the render-time value would silently erase them on a failed send.
    let priorMessages: Bubble[] = [];
    setMessages((prev) => {
      priorMessages = prev;
      return [...prev, { role: "user", content: text }];
    });
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
      //
      // It also does NOT get the typing animation the ordinary answer gets:
      // holding a hotline number behind two seconds of dots to seem lifelike is
      // the wrong trade on the one message that might matter most.
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
      //
      // The reply is parked, so she can now answer it and ask for the email in
      // her own voice. `stage` moves off 'reply' here rather than inside
      // playResponse so the compose bar cannot linger for a frame after send.
      setStage("responding");
      void playResponse();
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
      // Her address answers her question, so it goes in as the reader's own
      // bubble — the same shape the reply took — before her confirmation lands.
      setMessages((prev) => [
        ...prev,
        { role: "user", content: value },
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

  // ---------------------------------------------------------------------------
  // Shell, header, thread and composer all mirror ChatPage.tsx (V1 /chat) and
  // ChatServicePage.tsx (V2 /reading), which already share these classes. Kept
  // as literal class strings rather than an extracted component because the two
  // chat pages do the same, and a shared abstraction here would be the only
  // caller of itself while making three files harder to diff against each other.
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-0 md:p-4 overflow-hidden">
      <CosmicBackground />

      <div className="w-full max-w-lg h-full md:h-[90vh] flex flex-col bg-white/95 backdrop-blur-md md:rounded-2xl shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Header — same identity strip as /chat. The lock replaces /chat's
            "Exit": there is nowhere to exit TO from an emailed arrival, and the
            wireframe's "secure" cue is worth more at the point where an email
            address is about to be asked for. */}
        <header className="bg-bg-mid text-white p-4 flex items-center justify-between gap-2 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
                <img
                  src={EVELYN_AVATAR}
                  alt="Evelyn Cross"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-bg-mid animate-pulse" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg leading-none">Evelyn Cross</h1>
              <span className="text-xs text-green-400 font-medium">Online Now</span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-white/70">
            <Lock className="w-3 h-3" />
            secure
          </span>
        </header>

        {/* The thread */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth"
          data-testid="container-live-thread-messages"
        >
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}

          {/* Typing indicator — identical markup to both chat pages. */}
          {isTyping && (
            <div className="flex justify-start w-full animate-fade-in" data-testid="indicator-typing">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}

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

          <div ref={threadEndRef} />
        </div>

        {/* Composer. One bar, three states — her question is answered in the
            same place whatever she asked for, which is the point of the rebuild:
            the email is a turn in the conversation, not a form below it. */}
        <div className="border-t border-gray-100 bg-white p-3 shrink-0 space-y-2">
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
                stays permanently in the DOM while costing zero layout. */}
          <p
            className="text-sm text-red-600 text-center empty:hidden"
            role="status"
            aria-live="polite"
          >
            {errorMsg}
          </p>

          {/* Frame 1 — reply */}
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
                aria-label="Your reply to Evelyn"
                maxLength={MAX_REPLY_LENGTH}
                disabled={sending}
                rows={2}
                data-testid="input-live-thread-reply"
                className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <Button
                type="button"
                onClick={handleSendReply}
                disabled={sendDisabled}
                size="icon"
                aria-label="Send"
                data-testid="button-live-thread-send"
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 rounded-full"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* Frame 1.5 — the email, asked for in the bubble above this. No
              label and no divider on purpose: the question is Evelyn's last
              message, so a second written prompt here would say it twice in two
              different voices. `aria-label` carries the same information for
              anyone who cannot see that bubble sitting above the field. */}
          {stage === "email" && (
            <div className="flex items-center gap-2">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmitEmail();
                  }
                }}
                placeholder="your@email.com"
                aria-label="The email address you read Evelyn's letter on"
                maxLength={254}
                disabled={checking}
                data-testid="input-live-thread-email"
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              <Button
                type="button"
                onClick={handleSubmitEmail}
                disabled={checking || emailDraft.trim().length === 0}
                size="icon"
                aria-label="Send my email address"
                data-testid="button-live-thread-email-submit"
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 rounded-full"
              >
                {checking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* Frames 2 / 2b / 2c — the footer under the confirmation bubble */}
          {stage === "done" && outcome && submittedEmail && (
            <div className="space-y-2 text-center">
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
        </div>
      </div>
    </div>
  );
}

// The exact bubble treatment both chat pages use (ChatPage.tsx:196-201,
// ChatServicePage.tsx:2493-2497), so a reader who continues into /reading is
// looking at the same thread they started here.
function ChatBubble({ role, content }: { role: "assistant" | "user"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        data-testid={isUser ? "user-message" : "assistant-message"}
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm md:text-base leading-relaxed ${
          isUser
            ? "bg-purple-600 text-white rounded-br-none"
            : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
