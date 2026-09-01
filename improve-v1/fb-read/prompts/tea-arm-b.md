# Arm B — ONE cup, three findable regions

Arm A was three cups, one hidden thing in each. Arm B is **one cup and three
questions asked of it**: she is shown a single cup, asked *what do you see?*, and
taps road / bird / heart. So this cup has to carry three regions that are far
enough apart to read as three different places, each with enough leaf in it to be
worth ringing — and still nothing nameable at cup scale.

Run this brief through `scripts/select-tea-cup.mjs`. It measures what the words
below ask for, so a candidate that reads well and measures badly is still out.

---

## What is different from the arm-A prompts

| | Arm A (`tea.md`) | Arm B (this) |
|---|---|---|
| Cups | three, one per symbol | **one**, carrying all three |
| The named formation | one dominant, packed solid | **none** — three gatherings of equal weight |
| Density contrast | named shape 2× the scatter | no shape wins; the RING says where |
| The reading's job | reveal what she missed | confirm what she already picked |

🔴 **Nothing in this cup may close into a recognisable shape.** Arm A leaned on a
dominant formation. That was already the wrong instinct for tasseography — see
`tea-leaf-reading-findings.md`, where a legible symbol turned out to be "a logo
with tea on it" and let her self-select the panel she liked. Arm B removes the
last of it: she picks the *symbol name*, not the picture, so the picture must
offer her no clue at all. Three gatherings, comparable weight, none of them a
bird or a heart or anything else.

---

## The generation prompt

Five takes. Paragraphs 2–4 are byte-identical to `tea.md` and to each other — that
repetition is what makes the takes one shoot rather than five stock photos. Only
paragraph 1 changes between takes.

### Paragraph 1 — the leaves (varies per take, see below)

> A close overhead photograph looking straight down into a plain white bone-china
> teacup, empty of liquid, its inside still damp and scattered with wet tea leaves.
> The leaves have settled into **three separate gatherings, far apart from one
> another, with clear porcelain between them** — {DISTRIBUTION}. Each gathering is
> roughly a thumbprint to two thumbprints across and is built from many small
> leaves crowded together at wildly varying densities: a dark grainy core where the
> leaves touch and overlap, breaking up at its edges into looser flecks and single
> leaves, so it has internal structure and texture rather than being a solid blot.
> **None of the three closes into a recognisable shape** — no bird, no heart, no
> letter, no ring, no arrow, nothing a stranger could name. They are ambiguous
> clumps, the way a real cup dries. The rest of the cup is nearly clear: at most a
> faint dusting of single leaves in the spaces between the gatherings, and at least
> one whole quadrant left almost bare white porcelain. Overall the leaves cover
> roughly {COVERAGE} of the cup's interior. They are dark olive-black, wet,
> individually distinguishable, each one catching a small wet highlight. The
> porcelain beneath and around any gathering on the shadowed handle side stays a
> warm dim cream, so those leaves still read as distinct dark marks against it and
> are not swallowed by the shadow.

### Paragraphs 2–4 — the cup, the light, the camera (identical in every take)

> The cup is old and plain — no pattern, no gilding — with a faintly crazed glaze, a
> thin brown tannin ring near the rim, and its handle projecting at the lower right
> of frame. It stands directly on deep crimson velvet whose nap is clearly visible,
> the pile catching the light in soft directional streaks. Two small polished
> crystals, a milky quartz pebble and a smoky quartz, rest on the velvet just
> outside the cup at the lower left.
>
> A single warm practical light — one low lamp, tungsten, from the upper left —
> rakes across the scene, so the upper-left of the cup's interior is warm and bright
> and the light falls away steeply into deep shadow at the lower right, the velvet
> going nearly black at the edges of frame. No fill, no second source, nothing flat
> or studio-white.
>
> Shot on a 50mm lens at f/2.8, camera perfectly square to the table, flat lay, the
> focus plane sitting on the leaves so they are crisp while the rim and the velvet
> fall gently soft. Kodak Portra 400 colour: desaturated warm neutrals, cream, dust,
> faded crimson, with the leaves the only cool dark note anywhere in frame. Fine
> natural film grain, a slight lens vignette. The cup sits centred and occupies a
> little over half the frame width, with generous quiet space around it. Intimate,
> hushed, slightly aged — a private photograph, not an advertisement. Square 1:1
> image.

