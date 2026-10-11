// DEV-ONLY review scene for the long-copy paywall test (/paywall-preview).
//
//   ?surface=longcopy                 → the first-timer paywall over the chat moment
//   ?surface=exit                     → the "What stopped you?" sheet
//   ?surface=repeat                   → the repeat-buyer short paywall with six options
//                                        (live BuyCreditsModal look; only the packs change)
//   &state=low                        → repeat only: "More time together" / "Maybe later"
//                                        instead of the out-of-credits "Continue Your Chat"
//   &sample=s01..s10                  → which real chat (still-see lines + ending)
//   &ending=new|actual|control        → which guide ending sits in the chat behind it
//   &still=none                       → force the no-lines fallback
//   &frame=dialog                     → the REAL Dialog / phone bottom-sheet (dark overlay, inert chrome)
//
// Phones show the paywall as a bottom sheet over the chat (scroll the page to
// read the full ending). Wide screens show the chat moment and the sheet side by
// side so a reviewer can read both at once — live desktop is a centred dialog.

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { LongCopyPaywallPanel, default as LongCopyPaywallDialog } from "./LongCopyPaywall";
import { ExitReasonPanel, default as ExitReasonDialog, EXIT_REASONS, type ExitReason } from "./ExitReasonSheet";
import { RepeatBuyerPaywallPanel, default as RepeatBuyerPaywallDialog } from "./RepeatBuyerPaywall";
import { previewSamples, previewSamplesAreReal, type PreviewSample } from "./previewSamples";
import { buildBonusPreviewTiers, buildRepeatPreviewTiers } from "@shared/paywall";
import { COINS_PER_MINUTE, coinsToMinutes, type PricingTier } from "@shared/types";

type Ending = "new" | "actual" | "control";
type View = "longcopy" | "exit" | "repeat";

function setParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url.toString());
}

function endingText(sample: PreviewSample, ending: Ending): string {
  if (ending === "actual") return sample.actualEnding;
  if (ending === "control") return sample.controlEnding;
  return sample.newEnding;
}

/** The chat moment behind the paywall: her last message + the guide's last message. */
function ChatMoment({
  sample,
  ending,
  personaName,
  avatarUrl,
  lockText = "Free minutes used",
}: {
  sample: PreviewSample;
  ending: Ending;
  personaName: string;
  avatarUrl: string;
  lockText?: string;
}) {
  return (
    <div className="flex flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/evelyn-avatar.png")) img.src = "/evelyn-avatar.png";
          }}
        />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-gray-900">{personaName}</p>
          <p className="text-[11px] text-emerald-600">Online</p>
        </div>
      </div>
      <div className="space-y-4 bg-gray-50/50 p-4">
        <div className="flex w-full flex-col items-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-none bg-purple-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            {sample.herLastMessage}
          </div>
        </div>
        <div className="flex w-full flex-col items-start">
          <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm">
            {endingText(sample, ending)}
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
            {ending === "new" ? "new free-trial ending (test)" : ending === "actual" ? "what she really saw" : "today's wind-down, regenerated"}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-gray-400">
          <Lock className="h-3 w-3" /> {lockText}
        </div>
      </div>
    </div>
  );
}

