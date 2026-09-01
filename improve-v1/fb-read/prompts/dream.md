# Dream strip — image prompts (3 panels, POV)

Device: recurring-dream quiz strip. Ad question "Will I love again?" → she taps the dream that keeps
coming back → the psychic's reading OPENS on a detail that is literally in the picture.

**Generate three SEPARATE square images. Never ask any model for a three-panel strip in one image** —
it returns unequal panels and the page slices the strip into exact thirds.

Render flags by model family:
- Midjourney: append `--ar 1:1 --style raw --s 100` (raw + low stylize keeps it photographic, not illustrative)
- Flux / SDXL / Seedream: set 1024×1024, CFG low-to-mid, use the negative prompt field verbatim
- GPT-image / Nano-Banana / Imagen (no negative field): paste the **prose exclusion line** given under each
  negative prompt instead — these models obey stated absences in the prompt body, not a `--no` list

House rule from current practice: do **not** add "8K", "hyperrealistic", "ultra-detailed", "masterpiece".
They push the render plastic and over-sharp, which is the exact opposite of what this device needs.
Focal length + aperture + one light description carries the realism.

---

## Panel A — "being chased"

**What she sees:** the shadow arrives before the person does. She never turns round, so the pursuer is
never in the picture — only its shadow, stretched across the ground and reaching toward her.

### Prompt

> A single elongated human shadow lies stretched across a dark cobbled street at night, thrown toward the
> camera so that its head and its long reaching arms end just short of the bottom edge of the frame. The
> figure casting the shadow is somewhere behind it, outside the picture, and is never seen — the shadow is
> the only trace of it. The shadow is thin and wrongly long, and its legs run far past any human proportion
> and kink hard where they cross the raised seam between two kerbstones, so the stride reads as snagged and
> caught, a step that cannot finish. The only light is one low warm sodium lamp set on the ground far behind
> the shadow and out of frame, raking almost flat across the stones so the damp setts catch a long warm
> sheen along their tops and everything past a few metres falls away into unlit black. Inside the shadow the
> tone is not black but a cold blue-grey, the single cold note in an otherwise warm, desaturated, slightly
> aged frame. The ground fills the picture: old worn granite setts, silt packed into the joints, one iron
> drain seam, wet in patches; the far end of the street dissolves into dark with no buildings legible, no
> windows, no vehicles, no signage of any kind, and the upper third of the frame is unbroken empty dark
> ground. Shot on a 35mm lens at f/2 from about knee height, tilted down at the road, the near stones and the
> shadow's hard edge critically sharp, the far ground falling soft; a faint lateral drag of motion at the
> extreme left and right edges as though the person holding the camera is running, the centre still sharp.
> Kodak Portra 400 pushed one stop — deep shadow, fine grain, no clipped highlights. Intimate, quiet,
> uncommercial. Square 1:1.

### Negative prompt

`person, man, woman, figure, silhouette of a body, back of a person, legs, feet, runner, crowd, face, hands,
horror creature, monster, claws, glowing eyes, street signs, shop fronts, lit windows, cars, bicycles, text,
letters, watermark, logo, moon in frame, sky, horizon, fog machine haze, neon, cyberpunk, teal-and-orange
grade, HDR, glossy, studio lighting, flat even light, stock photo, illustration, painting, 3D render, CGI`

*Prose exclusion line (for models with no negative field):* "No person and no part of a person is visible
anywhere in the picture — only the shadow on the ground. There is no sky, no horizon, no lit window, no
signage and no text of any kind."

### Most likely failure, and the guard

It renders the person as well as the shadow (or turns the shadow into a monster). Guard with the literal
sentence: **"The figure casting the shadow is outside the frame and must never appear; the shadow's head
points toward the bottom edge of the frame, toward the camera; the shadow is a plain human silhouette, not a
creature."**

---

## Panel B — "falling"

**What she sees:** straight down. The lip she has already left, and the floor a long way under it.

### Prompt

