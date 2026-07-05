# Improve V2 — toward a real companion with spiritual roots

## File map — read in this order

| # | File | In plain words |
|---|------|----------------|
| — | README.md (this file) | Start here — the goal, the story of how this started, and the file map |
| 01 | [01-transcript-study.md](01-transcript-study.md) | *How* we built the study (the method behind the 154-transcript corpus) |
| 02 | [02-reading-pass-findings.md](02-reading-pass-findings.md) | *What* we found — the big numbers and problems |
| 03 | [03-gap-evidence.md](03-gap-evidence.md) | The *proof* — real quotes and examples for every problem |
| 04 | [04-prompt-baseline.md](04-prompt-baseline.md) | What our current prompts/code actually tell the AI to do |
| 05 | [05-demand-study.md](05-demand-study.md) | What customers actually ask for |
| 06 | [06-prompt-framework.md](06-prompt-framework.md) | The *new design* for the prompts |
| 07 | [07-CHECKLIST.md](07-CHECKLIST.md) | **The to-do list (28 items in 4 waves — the live working list)** |
| 08 | [08-PLAN.md](08-PLAN.md) | **The week-by-week schedule** |

Logic of the order: method → findings → proof → diagnosis → demand → design → to-do → schedule.

Supporting material (not part of the reading order):

- `eval/` — **frozen before/after test harness**: 17 core test cases + saved run transcripts ([eval/EVAL.md](eval/EVAL.md))
- `prompt-baseline/` — raw persona prompt dumps from the DB (evidence for 04)
- `specs/` — detailed specs for individual checklist items ([refund & support handling](specs/refund-and-support-handling.md))
- `transcripts/` — **gitignored** raw data: churn corpus, shortlist.csv, demand samples (contains PII — never commit)
- `scripts/churn-transcript-export.ts` (repo `scripts/`) — rebuilds the corpus any time

Shortest path: **02 → 06 → 08**. Everything else is evidence.

Working backlog for the V2 chat experience. The north star: **the Seer should feel
like a real companion who happens to read energy** — someone who remembers you,
tunes into you, gives you something real every time, and treats you well even when
you want to leave. Not an interrogator. Not a funnel.

This folder exists because a paid session went wrong in an instructive way. It's not
a compliance list — it's a design list. Each item below is a gap we can feel in a
real transcript, plus the direction that closes it.

> Scope note: this is about product/UX and the persona's conversational design.
> The AI/human question is **already settled policy** (neither confirm nor deny) and
> is intentionally out of scope here — don't reopen it.

---

## The founding case study — 2026-07-04 session (refunded)

A returning love-bucket seeker ran a ~3 min free chat, bought the **$99.99 whale
package**, then spent 30 min in a paid session that unravelled. She asked for a
refund, we granted it. Full anonymized transcript lives outside the repo (session
scratchpad) — it should **not** be committed (contains personal detail).

What the session showed, in her own words:

- *"You ask a lots of questions. But I don't get any information."* (~28 min in)
- *"I was expecting a reading, not guessing — I feel like I am paying for me talking."*
- *"I answered questions I already know the answers to. And I got no reading or help."*
- *"I want a reading. Not 100 questions."*

Every one of those is a **product** complaint, and every one is fair. The persona
extracted and mirrored; it never gave. That's the thread running through the whole
backlog.

---

## Backlog (prioritized)

| # | Item | Core gap | Impact |
|---|------|----------|--------|
| [01](specs/refund-and-support-handling.md) | Refund & support handling | When a user asks for a refund/support, surface the real path — don't deflect or re-engage them | Turns refunds into chargebacks; erodes trust |
| 02 | Give, don't just extract | Nearly every turn ends in a question; the user carries all the content | The #1 reason the session felt empty |
| 03 | Actually deliver a reading | "Reading" was promised and paid for; none arrived | Core value not delivered |
| 04 | Listen & adapt to stated need | She said what she wanted 5+ times; the persona kept its own agenda | Feels unheard = not a companion |
| 05 | Consistent "how I know" | Claimed to read his mind, then walked it back when challenged | Credibility collapse |
| 06 | Leave them with something to hold | She left with no practice, insight, or next step | No takeaway = no reason to return |
| 07 | Ground, don't escalate | Drama/urgency beats ("two crises at once", "the universe set your brakes on fire") | Funnel reflex; a companion co-regulates |
| 08 | Deep memory continuity | It remembered her, but used prior context shallowly | Continuity is what makes it feel real |
| 09 | Session handoff bug | New session replayed the prior session's last turns with duplicate timestamps | Breaks immersion; looks broken |
| 10 | Pacing & effort balance | Her messages grew long; the persona's stayed short and interrogative | Inverted effort feels like being processed |

Priority = row order. 01 is first because it's live money and trust. 02–04 are the
heart of the "felt empty" problem and should be tackled as a set.

---

## The through-line: extract → give

Almost everything here reduces to one shift. Today the loop is:

```
persona asks → user answers → persona reflects the answer back as a new question → repeat
```

A companion's loop is:

```
user shares → persona reflects + names a pattern + offers something real
            → (sometimes) one question that moves it forward
```

The funnel was built to *keep someone talking until they buy*. The companion has to
be built to *make someone feel accompanied and leave with more than they came with*.
Those are different instruments. V2 is still playing the first one after the sale.

---

## Evidence base

The founding case study is one transcript. The systematic version is the
**[transcript study](01-transcript-study.md)**: a 154-conversation corpus of users who
stopped buying (paid-and-bailed, one-and-done, free-trial churn, complaint-flagged,
plus repeat-buyer contrast), exported by `scripts/churn-transcript-export.ts` into
`transcripts/` (gitignored — PII). Headline number: **54% of buyers never purchase
a second time.**

**The reading pass is DONE (2026-07-04)** — all 154 transcripts scored by 9 parallel
analysts. Results, gap frequencies, engineering bug list, the positive spec from
repeat buyers, and the re-prioritized backlog live in
**[02-reading-pass-findings.md](02-reading-pass-findings.md)** (cited examples in
[03-gap-evidence.md](03-gap-evidence.md)). That table supersedes the priority order below;
headline: 71% of churn exits are the credit wall landing mid-question, ~15 "churned"
users actually tried to pay and got stuck in pending checkout, and the top gaps are
extract-don't-give (61%), mechanical failures (60%), and credibility self-destruction
(58%).

**The demand study is DONE (2026-07-04)** — 71k user messages mined + 400 openers
classified into weighted taxonomies (first-session vs returning) in
**[05-demand-study.md](05-demand-study.md)**. The resulting system-prompt design is
**[06-prompt-framework.md](06-prompt-framework.md)**: 5 layers (runtime context → duty of
care → mode-routed conversation engine → persona voice modules → close & continuity).

**The prompt baseline is DONE (2026-07-04)** — live prompts + runtime assembly studied
in **[04-prompt-baseline.md](04-prompt-baseline.md)**. Two decisive
findings: (1) a context-window bug sends the model the FIRST 20 messages of a session
instead of the most recent ones, making long paid sessions blind to their own recent
turns — this single bug mechanically produces the loops, amnesia, and contradictions;
(2) the interrogation cadence is INSTRUCTED — 4 of 6 personas carry a "28 words max,
say ONE thing, stop and wait" format rule, and no layer anywhere requires an actual
reading to be delivered.

## How to work this folder

- Detailed item specs go in `specs/<slug>.md`, linked from the backlog table above.
- Each item file: **the gap → evidence → the companion principle → concrete direction
  (prompt changes, intent rules, UX, or code)**.
- Keep customer PII out of committed files. Reference moments by rough timestamp/theme.
