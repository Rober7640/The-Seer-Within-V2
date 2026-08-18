# Root gate + order bump port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ROOT V1 funnel (`/`, `/chat`) eligible for the commitment gate and the
order bump, which today skip it because root sends no funnel param and an array
`scope.funnel` can never match `undefined`.

**Architecture:** A sentinel string `'v1-root'` is substituted for an absent funnel inside
the four V1 experiment resolvers — never at their seven call sites, and never anywhere near
the price pool. Shipping the two features is then two SQL edits that widen `scope.funnel`
and declare a winner, which `assign()` already rolls out to everyone in scope.

**Tech Stack:** TypeScript, Node's built-in test runner (`node:test` via `tsx --test`),
Drizzle ORM, Postgres (Supabase).

**Spec:** `docs/superpowers/specs/2026-08-18-root-gate-bump-port-design.md`

## Global Constraints

- **The sentinel is for experiments only.** It must never be passed to `selectVariant`,
  `scopeVariantsToFunnel`, or anything else in `server/lib/priceVariantPool.ts`. That
  function falls back to the WHOLE pool on no match, so a root visitor carrying
  `'v1-root'` would start drawing `45_fb` / `35_palm_u47` prices.
- **Never edit the seven resolver call sites** (`priceVariant.ts:305,347,384`;
  `routes.ts:807,828,1558,1559`). They keep passing the raw `funnel`. A disagreement
  between any two of them is a billing bug.
- **The exact sentinel string is `'v1-root'`**, exported as `ROOT_FUNNEL`.
- **Behaviour must be unchanged until a row's scope is widened.** With no experiment scoped
  to `v1-root`, every code change in tasks 1–4 is a no-op for every visitor.
- Tests run with `npx tsx --test <file>`; DB-backed tests need `--env-file=.env.test` and
  self-skip when `DATABASE_URL` is absent.
- Commit after every task.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `server/lib/experiments.ts` | `ROOT_FUNNEL` + `experimentFunnel()`; the four resolvers call it | 1, 2 |
| `server/lib/experiments.test.ts` | Pure unit tests for the helper (no DB) | 1 |
| `server/lib/rootFunnelScope.test.ts` | **New.** DB tests: root enrols on a `v1-root` scope, not on a tarot one; exposure context round-trip | 2, 3 |
| `server/lib/priceVariant.ts` | Three `logExposure` contexts stamp the sentinel | 3 |
| `server/lib/priceVariantPool.test.ts` | Regression guard: root still draws only unscoped variants | 4 |
| `improve-v1/ship-gate-bump-to-root-2026-08-18.sql` | **New.** Widen + conclude the gate and bump rows | 5 |
| `improve-v1/extend-downsell-bump-to-root-2026-08-18.sql` | **New.** Widen the downsell row (stays draft) | 6 |

---

### Task 1: The sentinel helper

**Files:**
- Modify: `server/lib/experiments.ts` (immediately after `matchesFunnelScope`, which ends at line 281)
- Test: `server/lib/experiments.test.ts` (append a new `describe` after the
  `matchesFunnelScope` block, which ends around line 160)

**Interfaces:**
- Consumes: nothing
- Produces: `export const ROOT_FUNNEL = 'v1-root'` and
  `export function experimentFunnel(funnel?: string | null): string`

- [ ] **Step 1: Write the failing test**

Append to `server/lib/experiments.test.ts`:

