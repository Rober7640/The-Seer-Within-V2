import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { VslVideoPlayer } from '@/components/evelyn/VslVideoPlayer';
import { STONES, stoneLabel, isStone, WELCOME_STONES_LIVE_AT, type StoneKey } from '@shared/evelynVsl';
import { track as trackBase, getDistinctId } from '@/lib/posthog';
import { trackViewContent } from '@/lib/facebook';

const STORAGE_KEY = 'evelyn_vsl_v1';

// Every event this funnel fires is tagged funnel=evelynvsl so the PostHog funnel
// (vsl_view → checkout_initiated → purchase_completed) and revenue insights group
// cleanly — matching the server's purchase_completed (backendPurchaseAnalytics).
const trackPH = (event: string, props: Record<string, unknown> = {}) =>
  trackBase(event, { ...props, funnel: 'evelynvsl' });

interface VslState {
  stone: StoneKey;
  ctaShown: boolean;
  pitchPos: number;
}

function loadVslState(): VslState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !isStone(parsed.stone)) return null;
    return {
      stone: parsed.stone,
      ctaShown: Boolean(parsed.ctaShown),
      pitchPos: typeof parsed.pitchPos === 'number' && parsed.pitchPos >= 0 ? parsed.pitchPos : 0,
    };
  } catch {
    return null;
  }
}

function saveVslState(state: VslState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent — localStorage may be unavailable (private mode, quota); funnel still works
  }
}

/**
 * /evelyn/reading — the two-video VSL: welcome (stone pick) -> pitch (CTA).
 * Returning visitors with a saved stone skip straight to the pitch, resumed at their
 * last saved position. PostHog events (vsl_*) plus a Meta ViewContent fire when the
 * pitch video begins (Task 11, spec §7) — deduped via sessionStorage so a re-render
 * or a return visit within the same tab never double-fires it.
 */
