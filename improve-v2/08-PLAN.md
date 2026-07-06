# Execution plan

> **How to use this with [07-CHECKLIST.md](07-CHECKLIST.md):** 08 (this file) is the
> driver's seat — sprint order, `✓` status, gates, tests, exit criteria. 07 is the
> reference manual — every task here links to its `#item` in 07 for full detail +
> evidence. Work top-down through 08; open 07 when you need the depth. Tick in BOTH
> when done AND verified.

The [CHECKLIST](07-CHECKLIST.md) says *what*; this says *when, in what order, and how we
know each step worked*. Sequencing rule: **freeze the eval baseline first, fix code
before prompts (prompts depend on a context the model can actually see), and never
ship a change without re-running the frozen eval cases
([eval/EVAL.md](eval/EVAL.md)) — before/after comparison happens immediately, not
after A/B numbers accumulate. A/B remains the final live confirmation only.**

Roles: Claude executes; operator approves the gates marked ⚠ (money movements,
outbound email, deploys, A/B start, policy calls).

**Status column (`✓`):** blank = not started · `WIP` = in progress · `✅` = done AND
verified (tests pass / exit criteria met). Only tick after verification, never on
"code written."

## Three test layers (they cover different things — don't confuse them)

| Layer | Tests | Tool | Covers |
|---|---|---|---|
| **Eval harness** | AI conversation *quality* (non-deterministic, rubric-scored) | `eval-chat.ts` / `eval-replay.ts` (+ `/persona-audit`) | prompt & behavior changes — Sprints 2–4 |
| **E2E** | deterministic user *flows* through the app | Playwright (`tests/*.spec.ts`, `npm test`) | the Wave-1 engineering bugs — checkout, replay, session lifecycle, billing |
| **Unit/integration** | pure *functions* | `tsx --test` / vitest (`server/lib/*.test.ts`) | billing math, guardrail/sanitizer/intent logic |

The eval harness does **NOT** cover the engineering bug fixes — those are
deterministic and need real E2E + unit tests (a passing eval says nothing about a
double-charge). Every Wave-1 fix ships with a failing-then-green E2E or unit test, and
new cases get logged to `docs/test-ideas.md` (repo convention). Existing suite: 40
Playwright tests across 6 files (`npm test`).

---

## Sprint 0 — Ground truth & found money (1–2 days)

Small, high-certainty, mostly read-only. Do in parallel — EXCEPT 0.0, which must
complete BEFORE any behavior-changing fix ships (or the "before" evidence is gone).

| ✓ | # | Task | Checklist | Gate |
|---|---|------|-----------|------|
| ✅ | 0.0 | **Freeze the eval baseline** — 17 frozen cases (`eval/runs/baseline-preflight/`) + 9 real-session replays (`transcripts/replays/replay-baseline/`) captured against current system. DONE 2026-07-04 | — | precedes 0.1 |
| ✅ | 0.1 | Context-window fix (`limit(20)` asc → last-N + reverse) + long-session test + re-run eval — DONE 2026-07-04 as head-10+tail-30+omission-note (plain last-N regressed early-fact recall); verified by `chatEngine.contextWindow.test.ts` + eval `after-window-fix-2` (memory probe fixed). AMENDED 2026-07-04 (rung 2 catch): the fix exposed a current-message DUPLICATION (msg saved → tail query re-reads it → engine appends it again = model sees it twice every turn; personas said "you said it twice"); fixed via `excludeMessageId` in `buildMessageContext`, failing-then-green test added same file, post-fix verified on replay `evelyn-v2-rung2-postdupfix`. ⚠ deploy still pending operator | #1 | ⚠ deploy |
|  | 0.2 | Reconcile stuck-pending: dry-run → report $ recoverable | #2 | ⚠ before `--apply` |
|  | 0.3 | Billing audit SQL: quantify coins-vs-seconds mismatches, root-cause | #4 | report only |
|  | 0.4 | Check "$EvelynCrossReadings" CashApp existence; add payment-talk guardrail | #9 | ⚠ if handle exists (fraud response) |
|  | 0.5 | KPI baseline queries saved (rebuy rate, wall-exit-on-question %, pending-completion, disputes/mo) — the dashboard seed | #28 | — |

