---
name: fb-ad-question-mining
description: "Use when mining The Seer Within's v1 `conversations` for VOC-grounded FB ad questions. Two jobs. (1) BUILD/REFRESH the 6-sub-group headline roadmap in docs/fb-ad-question-testing-roadmap.md. (2) DEEPEN a winning theme out through the cascade — audience segment, injury, question, lander format. Use when asked to: mine or refresh FB ad questions, deepen/double down on a theme, get more questions under one theme, see which landers serve a theme, find what we are not asking about, size or validate a sub-bucket, work out the build order or what to build next, pick a lander format/version, re-run the VOC exercise. Reads real buyer `concern` quotes (never n-gram frequency), ranks by revenue per 1,000 and ad-independent prevalence — never raw counts, which reflect Meta's past delivery choices. Outputs a stack order with a ceiling per segment, not a pass/fail list. Flags Meta-policy and sensitive themes (bereavement, health/disability) before writing."
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

## The cascade — the four levels every run must produce

One audience segment holds dozens of different ads. The fan-out is a cascade:
**segment → injury → question → format.** Four injuries × four questions × four formats
is 64 ads from one segment. Almost every account has far more creative territory than
creative actually running, and this skill's job is to name that territory — not to find
one good line.

| Media-buyer word → **ours** | What it is here | Where it comes from | Commitment run, 2026-08-15 |
|---|---|---|---|
| *(above the cascade)* **theme** | the pool being mined. The market, not a level | Step 1 · the 6 sub-groups | `commitment` — 9,875 conversations, $5,824 per 1,000 |
| persona → **segment** | a **sub-bucket**: one specific situation she is in | Steps 2d / 2e / 2f — a regex over `conversations.concern` | ROOMMATES · UNAVAILABLE |
| angle → **injury** | what that situation *did to her* — the thing she has no event for | **Step 3b** (derive) · Step 7 move 1 (write) | the un-event · erased · the clock · no permission |
| concept → **question** | the ad headline. One of the four attacks | Step 4 · Step 7, move 4 | WHY · HOW-LONG · BINARY · RIVAL |
| format → **format** | how the ad hands her to the reading | **Step 4b** | *nothing — the run never named one* |

Use the right-hand words. "Persona" and "angle" both already mean something else in this
repo — see the next section before writing either of them down.

**The 2026-08 commitment run named 14 ads and stopped. It should have named hundreds.**
Two levels were missing, and each one multiplies:

- **No injury derivation.** ROOMMATES shipped with **one** injury. Re-reading the same
  quotes for wounds rather than topic produced **four** — the un-event, erased, the clock,
  no permission. That alone is 4× the territory. **Step 3b** is that level.
- **No format level at all.** Three tarot formats already render from one registry entry,
  free, by changing the URL. That is another 3×. **Step 4b** is that level.

Corrected arithmetic for **one** segment: ROOMMATES = 4 injuries × 4 questions × 3 tarot
formats = **48 buildable ads**, from 16 registry entries. UNAVAILABLE carried three
injuries (not chosen / sunk years / rival) and was never re-derived, so treat its count as
a floor, not a finding.

🔴 **Both failures are silent.** Neither shows up as an error — the run just returns a
short list that looks complete. A deepen run that ends with fewer than ~30 cells for a
segment worth building has stopped early. Check the arithmetic before you write.

### Vocabulary — the words that collide, and which one wins

🔴 **"persona" is already taken in this repo.** Here a *persona* is an AI advisor in the
V2 chat service (Evelyn Cross, Luna Voss, Marcus Stone) — a completely different system.
The cascade's "persona" is an **audience segment**: a woman in a situation. This skill
says **segment** or **sub-bucket** and never "persona", so the two cannot blur.

🔴 **"angle" is worse — the running code uses it for the level ABOVE this one.**
`angleForHook()` in `client/src/content/tarotReads.ts` returns 19 hook FAMILIES —
`commitment`, `trust`, `reunion`, `healing`, `decode-him` — and every analytics event
carries that as `angle`. A code-level `angle` is therefore roughly a **theme**, not an
injury. The cascade's "angle" slot, and this skill's old loose "angle group", both mean
the **injury**, one level lower. Filter analytics on `angle = commitment` expecting one
injury and you get the whole theme back. **Say "injury". Say "angle" only when quoting
`angleForHook`, and say that you are.**

**hook · deck · lander** — the funnel's own words, unchanged:

| Term | What it is | Granularity |
|---|---|---|
| **hook** | the question the ad asked — the headline, and the wound the reveal mirrors | **one hook = one lander = one question from Step 4** |
| **deck** | the 3-card set she picks from — art, facing, 3 archetypes, 3 reads per hook | **one deck is SHARED by every hook on one injury** |

