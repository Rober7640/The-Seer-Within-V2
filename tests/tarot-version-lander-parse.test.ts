// Parsing the admin "ad URLs" box into (hook, deck) pairs.
//
// This is the surface the media buyer actually touches: he pastes the ad URLs he is
// running and expects those exact landers — no more — to enter the Version B-vs-C
// test. A parse slip here does not throw, it silently enrols the WRONG traffic in a
// live money test, so the URL shapes are pinned here rather than trusted.
//
//   npx vitest run tests/tarot-version-lander-parse.test.ts

import { describe, it, expect } from 'vitest';
import { parseLanderLines } from '../client/src/pages/admin/ExperimentsDashboard';
import { DEFAULT_DECK } from '../client/src/content/tarotReads';

// The four URLs the operator supplied for the initial test (2026-08-10), verbatim.
const OPERATOR_URLS = `
https://www.theseerwithin.com/fb-tarot/c?hook=cards-will-commit&utm_source=will_commit
https://www.theseerwithin.com/fb-tarot/c?hook=cards-return&utm_source=come_back
https://www.theseerwithin.com/fb-tarot/c?hook=cards-who-he-is&utm_source=who
https://www.theseerwithin.com/fb-tarot/c?hook=cards-feels&utm_source=feel_you
`;

describe('parseLanderLines', () => {
  it('parses the operator\'s four ad URLs to the four clean landers', () => {
    expect(parseLanderLines(OPERATOR_URLS)).toEqual([
      { hook: 'cards-will-commit', deck: DEFAULT_DECK },
      { hook: 'cards-return', deck: DEFAULT_DECK },
      { hook: 'cards-who-he-is', deck: DEFAULT_DECK },
      { hook: 'cards-feels', deck: DEFAULT_DECK },
    ]);
  });

  it('ignores utm_source and any other trailing params', () => {
    // The hook must come from ?hook=, never from position — these URLs carry a
    // utm_source that LOOKS like a hook name ("come_back" for cards-return).
    const [l] = parseLanderLines(
      'https://www.theseerwithin.com/fb-tarot/c?hook=cards-return&utm_source=come_back&fbclid=xyz',
    );
    expect(l).toEqual({ hook: 'cards-return', deck: DEFAULT_DECK });
  });

  it('🔴 an explicit &deck= is kept — it is a DIFFERENT lander from the clean URL', () => {
    // cards-return runs on two live ad URLs. Collapsing them would enrol a face-up
    // lander the operator excluded.
    expect(
      parseLanderLines(`
        https://www.theseerwithin.com/fb-tarot/c?hook=cards-return
        https://www.theseerwithin.com/fb-tarot/c?hook=cards-return&deck=arcana-mfh
      `),
    ).toEqual([
      { hook: 'cards-return', deck: DEFAULT_DECK },
      { hook: 'cards-return', deck: 'arcana-mfh' },
    ]);
  });

  it('accepts a path-only URL as well as a full https one', () => {
    expect(parseLanderLines('/fb-tarot/c?hook=cards-feels')).toEqual([
      { hook: 'cards-feels', deck: DEFAULT_DECK },
    ]);
  });

  it('accepts a bare "hook deck" pair, and a bare hook alone', () => {
    expect(parseLanderLines('cards-feels arcana-mfh')).toEqual([
      { hook: 'cards-feels', deck: 'arcana-mfh' },
    ]);
    expect(parseLanderLines('cards-feels')).toEqual([{ hook: 'cards-feels', deck: DEFAULT_DECK }]);
  });

  it('round-trips what the form renders back into the box', () => {
    // toForm writes `hook deck` per line; re-parsing must be a no-op, or an edit that
    // only touches the weights would silently rewrite the lander list.
    const landers = parseLanderLines(OPERATOR_URLS);
    const rendered = landers.map((l) => `${l.hook} ${l.deck}`).join('\n');
    expect(parseLanderLines(rendered)).toEqual(landers);
  });

  it('drops blank lines and de-duplicates a URL pasted twice', () => {
    expect(
      parseLanderLines(`
        /fb-tarot/c?hook=cards-feels

        /fb-tarot/c?hook=cards-feels
      `),
    ).toEqual([{ hook: 'cards-feels', deck: DEFAULT_DECK }]);
  });

  it('throws on a line with no hook rather than inventing one', () => {
    // Failing loudly in the form beats enrolling a lander nobody asked for.
    expect(() => parseLanderLines('https://www.theseerwithin.com/fb-tarot/c?utm_source=who')).toThrow(
      /could not find a hook/,
    );
  });

  it('an empty box means no lander filter at all', () => {
    expect(parseLanderLines('')).toEqual([]);
    expect(parseLanderLines('\n  \n')).toEqual([]);
  });
});
