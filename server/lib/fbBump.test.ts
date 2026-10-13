// /fb order-bump test routing (node:test — run with
// `npx tsx --test server/lib/fbBump.test.ts`).
//
// /fb gets its OWN bump experiment so it can run plain-vs-bump 50/50 while
// palm/tarot/read keep serving the concluded copy test's winner. The danger is
// the reverse leak: if palm/tarot/read ever resolved to the /fb key, their bump
// would vanish (the /fb row is scoped to v1-fb only). These pin both directions.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// experiments.ts builds a DB pool at import; nothing here queries it.
process.env.DATABASE_URL ??= 'postgres://unit:unit@127.0.0.1:1/unit';
const { v1BumpKeyFor, V1_FB_BUMP_EXPERIMENT_KEY, V1_BUMP_EXPERIMENT_KEY } = await import('./experiments');

describe('v1BumpKeyFor', () => {
  it('/fb uses its own experiment', () => {
    assert.equal(V1_FB_BUMP_EXPERIMENT_KEY, 'v1_fb_order_bump_2026');
    assert.equal(v1BumpKeyFor('v1-fb'), V1_FB_BUMP_EXPERIMENT_KEY);
  });

  it('every other funnel keeps the existing bump experiment', () => {
    for (const f of ['v1-palm', 'v1-tarot', 'v1-read', 'v1-fb2', 'v1-gdn', null, undefined, '']) {
      assert.equal(v1BumpKeyFor(f), V1_BUMP_EXPERIMENT_KEY, String(f));
    }
  });

  it('the two keys are different', () => {
    assert.notEqual(V1_FB_BUMP_EXPERIMENT_KEY, V1_BUMP_EXPERIMENT_KEY);
  });
});
