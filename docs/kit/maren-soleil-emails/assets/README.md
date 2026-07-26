# Maren Soleil — Email Visual Assets

Visual-asset package for the **Maren Soleil** twin-flame love-empath email templates.
Tagline: **"Twin Flame Oracle · Love Empath."**

**Aesthetic:** intimate, warm, water-and-flame — candlelit and tender, editorial but
emotional. NOT gift-shop mystical, NOT neon. Thin gold line-art (~1.25px stroke), warm
ivory paper, deep ember masthead. Calm, unhurried, never strobing. The throughline:
**two points, one connecting current** — cord, thread, tide, flame. No cards, no wheels,
no astrology glyphs.

### Brand palette (exact)
| Token | Hex |
|---|---|
| canvas (outer) | `#F1E4DC` |
| paper / ivory | `#FBF5EF` |
| masthead band (ember) | `#5E2A2C` |
| ink | `#2A2024` |
| soft text | `#6B5550` |
| accent gold | `#C9A24B` |
| terracotta / "flame" (button) | `#9C4A3C` |
| link / deep terracotta | `#8A3D34` |
| footer muted | `#9A8B82` |

No purple, no glitter, no neon. Line-art motifs use accent gold `#C9A24B`.

---

## Asset inventory

| File | Type | Dimensions | Static / Animated | Where used (email template) |
|---|---|---|---|---|
| `maren-avatar.jpg` | Photo (web-optimized JPEG, q78) | 150 × 150 (shown 72px, round) | Static · **8.2 KB** | **Masthead of all templates** — Maren's face in a gold-ring circle. Source: `uploads/avatars/hi-def/maren.png` |
| `the-cord.svg` | Static SVG (signature motif) | 480 × 180 | Static — also fallback for GIF "cord forming" | **Template C hero** (two souls joined by one cord) |
| `tide-rule.svg` | Static SVG (divider) | 120 × 16 | Static | Section divider; the gold hairline becomes a gentle tide at center |
| `candle-flame.svg` | Static SVG (accent) | 40 × 64 | Static — also fallback for GIF "candle breathing" | "Warmth/flame" accent; Template A optional accent |
| `cord-stamp.svg` | Static SVG (stamp) | 48 × 48 | Static | Footer brand stamp in all templates (replaces Luna's natal-wheel) |
| `current-tide.svg` | Static SVG (watermark source) | 600 × 88 | Static | **Bake on ember** → `current-watermark-600x88.png` for the masthead background |
| `asset-production-briefs.md` | Doc | — | — | Briefs to produce the animated hero GIFs + static fallbacks |
| *(GIF a)* candle flame breathing | Animated GIF (to produce) | 560 × 320 | Animated → fallback `candle-flame.svg` / a candle still | Template B hero / ambient warmth |
| *(GIF b)* the cord forming | Animated GIF (to produce) | 600 × 300 | Animated → fallback `the-cord.svg` | Template C hero |
| *(GIF c)* tide / current drifting | Animated GIF (to produce) | 600 × 140 | Animated → fallback a still tide field | Banner / behind the kicker |
| *(GIF d)* two flames leaning | Animated GIF (to produce) | 560 × 340 | Animated → fallback a two-flames still | Template B hero (Twin/Karmic) |

All SVGs: valid standalone files, transparent background (except `current-tide.svg` /
`current-watermark.svg` / `hero-two-flames.svg`, which bake an ember background), gold
`#C9A24B` strokes, no external dependencies — render correctly when opened directly in a browser.

### Rendered PNGs (already produced — ready to host)

These were rendered from the source SVGs at **2× retina** (via Playwright/chromium) and are what
the templates' `src` attributes point at. Just upload them to `/assets/maren/`.

| PNG file | From SVG | Size | Used by |
|---|---|---|---|
| `the-cord-480.png` (transparent, 960×360 px) | `the-cord.svg` | 20 KB | Template C hero |
| `hero-two-flames-544x408.png` (ember, 1088×816 px) | `hero-two-flames.svg` | 48 KB | Template B hero (line-art default) |
| `cord-stamp-48.png` (transparent, 96×96 px) | `cord-stamp.svg` | 8 KB | Footer stamp (all templates) |
| `current-watermark-600x88.png` (ember, 1200×176 px) | `current-watermark.svg` | 8 KB | Masthead watermark (all templates) |

**Re-render after editing a source SVG** — a tiny Playwright script renders an SVG element to PNG
at `deviceScaleFactor: 2` with `omitBackground: true`. Pattern: load the SVG markup into a page,
`page.$('svg')`, `el.screenshot({ path, omitBackground:true })`. (Playwright/chromium is already a
project dependency.) Template B's `hero-two-flames-544x408.png` is the on-brand line-art default —
swap in a 544×408 photographic JPEG or a legible-frame-1 GIF to upgrade (briefs below).

### Hosting paths
Host under `https://theseerwithin.com/assets/maren/` to match the template `src`
attributes:
- `maren-avatar.jpg`
- `current-watermark-600x88.png` (baked from `current-tide.svg` on ember)
- `the-cord-480.png` (from `the-cord.svg`, transparent)
- `cord-stamp-48.png` (from `cord-stamp.svg`, transparent)
- per-send hero JPEG/GIFs under `/assets/maren/heroes/…`
Reference with absolute `https://` URLs (Kit blocks relative paths).

---

## Production rules

### 1. Weight budget — ≤1MB per GIF
Hard cap **1MB per animated GIF**; per-concept targets are lower (see briefs:
300–900KB targets). Reduce **palette first** (16–32 colors, flat gold/terracotta on
warm dark), then frame count. Avoid gradients and dither. Large flat ember/paper areas
compress well — lean on negative space and candlelit darkness.

### 2. JPEG/PNG only for raster — never WebP
JPEG = universal email support; WebP is not reliably supported in email clients. Static
heroes ship as JPEG (photographic) or transparent PNG (line-art). Animation ships as GIF.

### 3. Author at 2×, downscale
Compose every animated asset (and any raster) at **2× the delivered dimensions** for
crispness on retina/high-DPI screens, then **downscale on export** to the 1× sizes
listed above. SVGs are resolution-independent and already scale cleanly.

### 4. Every key message stays in live HTML text
Assets are **decorative / supportive, never load-bearing for the message.** Headlines,
the offer, CTAs, dates, and any words the reader must act on live as real, selectable
HTML text in the email body — never baked into an SVG/GIF/PNG. If images are blocked,
the email must still read and convert fully.

### 5. Frame 1 carries the message (animated assets)
Email clients like Outlook (Word engine) and many mobile/corporate clients render
**only the first frame** of a GIF. Therefore frame 1 of every GIF MUST equal its
finished static fallback (the completed, legible art) — never a blank or mid-animation
state. Build animations backwards from the fallback.

### 6. Calm motion only
Ease-in-out, slow. No strobe, no >3 flashes/sec. Opacity pulses stay gentle
(e.g. 0.8 → 1.0, never 0 → 1). The brand is candlelight, not fireworks. For the
"two flames" concept, the flames **lean but never fully merge** — felt-truth
(recognition), not a promised reunion.
