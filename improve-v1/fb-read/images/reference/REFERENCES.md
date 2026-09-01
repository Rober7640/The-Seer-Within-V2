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