export default function ReadingPage() {
  // Read localStorage once; a fresh pick later updates `stone` via setState, not this.
  const initialState = useMemo(() => loadVslState(), []);

  const [stone, setStone] = useState<StoneKey | null>(initialState?.stone ?? null);
  const [ctaShown, setCtaShown] = useState(initialState?.ctaShown ?? false);
  const [showBackupButtons, setShowBackupButtons] = useState(false);

  const resumeAtRef = useRef(initialState?.pitchPos ?? 0);
  const lastKnownPitchPosRef = useRef(initialState?.pitchPos ?? 0);
  const lastSavedPitchPosRef = useRef(initialState?.pitchPos ?? 0);
  const pitchViewFiredRef = useRef(false);

  const phase: 'welcome' | 'pitch' = stone ? 'pitch' : 'welcome';

  // vsl_view + Meta ViewContent fire once the pitch starts — either a return visit
  // (stone already known on mount) or right after a fresh pick swaps the page into
  // the pitch player. ViewContent is deduped via sessionStorage (not just the ref)
  // so it still fires exactly once across a reload/return within the same tab,
  // matching the SoulmateUpsellPage.tsx dedup idiom.
  useEffect(() => {
    if (phase === 'pitch' && stone && !pitchViewFiredRef.current) {
      pitchViewFiredRef.current = true;
      trackPH('vsl_view', { stone });

      const dedupKey = 'evelyn_viewcontent_fired';
      if (typeof window !== 'undefined' && !window.sessionStorage.getItem(dedupKey)) {
        window.sessionStorage.setItem(dedupKey, '1');
        trackViewContent('Soulmate Initials Reading', undefined, getDistinctId());
      }
    }
  }, [phase, stone]);

  const handleWelcomeFailure = useCallback(() => {
    // Welcome video error/stall — surface the backup stone buttons at once.
    setShowBackupButtons(true);
  }, []);

  // Backup stone buttons appear when the welcome video's REAL playback time crosses
  // WELCOME_STONES_LIVE_AT (same moment its in-video tap zones go live) — not wall-clock,
  // so an autoplay-blocked/buffering video doesn't reveal them before a frame has played.
  const handleWelcomeTimeUpdate = useCallback((t: number) => {
    if (t >= WELCOME_STONES_LIVE_AT) {
      setShowBackupButtons(true);
    }
  }, []);

  const handleWelcomeProgress = useCallback((pct: number) => {
    trackPH('vsl_progress', { video: 'welcome', pct });
  }, []);

  const pickStone = useCallback((picked: StoneKey, via: 'video' | 'button') => {
    const state: VslState = { stone: picked, ctaShown: false, pitchPos: 0 };
    saveVslState(state);
    resumeAtRef.current = 0;
    lastKnownPitchPosRef.current = 0;
    lastSavedPitchPosRef.current = 0;
    trackPH('vsl_stone_pick', { stone: picked, via });
    setCtaShown(false);
    setStone(picked);
  }, []);

  const handlePitchSoundOn = useCallback(() => {
    trackPH('vsl_sound_on', { video: 'pitch' });
  }, []);

  const handlePitchProgress = useCallback((pct: number) => {
    trackPH('vsl_progress', { video: 'pitch', pct });
  }, []);

  // Track the pitch's current time every tick; persist it only every ~5s so a reload/return
  // resumes close to where the visitor left off, without a localStorage write per frame.
  const handlePitchTimeUpdate = useCallback(
    (t: number) => {
      lastKnownPitchPosRef.current = t;
      if (!stone) return;
      if (t - lastSavedPitchPosRef.current >= 5 || t < lastSavedPitchPosRef.current) {
        lastSavedPitchPosRef.current = t;
        saveVslState({ stone, ctaShown, pitchPos: t });
      }
    },
    [stone, ctaShown],
  );

  const handlePitchCtaShown = useCallback(() => {
    if (!stone) return;
    setCtaShown(true);
    saveVslState({ stone, ctaShown: true, pitchPos: lastKnownPitchPosRef.current });
    trackPH('vsl_cta_shown', { stone });
  }, [stone]);

  // Pitch error/stall > 8s (VslVideoPlayer's STALL_TIMEOUT_MS), or a transient play()
  // rejection, routes here too — per T7 review, showing the CTA at once is correct.
  const handlePitchFailure = useCallback(() => {
    handlePitchCtaShown();
  }, [handlePitchCtaShown]);

  const handleCtaClick = useCallback(() => {
    if (!stone) return;
    trackPH('vsl_cta_click', { stone });
  }, [stone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black py-8 px-4">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-5">
          <h1 className="text-2xl font-semibold text-white mb-2" data-testid="text-vsl-headline">
            Ready to learn your soulmate's initials?
          </h1>
          <p className="text-purple-200 text-sm" data-testid="text-vsl-subhead">
            Press play — Evelyn has a message for you.
          </p>
        </header>

        {phase === 'welcome' && (
          <>
            <VslVideoPlayer
              kind="welcome"
              onStonePick={(picked, via) => pickStone(picked, via)}
              onProgress={handleWelcomeProgress}
              onTimeUpdate={handleWelcomeTimeUpdate}
              onFailure={handleWelcomeFailure}
            />
            {showBackupButtons && (
              <div className="mt-4 grid grid-cols-3 gap-2" data-testid="backup-stone-buttons">
                {STONES.map(({ key }) => (
                  <button
                    key={key}
                    type="button"
                    className="rounded-lg border border-purple-400/50 bg-purple-950/60 text-purple-100 text-sm font-medium py-2.5 px-2 hover:bg-purple-900/80 transition-colors"
                    data-testid={`button-backup-stone-${key}`}
                    onClick={() => pickStone(key, 'button')}
                  >
                    {stoneLabel(key)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {phase === 'pitch' && stone && (
          <>
            <VslVideoPlayer
              kind="pitch"
              resumeAt={resumeAtRef.current || undefined}
              onSoundOn={handlePitchSoundOn}
              onProgress={handlePitchProgress}
              onTimeUpdate={handlePitchTimeUpdate}
              onCtaShown={handlePitchCtaShown}
              onFailure={handlePitchFailure}
            />
            {ctaShown && (
              <div className="mt-4" data-testid="vsl-cta">
                <Link
                  href={`/evelyn/checkout?stone=${stone}`}
                  onClick={handleCtaClick}
                  data-testid="link-vsl-cta"
                  className="block w-full text-center rounded-lg bg-purple-500 hover:bg-purple-400 transition-colors text-white font-semibold py-3.5 px-4"
                >
                  Get my reading — <span className="line-through opacity-70 mr-1">$74</span> $19
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
