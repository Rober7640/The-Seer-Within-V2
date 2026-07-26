# Maren Soleil — Animated Hero Production Briefs

Brand: **Maren Soleil** — twin-flame love empath. Tagline **"Twin Flame Oracle · Love Empath."**
Aesthetic: **intimate, warm, water-and-flame** — candlelit, tender, editorial. NOT gift-shop
mystical, NOT neon. Thin gold line-art (~1.25px stroke), warm ivory paper, deep ember dark.
Calm, unhurried, never strobing. No cards, no wheels, no astrology glyphs.

### Brand palette (use these exact hex everywhere)
| Token | Hex |
|---|---|
| canvas | `#F1E4DC` |
| paper / ivory | `#FBF5EF` |
| ember (masthead/dark) | `#5E2A2C` |
| ink | `#2A2024` |
| accent gold | `#C9A24B` |
| terracotta / flame | `#9C4A3C` |

### Universal rules (apply to ALL GIFs)
- **Frame 1 carries the message.** Outlook (Word rendering engine) and many corporate/mobile
  clients show ONLY the first frame of a GIF. Frame 1 must equal the finished, legible art —
  never a blank canvas, never a mid-animation state. Build the animation *backwards from* the
  static fallback so frame 1 == fallback.
- **Decorative, never load-bearing.** No GIF may contain text that carries the email's message.
  All headlines/CTAs/offer live as real HTML text beside the asset. Animation supports, never speaks.
- **Author at 2×, export at 1×.** Compose at double the listed pixel dimensions, then downscale.
- **Weight budget: ≤1MB hard cap per GIF; target listed per concept.** Reduce palette before
  reducing frames. Prefer fewer colors (16–32) and flat gold/terracotta-on-ember over gradients/dither.
- **Loop seamlessly.** Last frame eases into frame 1 (hold ≥1.5s at the resolved state) so the loop
  has no visible "snap."
- **Calm motion.** Ease-in-out, slow. No flashing, no strobe, no >3 flashes/sec. Opacity pulses stay
  gentle (e.g. 0.8 → 1.0, never 0 → 1).
- **Export format:** Animated GIF (universal email support). **Never WebP.** No autoplay video in email.
- **Negative prompt on every AI render:** no purple, no neon, no glitter, no cards, no tarot, no chart
  wheels, no astrology glyphs, no text, no merging two flames into one.

---

## GIF (a) — A single candle flame, breathing *(the "steady presence" cue)*

One candle flame gently breathing — slight height/brightness sway, then a calm hold. The
"someone is here, steady" feeling.

| Spec | Value |
|---|---|
| Dimensions (1×) | **560 × 320** (Template B hero) or **200 × 260** inline |
| Frame rate | 10–12 fps |
| Frame count | ~40–48 frames (~3–4s sway + hold) |
| Duration | ~3.5–4.5s |
| Loop | Infinite, seamless. Gentle hold at full height before easing back. |
| Color palette | 16–24 colors. terracotta/ember flame `#9C4A3C`, gold tips `#C9A24B`, warm dark `#5E2A2C`/paper surround. |
| File-weight budget | **target ≤700KB**, hard cap 1MB |
| Static fallback | `candle-flame.svg` (line-art) or a candle still — frame 1 = full, calm flame |

**alt text:** `A single candle flame, steady.`

**Animation beats (frame 1 = the calm, full flame):**
1. Frame 1 = the flame at full, calm height — a complete candlelit still.
2. Loop body: the flame sways a hair (height ±3–4%), brightness floats **only between ~0.8 and 1.0** — never blinks to 0.
3. A faint warm haze breathes around it on the same slow cycle.
4. Calm hold ~1.5s, ease back to frame 1.

**AI image/video tool prompt:**
> An intimate close-up of one slender candle flame glowing in warm darkness, soft terracotta and ember
> light with delicate gold highlights at the tip, a faint warm haze around it, shallow depth of field,
> painterly editorial photograph, tender and calm, candlelit warmth filling the frame, seamless ~4s loop,
> 560×320. (Negative: purple, neon, glitter, cards, chart wheels, glyphs, text.)

---

## GIF (b) — The cord forming, between two soft light-points *(signature)*

Two soft gold light-points sit apart; a single luminous thread draws itself between them, settles, and a
gentle current-shimmer travels along it once per loop. The thread never snaps taut; the two points never merge.

