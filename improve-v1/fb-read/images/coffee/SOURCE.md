# The coffee cup — the asset, and where it came from

**A real photograph of a real read cup, and ours to use outright.** Not generated.
Selected 2026-09-01 from four licence-clean references (see `../reference/REFERENCES.md`).

| File | What it is | Served? |
|---|---|---|
| `cup.png` | 1254² master, **no rings**. Cropped from the CC0 original. The lander image and the base for the ad | **yes**, as `client/public/read/coffee-cup.jpg` |
| `rings.json` | the ring geometry. The ONLY place these coordinates live | — |
| `cup-ringed.png` | all three rings, no text | reference |
| `cup-ringed-labelled.jpg` | rings plus letters and names | **review only — never serve** |
| `reveal-{a-road,b-tree,c-lake}.png` | 520² ringed reveal crops, one per symbol | source |
| `reveal-strip.jpg` | 1560×520, the three crops 3-up | **yes** — `revealStrip`, cropped by `background-position` |

## Provenance

[*Restos de café para adivinar*](https://commons.wikimedia.org/wiki/File:Restos_de_café_para_adivinar.jpg),
Álvaro de la Paz Franco, Wikimedia Commons, **CC0** — public-domain dedication, no
attribution required, commercial use unrestricted. Safe as paid ad creative and as the
lander image. Original 2592×1944; master is `extract({left:400, top:120, width:1540,
height:1540})` resized to 1254².

**Why that crop.** The original frame contains a thumb at the lower right, a notebook
with visible handwriting at the left edge, and the cup's red rim all round. The crop
puts the hand and the paper outside the frame while keeping all three marks well
inside it. A sliver of the cup's own red rim survives at the left and upper right;
that is the cup, not clutter, and it stays.

**Why a photograph rather than a generated cup.** `../reference/REFERENCES.md` records
the finding: a heavy draw coats the cup in one unreadable mass, and only a light draw
leaves isolated marks on near-bare porcelain. This is a light draw. Generating a cup
with three separated marks would have meant inventing a behaviour no reference showed
— which is the "logo with coffee in it" failure the whole device is built to avoid.
Tea's cup is generated because reference work found a *real* tea behaviour to match
(unstrained whole-leaf Assam); coffee had no equivalent, so the real cup is the answer.

## Geometry — do not re-derive by eye, and do not re-derive by arithmetic either

| | Symbol | Ring centre | Size | Where it sits | Position reading |
|---|---|---|---|---|---|
| A | road | `(549, 228)` | `240×70` r `-3°` | high on the far wall, just under the rim | **the weeks just ahead** — the last thing to come to rest |
| B | tree | `(383, 790)` | `163×215` | mid-wall, left of centre | **what is standing now** |
| C | lake | `(611, 1105)` | `240×130` | the floor of the cup | **what she was built on** — the first thing to settle |

🔴 **Depth here is OBSERVED, not computed.** The cup is tilted toward the camera, so
the floor of the cup is *low in the frame*, not at the image centre. Distance from the
centre of the photograph is therefore **not** depth, and anyone who recomputes these
positions that way will get the lake — which is pooled liquid at the lowest point of
the cup, and so unambiguously the floor — back as "near the rim", and invert the whole
reading. The depths above come from reading the photograph.

🔴 **A stale ring is the one unrecoverable fault.** These coordinates belong to THIS
crop of THIS photograph. Re-crop the master and every one is wrong.

## Why the reveal crop is 520 and not tea's 420

The road is a **long** mark — that is what makes it a road. A ring around any useful
length of it is wider than 420px, and `ring-read-cup.mjs` refuses a ring larger than
the crop rather than quietly cutting it in half. 520 still shows 41% of the cup, so
the reveal remains a real zoom. The strip is `3 × 520 = 1560×520`; the lander slices it
into exact thirds by `background-position` and never inspects the artwork for seams.

**The road's ring covers a segment, not the whole run.** The eye follows the line out
past the ring, which is what a road should do. A ring around the entire arc would read
as a border rather than as sight.

## Why the symbols were not chosen in advance

They were read off the photograph, in the order the method requires: find the
photograph, see what is in it, then name it. `road`, `tree` and `lake` are what the
marks actually look like, and all three are in the traditional tasseography vocabulary.

**No handle rule.** Tea's grammar leans on *handle side = her*; this cup's handle is
outside the crop and coffee does not need it. The drain gives a cleaner axis anyway —
rim, mid-wall, floor — and on this cup the three marks land on three different depths,
which tea's three (all mid-wall) never did.
