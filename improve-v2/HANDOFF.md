# Session foundation / handoff prompt

Paste the block below to bootstrap a fresh session, or just say:
*"Read improve-v2/HANDOFF.md and continue."*

---

## GOAL

Turn **The Seer Within V2** (multi-persona spiritual-chat: Evelyn, Marcus, Aiden, Luna,
Maren, Nova; minutes-based credits) from an **interrogating funnel** into a **real
companion with spiritual roots that retains users**. North-star metric: cut the
**84.6% "never return after session 1"** cliff (only 15.4% ever return; 6.8% of
chatters buy; 46% of buyers rebuy — the leak is the FREE first session + the wall, not
the paid experience).

Operator = the media buyer/owner. Speak in **plain, everyday language** (layman
English), not jargon.

## STATE AT A GLANCE (2026-07-05)

- **Variant B prompt = B5.3** (`specs/evelyn-v2-prompt-B5.md`), verified on BOTH test
  tracks (eval 8/8, Playwright UI 12/12 clean) — **gate-ready**, pending the operator's
  call on 4 review items in `eval/reports/evelyn-v2-b5-verification.md`.
- **Engine context change class is built + tested but NOT DEPLOYED**: head+tail window,
  current-message dup-exclusion, `[RUNTIME_CONTEXT]` date/meter, email-canon calendar,
  `[CARD_DRAW_TOOL]` picker opt-in, context-tag echo guard.
- Experiment `persona_prompt_evelyn_2026` is **DRAFT/0%**; launch split = **50/50 by
  operator decision** (2026-07-04, overriding the earlier ramp recommendation).
- Everything is UNCOMMITTED on `development`. Sprint 0 remainder + Sprint 1 untouched.

## HOW TO ORIENT (read in this order)

1. This file.
2. [08-PLAN.md](08-PLAN.md) — the driver. Rows S.1–S.9 are the whole variant-B story.
3. [eval/reports/evelyn-v2-b5-verification.md](eval/reports/evelyn-v2-b5-verification.md)
   — current verification + the 4 pending operator decisions.
4. [specs/evelyn-v2-prompt-B5.md](specs/evelyn-v2-prompt-B5.md) — the live variant-B text.
5. How we test (three layers): [eval/EVAL.md](eval/EVAL.md) (frozen cases + replays) ·
   `scripts/ui-capture.ts` (rendered-UI batches) ·
   [eval/manual-test-script.md](eval/manual-test-script.md) (operator live loop).
6. Background analysis — the WHY, now largely encoded in the prompt: `02-reading-pass`,
   `04-prompt-baseline`, `05-demand-study`, `06-prompt-framework`, `07-CHECKLIST`.
7. History: `eval/reports/evelyn-v2-spike-1.md` (rung 1) and
   `eval/reports/evelyn-v2-rung2.md` (rung 2, incl. the duplication-bug catch).

## PROMPT LINEAGE (edit the right file)

