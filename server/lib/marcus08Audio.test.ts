// Unit tests for the narration builder — the part that turns a structured Marcus
// report into Joel's marcus-audio-v1 segment list (roles + pauses + <=480-char pieces).
// No network/ffmpeg here; those are exercised live once the endpoint runs.
//
//   npx vitest run server/lib/marcus08Audio.test.ts

import { describe, it, expect } from 'vitest';
import { buildNarration, type MarcusReport } from './marcus08Audio';

const longBody = ('This is a sentence about a blind spot. ').repeat(30); // ~1140 chars -> multi-piece

const report: MarcusReport = {
  title: 'Ye Ying’s Tree of Life Reading',
  theme: 'How carefulness turns into quiet over-control',
  opening: 'Ye Ying, this spread looks at where your careful nature turns into over-control.',
  lifePathApplication: 'Your Life Path is 7, The Seeker. You question and reflect.',
  personalCardHeading: 'The Lovers: What You Choose To Share',
  personalCardReading: 'Your personal card is The Lovers. It is about conscious choice.',
  synthesis: 'Across the spread, a clear pattern emerges.',
  conclusion: 'To answer your question directly: your blind spots are about over-control.',
  sections: [
    { positionNumber: 1, cardName: 'The Moon', positionLabel: 'how a blind spot affects you', body: 'Image: In The Moon, a hazy moon hangs. ' + longBody },
    { positionNumber: 4, cardName: 'The World', positionLabel: 'what you keep excusing', body: 'The World shows completion.' },
  ],
};

describe('buildNarration', () => {
  const segs = buildNarration(report);

  it('covers every section in order', () => {
    const roles = segs.map((s) => s.role);
    expect(roles).toContain('opening');
    expect(roles).toContain('numerology');
    expect(roles).toContain('personal-card');
    expect(roles).toContain('card-1');
    expect(roles).toContain('card-4');
    expect(roles).toContain('synthesis');
    expect(roles).toContain('closing');
    // opening is first, closing is last
    expect(segs[0].role).toBe('opening');
    expect(segs[segs.length - 1].role).toBe('closing');
  });

  it('applies marcus-audio-v1 pauses (0 lead, 600 section, 900 closing, 300 paragraph)', () => {
    expect(segs[0].pauseBeforeMs).toBe(0); // never a leading gap
    const firstOf = (role: string) => segs.find((s) => s.role === role)!;
    expect(firstOf('numerology').pauseBeforeMs).toBe(600);
    expect(firstOf('card-1').pauseBeforeMs).toBe(600);
    expect(firstOf('closing').pauseBeforeMs).toBe(900);
    // card-1 body is long -> splits into multiple pieces; the 2nd+ piece uses 300ms
    const card1 = segs.filter((s) => s.role === 'card-1');
    expect(card1.length).toBeGreaterThan(1);
    expect(card1[1].pauseBeforeMs).toBe(300);
  });

  it('keeps every piece within the 480-char Chatterbox limit', () => {
    for (const s of segs) expect(s.text.length).toBeLessThanOrEqual(480);
  });

  it('speaks the card heading as a lead-in and drops the "Image:" prefix', () => {
    const card1First = segs.find((s) => s.role === 'card-1')!;
    expect(card1First.text.startsWith('Position one. The Moon: how a blind spot affects you.')).toBe(true);
    expect(card1First.text.includes('Image:')).toBe(false);
  });

  it('ends on "Marcus."', () => {
    expect(segs[segs.length - 1].text.trim().endsWith('Marcus.')).toBe(true);
  });
});
