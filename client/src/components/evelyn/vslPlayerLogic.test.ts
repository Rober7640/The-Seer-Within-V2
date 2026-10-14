import { describe, it, expect } from 'vitest';
import { zonesActive, stoneAtPoint, ctaVisible, progressPct } from './vslPlayerLogic';

describe('vsl player logic', () => {
  it('stones are inert before 48.6s and live after', () => {
    expect(zonesActive(48.5)).toBe(false);
    expect(zonesActive(48.6)).toBe(true);
  });
  it('maps a tap in the middle deck to jade', () => {
    expect(stoneAtPoint(0.5, 0.85)).toBe('jade');
    expect(stoneAtPoint(0.15, 0.85)).toBe('rose-quartz');
    expect(stoneAtPoint(0.80, 0.85)).toBe('garnet');
    expect(stoneAtPoint(0.5, 0.2)).toBeNull(); // above the decks
  });
  it('CTA appears at 368.2s and stays once shown', () => {
    expect(ctaVisible(100, false)).toBe(false);
    expect(ctaVisible(368.2, false)).toBe(true);
    expect(ctaVisible(0, true)).toBe(true); // return visit
  });
  it('clamps progress', () => {
    expect(progressPct(30, 60)).toBe(50);
    expect(progressPct(90, 60)).toBe(100);
    expect(progressPct(5, 0)).toBe(0);
  });
});
