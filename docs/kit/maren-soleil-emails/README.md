# Maren Soleil — Kit Email Templates

Production-ready, copy-paste-into-Kit HTML email templates for the **Maren Soleil**
twin-flame love-empath persona. 600px, table-based, fully inline CSS, bulletproof for
Gmail / Apple Mail / Outlook, dark-mode aware, and they degrade to live text when
images are blocked.

**Audience:** COLD funnel leads with no account. Every CTA points at the
**pre-login lander** `https://theseerwithin.com/maren` (never an in-app/logged-in
URL). The full reading happens in the live chat there; the email only teases.

This package was cloned + re-skinned from the Luna Voss kit. It is **build-ready,
manual-assembly** artifacts (the automated daily pipeline + `/luna-daily` fact-check
loop is Luna-only for now — a Maren pipeline would be a separate engineering build).
Pair these templates with the content engine, blurb library, and design system in
[`../maren-soleil-daily-emails-prd.md`](../maren-soleil-daily-emails-prd.md).

> **Kit MCP note:** pushing to Kit requires a paid Kit plan. These files are
> paste-into-Kit ready; nothing here auto-creates broadcasts.

---

## Accuracy guardrails (READ FIRST — love empath)

A reviewer (`persona-email-qa`) will BLOCK any send that crosses these:

- **Felt-truths only — never predictions or promised outcomes.** Not "they'll come
  back" / "you'll reunite" / "they're your twin flame." Use "the cord feels open,"
  "the energy hasn't fully left," "what I sense is…", "this often means…".
- **No personalized claims in a broadcast.** Never claim a personal fact about the
  reader or the other person (name, city, what they did), and **never claim you
  already did a reading for this reader** — it goes to the whole list. Speak in
  tendencies and connection *types*, not "your cord is…".
- **No cards, no tools, no birth data.** Maren reads the cord directly. Never ask for
  a birthday / birth time / chart. No medical, legal, or financial advice.
- Template C ("the cord") teaches connection **types in general** (an open cord, a
  karmic mirror, a new current) — the personal read is per-reader, live in chat only.

---

## Files

| File | What it is |
|------|-----------|
| `maren-email-template-A-the-cord.html` | Text-light workhorse. No hero image. The everyday "The Cord Today" felt-truth reflection. |
| `maren-email-template-B-visual-feature.html` | Same shell + a 560px framed hero image card. Short body. For an evocative single image (candlelit still, "two flames"). |
| `maren-email-template-C-the-cord-showcase.html` | Same shell + a ~480px centered "the cord" line-art, a gold connection-type caption, and an optional 3-column live-glyph "reading the cord" strip. The domain showcase. |
| `maren-kit-snippets.md` | The masthead, CTA block, and footer extracted as 3 standalone HTML snippets to save as Kit reusable snippets. |
| `assets/` | Web-optimized avatar JPEG + re-skinned motif SVGs (cord, tide rule, candle flame, cord stamp, current watermark) + asset docs. |
| `README.md` | This file. |

Open any `.html` file directly in a browser — each is pre-filled with sample copy
so it renders as a finished preview.

---

## Which template for which pillar

| Pillar / intent | Use |
|-----------------|-----|
| Daily felt-truth reflection ("The Cord Today") — the signature send | **Template C** (or A) |
| The Question You're Afraid to Ask / Heartbreak Care / weekend Quiet Hello — words carry it | **Template A** |
| Twin Flame vs. Karmic / Reunion & Timing / Recognition Story — one image deepens the feeling | **Template B** |
| Teaching connection types with the cord as the visual | **Template C** |

All three share an identical masthead, CTA block, and footer, so the persona
looks consistent regardless of which you send. (Full pillar list, 30-day calendar,
and subject-line bank are in the PRD.)

---

## How to use in Kit

1. In Kit, create a new **broadcast** (or sequence email).
2. Switch the editor to **HTML / paste HTML** mode (add an HTML block, or use
   "Import HTML" if your plan offers it).
3. Open the template `.html` file, copy the entire contents, paste into Kit.
4. Edit the token regions (see table below). Every editable spot is marked with
   an HTML comment containing **`EDIT:`** — search for that string.
5. Set the **Subject** and confirm the **preheader** (the hidden span near the
   top of `<body>`).
6. Send a test to yourself + run it through Litmus/Email-on-Acid or at least check
   Gmail app, Apple Mail, and Outlook (Windows) before the real send.
