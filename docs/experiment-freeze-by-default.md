# Assignment freeze — make it the default (designed 2026-08-14, NOT shipped)

**Status: designed, tested, deliberately held back.** It was built alongside the V1
recovery-link fix and split out of it — the recovery-link fix does not need it, and
bundling it dragged a live prompt experiment into an unrelated change. The finished
diff for two of the three files is at
`<session scratchpad>/freeze-by-default.patch`; the third is a one-line change in
`assign()`.

## The problem

`scope.freezeAssignment` is **opt-in**. A test only behaves correctly if whoever
started it remembered to set the flag, and that is a step remembered exactly once.

A subject's bucket is permanently sticky, but the bucket→variant MAP moves with the
weights. So editing weights on a running, unfrozen test silently reassigns people who
have already seen the other arm — their logged exposure then disagrees both with what
they are subsequently shown AND with how the tally counts them, because arm membership
is read from `experiment_exposures`.

## The change

Three files:

1. `shared/schema.ts` — add the single definition of the default, next to the field:

   ```ts
   export function freezesAssignment(scope: ExperimentScope | null | undefined): boolean {
     return scope?.freezeAssignment !== false;   // absent ⇒ frozen; only explicit false opts out
   }
   ```

2. `server/lib/experiments.ts` — `assign()` uses it:
   `if (exp.scope?.freezeAssignment === true)` → `if (freezesAssignment(exp.scope))`

3. `server/routes/admin/experiments.ts` — the live-edit guard and `scopeEditError`
   read the SAME helper, so runtime and admin can never disagree about whether a test
   is frozen. This also closes a hole: today a started test that never set the field
   can be edited to an explicit `false`; reading through the helper refuses that.

Cost: one indexed point-lookup on `(experiment_key, subject_id)` per `assign()`. The
lookup stays BELOW the scope/status guards, so an out-of-scope, draft, paused or
concluded test still returns without touching the DB. It is deliberately NOT hoisted
above the scope checks — an exposure row proves she was in scope when it was written,
but scope also governs which traffic the test applies to *now*, and hoisting would let
a palm-assigned arm follow her onto a funnel the test was never scoped to.

## 🔴 The prerequisite — do this FIRST

Checked all five running experiments on prod (2026-08-14). Four are safe: two have
never been edited since they started, and `v1_bump_copy_2026` + `v1_tarot_version_bc_2026`
already carry `freezeAssignment: true`.

The fifth blocks it. **`persona_prompt_evelyn_2026`** is `running`, unfrozen, started
2026-07-09 and edited 2026-07-21, and its weights are now **A=0 / B=100** — it is a
rollout, not a live test. Unfrozen, everyone derives arm B, which carries the real
Evelyn prompt. Freeze it and anyone holding an `A` exposure row from before 07-21 gets
pinned back to arm A, whose payload is `{}` → they fall through to
`personas.base_system_prompt`, which for Evelyn is a stub. That is a live quality
regression for the longest-standing users.

Sizing query:

```sql
SELECT variant, count(*) FROM experiment_exposures
WHERE experiment_key = 'persona_prompt_evelyn_2026' GROUP BY variant;
```

Two ways to clear it:

- **Preferred — the durable exit** (option (c) in the `persona-iterate` skill, and what
  Mike wants anyway since B has won and the split will not run again): copy B's prompt
  into `personas.base_system_prompt`, verify it byte-for-byte, THEN mark the experiment
  `done`. A `done` test returns before the freeze check ever runs, so no flag is needed,
  and the frozen-experiment trap the team has worked around since July is retired.
  ⚠ `done` + `winnerVariant` alone does NOT keep serving B — `resolvePersonaPrompt`
  resolves via `getActivePromptExperimentKey`, which only returns **running** tests, so
  a concluded prompt test reverts to base regardless of the declared winner. Moving the
  prompt into base first is what makes `done` safe.

- **Cheap version** — opt that one row out explicitly, then ship:

  ```sql
  UPDATE experiments
  SET scope = COALESCE(scope, '{}'::jsonb) || '{"freezeAssignment": false}'::jsonb
  WHERE key = 'persona_prompt_evelyn_2026';
  ```

  Must be raw SQL: the admin PATCH refuses turning freeze off on a started test, which
  is the guard working as intended.

A future Evelyn prompt test is unaffected either way — a new run needs a NEW key (an
exposure is one row per subject per key), new rows get the default, and the
single-running-prompt-test-per-persona guard means this row has to be retired before a
new one can start.

## Why it wasn't needed for the recovery-link fix

Recovery links are written at lead capture only and are not retrofittable, and
`resume_url` shipped 2026-08-13 (`9b596b7`). So every exposure that can be resumed
today is newer than every running test's last weight change, and freezing changes
nothing for that population right now. It is protection against a weight edit landing
between a lead's opt-in and her click — real, but not live.

## Verification already done

- 87/87 node:test unit tests passed with the change applied, including the DB
  integration suite covering `assign()` stickiness, ~50/50 split, scope-awareness,
  the pause kill-switch and winner rollout.
- No new type errors (47 before, 47 after — all pre-existing).
