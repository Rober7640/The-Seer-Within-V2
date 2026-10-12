// ExitReasonSheet — the one-tap "What stopped you?" question shown after a
// first-timer taps "Not now" on the paywall. Cheap research: the answers tell us
// whether the 94% who don't buy are held back by trust (more copy), by the
// reading ending too soon (the free-trial wrap-up), or by price (bonus minutes).
//
// PREVIEW ONLY for now: rendered on /paywall-preview?surface=exit. No server
// endpoint yet — the host decides what to do with the pick.

import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";
import { DialogTitleIf, focusDialogItself } from "./BonusPackTile";

export type ExitReason = "price" | "not_sure_real" | "got_what_needed" | "just_looking";

export const EXIT_REASONS: { id: ExitReason; label: string }[] = [
  { id: "price", label: "The price" },
  { id: "not_sure_real", label: "Not sure it's real" },
  { id: "got_what_needed", label: "I got what I needed" },
  { id: "just_looking", label: "Just looking" },
];

export interface ExitReasonSheetProps {
  /** Called with the tapped reason, or null for Skip / ✕ (and, in the Dialog, Esc or a tap outside). */
  onPick: (reason: ExitReason | null) => void;
}

export function ExitReasonPanel({
  onPick,
  inDialog,
  maxHeight,
}: ExitReasonSheetProps & {
  /** Rendered inside the real Dialog: the heading becomes its title. */
  inDialog?: boolean;
  /** Preview page only: a tighter height cap (CSS length) so it never sits under the preview bar. */
  maxHeight?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl max-sm:rounded-b-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-purple-900/30 to-transparent" />

      {/* ✕ = Skip. She must always have an obvious way out of a survey. */}
      <button
        onClick={() => onPick(null)}
        aria-label="Close"
        className="group absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all group-hover:bg-white/20 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-white/60">
          <X className="h-4 w-4" />
        </span>
      </button>

      {/* Same height cap + internal scroll as the paywalls, so on a short landscape
          screen (667×320) the heading, every answer and Skip can be scrolled to; the ✕
          sits outside the scroller and stays put. */}
      <div
        style={maxHeight ? { maxHeight } : undefined}
        className="relative z-10 max-h-[88vh] overflow-y-auto px-5 pb-4 pt-6 max-sm:max-h-[calc(100dvh-40px)]"
      >
        <DialogTitleIf on={inDialog}>
          <h2 className="px-8 text-center font-serif text-[22px] font-bold leading-tight text-white">What stopped you?</h2>
        </DialogTitleIf>

        <div className="mt-5 space-y-2.5">
          {EXIT_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r.id)}
              className="w-full rounded-2xl border-2 border-white/10 bg-white/[0.05] px-4 py-3.5 text-left text-[15px] font-semibold text-white/90 transition-colors hover:border-teal-400/60 hover:bg-teal-400/10 active:scale-[0.99]"
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPick(null)}
          className="mx-auto mt-2 flex h-10 items-center px-4 text-[13px] font-medium text-white/45 underline-offset-2 transition-colors hover:text-white/75 hover:underline"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

/** The panel inside the same Dialog + phone bottom-sheet as the paywall. It closes
 *  itself so a survey can never trap her: an answer calls onPick(reason), and Skip, ✕,
 *  Esc and a tap outside call onPick(null) — each followed by onOpenChange(false). */
export default function ExitReasonSheet({
  open,
  onOpenChange,
  onPick,
}: ExitReasonSheetProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pick = (reason: ExitReason | null) => {
    onPick(reason);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : pick(null))}>
      <DialogContent
        onOpenAutoFocus={focusDialogItself}
        // The heading is the whole message; there is no separate description.
        aria-describedby={undefined}
        className={`sm:max-w-sm p-0 bg-transparent border-0 shadow-none focus:outline-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}
      >
        <ExitReasonPanel onPick={pick} inDialog />
      </DialogContent>
    </Dialog>
  );
}