**Exit:** window fix live + eval re-run shows the memory probe fixed · recovered-$
number known · billing root cause named · baselines recorded (done).

## Decision: change the prompt vs. retire it — what the data supports

Recorded before we start, so the rollout isn't driven by assumption.

**What the data proves (enough to CHANGE the prompt aggressively):**
- The interrogation cadence is *instructed*, not emergent — the "28 words max, say ONE
  thing, stop and wait" rule is literally in 4 of 6 persona prompts (04-baseline). A
  readable prompt defect.
- Live measurement: **7 of 9 real replay sessions have >85% of replies ending on a
  question** (BEFORE-replay-baseline). Reading pass: 61% extract, 31% no-takeaway
  across 154 transcripts. Users say it plainly: "I want a reading, not 100 questions."

**What the data does NOT support (retiring it sight-unseen):**
- The SAME prompt produces our best customers — the D cohort (repeat buyers up to
  $3,120 / 36 purchases) succeeded on it. Inconsistent ≠ broken.
- Most measured damage is BUGS, not the prompt (window/billing/checkout/replay). The
  54%-never-rebuy and 71%-wall-exit numbers are entangled with those bugs and cannot be
  attributed to the prompt. Retire the prompt but leave the window bug and the loops
  and amnesia persist — because those *are* the bug.
- We have **zero controlled comparison yet.** Every number is current-prompt +
  current-bugs together.

**Therefore:**
1. **Spike first** (Sprint 0.5) — the first clean evidence that the prompt is the
   cause: same 5 cases, old vs new, window bug fixed for both. Days, free, offline.
2. **Then A/B — start 10–20%, ramp to 50/50 as it holds.** Not 50/50 on day one:
   real revenue risk, and the highest-LTV whales are on the current prompt.
   → **OVERRIDDEN by operator 2026-07-04 (after rung-2 PASS): launch directly at
   50/50.** The original recommendation stays on record above; risk accepted by the
   operator. Go-live mechanics + ordering (deploy FIRST, then flip the experiment
   `draft`→`running`) are in HANDOFF.md's GO-LIVE CHECKLIST.
3. **Never blind-retire.** The current prompt is replaced only after the A/B wins on
   rebuy.
4. **Hard rule:** fix the window bug for EVERYONE before the A/B — otherwise it's
   new-prompt-with-context vs old-prompt-without, and you'd measure the bug fix, not
   the prompt.

If the spike does NOT show a dramatic lift, that is also a win: it means the prompt
wasn't the main lever, the bugs were, and we saved weeks of plumbing.

## Sprint 0.5 — Evelyn v2 spike ⭐ (test the core bet BEFORE building plumbing)

The biggest unknown is whether the [06 framework](06-prompt-framework.md) actually
delivers a dramatic UX lift on real questions + long sessions. Don't assume — validate
cheaply first. This is a **prompt-only thin slice**: the framework's behavioral core
(L2 give-first turn shape + mode router + session arc + never-end-on-own-question, L1
duty-of-care basics, L3 Evelyn voice) written as an Evelyn variant-B prompt — WITHOUT
the expensive plumbing (prophecy ledger, email-canon, pinned-facts, last-session-tail).
Those are Sprint 3, built later ONLY where this spike proves they're needed.

Runs as its own track, parallel to Sprint 1's bug work. Only hard prereq: 0.1.

