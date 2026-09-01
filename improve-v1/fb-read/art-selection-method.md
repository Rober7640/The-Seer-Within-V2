# Selecting cup art — the method, and the loop

Written 2026-08-31, after the operator called out the first version of this plan as
sloppy. It was. This records what was wrong, what replaced it, and how to run it.

---

## What was wrong

The plan said: *"Pick one base cup (likely `tea-a`), and if it doesn't work I'll need
a re-shoot."*

Three faults, and they compound:

1. **Reusing an image made for a different job.** `tea-a` was generated to hide ONE
   shape at cup scale. Arm B needs a cup carrying THREE findable regions at zoom
   scale. No reason it would satisfy a requirement nobody had asked it to.
2. **Judging at the wrong scale.** A region that looks fine on the whole cup can be
   flat mush at 4×. The chat shows a zoomed crop, so 4× is the only scale she ever
   sees it at. Every judgement has to be made there.
3. **One candidate.** Generation is cheap; MY judgement of it is the bottleneck.
   Asking for one is a bet. Asking for five is a choice. And with one candidate and
   a deadline, the failure mode is obvious: rationalise the weak image because
   regenerating is tedious.

A fourth, hiding underneath: *"if it doesn't work I'll re-shoot"* is not a fallback.
It names no symptom and no remedy, so the retry is the same prompt with a new seed —
which is a treadmill, not a loop.

---

## The method

### 1 · Generate five, not one

One task, five takes of the same shot, varying leaf density and distribution.

### 2 · Machine rejects before a human looks

```bash
node scripts/select-tea-cup.mjs <candidates-dir> [--debug]
```

It finds the cup as the largest connected bright REGION, sets an ADAPTIVE leaf
threshold (fixed cutoffs silently score a dim render as leaf-covered), grids the
interior, joins the touching leafy cells into **gatherings**, and takes the three
heaviest that are far enough apart for their crops not to show the same leaves.
Then it measures the crop it is about to cut, not just the cell it found.

Thresholds are set in the script **before** any candidate is seen, deliberately, so
a weak one cannot be argued into passing later:

| Limit | Value | Why |
|---|---|---|
| cell leaf min | 10% | below this there is nothing honest to ring |
| cell leaf max | 62% | above this it is a solid mass with no structure to read |
| clusters needed | 3 | one per symbol |
| min separation | 0.75 × crop width | closer than this and two reveals show the same leaves |
| crop leaf min | 8% | a ring's worth of leaf must actually be inside the crop |
| crop on cup | 60% | below this the crop is mostly tablecloth |
| interior leaf | 6–42% | a bare cup cannot carry three regions; a drowned one is all mass |

`--debug` writes the cup it found, the interior it analysed and the three crops it
is about to cut, drawn over the photograph. Use it whenever a run's numbers and
your eyes disagree — see below for why that is not hypothetical.

### 3 · Human picks, at zoom, from the crops

For every candidate that passes, the script cuts the three regions and composes them
into one zoom strip. Review those strips — not the cups. Five strips, not fifteen
crops.

What the machine cannot judge, and what you are actually looking for:

- enough structure that a shape is *findable* once named
- the three regions look different from each other
- still nothing self-naming at cup scale

**Machine rejects, human picks.** No pixel measure can tell you whether a bird is
findable in a smudge; it can tell you which smudges cannot possibly contain one.

### 4 · A failing run says what to change

The script prints the remedy, keyed to the symptom it measured:

| Symptom | Change the PROMPT |
|---|---|
| cup nearly bare | more leaf overall, heavier clumping |
| cup drowned | far less leaf; leave large areas of clear porcelain |
| regions clustered together | ask explicitly for leaf in three separated places — rim, mid-wall, base |
| uniform speckle | vary clump SIZE hard: single flecks AND masses, never one repeated mark |
| dense speck in a bare crop | make each gathering WIDER, not darker — a spread a third of the cup across, not one tight spot |
| crops run off the cup | pull the gatherings in toward the mid-wall and floor |

**Change the prompt, never just the seed.** Re-rolling the same prompt is the
treadmill this exists to prevent.

### 5 · The floor

**Two failed rounds means a photograph cannot do this.** Stop generating and shoot a
real cup. The script exits non-zero and says so.

