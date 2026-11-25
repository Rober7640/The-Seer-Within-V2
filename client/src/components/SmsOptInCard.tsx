// Standalone post-purchase SMS opt-in (Twilio 30446 fix — see server/lib/smsConsent.ts).
//
// A SEPARATE step after payment: its own phone box, an UNTICKED checkbox, the
// full disclosure with Terms + Privacy links, and its own "Text me" button. It has
// nothing to do with the purchase or the upsell: it never charges, never moves the
// chat on, and ignoring it changes nothing. Renders nothing unless the server says
// this paid order is on a switched-on funnel/lander.
//
// Joel, 24 Nov 2026:
//  - the phone box is PRE-FILLED with the number she gave at checkout (she can edit
//    it). The checkbox still starts UNTICKED — consent is still her own choice.
//  - the box STAYS ON SCREEN (sticky at the top of the chat) until she signs up or
//    taps "No thanks"; the chat scrolls underneath it. The upsell buttons live in
//    the page footer, outside the chat, so they are never covered.
//  The approved wording (heading, checkbox, disclosure, button) is unchanged.
//
// Joel, 25 Nov 2026 call: the box must NOT sit on top of Upsell 1 ("very awkward").
// It now lives on its OWN in-between page after payment (SmsOptInStepPage,
// <funnel>/preparing), so it is a normal card, no longer sticky. The page passes
// onFinished (go on to Upsell 1) — called after "No thanks", after a successful
// sign-up (once the thank-you line has shown), or straight away when the box
// isn't available / she already answered for this order. It is never a dead end.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OptInStatus {
  show: boolean;
  heading?: string;
  checkboxLabel?: string;
  buttonLabel?: string;
  disclosure?: string;
  termsUrl?: string;
  privacyUrl?: string;
  alreadyOptedIn?: boolean;
  prefillPhone?: string | null;
}

const DISMISS_KEY = "sms_optin_dismissed";
function readDismissed(sessionId: string | null): boolean {
  try {
    return !!sessionId && sessionStorage.getItem(DISMISS_KEY) === sessionId;
  } catch {
    return false;
  }
}

// Loose client check only (enables the button); the server does the real one.
function looksLikePhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

// How long the "Thanks — you're signed up" line stays before moving on.
const DONE_PAUSE_MS = 1500;
// If the box hasn't loaded at all by then, move her on rather than strand her (Lewis, 25 Nov).
const BOX_LOAD_FAILSAFE_MS = 8000;

export function SmsOptInCard({
  sessionId,
  onFinished,
}: {
  sessionId: string | null;
  /** Called exactly once when she is finished with the box (any outcome). */
  onFinished?: () => void;
}) {
  const [status, setStatus] = useState<OptInStatus | null>(null);
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissed(sessionId));

  // onFinished fires at most once, whatever path gets there first.
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishedRef.current?.();
  }

  useEffect(() => {
    if (!sessionId || !sessionId.startsWith("cs_")) {
      finish();
      return;
    }
    let cancelled = false;
    // Safety net ONLY for a box that never loads (slow network / server hiccup), so
    // she is never left on a page with no buttons. Once the box has loaded this is
    // cleared: there is NO timer on her decision — the box waits for her tap.
    let settled = false;
    const failsafe = setTimeout(() => {
      if (!cancelled && !settled) finish();
    }, BOX_LOAD_FAILSAFE_MS);
    fetch(`/api/sms-optin/status?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : { show: false }))
      .then((s: OptInStatus) => {
        if (cancelled || finishedRef.current) return;
        settled = true;
        clearTimeout(failsafe);
        setStatus(s);
        // Not available, or she already answered for this order ⇒ move straight on.
        if (!s.show || s.alreadyOptedIn || readDismissed(sessionId)) {
          finish();
          return;
        }
        // Pre-fill only an empty box — never overwrite what she has typed.
        if (s.prefillPhone) setPhone((cur) => cur || s.prefillPhone || "");
      })
      .catch(() => {
        settled = true;
        clearTimeout(failsafe);
        if (!cancelled) finish();
      });
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, [sessionId]);

  // After a successful sign-up: show the thank-you line briefly, then move on.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(finish, DONE_PAUSE_MS);
    return () => clearTimeout(t);
  }, [done]);

  if (!status?.show) return null;
  if (dismissed && !done && !status.alreadyOptedIn) return null;

  function dismiss() {
    try {
      if (sessionId) sessionStorage.setItem(DISMISS_KEY, sessionId);
    } catch {
      /* storage blocked: it just hides for this page view */
    }
    setDismissed(true);
    finish();
  }

  if (done || status.alreadyOptedIn) {
    return (
      <div
        className="rounded-2xl border border-white/15 bg-black/40 p-4 text-sm text-white/80"
        data-testid="sms-optin-done"
      >
        Thanks — you're signed up for texts from The Seer Within. Reply STOP at any time to opt out.
      </div>
    );
  }

  const canSubmit = agree && looksLikePhone(phone) && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/sms-optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone, agree: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Sorry, that didn't save. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sorry, that didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/15 bg-[#151330]/95 backdrop-blur-md shadow-lg shadow-black/40 p-4 md:p-5 space-y-3 text-white"
      data-testid="sms-optin-card"
    >
      <p className="font-medium text-sm md:text-base">{status.heading}</p>

      <div className="space-y-1">
        <label htmlFor="sms-optin-phone" className="text-xs text-white/70">
          Mobile number
        </label>
        <Input
          id="sms-optin-phone"
          name="sms-optin-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          data-testid="sms-optin-phone"
        />
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-purple-500"
          data-testid="sms-optin-checkbox"
        />
        <span>{status.checkboxLabel}</span>
      </label>

      <p className="text-xs leading-relaxed text-white/60" data-testid="sms-optin-disclosure">
        {status.disclosure}{" "}
        <a href={status.termsUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Terms
        </a>{" "}
        ·{" "}
        <a href={status.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Privacy Policy
        </a>
      </p>

      {error && (
        <p className="text-xs text-red-300" data-testid="sms-optin-error">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit} className="flex-1" data-testid="sms-optin-submit">
          {saving ? "Saving…" : status.buttonLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={dismiss}
          disabled={saving}
          className="text-white/70 hover:text-white hover:bg-white/10"
          data-testid="sms-optin-dismiss"
        >
          No thanks
        </Button>
      </div>
    </form>
  );
}
