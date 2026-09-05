# Reference photographs — what they are, and what may be shipped

Gathered 2026-08-31, after the operator asked whether real tea-leaf photographs
would beat generating from nothing. **Yes — but almost none of them can be shipped.**
Read the licence column before any of this reaches an ad.

| File | Source | Licence | May it ship? |
|---|---|---|---|
| `wm-tea-leaf-reading.jpg` | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tea_leaf_reading.jpg), User:MochaSwirl | **Public domain**, released worldwide | **Yes** — publish, crop, modify, no attribution required |
| `tasseo-{bird,heart,ring,tree}.jpg` | [Commons](https://commons.wikimedia.org/wiki/Category:Tasseography), "Coffee Insights / tasseography.org" | CC BY-SA 4.0 | **No.** Share-alike is viral: a derivative would have to carry the same licence. Study only |
| `doublecup/reading2.jpg` + `doublecup/step1-10` | [Double Cup Teas](https://www.doublecuptea.com/blog/2017/11/1/tea-leaf-reading), Anna Wolfe | © all rights reserved | **No.** Study only — but it is the most useful image we have found |
| `../../../../docs/intel/wiccan-watch-tea-reading-image1.png` | competitor swipe, already in the repo | **All rights reserved** | **Never.** A competitor's own ad creative. Study only |

## What each one actually taught us

### `wm-tea-leaf-reading.jpg` — the one that matters

A genuine photograph: Canon PowerShot SD1100 IS, EXIF dated 2011-12-12, 3264×2448.
A real cup someone actually drank and turned. Public domain, so it can be used
without qualification.

What real leaves do, and what our generated cups were getting wrong:

| Real | What we were generating |
|---|---|
| a MIXTURE of particle sizes — mostly fine grit and dust, a few torn flakes | one uniform size, reading as wet gravel or coffee beans |
| ragged, feathery edges fraying into loose grit and then single specks | clean-edged oval clumps |
| white porcelain showing through the middle of a mass in irregular channels | solid cores |
| single specks flung right across the cup, far from any mass | nothing between the gatherings |
| a broken ARC of leaf stranded along the rim where the liquid drained | no rim behaviour at all |
| dark warm brown-black, matt | olive green, glossy beads |

### `tasseo-*.jpg` — do not treat as evidence

Uniform 450/550px, an `ffmpeg` encoder comment in the JPEG, 200 of them in one
series, sourced from a symbol-atlas website, and the Commons page states no
capture method. The "Bird" is a clean gull tick — the exact shape **our own art
brief bans** as the failure mode (*"if the two wingtips end level with the centre
notch it reads as the letter 'm' … the image is wrong"*), and the "Heart" is a
stain with no heart in it at all.

They are illustration assets for an atlas, not documentary photographs of read
cups. Useful for one thing only: the "Heart" is a good demonstration that **the
reader supplies the symbol and the picture supplies nothing** — which is the
Rorschach finding this funnel is built on.

### `flickr-tea-leaf-reading-cup.jpg` — a category note

It is a decorated novelty fortune-telling cup — zodiac signs printed round the
saucer, symbols round the rim — with **no leaves in it**. Worth knowing that this
is what most "tea leaf reading cup" image searches return: the printed product,
not a read.

## 🔴 The finding that matters more than any of the images

### First version of this finding — and its correction

The first two real cups found (the public-domain one and the competitor's) both
**failed our own selection harness**:

```
wm-tea-leaf-reading.jpg   ✗  1 mass of 61 cells + 1 small + 3 specks
competitor cup            ✗  1 connected region of 100 cells + 2 specks
```

From that the conclusion drawn was: *"tea leaves do not settle into three separate,
comparably-weighted gatherings; the arm-B premise fights reality."*

**That conclusion was wrong, and the third reference is why.**

### It is the GRADE OF TEA, not the practice

`doublecup/reading2.jpg` is a real read cup shot from directly overhead, and it is
nothing like the other two. Anna Wolfe's own method, from the same post:

> a black Assam, leaves *"varry in shape and size, but none are longer than a
> centimetre"*, **just a teaspoon placed directly in the cup without straining**,
> swirled three times in the left hand and turned over onto the saucer.

Whole-leaf tea, dropped in loose and never strained. And the result is:

| Dust / CTC grade (refs 1 and 2) | Whole leaf (ref 3) |
|---|---|
| fine grit and powder | **whole individual leaves, 5–15mm**, twisted and wiry, each one countable |
| drains into ONE dominant mass | settles into **several loose separated constellations** |
| an arc stranded at the rim | leaves lying alone, well away from any group |
| masses with stained, merging edges | leaves **overlapping at angles like fallen twigs**, white porcelain visible between and underneath |
| reads as a stain | reads as **objects sitting on the porcelain**, each casting a tiny shadow |

The whole-leaf cup contains, naturally and without being asked, roughly the
arrangement arm B needs: an upper-middle group, a straggling line down one side,
and a scatter low on the floor, with bare porcelain between them.

**So arm B is not fighting reality. The first two references were simply the wrong
grade of tea.** A cup made from tea-bag dust drains into one mass; a cup made from
a teaspoon of unstrained whole-leaf Assam scatters into constellations.

That is also the better field to read. Countable individual leaves at odd angles
are far more genuinely ambiguous than a stain — closer to a constellation than to
an ink blot — and a ring drawn around six overlapping leaves is honest in a way a
ring drawn on a corner of a mass is not.

### A limit of the harness, noted rather than fixed

`scripts/select-tea-cup.mjs` cannot measure `reading2.jpg` at all: it finds the cup
as the largest connected BRIGHT region, and that photograph is a hand-held close-up
where the cup, the hand and white paper behind it are all bright and all connected.
It picked a small circle in one quadrant and reported nonsense (a "90% solid blot"
inside a visibly sparse cup).

Not worth fixing. The harness exists to judge OUR staged shots — a bright cup fully
inside a dark frame — and it does that correctly. It is not a general-purpose cup
detector, and it should not be extended into one on the strength of one reference
photo. Just do not point it at arbitrary photographs and believe the number.

## If a real cup is ever shot, this is the recipe

Straight from the Double Cup post, and it is the whole answer to the leaf problem:

- **whole-leaf black Assam**, leaves under a centimetre
- **a heaped teaspoon, dropped straight into the cup, not strained and not bagged**
- a plain cup with a **white interior** and a handle
- swirl three times, invert onto the saucer, let it drain
- shoot from **directly overhead**, cup filling a little over half the frame

---

# COFFEE — reference photographs, gathered 2026-09-01

Gathered when coffee was proposed as a second `pick:'symbol'` device. **The licence
position is much better than tea's — three CC0 and one public domain — and the
finding is much worse.**

| File | Source | Licence | May it ship? |
|---|---|---|---|
| `coffee/coffereading.jpg` | [Commons](https://commons.wikimedia.org/wiki/File:Coffereading.jpg), Temuri rajavi. 1529×1354 | **Public domain** | **Yes** |
| `coffee/kahve-fali-1.jpg` | [Commons](https://commons.wikimedia.org/wiki/File:Kahve_falı_1.jpg), Basak. 5312×2988 | **CC0** | **Yes** |
| `coffee/kahve-fali-2.jpg` | [Commons](https://commons.wikimedia.org/wiki/File:Kahve_falı_2.jpg), Basak. 5312×2988 | **CC0** | **Yes** |
| `coffee/restos-cafe.jpg` | [Commons](https://commons.wikimedia.org/wiki/File:Restos_de_café_para_adivinar.jpg), Álvaro de la Paz Franco. 2592×1944 | **CC0** | **Yes** |
| `Tasseography coffee grounds symbol - *.jpg` (~200 files) | Commons, "Coffee Insights / tasseography.org" | CC BY-SA 4.0 | **No.** The same atlas series already in this folder as `tasseo-*.jpg`. Share-alike is viral. Study only |
| `El arte de la cafeomancia.jpg` | Commons, Palomaoleas | CC BY-SA 4.0 | **No** |
| `Սուրճ կարդալ.jpeg` | Commons, Chaojoker | CC BY-SA 3.0 | **No** |
| `Skräck o skrock 8a Spå i kaffesump.jpg` | Commons, Gunnar Creutz / Falbygdens museum | CC BY-SA 3.0 | **No** |
| `Cup tossing.jpg` | Commons, Nicholas Joseph Crowley | Public domain | Shippable, but it is a 19th-century **genre painting**, not a cup. No documentary value |

## 🔴 The finding: coffee COATS, it does not scatter

`REFERENCES.md` above established for tea that **grade decides scatter** — fine
dust/CTC drains into one mass, whole-leaf settles into separated constellations, and
arm B needs the second behaviour. Turkish coffee is ground finer than tea dust, and
all four licence-clean photographs show the predicted result.

| Photograph | What the grounds do |
|---|---|
| `coffereading.jpg` — overhead, handled cup, cup fills the frame. **The single most useful reference we have for coffee** | ONE connected dark film over the entire interior. White porcelain shows only as **thin crazed channels** running through the mass, like a dried riverbed. Zero bare porcelain between "regions", because there are no regions |
| `kahve-fali-1.jpg` — handheld, tilted, outdoors | Same connected coating, white at the rim and in streaks. One mass |
| `kahve-fali-2.jpg` — cup **and saucer** together | Cup interior coated. **The SAUCER carries one bold, isolated dark arc on clean white** — see below |
| `restos-cafe.jpg` — overhead, handled cup | The closest to usable. A **pale translucent wash** over most of the cup, carrying ONE genuinely dark isolated blot (a jagged vertical clot, upper-left of centre) and one dark pool at the floor — and the pool is residual liquid, not a formation. **Two dark features, not three** |

### What this means for a `pick:'symbol'` coffee device

`scripts/select-tea-cup.mjs` would reject every one of these. Three of the four sit
far above the 42% "cup drowned" interior ceiling, and **none has three separated,
comparably-weighted gatherings**. The arm-B premise, which needs exactly that, does
not survive contact with real coffee.

⚠ **A generated cup could be made to have three regions.** That is precisely the
trap `art-selection-method.md` and `tea-leaf-reading-findings.md` §1 warn about: the
ambiguity IS the practice, and a cup that does not behave like a real cup is a logo
with coffee in it. Tea's shipped arm-B cup is generated too — but it is generated to
match a REAL behaviour that reference work had found first (unstrained whole-leaf
Assam). There is no equivalent real coffee behaviour to point at. Generating one
would be inventing the practice rather than using it.

### The one lead worth following: the SAUCER

`kahve-fali-2.jpg` is the only image showing the saucer, and the saucer behaves
nothing like the cup. The cup wall is coated; the saucer is **clean white porcelain
carrying a bold, discrete, isolated dark run**. In Turkish practice the cup is
inverted onto the saucer and the saucer is read as part of the fal, so this is
authentic rather than a workaround.

A flat, mostly-clean field where grounds land as **discrete runs** is a far better
home for three separated marks than a coated cup wall.

🔴 **This is a hypothesis from n=1, not a finding.** One saucer photograph shows one
mark. Whether a saucer typically carries three separated runs needs its own
reference pass before any art brief is written on it.

### If a real cup is ever shot for coffee

Do not copy the tea recipe. The open question is which grind, vessel and turn produce
**separated** marks rather than a film — a coarser grind, a wider and shallower cup,
a shorter drain, or the saucer instead of the cup. That question has to be answered
by photographs before it is answered by a prompt.

---

# EGG IN WATER — reference, gathered 2026-09-02

Gathered while exploring a fourth device. **Nothing here may ship.**

| File | Source | Licence | May it ship? |
|---|---|---|---|
| `egg/gingerwitch-oomancy.mp4` + frames | TikTok, @thegingerwitch11, posted 2022-02-20, 101s, 720×1280 | **© creator, all rights reserved** | **No. Study only.** Downloaded as reference the same way `doublecup/` was, and held to the same rule. Its captions stay on it — stripping them would remove the marks that say whose work it is, and it is not going into creative either way |

## 🔴 Format proof, which is the reason it was pulled

**237,300 views · 10,300 likes** on a 101-second, near-static shot of a glass of water.
Her own on-screen prompt is *what do you see?* — so the exact interaction this funnel is
built on already earns engagement on a cold feed, unprompted by us.

That is the argument for video over a still, and it is stronger than an opinion:
the transformation IS the hook. A photograph of a finished glass shows the result;
the video shows it *becoming*, and that is what holds a thumb.

## What the egg actually does

Three mark types, and they differ in KIND, not merely in position:

| Mark | What it looks like |
|---|---|
| **Spikes** | fine vertical needles rising from the mass toward the surface, sharply defined against clear water |
| **Web / veil** | a spreading translucent cloud through the middle of the column, wispy at its edges |
| **The yolk** | an intact coloured mass resting on the floor of the glass — the one warm colour in frame |

🔴 **THE READING AXIS IS VERTICAL, AND THAT IS THE FINDING.** Height in the water
column, not position on a wall. Coffee earned a depth grammar — rim / mid-wall /
floor — but had to OBSERVE it off a tilted cup, and `SOURCE.md` carries a warning
that recomputing it geometrically inverts the reading. In a glass shot from the side,
depth is literal and unmistakable: surface, middle, floor. The same grammar, and it
cannot be misread.

So coffee's three-depth structure ports almost wholesale — which would make the nine
readings unusually cheap to write.

## Two departures from every device so far

1. **Shot from the SIDE, through glass.** Tea and coffee are overhead into a vessel.
   This is a cross-section of a water column. Nothing in the current art pipeline
   assumes that, including the ring tool's square crops.
2. **The whole egg goes in**, yolk included. The yolk is the only warm colour in an
   otherwise colourless frame and it always sits at the bottom — a fixed anchor the
   other devices have no equivalent of.

## ⚠ Register

The video is an **egg cleanse** (`#eggclense`, `#spiritualsafety`) — reading for
spiritual harm, in the limpia tradition. That is not love divination. Same class of
problem as coffee's evil-eye lineage: the practice is real, the vocabulary is real,
but the emotional register has to be steered to the three love hooks deliberately
rather than inherited. Egg cleansing is also a living practice in Latin American
curanderismo with its own community, which is worth knowing before borrowing its
language.

## If it gets built

Shoot it. It is an egg and a glass of water, it costs one kitchen and ten minutes, and
shooting it means owning it outright with no licence question. Study this video for
framing, water level, lighting and how long the whites take to congeal — then shoot to
our own brief, with the three marks we want findable and the final frame composed to
BE the lander photograph.

---

# THE DEVICE SCOUT — first run, 2026-09-05

The method in `docs/superpowers/specs/2026-09-02-fb-read-device-scout-design.md`, run end
to end for the first time. **Nothing was gathered and nothing may ship — this is a
measurement pass.** Method: Wikipedia enumerates the residue family; YouTube search
sorted by view count (`&sp=CAM%3D`), **no upload-date filter, ever**.

## 🔴 The finding: the catalogue is exhausted, and we already own all of it

The Wikipedia residue family — every practice where something is poured, dropped,
floated, burned or scattered and the pattern it makes on its own is read — contains
**exactly three practices with a real video audience. They are tea, coffee and egg.**

## The calibration table, which is the reusable part

Two of these devices are SHIPPED, so this is a bar, not a ranking in the abstract.

| Practice | Top result | 2nd | Age of top | Verdict |
|---|---|---|---|---|
| Egg in water | **1.3M** | 605K | 5 yrs | researched, brief written |
| **Turkish coffee — SHIPPED** | **803K** | 463K | **12 yrs** | — |
| **Tea leaf — SHIPPED** | **228K** | 81K | **9 yrs** | — |
| Wax poured into water | 89K | 15K | 7 yrs | below the floor, and see the confound |
| Water scrying | 71K | 52K | 5 yrs | rejected on structure — no physical marks |
| Molybdomancy, English | 1K | 817 | 4 yrs | dead |
| *Bleigießen*, German native name | 99 | 17 | 9 mo | dead — the native check CONFIRMED it |
| Ash reading | 237 | — | 3 mo | dead |
| Flour / aleuromancy | **no results at all** | — | — | dead |
| Oil into water | not measured | — | — | rejected at the gate |
| Incense ash | not measured | — | — | rejected at the gate |

**Tea shipped at 228K, so the floor is ~200K — not 1.3M.** That reframes everything: wax
at 89K is marginal rather than absurd, and molybdomancy at 1K is 200× under and simply dead.

## 🔴 Every top result is years old. Every one.

12 years, 9 years, 16 years, 5 years, 7 years. Across shipped devices and rejected
candidates alike. **The no-date-filter rule is not an egg quirk** — a recency window
would have scored coffee, tea and egg all at approximately zero.

## A third rejection class, found by running this

`fb-read-device-classes` had two: **visible-sign** (candle, dream — she already saw it,
so no reveal) and, from the coffee pass, **coating** (the field drains into one mass with
no separated marks). This run added a third.

**BINARY-OUTCOME.** The oil-into-water malocchio test is a genuinely hidden field with a
real tutorial body — and its reading is *"oil spreads = evil eye present; oil stays
compact = not present."* One question, two answers. `pick:'symbol'` needs three options
against ONE photograph, and a yes/no test cannot carry three readings. The field can be
hidden and still yield only one bit.

## The one that got closest, and why it still failed

**Beeswax poured into cold water.** On the texture lane it was the best candidate of the
whole run, and it merged two catalogue entries: the Finnish New Year tin-pouring custom
has *itself* already migrated to beeswax because lead is toxic
([@herfinland](https://www.tiktok.com/@herfinland/video/7317235157155597600)), which
solves the "you cannot melt lead in a kitchen" problem authentically rather than as a
workaround. It reads shape **and cast shadow** — hidden-field twice over. And unlike egg
(limpia) and coffee (evil eye), its vocabulary is **natively about love**: *"lace-like
edges mean admirers and suitors are in your future."* Its marks differ in KIND for free —
ribbons, rugged texture, lace edges, broken-piece counts, tear-shapes.

Then the metric lane scored it 89K / 1K / 99.

🔴 **This is the whole argument for keeping the two lanes separate.** The texture lane
said *strong pass, best vocabulary in the run*. The metric lane said *nobody watches it*.
Both were right about different things, and a system with only the first would have sent
someone to shoot wax for a week.

Second problem, recorded so it is not rediscovered: on both lanes, "wax reading" returns
**candle** wax overwhelmingly — the visible-sign device already rejected. The pour-into-
water variant appears as a 2-minute chapter inside candle videos, not as its own genre.
Anyone building it would be one art brief away from accidentally rebuilding candle.

## What this run says to do

Nothing new is worth building. **The egg is device #4 and it is already researched,
already top of this table at 1.3M, and its shoot brief is written.** Shoot the egg.

If a device #5 is ever wanted, the catalogue cannot supply it — this run closed it. The
search would have to change shape: high-volume "reading" formats that are not named
`-mancy` practices at all, which is a different method than this one.

## ⚠ One thing this run did NOT establish

That YouTube view count predicts ad performance. It is a demand proxy and nothing more.
There is a free test sitting in the funnel: **coffee outscores tea 3.5× here (803K vs
228K), and coffee-vs-tea is already a live device test.** If coffee out-converts tea, the
metric has some predictive value; if it does not, the metric is weaker than this table
makes it look. Check it when that test reads out rather than assuming either way.