export default function LongCopyPreviewScene({ surface }: { surface: View }) {
  const params = new URLSearchParams(window.location.search);
  const samples = previewSamples.samples;
  const persona = previewSamples.persona;

  const [sampleId, setSampleId] = useState(() => {
    const want = params.get("sample");
    return samples.find((s) => s.id === want)?.id ?? samples[0]?.id ?? "";
  });
  const [ending, setEnding] = useState<Ending>(() => {
    const e = params.get("ending");
    return e === "actual" || e === "control" ? e : "new";
  });
  const [view, setView] = useState<View>(surface);
  const [lastAction, setLastAction] = useState<string>("");
  // Phones: the sheet covers most of the chat, so let the reviewer hide it to read the ending.
  const [peek, setPeek] = useState(false);
  const forceFallback = params.get("still") === "none";
  const lockText = view === "repeat" ? "Out of minutes" : "Free minutes used";
  const realFrame = params.get("frame") === "dialog";

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const coinsPerMinute = COINS_PER_MINUTE;
  const tiers = useMemo(() => buildBonusPreviewTiers(coinsPerMinute), [coinsPerMinute]);
  const repeatTiers = useMemo(() => buildRepeatPreviewTiers(coinsPerMinute), [coinsPerMinute]);
  const repeatOutOfCredits = params.get("state") !== "low";
  // Logged as whole minutes — the same unit the tiles show.
  const continueLog = (t: PricingTier) =>
    `Continue → $${(t.priceUsd / 100).toFixed(t.priceUsd % 100 ? 2 : 0)} for ${coinsToMinutes(t.totalCoins, coinsPerMinute)} min` +
    (t.bonusCoins > 0 ? ` (incl. ${t.bonusCoins}¢ bonus)` : "");

  const panelProps = {
    persona: { name: persona.name, avatarUrl: persona.avatarUrl, rating: persona.rating, ratingCount: persona.ratingCount },
    stillSee: forceFallback ? null : sample?.stillSee ?? null,
    tiers,
    coinsPerMinute,
    onContinue: (t: PricingTier) => setLastAction(continueLog(t)),
    onNotNow: () => {
      setLastAction("Not now → exit question");
      setView("exit");
      setParam("surface", "exit");
    },
  };
  const onPick = (r: ExitReason | null) => {
    setLastAction(r ? `Picked: ${EXIT_REASONS.find((x) => x.id === r)?.label}` : "Skipped");
  };

  const repeatProps = {
    personaName: persona.name,
    avatarUrl: persona.avatarUrl,
    isOutOfCredits: repeatOutOfCredits,
    tiers: repeatTiers,
    coinsPerMinute,
    onContinue: (t: PricingTier) => setLastAction(continueLog(t)),
    onClose: () => setLastAction(repeatOutOfCredits ? "End Chat" : "Maybe later"),
  };

  const sheet =
    view === "longcopy" ? (
      <LongCopyPaywallPanel key={sample?.id} {...panelProps} />
    ) : view === "repeat" ? (
      <RepeatBuyerPaywallPanel {...repeatProps} />
    ) : (
      <ExitReasonPanel onPick={onPick} />
    );

  return (
    <div className="min-h-screen bg-white">
      {/* Preview chrome — never shipped. With ?frame=dialog it sits UNDER the dialog's
          dark overlay (it is inert there anyway), so the sheet's top edge and the strip
          of chat above it look exactly as on a real phone. */}
      <div
        className={`sticky top-0 border-b border-white/10 bg-[#0b1020]/95 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur ${
          realFrame ? "z-40" : "z-[70]"
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-semibold uppercase tracking-[0.12em] text-amber-200/70">
            Preview<span className="hidden sm:inline"> · not live</span>
          </span>
          <select
            aria-label="Chat sample"
            value={sample?.id}
            onChange={(e) => {
              setSampleId(e.target.value);
              setParam("sample", e.target.value);
            }}
            className="rounded bg-white/10 px-1.5 py-0.5 text-white outline-none [&>option]:text-black"
          >
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.outcome}
              </option>
            ))}
          </select>
          <select
            aria-label="Guide ending"
            value={ending}
            onChange={(e) => {
              const v = e.target.value as Ending;
              setEnding(v);
              setParam("ending", v === "new" ? null : v);
            }}
            className="rounded bg-white/10 px-1.5 py-0.5 text-white outline-none [&>option]:text-black"
          >
            <option value="new">new ending</option>
            <option value="actual">real ending</option>
            <option value="control">today, regen</option>
          </select>
          {view !== "repeat" && (
            <button
              onClick={() => {
                const next = view === "longcopy" ? "exit" : "longcopy";
                setView(next);
                setParam("surface", next);
              }}
              className="rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20"
            >
              {view === "longcopy" ? "Exit question" : "Paywall"}
            </button>
          )}
          {!realFrame && (
            <button
              onClick={() => setPeek((p) => !p)}
              className="rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20 lg:hidden"
            >
              {peek ? "Show sheet" : "Peek at chat"}
            </button>
          )}
          {!previewSamplesAreReal && (
            <span className="rounded bg-rose-500/25 px-1.5 py-0.5 font-semibold text-rose-200">PLACEHOLDER</span>
          )}
          {lastAction && <span className="text-teal-300">{lastAction}</span>}
        </div>
      </div>

      {sample && (
        <>
          {/* Phones / tablets: the chat, with the sheet docked to the bottom */}
          <div className="lg:hidden">
            <div className={view === "exit" ? "pb-[52vh]" : "pb-[78vh]"}>
              <ChatMoment sample={sample} ending={ending} personaName={persona.name} avatarUrl={persona.avatarUrl} lockText={lockText} />
            </div>
            {!realFrame && !peek && (
              <>
                <div className="pointer-events-none fixed inset-0 z-40 bg-black/35" />
                <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full sm:max-w-md sm:pb-4">{sheet}</div>
              </>
            )}
          </div>

          {/* Wide screens: chat moment and sheet side by side */}
          <div className="hidden lg:block">
            <div className="mx-auto grid max-w-5xl grid-cols-2 items-start gap-10 px-6 py-8">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <ChatMoment sample={sample} ending={ending} personaName={persona.name} avatarUrl={persona.avatarUrl} lockText={lockText} />
              </div>
              {!realFrame && <div className="mx-auto w-full max-w-md">{sheet}</div>}
            </div>
          </div>

          {/* The real Dialog wrappers, for a true-to-life check (?frame=dialog) */}
          {realFrame && view === "longcopy" && (
            <LongCopyPaywallDialog key={sample.id} open onOpenChange={() => {}} {...panelProps} />
          )}
          {realFrame && view === "exit" && <ExitReasonDialog open onOpenChange={() => {}} onPick={onPick} />}
          {realFrame && view === "repeat" && <RepeatBuyerPaywallDialog open onOpenChange={() => {}} {...repeatProps} />}
        </>
      )}
    </div>
  );
}
