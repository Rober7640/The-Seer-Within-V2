# FB ad question mining — run log

One file per run of the `fb-ad-question-mining` skill. Each is self-contained and about
**one** theme or sub-group: open it, read "The decision" at the top, act.

`../fb-ad-question-testing-roadmap.md` is the index — the 6 sub-groups, the Wave 1–4
checkbox state, and a pointer to each run below. The detail lives here, never in both.

Naming: `<mode>-<scope>-<YYYY-MM-DD>.md` — mode is `deepen`, `refresh` or `rebuild`.

| Date | Run | Verdict |
|---|---|---|
| 2026-08-15 | [Deepen: Commitment](deepen-commitment-2026-08-15.md) | Build 2 landers — ROOMMATES ($14,065/1k, 2.4× base) and UNAVAILABLE ($11,431/1k, 2.0×). TWOBOATS and PROPOSAL rejected. |

## Reading these

- **Rev/1,000 conversations** is the ranking metric — buy-rate × order value × upsell take
  in one number, comparable to ad spend. Never rank on buy-rate or on raw counts.
- **A number without a verification pass is a hypothesis.** Sub-buckets are small by
  construction, so check the bootstrap and the drop-the-top-buyer line before spending.
- **Sub-bucket patterns** live beside the skill in
  `.claude/skills/fb-ad-question-mining/examples/`, so a run is reproducible. Each run
  file names the one it used and which of its patterns are verified.
