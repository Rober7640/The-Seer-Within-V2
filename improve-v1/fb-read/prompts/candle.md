# Candle strip — photoreal image prompts

Three **separate square (1:1) images**. Generate them one at a time. Never ask any model for a
three-panel strip in one image — the page slices the finished strip into exact thirds and unequal
panels break the slice.

The same candle appears in all three. Only the **flame and the wax** change. Everything else —
wax colour, candle width, tabletop, light position, lens, distance, crop — is held identical, and
that is what makes the set read as one set. See **Shoot notes** at the bottom before you start.

Each prompt below is self-contained. Paste it whole. Do not trim the closing "must be
unmistakable" sentence — that sentence is what protects the detail the psychic names out loud.

Parameters, if your tool takes them: `--ar 1:1 --style raw` (Midjourney), or set 1:1 / square in
Imagen, GPT-Image, Flux, Firefly.

---

## Panel A — "the still flame"

**Prompt**

> A single ivory-white pillar candle stands alone on a worn, near-black wood tabletop, burning with
> one tall narrow flame that goes perfectly straight up. The flame is a slim vertical spear of fire
> with almost parallel sides, dead still, rising directly above the wick — no waver, no flicker, no
> curl at the tip, no lean, no smoke. The wax at the top of the candle has melted into a shallow
> pool that is clean and completely level, an even ring the whole way round, the rim exactly the
> same height on every side of the candle. The sides of the candle are smooth and unbroken: no
> drips, no runs, no spill down the outside, nothing hanging over the rim. The wax is old and
> faintly translucent where the light passes through its edge. One warm practical light sits low
> and just out of frame to the upper left, raking across the candle so the left flank glows and the
> right flank falls away into deep shadow. The background behind the candle is unlit and drops to
> near-black, deep chiaroscuro falloff, exposure set for the wax so everything behind the candle
> sits three stops under. The flame is the only saturated colour anywhere in the frame — amber and
> gold, its core slightly blown to white, throwing a small warm pool of light onto the wood grain
> beneath it. Everything else is desaturated warm neutral: bone, ash, brown-black. Shot on a 50mm
> lens at f/2, camera a little above the height of the wax rim so the level pool reads as a shallow
> ellipse, the candle tack sharp and the wood behind it falling soft. Candle centred left to right
> with generous empty dark space around it and above the flame. Kodak Portra 400, fine natural
> grain, quiet, intimate and slightly aged — not glossy, not a product shot, not stock photography.
> Two things must be unmistakable in the final image: the flame going straight up with no waver,
> and the melted wax pooled clean and level all the way round.

**Negative prompt**

> flickering flame, wavering flame, curled or hooked flame tip, tilted or leaning flame, smoke,
> multiple flames, dripping wax, wax runs down the side, uneven wax rim, gothic melted candle,
> candle holder, jar, glass vessel, lantern, hands, people, faces, text, letters, numbers,
> watermark, logo, flat lighting, evenly lit, studio lighting, white or bright background, HDR,
> oversharpened, glossy commercial product photography, stock photo, extra candles, flowers,
> decorations, saturated background colour

**Most likely failure:** the model returns the gothic drip candle it has seen ten million times —
wax running down the outside and a lumpy rim — which kills "pooled clean and even". Guarded by
*"an even ring the whole way round, the rim exactly the same height on every side"* plus
*"no drips, no runs, no spill down the outside, nothing hanging over the rim"*, and by
`dripping wax, wax runs down the side, uneven wax rim, gothic melted candle` in the negative.

---

## Panel B — "the leaning flame"

**Prompt**

