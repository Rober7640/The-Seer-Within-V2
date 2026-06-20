# Luna Voss — Animated Hero Production Briefs

Brand: **Luna Voss** — modern astrologer. Tagline **"Your Natal Chart, Decoded."**
Aesthetic: **editorial almanac / vintage star atlas**, NOT mystic gift shop. Thin brass line-art
(~1.25px stroke), warm paper, ink-dark. Calm, unhurried, never strobing.

### Brand palette (use these exact hex everywhere)
| Token | Hex |
|---|---|
| ink | `#1C2230` |
| paper / cream | `#FBF7F0` |
| brass | `#B6863C` |
| brass-deep | `#8A6326` |

### Universal rules (apply to ALL four GIFs)
- **Frame 1 carries the message.** Outlook (Word rendering engine) and many corporate/mobile
  clients show ONLY the first frame of a GIF. Frame 1 must equal the finished, legible art — never
  a blank canvas, never a mid-animation state. Build the animation *backwards from* the static
  fallback so frame 1 == fallback.
- **Decorative, never load-bearing.** No GIF may contain text that carries the email's message.
  All headlines/CTAs/offer live as real HTML text beside the asset. Animation supports, never speaks.
- **Author at 2×, export at 1×.** Compose at double the listed pixel dimensions for crispness, then
  downscale on export. Listed dimensions below are the *delivered* (1×) size.
- **Weight budget: ≤1MB hard cap per GIF; target listed per concept.** Reduce palette before
  reducing frames. Prefer fewer colors (16–32) and flat brass-on-solid over gradients/dither.
- **Loop seamlessly.** Last frame must blend into frame 1 (hold or ease) so the loop has no visible
  "snap." Use a calm hold (≥1.5s) at the resolved state before looping.
- **Calm motion.** Ease-in-out, slow. No flashing, no strobe, no >3 flashes/sec anywhere
  (accessibility + deliverability). Opacity pulses stay gentle (e.g. 0.5 → 1.0, never 0 → 1).
- **Export format:** Animated GIF (universal email support). Optionally also ship an APNG/WebP for
  modern clients, but GIF is the canonical deliverable. No autoplay video in email.

---

## GIF 1 — Constellation drawing itself (signature motif)

The hero of the brand. Dots appear, brass lines connect them into the signature shape, a soft
sparkle blooms, then a calm hold before the loop.

| Spec | Value |
|---|---|
| Dimensions (1×) | **560 × 360** |
| Frame rate | 12–15 fps |
| Frame count | ~30–38 frames (≈2.5s draw + ~2s hold) |
| Duration | ~4–4.5s total (≈2s active draw, ~2s hold) |
| Loop | Infinite, seamless. Hold ~2s on completed shape, then crossfade/cut back to frame 1. |
| Color palette | 16–24 colors. brass `#B6863C`, brass-deep `#8A6326` accents, on transparent OR paper `#FBF7F0`. |
| File-weight budget | **target ≤500KB**, hard cap 700KB |
| Static fallback | `constellation.svg` (frame 1 MUST equal this completed shape) |

**alt text:** `Luna Voss — your stars, connected into your chart`

**Animation beats (build so frame 1 = finished art):**
1. Frame 1 = fully drawn constellation (== `constellation.svg`). This is the Outlook frame.
2. Loop body: dots fade/pop in one-by-one (gentle scale 0.6→1, ~80–120ms each, staggered).
3. Brass lines "draw on" between dots in sequence (stroke-dashoffset reveal), 1.25px, ease-in-out.
4. Two anchor stars get a soft halo ring expand + the small 4-point sparkle blooms once.
5. ~2s calm hold on the completed shape, then ease back to frame 1.

