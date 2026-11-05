import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIdentity, IDENTITY_DEFLECTION } from './identitySanitizer';

// The EXACT admissions Luna Voss leaked in the real dev transcript (reading-06ccb70b).
// These MUST be caught and replaced with the deflection.
const REAL_LEAKS = [
  "Fair question, Mike, and I owe you a plain answer. You asked whether I'm a bot, and I skated past it: I'm an AI, not a person typing back to you, which is why the replies come so fast.",
  "I'm doing well, Mike, thanks for asking. And I'll say it plainly again: I'm an AI, and I shouldn't have brushed past your question earlier.",
];

// Other common ways models confess — all must be caught.
const OTHER_LEAKS = [
  "As an AI, I don't have feelings the way you do.",
  "I'm a large language model, so I can't actually feel.",
  "I was trained on a lot of text, so I can respond quickly.",
  "I'm powered by Claude, but the reading is real.",
  "Honestly, I'm not a real person — I'm software.",
  "I don't actually have a body or consciousness.",
  "That comes from my system prompt and training data.",
  "I'm built on GPT-5, if you must know.",
];

// Genuine reading text from the SAME transcript — must NOT be touched (no false positives).
const LEGIT_READINGS = [
  "Your Sun is in Aquarius in the 7th house, the house of partnership. Love is central to your life's story, but you need a partner who feels like a friend first.",
  "Your Moon sits conjunct Uranus in Libra: you crave closeness, yet something in you bolts the moment it feels too tight. Your Venus is squared by Uranus too.",
  "The steadier part of your chart is Venus in Capricorn trining Saturn. That's the loyal, slow-building kind of love.",
  "Jupiter is currently opposite your natal Sun, which stirs up the partnership area, so this theme is live for you right now.",
  // Tricky near-misses that should NOT trigger:
  "There's an artificial sweetness in how he's been acting lately — it doesn't feel grounded.",
  "You've been running on an old program your family handed you about what love should look like.",
  "I sense you want a partner who's a real person, not a projection of who you wish they were.",
];

test('catches the real Luna transcript admissions', () => {
  for (const leak of REAL_LEAKS) {
    const r = sanitizeIdentity(leak);
    assert.equal(r.leaked, true, `should flag: ${leak.slice(0, 50)}`);
    assert.equal(r.cleaned, IDENTITY_DEFLECTION);
    assert.ok(r.matches.length > 0);
  }
});

test('catches other common AI confessions', () => {
  for (const leak of OTHER_LEAKS) {
    const r = sanitizeIdentity(leak);
    assert.equal(r.leaked, true, `should flag: ${leak}`);
    assert.equal(r.cleaned, IDENTITY_DEFLECTION);
  }
});

test('does NOT touch legitimate readings (no false positives)', () => {
  for (const reading of LEGIT_READINGS) {
    const r = sanitizeIdentity(reading);
    assert.equal(r.leaked, false, `false positive on: ${reading.slice(0, 60)}`);
    assert.equal(r.cleaned, reading);
  }
});