```ts
describe('experimentFunnel (root sentinel)', () => {
  it('absent funnel becomes the root sentinel', () => {
    assert.equal(experimentFunnel(undefined), 'v1-root');
    assert.equal(experimentFunnel(null), 'v1-root');
    assert.equal(experimentFunnel(''), 'v1-root');
  });

  it('a real funnel param passes through untouched', () => {
    for (const f of ['v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm', 'v1-tarot']) {
      assert.equal(experimentFunnel(f), f);
    }
  });

  it('the sentinel does NOT enrol root in a test scoped to other funnels', () => {
    // Widening scope is what enrols root. The sentinel alone must change nothing —
    // this is the property that makes tasks 1-4 a no-op until the SQL runs.
    assert.equal(matchesFunnelScope(['v1-palm', 'v1-tarot'], experimentFunnel(undefined)), false);
    assert.equal(matchesFunnelScope('v1-tarot', experimentFunnel(null)), false);
  });

  it('a scope listing the sentinel DOES enrol root, and nothing else changes', () => {
    const scope = ['v1-palm', 'v1-tarot', 'v1-root'];
    assert.equal(matchesFunnelScope(scope, experimentFunnel(undefined)), true);
    assert.equal(matchesFunnelScope(scope, experimentFunnel('v1-tarot')), true);
    for (const f of ['v1-fb', 'v1-fb2', 'v1-gdn']) {
      assert.equal(matchesFunnelScope(scope, experimentFunnel(f)), false, `${f} must not leak in`);
    }
  });
});
```

Add `experimentFunnel` to the existing import on line 10:

```ts
import { experimentBucket, pickVariant, twoSidedP, shouldForceRunning, matchesFunnelScope, matchesLanderScope, experimentFunnel, PAYWALL_EXPERIMENT_KEY } from './experiments';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/lib/experiments.test.ts`
Expected: FAIL — `experimentFunnel is not a function` (or a TS error that it is not exported).

- [ ] **Step 3: Write the implementation**

In `server/lib/experiments.ts`, directly after the closing brace of `matchesFunnelScope`
(line 281):

```ts
/**
 * The funnel string the EXPERIMENT FRAMEWORK sees for V1 traffic.
 *
 * Root V1 (`/`, `/chat` — the original Evelyn funnel email traffic lands on)
 * deliberately sends no funnel param: currentFunnel() returns undefined there so
 * root requests stay byte-identical to the pre-ad-funnel app. That makes
 * `context.funnel` undefined, and matchesFunnelScope requires a STRING, so every
 * funnel-scoped V1 test skips root by construction. This gives root a name.
 *
 * 🔴 EXPERIMENTS ONLY — NEVER pass this to the price pool. scopeVariantsToFunnel
 * (priceVariantPool.ts:188) matches `(v.funnel ?? null) === target` exactly and
 * falls back to the WHOLE pool when nothing matches. Root's `35`/`45`/`59` carry
 * no `funnel` field, so a root visitor carrying 'v1-root' would stop matching them
 * and start drawing `45_fb`, `35_palm_u47` and every other funnel's price. Guarded
 * by a regression test in priceVariantPool.test.ts.
 */
export const ROOT_FUNNEL = 'v1-root';

export function experimentFunnel(funnel?: string | null): string {
  return typeof funnel === 'string' && funnel.length > 0 ? funnel : ROOT_FUNNEL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/lib/experiments.test.ts`
Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add server/lib/experiments.ts server/lib/experiments.test.ts
git commit -m "feat(experiments): give root V1 a funnel name, so tests can scope to it"
```

---

### Task 2: Wire the sentinel into the four resolvers

**Files:**
- Modify: `server/lib/experiments.ts` — `resolvePalmGate` (line ~1424), `resolveV1Bump`
  (line ~1508), `resolveV1DownsellBumpPrice` (line ~1554), `resolveV1CloseDepth` (line ~1607)
- Test: `server/lib/rootFunnelScope.test.ts` (create)

**Interfaces:**
- Consumes: `experimentFunnel`, `ROOT_FUNNEL` from Task 1
- Produces: no signature changes. All four resolvers keep
  `(email, funnel?, sign?, key?)`; only the `context.funnel` they hand `assign()` changes.

- [ ] **Step 1: Write the failing test**

Create `server/lib/rootFunnelScope.test.ts`:

```ts
// DB integration tests for the ROOT funnel sentinel (v1-root).
//
// Root V1 sends no funnel param, so before this every funnel-scoped test skipped
// it. These prove the two halves of the contract: a test that LISTS 'v1-root'
// enrols root traffic, and a test that does not is completely unaffected — which
// is what makes deploying the sentinel a no-op until a row's scope is widened.
//
//   npm run test:local server/lib/rootFunnelScope.test.ts
//
// Requires DATABASE_URL (skips otherwise). assertLocalDb() is load-bearing:
// dotenv loads .env, whose DATABASE_URL is PRODUCTION, and this file INSERTs
// experiment rows. Every key is stamped per-run and cleaned up in after().

