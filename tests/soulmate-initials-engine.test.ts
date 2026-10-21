import { describe, it, expect } from 'vitest';
import { computeReadingNumbers } from '../server/lib/soulmateReading/numbers';
import { resolveInitials } from '../server/lib/soulmateReading/initials';
import { drawSeven, RWS_DECK, POSITION_QUESTIONS, cardSlug } from '../server/lib/soulmateReading/draw';
import { PYTHAGOREAN_GROUPS } from '../server/lib/soulmateReading/nameFrequency';

const EXCLUDED = new Set(['Q', 'U', 'X', 'Y', 'Z']);
const FIXED_NOW = new Date(Date.UTC(2026, 9, 15)); // stable "as-of" so personalYear doesn't rot

describe('computeReadingNumbers', () => {
  it('is deterministic and reduces to valid numerology numbers', () => {
    const a = computeReadingNumbers('Priya', '1990-04-12', FIXED_NOW);
    const b = computeReadingNumbers('Priya', '1990-04-12', FIXED_NOW);
    expect(a).toEqual(b);
    for (const n of [a.lifePath, a.firstNameNumber, a.personalYear]) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]).toContain(n);
    }
  });

  it('handles a master-number birth date without throwing', () => {
    expect(() => computeReadingNumbers('Sara', '1988-11-29', FIXED_NOW)).not.toThrow();
  });
});

describe('resolveInitials', () => {
  it('is reproducible for the same order', () => {
    const args = { lifePath: 7, firstNameNumber: 3, sessionId: 'cs_test_abc' };
    expect(resolveInitials(args)).toEqual(resolveInitials(args));
  });

  it('never returns an excluded starting letter, across many seeds', () => {
    for (let i = 0; i < 1000; i++) {
      const { first, last } = resolveInitials({
        lifePath: (i % 9) + 1,
        firstNameNumber: ((i * 7) % 9) + 1,
        sessionId: `cs_sweep_${i}`,
      });
      expect(EXCLUDED.has(first)).toBe(false);
      expect(EXCLUDED.has(last)).toBe(false);
    }
  });

  it('draws the first initial from the Life Path group (when that group has eligible letters)', () => {
    // Life Path 1 → group {A,J,S}; all three are eligible first-name starters.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(resolveInitials({ lifePath: 1, firstNameNumber: 5, sessionId: `cs_g1_${i}` }).first);
    }
    for (const letter of seen) expect(PYTHAGOREAN_GROUPS[1]).toContain(letter);
  });

  it('varies the pick within a group across different session ids', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(resolveInitials({ lifePath: 1, firstNameNumber: 5, sessionId: `cs_var_${i}` }).first);
    }
    expect(seen.size).toBeGreaterThan(1); // group {A,J,S} — not always the same letter
  });

  it('reduces master numbers to a 1–9 group (no crash, valid letter)', () => {
    const { first } = resolveInitials({ lifePath: 22, firstNameNumber: 11, sessionId: 'cs_master' });
    expect(first).toMatch(/^[A-Z]$/);
    expect(EXCLUDED.has(first)).toBe(false);
  });
});

describe('drawSeven', () => {
  it('returns 7 unique cards with the exact position questions', () => {
    const draw = drawSeven('cs_test_draw');
    expect(draw).toHaveLength(7);
    expect(new Set(draw.map((d) => d.card)).size).toBe(7);
    expect(draw.map((d) => d.question)).toEqual([...POSITION_QUESTIONS]);
    expect(draw.map((d) => d.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('is reproducible for the same session id and generally differs across ids', () => {
    expect(drawSeven('cs_same')).toEqual(drawSeven('cs_same'));
    const a = drawSeven('cs_one').map((d) => d.card).join(',');
    const b = drawSeven('cs_two').map((d) => d.card).join(',');
    expect(a).not.toEqual(b);
  });

  it('every card is from the RWS deck and has a well-formed image url', () => {
    for (const d of drawSeven('cs_shape')) {
      expect(RWS_DECK).toContain(d.card);
      expect(d.slug).toBe(cardSlug(d.card));
      expect(d.imageUrl).toBe(`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/${d.slug}.jpg`);
      expect(d.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