B1/B2 (spike, rungs 1–2 measured on B2.1) → B3.x (letters + card retrieval) → B4.x
(operator co-design: held breath, image, sight-register, anchor+name method, card
gates, thread) → **B5.3 (current)**. `specs/evelyn-v2-prompt-B5.md` is the ONLY
editable spec — earlier files are records. Wire with `npx tsx scripts/_wire-evelyn-v2.ts`
(reads B5, writes the experiment row payload). NEVER paste into
`personas.base_system_prompt` (that's variant A, live for everyone). NEVER put the
word "t-a-r-o-t" in the fenced block (substring detection would hand her Marcus's
draw cadence — `[CARD_DRAW_TOOL]` is the deliberate opt-in).

## HISTORY — the two smoking guns (BOTH FIXED)

1. Context-window bug (first-20-messages) → head-10+tail-30 + omission note +
   current-message exclusion. Tested (`chatEngine.contextWindow.test.ts`), undeployed.
2. Interrogation was instructed ("28 words max…") → the entire variant-B track.
   Note: the old character rules still leak into ALL variants via `buildIntentContext`
   — make variant-aware before the A/B (go-live checklist step 3).

## NON-NEGOTIABLE RULES

- **Update the tracking docs when a task is DONE + VERIFIED** (07-CHECKLIST box +
  08-PLAN ✅ + one-line verify note). Never tick on "code written."
- **Evidence over assumption.** After ANY prompt change: full eval litmus + a UI-capture
  batch (the eval harness is structurally blind to rendered-UI failures — dead air,
  empty bubbles, stripped-token behaviors; both bit us).
- **No wiring, no server restarts while a batch is in flight** (three collisions on
  2026-07-05). And a local `npm run dev` boot FORCE-CLOSES live sessions in the shared
  prod DB (real user hit once) — don't boot during batches; always launch with the
  email/reconciliation crons env-disabled.
- **The planted-phrase law:** any quotable sentence in the prompt WILL be spoken
  verbatim (6 documented leaks) — shapes and slot templates only; never quote a phrase
  inside a ban; the guarded EXEMPLARS block is the single exception.
- **Slot templates beat principles.** Vague permission < concrete trigger < replacing a
  competing habit < slot template (proven 3× in one day).
- **Capabilities come from the AUTHORED prompt only** — runtime-injected content
  (canon, date/meter) must never toggle engine scaffolding, and echoed context tags
  are stripped from replies (`chatEngine.tagEcho.test.ts`).
- **Never blind-retire the current prompt** (46% of buyers rebuy on it). A/B decides.
- **PII:** raw transcripts/replays live in gitignored folders; committed docs quote by
  initials only. Don't overwrite frozen baselines; new labels per run. Eval users are
  `*@eval.internal` — exclude from KPI queries (and note: drip crons don't exclude
  them yet — backlog).
- **One change class per deploy** (billing / context / prompts). Prompt changes ONLY
  via the experiment framework; never edit variant A in place.
- **AI/human disclosure is SETTLED policy** (neither confirm nor deny) — don't reopen.
- Temp scripts: repo `scripts/` prefixed `_`, deleted after (the wire script stays
  until the gates). DB work read-only unless approved.

## THE SPRINTS (status)

- **Sprint 0** — ✅ baselines. Remaining: 0.2 reconcile stuck-pendings (~$1,100),
  0.3 billing audit, 0.4 CashApp guardrail (live test showed payment-talk is
  currently unguarded), 0.5 KPI baselines.
- **Sprint 0.5 ⭐ — DONE through S.9** (rungs 1–2 PASSED, co-design sprint, dual-track
  verification). See 08-PLAN.
- **Sprint 1 — untouched**, now also owns: `recoverActiveSessions` stale-heartbeat fix
  (every prod deploy currently severs live chats; hit 3× locally).
- **Sprints 2/3 — partially pulled forward** into the B-track: date+meter (#11),
  meter-gated wind-down, email-canon injection (tarot program, `sync-email-canon.ts`),
  never-end-on-own-question (in-prompt). Still open: loop guard, wall/summary/resume
  UI + E2E, cliffhanger check-in emails, suggested-question rails, intake fixes,
  canon wiring for the other email programs.
- **Sprint 4/5 + parallel operator decisions** — unchanged, EXCEPT: the
  ethical-retention doc now has concrete live material (see the 4 review items).

## TOOLING

- `scripts/eval-chat.ts` / `eval-replay.ts` — frozen cases (now 20) + real-session
  replays; `--experiment <key> --variant B` for draft arms; both log card-draw offers.
- `scripts/ui-capture.ts` — Playwright through the real UI: bubbles, timings, card
  taps, DEAD-AIR/EMPTY flags; `--scenarios improve-v2/eval/ui-scenarios/<file>.json`
  (`core-12.json` ≈ the manual script).
- `scripts/sync-email-canon.ts` — tarot ledger → `system_config.email_canon` calendar;
  re-run after each batch is scheduled (convention noted in the ledger STATE.md).
- `scripts/_wire-evelyn-v2.ts` — spec → experiment payload (temp; keep until gates).
- Tests: `chatEngine.contextWindow.test.ts`, `chatEngine.tagEcho.test.ts`
  (`npx tsx --test`, need DATABASE_URL).
- `scripts/churn-transcript-export.ts`, `scripts/reconcile-pending-purchases.ts`,
  `.claude/skills/persona-audit/` (predates the UI track — update before adopting).

## IMMEDIATE NEXT ACTION

**1. ⚠ Operator review** — read `eval/reports/evelyn-v2-b5-verification.md` and rule on
the 4 items (outcome-overcommitment depth · "another man is coming" thread material ·
unprompted letter references · verdict-with-open-thread shape). Any resulting edit =
B5.4 → re-wire → full litmus + UI batch again.

**2. ⚠ GO-LIVE CHECKLIST (in this order — deploying alone starts nothing; flipping
before deploying breaks variant B):**
1. Deploy the context change class (window+dup fix, `[RUNTIME_CONTEXT]`, email-canon,
   `[CARD_DRAW_TOOL]`, tag-echo guard). Tests green first.
2. Make `buildIntentContext` character rules variant-aware (or explicitly accept the
   28-word contradiction for the test).
3. Purge test exposures:
   `delete from experiment_exposures where experiment_key = 'persona_prompt_evelyn_2026' and subject_id in (select id from users where email like '%@eval.internal')`.
4. **Flip `persona_prompt_evelyn_2026` `draft` → `running`** in /admin/experiments —
   the actual go-live. Split = 50/50 (operator decision). While it runs: never edit
   Evelyn in /admin/personas (that's the live control arm), and /admin/prompts is a
   legacy no-op (banner added).
5. Watch: primary = rebuy; guards = session length, complaint language, refunds.
   Emergency kill = pause in the dashboard.

**3. Parallel (any session):** Sprint 0 remainder — the ~$1,100 reconcile dry-run is
the highest-certainty found money in the project — and Sprint 1 bug fixes.
