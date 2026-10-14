import { useEffect, useRef, useState, useCallback } from 'react';
import { VIDEO, STONES, TAP_ZONES, type StoneKey } from '@shared/evelynVsl';
import { zonesActive, stoneAtPoint, ctaVisible, progressPct } from './vslPlayerLogic';

type ProgressMilestone = 25 | 50 | 75 | 100;
const MILESTONES: ProgressMilestone[] = [25, 50, 75, 100];
const STALL_TIMEOUT_MS = 8000;

export interface VslVideoPlayerProps {
  kind: 'welcome' | 'pitch';
  onStonePick?: (stone: StoneKey, via: 'video' | 'button') => void;
  onCtaShown?: () => void;
  onProgress?: (pct: ProgressMilestone) => void;
  onSoundOn?: () => void;
  onFailure?: () => void;
  resumeAt?: number;
}

/**
 * Plain, controls-free <video> for the Evelyn VSL funnel. No seek bar, no native controls.
 * Owns only playback + tap-zone/CTA/progress logic (via vslPlayerLogic.ts); the page (Task 8)
 * owns localStorage, routing, and tracking.
 */
export function VslVideoPlayer({
  kind,
  onStonePick,
  onCtaShown,
  onProgress,
  onSoundOn,
  onFailure,
  resumeAt,
}: VslVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureFiredRef = useRef(false);
  const ctaShownRef = useRef(false);
  const resumedRef = useRef(false);
  const firedMilestonesRef = useRef(new Set<ProgressMilestone>());

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(kind === 'welcome');
  const [soundOn, setSoundOn] = useState(kind !== 'welcome');
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeStone, setActiveStone] = useState<StoneKey | null>(null);

  const source = VIDEO[kind];
  const zonesLive = kind === 'welcome' && zonesActive(currentTime);

  const reportFailure = useCallback(() => {
    if (failureFiredRef.current) return;
    failureFiredRef.current = true;
    onFailure?.();
  }, [onFailure]);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const armStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      reportFailure();
    }, STALL_TIMEOUT_MS);
  }, [clearStallTimer, reportFailure]);

  // Attempt autoplay (welcome: muted) on mount; show tap-to-play fallback if rejected.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (kind === 'pitch' && resumeAt && !resumedRef.current) {
      resumedRef.current = true;
      try {
        video.currentTime = resumeAt;
      } catch {
        // ignore — will seek once metadata is ready via onLoadedMetadata fallback
      }
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => {
          setPlaying(true);
          armStallTimer();
        })
        .catch(() => {
          setNeedsTapToPlay(true);
          setPlaying(false);
        });
    }

    return () => clearStallTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    if (kind === 'pitch' && resumeAt && !resumedRef.current) {
      resumedRef.current = true;
      try {
        video.currentTime = resumeAt;
      } catch {
        // ignore
      }
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCurrentTime(t);
    armStallTimer();

    if (kind === 'pitch') {
      const d = video.duration || duration;
      const pct = progressPct(t, d);
      for (const milestone of MILESTONES) {
        if (pct >= milestone && !firedMilestonesRef.current.has(milestone)) {
          firedMilestonesRef.current.add(milestone);
          onProgress?.(milestone);
        }
      }

      if (!ctaShownRef.current && ctaVisible(t, ctaShownRef.current)) {
        ctaShownRef.current = true;
        onCtaShown?.();
      }
    }
  };

  const handlePlaying = () => {
    setPlaying(true);
    armStallTimer();
  };

  const handlePause = () => {
    setPlaying(false);
    clearStallTimer();
  };

  const handleError = () => {
    clearStallTimer();
    reportFailure();
  };

  const handleEnded = () => {
    clearStallTimer();
    setPlaying(false);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => reportFailure());
    } else {
      video.pause();
    }
  };

  const handleTapToPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsTapToPlay(false);
    video.play().then(() => setPlaying(true)).catch(() => reportFailure());
  };

  // First unmuted tap: unmute + restart at 0 + fire onSoundOn. Later taps: toggle play/pause.
  const handleFirstSoundTap = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    setMuted(false);
    setSoundOn(true);
    onSoundOn?.();
    video.play().catch(() => reportFailure());
  };

  const handleVideoAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (needsTapToPlay) {
      handleTapToPlay();
      return;
    }

    if (kind === 'welcome' && !soundOn) {
      handleFirstSoundTap();
      return;
    }

    if (kind === 'welcome' && zonesLive) {
      const rect = e.currentTarget.getBoundingClientRect();
      const xFrac = (e.clientX - rect.left) / rect.width;
      const yFrac = (e.clientY - rect.top) / rect.height;
      const stone = stoneAtPoint(xFrac, yFrac);
      if (stone) {
        pickStone(stone, 'video');
        return;
      }
    }

    togglePlayPause();
  };

  const pickStone = (stone: StoneKey, via: 'video' | 'button') => {
    setActiveStone(stone);
    window.setTimeout(() => setActiveStone(null), 400);
    onStonePick?.(stone, via);
  };

  const progress = progressPct(currentTime, duration || videoRef.current?.duration || 0);

  return (
    <div
      className="relative w-full aspect-[9/16] bg-black overflow-hidden rounded-xl select-none"
      data-testid={`vsl-player-${kind}`}
      onClick={handleVideoAreaClick}
    >
      <video
        ref={videoRef}
        playsInline
        muted={muted}
        preload="auto"
        poster={source.poster}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid={`video-${kind}`}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onError={handleError}
        onEnded={handleEnded}
      >
        <source src={source.src} type="video/mp4" />
      </video>

      {kind === 'welcome' && !soundOn && !needsTapToPlay && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full pointer-events-none animate-pulse"
          data-testid="badge-tap-for-sound"
        >
          🔊 Tap for sound
        </div>
      )}

      {needsTapToPlay && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          data-testid="overlay-tap-to-play"
        >
          <button
            type="button"
            className="flex flex-col items-center gap-2 text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleTapToPlay();
            }}
            data-testid="button-tap-to-play"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/90 text-purple-700 text-2xl shadow-lg">
              ▶
            </span>
            <span className="text-sm font-medium">Tap to hear Evelyn</span>
          </button>
        </div>
      )}

      {kind === 'welcome' &&
        STONES.map(({ key }) => (
          <StoneTapZone
            key={key}
            stone={key}
            active={activeStone === key}
            live={zonesLive}
            onPick={() => pickStone(key, 'button')}
          />
        ))}

      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"
        data-testid={`progress-track-${kind}`}
      >
        <div
          className="h-full bg-purple-400 transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
          data-testid={`progress-bar-${kind}`}
        />
      </div>

      {!playing && !needsTapToPlay && soundOn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-black/40 text-white text-xl">
            ▶
          </span>
        </div>
      )}
    </div>
  );
}