An injury with 3 questions is **3 landers on 1 deck**, never one lander — getting this
wrong produced a wrong build spec on the 2026-08 run. Registry:
`client/src/content/tarotReads.ts` (`TarotHook`, the per-family hook arrays, `DECKS`),
with server-side rosters in `server/routes.ts` and `server/lib/prompts.ts`. `/fb-palm` is
the parallel system — its "sign" is the deck-equivalent, its hook is the same idea. Never
mix the two.

## How to invoke this

**Say it in plain language** — the description triggers on all of these:

| You say | Mode it picks | What runs |
|---|---|---|
| *"deepen commitment"* · *"more questions under X"* | **Deepen a theme** | 2e → 2d → 2b → 2f → 2g → 3 → **3b** → 4 → 4b → 5 → 7 → 8 |
| *"verify those numbers"* · *"is X real before we spend?"* | **Verify** | 2f alone, on an already-mined theme |
| *"what do we build next?"* · *"what's the build order?"* | **Deepen a theme** | 2g on an already-mined theme |
| *"which landers serve commitment?"* | **Deepen a theme** | 2e alone answers it |
| *"what are we not asking about?"* | **Deepen a theme** | 2e (coverage gap) |
| *"size these sub-buckets"* · *"is X worth building?"* | **Deepen a theme** | 2e + 2d |
| *"refresh the roadmap"* · *"re-mine sub-group N"* | **Refresh** | 2 → 2b → 2g → 3 → 3b → 4 → 4b → 5 → 6 → 7 → 8 |
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

### Bring your own segments

Deepen mode asks whether you already have candidates. **You usually should.** Operator
intuition has beaten every automated attempt here (Step 2c has the numbers). Propose them
yourself; use the scripts to size and gap-check.

## Step 1 — Ask which mode (REQUIRED — do this first)

Ask the operator (AskUserQuestion) which mode this run is. The chains are in the invoke
table above.

- **Full rebuild** — all 6 sub-groups from scratch. Only if
  `docs/fb-ad-question-testing-roadmap.md` doesn't exist yet, or a ground-up redo was
  asked for.
- **Refresh** — re-pull one or more sub-groups with new data, diff against the doc, and
  **append what changed rather than overwrite** (the doc carries Wave 1–4 checkbox
  progress and launched-headline status that must survive). The expected periodic mode.
  Offer the 6 sub-group names; allow one, several, or all.
- **Deepen a theme** — the operator has a WINNING theme and wants more segments inside
  it, not a new sub-group. Skips the 6-sub-group configuration entirely. Ask which theme,
  and whether they already have candidate sub-buckets (they usually do — see below).

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
> Meta's delivery choices — pair it with **Step 2d**, then turn the pair into a build
> order in **Step 2g**. Never rank on raw counts.

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

Report these numbers in the doc alongside the VOC. Order the summary table by revenue per
1,000 conversations, never by buy-rate — then apply **Step 2g**, which turns that order
into a stack by reading it against each segment's size. Revenue per 1,000 says which rung
is best; it does not say how much spend a rung can hold.

## Step 2c — Surface unusual verbatims (optional, DEMOTED — reading aid only)

⚠ **This FAILED its held-out test. Never use it to rank or to discover segments.** Given
a corpus where `YEARS` and `RANK` were already known strong, it put RANK **119th of 123**
and scattered YEARS across 48–110. Two structural causes: lift-ranking buries big
segments (a 260-concern concept averages toward base; a 12-concern phrase posts +585%),
and the unit is wrong — a segment is a CONCEPT said many ways, this scores single
PHRASES, so the concept fragments below the floor. Fixing it needs phrase→concept
clustering, which is not built.

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-question-mining/scripts/discover-subbuckets.mjs \
  --live --theme commitment          # or trust | reunion | loneliness | any raw regex