> A view looking straight down over the bare lip of a high stone ledge into open air. The near edge cuts
> across the top of the frame — worn, rounded stone, nothing on it and nothing to take hold of: no railing,
> no rope, no ladder, no hand, no rung. Beneath it the wall drops away in fast converging verticals, old
> brick and stone going soft and cold with distance, and far down at the bottom of the frame the floor is
> just legible — dark packed earth and broken flagstones, small with height. One low warm lamp stands on that
> floor, tiny at this distance, throwing a single pool of warm light across the flagstones directly below the
> edge; it is the only warm thing in the picture and everything else falls off into black. The air in the
> drop is a cold blue-grey haze that thickens the further down it goes, the one cold note in a warm,
> desaturated, slightly aged frame. The shaft is bare and uncluttered — no ledges, no pipework, no windows,
> no cables. Shot on a 24mm lens at f/2.8 with the camera held perfectly vertical over the edge, a true nadir
> looking down, so there is no horizon line and no sky anywhere in the frame; the stone lip is critically
> sharp and the ground far below is soft with distance and haze. A faint vertical drag of motion at the
> extreme edges of the frame, the centre still sharp, as though the picture itself is already moving
> downward. Kodak Portra 400 pushed one stop — deep shadow, fine grain, no clipped highlights. Vertiginous,
> quiet, uncommercial. Square 1:1.

### Negative prompt

`horizon, sky, clouds, aerial landscape, drone shot of a city, buildings, rooftops, skyline, person, body,
falling figure, legs, feet, hands, arms, railing, guard rail, fence, rope, ladder, stairs, balcony, safety
net, birds, text, letters, watermark, logo, teal-and-orange grade, HDR, glossy, studio lighting, flat even
light, stock photo, illustration, painting, 3D render, CGI, fisheye distortion`

*Prose exclusion line:* "The camera points straight down. No sky, no horizon and no cityscape appears
anywhere in the frame. There is no railing, rope, ladder or hand on the edge, and no person is visible."

### Most likely failure, and the guard

It drifts off vertical and gives an aerial landscape with a horizon and sky — a drone shot, not a fall.
Guard with: **"Camera perfectly vertical, pointing straight down at the ground, a true nadir view; the frame
contains only the near stone edge, the drop, and the floor far below — no horizon line and no sky."**

---

## Panel C — "teeth falling out"

**What she sees:** her own hand, and what has come loose into it.

### Prompt

> A woman's open palm held up close to the camera, fingers slightly curled inward, and lying in the hollow of
> it three small clean human teeth — two narrow front teeth and one molar — resting apart from one another so
> that all three are clearly countable. The hand is the only part of a body in the picture; the frame ends at
> the wrist and the forearm goes straight to shadow. The skin is real and unretouched, fine creases across
> the palm, short bare nails, no ring and no jewellery and no nail polish. The teeth are dry, whole and
> clean, the ivory of old piano keys, and their enamel takes the one cold note in the picture, reading
> faintly porcelain blue-grey against the warm skin around them. The only light is one warm candle-height
> flame just out of frame at the lower left, close enough that the palm is lit warm and the curled fingers
> throw soft shadow across it, and everything behind the hand falls away to near-black within a hand's width.
> The background is dark, textured and empty — the suggestion of old dark wood or worn cloth, nothing
> readable, no objects, and the upper part of the frame is unbroken dark so a headline can sit over it. Shot
> on a 50mm macro lens at its closest focus, f/2.8, the three teeth critically sharp and the heel of the hand
> and the fingertips falling out of focus; Kodak Portra 400 pushed one stop, fine grain, warm neutral,
> deep shadow. Intimate, quiet, slightly aged, uncommercial. Square 1:1.

### Negative prompt

`mouth, lips, teeth in a mouth, gums, jaw, chin, face, head, portrait, dentist, dental chair, x-ray, blood,
red, wound, gore, saliva, roots with tissue, cracked or rotten teeth, decay, braces, dentures, medical
gloves, tweezers, ring, bracelet, watch, nail polish, long nails, text, letters, watermark, logo, glossy,
studio lighting, flat even light, beauty retouching, plastic skin, stock photo, illustration, painting, 3D
render, CGI`

*Prose exclusion line:* "Only a hand is visible. There is no mouth, no lips, no gums, no face and no head
anywhere in the picture, and there is no blood and nothing red of any kind. The teeth are clean, dry and
whole."

### Most likely failure, and the guard

