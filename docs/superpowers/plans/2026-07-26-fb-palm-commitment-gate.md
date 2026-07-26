# fb-palm Commitment Gate A/B Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the fb-palm `55-35_palm` sliding-close price test and replace it with a new `35_palm_gate` variant (a 3-checkbox commitment gate in front of the $35 purchase button), running as a 70/30 split against the existing `35_palm_u47` control across **every** fb-palm sign.

**Architecture:** A config-only change to the `system_config.v1_price_variants` pool (parses/scopes via the existing `priceVariantPool.ts`) assigns visitors to the new variant exactly like any other; a new `CommitmentGateCard` component renders in `ChatPage.tsx`'s existing CTA slot only when `priceVariantId === '35_palm_gate'`, calling the same `handlePurchase("main")` the plain `PurchaseCTA` already uses. No server, pricing, or checkout logic changes.

**Tech Stack:** React 18 (client), Express/TypeScript (server), Drizzle ORM, Node's built-in test runner (`node:test`) for all new non-UI unit tests, Tailwind CSS for styling — matching the existing codebase exactly, no new dependencies.

## Global Constraints

- TypeScript strict mode is enabled project-wide — new code must type-check cleanly.
- This repo has **no component-level unit-testing infrastructure** (no jsdom/React Testing Library — `vitest.config.ts` runs in `environment: 'node'` and covers only `tests/**/*.test.ts` + `server/**/*.test.ts`). Existing CTA components (`PurchaseCTA`, `ClearingChoiceCard`) have zero automated tests today. This plan follows that same established pattern rather than introducing new test infrastructure — the new UI piece is verified manually (exact steps in Task 2), not automated.
- All new non-UI unit tests use `node:test` + `assert/strict`, run via `tsx --test`, matching `server/lib/priceVariantPool.test.ts` and `shared/types.test.ts` (new in this plan) exactly.
- The live variant pool lives in the `system_config` DB table (key `v1_price_variants`). Dev and production **share one database** — there is no staging DB. Pool changes are rehearsed locally via the `V1_PRICE_VARIANTS_JSON` env override, then shipped to production via a hand-run SQL `UPDATE`, following the exact convention of `improve-v1/go-live-55-35-config.sql`. Nothing in this plan runs that SQL automatically — it is a manual, operator-triggered step after the code deploys.
- Retiring a price variant means setting its weight to `0`, **never deleting its pool entry** — this matches the existing convention for the root `45`/`59`/`55-35` variants, which all stay in the pool at weight 0 indefinitely.
- Already-assigned conversations are unaffected by any pool change: `getVariantForEmail` (`server/lib/priceVariant.ts:347-379`) reads `priceVariant`/`priceAmountCents`/`downsellAmountCents` directly off the persisted `conversations` row — it never re-resolves against the live pool. This is a verified fact from reading that function, not an assumption.
- `thumb-angle` (an fb-palm sign) is mid-way through its own, separate $55/$35 experiment run through a different system (`server/lib/experiments.ts`, sign-scoped). Operator decision (2026-07-26): `thumb-angle` is included in this new gate test's 70/30 anyway — the overlap with its own price test is accepted, not avoided.
- Analytics need no code changes: `buildPurchaseEvent` (`server/lib/purchaseAnalytics.ts:101`) reads `metadata.priceVariant` as a generic string with no per-id allowlist, so `35_palm_gate` flows into the PostHog `price_variant` field automatically, the same way every other variant id already does. Verified by reading the function — not assumed.
- The `$25` downsell CTA (`chat.showDownsellCTA` in `ChatPage.tsx`) is intentionally untouched by this whole plan — neither task modifies it, so it stays exactly as frictionless as it is today on every variant, per the spec's explicit placement decision.

---

### Task 1: Retire `55-35_palm`, reweight the pool, add `35_palm_gate` (every sign, 70/30)

**Files:**
- Modify: `server/lib/priceVariantPool.test.ts`
- Modify: `improve-v1/go-live-pool.json`
- Create: `improve-v1/go-live-palm-gate-config.sql`

**Interfaces:**
- Consumes: `parseVariantPool`, `selectVariant`, `pickWeighted`, `scopeVariantsToSign`, `normalizeSign`, `DEFAULT_PALM_SIGN`, `DEFAULT_UPSELL1_CENTS`, all from `server/lib/priceVariantPool.ts` (unchanged — no code in this file is modified, only its test and the data it parses).
- Produces: a live pool where `funnel: 'v1-palm'` has `35_palm_u47` (weight 70), `35_palm_gate` (weight 30, no `signs` — unscoped), and `55-35_palm` (weight 0, parked). Task 2 consumes the id string `'35_palm_gate'` (as `COMMITMENT_GATE_VARIANT_ID`, defined in Task 2) to decide what renders in `ChatPage.tsx`.

