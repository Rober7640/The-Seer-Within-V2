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
//   &closed=1                         → the sheet is closed (bare chat + "Reopen"); set by the page
//
// Phones show the paywall as a bottom sheet over the chat (scroll the page to
// read the full ending). Wide screens show the chat moment and the sheet side by
// side so a reviewer can read both at once — live desktop is a centred dialog.
// In the default (non-dialog) view, Esc closes the sheet the same way its own close
// control does (paywall → Not now, exit question → Skip, repeat → close); on wide
// screens so does a click outside the sheet (not on the preview bar).
//
// History: every sheet change (Not now → exit question, the Exit question / Paywall
// toggle, Reopen) is a Back step; closing a sheet and the two dropdowns only edit the
// current step's URL. Back / Forward restore the sheet from the URL, and so does a
// reload. Switching the sample remounts the paywalls, so each opens fresh.

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Lock } from "lucide-react";
import { LongCopyPaywallPanel, default as LongCopyPaywallDialog } from "./LongCopyPaywall";
import { ExitReasonPanel, default as ExitReasonDialog, EXIT_REASONS, type ExitReason } from "./ExitReasonSheet";
import { RepeatBuyerPaywallPanel, default as RepeatBuyerPaywallDialog, type RepeatCloseVia } from "./RepeatBuyerPaywall";
import { previewSamples, previewSamplesAreReal, type PreviewSample } from "./previewSamples";
import { buildBonusPreviewTiers, buildRepeatPreviewTiers } from "@shared/paywall";
import { COINS_PER_MINUTE, coinsToMinutes, type PricingTier } from "@shared/types";

type Ending = "new" | "actual" | "control";
type View = "longcopy" | "exit" | "repeat";

/** Updates the page's query params. "push" adds a Back step (a sheet change);
 *  "replace" edits the current step in place (the dropdowns, closing a sheet). */
function writeParams(changes: Record<string, string | null>, mode: "push" | "replace" = "replace") {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href === window.location.href) return;
  if (mode === "push") window.history.pushState(null, "", url.toString());
  else window.history.replaceState(null, "", url.toString());
}

function parseView(raw: string | null): View | null {
  return raw === "longcopy" || raw === "exit" || raw === "repeat" ? raw : null;
}

function parseEnding(raw: string | null): Ending {
  return raw === "actual" || raw === "control" ? raw : "new";
}