### Negative prompt

`heart, bird, wings, letter, letter m, spiral, ring, circle, arrow, cross, star,
face, animal, recognisable symbol, one tidy symbol on a clean white field, symmetrical
formation, smooth drawn outline, evenly speckled leaves, uniform scatter, single
repeated mark, text, letters, numbers, watermark, logo, branding, teabag, tag, string,
spoon, saucer, hands, fingers, faces, people, steam, liquid, tea remaining in the cup,
tilted cup, angled view, three-quarter view, multiple cups, second cup, cropped rim,
clip art, vector graphic, icon, illustration, painting, cartoon, empty clean cup, flat
lighting, studio softbox, ring light, HDR, oversharpened, glossy, saturated,
stock-photo styling, plastic, crack in the porcelain, chipped china`

---

## The five takes

Clock positions are as the camera sees them. The handle is at 4–5 o'clock, so the
far side is 10–11. Depth matters as much as clock: **rim** is the outer ring,
**mid-wall** the band between, **floor** the flat middle.

| Take | {DISTRIBUTION} | {COVERAGE} |
|---|---|---|
| 1 | one high against the rim at eleven o'clock, one on the mid-wall at three o'clock, one down on the floor just below the middle | a fifth |
| 2 | one high against the rim at nine o'clock, one an elongated streak running outward across the mid-wall at one o'clock, one small and dark low on the floor at five o'clock | a seventh |
| 3 | one large and loose on the mid-wall at ten o'clock, one small and tight against the rim at two o'clock, one on the floor at six o'clock | a quarter |
| 4 | one against the rim at twelve o'clock, one on the mid-wall at four o'clock on the handle side, one on the floor to the left of the middle — pushed as far apart from one another as the cup allows | a fifth |
| 5 | one against the rim at ten o'clock, one on the mid-wall at seven o'clock, one on the floor just right of the middle, with heavier clumping than the others and larger bare regions between | a third |

Takes 1–4 sit inside the selector's 6–42% interior band by design; take 5 pushes
the top of it deliberately, because the failure mode we cannot see in advance is
**too little structure at 4× zoom**, and only a denser take answers it.

---

## Running it

```bash
codex exec -s workspace-write "<take prompt> … save to improve-v1/fb-read/images/candidates/arm-b/arm-b-N.png at exactly 1254×1254"
node scripts/select-tea-cup.mjs improve-v1/fb-read/images/candidates/arm-b
```

Then review the `-zooms.jpg` strips the selector cuts — **not the cups**. What the
machine cannot judge is on `art-selection-method.md` §3.

**Change the prompt, never the seed.** The remedy for each measured symptom is in
§4 of that doc, and the selector prints it. Two failed rounds means a photograph
cannot do this: shoot a real cup.

---

## Round 1 result — 2026-08-31

Five generated, `select-tea-cup.mjs` run, four passed. Coordinates for every passing
candidate are in `images/candidates/arm-b/selection/clusters.json`; the crops are in
the same folder.

| Candidate | Interior | Crop leaf | Verdict |
|---|---|---|---|
| `arm-b-1` | 16.8% | 19 / 17 / **9**% | pass — but all three gatherings sit at the same depth, so the position grammar has nothing to say |
| `arm-b-2` | — | — | **fail** — only 2 gatherings |
| `arm-b-3` | 22.8% | **34** / 18 / **8**% | pass — the best leaf texture in the set; its third region sits ON the floor of the limit and is 23% velvet |
| `arm-b-4` | 22.4% | 20 / 22 / 15% | pass — but the three regions are near-identical ovals; she would see one picture three times |
| **`arm-b-5`** | 18.7% | 16 / 14 / 14% | **PICKED** |

### Why `arm-b-5`

1. **No weak crop.** Every reveal is comfortably clear of the 8% floor, and the
   strongest is 100% on the cup. `arm-b-3`'s third region is exactly at the floor.
2. **The widest spread of position** in the set — 3.1, 7.7 and 10.6 o'clock, at two
   different depths. Position is half the meaning on this device, so three marks at
   one depth would make three readings that cannot differ on where they sit.
3. Its 3 o'clock gathering is **deep and on the handle side**, which is the heart's
   existing position words exactly — one of the three marks needs no rewriting.

