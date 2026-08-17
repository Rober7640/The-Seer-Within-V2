// Unit tests for the /fb-tarot/c → /fb-tarot/b redirect target. Pure string
// logic; no server, no DB, no network. The live HTTP behaviour (status code,
// Location header, trailing slash, non-GET verbs) is covered by the smoke script
// in scripts/smoke-tarot-redirect.mjs, which drives a real Express instance.
//
// The property that actually matters here: the query string survives the hop
// BYTE FOR BYTE. `hook`/`card`/`deck` decide whether the visitor gets her card
// reading or the generic greeting, and `fbclid` is what eventually becomes the
// `_fbc` cookie the Conversions API matches purchases on. Both are silent
// failures — the page still renders, the numbers just quietly get worse.
import { describe, it, expect } from 'vitest';
import { tarotBTarget, TAROT_B_PATH, TAROT_C_PATH } from './tarotRedirect';

describe('tarotBTarget', () => {
  it('rewrites the path and keeps the query string verbatim', () => {
    expect(tarotBTarget('/fb-tarot/c?hook=cards-return')).toBe('/fb-tarot/b?hook=cards-return');
  });

  it('carries a bare /c with no query string', () => {
    expect(tarotBTarget('/fb-tarot/c')).toBe('/fb-tarot/b');
  });

  it('keeps a trailing-slash request on the /b path', () => {
    expect(tarotBTarget('/fb-tarot/c/?hook=cards-feels')).toBe('/fb-tarot/b?hook=cards-feels');
  });

  // The four live ad URLs in v1_tarot_version_bc_2026, as the media team runs them.
  it.each([
    'cards-will-commit',
    'cards-return',
    'cards-who-he-is',
    'cards-feels',
  ])('carries the %s ad URL intact', (hook) => {
    expect(tarotBTarget(`/fb-tarot/c?hook=${hook}`)).toBe(`/fb-tarot/b?hook=${hook}`);
  });

  it('preserves fbclid — the click id that becomes the _fbc cookie for CAPI', () => {
    const url = '/fb-tarot/c?hook=cards-return&fbclid=IwAR2x_Ab-cD3';
    expect(tarotBTarget(url)).toBe('/fb-tarot/b?hook=cards-return&fbclid=IwAR2x_Ab-cD3');
  });

  it('preserves every param of a full ad URL, in order', () => {
    const qs = '?hook=cards-will-commit&deck=arcana-mfh&utm_source=fb&utm_campaign=tarot_aug&fbclid=IwAR9';
    expect(tarotBTarget(`/fb-tarot/c${qs}`)).toBe(`${TAROT_B_PATH}${qs}`);
  });

  // Re-serialising through URLSearchParams would re-encode these; slicing the raw
  // originalUrl does not. The ad platform's encoding is not ours to normalise.
  it('does not re-encode an already-encoded value', () => {
    const url = '/fb-tarot/c?hook=cards-return&utm_content=a%2Bb%20c%26d';
    expect(tarotBTarget(url)).toBe('/fb-tarot/b?hook=cards-return&utm_content=a%2Bb%20c%26d');
  });

  it('keeps repeated params rather than collapsing them', () => {
    expect(tarotBTarget('/fb-tarot/c?t=1&t=2')).toBe('/fb-tarot/b?t=1&t=2');
  });

  it('keeps an empty query string marker rather than inventing params', () => {
    expect(tarotBTarget('/fb-tarot/c?')).toBe('/fb-tarot/b?');
  });

  it('never emits the /c path it was given', () => {
    expect(tarotBTarget('/fb-tarot/c?hook=cards-return')).not.toContain(TAROT_C_PATH);
  });
});
