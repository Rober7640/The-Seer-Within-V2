---
name: fb-ad-question-mining
description: "Use when mining The Seer Within's v1 `conversations` for VOC-grounded FB ad questions. Two jobs. (1) BUILD/REFRESH the 6-sub-group headline roadmap in docs/fb-ad-question-testing-roadmap.md. (2) DEEPEN a winning theme into sub-buckets — which landers already serve a theme, which proposed sub-buckets NO lander asks about, and how big each is. Use when asked to: mine or refresh FB ad questions, deepen/double down on a theme, get more questions under one theme, see which landers serve a theme, find what we are not asking about, size or validate a sub-bucket, re-run the VOC exercise. Reads real buyer `concern` quotes (never n-gram frequency), ranks by revenue per 1,000 and by ad-independent prevalence — never raw counts, which reflect Meta's past delivery choices. Flags Meta-policy and sensitive themes (bereavement, health/disability) before writing."
---

# fb-ad-question-mining — VOC-grounded FB ad headline mining

## What this is (and isn't)

This skill rebuilds or refreshes `docs/fb-ad-question-testing-roadmap.md` — a living
roadmap of FB ad headline candidates for the v1 funnels, organized into 6 fixed
sub-groups. It is **not** a general copywriting tool: every headline it proposes must
trace back to something a real buyer actually wrote in `conversations.concern`, not an
invented phrase. The taxonomy below (which bucket/sub_bucket/regex maps to which
sub-group) is fixed configuration, established once by reading thousands of real
concerns — do not rederive it from scratch on a re-run.

Full derivation history + the reasoning behind the taxonomy: memory
`fb-ad-question-conversion-ladder`. Method-correction history: memory
`feedback-voc-first-headline-method`. Known cross-cutting finding: memory
`fb-ad-bereavement-crosscut`.

## How to invoke this

**Say it in plain language** — the description triggers on all of these:

| You say | Mode it picks | What runs |
|---|---|---|
| *"deepen commitment"* · *"more questions under X"* | **Deepen a theme** | 2e → 2d → 2b → 3 → 4 → 5 |
| *"which landers serve commitment?"* | **Deepen a theme** | 2e alone answers it |
| *"what are we not asking about?"* | **Deepen a theme** | 2e (coverage gap) |
| *"size these sub-buckets"* · *"is X worth building?"* | **Deepen a theme** | 2e + 2d |
| *"refresh the roadmap"* · *"re-mine sub-group N"* | **Refresh** | 2 → 2b → 3 → 4 → 5 → 6 → 7 |
| *"rebuild the roadmap from scratch"* | **Full rebuild** | all 6 sub-groups, same chain |

### Standalone commands (skip the skill, run the script)

```bash
# Which landers serve a theme + which proposed sub-buckets nothing asks about.
# No DB, no flags, instant.
node .claude/skills/fb-ad-question-mining/scripts/coverage-gap.mjs \
  --theme commitment --subs .claude/skills/fb-ad-question-mining/examples/commitment-subs.json

# How big and how valuable each sub-bucket is. Needs BOTH keys; run from repo root.
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-question-mining/scripts/size-subbuckets.mjs \
  --live --theme commitment \
  --subs .claude/skills/fb-ad-question-mining/examples/commitment-subs.json
```

`--theme` takes `commitment | trust | reunion | loneliness`, or any raw regex, and means
the same thing in every script. Sub-buckets are a JSON file — `{"NAME": "regex", ...}` —
so a run is reproducible and reviewable. Copy `examples/commitment-subs.json` and edit.

### Bring your own sub-buckets

The Deepen mode asks whether you already have candidates. **You usually should.** Operator
intuition has beaten every automated attempt here: given a corpus where `YEARS` and `RANK`
were already known strong, the discovery script (Step 2c) ranked RANK **119th of 123** and
scattered YEARS across 48–110. Propose them yourself; use the scripts to size and gap-check.