Runner-up is `arm-b-3` on leaf realism alone. If the reveal ring turns out to need
more texture than `arm-b-5` has, it is the one to go back to.

### The open question this round did NOT settle

**No candidate contains a road.** The brief asked for three compact gatherings of
comparable weight — which is what it got — but *the road* is described in the live
copy as *"one trail of leaves running from the middle of the cup right out to the
rim"*, and a compact clump is not that. The bird and the heart both land on regions
that fit them; the road does not fit any region on any of the five.

That is a brief fault, not a candidate fault, and it is recorded here so the next
round does not repeat it: **if the road survives as one of the three symbols, one of
the three gatherings has to be generated elongated and radial, not compact.**

---

## Round 2 — adding the road — 2026-08-31

Brief changed to ask for one elongated radial TRAIL plus two compact gatherings, at
10 / 1 / 5 o'clock. Those clock positions are forced by geometry, not taste: the
reveal crops must clear the separation floor, and that arrangement is the one that
does it while leaving each symbol on the position its reading needs.

**0/5.** Two named faults, neither of them "try again":

1. **Every compact gathering came back a solid dark mass** — mean cell coverage over
   the 62% blot ceiling. A blot has no structure left to read at zoom, which is the
   whole point of the ring.
2. **The cup drifted** from a teacup to a wide shallow bowl, and the crystals and
   velvet changed with it. The set stopped being one shoot.

Round 2 also found two more harness bugs — the hole-fill leak (a trail touching the
rim let the fill escape and shrank the cup to two thirds of its size) and silent
rejection reasons. Both are in `art-selection-method.md`.

## Round 3 — fixing the blots — 2026-08-31

Prompt fixed on both faults: white porcelain must show through inside every
formation, each gathering spread about a third of the cup's width, and the cup named
explicitly as a deep-sided teacup rather than a bowl.

**The blots are gone** — mean coverage came back at 31–51%, comfortably inside the
band, and the cup shape held. **Still 0/5**, on a different and more interesting
failure: *the three formations sit too close for three non-overlapping reveals.*

### That failure is geometric, and it is about the CROP, not the art

`ZOOM` is 420px of a 1254px photograph. The cup is about 850px across. **So a reveal
crop is half the cup's width** — barely a zoom at all — and three of them cannot be
placed far apart inside one cup while all three sit on leaf.

Re-running round 3 at smaller crop sizes, changing nothing else:

| Crop | Round-3 candidates passing |
|---|---|
| 420px (current) | 0/5 |
| 360px | 0/5 |
| **300px** | **3/5** |
| 260px | 3/5 |

At 300px every crop also lands 96–100% on the cup, against 79–100% for the round-1
winner. `--zoom` was added to test this; **the default is untouched at 420**, because
how much of the cup the chat shows beside the reading is a decision about the funnel,
not a way to make a candidate pass.

### Round 3 result, at the 300px crop

| Candidate | Interior | Crop leaf | On cup | Verdict |
|---|---|---|---|---|
| **`arm-b-r3-1`** | 12.1% | 17 / 20 / 17% | 100 / 96 / 100% | **PICKED** |
| `arm-b-r3-2` | 17.4% | 27 / 17 / 17% | 100 / 100 / 98% | pass — but the trail runs straight down into the low gathering; at cup scale they read as one formation, so two rings would sit on one mark |
| `arm-b-r3-3` | 8.6% | 16 / 14 / 10% | 100 / 96 / 100% | pass — thinnest cup in the set |
| `arm-b-r3-4` | — | — | — | fail — one solid blot, one too small |
| `arm-b-r3-5` | — | — | — | fail — one too small |

### The pick: `arm-b-r3-1`

It is the only candidate in three rounds whose three formations map onto the three
symbols **as the live copy already describes them**:

| Symbol | The live `mark` string | Where it lands on this cup |
|---|---|---|
| road | *"a road of leaves running from the middle out to the rim"* | the trail — crop centre deep at 1.8 o'clock, running out to the rim. **Exact.** |
| bird | *"a bird near the rim, on the far side from the handle"* | 10.7 o'clock, far side ✓ — but two thirds of the way out, not at the rim |
| heart | *"a heart low near the middle, on the handle side"* | 5.1 o'clock, handle side ✓, low ✓ — but mid-wall, not the middle |

