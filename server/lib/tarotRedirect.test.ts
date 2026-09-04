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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tarotBTarget, shouldRedirectTarotC, TAROT_C_EXEMPT_HOOKS, TAROT_B_PATH, TAROT_C_PATH } from './tarotRedirect';

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

// ── The Version C campaign exemption ─────────────────────────────────────────
//
// The redirect decides whether a /c ad reaches Version C at all, so the tests that
// matter here are the ones where getting it wrong is SILENT. An over-broad exemption
// quietly flips old ads off Version B; an under-broad one quietly serves Rubie's paid
// campaign the pre-written read she is paying to test against.
describe('shouldRedirectTarotC', () => {
  it('lets a campaign hook through to the /c bridge', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=cards-ever-back')).toBe(false);
  });

  it('still redirects a hook that is not on the campaign', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=cards-honest')).toBe(true);
  });

  // Every ambiguous case must fail SAFE — that is, behave exactly as it did before
  // this exemption existed. Only an exact, known hook opts out.
  it('redirects when there is no query string at all', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c')).toBe(true);
  });

  it('redirects when no hook param is present', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?fbclid=IwAR9')).toBe(true);
  });

  it('redirects an empty hook value', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=')).toBe(true);
  });

  it('redirects an unknown hook rather than guessing', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=cards-not-a-real-hook')).toBe(true);
  });

  // A hook mangled by a copy/paste into Facebook (the next headline running into the
  // URL) must NOT match by prefix — it is not the lander anyone approved.
  it('does not match a mangled hook by prefix', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=cards-destined-or-not-yetGod')).toBe(true);
  });

  it('tolerates case and stray whitespace in the ad URL', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=Cards-Ever-Back')).toBe(false);
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=%20cards-ever-back%20')).toBe(false);
  });

  it('reads the FIRST hook when the param repeats, as the bridge does', () => {
    expect(shouldRedirectTarotC('/fb-tarot/c?hook=cards-ever-back&hook=cards-honest')).toBe(false);
  });

  it('keeps the exemption independent of the other query params', () => {
    const url = '/fb-tarot/c?utm_source=fb&hook=cards-alone-a-decade&fbclid=IwAR9';
    expect(shouldRedirectTarotC(url)).toBe(false);
  });
});

describe('TAROT_C_EXEMPT_HOOKS', () => {
  it('holds exactly the 45 campaign landers', () => {
    expect(TAROT_C_EXEMPT_HOOKS.size).toBe(45);
  });

  // cards-will-commit was ON the campaign list but is deliberately NOT exempt: it sits
  // inside the concluded v1_tarot_version_bc_2026, whose winner rollout overrides the
  // URL, so exempting it would promise Version C and still serve B. Pinned so a future
  // edit has to confront that rather than "fix" the omission.
  it('deliberately excludes cards-will-commit', () => {
    expect(TAROT_C_EXEMPT_HOOKS.has('cards-will-commit')).toBe(false);
  });

  it('is stored lower-case, since lookups normalise', () => {
    for (const h of TAROT_C_EXEMPT_HOOKS) expect(h).toBe(h.toLowerCase().trim());
  });
});

// ── Roster drift: the exemption promises Version C, validHooks has to allow it ──
//
// Version C is the only arm that calls tarotReflect, and that endpoint rejects any
// hook missing from its validHooks roster with a 400. On Version B the roster is
// inert, which is exactly why it drifts unnoticed — and why exempting a hook without
// it means a PAID ad whose chat dies at the handoff. Read as text because validHooks
// is a local const inside the route handler, not an export.
describe('exempt hooks are accepted by the tarot chat handoff', () => {
  it('every exempt hook appears in the validHooks roster in routes.ts', () => {
    const routes = readFileSync(
      fileURLToPath(new URL('../routes.ts', import.meta.url)),
      'utf8',
    );
    const roster = routes.match(/const validHooks = \[[^\]]*"cards-[^\]]*\]/);
    expect(roster, 'tarot validHooks array not found in routes.ts').toBeTruthy();
    const missing = [...TAROT_C_EXEMPT_HOOKS].filter((h) => !roster![0].includes(`"${h}"`));
    expect(missing, `exempt but not in validHooks: ${missing.join(', ')}`).toEqual([]);
  });
});