---

## The thing that de-risks all of it

**The image leads; the copy follows.**

Arm B requires rewriting the nine opening bubbles anyway, because in arm B *she*
names the symbol and Evelyn's job changes from revealing it to confirming it and
adding the position. So the position words are not fixed in advance.

That means: do not demand leaf at three predetermined spots. Generate cups, find the
three strongest clusters in the winner, assign road / bird / heart to whichever
regions fit their logic — bird away from the handle, heart on her side and deep,
road crossing outward — and then write bubble 1's position words to match the actual
photograph.

⚠ Cuts 2–7 reference position in places (*"Your bird sits on the far side, not on
yours"*). Grep for those after assigning and fix any that contradict the image. A
reading that names a position the picture denies is the one unrecoverable fault.

---

## 🔴 The harness was wrong five times, and it printed confident numbers anyway

Found on the first real run, 2026-08-31, while selecting the arm-B cup. All three
are fixed; they are recorded because each one produced *plausible output*, which is
the failure mode worth remembering.

| Bug | What it did | How it showed up |
|---|---|---|
| **The wrong circle.** `findCup` thresholded brightness at a fixed 110 and took the bounding box of everything above it. Lit crimson velvet clears 110 — and the shoot lights the scene with one low lamp from the upper left, by design. | The box pinned to the frame corner. The "cup" came out a tenth of a frame off-centre and too big, so velvet sat inside the analysed circle. Velvet is dark, so it **scored as leaf**: coverage inflated, positions wrong, crops centred on background. | Only by looking. The numbers were reasonable. |
| **Two reveals on one clump.** Separation was 0.30 × cup radius ≈ 127px; the crop is 420px. It also picked the three densest *cells*, and cells are not clumps. | Two crops overlapping by seventy per cent — the same leaves ringed twice and sold as two places — while the largest, most obvious gathering got no crop at all. | Only by looking. |
| **A crash on the good candidates.** The crop clamped at zero but not at the far edge. | A cluster near the rim on the handle side ran the extract past the photograph. `sharp` refused, and one off-centre cluster killed the run before anything could be judged. | Loudly, at least. |
| **The hole-fill leaked.** The leaves are dark, so they punch holes in the bright cup mask; the fix filled them by flooding inward from the edge of the cup's bounding box. | A trail of leaves that reaches the rim — *which is exactly what the road formation is for* — opens a dark channel from the interior out to the background. The fill poured through it and marked most of the cup as outside. The cup measured two thirds of its radius, sat off-centre, and two of three formations fell outside the analysed circle. It reported "only 1 usable region" for a cup that plainly had three. Replaced with a scanline fill, which cannot travel. | Only by looking. |
| **Rejections were silent.** `pickClusters` returned survivors and said nothing about what it dropped. | A cup with three good formations reported "only 1 usable region", and the remedy table then guessed — it told the operator to *separate regions that were already separate*. The real cause was that two were solid blots. A wrong remedy sends the next round in the wrong direction, which is the treadmill this whole document exists to prevent. | Only by looking. |

Four of the five share a shape: **a measurement that is wrong in a way no
measurement can report.** That is what `--debug` and `--verbose` are for. Run
`--debug` on the first candidate of any new shoot before believing a single number,
and read `--verbose` whenever a rejection count does not match what you can see.

The last one is the one to keep in mind when reading any failing run: **a harness
that cannot say why it rejected something will invent a reason**, and the reason it
invents is the one at the top of its remedy list.

### What that means for the recorded baseline

The old version of this file printed a run against the three arm-A cups and called
it proof the thresholds discriminate. Those numbers were taken through the broken
circle and are void. The corrected run:

```
✗ tea-a.png   only 1 usable region, need 3
✓ tea-b.png   13.8% leaf   16% / 13% / 10% crop leaf
✗ tea-c.png   cup drowned (42.2%) · only 1 usable region, need 3
1/3 usable
```

It still discriminates, and it is now harsher in exactly the way this document
predicted in prose: **`tea-a` fails.** It was generated to hide ONE shape at cup
scale, its leaf is a single connected mass, and it cannot carry three separated
regions. Fault 1 at the top of this file — "reusing an image made for a different
job" — is now measured rather than asserted.