import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { experiments, experimentExposures } from '../../shared/schema';
import {
  resolvePalmGate,
  resolveV1Bump,
  resolveV1DownsellBumpPrice,
  resolveV1CloseDepth,
  logExposure,
  hashEmail,
  experimentFunnel,
  ROOT_FUNNEL,
  _resetExperimentCache,
} from './experiments';

const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();

const GATE_ROOT = `root_gate_${STAMP}`;
const GATE_TAROT_ONLY = `root_gate_tarot_only_${STAMP}`;
const BUMP_ROOT = `root_bump_${STAMP}`;
const DOWNSELL_ROOT = `root_downsell_${STAMP}`;
const CLOSE_ROOT = `root_close_${STAMP}`;
const EXPOSURE_KEY = `root_exposure_${STAMP}`;
const ALL_KEYS = [GATE_ROOT, GATE_TAROT_ONLY, BUMP_ROOT, DOWNSELL_ROOT, CLOSE_ROOT, EXPOSURE_KEY];

// Every arm carries its payload so the resolver has something to apply. Weight is
// 100 on the single arm: these tests assert ENROLMENT and SCOPE, not the split.
const oneArm = (payload: Record<string, unknown>) => [{ key: 'B', weight: 100, payload }];

const running = (key: string, variants: ReturnType<typeof oneArm>, funnels: string[]) => ({
  key,
  name: key,
  status: 'running',
  startedAt: new Date(),
  subjectType: 'email',
  variants,
  scope: { funnel: funnels },
  conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 1000 },
});

