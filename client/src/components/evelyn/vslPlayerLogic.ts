// Pure logic for the Evelyn VSL custom video player. No DOM, no React — unit-tested
// directly. The component (VslVideoPlayer.tsx) calls these helpers; it owns the DOM.
import { TAP_ZONES, WELCOME_STONES_LIVE_AT, PITCH_CTA_AT, type StoneKey } from '@shared/evelynVsl';

/** True once the welcome video has reached the point where the stone tap-zones go live. */
export function zonesActive(currentTime: number): boolean {
  return currentTime >= WELCOME_STONES_LIVE_AT;
}

/**
 * Which TAP_ZONES rect a normalized (0-1) point falls in, or null if it's outside all three.
 * xFrac/yFrac are fractions of the video box width/height (matching TAP_ZONES' measurement).
 */
export function stoneAtPoint(xFrac: number, yFrac: number): StoneKey | null {
  for (const key of Object.keys(TAP_ZONES) as StoneKey[]) {
    const zone = TAP_ZONES[key];
    if (xFrac >= zone.x0 && xFrac <= zone.x1 && yFrac >= zone.y0 && yFrac <= zone.y1) {
      return key;
    }
  }
  return null;
}

/** CTA shows once the pitch video crosses PITCH_CTA_AT, and stays shown (sticky via everShown). */
export function ctaVisible(currentTime: number, everShown: boolean): boolean {
  return everShown || currentTime >= PITCH_CTA_AT;
}

/** Playback progress as a 0-100 percentage, clamped; 0 when duration is 0 (e.g. not loaded yet). */
export function progressPct(currentTime: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  const pct = (currentTime / duration) * 100;
  return Math.max(0, Math.min(100, pct));
}
