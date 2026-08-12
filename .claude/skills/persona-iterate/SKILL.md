---
name: persona-iterate
description: "Skill 2 of the daily loop — turn persona-audit findings into a proven prompt improvement: convert each finding into frozen eval cases, apply a MINIMAL prompt delta locally, score before/after with the eval harness (better or not), run the Playwright data-smoke for the bugs evals can't see, and write a verdict report with a ship handoff. Use when asked to: fix the prompt from today's findings, iterate the Evelyn/persona prompt, turn findings into eval cases, test a prompt change, run the iteration loop. Never ships to production itself."
---

# Persona Iterate — findings → prompt change → proof

Second half of Joel's daily loop (call 2026-07-10): **`/persona-audit` finds leaks in production buyers → THIS skill fixes and proves → human ships → tomorrow's audit validates on real buyers.** The engines are the existing eval harness (`improve-v2/eval/EVAL.md`, `scripts/eval-chat.ts`, `scripts/eval-replay.ts`), the wire script (`scripts/_wire-evelyn-v2.ts`), and the Playwright suite (`improve-v2/playwright/`). This skill orchestrates; it does not reimplement.

## Safety contract (hard rules)
1. **Local DB only for iteration.** Wire + eval + Playwright create users/sessions and rewrite a draft experiment payload in whatever DB `.env` points at. Before any of those steps, check `DATABASE_URL`: it must be **localhost** (the mirror-image of persona-audit, which requires prod). If it points at prod, stop and ask the operator to switch. Eval runs against prod happen only on explicit operator say-so (precedent exists — eval users are `%@eval.internal`, excluded from KPIs — but they pollute). **Prod-verification gotcha (2026-07-10):** the eval harness fails intermittently through the Supabase transaction pooler (`:6543` — random `relation … does not exist` 42P01 under a pool); run prod verifications through the session pooler instead: same URL with `:5432`, e.g. `DATABASE_URL="$(node -pe "require('dotenv').config({quiet:true});process.env.DATABASE_URL.replace(':6543/',':5432/')")" npx tsx scripts/eval-chat.ts …`.
2. **Never set `EXPERIMENT_FORCE_RUNNING` on prod** (`server/lib/experiments.ts` says so too). The eval runner force-lists the key in its own process only — that's the supported path.
3. **The wire script refuses a non-draft experiment.** That guard protects the live rollout (prod key is `running`) — never work around it; shipping is a human step (§Ship).
4. **Frozen cases are frozen.** Never edit an existing case in `improve-v2/eval/cases.json` after its baseline capture (EVAL.md rule) — add new ones.
5. **PII:** new eval cases recreate the *shape* of a real customer failure with synthetic names and reworded scenario text — never verbatim customer content. cases.json and `eval/runs/` are committed.

## Inputs
- **Findings**: default = the PROMPT-tagged items in the latest `improve-v2/daily/*-buyer-audit.md` (or `improve-v2/prompt-b-buyer-audit-12h-2026-07-10.md` §4); or a finding the user states directly.
- **Persona**: `--persona <slug>` — one of `evelyn-cross` · `aiden-powers` · `luna-voss` · `marcus-stone` · `maren-soleil` · `nova-sharma`. Default `evelyn-cross`. **One persona per run, deliberately.** A prompt change has to be proven before/after; six changes shipped the same day are six untested guesses, and if revenue moves you cannot tell which one did it. Take the worst persona from today's audit scoreboard, fix that one, ship it, and let tomorrow's audit validate it on real buyers. (cases.json carries 58 Evelyn cases and 6 across aiden/luna/marcus/maren — the bank grows from real audit findings, no backfill.)
- Findings tagged CODE/RUNTIME (billing, wind-down injection, memory system) are **not prompt-iterable** — route them to an engineering task and only cover them here if the Playwright suite can assert them.

## Steps
1. **Case-ify each finding** → append to `improve-v2/eval/cases.json` (shape: `{cases:[…]}`; fields `id`, `persona`, `firstName` (synthetic), `title` (date + finding ref), `tests[]` (concrete pass criteria), `turns[]` (3–6 user messages recreating the failure), optional `memory`). Example from the 2026-07-10 audit finding §4.2: turns like *"I texted him yesterday. Did he read it?"* with tests *"never affirms an absent person's concrete action (read/saw/checked/knows) as fact"*, *"reads the client's side of the wire instead"*, *"no comforting-yes"*.
2. **Reproduce (pre-capture).** For each new case:
   `npx tsx scripts/eval-chat.ts --label YYYY-MM-DD-pre --case <id> --experiment persona_prompt_evelyn_2026 --variant B`
   Score against the case's `tests[]` and EVAL.md's 12-check rubric. A new case **should FAIL here** — that's the reproduction. If it passes, the finding isn't prompt-reproducible (suspect runtime/data → back to audit evidence).
