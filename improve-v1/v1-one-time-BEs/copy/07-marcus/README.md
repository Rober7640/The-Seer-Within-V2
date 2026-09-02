# 07 Marcus Daily Tarot — copy

**Read this first.** The deck's seventh offer and its **first recurring one** — 02–06 are one-off
event letters, 07 is a daily email programme. Everything here serves one mechanic.

> ⭐ **The email lays the opening of a spread. Her question turns the rest over.**

| Want to… | Go to |
|---|---|
| Understand the whole offer | [`spec`](../../../docs/superpowers/specs/2026-09-02-marcus-daily-tarot-design.md) — funnel, list, warm-up ramp, n8n, risks |
| Write a daily email | **This file**, then [`07-P1`](./07-P1-the-seven-spreads.md), then the day's slot below |
| See the spreads at a glance | [`07-P1-preview.html`](./07-P1-preview.html) · [published](https://claude.ai/code/artifact/e9cf4176-0069-48b3-bb3f-d19bef380310) |
| Check a draft | `node scripts/copy-check.cjs copy/07-marcus` |

## State

| Asset | State |
|---|---|
| [`07-P1`](./07-P1-the-seven-spreads.md) the seven spreads | ✅ written — **every position is a contract** |
| [`daily/07-D-tue-two-doors`](./daily/07-D-tue-two-doors.md) | ✅ **the conformant worked example.** Copy its shape |
| [`daily/07-D7-hard-sunday`](./daily/07-D7-hard-sunday.md) | ⚠ pre-roster. Voice/recap/precedent/P.S. good, cards need relaying to houses |
| Mon · Wed · Thu · Fri · Sat dailies | ☐ not started |
| Booking page · bump · thank-you · confirmation · delivery | ☐ not started |
| `docs/07-marcus/0-WORKFLOW-07.md` | ☐ not copied from the master yet |

## The rules a daily email must not break

1. **Read only your own face-up positions.** The paid ones are not yours to describe. `07-P1` says
   which are which, per day.
2. **Every email pitches.** No exceptions, no give-day. She reads Tuesday, not the week — at ~25%
   opens most people never see Sunday, so a product named only on Sunday is one most of the list
   never hears about.
3. **The pitch is written out of that day's cards.** ⛔ Never boilerplate. Constant: how many are
   down, how many aren't, and that the rest need her question. Everything else is fresh.
4. ⛔ **No price, no delivery promise, ever.** 02's letter carries neither — they live on the
   booking page, statements 5 and 6. `copy-check` now enforces this on any `-D-` file.
5. ⛔ **The first CTA comes after the WHOLE free read**, not after the first card. `00e` beat 11.
6. **Written to [`02-E2`](../02/02-E2-esl-v1.md), not to the framework.** Face-down hero · a
   withhold on *each* card naming what it can't say and the count that resolves it · a stated big
   idea · a precedent · flat claims · CTAs as sentences with permission verbs.
4. **The ask is card-specific.** *"What would you put to the Devil?"* — never *"what's your
   question?"*
5. **She reads at 6am ET** (6pm SGT send). Narrating a night-time read is a 12-hour miss.
   Card art described as painted, and quoted speech, are exempt.
6. **Strip-the-CTA test.** Remove the invitation — is it still worth having read? On a daily to
   76k this is the bar that keeps the list alive.
7. **Picture before meaning.** Say what is *on* the card, then what it means. She is looking at it.
8. **Marcus's voice.** First person, direct, archetypal, plain-spoken. Contractions. No "dear" —
   that is Evelyn's. No aphorisms, no balanced clauses, no appositive tails.
9. **CTA button is constant** (*"Send Marcus your question"*); the line above it is not.
10. **Link carries `&s=<spread>`.** ⛔ Never derive the spread from the clock — she may click
    Tuesday 11pm ET, which is Wednesday in SGT.

## Settled — do not re-open

- **Sunday reuses BE-02's Zodiac Spread, by name.** Audiences don't overlap. ⚠ The spread is shared,
  **the sentences are not** — 02's house assignments are a contract with 02's letters.
- **The bump is an expansion**, ~1,000 → ~3,000 words, $12.77. Differs by **scope, not withholding**:
  the long one reads what the same draw touched that she didn't think to ask. ⛔ Never "full",
  "complete" or "unabridged" — nothing may make $35 sound partial.
- **No upsells. No chat handoff.** `/marcus` is not linked from the daily or the report.
- **Floor of 6** on any paid spread, because the price is flat.
- **n8n regenerates once on a failed grade, then sends anyway.** Operator's call, with the grader
  log as the mitigation.

## Before anything sends

⛔ **One blocker, invisible when reading the HTML: the from-name and from-address** are set on
AWeber list `6960130`, not in any file. Both prior sends to these people went out as **Evelyn**.

✅ *Not* a blocker: `aweber.com/z/r/?ThisIsATestEmail` is AWeber's own placeholder, rewritten per
subscriber at send — Evelyn's live sends carry the identical markup. Don't "fix" it.

And the list is **dormant, not warm** — two sends ever, ~87 days ago, ~41k of the 76,718 never
mailed at all. Spec §9 has the four-phase ramp and the complaint stop rule. It shares a sending
domain with Evelyn's live thirteen-list programme.
