/**
 * Prompt-target resolution — which store holds a given persona's live prompt.
 *
 * SAFETY: these tests only READ, but they run against whatever DATABASE_URL is
 * active, so they refuse to run against production. The gate is an ALLOWLIST
 * (localhost, or the known dev Supabase project) rather than a denylist, so a
 * new/unknown non-local database skips rather than being read by default.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { pool } from '../server/lib/db';
import { resolvePromptTarget, describeTarget } from '../scripts/lib/prompt-target';

const URL = process.env.DATABASE_URL ?? '';
const DEV_PROJECT_REF = 'qetspnbrivomtyzfexak';
const isSafeTarget = /localhost|127\.0\.0\.1/.test(URL) || URL.includes(DEV_PROJECT_REF);

describe('resolvePromptTarget', { skip: !URL || !isSafeTarget }, () => {
  test('a persona with no prompt experiment resolves to its base prompt', async () => {
    const t = await resolvePromptTarget('marcus-stone');
    assert.equal(t.kind, 'base');
    assert.ok(t.personaId);
    assert.equal(t.personaSlug, 'marcus-stone');
    assert.ok(typeof t.currentPrompt === 'string');
  });

  test('evelyn-cross resolves to her experiment when one is scoped to her', async () => {
    const t = await resolvePromptTarget('evelyn-cross');
    if (t.kind === 'experiment') {
      assert.ok(t.key.startsWith('persona_prompt_'));
      assert.equal(t.variant, 'B');
      assert.ok(['draft', 'running'].includes(t.status));
    } else {
      // Acceptable on a DB with no experiment seeded — the fork still resolves.
      assert.equal(t.kind, 'base');
    }
  });

  test('an unknown slug throws rather than silently targeting nothing', async () => {
    await assert.rejects(() => resolvePromptTarget('not-a-persona'), /persona not found/i);
  });

  test('describeTarget names the store a human would need to check', async () => {
    const d = describeTarget(await resolvePromptTarget('marcus-stone'));
    assert.match(d, /personas\.base_system_prompt/);
  });

  test('every non-Evelyn persona resolves to a store without throwing', async () => {
    for (const slug of ['aiden-powers', 'luna-voss', 'marcus-stone', 'maren-soleil', 'nova-sharma']) {
      const t = await resolvePromptTarget(slug);
      assert.ok(['base', 'experiment'].includes(t.kind), `${slug} resolved to ${t.kind}`);
      assert.equal(t.personaSlug, slug);
    }
  });
});

// Without this the pg pool keeps the event loop alive and the run never exits
// (same pattern as improve-v2/receipt-guard.test.ts:251).
test.after(async () => { await pool.end(); });
