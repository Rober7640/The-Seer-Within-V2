# Transcript study — why users stop buying

**Goal:** read real conversations from users who didn't continue purchasing, find the
recurring gaps, and feed them into the [backlog](README.md) as design changes. The
founding case study showed one failure mode (extract-don't-give); this corpus tells us
which failure modes are *common*, not just vivid.

## The funnel today (2026-07-04 snapshot)

- 61,394 accounts → **11,266 ever chatted** → **791 ever bought** (7% of chatters)
- **427 of 791 buyers (54%) never made a second purchase** — that's the leak this
  study targets. Repeat buyers exist at real depth (up to 36 purchases, $3.1k lifetime),
  so the product *can* create the relationship — it just usually doesn't.

## Cohorts

Exported by `scripts/churn-transcript-export.ts` into `improve-v2/transcripts/`
(**gitignored — PII, never commit**). File naming: `<cohort>-<msgs>msgs-<user8>.txt`;
index in `shortlist.csv`.

| Cohort | Definition | Pool size | Exported | Why read it |
|--------|-----------|-----------|----------|-------------|
| **C — paid & bailed** | 1 purchase, ≥10 min of credits stranded, inactive 7d+ | 16 | all | Strongest dissatisfaction signal: paid money, walked away from value they already own. Includes a sub-pattern: **bought but never/barely chatted after** — possibly a UX or expectation failure, not a conversation failure |
| **B — one-and-done** | 1 purchase >14d ago, credits consumed, never rebought | 345 | top 50 | The core 54% leak. They liked it enough to use everything — then didn't come back. What was missing at the end? |
| **A — free-trial churn** | never bought, burned free minutes, ≥20 messages | 519 | top 40 | Engaged deeply for free and still didn't convert. What does the 3-min taste fail to establish? |
| **X — complaint-flagged** | said refund / scam / unhelpful / "too many questions" / AI-doubt, any cohort | ~200 | 40 most recent | Users who told us the problem in their own words |
| **D — contrast** | 3+ purchases | 189 | top 8 | What a *working* relationship reads like — the control group |

Ranking inside cohorts: complaint-flagged first, then message count (substance), then
recency. Caps are tunable: `npx tsx scripts/churn-transcript-export.ts --caps C,B,A,X,D`.

## Reading rubric

For each transcript, note (tie observations back to backlog item numbers):

1. **Give/ask ratio** — did the persona deliver insight, or interrogate? (items 02, 03, 10)
2. **Stated need** — did the user say what they wanted? Was it honored? (item 04)
3. **Last-turn autopsy** — what happened in the final 3–5 exchanges before they left?
   Unanswered question, deflection, out-of-credits wall, pitch fatigue? (items 01, 06)
4. **Credibility events** — moments the persona overclaimed then retreated, or
   contradicted itself / prior sessions (items 05, 08)
5. **Emotional register** — grounding vs. escalation at vulnerable moments (item 07)
6. **Mechanical breaks** — replayed messages, duplicate timestamps, session weirdness (item 09)
7. **For cohort D** — what did the persona do differently that earned the rebuy?
   Mine it for the positive spec, not just the failures.

Output of a reading pass: a tally of which gaps appeared in how many transcripts +
verbatim quotes (anonymized) per gap → update the backlog priorities with frequencies.

## Hygiene

- Transcripts and `shortlist.csv` contain names, emails, and intimate personal detail.
  They stay in the gitignored folder, never in commits, docs, or pasted excerpts with
  identifying detail. Quote by cohort + rough theme only.
- Exporter is read-only against the DB and safe to re-run any time (rebuilds the folder).