## Step 1 — Ask which mode (REQUIRED — do this first)

Ask the operator (AskUserQuestion) which mode this run is:
- **Full rebuild** — run all 6 sub-groups from scratch. Only needed if
  `docs/fb-ad-question-testing-roadmap.md` doesn't exist yet or a ground-up redo was
  explicitly requested.
- **Refresh** — re-pull one or more sub-groups with new data since the last run, diff
  against what's already in the doc, and **append what's changed rather than overwrite**
  (the existing doc has Wave 1-4 checkbox progress and launched-headline status that must
  survive a refresh). This is the expected mode for a periodic re-run. Offer the 6
  sub-group names, allow picking one, several, or all.
- **Deepen a theme** — the operator has a WINNING theme and wants more ad questions
  inside it (sub-buckets), not a new sub-group. Triggers: *"deepen commitment"*, *"more
  questions under X"*, *"which landers serve X"*, *"what are we not asking"*, *"find
  sub-buckets"*. This mode SKIPS the 6-sub-group configuration entirely and runs:
  **Step 2e → 2d → 2b → Step 3 → 4 → 5**. Ask which theme, and whether they already have
  candidate sub-buckets (they usually do — operator intuition has outperformed every
  automated attempt at proposing them; see Step 2c).

## The 6 sub-groups — fixed configuration, don't rediscover

