// Standalone post-purchase SMS opt-in (Twilio 30446 fix — see server/lib/smsConsent.ts).
//
// A SEPARATE step after payment: its own empty phone box, an UNTICKED checkbox, the
// full disclosure with Terms + Privacy links, and its own "Text me" button. It has
// nothing to do with the purchase or the upsell: it never charges, never moves the
// chat on, and ignoring it changes nothing. Renders nothing unless the server says
// this paid order is on a switched-on funnel/lander.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

interface OptInStatus {
  show: boolean;
  heading?: string;
  checkboxLabel?: string;
  buttonLabel?: string;
  disclosure?: string;
  termsUrl?: string;
  privacyUrl?: string;
  alreadyOptedIn?: boolean;
}

// Loose client check only (enables the button); the server does the real one.
function looksLikePhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function SmsOptInCard({ sessionId }: { sessionId: string | null }) {
  const [status, setStatus] = useState<OptInStatus | null>(null);
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sessionId || !sessionId.startsWith("cs_")) return;
    let cancelled = false;
    fetch(`/api/sms-optin/status?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : { show: false }))
      .then((s: OptInStatus) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!status?.show) return null;

  if (done || status.alreadyOptedIn) {
    return (
      <div
        className="rounded-2xl border border-white/15 bg-black/40 p-4 text-sm text-white/80"
        data-testid="sms-optin-done"
      >
        {t("Thanks — you're signed up for texts from The Seer Within. Reply STOP at any time to opt out.")}
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
      setError(err instanceof Error ? err.message : t("Sorry, that didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/15 bg-black/40 p-4 space-y-3 text-white"
      data-testid="sms-optin-card"
    >
      <p className="font-medium text-sm md:text-base">{status.heading}</p>

      <div className="space-y-1">
        <label htmlFor="sms-optin-phone" className="text-xs text-white/70">
          {t("Mobile number")}
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
          {t("Terms")}
        </a>{" "}
        ·{" "}
        <a href={status.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {t("Privacy Policy")}
        </a>
      </p>

      {error && (
        <p className="text-xs text-red-300" data-testid="sms-optin-error">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full" data-testid="sms-optin-submit">
        {saving ? t("Saving…") : status.buttonLabel}
      </Button>
    </form>
  );
}