| Spec | Value |
|---|---|
| Dimensions (1×) | **600 × 300** (Template C hero) |
| Frame rate | 12–15 fps |
| Frame count | ~36–46 frames (~2.5s draw + ~1.5s hold) |
| Duration | ~4s |
| Loop | Infinite. ~1.5–2s hold on the finished cord before easing back to frame 1. |
| Color palette | 16–24 colors. gold `#C9A24B` thread + nodes, faint terracotta glow, ember/paper bg. |
| File-weight budget | **target ≤900KB**, hard cap 1MB |
| Static fallback | `the-cord.svg` (frame 1 MUST equal this completed cord) |

**alt text:** `Two souls joined by a single luminous cord.`

**Animation beats (frame 1 = the finished cord):**
1. Frame 1 = both light-points present with the **completed cord** drawn between them (== `the-cord.svg`).
2. Loop body: the cord "draws on" (stroke-dashoffset reveal) from the warm/bright end toward the dimmer end, ~2.5s, ease-in-out.
3. A soft current-shimmer (1–2 small sparks) travels along the cord once.
4. The two node halos breathe gently (0.85 → 1.0). Calm hold, ease back to frame 1.

**AI image/video tool prompt:**
> Two small softly glowing points of warm gold light suspended in a tender candlelit haze, joined by one
> delicate luminous thread that gently curves between them, one end warmer and brighter than the other,
> intimate and quiet, water-and-flame warmth, soft focus, editorial fine-art, deep ember background,
> seamless ~4s loop, 600×300. (Negative: purple, neon, glitter, cards, glyphs, text, arrows, merging.)

---

## GIF (c) — Tide / current lines drifting *(ambient)*

Three or four long, lazy gold current lines drifting horizontally — a slow tide. Pure ambience; pairs with
any pillar as a banner or behind the kicker.

| Spec | Value |
|---|---|
| Dimensions (1×) | **600 × 140** banner |
| Frame rate | 10–12 fps |
| Frame count | ~50–60 frames (~5–6s loop) |
| Duration | ~5–6s |
| Loop | Infinite, seamless (sub-1px-per-frame drift, no visible seam). |
| Color palette | 16 colors. gold `#C9A24B` lines at low opacity on ember `#5E2A2C` (or paper). |
| File-weight budget | **target ≤500KB**, hard cap 700KB |
| Static fallback | a still gold-on-ember tide field (export frame 1 of this comp, or use `current-tide.svg` baked) |

**alt text:** `A slow gold tide drifting.`

**Animation beats:**
1. Frame 1 = the current lines at rest — a still, legible tide field.
2. The lines drift horizontally, very slowly, offset in phase from each other.
3. Everything else holds still. Mood over motion.

**AI image/video tool prompt:**
> Long, slow horizontal currents of soft gold light drifting across a warm deep-ember field, like a calm
> tide at night, minimal and meditative, fine luminous lines, candlelit warmth, editorial abstract,
> seamless ~5s loop, 600×140. (Negative: purple, neon, glitter, cards, glyphs, text.)

---

## GIF (d) — Two flames leaning toward each other *(handle with care)*

Two candle flames lean gently toward one another in a soft draft and ease back. They **lean, they never
fully merge** — felt-truth (recognition, pull), not a promised reunion. This restraint is the brand's honesty.

| Spec | Value |
|---|---|
| Dimensions (1×) | **560 × 340** (Template B hero, Twin/Karmic) |
| Frame rate | 10–12 fps |
| Frame count | ~40–50 frames (~4s sway) |
| Duration | ~4s |
| Loop | Infinite, seamless. Hold mid-lean, ease back. |
| Color palette | 16–24 colors. twin terracotta/ember flames `#9C4A3C`, gold tips `#C9A24B`, warm dark surround. |
| File-weight budget | **target ≤900KB**, hard cap 1MB |
| Static fallback | a two-flames still — frame 1 = both flames clearly separate, mid-lean |

**alt text:** `Two flames leaning toward each other.`

**Animation beats (frame 1 = two distinct flames):**
1. Frame 1 = the two flames mid-lean but clearly separate — a complete, warm still.
2. They lean gently toward one another (~3–5° sway) and ease back, slow ~4s cycle.
3. They **never touch or merge.** Brightness floats gently (0.85 → 1.0).
4. Calm hold, ease back to frame 1.

**AI image/video tool prompt:**
> Two candle flames close together leaning gently toward one another in warm darkness, terracotta and ember
> light with soft gold tips, tender and intimate, a quiet pull between them, painterly editorial photograph,
> candlelit, shallow depth of field, the two flames near but distinct, seamless ~4s loop, 560×340.
> (Negative: purple, neon, glitter, cards, chart wheels, glyphs, text, merging into one flame.)
