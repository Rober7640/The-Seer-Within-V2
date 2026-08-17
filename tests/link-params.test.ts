// Guards the emailed-link query parser (client/src/lib/funnel.ts → linkParams).
//
// 🔴 THE BUG THIS EXISTS TO PREVENT, in full, because it cost a live test run and
// left no trace anywhere:
//
// The recovery link is `<funnel>/chat?resume=<uuid>&src=recovery`. In HTML mail an
// `&` inside an href is correctly written as the entity `&amp;`. Browsers decode it
// when following the link, so a real click is fine — but the entity survives when
// the raw href is copied out of the message, or when a client renders a plain-text
// part. `URLSearchParams` then splits on the literal `&` inside `&amp;` and glues
// `amp;` to the NEXT parameter's name:
//
//     ?resume=<uuid>&amp;src=recovery
//        →  resume    = <uuid>        ✅
//           amp;src   = recovery      ❌  get("src") === null
//
// The failure is near-silent by construction. `resume` is FIRST, so it always
// survives and the reading restores perfectly; only the parameters after it are
// destroyed. On 2026-08-17 that produced a live purchase where the reading resumed
// correctly and the Stripe order carried neither `metadata.src` nor the " - Recovery"
// description — with nothing in any log to say why.
//
// Ordering is therefore load-bearing, and the asserts below deliberately cover a
// param in EVERY position rather than just `src`.
//
//   npx tsx --test tests/link-params.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { linkParams } from '../client/src/lib/funnel';

const UUID = '79b1115d-e6c6-4202-abf3-e3803702e961';

describe('linkParams — well-formed URLs are untouched', () => {
  // THE regression guard: normal traffic must parse exactly as URLSearchParams does.
  it('parses a clean query identically to URLSearchParams', () => {
    const q = `?resume=${UUID}&src=recovery`;
    assert.equal(linkParams(q).get('resume'), UUID);
    assert.equal(linkParams(q).get('src'), 'recovery');
    assert.deepEqual([...linkParams(q).keys()], [...new URLSearchParams(q).keys()]);
  });

  it('handles an empty or single-param query', () => {
    assert.equal(linkParams('').get('src'), null);
    assert.equal(linkParams('?src=recovery').get('src'), 'recovery');
  });

  it('leaves a legitimate literal "amp;" value alone', () => {
    // Only the entity is rewritten, never a value that merely contains the text.
    assert.equal(linkParams('?q=amp%3Bsrc').get('q'), 'amp;src');
  });
});

describe('linkParams — email-mangled URLs (&amp; instead of &)', () => {
  it('recovers `src` from the exact URL that broke the 2026-08-17 live test', () => {
    const q = `?resume=${UUID}&amp;src=recovery`;

    // Proof the mangling is real, not theoretical — this is what the old code saw.
    assert.equal(new URLSearchParams(q).get('src'), null);
    assert.equal(new URLSearchParams(q).get('amp;src'), 'recovery');

    // And what the fix sees.
    assert.equal(linkParams(q).get('resume'), UUID);
    assert.equal(linkParams(q).get('src'), 'recovery');
    assert.equal(linkParams(q).get('amp;src'), null, 'the mangled key must not survive');
  });

  it('protects `resume` too, which today survives only by being first', () => {
    // If anything is ever prepended to the query, `resume` becomes the casualty and
    // the reader is silently restarted instead of restored.
    const q = `?utm_source=aweber&amp;resume=${UUID}&amp;src=recovery`;
    assert.equal(new URLSearchParams(q).get('resume'), null); // the failure
    assert.equal(linkParams(q).get('resume'), UUID);
    assert.equal(linkParams(q).get('src'), 'recovery');
  });

  it('protects the no-optin arm, which reads the query the same way', () => {
    const q = '?sign=thumb&amp;noemail=1';
    assert.equal(new URLSearchParams(q).get('noemail'), null);
    assert.equal(linkParams(q).get('noemail'), '1');
  });

  it('handles &AMP; and &Amp; — entities are case-insensitive in HTML', () => {
    assert.equal(linkParams(`?resume=${UUID}&AMP;src=recovery`).get('src'), 'recovery');
    assert.equal(linkParams(`?resume=${UUID}&Amp;src=recovery`).get('src'), 'recovery');
  });

  it('handles several mangled separators in one query', () => {
    const q = `?resume=${UUID}&amp;src=recovery&amp;sign=thumb`;
    const p = linkParams(q);
    assert.equal(p.get('resume'), UUID);
    assert.equal(p.get('src'), 'recovery');
    assert.equal(p.get('sign'), 'thumb');
  });

  it('handles a mix of mangled and clean separators', () => {
    const q = `?resume=${UUID}&src=recovery&amp;sign=thumb`;
    const p = linkParams(q);
    assert.equal(p.get('resume'), UUID);
    assert.equal(p.get('src'), 'recovery');
    assert.equal(p.get('sign'), 'thumb');
  });
});
