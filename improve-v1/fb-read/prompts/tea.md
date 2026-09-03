# Tea-leaf quiz strip — 3 image prompts

Three **separate square (1:1) images**. Never generate them as one strip — the page slices
the strip into exact thirds and a combined render always returns unequal panels.

Same cup, same velvet, same light, **handle at the lower right in all three** (roughly the
4–5 o'clock position as the camera sees it). That fixes the reading grammar:

| Where in the cup | Clock position (camera view) | What the psychic reads it as |
|---|---|---|
| Rim edge | the outer ring | the weeks just ahead |
| Middle / floor of the cup | the centre | far off, foundational |
| Handle side | 4–5 o'clock | **her** |
| Opposite the handle | 10–11 o'clock | **other people** |

The prompts below repeat several paragraphs word for word. That repetition is deliberate —
it is what makes the three read as one set. Do not paraphrase the shared paragraphs when
you reroll a panel.

If your model takes parameters, append: `--ar 1:1` (Midjourney) or set 1:1 / 1024×1024.
Reuse the same seed across all three panels wherever the model allows it.

---

## Panel A — "the road"

**The reading names:** *one trail of leaves running from the middle of the cup right out to the rim.*

### Prompt

> A close overhead photograph looking straight down into a plain white bone-china teacup,
> empty of liquid, its inside still damp and scattered with wet tea leaves. One formation
> dominates: a single continuous winding trail of packed dark leaves that begins in the
> middle of the cup's floor, curves like a footpath — one gentle bend, then another the
> other way — and climbs the inner wall until it finishes right at the rim, at about the
> eleven o'clock position as the camera sees it. The trail is unbroken along its whole
> length, leaves touching leaves, roughly as wide as a little finger, its edges ragged and
> granular rather than drawn, and it is visibly the densest and darkest thing in the cup.
>
> Everywhere else the leaves lie in the light uneven scatter a real cup holds: many small
> ragged clumps of uneven density, a few dark and grainy, others thinned to a dusting of
> single leaves, some clinging high up the porcelain wall, some settled on the floor, and
> whole regions left almost clear white. None of that scatter closes into a shape or
> competes with the trail — it is at most half as dense, broken, and directionless.
> The leaves are dark olive-black, wet, individually distinguishable, each one catching a
> small wet highlight.
>
> The cup is old and plain — no pattern, no gilding — with a faintly crazed glaze, a thin
> brown tannin ring near the rim, and its handle projecting at the lower right of frame.
> It stands directly on deep crimson velvet whose nap is clearly visible, the pile catching
> the light in soft directional streaks. Two small polished crystals, a milky quartz pebble
> and a smoky quartz, rest on the velvet just outside the cup at the lower left.
>
> A single warm practical light — one low lamp, tungsten, from the upper left — rakes across
> the scene, so the upper-left of the cup's interior is warm and bright and the light falls
> away steeply into deep shadow at the lower right, the velvet going nearly black at the
> edges of frame. No fill, no second source, nothing flat or studio-white.
>
> Shot on a 50mm lens at f/2.8, camera perfectly square to the table, flat lay, the focus
> plane sitting on the leaves so they are crisp while the rim and the velvet fall gently
> soft. Kodak Portra 400 colour: desaturated warm neutrals, cream, dust, faded crimson, with
> the leaves the only cool dark note anywhere in frame. Fine natural film grain, a slight
> lens vignette. The cup sits centred and occupies a little over half the frame width, with
> generous quiet space around it. Intimate, hushed, slightly aged — a private photograph,
> not an advertisement. Square 1:1 image.

### Negative prompt

`text, letters, numbers, watermark, logo, branding, teabag, tag, string, spoon, saucer,
hands, fingers, faces, people, steam, liquid, tea remaining in the cup, tilted cup, angled
view, three-quarter view, multiple cups, second cup, cropped rim, straight ruler-line of
leaves, spiral, ring around the rim, arrow, clip art, vector graphic, icon, illustration,
painting, cartoon, perfectly symmetrical, one tidy symbol on a clean white field, empty
clean cup, flat lighting, studio softbox, ring light, HDR, oversharpened, glossy, saturated,
stock-photo styling, modern branded objects, plastic, crack in the porcelain, chipped china`

### Most likely failure

It comes back as a **straight radial stripe that stops short of the rim** (or reads as a
crack or a drip stain). Guard it with the exact words *"begins in the middle of the cup's
floor … climbs the inner wall until it finishes right at the rim"* plus *"one gentle bend,
then another the other way"* and *"unbroken along its whole length, leaves touching leaves."*
If it still stops short, add: *the last leaves of the trail touch the rim itself.*

---

## Panel B — "the bird"

**The reading names:** *a bird, wings out, up near the rim, on the far side from the handle.*

> ⚠ This is the hard one — four earlier attempts failed. The fix is to describe the
> **silhouette geometry**, not the animal, and to name the "m" failure out loud inside the
> prompt so the model has something to avoid.

### Prompt

> A close overhead photograph looking straight down into a plain white bone-china teacup,
> empty of liquid, its inside still damp and scattered with wet tea leaves. One formation
> dominates: high on the inner wall, close under the rim and on the far side from the handle
> — around the ten-to-eleven o'clock position as the camera sees it — the packed dark leaves
> form the unmistakable silhouette of a bird with its wings spread.
>
> Build that silhouette shape by shape. At its centre is a small solid oval body of densely
> packed leaves, about the size of a thumbprint, with a short blunt tail trailing from it
> toward the middle of the cup. From each side of the body a wing leaves the notch where it
> meets the body, sweeps up and outward to a rounded shoulder high on each side, then tapers
> as it carries on outward and **downward**, so that each wingtip finishes clearly and
> obviously **lower in the frame than the notch between the wings** — a long shallow droop at
> the ends, the way a bird looks from above on the downstroke. This is the whole shape: if
> the two wingtips end level with the centre notch it reads as the letter "m" or a seagull
> tick and the image is wrong. The tips must drop well below. The wingspan is about a third
> of the cup's interior width, the two wings are near-mirrored but not identical, one
> slightly longer and lower than the other, and their edges are ragged and granular — built
> from many small leaves crowding together, not drawn as a smooth outline.
>
> Everywhere else the leaves lie in the light uneven scatter a real cup holds: many small
> ragged clumps of uneven density, a few dark and grainy, others thinned to a dusting of
> single leaves, some clinging high up the porcelain wall, some settled on the floor, and
> whole regions left almost clear white. None of that scatter closes into a shape or
> competes with the bird — it is at most half as dense, broken, and directionless, and the
> floor of the cup directly beneath the bird stays nearly clear so the silhouette is not
> crowded from below. The leaves are dark olive-black, wet, individually distinguishable,
> each one catching a small wet highlight.
>
> The cup is old and plain — no pattern, no gilding — with a faintly crazed glaze, a thin
> brown tannin ring near the rim, and its handle projecting at the lower right of frame.
> It stands directly on deep crimson velvet whose nap is clearly visible, the pile catching
> the light in soft directional streaks. Two small polished crystals, a milky quartz pebble
> and a smoky quartz, rest on the velvet just outside the cup at the lower left.
>
> A single warm practical light — one low lamp, tungsten, from the upper left — rakes across
> the scene, so the upper-left of the cup's interior is warm and bright and the light falls
> away steeply into deep shadow at the lower right, the velvet going nearly black at the
> edges of frame. No fill, no second source, nothing flat or studio-white.
>
> Shot on a 50mm lens at f/2.8, camera perfectly square to the table, flat lay, the focus
> plane sitting on the leaves so they are crisp while the rim and the velvet fall gently
> soft. Kodak Portra 400 colour: desaturated warm neutrals, cream, dust, faded crimson, with
> the leaves the only cool dark note anywhere in frame. Fine natural film grain, a slight
> lens vignette. The cup sits centred and occupies a little over half the frame width, with
> generous quiet space around it. Intimate, hushed, slightly aged — a private photograph,
> not an advertisement. Square 1:1 image.

### Negative prompt

`letter m, letter w, moustache, seagull tick, checkmark, chevron, butterfly, bowtie,
wingtips level with the body, flat symmetrical arch, text, letters, numbers, watermark,
logo, branding, real bird, feathers, animal photograph, 3D bird, bird figurine, teabag, tag,
string, spoon, saucer, hands, fingers, faces, people, steam, liquid, tea remaining in the
cup, tilted cup, angled view, three-quarter view, multiple cups, cropped rim, clip art,
vector graphic, icon, illustration, painting, cartoon, smooth drawn outline, perfectly
symmetrical, one tidy symbol on a clean white field, empty clean cup, flat lighting, studio
softbox, ring light, HDR, oversharpened, glossy, saturated, stock-photo styling`

### Most likely failure

The wings come back as **two arcs that end level with the notch — the letter "m"**, or a
literal photographed bird gets pasted into the cup. Guard with the explicit sentence already
in the prompt (*"if the two wingtips end level with the centre notch it reads as the letter
'm' … the tips must drop well below"*), plus `letter m, seagull tick, wingtips level with the
body, real bird, feathers` in the negative. Reroll this panel more than the other two and
pick the best of a batch — do not add more adjectives, change only the droop sentence.

---

## Panel C — "the heart"

**The reading names:** *a heart low down near the middle, sitting on the handle side.*

### Prompt

> A close overhead photograph looking straight down into a plain white bone-china teacup,
> empty of liquid, its inside still damp and scattered with wet tea leaves. One formation
> dominates: low in the cup, down on the floor between the middle and the handle side — the
> lower-right quadrant as the camera sees it, nearer the handle than the rim — the packed
> dark leaves form a clear heart. Two full rounded lobes at the top with a soft dip between
> them, the sides drawing in to a single point at the bottom, the whole thing tilted maybe
> fifteen degrees and lying on the curved floor of the cup so it is very slightly
> foreshortened. It spans about a third of the cup's interior width. It is solid — leaves
> crowded on leaves with no white showing through — and it is plainly the densest, darkest
> mass in the cup, but its edges are lumpy, granular and hand-made, one lobe fuller than the
> other, built out of hundreds of small wet leaves rather than drawn as a smooth outline.
> The shadow falling across that side of the cup must not swallow it: the porcelain beneath
> and around the heart stays a warm dim cream, so the heart still reads as a distinct dark
> shape against it.
>
> Everywhere else the leaves lie in the light uneven scatter a real cup holds: many small
> ragged clumps of uneven density, a few dark and grainy, others thinned to a dusting of
> single leaves, some clinging high up the porcelain wall, some settled on the floor, and
> whole regions left almost clear white. None of that scatter closes into a shape or
> competes with the heart — it is at most half as dense, broken, and directionless. The
> leaves are dark olive-black, wet, individually distinguishable, each one catching a small
> wet highlight.
>
> The cup is old and plain — no pattern, no gilding — with a faintly crazed glaze, a thin
> brown tannin ring near the rim, and its handle projecting at the lower right of frame.
> It stands directly on deep crimson velvet whose nap is clearly visible, the pile catching
> the light in soft directional streaks. Two small polished crystals, a milky quartz pebble
> and a smoky quartz, rest on the velvet just outside the cup at the lower left.
>
> A single warm practical light — one low lamp, tungsten, from the upper left — rakes across
> the scene, so the upper-left of the cup's interior is warm and bright and the light falls
> away steeply into deep shadow at the lower right, the velvet going nearly black at the
> edges of frame. No fill, no second source, nothing flat or studio-white.
>
> Shot on a 50mm lens at f/2.8, camera perfectly square to the table, flat lay, the focus
> plane sitting on the leaves so they are crisp while the rim and the velvet fall gently
> soft. Kodak Portra 400 colour: desaturated warm neutrals, cream, dust, faded crimson, with
> the leaves the only cool dark note anywhere in frame. Fine natural film grain, a slight
> lens vignette. The cup sits centred and occupies a little over half the frame width, with
> generous quiet space around it. Intimate, hushed, slightly aged — a private photograph,
> not an advertisement. Square 1:1 image.

### Negative prompt

`emoji heart, vector heart, valentine heart, glossy heart, heart outline, heart icon,
sticker, clip art, perfectly symmetrical heart, smooth drawn edge, red heart, pink, heart
sitting in the exact centre of the cup, heart floating at the rim, text, letters, numbers,
watermark, logo, branding, teabag, tag, string, spoon, saucer, rose petals, hands, fingers,
faces, people, steam, liquid, tea remaining in the cup, tilted cup, angled view,
three-quarter view, multiple cups, cropped rim, illustration, painting, cartoon, one tidy
symbol on a clean white field, empty clean cup, flat lighting, studio softbox, ring light,
HDR, oversharpened, glossy, saturated, stock-photo styling`

### Most likely failure

It comes back as a **clean symmetrical emoji heart, centred in the cup** — a sticker dropped
on porcelain. Guard with *"lumpy, granular and hand-made, one lobe fuller than the other,
built out of hundreds of small wet leaves rather than drawn as a smooth outline"* and the
placement words *"low in the cup, down on the floor between the middle and the handle side
… nearer the handle than the rim"*, backed by `emoji heart, vector heart, perfectly
symmetrical heart, heart sitting in the exact centre of the cup` in the negative. Second
risk on this panel only: the lower-right shadow eats it — that is what the *"warm dim cream"*
sentence is for.

---

## Shoot notes

### Hold these identical across all three

They are the same cup on the same afternoon. Any drift here and the strip reads as three
stock photos rather than one reading.

| Locked | Value |
|---|---|
| Aspect | square 1:1, three separate renders, never one strip |
| Cup | plain white bone china, crazed glaze, tannin ring, no pattern |
| Handle | lower right, ~4–5 o'clock, every panel |
| Crystals | milky quartz + smoky quartz, on the velvet at the lower left, outside the cup |
| Light | one warm tungsten practical, low, upper left, steep falloff to the lower right |
| Background | deep crimson velvet, nap visible |
| Camera | overhead flat lay, square to the table, 50mm, f/2.8, focus on the leaves |
| Colour | Portra 400, desaturated warm neutrals, leaves the only cool dark |
| Crop | cup centred, a little over half the frame width, generous negative space |
| Seed | same seed on all three if your model exposes it |

Practical order: get **Panel B (the bird)** right first. It is the constraint. Once you have
a bird you accept, lock its seed and settings and generate A and C from the same seed — they
are far more forgiving, and matching them to B is easier than matching B to them.

The shared paragraphs (scatter / cup / light / camera) are byte-identical in all three
prompts on purpose. When you reroll a panel, change only its first paragraph.

### Keeping the scatter real without drowning the named shape

The reference photo's lesson is that one clean symbol on an empty white field looks like a
logo, not a reading. But scatter that is too even hides the formation at ad size. The
balance is a **density contrast**, not a leaf count:

1. **Half-density rule.** The named formation is packed solid — leaves touching, no white
   gaps wider than a single leaf. Everything else is at most half that density and visibly
   broken. That sentence is already in each prompt; keep it.
2. **One closed shape only.** Real cups hold several formations, but a second closed shape
   competes for the name. The prompts say *"none of that scatter closes into a shape"* —
   the scatter is lines, dots and dustings, never loops or rings.
3. **Keep one quadrant nearly clear.** Uneven density means some regions have almost
   nothing. That is what makes the dense formation look found rather than placed.
4. **Give the shape breathing room.** A clear margin of porcelain immediately around the
   formation — the bird prompt asks for a clear floor under it — is what buys legibility at
   thumbnail size.
5. **Size floor.** A third of the cup's interior width for the bird and the heart; a full
   radius, centre to rim, for the road. Smaller than that and it dies at 120px.

### The 120px test — run it before you accept anything

Scale the render down to 120px wide and look at it cold. If you cannot name the formation in
under a second, the image fails, no matter how beautiful it is at full size. Most common
cause is contrast, not size: the shape is in the shadowed lower right, or the surrounding
scatter has crept up to match its density. Fix by dropping the scatter, not by enlarging the
shape.

### Rerolling

Swap one term, do not stack more. Adding adjectives is what produces the over-rendered
plastic look — and skip the "8K / hyperrealistic / ultra-detailed / masterpiece" vocabulary
entirely; those words push modern models toward an obviously artificial over-sharpened
render, the opposite of the aged private photograph this needs.

Sources consulted: [Harney tasseography](https://www.harney.com/blogs/news/tasseography),
[Twinings — basics of reading tea leaves](https://twinings.co.uk/blogs/news/the-basics-of-reading-tea-leaves),
[LEAF Tea Shop guide](https://leafteashop.co.uk/a-guide-to-reading-loose-leaf-tea-leaves/),
[Photorealistic AI prompts guide 2026](https://aivideobootcamp.com/blog/photorealistic-ai-prompts-guide-2026/),
[Camera terms for AI prompts](https://www.aiprophotography.com/ai-tools-and-generation/camera-lens-terms-in-prompts/).
