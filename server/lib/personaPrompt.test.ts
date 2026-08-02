// DB integration tests for the Phase-4b persona-prompt A/B path (the live AI
// system-prompt experiment). Proves the safety invariant — no running test (or
// the control arm) ⇒ the base prompt, byte-identical, no exposure — and that a
// running test is sticky, applies the treatment arm's payload.systemPrompt, logs
// the right exposure, ignores a concluded test for the same persona (running-only;
// no winner rollout for prompts), and reverts to base when a test concludes.
//
//   npm run test:experiments        (or: npm run test:local server/lib/personaPrompt.test.ts)
//
// Requires DATABASE_URL (skips otherwise). Run the migration first so the
// experiment tables exist: npx tsx server/scripts/migrateExperiments.ts
//
// assertLocalDb() at module scope, and it is not decoration: `dotenv/config`
// below loads .env, whose DATABASE_URL is PRODUCTION Supabase, and this file
// INSERTs experiment rows. The isolation note further down (synthetic persona
// ids, unique keys, full cleanup) bounds the BLAST RADIUS of writing to the
// live database — it never stopped the writes from going there. The header
// used to recommend a bare `tsx --test`, and `npm run test:experiments` carried
// no --env-file; both now go through .env.test.
//
// Isolation: all experiments use unique `persona_prompt_*` keys + SYNTHETIC
// persona ids (never a real persona, never the live persona_prompt_evelyn_2026
// draft), so the resolver — which finds tests by persona — can't pick up or
// disturb anything live. Everything is cleaned up in after().

import 'dotenv/config'; // must load DATABASE_URL before ./db builds the pool
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { experiments, experimentExposures } from '../../shared/schema';
import {
  resolvePersonaPrompt,
  getActivePromptExperimentKey,
  logExposure,
  _resetExperimentCache,
} from './experiments';

const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();

// Synthetic persona ids (no real persona, no FK on scope) — one per scenario so
// scenarios never cross-contaminate the per-persona resolver.
const PERSONA_RUN = '00000000-0000-0000-0000-0000000a0001';
const PERSONA_WIN = '00000000-0000-0000-0000-0000000a0002';
const PERSONA_PREFER = '00000000-0000-0000-0000-0000000a0003';
const PERSONA_NONE = '00000000-0000-0000-0000-0000000a0004';

const PP_RUN = `persona_prompt_run_${STAMP}`;
const PP_WIN = `persona_prompt_win_${STAMP}`;
const PP_PREF_RUN = `persona_prompt_prefrun_${STAMP}`;
const PP_PREF_DONE = `persona_prompt_prefdone_${STAMP}`;
const ALL_KEYS = [PP_RUN, PP_WIN, PP_PREF_RUN, PP_PREF_DONE];

const BASE = `BASE prompt ${STAMP}`;
const B_PROMPT = `TREATMENT B prompt ${STAMP}`;
const WIN_PROMPT = `WINNER prompt ${STAMP}`;
const PREF_RUN_PROMPT = `PREFER-RUNNING prompt ${STAMP}`;

const armsAB = (bPrompt: string) => [
  { key: 'A', weight: 50, payload: {} },
  { key: 'B', weight: 50, payload: { systemPrompt: bPrompt } },
];

before(async () => {
  if (!hasDb) return;
  await db.insert(experiments).values([
    {
      key: PP_RUN,
      name: 'pp run test',
      status: 'draft', // flipped to running mid-suite
      subjectType: 'user',
      variants: armsAB(B_PROMPT),
      scope: { personaId: PERSONA_RUN },
      conversion: { type: 'credit_purchase', windowDays: 7 },
    },
    {
      key: PP_WIN,
      name: 'pp winner test',
      status: 'done',
      winnerVariant: 'B',
      subjectType: 'user',
      variants: armsAB(WIN_PROMPT),
      scope: { personaId: PERSONA_WIN },
      conversion: { type: 'credit_purchase', windowDays: 7 },
    },
    {
      key: PP_PREF_DONE,
      name: 'pp prefer (concluded)',
      status: 'done',
      winnerVariant: 'A',
      subjectType: 'user',
      variants: armsAB('stale done prompt'),
      scope: { personaId: PERSONA_PREFER },
      conversion: { type: 'credit_purchase', windowDays: 7 },
    },
    {
      key: PP_PREF_RUN,
      name: 'pp prefer (running)',
      status: 'running',
      startedAt: new Date(),
      subjectType: 'user',
      variants: armsAB(PREF_RUN_PROMPT),
      scope: { personaId: PERSONA_PREFER },
      conversion: { type: 'credit_purchase', windowDays: 7 },
    },
  ]);
  _resetExperimentCache();
});

after(async () => {
  if (hasDb) {
    await db.delete(experimentExposures).where(inArray(experimentExposures.experimentKey, ALL_KEYS));
    await db.delete(experiments).where(inArray(experiments.key, ALL_KEYS));
  }
  await pool.end();
});

describe('getActivePromptExperimentKey guards', { skip: !hasDb }, () => {
  it('returns null for no persona id', async () => {
    assert.equal(await getActivePromptExperimentKey(null), null);
    assert.equal(await getActivePromptExperimentKey(undefined), null);
    assert.equal(await getActivePromptExperimentKey(''), null);
  });
});