> A single ivory-white pillar candle stands alone on a worn, near-black wood tabletop, and its
> flame is bent hard over to the right, blown almost sideways by a draught crossing the room —
> roughly seventy degrees over from vertical, a long low tongue of fire lying over toward the right
> edge of the frame rather than standing up. The base of the flame has lifted clear of the wick, so
> a small gap of dark air shows between the black wick tip and the bottom of the fire; the flame
> looks pulled away, seconds from going out. A single thin thread of smoke lifts off the very tip
> of the leaning flame and rises, catching the warm light as a pale grey ribbon before it darkens
> and dissolves into the shadow above — one thread only, fine as a hair, not a cloud. The wax at
> the top has melted into a shallow pool and the sides of the candle are smooth and unbroken. One
> warm practical light sits low and just out of frame to the upper left, raking across the candle
> so the left flank glows and the right flank falls away into deep shadow. The background behind
> the candle is unlit and drops to near-black, deep chiaroscuro falloff, exposure set for the wax
> so everything behind the candle sits three stops under. The flame is the only saturated colour
> anywhere in the frame — amber and gold, its core slightly blown to white. Everything else is
> desaturated warm neutral: bone, ash, brown-black. Shot on a 50mm lens at f/2, camera a little
> above the height of the wax rim, the candle tack sharp and the wood behind it falling soft.
> Candle centred left to right with generous empty dark space around it, and clear room above for
> the smoke to travel. Kodak Portra 400, fine natural grain, quiet, intimate and slightly aged —
> not glossy, not a product shot, not stock photography. Two things must be unmistakable in the
> final image: the flame bent hard over to one side, and the single thin thread of dark smoke
> rising off its tip.

**Negative prompt**

> upright flame, vertical flame, straight flame, symmetrical teardrop flame, gently tilted flame,
> two flames, thick smoke, smoke cloud, fog, haze across the frame, smoke covering the candle,
> extinguished candle, candle holder, jar, glass vessel, hands, people, faces, text, letters,
> numbers, watermark, logo, flat lighting, evenly lit, studio lighting, white or bright background,
> HDR, oversharpened, glossy commercial product photography, stock photo, extra candles, wind
> streaks, motion blur on the candle

**Most likely failure:** the flame comes back upright, or with a polite five-degree tilt — a
straight candle flame is the single strongest prior the model holds, and a soft "leaning" reads as
almost nothing at 120px. Guarded by naming the angle and the cause — *"bent hard over to the
right… roughly seventy degrees over from vertical, a long low tongue of fire lying over toward the
right edge"* — plus `upright flame, vertical flame, straight flame, gently tilted flame` in the
negative. Second-order risk: dark smoke on a dark background is invisible, so the prompt lights it
(*"catching the warm light as a pale grey ribbon before it darkens"*) rather than asking for a
black wisp on black.

---

## Panel C — "the drowned wick"

**Prompt**

> A single ivory-white pillar candle burned right down to a low stub stands alone on a worn,
> near-black wood tabletop — the same thick pillar, roughly three fingers wide, but only about a
> third of its old height, squat and spent. Its wick has sunk into a deep pool of its own melted
> wax: the hardened wax rim stands higher than the wick, a raised crater wall all the way round, so
> you look down into a small well of clear molten wax with the drowned wick lying at the bottom of
> it, below the level of the rim. Only a small low flame is left, sitting down inside that well
> close to the wax, weak and guttering, the light gone small at the base of the candle. One single
> thick run of wax has broken over the rim on the right side and set into a frozen white trail down
> the outside of the stub — one run only, the rest of the candle smooth. One warm practical light
> sits low and just out of frame to the upper left, raking across the stub so its left flank glows
> and its right flank falls away into deep shadow. The background behind the candle is unlit and
> drops to near-black, deep chiaroscuro falloff, exposure set for the wax so everything behind the
> candle sits three stops under. The small flame is the only saturated colour anywhere in the frame
> — amber and gold, its core slightly blown to white, throwing a low, close pool of warm light that
> reaches barely past the candle onto the wood grain. Everything else is desaturated warm neutral:
> bone, ash, brown-black. Shot on a 50mm lens at f/2, camera held at the same low table height so
> it now looks down more steeply onto the short stub and into the wax pool, the candle tack sharp
> and the wood behind it falling soft. Candle centred left to right and sitting low in the frame,
> with a wide empty stretch of dark above it. Kodak Portra 400, fine natural grain, quiet, intimate
> and slightly aged — not glossy, not a product shot, not stock photography. Two things must be
> unmistakable in the final image: the wick down in a pool of its own wax with the rim standing
> higher than it, and the light gone small and low at the base.

**Negative prompt**

