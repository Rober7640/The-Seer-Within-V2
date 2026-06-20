# Luna Voss — Email Visual Assets

Visual-asset package for the **Luna Voss** astrologer email templates.
Tagline: **"Your Natal Chart, Decoded."**

**Aesthetic:** editorial almanac / vintage star atlas — NOT mystic gift shop. Thin brass line-art
(~1.25px stroke), warm paper, ink-dark. Calm, unhurried, never strobing.

### Brand palette (exact)
| Token | Hex |
|---|---|
| ink | `#1C2230` |
| paper / cream | `#FBF7F0` |
| brass | `#B6863C` |
| brass-deep | `#8A6326` |

No purple, no glitter, no neon.

---

## Asset inventory

| File | Type | Dimensions | Static / Animated | Where used (email template) |
|---|---|---|---|---|
| `luna-avatar.jpg` | Photo (web-optimized JPEG, q78) | 150 × 150 (shown 72px, round) | Static · **8.3 KB** | **Masthead of all templates** — Luna's face in a brass-ring circle. Source: `uploads/avatars/hi-def/luna.png` |
| `chart-wheel.svg` | Static SVG (line-art) | 340 × 340 | Static — also fallback for GIF 3 | **Template C hero** (natal-chart reveal) |
| `constellation.svg` | Static SVG (signature motif) | 560 × 360 | Static — also fallback for GIF 1 | Templates A & B hero / signature motif block |
| `moon-phases.svg` | Static SVG (phase row) | 480 × 160 | Static — also fallback for GIF 2 | "Tonight's moon" / almanac strip; phase callouts |
| `gold-rule.svg` | Static SVG (divider) | 120 × 16 | Static | Section divider in all templates |
| `wordmark-mark.svg` | Static SVG (stamp) | 48 × 48 | Static | Footer brand stamp in all templates |
| `asset-production-briefs.md` | Doc | — | — | Briefs to produce the 4 animated hero GIFs |
| *(GIF 1)* constellation drawing | Animated GIF (to produce) | 560 × 360 | Animated → fallback `constellation.svg` | Signature hero (A / B) |
| *(GIF 2)* moon-phase loop | Animated GIF (to produce) | 480 × 160 | Animated → fallback `moon-phases.svg` | Almanac / "tonight's moon" strip |
| *(GIF 3)* chart wheel assembling | Animated GIF (to produce) | 360 × 360 | Animated → fallback `chart-wheel.svg` | Template C hero |
| *(GIF 4)* today's transit sky | Animated GIF (to produce) | 560 × 280 | Animated → fallback `night-sky.png` (to produce) | Ambient / "today's transit" block |

All SVGs: valid standalone files, transparent background, brass `#B6863C` strokes, no external
dependencies — render correctly when opened directly in a browser.

---

## Production rules

### 1. Weight budget — ≤1MB per GIF
Hard cap **1MB per animated GIF**; per-concept targets are lower (see briefs: 300–500KB targets).
Reduce **palette first** (16–32 colors, flat brass-on-solid), then frame count. Avoid gradients and
dither. Large flat ink/paper areas compress well — lean on negative space.

### 2. Author at 2×, downscale
Compose every animated asset (and any raster) at **2× the delivered dimensions** for crispness on
retina/high-DPI screens, then **downscale on export** to the 1× sizes listed above. SVGs are
resolution-independent and already scale cleanly.

### 3. Every key message stays in live HTML text
Assets are **decorative / supportive, never load-bearing for the message.** Headlines, offers, CTAs,
dates, and any words the reader must act on live as real, selectable HTML text in the email body —
never baked into an SVG/GIF/PNG. If images are blocked, the email must still read and convert fully.

### 4. Frame 1 carries the message (animated assets)
Email clients like Outlook (Word engine) and many mobile/corporate clients render **only the first
frame** of a GIF. Therefore frame 1 of every GIF MUST equal its finished static fallback (the
completed, legible art) — never a blank or mid-animation state. Build animations backwards from the
fallback. Full per-asset specs and production routes are in `asset-production-briefs.md`.
