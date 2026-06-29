// EvelynQuizMechanic — the "quiz" variant of the /evelyn lander (Phase 4c
// structural A/B vs the open chatbox). A 3-tap single-select quiz that changes
// only the ENGAGEMENT surface: it finishes through the SAME handleCta the chatbox
// uses (the lander passes it as `onComplete`), so signup, the lander-session
// linkage (5-min grant + verified drip), segment-aware routing, and bucket are
// identical across arms and the A/B isolates the mechanic. The taps are engagement
// only (analytics), not signup intake.
//
// Rendered only when assign('evelyn_lander','mechanic')==='quiz'; the lander shows
// the chatbox otherwise (default), so OFF is byte-identical.

import { useState, useRef, useEffect } from "react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { track as trackPH } from "@/lib/posthog";
import { EVELYN_QUIZ, type QuizOption } from "@/lib/evelynQuizData";

type Phase = "intro" | "quiz" | "transition";

/**
 * @param onComplete the lander's handleCta — runs the shared signup hand-off.
 * @param onAlreadyHaveAccount the lander's existing-login escape hatch.
 */
export default function EvelynQuizMechanic({
  onComplete,
  onAlreadyHaveAccount,
}: {
  onComplete: () => void;
  onAlreadyHaveAccount?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  // Track pending auto-advance timers so a mid-transition unmount (e.g. browser
  // back) never fires onComplete()/setState after the component is gone.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  function pick(opt: QuizOption) {
    if (selected) return; // ignore double-taps while auto-advancing
    setSelected(opt.value);
    trackPH("quiz_answer", { funnel: "evelyn", step: EVELYN_QUIZ[step].id, value: opt.value });

    later(() => {
      if (step < EVELYN_QUIZ.length - 1) {
        setStep((s) => s + 1);
        setSelected(null);
      } else {
        setPhase("transition");
        trackPH("quiz_completed", { funnel: "evelyn" });
        // Brief "reading the energy" beat, then the shared signup hand-off.
        later(onComplete, 1200);
      }
    }, 280);
  }

  const q = EVELYN_QUIZ[step];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <CosmicBackground />

      <Card className="bg-white/95 backdrop-blur-md border-white/20 w-full max-w-md relative z-10">
        <CardContent className="pt-6 pb-6 space-y-5">
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

          {phase === "intro" && (
            <div className="space-y-4 text-center border-t border-purple-100 pt-5">
              <p className="font-serif text-base text-gray-800 leading-relaxed">
                Three quick taps and I'll tune into what the energy is showing me about you.
              </p>
              <Button
                onClick={() => setPhase("quiz")}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Begin my reading
              </Button>
            </div>
          )}

          {phase === "quiz" && (
            <div className="space-y-4 border-t border-purple-100 pt-5">
              <div className="flex items-center justify-center gap-1.5">
                {EVELYN_QUIZ.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-purple-600" : i < step ? "w-3 bg-purple-300" : "w-3 bg-purple-100"
                    }`}
                  />
                ))}
              </div>
              <p className="font-serif text-base text-gray-900 text-center leading-relaxed">{q.prompt}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => pick(opt)}
                    disabled={!!selected}
                    className={`w-full text-left rounded-md border px-4 py-3 text-sm transition-colors disabled:cursor-default ${
                      selected === opt.value
                        ? "border-purple-500 bg-purple-50 text-purple-900"
                        : "border-purple-200 bg-white text-gray-800 hover:border-purple-400 hover:bg-purple-50/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "transition" && (
            <div className="space-y-4 text-center border-t border-purple-100 pt-6 pb-2">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-serif text-base text-gray-800">
                Reading the energy around your answers…
              </p>
            </div>
          )}

          {phase !== "transition" && onAlreadyHaveAccount && (
            <div className="text-center">
              <button onClick={onAlreadyHaveAccount} className="text-xs text-purple-700 hover:underline">
                I already have an account
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
