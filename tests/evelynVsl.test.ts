import { describe, it, expect } from 'vitest';
import { STONES, isStone, stoneLabel, TAP_ZONES, WELCOME_STONES_LIVE_AT, PITCH_CTA_AT, VIDEO, EVELYN_VSL_ASSET_BASE } from '@shared/evelynVsl';

describe('evelyn vsl constants', () => {
  it('has exactly the three stones in deck order', () => {
    expect(STONES.map(s => s.key)).toEqual(['rose-quartz', 'jade', 'garnet']);
    expect(stoneLabel('jade')).toBe('Jade');
  });
  it('falls back to "your stone" for anything unknown', () => {
    expect(isStone('amethyst')).toBe(false);
    expect(stoneLabel('amethyst' as any)).toBe('your stone');
    expect(stoneLabel(undefined as any)).toBe('your stone');
  });
  it('pins the key moments and tap zones from the spec', () => {
    expect(WELCOME_STONES_LIVE_AT).toBeCloseTo(48.6);
    expect(PITCH_CTA_AT).toBeCloseTo(368.2);
    expect(TAP_ZONES['rose-quartz']).toMatchObject({ x0: 0.043, x1: 0.333, y0: 0.76, y1: 0.925 });
    expect(TAP_ZONES['garnet'].x1).toBeCloseTo(0.972);
  });
  it('builds video URLs under the immutable v1 prefix', () => {
    expect(EVELYN_VSL_ASSET_BASE).toContain('/evelyn/vsl/v1');
    expect(VIDEO.welcome.src).toBe(`${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p.mp4`);
    expect(VIDEO.pitch.poster).toBe(`${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p-poster.jpg`);
  });
});
