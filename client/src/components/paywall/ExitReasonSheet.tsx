// ExitReasonSheet — the one-tap "What stopped you?" question shown after a
// first-timer taps "Not now" on the paywall. Cheap research: the answers tell us
// whether the 94% who don't buy are held back by trust (more copy), by the
// reading ending too soon (the free-trial wrap-up), or by price (bonus minutes).
//
// PREVIEW ONLY for now: rendered on /paywall-preview?surface=exit. No server
// endpoint yet — the host decides what to do with the pick.

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";

export type ExitReason = "price" | "not_sure_real" | "got_what_needed" | "just_looking";

export const EXIT_REASONS: { id: ExitReason; label: string }[] = [
  { id: "price", label: "The price" },
  { id: "not_sure_real", label: "Not sure it's real" },
  { id: "got_what_needed", label: "I got what I needed" },
  { id: "just_looking", label: "Just looking" },
];

export interface ExitReasonSheetProps {
  /** Called with the tapped reason, or null when she taps Skip. */
  onPick: (reason: ExitReason | null) => void;
}

export function ExitReasonPanel({ onPick }: ExitReasonSheetProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl max-sm:rounded-b-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-purple-900/30 to-transparent" />

      <div className="relative z-10 px-5 pb-4 pt-6">
        <h2 className="text-center font-serif text-[22px] font-bold leading-tight text-white">What stopped you?</h2>

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
          className="mx-auto mt-3 block px-4 py-2 text-[13px] font-medium text-white/45 underline-offset-2 transition-colors hover:text-white/75 hover:underline"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

/** The panel inside the same Dialog + phone bottom-sheet as the paywall. */
export default function ExitReasonSheet({
  open,
  onOpenChange,
  onPick,
}: ExitReasonSheetProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={`sm:max-w-sm p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}
      >
        <ExitReasonPanel onPick={onPick} />
      </DialogContent>
    </Dialog>
  );
}