So **two position words need adjusting, and nothing else** — against dropping the
road entirely, which was the alternative and which costs the only symbol that
carries forward movement on a hook that asks *"Will I love again?"*.

Its crops also read as three genuinely different things — a path, a loose drift, a
compact cluster — where the round-1 winner's three were three similar granular
masses. That is the criterion the machine cannot measure.

**Runner-up: `arm-b-5` from round 1**, if the road is dropped after all. It has the
cleanest three-way separation; it simply contains no road.

---

## Round 4 — generating FROM a real photograph — 2026-08-31

Operator's question: why generate from nothing when real tea-leaf photographs
exist? Correct instinct. A public-domain photograph of a genuine read cup was
attached to the generation prompt (`images/reference/wm-tea-leaf-reading.jpg`, see
`REFERENCES.md`) with an instruction to copy **the leaf matter only** — particle
sizes, frayed edges, scattered specks, the rim arc — and restage everything else.

Four takes, two of each kind:

| | Layout asked for | Result |
|---|---|---|
| `a1` `a2` | three separated gatherings, as arm B specifies | **`a1` passes** — the best candidate in nineteen. `a2` too sparse |
| `b1` `b2` | the layout the REAL photograph has: one dominant mass, a rim arc, satellite specks | both **fail** — and both look more like a real cup than anything else we have made |

### What the reference fixed

Every earlier round produced leaf that looked like wet gravel: one uniform particle
size, clean-edged clumps, glossy olive beads. With the reference attached the leaf
became a mixture of fine dust and torn flakes, with ragged edges fraying into loose
grit and single specks flung across the cup. It is the single biggest quality jump
of the four rounds, and it cost one attached file.

**Image references belong in the brief from now on, not just prose describing what
a photograph looks like.**

### 🔴 And the finding that outranks the pick

`b1` and `b2` reproduce the structure of the real photograph closely — and our own
harness rejects them, exactly as it rejects the real photograph itself and the
competitor's live ad creative:

```
wm-tea-leaf-reading.jpg   ✗  one mass of 61 cells + 1 small + 3 specks
competitor cup            ✗  one connected region of 100 cells + 2 specks
arm-b-ref-b1              ✗  one mass of 44 cells + 5 specks
arm-b-ref-b2              ✗  one mass of 54 cells + 1 small + 5 specks
```

Three independent confirmations that **`clustersNeeded: 3` separated gatherings is
a rule we invented and reality declines to follow.** Tea leaves settle into one
dominant mass, an arc stranded at the rim, and satellites. The competitor rings
seven formations inside one connected mass — two of them around near-bare
porcelain — and sells the reading anyway.

That is a question about arm B's design, not about the art, and it is the
operator's to answer. It is written up in `images/reference/REFERENCES.md`.

---

## Round 5 — WHOLE LEAF — 2026-08-31 — the answer

The operator sent a link to a Double Cup Teas post that had not been read. Its
photo sequence contains `reading2.jpg`: a real read cup, shot from directly
overhead, made to a method the post states plainly — **whole-leaf black Assam, a
teaspoon dropped straight into the cup, never strained.**

It looks nothing like the two earlier references, and it overturns the conclusion
drawn from them.

| The earlier references (dust / CTC) | This one (whole leaf) |
|---|---|
| fine grit and powder | whole individual leaves 5–15mm, twisted and wiry, countable |
| drains into ONE dominant mass | settles into **several loose separated constellations** |
| masses with stained merging edges | leaves overlapping at angles like fallen twigs, porcelain visible between them |
| reads as a stain | reads as objects on the porcelain, each casting a small shadow |

**Round 4's conclusion — "arm B's three-region premise fights reality" — was wrong.**
It was drawn from two cups that happened to be the wrong grade of tea. A whole-leaf
cup produces roughly arm B's arrangement on its own, unprompted.

### The result

Five takes with `reading2.jpg` attached. **`arm-b-whole-1` passes and is the best
cup of the twenty-four**: 14.5% interior, crops 32 / 16 / 14, on the cup 99 / 97 /
100.

More important than the numbers is what the reveal crops show: individual leaves
at odd angles, sparse enough to count, with real shadows. A constellation rather
than an ink blot. That is the property the whole brief has been chasing — **nothing
self-naming at cup scale, and genuinely findable once named** — and no amount of
prose describing scatter ever produced it. One attached photograph of the right
grade of tea did.