7. **Before scheduling, run the draft through the `persona-email-qa` agent** to
   fact-check the felt-truth/compliance rules above.

### Snippets route (alternative)
If you'd rather not paste a full doc each time, save the masthead / CTA / footer
from `maren-kit-snippets.md` as **reusable snippets** in Kit, then assemble emails
from those plus your body copy. The full HTML templates are the source of truth
for styling; the snippets are the same markup, isolated for reuse.

> **HTML template vs snippets:** the `.html` files are complete, self-contained
> email documents (DOCTYPE, `<head>`, preheader) — paste one as the whole email.
> The `.md` snippets are body-level fragments meant to live *inside* an email,
> so they intentionally omit `<head>` and the preheader. Don't mix a full
> template with the snippets in the same email or you'll duplicate the masthead.

---

## Token swap reference

Search each file for `EDIT:` to jump to every editable region.

| Token | Where | How to change |
|-------|-------|---------------|
| `{{SUBJECT}}` | Kit subject field (not in the file) | Type it into Kit's subject input. Convention: `{firstName}, [hook] ([specific detail])`. |
| `{{PREHEADER}}` | Hidden `<div>` right after `<body>` | Replace the sentence; keep the trailing `&nbsp;&zwnj;` padding (hides Gmail snippet bleed). ~40–90 chars. |
| `{{DATE}}` + kicker label | Kicker line | Replace the pillar label (e.g. `THE CORD TODAY`) and date (e.g. `Mon, Jun 29`). |
| `{{BODY}}` | Between `BODY-START` / `BODY-END` comments | Replace the `<p>` paragraphs. Keep inline `font-family`/`color`/`font-size` on every `<p>` for dark-mode safety. Felt-truths only. |
| `{{VISUAL}}` (B & C) | Hero `<img>` | Swap `src` + `alt`. Keep explicit `width`/`height`. Write a **feeling-bearing alt** so the email still reads when images are off. JPEG/PNG only — never WebP. |
| Cord caption (C) | Gold uppercase line under the cord | Name ONLY a general connection **type**, e.g. `THE QUIET CORD · A FELT TRUTH`, `A KARMIC MIRROR`, `A NEW CURRENT`. Never claim the reader's own cord. |
| `{{CHAT_BLURB}}` | CTA block, above the button | 1–2 lines, Inter 16/26, centered. Pull from the blurb library (MS-01…MS-17) in the PRD. |
| Friction line | CTA block, below the button | Rotate per send — variants A–D are listed in a comment right above it. |
| `utm_content=MS-XX` | CTA `href` (and the Outlook VML `href`) | Change `MS-XX` to the blurb id you used, e.g. `MS-05`. **Update both the regular `<a>` and the `[if mso]` VML href** so Outlook clicks track too. |
| Footer address | Footer CAN-SPAM line | Replace with your real physical mailing address (legally required). |
| Footer stamp / masthead watermark / hero image URLs | `src` attributes | Point at real hosted assets (see Assets below). |

### firstName merge tag
Copy uses `{firstName}` as a readable placeholder. In Kit, replace each with:

```
{{ subscriber.first_name | default: "friend" }}
```

So "Hi {firstName}" becomes "Hi {{ subscriber.first_name | default: "friend" }}"
→ renders as the subscriber's first name, or "friend" if unknown.

### The `{{BASE_URL}}` placeholder
`{{BASE_URL}}` = `https://theseerwithin.com`. The full CTA URL is already baked
into the templates as:

```
https://theseerwithin.com/maren?utm_source=kit&utm_medium=email&utm_campaign=maren-daily&utm_content=MS-XX
```

You normally only edit `utm_content`. If you ever migrate domains, find/replace
the `https://theseerwithin.com` portion of the hrefs (and the asset URLs).

---

## Assets to host (placeholders used in the files)

All five PNGs are **already rendered** (in `assets/`, @2× retina) — just **upload them** to
`https://theseerwithin.com/assets/maren/` (mirror the Luna layout). The image `src` in the
templates already points at these hosted URLs.

