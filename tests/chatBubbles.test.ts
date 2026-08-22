// Unit tests for the Live Thread opener splitter.
//
// Runs under vitest (`npm run test:vitest`), whose include globs cover
// tests/**/*.test.ts. Pure function, node environment, no DOM needed.
import { describe, it, expect } from 'vitest';
import { splitIntoBubbles, MAX_OPENER_BUBBLES } from '@/lib/chatBubbles';

// A real seed, copied verbatim from emailReadingBriefs.ts (reframe-01-changed).
const REAL_SEED =
  "You came to find your real question — good. Tell me the one you keep asking about them, and let's find what's actually hiding under it.";

// The component's own FALLBACK_SEED, used when a campaign resolves nothing.
const FALLBACK_SEED =
  "You came back — good. I've been holding a thread for you since that email went out. Tell me what's been sitting with you, and I'll tell you what's actually underneath it.";

describe('splitIntoBubbles', () => {
  it('returns [] for empty or whitespace input so callers can use their own fallback', () => {
    expect(splitIntoBubbles('')).toEqual([]);
    expect(splitIntoBubbles('   \n  ')).toEqual([]);
  });

  it('keeps a single sentence as one bubble', () => {
    expect(splitIntoBubbles('Tell me what happened.')).toEqual(['Tell me what happened.']);
  });

  it('splits a real minted seed into one bubble per sentence', () => {
    expect(splitIntoBubbles(REAL_SEED)).toEqual([
      'You came to find your real question — good.',
      "Tell me the one you keep asking about them, and let's find what's actually hiding under it.",
    ]);
  });

  it('never splits on the em dash Evelyn uses mid-sentence', () => {
    // The dash in "question — good" must stay inside its bubble; asserted by the
    // test above, restated here as the property that matters.
    for (const bubble of splitIntoBubbles(REAL_SEED)) {
      expect(bubble.startsWith('—')).toBe(false);
    }
  });

  it('lands the fallback seed on three bubbles', () => {
    const bubbles = splitIntoBubbles(FALLBACK_SEED);
    expect(bubbles).toHaveLength(3);
    expect(bubbles[0]).toBe('You came back — good.');
  });

  it('treats authored line breaks as an explicit bubble list', () => {
    expect(splitIntoBubbles('First thing.\n\nSecond thing.\n\nThird thing.')).toEqual([
      'First thing.',
      'Second thing.',
      'Third thing.',
    ]);
    // Single newlines count too — an operator should not have to know which.
    expect(splitIntoBubbles('One.\nTwo.')).toEqual(['One.', 'Two.']);
  });

  it('caps at MAX_OPENER_BUBBLES, preserving order and losing no text', () => {
    const many = 'A one. B two. C three. D four. E five. F six.';
    const bubbles = splitIntoBubbles(many);
    expect(bubbles.length).toBeLessThanOrEqual(MAX_OPENER_BUBBLES);
    expect(bubbles.join(' ')).toBe(many);
  });

  it('caps authored breaks too, so a pathological seed cannot flood the thread', () => {
    const authored = Array.from({ length: 9 }, (_, i) => `Line ${i + 1}.`).join('\n');
    const bubbles = splitIntoBubbles(authored);
    expect(bubbles).toHaveLength(MAX_OPENER_BUBBLES);
    expect(bubbles[0]).toBe('Line 1. Line 2. Line 3.');
  });

  it('honours an explicit max', () => {
    expect(splitIntoBubbles(FALLBACK_SEED, 1)).toEqual([FALLBACK_SEED]);
    expect(splitIntoBubbles(FALLBACK_SEED, 2)).toHaveLength(2);
  });
});