### What this settles

1. The pick is `arm-b-whole-1` unless the operator prefers otherwise.
2. `clustersNeeded: 3` stands. It is not an invented rule reality declines to
   follow; it is what a whole-leaf cup does.
3. The art brief needs one correction wherever it describes the leaves: they are
   **whole leaves, sparse, individually countable** — not dust, grit, grounds or a
   dense speckled mass. Every round before this one asked for the wrong substance.

---

## Round 6 — ten from the whole-leaf reference — 2026-08-31 — SHIPPABLE

Ten takes, `reading2.jpg` attached, aimed deliberately at the arrangement the
symbol-read named — translated into OUR staging, where the handle sits at four to
five o'clock, so her side is lower-right and the far side is upper-left:

| Group | Clock | Reading grammar |
|---|---|---|
| on her side | ~3.5 | the handle side is HER |
| on the flank | ~7.5 | with a line running inward and down toward the floor |
| far side | ~10.5 | opposite the handle: what comes from outside her |

**The symbols were NOT named in the prompt** — deliberately. A cup that visibly
contains a bird is a logo with tea on it. The prompt asked for ambiguous crossed
leaves in three places and explicitly banned anything nameable; the ring supplies
the where and the copy supplies the symbol.

**5 of 10 passed.** `03`, `05`, `06`, `08`, `09`.

### Picked: `arm-b-final-03` (primary), `arm-b-final-05` (backup)

`03` landed on the brief exactly — 3.4 / 7.4 / 10.4 o'clock, all mid-wall at 0.57
depth, evenly spaced about 120° apart. Interior 20.1%, crops 24 / 22 / 18, on the
cup 97 / 95 / 96. It also has the strongest atmosphere of the ten, which matters
because this is the ad image as well as the lander image.

`05` is the backup: the best leaf character in the set, slightly looser groups.

### 🔴 `08` had the best numbers in the set and is DISQUALIFIED

Crops 37 / 22 / 23, on the cup 98 / 100 / 100 — the best measurements of any cup in
thirty-four. Its right-hand group is a **clean radiating starburst**. A stranger
glancing at it says "a star", or "a spider", and the whole mechanism collapses: she
is meant to pick a symbol NAME and have Evelyn find it, not see the answer sitting
in the picture. No measurement in the harness can catch this, which is exactly what
the human pick step exists for.

### The symbol assignment on `03`

Driven by POSITION, not by shape — the shapes are deliberately ambiguous, so which
name goes where is ours to choose, and the reading grammar should choose it:

| | Symbol | Where | Why that position carries it |
|---|---|---|---|
| A | bird | 3.4 o'clock, mid-wall, **her side** | news, a message — and it is already close to her |
| B | tree | 7.4 o'clock, mid-wall, flank | roots, what grew and is still standing |
| C | anchor | 10.4 o'clock, mid-wall, **far side** | something steady, arriving from outside her |

Ringed proof and the chat reveal strip: `candidates/arm-b-final/picked/`.

**There is no heart in this cup, and the road is gone.** The set is now
bird / tree / anchor. Nine opening bubbles need writing to it, and the `mark` and
`reading` strings in `shared/readDevices.ts` change with them.

---

## Wiring — 2026-08-31

Operator chose to **overwrite `tea`** rather than add a device, knowing the cost.
The nine arm-A readings are archived at `drafts/_archive-arm-a/` with restore
instructions; nothing is committed, so without that copy they would be gone.

### Done

| | |
|---|---|
| Asset | `images/armb/` — `cup.png` (master, unringed), `cup-ringed.png`, labelled review copy, three ringed reveal crops, `reveal-strip.jpg`, and `SOURCE.md` carrying the ring coordinates |
| Ad | `scripts/build-read-ad.mjs` → 3 hooks × 2 sizes in `images/armb/ads/`. **1080×1350 and 1080×1080 only** — operator confirmed Meta feed is 1:1 or 4:5, so the 9:16 build was dropped |
| Registry | `pick: 'panel' \| 'symbol'` on `DeviceConfig`, plus `cupImage` and `optionLabel`. `tea` is now `pick: 'symbol'` on bird / tree / anchor |
| Lander | `ReadBridge` branches on `pick`. Symbol path renders one cup full width + three named buttons. The panel path is untouched, so `dream` is unaffected |
| Chat | `cardArt.wide` added. A tarot card reads fine at 112px; a tea reveal is a ZOOM with a thin gold ring in it and was unreadable at that size. Read reveals now take the full bubble |
| Served | `client/public/read/armb-cup.jpg`, `armb-reveal-strip.jpg` |
| Verified | typecheck clean on every touched file (46 pre-existing errors elsewhere, none in `/fb-read`); crop maths 0/50/100 across a 1260×420 strip; lander screenshotted at 390px and 1280px, no console errors |

