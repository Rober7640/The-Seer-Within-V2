# improve-v1 — V1 Funnel Stock-take & Drift Audit

Session goal: stock-take and audit all **V1** conversion funnels (`root`, `fb`, `fb2`, `fb-palm` series, `gdn`), extract the original documented conversation flow as a baseline, and check whether the live code has drifted.

## Start here
- **[`AUDIT.md`](./AUDIT.md)** — the synthesis: headline verdict, invariant check, drift findings by severity, per-funnel status, and a proposed live-test plan.

## Evidence (section reports)
| File | What it covers |
|---|---|
| [`00-baseline-v1-flow.md`](./00-baseline-v1-flow.md) | The **intended** V1 flow, reconstructed from docs only — the spec-of-record + 5 invariants. |
| [`01-current-v1-engine.md`](./01-current-v1-engine.md) | How the chat engine **actually** behaves today (client state machine + `/api/chat` + `prompts.ts`), file:line. |
| [`02-funnel-attribution-map.md`](./02-funnel-attribution-map.md) | All 5 funnels side-by-side (route / pixel / Stripe suffix / tags) + where they diverge. |
| [`03-fb-palm-deepdive.md`](./03-fb-palm-deepdive.md) | The palm quiz bridge vs its own design docs; built-vs-documented sign×hook matrix. |
| **[`04-fb-palm-derail-PROVEN.md`](./04-fb-palm-derail-PROVEN.md)** | **The confirmed derail:** live-replay proof that fb-palm's palm identity evaporates after the opener → generic love reading. Root cause (file:line) + the fix. |
| **[`05-flow-comparison-root-vs-palm.md`](./05-flow-comparison-root-vs-palm.md)** | **Root vs fb-palm, full captured transcripts side by side.** Explains the "longer + vague" symptom: a redundant emotional-disclosure loop + generic questions after a specific hook. |
| **[`06-vague-questions-diagnosis.md`](./06-vague-questions-diagnosis.md)** | **Engine-wide (all funnels):** the vague LLM questions are self-inflicted by canned examples in the prompts. Live A/B proof (current vs improved) + the fix. |
| **[`07-five-phase-ab-results.md`](./07-five-phase-ab-results.md)** | Full 5-phase current-vs-improved A/B + **honest per-phase read**, incl. the `crisisReveal` caveat (specificity vs the intentional "inherited block" persuasion frame). |
| **[`08-clearing-theme-coherence.md`](./08-clearing-theme-coherence.md)** | Is the trilogy's Act 1 ("clearing") still clearly expressed? Verdict: named but back-loaded, crispest copy orphaned. Map + 5 concrete changes. |
| **[`09-clearing-ab-design.md`](./09-clearing-ab-design.md)** | How to ship the clearing rewrite as a measured **A/B** (`control` vs `woven`) on the existing framework — mirrors the price split; OFF ⇒ byte-identical. Wiring + decisions. |
| [`evidence/`](./evidence/) | Reproducible scripts + captured transcripts (root, fb-palm) + the reading2 A/B, backing reports 04–06. |

## One-line finding
The core V1 conversion flow and all pricing invariants are **intact**. Drift is additive/peripheral: one real pixel bug (**fb2 → soulmate pixel**), a cluster of dead/legacy code that contradicts the live path, doc staleness, and an under-built fb-palm bridge. See `AUDIT.md §3` for the fix list.