This task is pure data/config + pure-logic tests — no server request path, no React, no DB writes. It is fully testable offline via `npm run test:price`.

- [ ] **Step 1: Update the pool-shape assertions in `priceVariantPool.test.ts` to describe the NEW pool (still pointed at the OLD `go-live-pool.json`, so these fail first)**

Replace this exact block (currently lines 84–89):

```ts
  it('the go-live pool is valid — nothing silently dropped, no corrupted keys', () => {
    const { variants, dropped, unknownKeys } = parseVariantPool(GO_LIVE_POOL);
    assert.equal(dropped.length, 0, `unexpected drops: ${JSON.stringify(dropped)}`);
    assert.equal(unknownKeys.length, 0, `unexpected keys: ${JSON.stringify(unknownKeys)}`);
    assert.equal(variants.length, 14);
  });
```

with:

```ts
  it('the go-live pool is valid — nothing silently dropped, no corrupted keys', () => {
    const { variants, dropped, unknownKeys } = parseVariantPool(GO_LIVE_POOL);
    assert.equal(dropped.length, 0, `unexpected drops: ${JSON.stringify(dropped)}`);
    assert.equal(unknownKeys.length, 0, `unexpected keys: ${JSON.stringify(unknownKeys)}`);
    assert.equal(variants.length, 15);
  });
```

Replace this exact block (currently lines 91–99):

```ts
  it('the sliding arm is thumb-scoped, $55 main, $35 grace', () => {
    const sliding = pool().find((v) => v.id === '55-35_palm')!;
    assert.deepEqual(sliding.signs, ['thumb'], 'the sliding close must be scoped to thumb ONLY');
    assert.equal(sliding.funnel, 'v1-palm');
    assert.equal(sliding.weight, 1);
    assert.equal(sliding.priceCents, 5500);
    assert.equal(sliding.downsellCents, 3500); // the GRACE charge — must be $35, not the legacy $25
    assert.equal(sliding.upsell1Cents, 4700); // U1 held equal on both arms
  });
```

with:

```ts
  it('the sliding close (55-35_palm) is PARKED at weight 0 — retired by the commitment-gate test, not deleted', () => {
    const sliding = pool().find((v) => v.id === '55-35_palm')!;
    assert.deepEqual(sliding.signs, ['thumb'], 'its historical thumb-only scoping stays on the row for the record');
    assert.equal(sliding.funnel, 'v1-palm');
    assert.equal(sliding.weight, 0, '55-35_palm must never be drawn again — parked, not deleted (matches how 45/59/55-35 are handled at the root)');
    assert.equal(sliding.priceCents, 5500);
    assert.equal(sliding.downsellCents, 3500);
  });
```

Replace this exact block (currently lines 108–115):

```ts
  it('the control arm is untouched at $35/$25/$47', () => {
    const control = pool().find((v) => v.id === '35_palm_u47')!;
    assert.equal(control.weight, 1);
    assert.equal(control.priceCents, 3500);
    assert.equal(control.downsellCents, 2500);
    assert.equal(control.upsell1Cents, 4700);
    assert.ok(!control.signs?.length, 'the control must be unscoped so it serves EVERY sign');
  });
```

with:

```ts
  it('the control arm keeps its $35/$25/$47 economics, now at weight 70', () => {
    const control = pool().find((v) => v.id === '35_palm_u47')!;
    assert.equal(control.weight, 70);
    assert.equal(control.priceCents, 3500);
    assert.equal(control.downsellCents, 2500);
    assert.equal(control.upsell1Cents, 4700);
    assert.ok(!control.signs?.length, 'the control must be unscoped so it serves EVERY sign');
  });

  it('the new commitment-gate arm (35_palm_gate) mirrors the control economics at weight 30, every sign', () => {
    const gate = pool().find((v) => v.id === '35_palm_gate')!;
    assert.equal(gate.funnel, 'v1-palm');
    assert.equal(gate.weight, 30);
    assert.equal(gate.priceCents, 3500);
    assert.equal(gate.downsellCents, 2500);
    assert.equal(gate.upsell1Cents, 4700);
    assert.ok(!gate.signs?.length, 'the gate must be unscoped so it serves EVERY sign, not just thumb');
  });
```

- [ ] **Step 2: Update the `OTHER_SIGNS` comment (currently lines 56–60) — it's about to become stale**

Replace this exact block:

```ts
  // thumb-angle runs its own $55/$35 test through the EXPERIMENT FRAMEWORK
  // (v1_main_price_2026, sign-scoped), never through this legacy pool — so it
  // must stay 100% control here, exactly like every other non-thumb sign.
  'thumb-angle',
```

