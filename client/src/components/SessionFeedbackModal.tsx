import { useState } from "react";
import { authFetch, useAuth } from "@/hooks/useAuth";
import { X, Star } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SessionFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  personaName: string;
  personaAvatarUrl?: string | null;
}

export default function SessionFeedbackModal({
  open,
  onOpenChange,
  sessionId,
  personaName,
  personaAvatarUrl,
}: SessionFeedbackModalProps) {
  const { user } = useAuth();
  const [starRating, setStarRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [showName, setShowName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!sessionId || starRating === 0) return;
    setIsSubmitting(true);
    try {
      await authFetch(`/api/chat-service/session/${sessionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starRating,
          feedbackText: feedbackText.trim() || undefined,
          displayName: showName ? (displayName.trim() || user?.firstName || undefined) : undefined,
        }),
      });
      setSubmitted(true);
    } catch {
      // Still show thank-you even if the request fails — don't frustrate the user
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStarRating(0);
      setHoveredStar(0);
      setFeedbackText("");
      setShowName(false);
      setDisplayName("");
      setSubmitted(false);
    }, 300);
  };

  const displayStar = hoveredStar || starRating;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0d1f2d 0%, #0f2535 50%, #0a1a28 100%)" }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {submitted ? (
            /* ── Thank-you screen ── */
            <div className="px-6 pt-10 pb-8 flex flex-col items-center text-center">
              {/* Persona avatar */}
              {personaAvatarUrl ? (
                <img
                  src={personaAvatarUrl}
                  alt={personaName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-teal-400/50 mb-4"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-teal-700/40 flex items-center justify-center border-2 border-teal-400/50 mb-4">
                  <span className="text-2xl font-bold text-teal-300">
                    {personaName.charAt(0)}
                  </span>
                </div>
              )}

              <h2 className="text-white text-xl font-bold mb-2">
                Thank you for your feedback!
              </h2>
              <p className="text-white/60 text-sm mb-8">
                I hope you had a great session
              </p>

              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all"
                style={{ background: "linear-gradient(90deg, #0d9488, #14b8a6)" }}
              >
                OK
              </button>
            </div>
          ) : (
            /* ── Rating + feedback screen ── */
            <div className="px-6 pt-8 pb-6">
              {/* Heading */}
              <h2 className="text-white text-lg font-bold text-center leading-snug mb-5">
                How would you rate the<br />consultation with {personaName}?
              </h2>

              {/* Star rating */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoveredStar(n)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setStarRating(n)}
                    className="transition-transform hover:scale-110 active:scale-95"
                    aria-label={`${n} star`}
                  >
                    <Star
                      className="w-9 h-9"
                      fill={n <= displayStar ? "#14b8a6" : "none"}
                      stroke={n <= displayStar ? "#14b8a6" : "#4b6e7a"}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 mb-5" />

              {/* Feedback label */}
              <h3 className="text-white font-semibold text-base text-center mb-1">
                Please leave your feedback about {personaName}
              </h3>
              <p className="text-white/50 text-xs text-center mb-3">
                It's important for advisors to know your opinion
              </p>

              {/* Textarea */}
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What did you like or dislike?"
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm px-4 py-3 resize-none focus:outline-none focus:border-teal-500/60 transition-colors mb-4"
              />

              {/* Name opt-in */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none mb-1">
                <input
                  type="checkbox"
                  checked={showName}
                  onChange={(e) => {
                    setShowName(e.target.checked);
                    if (e.target.checked && !displayName) {
                      setDisplayName(user?.firstName || "");
                    }
                  }}
                  className="w-4 h-4 rounded border border-white/20 bg-white/10 accent-teal-500"
                />
                <span className="text-white/55 text-xs">Show my name on this review</span>
              </label>
              {showName && (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  placeholder="Your name"
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm px-4 py-2.5 focus:outline-none focus:border-teal-500/60 transition-colors mb-2"
                />
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || starRating === 0}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    starRating === 0 || isSubmitting
                      ? "rgba(255,255,255,0.1)"
                      : "linear-gradient(90deg, #0d9488, #14b8a6)",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit"
                )}
              </button>

              {/* Help link */}
              <p className="text-center text-white/30 text-xs mt-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/30 flex items-center justify-center text-[8px] font-bold">?</span>
                  Having trouble? Please{" "}
                  <a href="mailto:support@theseerwithin.com" className="text-teal-400 underline">
                    contact us
                  </a>
                </span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