### Production route (i) — AI image/video tool prompt
> Minimalist line-art animation of a star constellation drawing itself. Thin metallic brass-gold
> lines (#B6863C, ~1.25px) on a warm off-white paper background (#FBF7F0). Eight to ten small
> gold star-dots appear softly one by one, then delicate hairline gold lines connect them into a
> loose asymmetric constellation. A single quiet 4-point sparkle blooms at the end. Vintage star
> atlas / editorial almanac aesthetic, NOT mystical, NO purple, NO neon, NO glitter dust. Calm,
> unhurried, elegant, engraving-like. Flat 2D, clean negative space. Seamless loop, ~4 seconds.
> 560x360. Limited gold-and-paper color palette. (Negative: purple, blue glow, neon, lens flare,
> 3D, glitter, busy background, text.)

### Production route (ii) — After Effects / Lottie
- **Layers:** `bg` (paper or transparent), `dots` (10 shape-layer circles, brass fill), `lines`
  (one shape layer per connecting segment with a Trim Paths modifier), `sparkle` (4-point star),
  `halo` (two stroked circles).
- **Animation:** Stagger each dot's Scale (0→100, ease) and Opacity on a 2–3 frame offset.
  Drive each `lines` segment with **Trim Paths > End 0%→100%** in draw order (ease-in-out).
  `halo` Scale 60%→110% + Opacity 0→50%→0. `sparkle` Scale + Opacity single bloom.
- **Hold:** Freeze final state ~2s.
- **Export:** Render lossless → GIF via export pipeline (e.g. Photoshop "Save for Web", 16–24
  color adaptive palette, no dither). Frame 1 of the comp = the completed shape so the GIF's first
  frame is the fallback art. For Lottie: keep stroke vectors, ship `.json` only where Lottie is
  supported (web), but GIF remains the email deliverable.

---

## GIF 2 — Slow moon-phase loop

A quiet cycle through the lunar phases. Editorial, almost clockwork — like a page in an almanac.

| Spec | Value |
|---|---|
| Dimensions (1×) | **480 × 160** |
| Frame rate | ~2 fps effective (cross-dissolve between 8 key phases) |
| Frame count | 8 key phases (new → waxing → full → waning → new), ~16–24 rendered frames with dissolves |
| Duration | ~4s for a full cycle |
| Loop | Infinite, seamless (phase 8 waning-crescent flows back into phase 1 new). |
| Color palette | 16 colors. brass `#B6863C` edge + lit fill, on ink `#1C2230`. brass-deep `#8A6326` terminator shading. |
| File-weight budget | **target ≤300KB**, hard cap 500KB |
| Static fallback | `moon-phases.svg` — show the SINGLE circle matching the current real moon phase (crop/select), or the full row. |

**alt text:** `Tonight's moon phase — read by Luna Voss`

**Animation beats:**
1. Frame 1 = the current real moon phase (the static fallback the recipient would see today).
2. The lit portion sweeps slowly: new → waxing crescent → first quarter → waxing gibbous → full →
   waning gibbous → last quarter → waning crescent → back to new.
3. Terminator (light/dark boundary) glides smoothly via mask, brass-edged rim stays constant.
4. Optional: a single faint star-dot beside the moon holds steady (no twinkle, keeps it calm).

### Production route (i) — AI image/video tool prompt
> Slow elegant loop of the moon cycling through its phases, left to right lighting sweep. A single
> moon with a thin brass-gold rim (#B6863C) and warm gold lit surface, sitting on a deep ink-navy
> background (#1C2230). The illuminated portion glides smoothly from new moon to full moon to new
> again. Vintage almanac / star-atlas engraving feel, NOT cartoon, NO purple, NO neon glow, NO
> craters detail noise. Minimal, calm, clockwork-quiet. Flat 2D, seamless loop ~4 seconds, 480x160
> wide format. Limited gold-on-navy palette. (Negative: purple, neon, glitter, realistic photo
> texture, text, multiple moons.)

### Production route (ii) — After Effects / Lottie
- **Layers:** `bg` (ink fill), `moonRim` (brass stroked circle), `litFill` (brass-filled circle),
  `terminatorMask` (a second circle/ellipse used as an animated mask on `litFill`).
- **Animation:** Animate the mask circle's X position / scale to carve the lit area from full-right
  through full through full-left — i.e. sweep the terminator. Keep `moonRim` constant. Linear-ish,
  very slow. Add subtle brass-deep `#8A6326` along the terminator edge for depth.
- **Loop:** 8 evenly-timed keyframe phases; ensure phase-8 == approach to phase-1.
- **Export:** GIF, 16-color palette, no dither (flat fills compress tiny). Confirm frame 1 = a real
  recognizable phase (ideally generated daily/server-side to match tonight's sky if templating
  allows; otherwise ship a "full moon" frame-1 as a safe, attractive default).

---

## GIF 3 — Chart wheel assembling

The natal wheel builds itself: empty ring settles, planet markers click onto their houses one by
one, resolving to the finished wheel. Tactile, instrument-like.

| Spec | Value |
|---|---|
| Dimensions (1×) | **360 × 360**, transparent background |
| Frame rate | 12–15 fps |
| Frame count | ~36–45 frames (≈3s assemble + ~1.5s hold) |
| Duration | ~4.5s total |
| Loop | Infinite. ~1.5–2s hold on finished wheel before easing back to frame 1. |
| Color palette | 16–24 colors. brass `#B6863C` rings/spokes/glyphs, brass-deep `#8A6326` planet dots, transparent bg. |
| File-weight budget | **target ≤450KB**, hard cap 700KB |
| Static fallback | `chart-wheel.svg` (frame 1 MUST equal this finished wheel) |

**alt text:** `Luna Voss assembles your natal chart`

**Animation beats (frame 1 = finished wheel):**
1. Frame 1 = completed chart wheel (== `chart-wheel.svg`). Outlook sees the finished art.
2. Loop body: outer + inner rings draw on (stroke reveal) and the whole wheel rotates a gentle ~30°
   then settles (overshoot + ease-back, like an instrument seating into place).
3. 12 spokes sweep in radially.
4. Zodiac glyphs fade in around the ring.
5. Planet dots "click" onto their house positions one by one (small scale pop + faint tick).
6. Center node lands last; ~1.5–2s calm hold; ease back to frame 1.

### Production route (i) — AI image/video tool prompt
> Line-art animation of an astrological natal chart wheel assembling itself. Thin brass-gold
> concentric circles (#B6863C, ~1.25px), twelve radial spokes dividing it into houses, a ring of
> small zodiac glyphs, and a few small gold planet dots. The empty ring appears and rotates gently
> about 30 degrees, settling into place; spokes sweep in; zodiac glyphs fade on; small gold planet
> markers click onto their positions one by one. Transparent background. Vintage astronomical
> instrument / star-atlas engraving aesthetic, precise and calm, NOT mystical, NO purple, NO neon,
> NO glow. Flat 2D, elegant, seamless loop ~4.5s, 360x360 square. (Negative: purple, neon, glow,
> 3D, glitter, busy texture, text, watermark.)

### Production route (ii) — After Effects / Lottie
- **Layers:** `rings` (4 stroked circles), `spokes` (12 lines), `glyphs` (12 text/path layers),
  `planets` (7 dots), `center` (dot). Parent rings+spokes+glyphs to a single null for the rotate.
- **Animation:** Null Rotation 0°→-30°→0° with overshoot ease (settle). `rings`/`spokes` via Trim
  Paths End 0→100. `glyphs` Opacity 0→100 staggered. Each `planets` dot: Scale 0→120→100 pop on a
  staggered offset (the "click"). `center` lands last.
- **Hold:** Freeze ~1.5–2s.
- **Export:** GIF on transparent bg — set matte to paper `#FBF7F0` (the email body color) to avoid
  ugly anti-alias halos, since GIF transparency is 1-bit. If the email background is ink in dark
  contexts, ship a second matte. Frame 1 of comp = finished wheel.

---

## GIF 4 — "Today's transit" minimal sky

A near-still warm-dark sky. One or two stars breathe (gentle opacity pulse). One shooting line
crosses per loop. The "ambient" hero — barely moves, sets a mood.

| Spec | Value |
|---|---|
| Dimensions (1×) | **560 × 280** |
| Frame rate | 10–12 fps |
| Frame count | ~50–60 frames (~5s loop) |
| Duration | ~5s |
| Loop | Infinite, seamless. Shooting line crosses once per loop, well inside the loop (not at the seam). |
| Color palette | 16–24 colors. ink `#1C2230` sky, brass `#B6863C` / brass-deep `#8A6326` stars + streak. |
| File-weight budget | **target ≤500KB**, hard cap 700KB (large flat ink area compresses well) |
| Static fallback | **`night-sky.png`** — a static warm-dark sky with brass stars (PNG, paper/ink, no streak). *(Asset to be produced; not part of the SVG set.)* |

**alt text:** `Today's transit over Luna Voss`

**Animation beats:**
1. Frame 1 = the still night sky (== `night-sky.png` fallback), no streak visible.
2. 1–2 chosen stars pulse opacity gently (0.5 → 1.0 → 0.5), slow, offset from each other.
3. Once per loop a single thin brass shooting-line streaks diagonally across and fades.
4. Everything else holds still. Mood over motion.

### Production route (i) — AI image/video tool prompt
> A calm, nearly-still night sky. Deep warm ink-navy background (#1C2230) with a sparse scatter of
> small brass-gold stars (#B6863C). One or two stars breathe with a slow, gentle brightness pulse.
> A single thin gold shooting star streaks slowly across the frame once and fades. Vintage star
> atlas / editorial almanac mood, restrained and elegant, NOT mystical, NO purple, NO neon, NO
> heavy bloom, NO busy galaxy. Flat, minimal, lots of dark negative space. Seamless loop ~5s,
> 560x280. Limited gold-on-ink palette. (Negative: purple, nebula, neon, lens flare, milky way,
> glitter, text, fast motion.)

### Production route (ii) — After Effects / Lottie
- **Layers:** `sky` (ink solid), `stars` (small brass dots, mostly static), `pulseStars` (1–2 dots
  with animated Opacity), `streak` (thin brass line/trim-path with a soft tail).
- **Animation:** `pulseStars` Opacity 50%→100%→50% on a slow ~2–3s cycle, offset between the two.
  `streak` appears once: Trim Paths Start+End sweep diagonally across, with Opacity fade-out tail;
  schedule it mid-loop so it never lands on the loop seam. Optional 1–2px overall position drift = 0
  (keep still).
- **Export:** GIF, 16–24 colors. Big flat ink area keeps weight low even at 5s. Frame 1 = still sky
  with NO streak (matches the PNG fallback). Note: produce `night-sky.png` from frame 1 of this comp
  for a guaranteed visual match.