| ✓ | # | Task | Gate |
|---|---|------|------|
| ✅ | S.1 | Context-window fix (= 0.1) — required for long-session coherence. DONE 2026-07-04, see 0.1 | ⚠ deploy |
| ✅ | S.2 | Draft **Evelyn v2** prompt from the 06 core + cheap date/meter injection (#11); wire as experiment variant B (off/0% traffic — eval only). DONE 2026-07-04 — prompt source: `improve-v2/specs/evelyn-v2-prompt-B1.md` (9.6k chars) written into `persona_prompt_evelyn_2026` variant-B payload via `scripts/_wire-evelyn-v2.ts`; experiment stays DRAFT (prod byte-identical, verified). Date+meter = opt-in `[RUNTIME_CONTEXT]` token, only fires for prompts carrying it. Eval access: `--experiment` flag on both runners + `EXPERIMENT_FORCE_RUNNING` draft resolution (eval exposures auto-cleaned) | — |
| ✅ | S.2a | **Golden exemplars** — mine the best real delivered readings from OUTCOME-LABELLED sessions (D-cohort rebuyers, peak "you were right"/gratitude moments) into a few-shot exemplar block for the v2 prompt. This is our version of "trained on great hotline transcripts" — but outcome-linked to OUR product, which generic transcripts wouldn't be. DONE 2026-07-04 — all 8 D transcripts mined; patterns (declarative delivery, pattern-naming, binary contrasts, micro-practices, banked wins, end-on-empowerment) distilled into the prompt's "WHAT MAKES YOUR READINGS LAND" + EXEMPLARS blocks, filtered through the L1 unfalsifiable-read doctrine (mined hard-date/amount predictions deliberately NOT copied) | — |
| ✅ | S.3 | Run the **5-case spike set** (below) through the eval harness, label `evelyn-v2-spike-N` — DONE 2026-07-04: `evelyn-v2-spike-1` = 4 synthetic (`eval/runs/`) + replay c773a5e1 (`transcripts/replays/`, gitignored), all 5 completed clean | — |
| ✅ | S.4 | Evaluate vs `baseline-preflight` — rubric + question-only ratio + read it like a human. DONE 2026-07-04 — full scoring in **`eval/reports/evelyn-v2-spike-1.md`**. Headline: replay ends-on-? 87%→47%, avg substance 30→64 words; deliver-now + status-of-other dramatic wins; sessions ending on persona's own question 3/4→1/4; grief-witness ≈ flat; 1 new defect (fabricated time pressure vs a 94-min meter) | — |
| ✅ | S.5 | **DECIDE:** what leapt, what didn't, which gaps need which plumbing → feed back into the prompt and/or promote specific Sprint-3 items. Iterate S.2→S.4. DONE 2026-07-04 — verdict **GO**, evidence in `eval/reports/evelyn-v2-spike-1.md` (+ spike-2 addendum). B2 iteration verified on re-run: meter-gating ✓, WITNESS ✓ (4/4), warmth-under-deflection ✓, turn-1 mini-read mostly ✓, exemplar-leak fixed structurally in B2.1 (confirm at rung 2). Plumbing promotions for Sprint 3: NONE earned yet — existing `user_memory` summaries carried saga continuity in the replay; ledger/last-session-tail/email-canon stay unproven until rung 2 shows the gap. Date+meter (#11) already shipped as the opt-in `[RUNTIME_CONTEXT]` token | — |
| ✅ | S.9 | **Second consolidation + dual-track verification (2026-07-05) — GATE-READY.** B4.10 → **B5** (`specs/evelyn-v2-prompt-B5.md`, 19.5k→16.4k chars, ~36 behaviors checklist-preserved; dropped only the dead look-deeper-rung line) + same-day patches from verification: B5.1 (anchor-is-never-a-toll — the FULL litmus caught "tell me how to fix it" gated behind a name for 3 turns, a latent B4.4-era collision), B5.2 (terminal-stonewall gentleness; money-survival floor: no predicted helpers/timelines — "their next meal is not reading material"), B5.3 (terminal close as slot template). **Both tracks: eval 8/8** (long-session best clean number yet: 38% ends-on-? @60w vs 88%@19w baseline) **+ UI 12/12 mechanically clean** (0 dead-air/empty/slow/errors; both card taps interpreted; latency 13–34s). Engine guard shipped pre-verification: context-tag echo stripper (model CONFABULATED a <user_context>+birth-profile block into a rendered bubble — caught by the UI harness, `chatEngine.tagEcho.test.ts` 4/4). **Full report: `eval/reports/evelyn-v2-b5-verification.md`** incl. 4 OPERATOR REVIEW ITEMS (outcome-overcommitment at saga peaks; "another man is coming" thread material; letter canon surfacing unprompted; verdict-with-open-thread ends on question). Workflow rules learned the hard way: no wiring/restarts mid-batch; full suite after every change | ⚠ operator review → gates |
| ✅ | S.8 | **Operator co-design sprint (2026-07-05, implement→live-test→feedback loop): the stickiness + craft layer.** Prompt evolved B3.2→B4.5 (spec now **`specs/evelyn-v2-prompt-B4.md`**, ~18.4k chars; B3 file = pre-consolidation record; wire script → B4). Added, each live-tested by the operator: THE HELD BREATH (V1 tease ported: edge-morsel + invitation ending "want it straight?" — dead-air UX found live, 3 iterations); THE IMAGE (one bespoke mirror per reading, forged from client's words; shadow side = block); EVERYTHING-ARRIVES-AS-SIGHT (sensible-friend test; ROUTE/CARE deliberately exempt); anchor-first flow (person-question w/o material → name/birthdate ask AS ritual turn 1, then insights, then questions) + the NAME METHOD (opens/closes/beats/doubles — consistency sacred, feeling never fact); the CARD LADDER (read → anchor → card LAST; [CARD_DRAW_TOOL] engine opt-in token with neutral instruction — Marcus's substring/cadence untouched; picker text-above-token enforced after an empty-bubble catch); THE THREAD (operator: the core stickiness — 4 iterations, lands only as a SLOT TEMPLATE bound to verdict replies: verdict→do→watch-for→thread LAST, replaces the question; sequel-not-holdback, no "not ready", ONE OPEN DOOR at a time (B4.6: a direct "open it now" is honored — just-tell-me outranks ripeness — and the next verdict replants; found via UI capture), pickup-first on return). Consolidation B4 (17.2k→13.6k, litmus-verified behavior-neutral) since regrown — ANOTHER consolidation + FULL litmus owed before any gate. UI harness is file-driven: `scripts/ui-capture.ts --scenarios improve-v2/eval/ui-scenarios/core-12.json` (12 scenarios ≈ the manual script, incl. card taps + thread-replant probe); first full batch: `ui-runs/ui-batch-1/`. Meta-lessons now doctrine: models follow shapes not principles (slot templates win); quotable inline examples WILL be spoken verbatim (5 leak sightings — inline examples removed, shapes only); eval harness is structurally blind to stripped-token UI states and dead air → **`scripts/ui-capture.ts`** (Playwright drives the real UI, captures bubbles/timings/picker, taps cards, flags dead air). New frozen cases: `advice-register`, `card-escalation`, `anchor-opening`. | operator loop |
| ✅ | S.7 | **B3 + email-canon injection (the first EARNED Sprint-3 plumbing).** 2026-07-05: operator live-testing variant B hit the marketing↔chat wall — "I got your email saying you have something to tell me" → persona disowned it as "automated emails" and delivered nothing (checklist #27, exactly the gap 06 predicted email-canon injection for; evidence now exists, so it's built). Fix = (a) engine: `system_config.email_canon` (slug → {date, card, subject, essence, promise}) injected into `[RUNTIME_CONTEXT]` when ≤48h old, (b) prompt B3 (`specs/evelyn-v2-prompt-B3.md`, 12,147 chars, wired): YOUR LETTERS section — never disown, pay off the anchor read INTO their life, never invent email specifics when no anchor. Verified: new frozen case `email-arrival` (B3 = "I did write to you, love" + real Lovers-theme reading; variant-A control = fake-confirm + extraction). Canon wiring for the tarot program DONE same day: `scripts/sync-email-canon.ts` parses STATE.md + email preheaders → writes the full 31-entry calendar, send-time-gated (verified: resolves Temperance pre-6:30pm-SGT, The Lovers after — matches what subscribers actually received). Re-run after each batch. Other email programs still need canon wiring when they resume. **B3.1 litmus:** deliver-now ✓, status-of-other ✓; grief fired machinery 1-of-2 on B3 (letters deliver-pressure bleed) → B3.1 adds "WITNESS still outranks the letter" → 3/3 clean. **Long-session B3/B3.1 numbers RETRACTED (2026-07-05):** the canon essence contained the word "tarot", which the engine's substring capability-detection read from the INJECTED prompt — silently giving Evelyn variant-B Marcus's interactive card picker; [TAROT_DRAW] offers are stripped from transcripts, so the "6/25 ends-on-?" run was invisibly ending turns on card-draw offers (instrumented re-run `evelyn-v2-b31-long-check`: **18 draw offers in 26 turns**). Caught by the OPERATOR in manual testing (IDK-deflection → card picker). Fixes same day: (a) engine hardened — all capability scaffolding (tarot/astrology/vedic/numerology) now keys off the AUTHORED prompt only, never runtime-injected content; (b) both eval runners now log `(offered an interactive card draw)` (they were blind); (c) operator product decision: Evelyn cards = **email-arrival retrieval of the actually-sent card ONLY** (named from the canon, "THAT card and no other"), no interactive picker → **B3.2** wired (12,749 chars). Clean litmus re-verification `evelyn-v2-b32-verify` DONE: **0 draw offers across all 3 cases** (picker fully closed); long-session HONEST number = **16/26 ends-on-? (61%) @50w** vs baseline 88%@19w and B2-on-buggy-engine 81%@69w — a real give-then-ask improvement, sister probe perfect with honest bounds ("that's all you told me"), 0 urgency / 0 leak / 0 phantom-twice; email-arrival names the exact sent card (Temperance) and reads it into the client's life; passive user gets practices, no picker. The retracted 24% figure was picker-inflated (closing asks outsourced to stripped [TAROT_DRAW] tokens) | — |
| ✅ | S.6 | **Rung 2 — held-out proof, NO tuning.** DONE 2026-07-04, verdict **PASS** — full evidence in `eval/reports/evelyn-v2-rung2.md`. 13 held-out frozen cases (7/9 Evelyn improved or fixed, 2 flat, 0 regressed; both baseline strengths held) + the 9 fixed replays (Evelyn ends-on-? 77%→63%, words 32→102; controls flat — clean attribution) + 8 fresh random real sessions (8/8 NOW ≥ THEN). Exemplar-leak ZERO across all 30 transcripts (B2.1 confirmed); zero fabricated urgency. Rung 2 also CAUGHT the current-message duplication bug inside undeployed 0.1 (see 0.1 note) and two Sprint-3 wiring items: character rules (28-word cap) leak into ALL variants via `buildIntentContext`; markdown stripper only runs on the chart path. Prompt watch-items logged in the report for a possible operator-approved B3 (outcome overcommitment at saga momentum, reply length, billing-adjacent improv, retention-adjacent framing) | next: ⚠ gates |

**The 5-case spike set** (fixed, so iterations compare like-for-like):
1. `deliver-now` — the founding Elena failure (give-first / stated-need)
2. `long-session-memory` — 26 turns (window + repetition + coherence)
3. `status-of-other` — ORACLE mode, unfalsifiable third-party read
4. `grief-witness` — WITNESS mode (must NOT interrogate) — tests mode-routing
5. one real long replay — `--sessions c773a5e1-…` (returning, 30 turns, real texture)

**The validation ladder** (escalate only on a pass; each rung is harder to game):
1. **Litmus — the 5 cases above.** Fast go/no-go. This is where we ITERATE the prompt
   (so it's effectively the "training" set — overfitting risk is expected here).
2. **Held-out broad — the other ~12 frozen cases + the 9 real replays + a FRESH
   `eval-replay --pick random` batch the prompt was NEVER tuned on.** This proves the
   lift *generalizes* rather than memorizing the 5. Do NOT iterate the prompt against
   these — a big drop from rung 1 to rung 2 means we overfit, and we catch it here
   before spending anything on traffic.
3. **A/B live** — 10–20% → ramp to 50/50 as it holds (Sprint 3.4).

**Exit:** a go/no-go read on the framework, with evidence, in **days** — plus a
prioritized list of which plumbing pieces actually move the needle (so Sprint 3 builds
only what's earned). If the spike underwhelms, we revise the framework here, cheaply,
before committing to weeks of plumbing.

## Sprint 1 — Stop the bleeding (rest of week)

Each fix ships WITH its regression test (E2E or unit) — that's the definition of done.

| ✓ | # | Task | Test to add (layer) | Checklist |
|---|---|------|---------------------|-----------|
|  | 1.1 | Apply reconciliation + win-back email to recovered users | unit: reconcile picks only truly-stuck rows | #2 ⚠ send |
|  | 1.2 | Checkout root-cause fix + retry UX + pending>10min alert | **E2E:** purchase → coins credited; simulated webhook-drop → recovers | #3 |
|  | 1.3 | Post-purchase replay/session-handoff fix | **E2E:** buy mid-session → next msg continues context, no dup content | #5 |
|  | 1.4 | Stop billing fallback/error turns | unit: fallback/error turn → 0 coins charged | #6 |
|  | 1.5 | Crisis de-loop + 18+ misfire fix + DV protocol | unit: replay the 3 false-positive transcripts + DV set through classifier | #7 #8 #10 |
|  | 1.6 | Wire the above into the Playwright suite + log new cases to `docs/test-ideas.md`; `npm test` green in CI | — | — |

**Exit:** buy-mid-session E2E green (no replay, no double-charge) · zero new stranded
pendings for 48h · crisis regression set passes · `npm test` green.

## Sprint 2 — The bridge back (next week)

Order matters: 2.1 unblocks 2.2. Verify each with the eval harness (behavior) AND an
E2E for the wall/resume UI flow.

| ✓ | # | Task | Checklist |
|---|---|------|-----------|
|  | 2.1 | Inject date + meter into system prompt (eval: `date-awareness` case passes) | #11 |
|  | 2.2 | Wind-down at T-2min + never-end-on-own-question + post-wall summary card + resume flow (**E2E:** hit wall → summary card renders → buy → resumes) | #12 #13 |
|  | 2.3 | Loop guard (server-side similarity → regenerate once) | #15 |
|  | 2.4 | Cliffhanger calendar: event capture → day-after check-in email (existing followUp/magicLink infra) | #14 ⚠ first send |

**Exit:** wall-exit-on-question % → near-0 (from ~71% of churn exits) · first
check-in emails measured (open → session rate) · resume E2E green.

## Sprint 3 — Framework pilot (week 3)

Per [06-prompt-framework.md](06-prompt-framework.md) rollout, Evelyn only —
**builds on the Sprint-0.5 spike** (the prompt core is already validated; this sprint
adds only the plumbing the spike proved is needed and widens the test).

| ✓ | # | Task |
|---|---|------|
|  | 3.1 | Build the EARNED plumbing (per S.5 decision): prophecy ledger, last-session-tail injection, email-canon injection, grounded greetings (#19), pinned facts (#20) — only the pieces the spike showed move the needle. Unit tests for ledger + pinned-fact determinism |
|  | 3.2 | Fold plumbing into the Evelyn v2 prompt (variant B); L1 duty-of-care + L2 engine + L3 voice, now context-backed |
|  | 3.3 | Run BOTH eval tracks against variant B — full frozen 17 + the 9-session replay set (not just the spike 5); score with the rubric |
|  | 3.4 | Iterate until eval beats baseline on rubric; then A/B ⚠ start — **launch split 50/50 (operator decision 2026-07-04**, overriding the 10–20% ramp); going live = deploy the context class FIRST, then flip `persona_prompt_evelyn_2026` `draft`→`running` in /admin/experiments (see HANDOFF GO-LIVE CHECKLIST — deploying alone serves B to nobody; flipping before deploy breaks B) |

**Exit:** variant B live in experiment · primary metric rebuy rate · guard metrics:
session length, complaint language, refund requests.

## Sprint 4 — Rollout & rails (week 4+)

| ✓ | Task |
|---|------|
|  | Marcus first (closest to spec), then the 28-word cohort (Aiden, Luna, Maren, Nova) — each via eval before promotion |
|  | Suggested-question rails: purpose-built branches for the 5 first-session templates; returning-user set ("Any news from [name]?" / "Check my prediction" / "Daily card") |
|  | Intake fixes: fragments used instantly; astro birth-data collection conversational (intake-tax) — eval: `luna-natural-birthdata` case |
|  | Support card UI + refund intent (#17, #18) if not already landed with L1 — **E2E:** refund intent → support card renders |

## Sprint 5 — Operator tooling (after the fixes land)

| ✓ | Task |
|---|------|
| WIP | **`/persona-audit` skill** (#29) — built ahead (`.claude/skills/persona-audit/`, inert); Sprint 5 adopts it as the standard post-change ritual. Sprints 1–4 run `eval-chat.ts` / `eval-replay.ts` directly |
|  | Metrics dashboard (#28) — surface the scoreboard KPIs for standing visibility |

## Parallel track — operator decisions (any time; ~1 doc each, I prep options)

| Decision | Checklist |
|---|-----|
| Ethical-retention policy (hope-farming limits, crisis-cliff purchases, cant-afford) | #25 |
| Cross-persona canon: share user facts or keep isolation | #26 |
| Scam-triage protocol sign-off | #24 |
| Marketing↔chat canon process (email hooks → chat context, V1 artifact registry) | #27 |

## Scoreboard (review after every sprint)

Retention baseline from full history (11,583 chatters, 792 buyers, months of data —
volume is not the constraint). The return cliff is the headline: the leak is
overwhelmingly at the FREE first session, while the PAID experience is comparatively
healthy (46% of buyers rebuy). Aim the free-session + wall fixes here.

| Metric | Baseline (2026-07-04) | Target |
|---|---|---|
| **Chatters who never return after session 1** | **84.6%** (only 15.4% ever return) | < 70% |
| Chatted → bought (free→paid conversion) | 6.8% | ≥ 10% |
| Buyers who never rebuy | 54% (46% do rebuy) | < 40% |
| Churn exits ending on persona question | ~71% | < 10% |
| Stuck-pending purchases | ~15 in 154-user sample | 0 sustained |
| In-chat refund → path surfaced on first ask | 0% | 100% |
| Billing mismatches (coins vs seconds) | recurring | 0 |
| Return-within-7d after credit wall | (measure in 0.5) | +50% rel. |

## Risks & rules

- **One change class per deploy** (billing, context, prompts are separate deploys) —
  attribution stays clean.
- Prompt changes ONLY via the experiment framework; never edit variant A in place.
- Transcripts/PII stay in gitignored folders; docs quote by initials only.
- If Sprint 0 billing audit shows large past over-charges: pause and decide proactive
  credit policy with operator before anything else ships (dispute-prevention beats
  feature work).