### The ad headline is imported, not written

`build-read-ad.mjs` pulls from `HEADLINES` in `shared/readDevices.ts` — the same
string the lander renders. The lander's second beat echoes the ad question back to
her, so if the two ever drifted she would be answered for a question she was never
asked. Importing removes the possibility instead of warning about it.

### 🔴 Outstanding: the copy contradicts the art

`npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry` → **9/18**. All nine `dream`
readings pass; all nine `tea` openings fail art coherence, because they still
describe a road running to the rim and a heart low on the handle side — formations
this cup does not contain. That is the guard working exactly as designed.

**63 bubbles to rewrite** (3 hooks × 3 symbols × 7 cuts). One sample opening bubble
is with the operator for review before the rest is written.

---

## The 63 bubbles — written 2026-08-31

All nine `tea` readings rewritten to bird / tree / anchor. Cut 1 **confirms and
places** instead of revealing: she has already tapped the name on a lander showing
one cup, so telling her there is a bird in it reveals nothing. Cut 1 agrees with her
and adds the half she could not have — where it sits.

Every position word is measured off the photograph. All three marks sit halfway up
the wall, so on this cup the meaning is carried by **which side** and never by
depth: nothing is at the rim, nothing is down in the middle.

Cut 3 answers three different fears per hook, so the panels cannot collapse into one
sentence said three ways:

| | love-again | still-think | hiding-something |
|---|---|---|---|
| bird | nothing is coming | it did not count unless he confirms it | I made it up |
| tree | the heartbreak destroyed what I had | it can be undone | I must trust what I cannot see |
| anchor | I will never feel settled again | it came loose when he left | I can never reach it |

### Verification

```
build-read-copy       ✓  63 bubbles inside 25 words / 2 sentences / no exclamation
eval --dry            ✓  18/18 written half
eval --selftest       ✓  27/27  (was 18/18 — nine new cases, below)
eval, LIVE model      ✓  18/18 both halves, against a clean server
registry --check      ✓  fresh
typecheck             ✓  0 errors in any /fb-read file
```

## 🔴 Two eval defects found while verifying, both fixed

### 1 · The generated half never checked the art

Art coherence ran on the WRITTEN opening only. The model could answer a woman who
tapped BIRD with a paragraph about a road and the run still printed a tick — and it
did exactly that: a stale dev server was serving the old registry, and two
transcripts described a cup that does not exist. **18/18 clean, twice wrong.**

Added: a wrong-mark check on the generated half. It fires when a reply names
another option's mark, or arm-A vocabulary this cup retired.

It is scoped, because the first version was not:

- **Device-scoped.** `road` and `heart` were tea's. Banning them everywhere failed a
  `dream` reply for saying "the heart" about a dream with no cup in it.
- **Only where the marks name objects.** tea's marks give three distinct head nouns
  — bird, tree, anchor. dream's are clauses, and the same extraction returns
  `you're` for two of them, which fires on almost any sentence. Four false failures
  on dream, all of them `you're`. Where the nouns are not distinct the check now
  stands down rather than guessing.

### 2 · The claim bans ignored negation — for the fourth time

This eval has now cried wolf four times and always the same way: **a guard written
from the outside matches words the sanctioned move also uses.** The file already
carried the doctrine and a `CANCELLED_BY` helper, and the `BANS` list simply did not
use it. So it failed:

- *"The tree sits halfway up — not at the rim, not far off."* — placing by contrast
- *"Not whether he loves you… not whether he'll return."* — cut 6 naming her smaller
  ask, which the copy does **by design** and which this same doctrine already
  records as a past false positive