function StoneTapZone({
  stone,
  active,
  live,
  onPick,
}: {
  stone: StoneKey;
  active: boolean;
  live: boolean;
  onPick: () => void;
}) {
  const label = stone
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <button
      type="button"
      aria-label={live ? `Pick ${label}` : undefined}
      inert={!live ? true : undefined}
      tabIndex={live ? 0 : -1}
      className={[
        'absolute rounded-xl transition-shadow duration-200',
        live ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none',
        live ? 'ring-2 ring-purple-300/70 shadow-[0_0_20px_rgba(216,180,254,0.65)] animate-pulse' : '',
        active ? 'ring-4 ring-white shadow-[0_0_30px_rgba(255,255,255,0.9)]' : '',
      ].join(' ')}
      style={zoneStyle(stone)}
      data-testid={`stone-zone-${stone}`}
      data-live={live}
      onClick={(e) => {
        e.stopPropagation();
        if (live) onPick();
      }}
    />
  );
}

// Pulls the % geometry straight from TAP_ZONES (shared/evelynVsl.ts) — no hardcoded fractions here.
function zoneStyle(stone: StoneKey): React.CSSProperties {
  const zone = TAP_ZONES[stone];
  return {
    left: `${zone.x0 * 100}%`,
    top: `${zone.y0 * 100}%`,
    width: `${(zone.x1 - zone.x0) * 100}%`,
    height: `${(zone.y1 - zone.y0) * 100}%`,
  };
}