```

**Read the verbatims it prints; ignore every percentage.** ~40% of top rows are
function-word noise, candidates run n=12–25, and concern text is not click behaviour. Its
one proven use: it surfaced a leave-decision bucket ("Do I stay in a 27 year marriage or
leave") nobody had proposed. Run Step 5 on anything it surfaces — its strongest finds
skew to health, disability and bereavement, which is Meta personal-attributes territory.

🔴 **This is NOT the n-gram frequency mining Step 3 forbids** — frequency ranks how OFTEN
a phrase appears and surfaces "does he love me", which targets nobody. This ranks how
much more a cohort is worth and surfaces "his children come before me", which targets one
woman. **A specific situation is rare BECAUSE it is specific**; frequency suppresses
exactly what you are hunting.

**Propose segments yourself, then size them with Step 2d.**

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

**Prevalence is this step's headline number, rev/buyer the tiebreaker.** On the commitment
run rev/buyer came out $59–$71 across all five sub-buckets — nearly constant — so
prevalence did all the discriminating here.

🔴 **Prevalence is the CEILING input, not the final ranking.** Carry it into **Step 2g**
and read it beside Step 2b's revenue per 1,000: a segment at 1% of the theme runs out of
people no matter what it earns per thousand. Neither number decides alone.

**Limit:** "flat" means no *current* ad targets it, and the hooks compared are only those
running. It cannot see demand no question has ever touched. Running the ad is what makes
prevalence spike — that is the point of running it. And prevalence is a share of **our**
traffic, never of Facebook's addressable audience: it cannot be turned into a spend cap.

**Second limit — flatness needs ≥3 well-trafficked hooks to mean anything.** The
2026-08 commitment run had only 2 hooks over the floor, and at n=46–111 the spread
column produced garbage: it labelled a genuinely unserved sub-bucket "already served"
off a 0.1% vs 0.4% difference. Check the "N with a known source ad" line and the hook
count before quoting a spread. When it's thin, say so and lean entirely on Step 2e.

🔴 **PRECISION-CHECK EVERY REGEX BEFORE YOU TRUST ITS NUMBER.** Print **12** random
matches per sub-bucket and read them (4 is too few — it missed three of the defects
below). This is not optional politeness — it has now **reversed a build recommendation
twice**. Defects, all invisible in the summary table:

| Defect | What happened | Fix |
|---|---|---|
| unanchored short word | `ring` matched *inside* "wonde**ring**", "cate**ring**", "b**ring**s" — PROPOSAL read n=3,308 @ $5,948 (a build candidate) and became n=719 @ $4,385, **below base**, once anchored to `(a\|the) ring` | anchor every ≤5-letter alternative |
| **missing `\b`, same class** | `he is married` matched inside "**s**he is married"; `he in a relationship` inside "**s**he is in a relationship" — wrong-gender rows in a bucket about *her* married man | `\b`-anchor every alternative that starts with a pronoun — `he`, `his`, `her` all live inside other words |
| wrong party | `another (man\|woman)` caught *him* having another woman (betrayal) as well as *her* being torn between two — two opposite concerns in one bucket | anchor to the speaker: `i love someone else`, not `another man` |
| wrong party, round 2 | `the other woman` caught the betrayed **wife** ("is my husband still talking with the other woman") sitting inside a bucket about being the other woman | read the arm's *solo* matches — see the per-arm audit below |
| her own life vs his | `is married` / `his marriage` matched women describing **their own** marriage | anchor to `married man`, `he's married`, `another woman in his life` |
| the bucket's own name, literal sense | bare `room ?mate` caught actual housemates ("my roommate and I — will we ever be a couple") in a bucket about a marriage that *feels* like roommates | keep the metaphor forms only: `(like\|just\|more like) (a )?room ?mates?` |
| sensitive-content leak | `just exist` caught domestic abuse ("just existing for abuse") | drop the arm; re-check against Step 5 |

**Audit each ARM, not just the bucket.** Split the pattern on top-level `|` and report,
per alternative: how many rows it alone catches ("solo") and what those rows earn. A
dirty arm hides completely in the bucket total. On the commitment run this is what
exposed both the literal-`room ?mate` arm (25 rows at **$1,455 per 1,000**, dragging its
bucket down) and two arms of TWOBOATS that were on-concept but earned **$0**.

🔴 **Cleaning does not only ever deflate a number.** PROPOSAL fell below base when fixed,
so the reflex is to treat a precision pass as bad news. On the same theme, cleaning
ROOMMATES **raised** it 19% ($11,818 → $14,065) and UNAVAILABLE 14%, because the dirt was
cheap traffic diluting expensive traffic. Fix the regex on *concept* grounds — never drop
an arm because it earns badly — then report whichever way the number moves.

A sub-bucket whose samples don't read as one concern is not a sub-bucket yet. Re-run
Step 2b/2d after any regex fix — the numbers move a lot.

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

## Step 2f — VERIFY before spend: is the win bigger than the noise?

Run this on any sub-bucket you are about to recommend building. Sub-buckets are small by
construction (a specific situation is rare *because* it is specific), so a rev/1,000
ranking can rest on three or four customers. Four checks, all cheap:

1. **Reproduce it from a second script.** Not a re-run of the same file — write the query
   again. On the 2026-08 commitment verification every figure landed within 0.4%, which
   is what made the *other* three checks worth trusting.
2. **Bootstrap against the rest of the theme.** Resample 4,000× and report the share of
   draws where the sub-bucket out-earns everything else in the theme. **Under 90%, the win
   is not established** — say so rather than ranking it. This killed TWOBOATS (79%).
3. **Drop its single biggest buyer.** If rev/1,000 moves more than ~15%, the ranking is
   one customer deep. TWOBOATS fell 29%; ROOMMATES and UNAVAILABLE fell 11%.
4. **Check recall and overlap, not just precision.** Recall: what share of the theme
   matches *no* sub-bucket, and what does that remainder earn? If it earns near base
   (89% at $5,652 vs $5,824 base on the commitment run), the sub-buckets are skimming real
   cream and nothing valuable is hiding outside them. Overlap: if buckets share many rows
   they are not separate tests — commitment's seven shared 0–7%, which is fine.