with:

```ts
  // thumb-angle runs its own concurrent $55/$35 test through the EXPERIMENT
  // FRAMEWORK (v1_main_price_2026, sign-scoped). It is DELIBERATELY included in
  // the commitment-gate 70/30 below anyway (operator call, 2026-07-26) — the
  // overlap with its own price test is accepted, not avoided.
  'thumb-angle',
```

- [ ] **Step 3: Replace the whole `'the sliding close is THUMB-ONLY'` describe block (currently lines 291–324) with the new gate-on-every-sign block**

Replace this exact block:

```ts
describe('the sliding close is THUMB-ONLY (the business requirement)', () => {
  it('thumb gets a clean 50/50 between the control and the sliding close', () => {
    const t = draws('v1-palm', 'thumb');
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_u47', '55-35_palm']);
    const share = t['55-35_palm'] / 4000;
    assert.ok(share > 0.45 && share < 0.55, `expected ~50% sliding, got ${(share * 100).toFixed(1)}%`);
  });

  it('palm traffic with NO sign param is thumb → also in the 50/50 (the thumb ad URLs omit &sign=)', () => {
    const t = draws('v1-palm', null);
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_u47', '55-35_palm']);
  });

  for (const sign of OTHER_SIGNS) {
    it(`sign="${sign}" NEVER sees the sliding close — 100% control`, () => {
      const t = draws('v1-palm', sign);
      assert.equal(t['55-35_palm'], undefined, `${sign} was assigned the sliding close`);
      assert.equal(t['35_palm_u47'], 4000);
    });
  }

  it('an unknown / spoofed sign falls through to the control, never to the $55 arm', () => {
    for (const sign of ['', 'THUMBS', 'thumb2', '../thumb', 'nonsense']) {
      const t = draws('v1-palm', sign, 500);
      if (sign === '') continue; // '' normalizes to thumb — covered above
      assert.equal(t['55-35_palm'], undefined, `spoofed sign "${sign}" reached the $55 arm`);
    }
  });

  it('is case/whitespace insensitive on the real thumb value', () => {
    const t = draws('v1-palm', ' Thumb ');
    assert.ok(t['55-35_palm'] > 0, 'a whitespace/case variant of thumb was excluded from its own test');
  });
});
```

with:

```ts
describe('the commitment gate runs on EVERY fb-palm sign, 70/30 (supersedes the retired thumb-only sliding close)', () => {
  it('thumb gets a 70/30 between control and the commitment gate', () => {
    const t = draws('v1-palm', 'thumb');
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_gate', '35_palm_u47']);
    const share = t['35_palm_gate'] / 4000;
    assert.ok(share > 0.25 && share < 0.35, `expected ~30% gated, got ${(share * 100).toFixed(1)}%`);
  });

  it('palm traffic with NO sign param is thumb → also in the 70/30 (the thumb ad URLs omit &sign=)', () => {
    const t = draws('v1-palm', null);
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_gate', '35_palm_u47']);
  });

  for (const sign of OTHER_SIGNS) {
    it(`sign="${sign}" ALSO gets the 70/30 — the gate is unscoped, unlike the old thumb-only sliding close`, () => {
      const t = draws('v1-palm', sign);
      assert.deepEqual(Object.keys(t).sort(), ['35_palm_gate', '35_palm_u47']);
      const share = t['35_palm_gate'] / 4000;
      assert.ok(share > 0.25 && share < 0.35, `${sign}: expected ~30% gated, got ${(share * 100).toFixed(1)}%`);
    });
  }

  it('the retired 55-35_palm is never drawn on any sign, including thumb', () => {
    for (const sign of ['thumb', ...OTHER_SIGNS, null]) {
      const t = draws('v1-palm', sign, 500);
      assert.equal(t['55-35_palm'], undefined, `${sign ?? '(none)'} drew the retired sliding close`);
    }
  });
});
```

- [ ] **Step 4: Fix the funnel-partition regression test's `endsWith` check (currently lines 342–345) — `35_palm_gate` doesn't match either existing suffix**

Replace this exact block:

```ts
  it('funnel scoping is still a hard partition — palm never draws a root/fb variant', () => {
    const palmIds = new Set([...Object.keys(draws('v1-palm', 'thumb')), ...Object.keys(draws('v1-palm', 'hand-size'))]);
    for (const id of palmIds) assert.ok(id.endsWith('_palm') || id.endsWith('_palm_u47'), `palm drew ${id}`);
  });
```

with:

```ts
  it('funnel scoping is still a hard partition — palm never draws a root/fb variant', () => {
    const palmIds = new Set([...Object.keys(draws('v1-palm', 'thumb')), ...Object.keys(draws('v1-palm', 'hand-size'))]);
    for (const id of palmIds) {
      assert.ok(
        id.endsWith('_palm') || id.endsWith('_palm_u47') || id.endsWith('_palm_gate'),
        `palm drew ${id}`,
      );
    }
  });
```