> tall candle, full-length candle, new candle, unburned candle, wick standing proud above the wax,
> tall flame, large flame, bright flame, flat level wax top, many drips, wax running all the way
> round, melted puddle spread across the table, multiple candles, tealight, candle holder, jar,
> glass vessel, hands, people, faces, text, letters, numbers, watermark, logo, flat lighting,
> evenly lit, studio lighting, white or bright background, HDR, oversharpened, glossy commercial
> product photography, stock photo

**Most likely failure:** the model gives you a normal-height candle with the wick sitting proud
above a flat wax top — it "knows" a candle and quietly ignores the drowning. Guarded by describing
the geometry as a container rather than a candle — *"the hardened wax rim stands higher than the
wick, a raised crater wall all the way round, so you look down into a small well… with the drowned
wick lying at the bottom of it, below the level of the rim"* — plus the height anchor *"only about
a third of its old height"* and `tall candle, wick standing proud above the wax, flat level wax
top` in the negative.

---

## Shoot notes

### Keep identical across all three
These sentences are copied word for word between the three prompts. If you edit one, edit all three.

| Locked | Wording to keep byte-identical |
|---|---|
| The candle | ivory-white pillar, roughly three fingers wide, smooth flanks |
| The ground | worn, near-black wood tabletop |
| The light | one warm practical, low, just out of frame **upper left**; left flank glows, right falls to shadow |
| The background | unlit, drops to near-black, three stops under |
| Colour rule | flame is the only saturated colour; everything else bone / ash / brown-black |
| Camera | 50mm, f/2, low table height, same distance from the candle in all three |
| Crop | candle centred left to right, generous dark negative space, headline room above |
| Film | Kodak Portra 400, fine natural grain |
| Lean direction | when anything leans or spills, it goes **right** (B's flame, C's wax run) |

**Do not change camera distance between panels.** It is tempting to move in on the stub so it fills
the frame like the other two. Don't — the short silhouette is the whole reason panel C is nameable
at 120px. Locking the camera is also what makes the set look like three moments of one candle
instead of three different photographs.

### Working order
1. Generate **A** first and pick your keeper. It sets the candle, the wood, and the light.
2. Feed that keeper back in as an image reference (or reuse the same seed) for **B** and **C**,
   changing only the flame-and-wax sentences and leaving every other sentence untouched.
3. Generate four of each and choose. Never accept the first render.

### The 120px test — run it before you ship
Shrink all three to 120px wide and put them side by side. You should be able to say
*straight / leaning / burned down* without looking at detail. If you can't:
- **A and B look alike** → push B's lean further (seventy degrees becomes eighty, "lying almost
  flat across the frame"). Do not fix this by making the smoke bigger; the lean carries the panel.
- **C looks like A** → shorten the stub again ("a quarter of its old height") and say the flame is
  "barely taller than the wax rim".
- **All three read as one grey blob** → the light sentence is too weak. Strengthen the falloff
  ("the right flank falls to full black"), never by adding the word "cinematic".

### Common drift and the fix
- **They look like three different candles.** You changed a background or light word between
  prompts. Diff the three prompts; only the flame and wax clauses should differ.
- **A warm haze glows on the wall behind.** Add *"the background is unlit, no glow on the wall
  behind"* — models like to backlight the negative space you need for the headline.
- **It comes back plastic and over-rendered.** You (or the tool's auto-enhance) added
  `8K, hyperrealistic, ultra-detailed, masterpiece`. Strip them — those words push toward a CGI
  render, not a photograph. The realism is carried by *50mm, f/2, one practical light, Portra 400*.
- **Smoke fills the frame in B.** Tighten to *"one thread only, fine as a hair"* and add
  `thick smoke, smoke cloud` to the negative.

### Tool notes
- **Flux** ignores negative prompts. Fold each negative into positive wording instead — say
  "smooth unbroken sides" rather than relying on `no drips`.
- **Midjourney** uses `--no`: paste the negative list after `--no`, comma separated, with
  `--ar 1:1 --style raw`.
- **Imagen / GPT-Image / Firefly** take the negative as a separate field or as a trailing
  "avoid:" sentence; keep the list short — a fifty-term negative dilutes the handful that matter.