Also worth one line: **who is speaking.** The v1 funnel and every reveal are written for a
woman. Male speakers were 3.8% of commitment traffic but 10% of ROOMMATES ("my wife is
distant and we are in a sexless marriage") and earned a third as much. It didn't change
the build call, but it constrains the copy.

## Step 2g — RANK AS A STACK, not a pass/fail list (REQUIRED before Step 7)

Steps 2b, 2d and 2f give each segment a revenue per 1,000 and a size. This step turns
those into the run's output shape: **an ordered stack with a stated trigger per rung.**

🔴 **One efficiency bar is the wrong shape, and it cost real decisions.** The old rule
compared every segment to a single number — the theme's revenue per 1,000 — and rejected
anything at or below it. Two things are wrong with that.

**Wrong 1 — every segment has a ceiling, and efficiency does not tell you where it is.**
ROOMMATES returns 2.4× base and is **~1% of the theme**. You can spend into it, tap it
out, and watch efficiency decay. 2.4× does not survive being scaled. A big segment at
1.0× base has a far higher ceiling and can hold spend the small one never could.
Efficiency is a *rung order*, not a build order on its own. An account reaches its target
by **stacking** — open the most efficient rung, spend it out, open the next — not by
finding one winner. A segment under ~2% of the theme is a **margin play**; say so in the
same breath as its multiple, every time.

**Wrong 2 — "at base" is not a failing grade.** A segment at 1.0× earns exactly what the
theme earns, and the theme is the thing you just called a winner. WENTCOLD ($6,075, 1.0×)
and NEVERMET ($6,430, 1.1×) were written up as rejected for "sitting at base". Their real
reason was **coverage** — live landers already ask both. They still land on DON'T BUILD
(at base *and* served), so the verdict was right and the reason was wrong. A wrong reason
is not harmless: it gets re-argued next quarter, and it teaches the next run to throw away
average-earning segments that are the theme's own volume.

**The base is a DILUTION line, not a build bar.** Below base means spending there pulls
the account blend down — which only matters if the segment is big enough to move the
blend at all.

| | **small** — under ~2% of the theme | **big** — over ~5% |
|---|---|---|
| **above base** | **margin rung.** Build first, expect it to tap out fast, have the next rung ready | build and hold — rare, and the best thing on the page |
| **at base** (~0.9–1.2×) | skip: too small to change anything either way | **volume rung.** Build when the account needs reach rather than margin |
| **below base** | skip | **dilution — the trap.** PROPOSAL: 5.2% of the theme, $4,617, 0.8×. Don't build |

The band edges are eyeballed off one run. Always print the real share and the real
multiple; never hide behind the band.

**Three verdicts. Every proposed segment gets exactly one:**

| Verdict | It gets this when | Must also say |
|---|---|---|
| **BUILD NEXT** | cleared Step 2f · unserved per Step 2e · best revenue per 1,000 still available | its format (Step 4b), and whether it needs a new deck |
| **LATER RUNG** | above base but **already served** · or at base and **big** · or above base and small but behind a better rung | **what opens it**: "when `cards-will-commit` is retired", "when the blend needs reach not margin", "when ROOMMATES taps out" |
| **DON'T BUILD** | below base **and** big enough to dilute · or bootstrap under 90% (Step 2f) · or at-or-below base **and** already served, so there is nothing left to gain | which of the three, by name |

Every reason has exactly one home in that table. "Already served" alone is a LATER RUNG,
not a DON'T BUILD — the women are still there and the lander can be retired.

**"Rejected" is retired as a word.** It reads as permanent, and it let an economics
reason stand in for a coverage one. A segment that is not next is a later rung with a
trigger written next to it.

**Where this thesis does NOT reach. Say these out loud rather than implying more:**

- **This corpus cannot compute a real TAM.** Prevalence (Step 2d) is a share of *our*
  traffic, not of Facebook's addressable audience. "~1% of the theme" is an ordering hint
  and a thin-pool warning. It is **not** a spend cap in dollars, and nothing here turns it
  into one.
- **Efficiency decay is asserted, not observed.** `conversations` holds no per-segment
  spend curve. This data has never watched a small pool decay. Treat decay as the reason
  to *prepare* the next rung, never as a number you can quote.
- **"Blends to target" needs a target this skill has never been given.** No account CPA or
  ROAS target lives in this repo. Without one the stack order is purely relative — first
  rung, second rung — and cannot say how many rungs are enough. If the operator states a
  target, record it in the run file; otherwise write that the order is relative.
- **The trap call still stands.** Big *and* below base is the one genuinely bad
  combination: enough ceiling to move the blend, moving it the wrong way. Stacking does
  not rescue PROPOSAL.

## Step 3 — Read the quotes, don't lead with stats

Read all ~100 quotes directly. Tally recurring themes by hand (rough counts are fine).
**Do not** default to writing an n-gram frequency/momentum mining script as the primary
method — that was tried once and corrected (memory `feedback-voc-first-headline-method`).
Stats are acceptable as a secondary confidence check on a theme you've already found by
reading, never as the thing that surfaces the theme in the first place.

## Step 3b — Derive the INJURIES (cascade level 2 — REQUIRED, and a segment holds SEVERAL)

🔴 **One segment is not one injury. Expect FOUR. One is a failed derivation, not a small
segment.**

This step did not exist until 2026-08-16, and its absence had a cost. The commitment run
gave ROOMMATES exactly one injury and shipped that as the answer. Re-reading the *same*
quotes for wounds instead of topic produced four. One injury × 4 questions × 3 tarot
formats = 12 cells; four injuries = **48**. Nothing downstream can recover the missing
three — Step 4 writes questions for the injuries it is handed, so a segment that arrives
with one injury leaves with a quarter of its territory.

**Sort her words by WOUND, not by topic.** Topic is what the segment already is — every
ROOMMATES quote is about an empty marriage, which is why they are one segment. The wound
is what that situation *did to her*, and several different ones hide under one topic.

**Four probes. Look at what she DOES with her own sentence:**

| She… | The wound underneath | ROOMMATES example |
|---|---|---|
| **negates an event** — "no arguing, no violence" | **the un-event**: nothing happened, so she is not allowed to grieve it | *"No arguing or violence, just peaceful friends, living together but sexless"* |
| **names herself absent** — "I'm the only one", "they don't see me" | **erased**: not unwanted, *unperceived* | *"I feel like I'm the only one in this relationship"* |
| **volunteers a number** — years, ages, counts | **the clock**: what the waiting cost, and running out of time | *"10 years… not even hand holding"* · *"33 yrs"* · *"I'm 69"* |
| **states a dilemma** — "torn between", "not sure if I should" | **no permission**: he isn't cruel, he's absent, so there is nothing to point at to justify leaving | *"torn between ending this relationship and trying to get it better. He doesn't seem concerned"* |

These four probes are not the only injuries that exist — they are the four that keep
recurring. Run them, then keep reading for a fifth the probes don't catch.

**Distinctness test — two injuries are the SAME if one question lands on both.** "The
un-event" and "erased" sound alike and are not: one is *nothing happened*, the other is
*I'm not there*. "Why did he stop reaching for me?" lands on the first and misses the
second. If you cannot write a question that separates them, you have one injury with two
descriptions — merge and keep looking.

**Self-frame check, do it here not later.** Some injuries produce questions that read
**her** rather than him — "Is it too late for me to start over?", "Why can't I leave a
marriage this empty?". That is allowed and sometimes necessary, but it is a **different
lander family** (`SELF_FRAME_HOOKS` in `client/src/content/tarotReads.ts`) and the
reveal's second beat must decode *her pull*, not his behaviour. Injuries built on a
dilemma or a clock skew self-frame; injuries built on an un-event or a rival skew
decode-him. Mark each question's frame in the run file so the build doesn't guess.

**State the arithmetic** at the end of this step: segments × injuries × questions ×
formats. If it comes out under ~30 cells for a segment worth building, you stopped early.

## Step 4 — Write the questions (cascade level 3)

🔴 **EVERY QUESTION MUST BE SELF-CONTAINED. Test it cold, with no heading above it.**

This is the failure that gets caught last and hurts most, because the questions read
perfectly *in the run file* — where the injury heading sits three lines above them and
supplies all the missing context. The ad has no heading. She sees one sentence in a feed,
between a friend's holiday photo and a shoe ad, and she has **zero** context.

Questions that failed this test on the 2026-08 ROOMMATES set, all of which looked fine
under their heading:

| Written | Why it dies cold | Fixed |
|---|---|---|
| "Is that all there is left?" | left of *what*? | "Is a loveless marriage all there is left for me?" |
| "How many more years like this?" | like *what*? | "How many more years in a marriage with no intimacy?" |
| "What did those years buy him?" | *which* years? | "What have the years in a sexless marriage cost me?" |
| "What replaced me in his day?" | replaced me at what? | "What gets my husband's attention now that I don't?" |
| "How long has she known about me?" | who is *she*? | "How long has his wife known about me?" |

**The tell is a dangling referent** — `that`, `this`, `those`, `it` with nothing in the
sentence to point at. The injury is in your head, not on her screen.

🔴 **BUT: specific about the FEELING, broad about the FACTS.** Over-correcting this gate
is how you disqualify half your own segment. A **vivid predicate anchors a pronoun
perfectly well** — "Why did *he* stop reaching for me?" is completely self-contained and
needs no "my husband". Only bare demonstratives need a noun bolted on.

| | |
|---|---|
| ✅ specific feeling | "he stopped reaching for me", "the first kindness I've had in years", "just let me" |
| ⛔ narrow fact | "in a marriage with no intimacy", "my husband", "a sexless marriage" |

**Measured cost, ROOMMATES 2026-08-16: 49% of the segment never says marriage, husband or
wife.** *"I'm in a relationship and we haven't been intimate for a long time"* · *"He's
separated but not divorced"*. Every headline that said "marriage" threw away half the
people the segment was measured on. The married half earns more ($12,615 vs $8,217 per
1,000) — but a margin segment is ceiling-bound, not efficiency-bound, so reach wins.

**Rule of thumb: name the WOUND, not her marital status.** Marital status is a filter and
Meta can target it far better than a headline can. The wound is what only she recognises.

This does not contradict `feedback-headline-specificity-over-brevity` — that preference is
for a specific *concept* over a vague fragment, not for a narrow demographic qualifier.
Long and vivid, yes. Long and disqualifying, no.

**How to check, mechanically:** read the question with the heading covered. If a stranger
cannot tell *who it is for* from that one sentence, it is not a question yet. Do this for
every line before it reaches the run file — a headline that needs its heading is a
headline that will never run.

🔴 **SHE MUST ARRIVE INNOCENT. Never write a question that makes clicking an admission.**

A click is semi-public and she knows it. If the sentence casts her as the villain — the
cheater, the other woman, the one who gave up — clicking is confessing, and she scrolls
past no matter how precisely the question names her situation. **Presuppose HIS failure or
the situation's, never hers.** She is the person it happened *to*.

The VOC says this outright. Unprompted, in her own concern text, she defends herself
before anyone accuses her:

> *"He loves his wife, **I'm not a marriage breaker** but still feel drawn to him"*
> *"**I'm not a home wrecker.** As that has been done to me, so I know the devastating consequences"*
> *"He has a girlfriend... **I wouldn't try to destroy their relationship**"*

So the wound is not "I want him". It is **"I am a good person in an impossible situation,
and I need someone to tell me I am not bad."** Write to that and the question becomes
clickable *and* true.

| Indicts her | Lets her arrive innocent |
|---|---|
| "Why do I feel more for him than for my own husband?" | "Why did a connection I never went looking for hit this hard?" |
| "How long can I stay married while I'm falling for someone else?" | "After years of being invisible in my marriage, why did one kind man undo me?" |
| "How long has his wife known about me?" | "He told me he was separated. How long has he been lying to me?" |
| "Does his wife know she's already won?" | "I'm not a marriage breaker. So why can't I let him go?" |
| "Why can't I leave a marriage that isn't bad, just empty?" | "He's a good man. So why does staying feel like giving up on my life?" |

**Four moves that shift the blame off her:**

1. **Make the feeling arrive, don't let her choose it** — "a connection I never went looking for", not "I fell for someone".
2. **Hand her her own defence** — open with her line ("I'm not a marriage breaker") and let the question follow it. Near-verbatim, and it disarms the judgement in advance.
3. **Name what was done to her first** — the years invisible, the lie about being separated. Establish the injury before the awkward fact.
4. **Ask to understand, not for permission** — "what is this trying to tell me?", never "should I do it?". Meaning-seeking is innocent; permission-seeking implies guilt.

⚠ **This is a decency rule as much as a conversion rule.** These women are in real pain and
mostly did nothing wrong. Do not sell to them by confirming their worst opinion of
themselves, even if a shaming headline would test well.

**Two conventions, and they are not interchangeable — pick by mode:**

- **Deepen a theme** → **four attacks per injury**: WHY (explain it) · HOW-LONG (quantify
  it) · BINARY (force the status) · RIVAL (name what replaced her). This is the convention
  the cascade counts on, and it is what Step 3b's arithmetic assumes.
- **Refresh / full rebuild** → three phrasing variants per recurring concern, below. This
  is the older 6-sub-group convention and the existing doc is written in it; keep it there
  so refreshes diff cleanly.

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

## Step 4b — FORMAT and DELIVERY (two different levels — do not merge them)

🔴 **THESE ARE NOT THE SAME AXIS, and treating them as one produced a wrong build plan
and a 3×-inflated territory count.**

| | **FORMAT** (cascade level 4) | **DELIVERY** (level 5, below the click) |
|---|---|---|
| What it is | what the ad **looks like in the feed** — static image, video, UGC talking head, carousel | what happens **after** she clicks: how the reading reaches her |
| Where it lives | **Meta Ads Manager.** Not in this repo — the only trace here is image briefs in `fb-palm/docs` | `client/src/App.tsx`, `TarotBridge.tsx`, `PalmBridge.tsx` |
| Changing it costs | a new creative asset (design/video) | a different URL |
| **Fights creative fatigue?** | ✅ **yes — this is the only lever that does** | ❌ **no. She never sees it before clicking** |
| Changes | who stops scrolling | what % of clickers convert |

**One question × three delivery variants is ONE ad with three funnels, not three ads.**
The feed sees an identical thing. So delivery can never answer "she's seen this too many
times" — only a new creative can.

**The delivery variants (`/fb-tarot` = A, `/b` = B, `/c` = C — same split on palm):**

| Delivery | What she gets after the click | Pick it when |
|---|---|---|
| **A** `/fb-tarot` | picks a card → static reveal card on S3 → short greeting → chat | default; the reveal image is the proof |
| **B** `/fb-tarot/b` | picks a card → no image; reveal arrives as chat messages | speed — no card art to produce |
| **C** `/fb-tarot/c` | picks a card → one card line **plus one open question**, LLM reads her answer | **she has a story to tell** — see rule 2 |
| **palm** `/fb-palm` | a quiz on a physical "sign" on HER hand | the injury is about *her*, not him |
| **bare** `/` → `/chat` | straight into chat, no quiz bridge | testing a question with no bridge in the way |

⚠ Palm-vs-tarot is a bridge *mechanism* change, bigger than an A/B/C swap but still
post-click. It is not an ad format either.

🔴 **Never multiply questions × delivery to size territory.** 57 questions × 3 deliveries
is **57 ads**, not 171. The real format multiplier is however many creatives Meta is
running per question, and this repo cannot see it — ask Ads Manager.

**Three rules, all load-bearing:**

1. 🔴 **The grid has holes — palm reads HER hand.** A decode-him question on `/fb-palm`
   contradicts the funnel's own mechanism and needs the self-frame rotation, which is
   wired but unmeasured (memory `fb-palm-decode-him-mechanism`). Never print a
   question × format matrix as if every cell were valid. Mark the palm cells that need
   the rotation, or leave them out.
2. 🔴 **Format may hold a bigger lever than the segment does.** Step 2b check 2 keeps
   winning: on the commitment run, 400+ character concerns returned $9,613 per 1,000
   against $2,634 under 50 — **3.6×**, wider than the gap between the best and worst
   segment. **Version C is the format that asks her an open question** — the one that
   makes her type. Pair a segment whose injury is "nobody ever asked me about this"
   (ROOMMATES) with C deliberately, and write down why. Honest limit: this is an
   inference from concern length, **not** a measured C-vs-A win. Nobody has run that test.
3. 🔴 **Don't move two levels at once.** A new question on a new format tells you nothing
   about either. Format is already an experiment axis — `conversations.ab_visitor_id`
   exists precisely so a lander-time A/B/C exposure can join to the purchase it produced
   (see the comment in `shared/schema.ts`). Run a format test through
   `/admin/experiments`, on a hook that is already live.

Name a format for every question carried into Steps 7 and 8. "Not chosen yet, and here is
what would decide it" is an acceptable answer. Silence is not.

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

🔴 **EVERY run writes its own dated file. This is not optional.**

```
docs/fb-ad-question-mining/<mode>-<scope>-<YYYY-MM-DD>.md
    deepen-commitment-2026-08-15.md
    refresh-trust-honesty-2026-09-02.md
    rebuild-2026-10-01.md
```

The run file is **self-contained and about one thing only** — the theme or sub-group that
was actually run. Someone opening `deepen-commitment-*.md` should be able to act on it
without reading the roadmap, and should find nothing in it about reunion or loneliness.

🔴 **Write the CHAIN, not the working.** The operator's words, after being handed a
403-line first draft: *"there's so much fluff — what I want to hear is, what are the new
sub-buckets, how do we refine to the injury, and from there the new questions."* Three
sections, in that order, and nothing else above the appendices:

1. **The stack** — one table, one row per proposed segment, these columns in this order:
   *segment · what she is actually saying (her words) · rev/1,000 · × base · share of the
   theme · lander today · verdict*. Verdict is **BUILD NEXT / LATER RUNG / DON'T BUILD**
   (Step 2g) — never "rejected". Order the table by the stack, not alphabetically: BUILD
   NEXT rows first, then LATER RUNG in the order they open, then DON'T BUILD.
   Then one line per LATER RUNG naming **what opens it**, and one line per DON'T BUILD
   naming **which** of the three reasons applies. Name the trap explicitly if there is one
   (big, unserved, below base) so it isn't re-proposed next quarter. If a BUILD NEXT
   segment is under ~2% of the theme, say **"this is a margin play, not a volume play"**
   on the same page as its multiple.
2. **From sub-bucket to question** — open with the transformation itself (below), then
   **one self-contained section per BUILD NEXT segment**, so a chain can be read end to
   end without jumping around: *what she says* (3 real verbatims) → *the injury* → *the
   transformation worked through* → *the questions, each with its format* (Step 4b) →
   *constraints on the copy*.

🔴 **Show the transformation, don't just assert the questions.** The operator asked for
this explicitly — sub-bucket → injury → **the move that turns one into the other** →
question. Without it the headlines look invented rather than derived. The move is four
steps, and a worked table per sub-bucket makes it checkable:

| Move | What it does |
|---|---|
| 1. Find the injury | Not the situation. What it *did to her*, and why she can't name it |
| 2. Give it an actor | Make him the subject of the verb. "It went quiet" → "he stopped reaching" |
| 3. Presuppose it | She knows it's true. Never ask *whether* — ask why, how long, or which |
| 4. Pick the attack | WHY explain · HOW-LONG quantify · BINARY force the status · RIVAL name what replaced her |

An injury is what the situation did to her, and it is usually the thing she has **no
event for** — ROOMMATES' wound is that nobody left and nobody cheated, so she can't
justify the grief. Find that and the question writes itself. Constraints that change the
copy (bare-vs-paired, her life stage, a cross-cut the ad will pull anyway) go at the end
of each sub-bucket's section, not in a general list.

Everything else is an appendix: reveal copy for the build, and how to reproduce. Method
detail (bootstrap tables, regex defect post-mortems, overlap, recall, gender) belongs in
this skill and in memory — **not** in the run file. One line saying what "verified" means
is enough.

Cut anything that is you showing your work. The run file is for someone deciding what to
build.

`docs/fb-ad-question-testing-roadmap.md` stays the **index**, not the archive. Its job is
the 6 sub-groups, the Wave 1–4 checkbox state, and a short pointer per run: link, verdict,
the build table, and any finding that outranks the run itself. Never leave the same
analysis in both files — it drifts, and the stale copy is the one someone acts on.

**Full rebuild:** write the roadmap in this order — Summary (with the sub-group table **ranked
by revenue per 1,000 conversations** per Step 2b, carrying conversations, buy-rate,
upsell-1 take, revenue per buyer, revenue per 1,000 and share of the pool; plus total
headline count, and any cross-cutting flags. The 6 sub-groups are themes, so they stack
the same way segments do — Step 2g applies at this level too) → Wave 1 axis-discovery
checklist → the 6 sub-group sections in the order they were run → Wave 2-4 → full
candidate-pool appendix → open questions. Match the existing doc's format exactly (main
concern header, 3 bulleted variants with confidence tags, headline count, compliance
note) so future refreshes can diff cleanly.