3. **Draft the minimal delta.** New spec `improve-v2/specs/evelyn-v2-prompt-B<N+1>.md` (next number; fenced ```prompt block; header section "Delta vs B<N>" stating the change + the finding it addresses). Start from the **live prompt** (refresh the `evelyn-v2-prompt-B-DB-LIVE-snapshot-*.md` convention from the prod experiment row if in doubt — the audit pull's `00-run-meta.json` contains it). One concern per iteration; smallest wording that kills the failure.
4. **Wire it locally.** `.env` must be **localhost** — the script refuses anything else (see rule 1). One command regardless of persona:
   ```bash
   npx tsx scripts/wire-persona-prompt.ts --persona <slug> --spec improve-v2/specs/<slug>-prompt-<N+1>.md
   # review the printed target + char delta, then:
   npx tsx scripts/wire-persona-prompt.ts --persona <slug> --spec improve-v2/specs/<slug>-prompt-<N+1>.md --write
   ```
   It resolves where that persona's live prompt actually lives and writes there:
   - **Evelyn** → the `persona_prompt_evelyn_2026` experiment's variant-B payload. Requires the local row to be `draft` (after `npm run migrate:experiments`); it refuses a running experiment, which is what protects the prod rollout.
   - **Everyone else** → `personas.base_system_prompt`. There is **no draft concept here — the row IS the live prompt**, so the localhost guard is the only protection. The script snapshots the prompt it is replacing to `improve-v2/specs/_snapshots/` and prints the exact restore command. Writes require an explicit `--write`; the default is a dry run.

   🔴 **Never run `npm run seed` while iterating** — it overwrites Aiden's live 29K guardrailed prompt with a legacy 9K one.

   (`scripts/_wire-evelyn-v2.ts` still exists so the committed 2026-07-10/07-15 reports stay reproducible. Don't use it for new work.)
5. **Prove (post-run).** The persona's cases AND the full frozen suite (regression watch):
   ```bash
   # Evelyn (experiment-backed):
   npx tsx scripts/eval-chat.ts --label YYYY-MM-DD-post --persona evelyn-cross \
     --experiment persona_prompt_evelyn_2026 --variant B
   # every other persona (base-prompt-backed — NO --experiment flag):
   npx tsx scripts/eval-chat.ts --label YYYY-MM-DD-post --persona <slug>
   ```
   ⚠️ Passing `--experiment` for a base-prompt persona makes the harness throw `experiment … did not enrol eval user` — that flag is only for a persona that has one. Then re-run without `--persona` for the whole-suite regression watch.
   Pass bar: every new case's `tests[]` pass, and no frozen case drops vs its last known verdict (current known state: 13 PASS / 3 PARTIAL / 1 FAIL `contradiction-bait` — see `eval/reports/v2-improve-eval-2026-07-09.md`). Temperature caveat: a flipped check gets re-run once before you attribute it to the delta.
6. **Playwright data-smoke** (catches what evals can't — Joel: "if the bot stops halfway, eval wouldn't catch that"):
   `npx playwright test -c improve-v2/playwright/playwright.config.ts`
   (Boots dev server itself on :5000 with the experiment force-listed; needs local `.env` + `ANTHROPIC_API_KEY`.) Asserts refund template exact-match, chat round-trip substance, crisis interception.
7. **Report** → `improve-v2/eval/reports/YYYY-MM-DD-iterate-<slug>.md`, template = `v2-improve-eval-2026-07-09.md`: executive summary with a plain **better / not better** verdict (Joel's bar), scoreboard table (case × pre/post verdict × checks), the prompt diff (quoted), Playwright pass/fail, and the ship recommendation. If not better: iterate (back to step 3) or record the dead end and stop.
8. **Ship handoff — human decision, never this skill.** Prod state: `persona_prompt_evelyn_2026` is `running` at A=0/B=100 (a rollout; weights frozen, 409 on variant edits; `done`+winner would revert Evelyn to the base prompt — see memory/audit report). Present the operator these options with the tested spec file:
   - **(a) Pause → edit payload → Resume** via `/admin/experiments` + wire/SQL — users get the base prompt during the window (~30s–2min); do it off-peak.
   - **(b) Payload-only SQL UPDATE while running** — statistically harmless under A=0/B=100, but bypasses guards: requires Joel's explicit OK, with the exact UPDATE shown first.
   - **(c) Durable exit (recommended endgame):** write the final prompt into `personas.base_system_prompt` (the real live store) FIRST, verify, then mark the experiment `done` — traffic falls back to base, which now IS the new prompt, and the frozen-experiment trap is retired.
   After any ship: tomorrow's `/persona-audit` run is the production validation — check its report confirms the failure shape disappeared from real buyer transcripts.

## Known open findings to seed from (2026-07-10 audit)
- §4.2 absent-person invented facts ("C. read it, love") — case-ify first, highest trust risk.
- §4.6 Aiden ask-only interrogation — port B's GIVE-THEN-ASK / READ-THE-TURN scaffolding; `aiden-pinnacle-delivery` case exists as a start.
- `contradiction-bait` (Life-Path flip) — pre-existing FAIL from 2026-07-09, still open.
- §4.4 wind-down at hard balance-zero — RUNTIME (needs live-balance minutes in `[RUNTIME_CONTEXT]` or an injected low-balance beat); prompt can't fix alone. Pair with an engineering task; consider a Playwright assertion once built.