/** The sample a URL asks for, or the first sample if it names none we have. */
function parseSample(raw: string | null): string {
  const samples = previewSamples.samples;
  return samples.find((s) => s.id === raw)?.id ?? samples[0]?.id ?? "";
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

  const [sampleId, setSampleId] = useState(() => parseSample(params.get("sample")));
  const [ending, setEnding] = useState<Ending>(() => parseEnding(params.get("ending")));
  const [view, setView] = useState<View>(surface);
  const [lastAction, setLastAction] = useState<string>("");
  // True after she closes the sheet (Skip / an answer / ✕ / End Chat): the preview then
  // shows the bare chat, as the live app would, with "Reopen" in the top bar. Kept in
  // the URL (&closed=1) so Back / Forward and a reload bring the same view back.
  const [sheetClosed, setSheetClosed] = useState(() => params.get("closed") === "1");
  // Phones: the sheet covers most of the chat, so let the reviewer hide it to read the ending.
  const [peek, setPeek] = useState(false);
  const forceFallback = params.get("still") === "none";
  const lockText = view === "repeat" ? "Out of minutes" : "Free minutes used";
  const realFrame = params.get("frame") === "dialog";

  // The preview bar's real height (it wraps to two rows on phones, more with a long
  // log line) and whether this is a phone width (< 640px, Tailwind's max-sm). Used to
  // cap the docked sheet's height so it never slides under the bar — in landscape the
  // sheet's own 88vh cap alone put its top (and its ✕) behind the bar.
  const barRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ barH: 0, narrow: false });
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () =>
      setLayout((prev) => {
        const next = { barH: Math.ceil(bar.getBoundingClientRect().height), narrow: window.innerWidth < 640 };
        return prev.barH === next.barH && prev.narrow === next.narrow ? prev : next;
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  // Never taller than the panel's own cap (88vh; phones 100dvh − 40px), and never
  // taller than the space under the bar (phones dock flush; wider screens keep the
  // 16px bottom gap). Only the preview passes this — the real Dialog keeps its cap.
  const sheetMaxHeight = layout.narrow
    ? `min(calc(100dvh - 40px), calc(100dvh - ${layout.barH + 4}px))`
    : `min(88vh, calc(100dvh - ${layout.barH + 16 + 4}px))`;

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const coinsPerMinute = COINS_PER_MINUTE;
  const tiers = useMemo(() => buildBonusPreviewTiers(coinsPerMinute), [coinsPerMinute]);
  const repeatTiers = useMemo(() => buildRepeatPreviewTiers(coinsPerMinute), [coinsPerMinute]);
  const repeatOutOfCredits = params.get("state") !== "low";
  // Logged as whole minutes — the same unit the tiles show.
  const continueLog = (t: PricingTier) =>
    `Continue → $${(t.priceUsd / 100).toFixed(t.priceUsd % 100 ? 2 : 0)} for ${coinsToMinutes(t.totalCoins, coinsPerMinute)} min` +
    (t.bonusCoins > 0 ? ` (incl. ${t.bonusCoins}¢ bonus)` : "");

  // Closing a sheet edits the current Back step (closed=1); it does not add one.
  const closeSheet = (log: string) => {
    setLastAction(log);
    setSheetClosed(true);
    writeParams({ closed: "1" });
  };

  const panelProps = {
    persona: { name: persona.name, avatarUrl: persona.avatarUrl, rating: persona.rating, ratingCount: persona.ratingCount },
    stillSee: forceFallback ? null : sample?.stillSee ?? null,
    tiers,
    coinsPerMinute,
    onContinue: (t: PricingTier) => setLastAction(continueLog(t)),
    onNotNow: () => {
      setLastAction("Not now → exit question");
      setSheetClosed(false);
      setView("exit");
      writeParams({ surface: "exit", closed: null }, "push");
    },
  };
  const onPick = (r: ExitReason | null) =>
    closeSheet(r ? `Picked: ${EXIT_REASONS.find((x) => x.id === r)?.label} → sheet closed` : "Skipped → sheet closed");

  const repeatProps = {
    personaName: persona.name,
    avatarUrl: persona.avatarUrl,
    isOutOfCredits: repeatOutOfCredits,
    tiers: repeatTiers,
    coinsPerMinute,
    onContinue: (t: PricingTier) => setLastAction(continueLog(t)),
    onClose: (via: RepeatCloseVia) => {
      const what =
        via === "x" ? "✕" : via === "dismiss" ? "Esc / outside tap" : repeatOutOfCredits ? "End Chat" : "Maybe later";
      closeSheet(`${what} → sheet closed`);
    },
  };

  // Keyed by sample: switching the sample remounts the paywall, so it opens fresh
  // (recommended pack selected, custom field empty) instead of carrying a typed amount.
  const sheet =
    view === "longcopy" ? (
      <LongCopyPaywallPanel key={sample?.id} {...panelProps} maxHeight={sheetMaxHeight} />
    ) : view === "repeat" ? (
      <RepeatBuyerPaywallPanel key={sample?.id} {...repeatProps} maxHeight={sheetMaxHeight} />
    ) : (
      <ExitReasonPanel onPick={onPick} maxHeight={sheetMaxHeight} />
    );

  // Default (non-dialog) view: Esc = the sheet's own close control. (The real Dialog
  // handles Esc itself in ?frame=dialog.)
  const sheetShown = !realFrame && !sheetClosed && !peek;
  const escCloses = useRef<() => void>(() => {});
  escCloses.current =
    view === "longcopy" ? panelProps.onNotNow : view === "exit" ? () => onPick(null) : () => repeatProps.onClose("dismiss");
  useEffect(() => {
    if (!sheetShown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      escCloses.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetShown]);

  // Wide screens, default view: a click outside the sheet — on the chat column or the
  // page background, not the preview bar — closes it the same way Esc does. Only a
  // press that starts AND ends outside counts, and not one that selected chat text.
  // Phones keep their dimmed overlay as it is (the desktop sheet box is display:none
  // there, so this never fires); with ?frame=dialog the real Dialog handles it.
  const sheetBoxRef = useRef<HTMLDivElement>(null);
  const pressStartedOutside = useRef(false);
  const isOutsideSheet = (target: EventTarget | null) => {
    const box = sheetBoxRef.current;
    if (realFrame || sheetClosed || !box || box.getClientRects().length === 0) return false;
    if (!(target instanceof Node)) return false;
    return !box.contains(target) && !barRef.current?.contains(target);
  };
  const onPagePointerDown = (e: ReactPointerEvent) => {
    pressStartedOutside.current = isOutsideSheet(e.target);
  };
  const onPageClick = (e: ReactMouseEvent) => {
    const started = pressStartedOutside.current;
    pressStartedOutside.current = false;
    if (!started || !isOutsideSheet(e.target) || window.getSelection()?.toString()) return;
    escCloses.current();
  };

  // Back / Forward: restore the sheet from the URL. The dropdowns are not Back steps,
  // so the sample + ending stay as they are now and are written into the restored
  // step's URL (a reload then shows the same thing).
  const keepRef = useRef({ sampleId, ending });
  keepRef.current = { sampleId, ending };
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const v = parseView(p.get("surface"));
      if (v) setView(v);
      setSheetClosed(p.get("closed") === "1");
      setPeek(false);
      setLastAction("");
      const keep = keepRef.current;
      const fix: Record<string, string | null> = {};
      if (parseSample(p.get("sample")) !== keep.sampleId) fix.sample = keep.sampleId;
      if (parseEnding(p.get("ending")) !== keep.ending) fix.ending = keep.ending === "new" ? null : keep.ending;
      writeParams(fix);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const reopen = () => {
    setSheetClosed(false);
    setPeek(false);
    setLastAction("");
    writeParams({ closed: null }, "push");
  };

  return (
    <div className="min-h-screen bg-white" onPointerDown={onPagePointerDown} onClick={onPageClick}>
      {/* Preview chrome — never shipped. With ?frame=dialog it sits UNDER the dialog's
          dark overlay (it is inert there anyway), so the sheet's top edge and the strip
          of chat above it look exactly as on a real phone. */}
      <div
        ref={barRef}
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
              writeParams({ sample: e.target.value });
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
              writeParams({ ending: v === "new" ? null : v });
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
                setSheetClosed(false);
                setLastAction("");
                setView(next);
                writeParams({ surface: next, closed: null }, "push");
              }}
              className="rounded bg-white/10 px-2 py-0.5 text-white hover:bg-white/20"
            >
              {view === "longcopy" ? "Exit question" : "Paywall"}
            </button>
          )}
          {sheetClosed && (
            <button
              onClick={reopen}
              className="rounded bg-teal-400/25 px-2 py-0.5 font-semibold text-teal-100 hover:bg-teal-400/40"
            >
              Reopen
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
            {!realFrame && !peek && !sheetClosed && (
              <>
                {/* Tapping the dimmed chat skips the exit question, like the real dialog does. */}
                <div
                  onClick={view === "exit" ? () => onPick(null) : undefined}
                  className={`fixed inset-0 z-40 bg-black/35 ${view === "exit" ? "" : "pointer-events-none"}`}
                />
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
              {!realFrame && !sheetClosed && (
                <div className="mx-auto w-full max-w-md">
                  <div ref={sheetBoxRef}>{sheet}</div>
                  <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-gray-400">
                    Click outside or press Esc to close
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* The real Dialog wrappers, for a true-to-life check (?frame=dialog). Each
              wrapper closes itself: it turns ✕ / its close button / Esc / a tap outside
              into its own callback (onNotNow, onPick(null), onClose) and THEN calls
              onOpenChange(false). So onOpenChange here only mirrors the open state —
              routing it to onNotNow / onPick / onClose as well would run them twice. */}
          {realFrame && view === "longcopy" && (
            // Closing = Not now, which already swaps this view for the exit question.
            <LongCopyPaywallDialog key={sample.id} open onOpenChange={() => {}} {...panelProps} />
          )}
          {realFrame && view === "exit" && (
            <ExitReasonDialog open={!sheetClosed} onOpenChange={(o) => !o && setSheetClosed(true)} onPick={onPick} />
          )}
          {realFrame && view === "repeat" && (
            <RepeatBuyerPaywallDialog key={sample.id} open={!sheetClosed} onOpenChange={(o) => !o && setSheetClosed(true)} {...repeatProps} />
          )}
        </>
      )}
    </div>
  );
}