**Refresh:** the run file carries the re-mined detail; the roadmap gets a dated pointer
("Refresh — YYYY-MM-DD") under that sub-group's existing section rather than a
replacement. Call out explicitly: what's new (a theme/phrase that wasn't there before),
what's confirmed stable (the tally still holds), and what's faded (a previously-dominant
phrase that's now rare). Leave the original headline set and any Wave 1-4 checkbox state
untouched — the operator decides whether to promote a new finding into the active test set.

**Deepen:** the run file is the deliverable. The roadmap gets the pointer block only.

## Step 8 — ASK WHICH LANDERS TO BUILD NEXT (REQUIRED — never end on the doc)

A run that ends at "here is the analysis" leaves the operator to translate the cascade
into a build order themselves. Don't stop there. **Close every run by asking which
landers to build next**, using AskUserQuestion, with the options named concretely.
Vocabulary — hook, deck, lander, injury — is defined once at the top of this skill; use
it, don't re-derive it.

**Each option is a full cascade path, not a headline.** Write it as
`segment → injury → question → format`, e.g. *"ROOMMATES → he stopped reaching → WHY
('Why did he stop reaching for me?') → tarot C, new deck"*. An option missing a level is
not buildable — the operator has to invent the missing one.

**Build the option list from what the run actually proved:**

- **Only offer questions from BUILD NEXT segments** (Step 2g — which means they cleared
  Step 2f). Say which segments you excluded and under which verdict; don't silently drop
  them. LATER RUNG segments get named too, with their trigger, so the operator can
  override the order knowingly.
- **Offer the stack as an order, not a menu.** Rung 1 is the highest revenue per 1,000
  unserved segment — mark it Recommended. Then say what rung 2 is and what opens it. The
  operator is choosing where to start, not choosing a single winner.
- **Say the ceiling next to the multiple.** "2.4× base, ~1% of the theme — margin play,
  expect it to tap out" is the honest option label. "2.4× base" alone is not.
- **Name the format** (Step 4b) on every option, and whether it is the same format as the
  hooks already live on that deck.
- **Flag bare vs paired (Step 2b check 1) on each option.** If the segment needs a second
  frame, the bare question is the weaker build even when it is the cleanest line. On the
  commitment run "Why does he keep choosing her?" is the bare UNAVAILABLE frame ($5,217
  per 1,000) against $7,064 paired — the operator should see that *before* choosing.
- **Say whether each option needs a new deck or reuses one.** A new deck needs card art
  and is a bigger job than a hook; `fb-tarot-add-card` builds a deck from a card-strip
  image the operator supplies. Check the live rosters before writing the list.

Then hand off to the build skill the operator picks — `fb-tarot-add-card` for a tarot
deck, `fb-palm-add-sign` for a palm sign, `fb-palm-hooks` for palm hook wiring. This
skill mines and prices; it does not build.

## After the run

Save any new durable finding to memory the same way the original build did (see
`fb-ad-bereavement-crosscut` for the template: what was found, why it matters, how to
apply it going forward) — a cross-cutting pattern or a compliance-policy change is worth
carrying into the next session, not just this doc.