- [ ] **Step 5: Fix the "extending a sign" illustration test (currently lines 348–367) — it manipulates `55-35_palm`, which is now weight 0 in the base pool**

Replace this exact block:

```ts
describe('extending the test to a new sign is a CONFIG change, not a code change', () => {
  it('appending "hand-size" to signs immediately puts hand-size into the 50/50', () => {
    // This is exactly what we do once Ruby confirms the hand-size lander converts.
    const extended = pool().map((v) =>
      v.id === '55-35_palm' ? { ...v, signs: ['thumb', 'hand-size'] } : v,
    );
    const tally: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const v = selectVariant(extended, 'v1-palm', 'hand-size');
      tally[v.id] = (tally[v.id] ?? 0) + 1;
    }
    assert.deepEqual(Object.keys(tally).sort(), ['35_palm_u47', '55-35_palm']);
    const share = tally['55-35_palm'] / 2000;
    assert.ok(share > 0.44 && share < 0.56, `expected ~50%, got ${(share * 100).toFixed(1)}%`);

    // …and finger-shape is STILL excluded until it too is added.
    const fs = selectVariant(extended, 'v1-palm', 'finger-shape');
    assert.equal(fs.id, '35_palm_u47');
  });
});
```

with:

```ts
describe('extending a sign-scoped variant is a CONFIG change, not a code change', () => {
  it('appending "hand-size" to signs immediately puts hand-size into that variant\'s split', () => {
    // Illustrates the general mechanism using the (now-parked) 55-35_palm as the
    // example subject, restoring a positive weight locally so the mechanism is
    // demonstrated independent of its real weight:0 parked state in the live pool.
    const extended = pool().map((v) =>
      v.id === '55-35_palm' ? { ...v, weight: 1, signs: ['thumb', 'hand-size'] } : v,
    );
    const tally: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const v = selectVariant(extended, 'v1-palm', 'hand-size');
      tally[v.id] = (tally[v.id] ?? 0) + 1;
    }
    // hand-size now draws from THREE live arms: control (70), the commitment
    // gate (30, unscoped, already live everywhere), and the re-enabled sliding
    // close (1, freshly scoped to hand-size for this test).
    assert.deepEqual(Object.keys(tally).sort(), ['35_palm_gate', '35_palm_u47', '55-35_palm']);

    // …and finger-shape is STILL excluded from the sliding close (only control + gate).
    const fsTally: Record<string, number> = {};
    for (let i = 0; i < 500; i++) {
      const v = selectVariant(extended, 'v1-palm', 'finger-shape');
      fsTally[v.id] = (fsTally[v.id] ?? 0) + 1;
    }
    assert.deepEqual(Object.keys(fsTally).sort(), ['35_palm_gate', '35_palm_u47']);
  });
});
```

- [ ] **Step 6: Replace the `'rollback'` describe block (currently lines 369–376) — its premise no longer holds**

Replace this exact block:

```ts
describe('rollback', () => {
  it('setting the sliding weight to 0 reverts thumb to 100% control', () => {
    const rolledBack = pool().map((v) => (v.id === '55-35_palm' ? { ...v, weight: 0 } : v));
    for (let i = 0; i < 500; i++) {
      assert.equal(selectVariant(rolledBack, 'v1-palm', 'thumb').id, '35_palm_u47');
    }
  });
});
```

with:

```ts
describe('rollback', () => {
  it('setting the commitment-gate weight to 0 reverts every sign to 100% control', () => {
    const rolledBack = pool().map((v) => (v.id === '35_palm_gate' ? { ...v, weight: 0 } : v));
    for (const sign of ['thumb', ...OTHER_SIGNS, null]) {
      for (let i = 0; i < 100; i++) {
        assert.equal(selectVariant(rolledBack, 'v1-palm', sign).id, '35_palm_u47');
      }
    }
  });
});
```

