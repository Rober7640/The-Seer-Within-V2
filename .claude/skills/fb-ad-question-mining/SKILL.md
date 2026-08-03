---
name: fb-ad-question-mining
description: "Use when mining the `conversations` table for VOC-grounded FB ad headline candidates for The Seer Within's v1 funnels — either building the full 6-sub-group roadmap from scratch, or refreshing one/all sub-groups with new buyer data since the last run (e.g. a monthly re-mine). Reads real purchased `concern` quotes directly (never leads with n-gram/frequency stats), clusters them into main-concern groups with 3 phrasing variants each (direct / intensified-or-plea / tension-framed), tags confidence by how literally each headline traces to VOC, checks compliance against the live Meta ad policy, and flags cross-cutting sensitive themes (bereavement, health/disability) before writing into docs/fb-ad-question-testing-roadmap.md. Use when asked to: mine for new ad questions, refresh the FB ad headline roadmap, re-run the VOC exercise for a sub-group, check what's changed since the last question-mining pass."
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

**Full rebuild:** write the doc in this order — Summary (with the ranked sub-group
table, total headline count, and any cross-cutting flags) → Wave 1 axis-discovery
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