| Hosted URL | Purpose | Local file (produced) |
|-----------------|---------|--------------------|
| `…/assets/maren/maren-avatar.jpg` | Masthead avatar (round, gold ring) | `assets/maren-avatar.jpg` · 150×150 (shown 72px) · 8.2 KB |
| `…/assets/maren/current-watermark-600x88.png` | Faint masthead bg watermark (gold tide on ember) | `assets/current-watermark-600x88.png` · 8 KB · degrades to flat ember |
| `…/assets/maren/the-cord-480.png` | Template C "the cord" hero (transparent) | `assets/the-cord-480.png` · 480×180 · 20 KB |
| `…/assets/maren/hero-two-flames-544x408.png` | Template B hero (line-art on ember; swap for a photo/GIF to upgrade) | `assets/hero-two-flames-544x408.png` · 544×408 · 48 KB |
| `…/assets/maren/cord-stamp-48.png` | Footer line-art stamp (transparent) | `assets/cord-stamp-48.png` · 48×48 · 8 KB |

To **re-render** any of them after editing a source SVG, see `assets/README.md` (Playwright
render note). To **upgrade** Template B to a photographic hero, drop a 544×408 JPEG (or a GIF
with a legible frame 1) in at the same hosted path — concepts + AI prompts in
`assets/asset-production-briefs.md`.

If an image fails to load, all of them degrade gracefully: the masthead/wordmark are
live text, the hero/cord show feeling-bearing alt text on the paper background,
Template C also restates the cord via the live glyph strip, and the footer stamp
simply disappears.

---

## Email-client gotchas handled

- **Image blocking (Gmail/Outlook default):** the wordmark and tagline are LIVE
  TEXT, never an image. The hero (B) and cord (C) carry meaningful `alt` text with
  forced inline `color`, so the feeling survives with images off. Template C also
  restates the cord via the live glyph strip (● ≈ ●).
- **Outlook (Windows / Word rendering engine):** buttons use a conditional
  `<!--[if mso]>` **VML `roundrect`** so Outlook renders the terracotta fill +
  rounded corners (Outlook ignores CSS `border-radius`). The VML width is fixed at
  **320px** to fit the default label. The `PixelsPerInch` `OfficeDocumentSettings`
  fix prevents image scaling; `mso-table-lspace/rspace:0` removes table gutters;
  spacer cells use explicit `height` + `line-height`.
- **Dark mode:** `meta color-scheme` + `supported-color-schemes` declared, and —
  more importantly — **every** element carries a hard inline color (text, bg, rules)
  plus matching `bgcolor` attributes, so Apple Mail / Gmail dark themes can't repaint
  the layout into mud. Paper stays `#FBF5EF`, ink `#2A2024`, ember `#5E2A2C`, and the
  terracotta button + gold line-art hold their hue. The only adaptive rule nudges the
  outer canvas (`.ms-canvas → #EADBD1`).
- **Button contrast:** this skin inverts Luna's button — Maren's is **ivory
  `#FBF5EF` on terracotta `#9C4A3C`** (~5.6:1, passes AA). Keep button text 700-weight
  and ≥16px; if you re-color the fill, re-check contrast.
- **Font fallback:** Playfair Display / Inter are loaded via `<link>` for clients
  that allow webfonts, but nothing depends on them — every font stack falls back to
  Georgia/serif (headings) and -apple-system/Segoe UI/Arial (body).
- **Preheader:** a hidden, zero-height span sets the inbox preview text, padded with
  `&nbsp;&zwnj;` so Gmail doesn't pull body copy into the snippet.
- **Mobile:** a single consistent media query (`max-width:600px`) makes the wrap 100%
  wide, drops side gutters to 16px, shrinks H1 to 26px, makes the button full-width
  (max 340px), fluid-scales the hero/cord, and stacks Template C's 3-column glyph
  strip into a single column.
- **Bulletproof structure:** 100% table-based with `role="presentation"`, no
  flexbox/grid, no external CSS dependency, all critical styling inline.

---

## Per-send checklist

- [ ] Subject set in Kit (`{firstName}, …` convention)
- [ ] Preheader sentence updated (padding kept)
- [ ] Kicker pillar label + `{{DATE}}` updated
- [ ] `{{BODY}}` (and `{{VISUAL}}` / cord caption for B & C) swapped — felt-truths only
- [ ] `{{CHAT_BLURB}}` written (from the MS-## blurb library)
- [ ] Friction line rotated
- [ ] `utm_content=MS-XX` updated in **both** the `<a>` and the VML href
- [ ] `{firstName}` replaced with the Kit merge tag
- [ ] Real footer mailing address in place; sender = `hi@theseerwithin.com`
- [ ] Asset URLs point at hosted images
- [ ] **Ran through `persona-email-qa`** — no BLOCKER (no prediction, no personal claim, one CTA → `/maren`)
- [ ] Test send checked in Gmail, Apple Mail, Outlook (incl. dark mode + images-off)