- [ ] **Step 7: Run the tests to verify they now fail (RED — the go-live artifacts haven't changed yet)**

Run: `npm run test:price`
Expected: FAIL. Multiple failures/thrown errors referencing `35_palm_gate` (not found in the pool yet — `pool().find(...)` returns `undefined`, so `.funnel`/`.weight` access throws), `variants.length` (14 vs expected 15), and weight mismatches on `55-35_palm` (still 1) and `35_palm_u47` (still 1, not 70). Confirm the failures are all in these new/updated assertions — no unrelated test should fail.

- [ ] **Step 8: Update `improve-v1/go-live-pool.json` to the new pool shape**

Replace the entire file contents with:

```json
{"variants":[
  {"id":"35","weight":1,"priceCents":3500,"downsellCents":2500},
  {"id":"45","weight":0,"priceCents":4500,"downsellCents":3200},
  {"id":"59","weight":0,"priceCents":5900,"downsellCents":4200},
  {"id":"55-35","weight":0,"priceCents":5500,"downsellCents":3500},
  {"id":"45_fb","funnel":"v1-fb","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_fb","funnel":"v1-fb","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_fb2","funnel":"v1-fb2","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_fb2","funnel":"v1-fb2","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_gdn","funnel":"v1-gdn","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_gdn","funnel":"v1-gdn","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_palm","funnel":"v1-palm","weight":0,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_palm_u47","funnel":"v1-palm","weight":70,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700},
  {"id":"45_palm","funnel":"v1-palm","weight":0,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"55-35_palm","funnel":"v1-palm","weight":0,"priceCents":5500,"downsellCents":3500,"upsell1Cents":4700,"signs":["thumb"]},
  {"id":"35_palm_gate","funnel":"v1-palm","weight":30,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700}
]}
```

- [ ] **Step 9: Create `improve-v1/go-live-palm-gate-config.sql` — the new production migration artifact**

Create with this exact content:

```sql
-- fb-palm commitment-gate A/B test GO-LIVE — every fb-palm sign, 70/30.
--
-- ⚠ SUPERSEDES improve-v1/go-live-55-35-config.sql for the palm portion of the
--   pool. The $55/$35 sliding close ('55-35_palm') is RETIRED (parked at
--   weight 0, not deleted — same convention as the root '45'/'59'/'55-35'
--   rows) and replaced by a new checkbox commitment-gate arm ('35_palm_gate').
--
-- ── What this does ─────────────────────────────────────────────────────────
--   • PALM: '55-35_palm' w1→w0 (retired). '35_palm_u47' w1→w70. NEW
--     '35_palm_gate' w30, SAME economics as the control ($35/$25/$47 U1), no
--     `signs` scoping — unlike the old sliding close, this runs on EVERY
--     fb-palm sign, including thumb-angle (which is mid-way through its own,
--     separate $55/$35 test via the newer experiment framework — the overlap
--     is an accepted operator decision, 2026-07-26, not an oversight).
--     → EVERY palm sign: 70% control / 30% commitment-gate.
--     Upsell 1 held at $47 on both arms so it is not a second variable.
--
--   • Already-assigned visitors are unaffected: getVariantForEmail reads the
--     price/variant already persisted on their conversation row, never the
--     live pool — so this flip cannot change anyone's price mid-funnel.
--
--   • root / fb / fb2 / gdn pools: untouched.
--
-- ── Rollback ──────────────────────────────────────────────────────────────
-- Set '35_palm_gate' weight to 0. New traffic reverts to 100% control within
-- 60s (config cache TTL); already-assigned buyers keep the price/UI they were
-- shown (sticky by design).
--
-- ── Verify, immediately after running ──────────────────────────────────────
--   1. Railway PROD logs → `priceVariant: assigned`. Confirm both
--      35_palm_u47 and 35_palm_gate appear across multiple signs, not just
--      thumb.
--   2. /admin/price-test must report variantsSource: "db" (NOT "env").
--   3. The split query at the bottom of this file.

UPDATE system_config
SET config_value = '{"variants":[
  {"id":"35","weight":1,"priceCents":3500,"downsellCents":2500},
  {"id":"45","weight":0,"priceCents":4500,"downsellCents":3200},
  {"id":"59","weight":0,"priceCents":5900,"downsellCents":4200},
  {"id":"55-35","weight":0,"priceCents":5500,"downsellCents":3500},
  {"id":"45_fb","funnel":"v1-fb","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_fb","funnel":"v1-fb","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_fb2","funnel":"v1-fb2","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_fb2","funnel":"v1-fb2","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_gdn","funnel":"v1-gdn","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"45_gdn","funnel":"v1-gdn","weight":1,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"35_palm","funnel":"v1-palm","weight":0,"priceCents":3500,"downsellCents":2500,"upsell1Cents":3700},
  {"id":"35_palm_u47","funnel":"v1-palm","weight":70,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700},
  {"id":"45_palm","funnel":"v1-palm","weight":0,"priceCents":4500,"downsellCents":3200,"upsell1Cents":4700},
  {"id":"55-35_palm","funnel":"v1-palm","weight":0,"priceCents":5500,"downsellCents":3500,"upsell1Cents":4700,"signs":["thumb"]},
  {"id":"35_palm_gate","funnel":"v1-palm","weight":30,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700}
]}',
    updated_at = now()
WHERE config_key = 'v1_price_variants';


-- ── VERIFY (run a few minutes after the flip) ─────────────────────────────
-- Expect a ~70/30 between 35_palm_u47 and 35_palm_gate, across every sign.
--
-- SELECT price_variant,
--        count(*)                          AS assigned,
--        min(price_amount_cents)           AS main_cents,
--        min(downsell_amount_cents)        AS downsell_cents,
--        count(*) FILTER (WHERE purchased) AS buyers
-- FROM conversations
-- WHERE created_at > now() - interval '2 hours'
--   AND price_variant IN ('35_palm_u47', '35_palm_gate')
-- GROUP BY 1
-- ORDER BY 1;
```

- [ ] **Step 10: Point the drift test at the new SQL file**

In `server/lib/priceVariantPool.test.ts`, replace this exact line (currently line 35):

```ts
const GO_LIVE_SQL = readFileSync(join(ROOT, 'improve-v1', 'go-live-55-35-config.sql'), 'utf8');
```

with:

```ts
const GO_LIVE_SQL = readFileSync(join(ROOT, 'improve-v1', 'go-live-palm-gate-config.sql'), 'utf8');
```

- [ ] **Step 11: Run the tests to verify they now pass (GREEN)**

Run: `npm run test:price`
Expected: PASS — all tests green, including the drift test (go-live-pool.json ↔ go-live-palm-gate-config.sql now match) and every updated/new assertion from Steps 1–6.

- [ ] **Step 12: Commit**

```bash
git add server/lib/priceVariantPool.test.ts improve-v1/go-live-pool.json improve-v1/go-live-palm-gate-config.sql
git commit -m "feat(v1-palm): retire 55-35_palm, add 35_palm_gate (70/30, every sign)"
```

---

### Task 2: `CommitmentGateCard` component + `ChatPage.tsx` wiring

**Files:**
- Create: `shared/types.test.ts`
- Modify: `shared/types.ts`
- Modify: `package.json` (add the new test file to `test:unit` / `test:unit:watch`)
- Create: `client/src/components/CommitmentGateCard.tsx`
- Modify: `client/src/pages/ChatPage.tsx`

**Interfaces:**
- Consumes: `chat.userData.priceVariantId`, `chat.userData.firstName`, `chat.userData.priceDollars`, `chat.showPurchaseCTA`, and `handlePurchase(type: "main" | "downsell")` — all already exist on `useConversation()`'s return value, unchanged.
- Produces: `COMMITMENT_GATE_VARIANT_ID` (string constant, `'35_palm_gate'`) and `isCommitmentGateVariant(id?: string | null): boolean`, both exported from `shared/types.ts`, alongside the existing `isSlidingCloseVariant`. `CommitmentGateCard` exported from `client/src/components/CommitmentGateCard.tsx` with props `{ firstName: string | null; onConfirm: () => void; priceDollars?: number }`.

- [ ] **Step 1: Write the failing test for `isCommitmentGateVariant`**

Create `shared/types.test.ts`:

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCommitmentGateVariant, isSlidingCloseVariant, COMMITMENT_GATE_VARIANT_ID } from './types';

