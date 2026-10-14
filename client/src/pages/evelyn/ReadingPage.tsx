import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { VslVideoPlayer } from '@/components/evelyn/VslVideoPlayer';
import { STONES, stoneLabel, WELCOME_STONES_LIVE_AT, type StoneKey } from '@shared/evelynVsl';
import { track as trackPH } from '@/lib/posthog';

const STORAGE_KEY = 'evelyn_vsl_v1';
const PITCH_SAVE_INTERVAL_MS = 5000;

interface VslState {
  stone: StoneKey;
  ctaShown: boolean;
  pitchPos: number;
}

function isStoneKey(x: unknown): x is StoneKey {
  return typeof x === 'string' && STONES.some((s) => s.key === x);
}

function loadVslState(): VslState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !isStoneKey(parsed.stone)) return null;
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
 * last saved position. PostHog events only (vsl_*) — Meta pixel wiring is Task 11's job.
 */
export default function ReadingPage() {
  // Read localStorage once; a fresh pick later updates `stone` via setState, not this.
  const initialState = useMemo(() => loadVslState(), []);

  const [stone, setStone] = useState<StoneKey | null>(initialState?.stone ?? null);
  const [ctaShown, setCtaShown] = useState(initialState?.ctaShown ?? false);
  const [showBackupButtons, setShowBackupButtons] = useState(false);

  const resumeAtRef = useRef(initialState?.pitchPos ?? 0);
  const lastKnownPosRef = useRef(initialState?.pitchPos ?? 0);
  const pitchViewFiredRef = useRef(false);

  const phase: 'welcome' | 'pitch' = stone ? 'pitch' : 'welcome';

  // vsl_view fires once the pitch starts — either a return visit (stone already known on
  // mount) or right after a fresh pick swaps the page into the pitch player.
  useEffect(() => {
    if (phase === 'pitch' && stone && !pitchViewFiredRef.current) {
      pitchViewFiredRef.current = true;
      trackPH('vsl_view', { stone });
    }
  }, [phase, stone]);

  // Backup stone buttons appear at WELCOME_STONES_LIVE_AT (same moment the in-video tap
  // zones go live) regardless of welcome-video failure, which shows them immediately below.
  useEffect(() => {
    if (phase !== 'welcome') return;
    const timer = window.setTimeout(() => {
      setShowBackupButtons(true);
    }, WELCOME_STONES_LIVE_AT * 1000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleWelcomeFailure = useCallback(() => {
    setShowBackupButtons(true);
  }, []);

  const pickStone = useCallback((picked: StoneKey, via: 'video' | 'button') => {
    const state: VslState = { stone: picked, ctaShown: false, pitchPos: 0 };
    saveVslState(state);
    resumeAtRef.current = 0;
    lastKnownPosRef.current = 0;
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

  const handlePitchCtaShown = useCallback(() => {
    if (!stone) return;
    setCtaShown(true);
    saveVslState({ stone, ctaShown: true, pitchPos: lastKnownPosRef.current });
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

  // Persist pitch playback position every ~5s so a reload/return resumes close to where the
  // visitor left off. VslVideoPlayer doesn't expose currentTime via props, so we read it off
  // the rendered <video data-testid="video-pitch"> element it owns — the same handle
  // Playwright (Task 12) drives directly to test resume/CTA timing.
  useEffect(() => {
    if (phase !== 'pitch' || !stone) return;
    const interval = window.setInterval(() => {
      const videoEl = document.querySelector<HTMLVideoElement>('[data-testid="video-pitch"]');
      if (!videoEl) return;
      const pos = videoEl.currentTime || 0;
      lastKnownPosRef.current = pos;
      saveVslState({ stone, ctaShown, pitchPos: pos });
    }, PITCH_SAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [phase, stone, ctaShown]);

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