Claim-type bans are now marked `claim: true` and share one `asserts()` helper with
the wrong-mark check. Formatting bans are untouched — an exclamation mark is an
exclamation mark whatever precedes it.

**Nine self-test cases pin all of it**, every "must pass" being a real sentence the
live model produced that an earlier version of these checks failed.

## Note for whoever runs this next

The dev server holds the registry in its module graph. A server started before a
`readDevices.ts` edit serves the OLD marks, and the eval will grade the model's
output against the NEW ones — which is how "18/18 clean" was printed over two
transcripts about a road. **Restart the server after touching the registry**, or run
the eval against a fresh one with `--base`.

---

## 🔴 The live half is not deterministic, and two real breaches were seen

The WRITTEN half is deterministic and passes 18/18 every time. **The generated half
varies run to run**, because it is a live model. Six runs today:

| Run | Server | Result | What it means |
|---|---|---|---|
| 1 | stale | 18/18 | **void** — server held the old registry; two transcripts described a road |
| 2 | fresh | 13/18 | 4 false failures from the wrong-mark check's first version |
| 3 | fresh | 14/18 | 2 more, from the negation hole |
| 4 | fresh | **18/18** | first run with the checks correct |
| 5 | restarted | 15/18 | the contraction hole — failed cut 3's own sanctioned line |
| 6 | restarted | **16/18** | all checks correct; see below |

So with the checks fixed the funnel scores **18/18 and 16/18**. Do not quote a
single live number as if it were stable.

### The two findings from run 6 — one real, one mixed

**REAL: `love-again · tea · b` invented a man.** She wrote *"ive been on my own six
years now and im starting to think thats just it for me"* — no man in it. The model
replied *"…to what you were before him."* The love-again guard is explicit: NO
SPECIFIC MAN ANYWHERE, because naming or implying a him turns her own future into a
story about someone else. The eval caught it. Nothing would have caught it live.

**MIXED: `love-again · tea · a` "gives a timeframe".** It fired on *"six months"* —
a duration derived from her own "left in march", describing her past rather than
predicting anything. Arguably a false positive. But in the same reply sat *"and it's
closer than you think"*, which IS a soft timing promise on a hook whose guard bans
duration outright — **and the regex does not catch it.** The check fired for the
wrong reason and missed the right one.

### What this needs next, and it is not more copy

1. **Tighten the love-again prompt** against implying a him and against soft timing.
   The copy is clean; the model drifts.
2. **Fix the timeframe ban**: exempt durations that quote her own words, and add the
   soft forms — *closer than you think*, *sooner than*, *not far off*.
3. **The runtime post-filter**, still absent and now clearly load-bearing. These
   guards exist in the eval only. A live Version-C reply is unfiltered, so the
   invented man would have reached a real woman.

---

## All three fixes — 2026-08-31

### 1 · The love-again guard was one sentence, and the model walked through it twice

Both breaches were caught by the eval on live runs and neither was covered by the
old wording. The guard now names them in the words the model actually reached for:
**never imply a man she did not name** ("before him", "the one who left"), and
**never time it in any form** — including the soft coats: *closer than you think*,
*sooner than you know*, *before long*, *any day now*.

The tendency line already said "never tie it to one specific person and never a
date". The *guard* is what the prompt renders as a rule, and it said neither.

### 2 · The timeframe ban is future-directed now

It used to fire on `\bmonths?\b`, which caught *"six months trying to remember who
you were"* — arithmetic on her own "he left in march", describing her past — while
missing *"and it's closer than you think"* in the same reply. Wrong reason, missed
the right one.

It now matches only a named horizon, a soft horizon, or a duration behind
`in`/`within`. A bare past duration is left alone.

### 3 · The runtime post-filter — `shared/readGuards.ts`

Every guard used to live in the eval, which is a test file. So the eval knew
"…what you were before him" breached the love-again frame, and production returned
it unread.

`generateReadReflect` was three lines. Now: **check → retry once naming the breach →
fall back to the written read.** The fallback is not new machinery — `remainingBubbles`
is already what Version C serves when the model call fails, so a breach is simply
another kind of failure. She gets the real reading, no dead air, nothing on screen
saying anything went wrong.

The eval now **imports the same module** — zero guard definitions remain in it — so
a guard tightened for the eval tightens production in the same commit.