describe('isCommitmentGateVariant', () => {
  it('is true only for the exact gate variant id', () => {
    assert.equal(isCommitmentGateVariant('35_palm_gate'), true);
    assert.equal(isCommitmentGateVariant(COMMITMENT_GATE_VARIANT_ID), true);
  });

  it('is false for every other id, including null/undefined/similar-looking ids', () => {
    assert.equal(isCommitmentGateVariant('35_palm_u47'), false);
    assert.equal(isCommitmentGateVariant('55-35_palm'), false);
    assert.equal(isCommitmentGateVariant(undefined), false);
    assert.equal(isCommitmentGateVariant(null), false);
    assert.equal(isCommitmentGateVariant(''), false);
  });

  it('never overlaps with isSlidingCloseVariant', () => {
    assert.equal(isSlidingCloseVariant(COMMITMENT_GATE_VARIANT_ID), false);
    assert.equal(isCommitmentGateVariant('55-35_palm'), false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test shared/types.test.ts`
Expected: FAIL — `isCommitmentGateVariant` / `COMMITMENT_GATE_VARIANT_ID` are not exported from `./types` yet (import error).

- [ ] **Step 3: Add the constant + helper to `shared/types.ts`**

Append immediately after the existing `isSlidingCloseVariant` block (currently lines 66–74):

```ts
// Sliding-scale close ("$55 anchor / $35 grace") — price variants whose id
// starts with this prefix pitch the FULL offering at priceCents ($55) and tell
// the seeker they may offer downsellCents ($35) instead if money is a strain.
// Same product, same ritual, same post-purchase path — ONLY the offering
// differs. Funnel-scoped ids compose naturally ('55-35', '55-35_fb', …).
export const SLIDING_CLOSE_VARIANT_PREFIX = '55-35'

export function isSlidingCloseVariant(id?: string | null): boolean {
  return !!id && id.startsWith(SLIDING_CLOSE_VARIANT_PREFIX)
}

// fb-palm commitment-gate A/B test — replaces PurchaseCTA with a 3-checkbox
// commitment gate for this EXACT variant id only. Not a prefix like the
// sliding close above, because there is only ever one gated variant, not a
// family of them.
export const COMMITMENT_GATE_VARIANT_ID = '35_palm_gate'

export function isCommitmentGateVariant(id?: string | null): boolean {
  return id === COMMITMENT_GATE_VARIANT_ID
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx tsx --test shared/types.test.ts`
Expected: PASS — all 3 assertions in all 3 `it` blocks green.

- [ ] **Step 5: Wire the new test file into the npm scripts**

In `package.json`, replace this exact line:

```json
    "test:unit": "tsx --test tests/personaIntent.test.ts server/lib/universalSafety.test.ts",
```

with:

```json
    "test:unit": "tsx --test tests/personaIntent.test.ts server/lib/universalSafety.test.ts shared/types.test.ts",
```

And replace this exact line:

```json
    "test:unit:watch": "tsx --test --watch tests/personaIntent.test.ts server/lib/universalSafety.test.ts",
```

with:

```json
    "test:unit:watch": "tsx --test --watch tests/personaIntent.test.ts server/lib/universalSafety.test.ts shared/types.test.ts",
```

Run: `npm run test:unit`
Expected: PASS — includes the new `isCommitmentGateVariant` tests alongside the existing suites.

- [ ] **Step 6: Commit the shared helper**

```bash
git add shared/types.ts shared/types.test.ts package.json
git commit -m "feat(v1-palm): add isCommitmentGateVariant helper for the fb-palm gate test"
```

- [ ] **Step 7: Create `CommitmentGateCard.tsx`**

Create `client/src/components/CommitmentGateCard.tsx`:

```tsx
import { useState } from 'react'

// fb-palm commitment-gate A/B test ('35_palm_gate') — CRO pattern adapted from
// competitor intel (docs/intel/how-i-built-a-60k-per-month-astrology-offer.md):
// a 3-checkbox commitment ask renders in place of the purchase button; the
// button itself only appears once all 3 are checked. Styled to match
// ClearingChoiceCard's card so it reads as the same product family.
interface CommitmentGateCardProps {
  firstName: string | null
  onConfirm: () => void
  priceDollars?: number
}

const COMMITMENTS = [
  'I understand belief is required for this to work',
  "I won't tell anyone else about this reading — it weakens it",
  "I understand once this is done, there's no undoing it",
] as const

export function CommitmentGateCard({ firstName, onConfirm, priceDollars = 35 }: CommitmentGateCardProps) {
  const [checked, setChecked] = useState<boolean[]>([false, false, false])
  const allChecked = checked.every(Boolean)

  const toggle = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <div className="p-4 animate-cta-appear" data-testid="commitment-gate-card">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md overflow-hidden">
        <div className="pt-4 pb-3 px-5 text-center">
          <div className="text-amber-500/90 text-xs tracking-[0.3em]">✦</div>
          <h3 className="font-serif italic text-gray-800 text-base mt-1">
            {firstName ? `${firstName}, before I prepare this for you` : 'Before I prepare this for you'} — I need to know you're truly ready.
          </h3>
        </div>

        <div className="px-5 pb-4 space-y-2.5">
          {COMMITMENTS.map((label, index) => (
            <label
              key={label}
              className="flex items-start gap-3 text-[13px] leading-snug text-gray-700 cursor-pointer"
              data-testid={`checkbox-commitment-${index}`}
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => toggle(index)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="px-4 pb-4">
          {allChecked ? (
            <button
              onClick={onConfirm}
              data-testid="button-commitment-confirm"
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
            >
              Get My Reading — ${priceDollars}
            </button>
          ) : (
            <p className="text-center text-[11px] italic text-gray-400 py-2">
              Check all three to continue
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-3">
        <span>🔒 30-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Wire it into `ChatPage.tsx` — imports**

Replace this exact block (currently lines 5–13):

```tsx
import { PurchaseCTA } from "../components/PurchaseCTA";
import { ClearingChoiceCard } from "../components/ClearingChoiceCard";
import { DownsellCTA } from "../components/DownsellCTA";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { useConversation } from "../hooks/useConversation";
import { isSlidingCloseVariant } from "@shared/types";
```

with:

```tsx
import { PurchaseCTA } from "../components/PurchaseCTA";
import { ClearingChoiceCard } from "../components/ClearingChoiceCard";
import { CommitmentGateCard } from "../components/CommitmentGateCard";
import { DownsellCTA } from "../components/DownsellCTA";
import { BackgroundMusic } from "../components/BackgroundMusic";
import { useConversation } from "../hooks/useConversation";
import { isSlidingCloseVariant, isCommitmentGateVariant } from "@shared/types";
```

- [ ] **Step 9: Wire it into `ChatPage.tsx` — the CTA branch**

Replace this exact block (currently lines 232–250):

```tsx
          {/* Purchase CTA. Sliding-scale close ('55-35*' variants) swaps the
              single button for the two-tier choice card ($35 grace offering +
              $55 full offering — the grace charge rides the normal downsell
              checkout: same product + upsell path server-side). Classic
              variants keep today's PurchaseCTA byte-identical. */}
          {chat.showPurchaseCTA &&
            (isSlidingCloseVariant(chat.userData.priceVariantId) ? (
              <ClearingChoiceCard
                onFullOffering={() => handlePurchase("main")}
                onGraceOffering={() => handlePurchase("downsell")}
                fullDollars={chat.userData.priceDollars ?? 55}
                graceDollars={chat.userData.downsellDollars ?? 35}
              />
            ) : (
              <PurchaseCTA
                onClick={() => handlePurchase("main")}
                priceDollars={chat.userData.priceDollars ?? 35}
              />
            ))}
```

with:

```tsx
          {/* Purchase CTA. Sliding-scale close ('55-35*' variants) swaps the
              single button for the two-tier choice card ($35 grace offering +
              $55 full offering — the grace charge rides the normal downsell
              checkout: same product + upsell path server-side). The fb-palm
              commitment-gate variant (35_palm_gate) swaps it for a 3-checkbox
              gate instead — same handlePurchase("main") call, gated behind all
              3 boxes being checked. Classic variants keep today's PurchaseCTA
              byte-identical. */}
          {chat.showPurchaseCTA &&
            (isSlidingCloseVariant(chat.userData.priceVariantId) ? (
              <ClearingChoiceCard
                onFullOffering={() => handlePurchase("main")}
                onGraceOffering={() => handlePurchase("downsell")}
                fullDollars={chat.userData.priceDollars ?? 55}
                graceDollars={chat.userData.downsellDollars ?? 35}
              />
            ) : isCommitmentGateVariant(chat.userData.priceVariantId) ? (
              <CommitmentGateCard
                firstName={chat.userData.firstName}
                onConfirm={() => handlePurchase("main")}
                priceDollars={chat.userData.priceDollars ?? 35}
              />
            ) : (
              <PurchaseCTA
                onClick={() => handlePurchase("main")}
                priceDollars={chat.userData.priceDollars ?? 35}
              />
            ))}
```

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by these two files (the codebase may carry pre-existing unrelated errors — confirm the count doesn't increase because of this change, not that it's zero).

- [ ] **Step 11: Manual verification (no component-test infra exists in this repo — see Global Constraints)**

This repo has no jsdom/React Testing Library setup, so this component is verified the same way `PurchaseCTA`/`ClearingChoiceCard` always have been: by hand, in a running dev server, using the exact override mechanism this codebase already documents for rehearsing price-variant changes locally.

1. In your shell, force every fb-palm visitor onto the gated variant for this manual check:
   ```bash
   export V1_PRICE_VARIANTS_JSON='{"variants":[{"id":"35_palm_gate","funnel":"v1-palm","weight":1,"priceCents":3500,"downsellCents":2500,"upsell1Cents":4700}]}'
   npm run dev
   ```
2. Open `http://localhost:5000/fb-palm/chat` in a browser.
3. Complete the chat: enter a first name, an email, pick any bucket, and answer the deepening question(s) until the pitch finishes and a purchase CTA would normally render.
4. Confirm:
   - Instead of the `$35` button, a card renders with the header line (including your entered first name) and 3 unchecked checkboxes.
   - No purchase button is visible yet — instead, "Check all three to continue" is shown.
   - Checking 1 or 2 boxes still shows no button.
   - Checking all 3 reveals the `Get My Reading — $35` button.
   - Clicking it proceeds exactly like the normal `PurchaseCTA` does today (same checkout redirect).
5. Stop the dev server and `unset V1_PRICE_VARIANTS_JSON` afterward, so local dev goes back to reading the real DB-backed pool. **Never set this variable on the production service** (per the existing warning in `server/lib/priceVariant.ts`).

- [ ] **Step 12: Commit**

```bash
git add client/src/components/CommitmentGateCard.tsx client/src/pages/ChatPage.tsx
git commit -m "feat(v1-palm): add CommitmentGateCard, wire it to the 35_palm_gate variant"
```