describe('resolvePersonaPrompt — safety invariant (OFF ⇒ base prompt)', { skip: !hasDb }, () => {
  it('no experiment for the persona ⇒ base prompt, not enrolled, no key', async () => {
    const r = await resolvePersonaPrompt('user-none', PERSONA_NONE, BASE);
    assert.equal(r.systemPrompt, BASE);
    assert.equal(r.enrolled, false);
    assert.equal(r.variant, null);
    assert.equal(r.key, null);
  });

  it('a DRAFT experiment ⇒ base prompt, not enrolled (resolver ignores non-running/non-winner)', async () => {
    _resetExperimentCache();
    const r = await resolvePersonaPrompt('user-draft', PERSONA_RUN, BASE);
    assert.equal(r.systemPrompt, BASE);
    assert.equal(r.enrolled, false);
    assert.equal(r.key, null);
  });

  it('missing userId ⇒ base prompt, not enrolled', async () => {
    const r = await resolvePersonaPrompt(null, PERSONA_RUN, BASE);
    assert.equal(r.systemPrompt, BASE);
    assert.equal(r.enrolled, false);
    assert.equal(r.key, null);
  });
});

describe('resolvePersonaPrompt — running test', { skip: !hasDb }, () => {
  before(async () => {
    await db.update(experiments).set({ status: 'running', startedAt: new Date() }).where(eq(experiments.key, PP_RUN));
    _resetExperimentCache();
  });

  it('sticky per user; B gets the treatment prompt, A stays on base; all enrolled; ~50/50', async () => {
    let b = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const id = `pp-${i}`;
      const r1 = await resolvePersonaPrompt(id, PERSONA_RUN, BASE);
      const r2 = await resolvePersonaPrompt(id, PERSONA_RUN, BASE);
      assert.equal(r1.systemPrompt, r2.systemPrompt, 'sticky prompt');
      assert.equal(r1.variant, r2.variant, 'sticky arm');
      assert.equal(r1.enrolled, true, 'running + in scope ⇒ enrolled');
      assert.equal(r1.key, PP_RUN);
      if (r1.variant === 'B') {
        assert.equal(r1.systemPrompt, B_PROMPT, 'treatment B uses payload.systemPrompt');
        b++;
      } else {
        assert.equal(r1.variant, 'A');
        assert.equal(r1.systemPrompt, BASE, 'control A renders the base prompt (no behaviour change)');
      }
    }
    const share = b / N;
    assert.ok(share > 0.4 && share < 0.6, `B share ${share} not ~50%`);
  });

  it('logExposure records the assigned arm once (the denominator), surface=chat', async () => {
    const id = `pp-expose-${STAMP}`;
    const r = await resolvePersonaPrompt(id, PERSONA_RUN, BASE);
    assert.equal(r.enrolled, true);
    // Mirror exactly what chatEngine.buildMessageContext does on an enrolled user.
    await logExposure(r.key!, id, r.variant!, 'chat', { personaId: PERSONA_RUN });
    await logExposure(r.key!, id, r.variant!, 'chat', { personaId: PERSONA_RUN }); // idempotent

    const rows = await db
      .select()
      .from(experimentExposures)
      .where(and(eq(experimentExposures.experimentKey, PP_RUN), eq(experimentExposures.subjectId, id)));
    assert.equal(rows.length, 1, 'one exposure row per subject (idempotent)');
    assert.equal(rows[0].variant, r.variant);
    assert.equal(rows[0].surface, 'chat');
    assert.equal((rows[0].context as { personaId?: string } | null)?.personaId, PERSONA_RUN);
  });

  it('an out-of-scope persona is never enrolled (control = base, no key match)', async () => {
    const r = await resolvePersonaPrompt('user-elsewhere', PERSONA_NONE, BASE);
    assert.equal(r.systemPrompt, BASE);
    assert.equal(r.enrolled, false);
    assert.equal(r.key, null);
  });
});

describe('resolvePersonaPrompt — concluded tests do NOT roll out (running-only)', { skip: !hasDb }, () => {
  it('a concluded test (done+winner) reverts to base — no silent forever-override', async () => {
    // Unlike a price/copy winner, a prompt winner is baked back into the persona's
    // base prompt; the experiment must not keep overriding the editable base.
    _resetExperimentCache();
    const r = await resolvePersonaPrompt('any-user', PERSONA_WIN, BASE);
    assert.equal(r.systemPrompt, BASE, 'concluded prompt test reverts to the base prompt');
    assert.equal(r.enrolled, false, 'concluded ⇒ no new exposures');
    assert.equal(r.key, null, 'resolver matches only RUNNING tests, so a done test is invisible');
  });

  it('a concluded test for a persona is ignored while a RUNNING one drives behaviour', async () => {
    _resetExperimentCache();
    const r = await resolvePersonaPrompt('pref-user', PERSONA_PREFER, BASE);
    assert.equal(r.key, PP_PREF_RUN, 'resolver picks the running test, not the done one');
    assert.equal(r.enrolled, true);
  });
});