It supplies the mouth the teeth came from — a face, lips or gums enters the frame — or it adds a red note at
the tooth roots. Guard with: **"The picture contains a hand and nothing else of the body; it is cropped at
the wrist. No mouth, lips, gums or face appear. The teeth are clean, dry and whole, with no blood and
nothing red anywhere in the frame."**

---

## 4. Policy notes — panel C specifically

Panel C is the only one that can cost an ad account, so treat it as a compliance item, not a taste item.

**Wording that keeps it clear.** Meta's shocking-content rule bites on gore, wounds, exposed tissue and
body horror; a separate rule restricts creative that zooms in on an individual body part in a
health/beauty/body-treatment context. Neither should apply here, but the prompt has to make that obvious in
the render itself:

| Do write | Why |
|---|---|
| "clean, dry, whole teeth, the ivory of old piano keys" | reads as objects, not as an injury |
| "no blood and nothing red anywhere in the frame" | the single highest-risk element, stated as an absence |
| "no mouth, no lips, no gums, no face" | removes the extraction reading entirely |
| "cropped at the wrist" | keeps it one hand holding three objects, not a body-part study |
| "warm candlelight, dark background" | reads mystical/ritual, not clinical/dental |

Words to keep out of the prompt entirely, because they steer the model toward a medical or violent render
even when you negate them: *extraction, pulled, ripped, knocked out, bleeding, socket, cavity, rotten,
decayed, dental, surgery.* Negating a word still puts the concept in the frame's neighbourhood — better it
was never mentioned.

**Check on the returned image before it goes anywhere near an ad account.** Reject and re-roll on any of:

1. Any red, pink or wet-looking pigment on or near the teeth, including at the root end.
2. Any tissue, string, gum fragment or filament attached to a tooth.
3. Any mouth, lip, chin or face anywhere, including reflected or blurred in the background.
4. Teeth that read cracked, blackened, decayed or broken rather than clean and whole.
5. More or fewer than three teeth — the reading says "one after another" and names three; a different count
   breaks the open.
6. A count that is ambiguous at thumbnail size because two teeth are touching or overlapping.
7. Anything that reads clinical: white background, glove, instrument, bright even light.
8. Malformed fingers — count them, six-finger hands are still the most common macro-hand failure.

Then view it at 120px wide. If at that size it reads as "a hand with something pale in it" rather than as
anything anatomical, it is safe and it is also doing its job. Run panel C through a paid ad's review once as
a low-budget test before committing spend behind it.

---

## 5. Shoot notes — hold these identical across all three

They have to look like one set shot in one night, by one person, on one camera.

| Held identical | Value |
|---|---|
| Aspect | square 1:1, three separate renders, never a strip |
| Light count | exactly ONE practical, low, warm, out of frame |
| Falloff | deep — everything beyond the subject goes to near-black within a short distance |
| Palette | desaturated warm neutrals throughout |
| Cold accent | exactly ONE cold blue-grey element per panel, and it is always the dream-object itself: the inside of the shadow (A), the haze in the drop (B), the enamel of the teeth (C). Nothing else in any frame is cold. |
| Film look | Kodak Portra 400 pushed one stop — same grain, same shadow density, same warm neutral bias |
| Aperture | wide, f/2–f/2.8, subject critically sharp, everything else falling off |
| Grade | no teal-and-orange, no HDR, no glossy highlight roll-off |
| Motion | a faint drag at the extreme frame edges on A and B only; C is still |
| Emptiness | the upper third of every frame is unbroken dark and unreadable, reserved for the headline |
| Forbidden in all three | faces, people as performers, text, logos, modern branded objects, clutter |

**Thumbnail separation.** The three must be tellable apart at 120px, so each one carries a different primary
shape and they must not be re-rolled toward each other:

- A = a strong **diagonal** across a horizontal ground
- B = strong **converging verticals** falling into a dark centre
- C = a **rounded bright mass** low-centre with three small specks in it

If a re-roll makes two of them share a shape, re-roll the one that moved, not the pair.

**Order of operations.** Lock A first — it is the hardest to keep the figure out of. Once A's light and
grain are right, quote its exact light and film wording into B and C rather than rewording them; the set
holds together on the light description more than on anything else. If your model supports seeds, keep one
seed family across the three and vary only the subject paragraph.