before(async () => {
  if (!hasDb) return;
  await db.insert(experiments).values([
    running(GATE_ROOT, oneArm({ gate: true }), ['v1-tarot', ROOT_FUNNEL]),
    running(GATE_TAROT_ONLY, oneArm({ gate: true }), ['v1-tarot']),
    running(BUMP_ROOT, oneArm({ bump: true, copy: 'A' }), ['v1-tarot', ROOT_FUNNEL]),
    running(DOWNSELL_ROOT, oneArm({ bumpCents: 977 }), ['v1-tarot', ROOT_FUNNEL]),
    running(CLOSE_ROOT, oneArm({ close: 'deep' }), ['v1-tarot', ROOT_FUNNEL]),
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

describe('root enrols when the scope lists v1-root', { skip: !hasDb }, () => {
  it('resolvePalmGate — root traffic (no funnel) gets the gate', async () => {
    const r = await resolvePalmGate('root-gate@example.com', undefined, null, GATE_ROOT);
    assert.equal(r.gate, true, 'root must see the gate once its scope lists v1-root');
    assert.equal(r.enrolled, true, 'root must count in the denominator');
  });

  it('resolveV1Bump — root traffic gets the bump and the copy arm', async () => {
    const r = await resolveV1Bump('root-bump@example.com', null, null, BUMP_ROOT);
    assert.equal(r.bump, true);
    assert.equal(r.copy, 'A');
    assert.equal(r.enrolled, true);
  });

  it('resolveV1DownsellBumpPrice — root traffic resolves the arm price', async () => {
    const cents = await resolveV1DownsellBumpPrice('root-ds@example.com', undefined, DOWNSELL_ROOT);
    assert.equal(cents, 977);
  });

  it('resolveV1CloseDepth — root traffic resolves the deep arm', async () => {
    const r = await resolveV1CloseDepth('root-close@example.com', null, CLOSE_ROOT);
    assert.equal(r.deep, true);
    assert.equal(r.enrolled, true);
  });
});

describe('a scope WITHOUT v1-root still skips root', { skip: !hasDb }, () => {
  it('root gets the control arm and is never enrolled', async () => {
    for (const funnel of [null, undefined]) {
      const r = await resolvePalmGate('root-offscope@example.com', funnel, null, GATE_TAROT_ONLY);
      assert.equal(r.gate, false, 'a tarot-only test must never reach root');
      assert.equal(r.enrolled, false, 'root must not pollute a tarot-only denominator');
    }
  });

  it('tarot itself is unaffected by the sentinel', async () => {
    const r = await resolvePalmGate('tarot-still-works@example.com', 'v1-tarot', null, GATE_TAROT_ONLY);
    assert.equal(r.gate, true);
    assert.equal(r.enrolled, true);
  });

  it('an unrelated funnel still cannot reach a root-scoped test', async () => {
    const r = await resolvePalmGate('fb-user@example.com', 'v1-fb', null, GATE_ROOT);
    assert.equal(r.gate, false, 'v1-fb is not in scope and must stay out');
    assert.equal(r.enrolled, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --env-file=.env.test --test server/lib/rootFunnelScope.test.ts`
Expected: FAIL — the four "root enrols" tests fail (`gate` is `false`, `enrolled` is
`false`, `cents` is `null`) because the resolvers still pass `funnel ?? null`.

- [ ] **Step 3: Write the implementation**

Four one-line edits in `server/lib/experiments.ts`. Nothing else in these functions changes.

`resolvePalmGate`:

```ts
  const a = await assign(key, subject, { funnel: experimentFunnel(funnel), sign: sign ?? null });
```

`resolveV1Bump` (the `assign` call below the QA-override block):

```ts
  const a = await assign(key, subject, { funnel: experimentFunnel(funnel), sign: sign ?? null });
```

`resolveV1DownsellBumpPrice`:

```ts
  const a = await assign(key, subject, { funnel: experimentFunnel(funnel) });
```

`resolveV1CloseDepth`:

```ts
  const a = await assign(key, subject, { funnel: experimentFunnel(funnel) });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --env-file=.env.test --test server/lib/rootFunnelScope.test.ts`
Expected: PASS, 0 failures.

Then prove nothing regressed — `closeDepth.test.ts` already asserts root gets today's close
on a tarot-scoped test, which must still hold:

Run: `npm run test:experiments`
Expected: PASS, 0 failures (57 tests before this plan added any).

- [ ] **Step 5: Commit**

```bash
git add server/lib/experiments.ts server/lib/rootFunnelScope.test.ts
git commit -m "feat(experiments): resolve root V1 as v1-root in the four V1 resolvers"
```

---

### Task 3: Stamp the sentinel into the exposure context

**Files:**
- Modify: `server/lib/priceVariant.ts:333`, `:363`, `:401`
- Test: `server/lib/rootFunnelScope.test.ts` (append one `describe`)

**Interfaces:**
- Consumes: `experimentFunnel` from Task 1
- Produces: exposures written from root now carry `context.funnel = 'v1-root'` instead of
  `null`, which is what `server/lib/experiments.ts:1119` (`e.context->>'funnel'`) reads for
  the per-funnel breakdown.

- [ ] **Step 1: Write the failing test**

Append to `server/lib/rootFunnelScope.test.ts`:

```ts
describe('exposure context identifies root rows', { skip: !hasDb }, () => {
  it('an exposure written for root carries funnel=v1-root, not null', async () => {
    const subject = hashEmail('root-exposure@example.com');
    await logExposure(EXPOSURE_KEY, subject, 'B', 'gate_assigned', {
      conversationId: 'test-conversation',
      funnel: experimentFunnel(undefined),
    });

    const [row] = await db
      .select()
      .from(experimentExposures)
      .where(
        and(
          eq(experimentExposures.experimentKey, EXPOSURE_KEY),
          eq(experimentExposures.subjectId, subject),
        ),
      );

    assert.ok(row, 'the exposure must have been written');
    // The tally reads e.context->>'funnel'; a null there reports as unrecorded, so
    // root's rows would be invisible in the per-funnel breakdown.
    assert.equal((row.context as { funnel?: string } | null)?.funnel, 'v1-root');
  });
});
```

- [ ] **Step 2: Run test to verify it passes for the helper but the call sites are unchanged**

Run: `npx tsx --env-file=.env.test --test server/lib/rootFunnelScope.test.ts`
Expected: PASS — this test exercises `experimentFunnel` directly, so it passes on Task 1's
work. It is a round-trip guard on the value's shape, not a driver for step 3. Step 3 changes
the three production call sites so they write that same value.

- [ ] **Step 3: Change the three exposure contexts**

In `server/lib/priceVariant.ts`, replace `funnel: funnel ?? null,` with
`funnel: experimentFunnel(funnel),` in all three `logExposure` calls — the
`palm_gate_assigned` block (line ~333), the `bump_assigned` block (line ~363), and the
`close_depth_assigned` block (line ~401). Leave every other line in those objects alone.

Add `experimentFunnel` to the existing import from `./experiments` at the top of the file
(the block starting at line 33 that already imports `resolvePalmGate`, `resolveV1Bump`,
`resolveV1CloseDepth`, `logExposure`).

🔴 Do **not** touch the `funnel` variable itself, and do not change any other use of
`funnel` in this file — `selectVariant`, `storedVariantIsServable` and the logger calls all
need the raw value.

- [ ] **Step 4: Verify all three call sites changed, and nothing else moved**

Run: `grep -c "funnel: experimentFunnel(funnel)," server/lib/priceVariant.ts`
Expected: `3` — one per `logExposure` call. A `2` means one block was missed and that
experiment's root rows will report as unrecorded.

Run: `grep -c "funnel: funnel ?? null," server/lib/priceVariant.ts`
Expected: `0`.

Run: `npx tsc --noEmit`
Expected: no new errors in `server/lib/priceVariant.ts`. (The repo has ~46 pre-existing
errors in other files — `server/api/crud.ts`, `client/src/components/NatalChartWheel.tsx`
and others. Compare the file list before and after; `priceVariant.ts` must not appear.)

Run: `npm run test:experiments`
Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add server/lib/priceVariant.ts server/lib/rootFunnelScope.test.ts
git commit -m "feat(experiments): stamp v1-root on root exposures so the tally can see them"
```

---

### Task 4: Regression guard — root must never draw another funnel's price

**Files:**
- Test: `server/lib/priceVariantPool.test.ts` (append after the existing
  `scopeVariantsToFunnel` describe block, around line 428)

**Interfaces:**
- Consumes: `scopeVariantsToFunnel`, already imported at line 32 of that file
- Produces: nothing. This task adds only a test.

This is the single most dangerous mistake available in this change, and it is silent — it
would show up as root visitors being charged $45 or $55.

- [ ] **Step 1: Write the test**

Append to `server/lib/priceVariantPool.test.ts`:

```ts
describe('root must never draw another funnel\'s price (v1-root sentinel guard)', () => {
  // The real shape: root's arms carry NO funnel field, every other funnel's are scoped.
  const POOL: PriceVariant[] = [
    { id: '35', weight: 1, priceCents: 3500, downsellCents: 2500 },
    { id: '45', weight: 0, priceCents: 4500, downsellCents: 3200 },
    { id: '59', weight: 0, priceCents: 5900, downsellCents: 4200 },
    { id: '45_fb', funnel: 'v1-fb', weight: 1, priceCents: 4500, downsellCents: 3200 },
    { id: '35_palm_u47', funnel: 'v1-palm', weight: 9, priceCents: 3500, downsellCents: 2500 },
  ];

  it('root (undefined funnel) draws ONLY the unscoped arms — unchanged by the sentinel', () => {
    assert.deepEqual(
      scopeVariantsToFunnel(POOL, undefined).map((v) => v.id),
      ['35', '45', '59'],
    );
  });

  it('🔴 passing the EXPERIMENT sentinel here would hand root every funnel\'s price', () => {
    // Documents WHY experimentFunnel() must never reach this function: no variant is
    // scoped to 'v1-root', so the no-match fallback returns the WHOLE pool, palm and
    // fb prices included. If this assertion ever needs changing, something upstream
    // is passing the sentinel into pricing.
    assert.deepEqual(
      scopeVariantsToFunnel(POOL, 'v1-root').map((v) => v.id),
      ['35', '45', '59', '45_fb', '35_palm_u47'],
    );
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:price`
Expected: PASS, 0 failures. Both assertions describe today's behaviour, so they pass
immediately — that is the point. They fail the day someone wires the sentinel into pricing.

- [ ] **Step 3: Prove the guard is real by breaking it once**

Temporarily change the first assertion's argument from `undefined` to `'v1-root'` and rerun
`npm run test:price`. Expected: FAIL, showing the extra `45_fb` and `35_palm_u47` ids.
Revert the change and rerun. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/priceVariantPool.test.ts
git commit -m "test(price-pool): lock root to its own arms, so the experiment sentinel can never price it"
```

---

### Task 5: SQL — ship the gate and the bump to root

**Files:**
- Create: `improve-v1/ship-gate-bump-to-root-2026-08-18.sql`

**Interfaces:**
- Consumes: the deployed code from tasks 1–4. **Deploy first.** Widening scope before the
  code is live enrols root into a test the resolvers cannot yet match — harmless, but it
  records exposures with no treatment.
- Produces: nothing in code. This file is run by hand, dev first, then prod.

- [ ] **Step 1: Write the file**

```sql
-- ============================================================================
-- SHIP the commitment gate + order bump to ROOT V1
-- 2026-08-18 · spec: docs/superpowers/specs/2026-08-18-root-gate-bump-port-design.md
--
-- WHAT THIS DOES. For each of the two rows: widens scope.funnel to include the
-- new 'v1-root' sentinel, then marks the test `done` with its winning arm.
-- assign()'s status='done' branch (server/lib/experiments.ts:397) applies that
-- winner's payload to EVERYONE in scope with enrolled:false — so root gets the
-- treatment permanently and no new exposures accumulate anywhere.
--
-- 🔴 DEPLOY THE CODE FIRST. Without experimentFunnel() in the four resolvers,
--    root still resolves as `undefined` and this scope entry matches nothing.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD. The two databases were separated
--    on 2026-08-05.
--
-- 🔴 THIS ENDS BOTH TESTS FOR PALM AND TAROT TOO. Marking a row `done` stops
--    enrolment everywhere, not only on root. Step 0 exists so you see the live
--    status before you decide. If either row is still `running` and you are not
--    ready to call it, STOP and run only the half you are ready for.
--
-- WHY RAW SQL AND NOT THE ADMIN UI: PATCH /api/admin/experiments/:key refuses a
-- scope edit on a non-draft row (the assignment freeze,
-- server/routes/admin/experiments.ts). That guard is correct in general — scope
-- changes usually re-partition enrolled subjects. It does not here: the bucket is
-- sha256(subject_id + key) % 100 and does not read `scope` at all, so no enrolled
-- palm or tarot subject is re-bucketed or moved between arms. Same deliberate
-- override as improve-v1/extend-gate-to-tarot-2026-07-31.sql.
-- ============================================================================

-- ── 0. PRE-FLIGHT. Run alone first and READ IT. ─────────────────────────────
-- Expect 2 rows. Note each one's `status` and, for the gate, which variant key
-- carries "gate": true — that key is what step 2 sets as the winner.
SELECT key, status, winner_variant, scope, variants, started_at
FROM experiments
WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');

-- ── 1. THE COMMITMENT GATE ──────────────────────────────────────────────────
-- 🔴 Replace 'B' below with the arm key whose payload is {"gate": true}, read
--    from step 0. This row was never seeded from a file in this repo — it was
--    created by a transactional write replicating /start on 2026-07-28 — so the
--    repo cannot tell you the key. Do not guess.
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-palm","v1-tarot","v1-root"]'::jsonb),
    status = 'done',
    winner_variant = 'B',           -- ← the {"gate": true} arm, from step 0
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
WHERE key = 'v1_palm_commitment_gate_2026';

-- Expect exactly 1 row, scope.funnel with three entries, status done.
SELECT key, status, winner_variant, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_palm_commitment_gate_2026';

COMMIT;

-- ── 2. THE ORDER BUMP + ITS WINNING COPY ────────────────────────────────────
-- One row, not two. V1_BUMP_EXPERIMENT_KEY resolves to the default
-- 'v1_bump_copy_2026' (shared/orderBump.ts:312) and the env override is set on no
-- environment, so this is the row the resolver actually reads. BOTH its arms
-- carry payload.bump = true, so declaring B the winner hands root the bump AND
-- the winning "double-strength clearing" copy in one move. B won on 2026-08-16:
-- take-rate 37.8% -> 54.5%, p=0.034.
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-palm","v1-tarot","v1-root"]'::jsonb),
    status = 'done',
    winner_variant = 'B',
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
WHERE key = 'v1_bump_copy_2026';

SELECT key, status, winner_variant, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_bump_copy_2026';

COMMIT;

-- ── 3. POST-FLIGHT, after the first real root lead ──────────────────────────
-- Root exposures stop accumulating (status done ⇒ enrolled:false), so the check
-- is on the CONVERSATION side: a root buyer with a bump line.
SELECT id, email, funnel, bump_offered, bump_purchased, bump_amount_cents, created_at
FROM conversations
WHERE funnel IS NULL AND bump_offered = true
ORDER BY created_at DESC
LIMIT 20;

-- ── 4. ROLLBACK ─────────────────────────────────────────────────────────────
-- Clearing the winner is enough: assign() then falls through to the normal
-- status check, and a non-running test yields control for everyone.
--
-- UPDATE experiments SET winner_variant = NULL, status = 'paused', updated_at = now()
-- WHERE key IN ('v1_palm_commitment_gate_2026', 'v1_bump_copy_2026');
```

- [ ] **Step 2: Check the SQL parses without running it**

Run: `grep -c "BEGIN;" improve-v1/ship-gate-bump-to-root-2026-08-18.sql`
Expected: `2` — one transaction per row, so a mistake on the gate does not commit the bump.

- [ ] **Step 3: Commit**

```bash
git add improve-v1/ship-gate-bump-to-root-2026-08-18.sql
git commit -m "chore(v1-root): SQL to ship the gate + bump to root, with the pre-flight it needs"
```

---

### Task 6: SQL — widen the downsell bump test to root (stays draft)

**Files:**
- Create: `improve-v1/extend-downsell-bump-to-root-2026-08-18.sql`

**Interfaces:**
- Consumes: the deployed code from tasks 1–4
- Produces: nothing. The row stays `draft`, so this changes no behaviour at all.

- [ ] **Step 1: Write the file**

```sql
-- ============================================================================
-- Widen the DOWNSELL BUMP PRICE test to ROOT V1
-- 2026-08-18 · specs: 2026-08-18-root-gate-bump-port-design.md §5
--                     2026-08-16-v1-downsell-bump.md
--
-- Root joins the EXISTING tarot row rather than getting one of its own. Root
-- produces ~2 downsell buyers/month; a root-only split is one buyer per arm per
-- month, which is not a weak test but an unreadable one. Root's downsell is $25
-- like tarot's, so the proportional-parity argument ($9.77 = 39.1% of $25 against
-- $12.77's 51.1%) carries over unchanged.
--
-- ⚠ THIS CHANGES NOTHING TODAY. The row is `draft`, and a draft yields control
--   for everyone. It stays draft after this file runs.
--
-- 🔴 DO NOT START THIS ROW. Not on root, not on tarot. Known billing bug, found
--    2026-08-17 and browser-verified: arm A would SHOW her $9.77 and CHARGE her
--    $12.77. /api/checkout resolves the real arm (routes.ts:826-831) but
--    /api/lead never sends `bumpCentsDownsell` (absent from the response built at
--    routes.ts:1355-1371), so BumpOfferCard is pinned to the $9.77 fallback. The
--    two agree only while the row is draft and both sides fall back to $9.77.
--    Starting the row is what breaks them apart.
--
--    The fix is the shape bumpCopy already uses: resolve the arm at lead capture,
--    return it on /api/lead, capture it client-side. Fix that, then start this.
--    Note resolveV1DownsellBumpPrice logs NO exposure today
--    (experiments.ts:1547-1558), so the row has no denominator until the same fix
--    supplies one.
--
-- 🔴 RUN IT TWICE — once on DEV, once on PROD.
-- ============================================================================

-- ── 0. PRE-FLIGHT — expect 1 row, status 'draft', scope.funnel ["v1-tarot"]. ─
SELECT key, status, scope, variants, conversion
FROM experiments
WHERE key = 'v1_downsell_bump_price_2026';

-- ── 1. WIDEN THE SCOPE. Status untouched. ───────────────────────────────────
BEGIN;

UPDATE experiments
SET scope = jsonb_set(scope, '{funnel}', '["v1-tarot","v1-root"]'::jsonb),
    updated_at = now()
WHERE key = 'v1_downsell_bump_price_2026'
  AND status = 'draft';   -- refuses to touch a row someone has already started

-- Expect 1 row: status STILL 'draft', two funnels.
SELECT key, status, scope->'funnel' AS funnels
FROM experiments WHERE key = 'v1_downsell_bump_price_2026';

COMMIT;

-- ── 2. ROLLBACK ─────────────────────────────────────────────────────────────
-- UPDATE experiments SET scope = jsonb_set(scope, '{funnel}', '["v1-tarot"]'::jsonb),
--        updated_at = now()
-- WHERE key = 'v1_downsell_bump_price_2026';
```

- [ ] **Step 2: Verify the guard clause is present**

Run: `grep -n "AND status = 'draft'" improve-v1/extend-downsell-bump-to-root-2026-08-18.sql`
Expected: one match. Without it, this file could silently widen a started test.

- [ ] **Step 3: Commit**

```bash
git add improve-v1/extend-downsell-bump-to-root-2026-08-18.sql
git commit -m "chore(v1-root): widen the downsell bump test to root — and say why it must not start"
```

---

## After the plan: what a human still has to do

These are **not** code tasks and are deliberately outside the checklist:

1. **Deploy** the code from tasks 1–4.
2. **Read the gate row's live status and arm keys** (Task 5, step 0), and decide whether
   ending the palm/tarot test today is acceptable.
3. Run Task 5's SQL on **dev**, walk root `/chat` end to end, then run it on **prod**.
4. Browser-verify on root, per the spec's §7: once through the gate → bump → Stripe, and
   once declining three times → $25 downsell → its bump — asserting in both that the card's
   price equals the Stripe line.
5. Leave Task 6's row **draft** until the downsell billing bug is fixed.