Each sub-group's SQL filter excludes content already claimed by another sub-group and
excludes the 3 live incumbent ad questions ("Who is my soulmate?", "Have I already met
them?", "When will I meet them?" — those stay the control, never a new test).

**1. Trust/Honesty** — `bucket='love' AND sub_bucket='BETRAYAL'` OR
`bucket='someone' AND sub_bucket='TRUST_TRUTH'` (whole sub_buckets, no regex needed).

**2. Feelings/Commitment** — `love/RELATIONSHIP_TROUBLE` filtered to exclude the
cheat/trust slice already covered by Trust/Honesty, plus `someone/THEIR_FEELINGS` in
full:
```
TROUBLE_PAT = 'right (one|person|man|guy)|wrong (person|man|one)|\ysoul ?mate\y|the one|work out|make it|save (the|our|my|this)|fix (the|our|us|this|things)|survive|last|commit|propose|proposal|marry me|get married|engage|distant|pull(ing)? away|cold|not show(ing)? up|withdraw|\yspace\y|ignor|does (he|she) (really )?(love|want|care)|love me|should i (leave|stay|end|go)|leave (him|her|my (husband|wife|marriage|relationship|partner))|end (the|this|my|it|things)|walk away|break up|where (is|are) (this|we|my|the)|future (of|with|in)|going (any|some)?where|headed|long.?term'
FEELINGS_PAT = 'how (does|do) (he|she|they) (really )?feel|(his|her|their) (true )?feelings|feel about me|feelings (for|toward|about) me|love me|like me|does (he|she) (love|like)|into me|still (have )?feel|still (love|care|want)|serious|interested|\yintentions?\y|think(ing)? (about|of) me|miss(es)? me|on (his|her) mind|meant (to be|for)|the one|\ysoul ?mate\y|twin flame|future|where (is|are) (this|we)|going|end up'
```

**3. Reunion/Return** — `love/LOST_LOVE` + `someone/REUNION`, reunion-flavored half only
(excludes the self-facing half that belongs to Healing/Moving-on):
```
LOST_LOVE_PAT = 'come back|comes? back|coming back|\yreturn|get (him|her) back|back together|reconcile|reunite|reunion|work things out|fix (it|us|things)|still (love|think|care|miss|have feelings|want)|do(es)? (he|she) still|ghost|disappear|stopped (talking|communicating|responding|texting)|cut (me )?off|left|was it real|what (went|did) (wrong|happen)|why did (he|she|it|we)'
REUNION_PAT = 'back together|get (him|her|us)? ?back|reconcile|reunite|come back|comes? back|coming back|\yreturn|want(s)? me back|miss(es)? me|regret|chance|hope (for|of)? ?(us|reconcil)|still possible|any (hope|chance)|when (will|are|do|can)|still (love|think|care|have feelings|want)'
```

**4. Healing/Moving-on** — `love/LOST_LOVE` + `someone/REUNION`, self-facing half only:
```
LOST_LOVE_HEALING_PAT = 'move on|let (go|him go|her go|them go)|get over|miss (him|her|them)|think(ing)? about (him|her|them)|can.?t stop|on my mind|closure|move forward|heal'
REUNION_HEALING_PAT = 'wait for|hold on|hold out|move on|let go|give up'
```

**5. Soulmate/Destiny** — `love/SEEKING_LOVE` (soulmate pattern, includes the live
incumbents) + `love/LOST_LOVE` (soulmate/the-one, non-incumbent):
```
SEEKING_PAT = '\ysoul ?mate\y'
LOST_PAT = '\ysoul ?mate\y|the one'
```
Note: 2 of this sub-group's 3 named questions ARE the live incumbents. Expect
structurally less new territory than the other 5 — don't force a full set if the VOC
doesn't support it.

**6. Loneliness/Timing** — `love/SEEKING_LOVE`, excluding soulmate content (claimed by
#5) and the live incumbent patterns:
```
PAT = '\yalone\y|lonel|find (true |real )?love|find someone|meet someone|find a (good )?(man|partner|guy)|meet the right|tired|given up|giving up|searching|been (so|too) long|love again|find love again|too old|my age|will i ever'
EXCLUDE = 'when will i|when am i|how long (until|till|before)|how soon|have i (already )?met|already met'
```

## Step 2 — Pull VOC per sub-group

Write a throwaway `.cjs` script into the session scratchpad (never commit it), reusing
this connection pattern (copied from `fb-palm/ledger/mine-questions.cjs`):
```js
const fs = require('fs'), path = require('path'), pg = require('pg');
const repoRoot = '<absolute repo path>';
let url = fs.readFileSync(path.join(repoRoot, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim();
if (url[0] === '"' || url[0] === "'") url = url.slice(1, -1);
const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 15000 });
```
Run it with `NODE_PATH="<repo>/node_modules" node <scratchpad-script>` — the script
lives outside the repo, so `require('pg')` fails without the explicit `NODE_PATH` (this
bit once, don't relearn it).

Query: `select concern from conversations where <bucket/sub_bucket/regex filter above>
and purchased=true and concern is not null and length(trim(concern))>8 order by
random() limit 100`. If a finding feels thin or you're about to bet a wave of ad spend
on it, redraw at `limit 200` and confirm the tally holds before trusting it (it did,
both times this was checked — but verify again, don't assume it always will).

## Step 2b — Pull the economics, not just the buy-rate (REQUIRED before ranking anything)

> Revenue per 1,000 answers *value density*. For *addressable size* — and to avoid ranking
> Meta's delivery choices — pair it with **Step 2d**. Never rank on raw counts.

Buy-rate alone will rank sub-groups wrong. It ignores order value and upsell take, and
upsell take is where sub-groups actually separate. Proven on the money bucket 2026-08-13
(`docs/v1-money-bucket-voc.md`): grief and the invisible block bought at effectively the
same rate (29.4% vs 29.7%) but differed by $470 per thousand conversations; the partner
theme bought *above* average (25.8%) and then collapsed at the upsell (8.4% vs 14.1%),
landing it below average on revenue.

**The metric to rank on is revenue per 1,000 conversations** — buy-rate × order value ×
upsell take in one number, and directly comparable to ad spend.

Pull per-conversation revenue (all amounts are **cents**):
```sql
select id, coalesce(main_purchase_amount,0) main, coalesce(bump_amount_cents,0) bump,
       coalesce(upsell_purchased,false) u1, coalesce(upsell_amount,0) u1amt,
       coalesce(upsell2_purchased,false) u2, coalesce(upsell2_amount,0) u2amt
from conversations where bucket='<bucket>' and purchased
```
Revenue per conversation = `main + bump + (u1 ? u1amt : 0) + (u2 ? u2amt : 0)`. Then per
sub-group report: conversations, buy-rate, upsell-1 take, revenue per buyer, and revenue
per 1,000 conversations. **Pull non-buyers too** — Step 2's VOC query filters
`purchased=true`, which is right for reading quotes and wrong for every rate here, since
the denominator is all conversations.

**Three checks that changed the recommendation last time — run all three:**

1. **Theme alone vs theme + a second frame.** Split each sub-group into rows carrying
   only that theme vs rows carrying it plus another. Bare debt (no second theme) returned
   $7,544 per thousand — the worst segment in the bucket. The same debt paired with the
   invisible block returned $13,485. If a sub-group's bare segment underperforms, the
   headline must carry a second element, and that is the finding, not the theme itself.
2. **Concern length.** Bucket the stated concern by character count against revenue. On
   the money bucket this beat every theme as a predictor: 200+ chars returned $16,619 per
   thousand, under 50 chars $7,412 — 2.2×. If it holds again, it outranks targeting work.
3. **Poverty is not the variable.** Don't infer "broke audience won't pay" from a low
   buy-rate. Acutely broke people (no food, empty account) bought *above* the bucket
   average and simply didn't take the $47 upsell (6.3% vs 14.1%). That makes them a
   one-purchase audience to price for, not an audience to exclude.

Report these numbers in the doc alongside the VOC. Rank the summary table by revenue per
1,000 conversations, not by buy-rate.

## Step 2c — Surface unusual verbatims inside a theme (optional, WEAK — read the caveat)

⚠ **This FAILED its held-out test. Do not rely on it to discover sub-buckets.**
Given a corpus where `YEARS` and `RANK` were already known to be strong, it ranked RANK
**119th of 123** and scattered YEARS across ranks 48–110. Reading its top 20 would have
missed both. Two causes, both structural:

- **Lift-ranking buries big sub-buckets.** A 260-concern concept averages toward the base
  by construction; a 12-concern phrase can post +585%. It is biased against exactly the
  sub-buckets large enough to build on.
- **The unit is wrong.** A sub-bucket is a CONCEPT said many ways ("his kids", "his ex",
  "not a priority"). This scores individual PHRASES, so the concept fragments across
  dozens of low-n phrases that each fail the floor. No phrase carries RANK, so RANK never
  appears. Fixing it needs phrase→concept clustering before scoring; that is not built.

Its remaining use is narrow: it surfaces vivid verbatims a human might not otherwise
read. On the first run that did produce one real find nobody had proposed — a
leave-decision bucket ("Do I stay in a 27 year marriage or leave"). Treat it as a reading
aid, never as a ranking. **Propose sub-buckets yourself and size them with Step 2d.**

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-question-mining/scripts/discover-subbuckets.mjs \
  --live --theme commitment          # or trust | reunion | loneliness | any raw regex
```

**It is a candidate generator, not a ranker. It does not replace Step 3 — it shortens
the reading list.** Read the verbatims it prints; ignore the lift percentages.

🔴 **This is NOT the n-gram frequency mining Step 3 forbids.** They rank on opposite
things and surface opposite language:

| | ranks by | surfaces | targets |
|---|---|---|---|
| frequency (forbidden) | how OFTEN a phrase appears | "does he love me" | nobody — every woman could say it |
| lift (this script) | how much MORE her cohort is worth, length-controlled | "his children come before me" | one woman: 40s, blended family |

**A specific situation is rare BECAUSE it is specific.** Frequency actively suppresses
exactly what you're hunting.

**Known limits — do not paper over these:**
- **~40% of the top rows are function-word noise** ("and live", "neither of", "life
  that"). The read is irreducible. A tighter filter was tried and it removed the good
  finds too.
- **The percentages are a sorting heuristic, not a measurement.** Candidates run n=12–25
  with 4–7 buyers. A "+585% lift" means "read this one first", nothing more.
- **Raising min-n to make it statistically comfortable defeats it.** At `--min-n 40` the
  list filled with "i wonder" and "trying to", and buried `should i stay` — a real
  sub-bucket. Confidence is not this step's job; the lander test is.
- **Concern text is not click behaviour.** This tells you which *women* are valuable, not
  which *ad* they would have clicked. Only a lander test closes that gap.

**Always run Step 5 on the output.** The strongest finds skew toward health, disability
and bereavement, which are Meta personal-attributes territory. First live run surfaced
two such sub-buckets in its top five.

## Step 2d — SIZE a proposed sub-bucket without letting Meta's ad choices decide

```bash
# Scoped to ONE theme — sub-bucket share of the theme you are deepening
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-question-mining/scripts/size-subbuckets.mjs \
  --live --theme commitment \
  --subs .claude/skills/fb-ad-question-mining/examples/commitment-subs.json

# Unscoped — share of ALL love/someone traffic, i.e. total addressable pool
LIVE_AUDIT_CONFIRM=1 node .../size-subbuckets.mjs --live --subs ./subs.json
```

`--theme` takes `commitment | trust | reunion | loneliness`, or any raw regex. The named
themes are shared with Step 2c so a theme means the same thing in both.

🔴 **The denominator is a decision, not a detail.** The same sub-bucket reads ~2× higher
scoped to its theme (YEARS: 19.2% within commitment, 11.7% across all love/someone).
Neither is wrong — theme-scoped answers *"how much of this theme is this sub-bucket?"*,
unscoped answers *"how many women exist in total?"*. **Always state which you ran.**

🔴 **Never rank build order by raw `n`.** The corpus contains whoever the ads we happened
to run brought in, and META chose that mix. A count is part demand, part delivery
decision, and the two cannot be separated afterwards. Ranking by n ranks Meta's past ad
choices.

**Step 2b's revenue per 1,000 is NOT affected by this** — it is already a rate, so 10× the
traffic leaves it unchanged. It stays required. But it measures value DENSITY, and a build
decision also needs addressable SIZE. That is what this step adds, without using n:

| Measure | What it is | Why it is ad-independent |
|---|---|---|
| **Prevalence** | share of women volunteering the frame, computed *within each source hook's own traffic* | a property of the audience, not of how much traffic that hook got |
| **Flatness** | how much prevalence varies across source hooks | flat ⇒ no current ad targets it and she says it anyway ⇒ **untapped** |
| **Rev/buyer** | value once she buys | measured inside her own cohort |

**Rank on prevalence first, rev/buyer as tiebreaker.** On the commitment run, rev/buyer
came out $59–$71 across all five sub-buckets — nearly constant — so prevalence did
essentially all the discriminating.

**Limit:** "flat" means no *current* ad targets it, and the hooks compared are only those
running. It cannot see demand no question has ever touched. Running the ad is what makes
prevalence spike — that is the point of running it.

## Step 2e — COVERAGE GAP: does any lander already ask this? (no DB needed)

```bash
node .claude/skills/fb-ad-question-mining/scripts/coverage-gap.mjs \
  --theme commitment --subs ./subs.json
```

Cross-references proposed sub-buckets against **every** question in
`client/src/content/tarotReads.ts` (57 today) and prints which are already served, which
are unserved, plus the landers currently covering `--theme`.

🔴 **Run this BEFORE Step 2d, and trust it over flatness.** Step 2d's flatness signal
*infers* "nothing targets this" from ~15 days of exposure data across four live hooks.
This reads the actual roster from source: complete, no attribution needed, cannot go stale.
Flatness is corroboration; this is the finding.

It also prints the **nearest existing questions by shared vocabulary**, because a
sub-bucket regex is tuned for her prose and can miss short ad copy. Check those by eye
before calling a gap real — on the commitment run they confirmed all five (the nearest to
SHADOW was "why do I still think about someone who hurt me", which is HER past, not HIS ex).

## Step 3 — Read the quotes, don't lead with stats

Read all ~100 quotes directly. Tally recurring themes by hand (rough counts are fine).
**Do not** default to writing an n-gram frequency/momentum mining script as the primary
method — that was tried once and corrected (memory `feedback-voc-first-headline-method`).
Stats are acceptable as a secondary confidence check on a theme you've already found by
reading, never as the thing that surfaces the theme in the first place.

## Step 4 — Cluster into 3-variant groups

For each main recurring concern (typically 3-5 clusters per sub-group), write exactly 3
phrasing variants:
- **Direct** — closest to the literal recurring VOC phrasing
- **Intensified-or-plea** — an emotionally heightened version of the same ask
- **Tension-framed** — an either/or framing, usually built from a recurring "or" pattern
  in the VOC itself (e.g. "is it over, or is there a chance")

Tag each headline's confidence based on how literally it traces to VOC, not how good it
sounds:
- **HIGH** — near-verbatim or matches a phrase that recurred many times
- **MED-HIGH / MED** — recognizable synthesis of 2+ related quotes
- **LOWER** — constructed for phrasing spread, not directly VOC-sourced — say so

## Step 5 — Compliance + cross-cutting flags

- Re-check any headline touching infidelity/scam/health language against the *current*
  Meta ad policy (`transparency.meta.com/policies/ad-standards/...` — fetch it live,
  policy text can change between runs, don't rely on a memory of last time's check).
- Check every new pull against the known cross-cutting themes before assuming they don't
  apply: **bereavement** (an actual dead spouse, not a breakup — confirmed in 3 of 6
  sub-groups already, ~10-15% of pulls) and **disability/health** language tied to
  loneliness (don't build a headline around it — personal-attributes policy risk).
  Flag any headline that could pull in either audience separately, don't fold it into
  the main set by default.
- Watch for new cross-cutting patterns the way "soulmate/twin-flame crossover" and the
  bereavement theme were found — if the same phrase keeps surfacing across sub-groups
  that shouldn't obviously share it, that's worth calling out explicitly, not treating as
  sub-group-specific noise.

## Step 6 — Dedup across sub-groups

Before finalizing a sub-group's set, check its headlines against every other sub-group
already in the doc. A near-identical headline (e.g. "is he really my soulmate?"
surfacing in both Feelings/Commitment and Soulmate/Destiny) should only be kept once —
running the same ad under two sub-group labels isn't a real second test.

## Step 7 — Write to the doc

**Full rebuild:** write the doc in this order — Summary (with the sub-group table **ranked
by revenue per 1,000 conversations** per Step 2b, carrying conversations, buy-rate,
upsell-1 take, revenue per buyer and revenue per 1,000; plus total headline count, and any
cross-cutting flags) → Wave 1 axis-discovery
checklist → the 6 sub-group sections in the order they were run → Wave 2-4 → full
candidate-pool appendix → open questions. Match the existing doc's format exactly (main
concern header, 3 bulleted variants with confidence tags, headline count, compliance
note) so future refreshes can diff cleanly.

**Refresh:** for each re-mined sub-group, add a dated subsection ("Refresh — YYYY-MM-DD")
directly under its existing section rather than replacing it. Call out explicitly: what's
new (a theme/phrase that wasn't there before), what's confirmed stable (the tally still
holds), and what's faded (a previously-dominant phrase that's now rare). Leave the
original headline set and any Wave 1-4 checkbox state untouched — the operator decides
whether to promote a new finding into the active test set.

## After the run

Save any new durable finding to memory the same way the original build did (see
`fb-ad-bereavement-crosscut` for the template: what was found, why it matters, how to
apply it going forward) — a cross-cutting pattern or a compliance-policy change is worth
carrying into the next session, not just this doc.