**Harms only, deliberately.** The eval's quality checks (restating the opening, word
counts, bare pronouns) are NOT in the runtime filter. Those are worth failing a
build over and not worth failing a live reading over.

### Verified

| | |
|---|---|
| Blocks the two real breaches | ✓ invented man · soft timing |
| Passes the four known false positives | ✓ past duration · a man SHE named · cut 3's own landing · cut 6's smaller ask · placing by contrast |
| Live, 18 calls through the guarded server | ✓ **0 breaches, 0 fallbacks** — no false positives under production conditions, which was the real risk |
| Six calls baiting the invents-a-man guard | ✓ 0 breaches — the tightened prompt holds |
| Fallback branch, forced with a temporary ban | ✓ retried, fell back, returned bytes identical to `remainingBubbles`; temp ban reverted |
| selftest · written eval · typecheck | ✓ 29/29 · 18/18 · 0 errors |

**Still open:** `restates the opening ("on the far side")` fires on the anchor in
most live runs. It is a quality nit, not a harm, so it is correctly outside the
runtime filter — but if it grates, the fix is to stop the opening owning that phrase
so tightly, not to loosen the check.

---

## Full-funnel walk — 7/7 to the close — 2026-08-31

`scripts/walk-read-funnel.mjs` walks the whole journey the way she lives it: ad
lander → tap a symbol → handoff → typed turns → topic gate → name → email →
permission → the $35 close. **It stops at the CTA and never clicks it.**

All seven personas, symbols rotated across a/b/c, all three hooks:

```
long-marriage · a        ✓ pitch   9 turns   59 bubbles
widowed · b              ✓ pitch   9 turns   59 bubbles
quietly-alone · c        ✓ pitch   9 turns   58 bubbles
no-contact · a           ✓ pitch   9 turns   ...
reconnected-ghosted · b  ✓ pitch   9 turns   ...
unaccounted-hours · c    ✓ pitch   9 turns   58 bubbles
never-met-him · a        ✓ pitch   9 turns   ...
7/7 · 112 screenshots · $35 shown on all seven
```

**The symbol survives the whole funnel.** Each walk mentions its own symbol and no
other — bird runs mention bird, anchor runs mention anchor. That join, lander tap
to close, is the thing most likely to break in a bridge funnel and it holds.

### 🔒 SANDBOX ONLY — and one layer is not enough

Dev and prod SHARE a database. Run this against the ordinary dev server and it
writes real conversation rows to production.

```bash
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-funnel.mjs <persona> <a|b|c>
```

On top of `.env.sandbox` the browser also ABORTS every Meta request and mocks
`/api/lead` and `/api/fb-event`. Three layers, because a "sandboxed" run in July
2026 fired 309 real Lead events at the live pixel when dotenv quietly repopulated
blanked variables from `.env`. The walker refuses any non-localhost base.

### Two flakes in the walker, both from the Meta block

Recorded because they look like funnel bugs and are not:

1. **`networkidle` never settles.** The aborted Meta requests keep the network
   permanently busy. Wait for `read-cup` instead.
2. **`waitForURL` timed out on a page that had already navigated** — it waits for
   `load`, which the same aborted requests keep pending. Six of seven passed that
   line; the seventh did not. Now `waitUntil: 'commit'`.

### 🔴 A REAL BUG THE WALK FOUND — AND THE DATA SAYS DO NOT FIX IT YET

The first walk answered "what should I call you, dear?" with conversational filler
and Evelyn replied **"It's lovely to meet you, I."** `useConversation.ts:741` is
`input.trim().split(' ')[0]`, capitalised, with no validation.

Measured on production, read-only, 90,018 conversations:

| | Convos | Buyers | Conversion |
|---|---|---|---|
| A real name | 86,784 | 5,586 | **6.44%** |
| Not a name | 3,234 | 236 | **7.30%** |

417 women were called "My", 278 "I", and 2,444 of them got far enough to type a
real concern — so they had a whole reading addressed to a pronoun. **It costs
nothing.** The bad-name group converts slightly HIGHER, almost certainly because
someone who types "my name is Margaret" is more engaged, not because the bug helps.

Fix is ~5 lines. It is a polish item, not a blocker, and it predates this funnel by
90,000 conversations. Do not let it hold up the launch.
