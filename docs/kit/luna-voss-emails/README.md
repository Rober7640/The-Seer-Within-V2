# Luna Voss — Kit Email Templates

Production-ready, copy-paste-into-Kit HTML email templates for the **Luna Voss**
modern-astrologer persona. 600px, table-based, fully inline CSS, bulletproof for
Gmail / Apple Mail / Outlook, dark-mode aware, and they degrade to live text when
images are blocked.

**Audience:** COLD funnel leads with no account. Every CTA points at the
**pre-login lander** `https://theseerwithin.com/luna` (never an in-app/logged-in
URL).

---

## Generating emails — two ways

**A) Automated pipeline (recommended).** The whole email is generated for you — accurate sky data, Luna-voiced copy, a rotating CTA, and a per-day **sky map** — with no token editing by hand. Output lands in `outbox/`.

- **One batch:** `npm run luna:batch -- 2026-07-01 14` → writes send-ready `outbox/<date>.html` + `outbox/img/<date>.png` + `outbox/INDEX.md`. (Needs `.env` with `ANTHROPIC_API_KEY`; renders sky maps via the already-installed chromium.)
- **Helpers:** `npm run luna:calendar -- 2026-07-01 14` (preview the day-picker), `npm run luna:sky -- 2026-07-01` (raw sky JSON).
- **Full run incl. fact-check:** use the **`/luna-daily` skill** in Claude Code — it generates, runs the `persona-email-qa` gate on each, triages blockers, and reports which are send-ready.
- Then paste each `outbox/<date>.html` into a Kit broadcast, set the Subject from `INDEX.md`, and upload the matching `img/<date>.png`.
- How it works (code map): [`../luna-voss-daily-emails-engineering.md`](../luna-voss-daily-emails-engineering.md). Product spec: [`../luna-voss-daily-emails-prd.md`](../luna-voss-daily-emails-prd.md).

Generated emails use **template C** (chart-wheel) with the per-day sky map.

**B) Manual token-swap (one-offs).** Hand-edit a template `.html` below — useful for a one-off or a non-daily send, and lets you pick template A/B/C yourself. The rest of this README documents that route.

---

## Files

| File | What it is |
|------|-----------|
| `luna-email-template-A-daily-sky.html` | Text-light workhorse. No hero image. The everyday "today's sky" send. |
| `luna-email-template-B-visual-feature.html` | Same shell + a 560px framed hero image card. Short body. For a single message-bearing visual. |
| `luna-email-template-C-chart-wheel.html` | Same shell + a ~340px centered chart-wheel image, brass aspect caption, and an optional 3-column live-glyph "reading the wheel" strip. The pipeline fills this one. |
| `luna-kit-snippets.md` | The masthead, CTA block, and footer extracted as 3 standalone HTML snippets to save as Kit reusable snippets. |
| `outbox/` | **Generated** send-ready emails from the pipeline: `<date>.html` + `img/<date>.png` + `INDEX.md`. |
| `README.md` | This file. |

Open any `.html` file directly in a browser — each is pre-filled with sample copy
so it renders as a finished preview.

---

## Which template for which pillar

| Pillar / intent | Use |
|-----------------|-----|
| Daily transit / "today's sky" — fast, text-forward | **Template A** |
| Emotional hook carried by one strong image (vibe shot, "almost people", sky photo) | **Template B** |
| Teaching one specific aspect, with the chart wheel as the visual proof | **Template C** |

All three share an identical masthead, CTA block, and footer, so the persona
looks consistent regardless of which you send.

---

## How to use in Kit (HTML template route)

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

### Snippets route (alternative)
If you'd rather not paste a full doc each time, save the masthead / CTA / footer
from `luna-kit-snippets.md` as **reusable snippets** in Kit, then assemble emails
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
| `{{SUBJECT}}` | Kit subject field (not in the file) | Type it into Kit's subject input. |
| `{{PREHEADER}}` | Hidden `<div>` right after `<body>` | Replace the sentence; keep the trailing `&nbsp;&zwnj;` padding (hides Gmail snippet bleed). ~40–90 chars. |
| `{{DATE}}` | Kicker line | Replace the sample date (e.g. `Wed, Jun 18`). |
| `{{BODY}}` | Between `BODY-START` / `BODY-END` comments | Replace the `<p>` paragraphs. Keep inline `font-family`/`color`/`font-size` on every `<p>` for dark-mode safety. |
| `{{VISUAL}}` (B & C) | Hero `<img>` | Swap `src` + `alt`. Keep explicit `width`/`height`. Write a **message-bearing alt** so the email still reads when images are off. |
| Chart caption (C) | Brass uppercase line under the wheel | Name the aspect + house, e.g. `VENUS △ JUPITER · 7TH HOUSE`. |
| `{{CHAT_BLURB}}` | CTA block, above the button | 1–2 lines, Inter 16/26, centered. |
| Friction line | CTA block, below the button | Rotate per send — variants A–D are listed in a comment right above it. |
| `utm_content=LV-XX` | CTA `href` (and the Outlook VML `href`) | Change `LV-XX` to your per-send ID, e.g. `LV-07`. **Update both the regular `<a>` and the `[if mso]` VML href** so Outlook clicks track too. |
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
https://theseerwithin.com/luna?utm_source=kit&utm_medium=email&utm_campaign=luna-daily&utm_content=LV-XX
```

You normally only edit `utm_content`. If you ever migrate domains, find/replace
the `https://theseerwithin.com` portion of the hrefs (and the asset URLs).

---

## Assets to host (placeholders used in the files)

Replace these placeholder URLs with real hosted images before sending:

| Placeholder URL | Purpose | Recommended export |
|-----------------|---------|--------------------|
| `…/assets/luna/constellation-watermark-600x88.png` | Faint masthead bg watermark | 600×88, very low contrast, optional (degrades cleanly) |
| `…/assets/luna/hero-almost-touching-544x408.jpg` | Template B hero | 544×408 displayed (export 2× for retina), < 200 kb |
| `…/assets/luna/chart-wheel-mercury-mars-340.png` | Template C chart wheel | **transparent** PNG, square, export ~680px, display 340 |
| `…/assets/luna/natal-wheel-stamp-48.png` | Footer line-art stamp | 48×48 (export 2×), brass on transparent |

If an image fails to load, all four degrade gracefully: the masthead/wordmark are
live text, the hero/wheel show message-bearing alt text on the paper background,
and the footer stamp simply disappears.

---

## Email-client gotchas handled

- **Image blocking (Gmail/Outlook default):** the wordmark and tagline are LIVE
  TEXT, never an image. The hero (B) and chart wheel (C) carry meaningful `alt`
  text with forced inline `color`, so the message survives with images off.
  Template C also restates the aspect via the live Unicode glyph strip.
- **Outlook (Windows / "frame 1" Word rendering engine):** buttons use a
  conditional `<!--[if mso]>` **VML `roundrect`** so Outlook renders the gold fill
  + rounded corners (Outlook ignores CSS `border-radius`). The `PixelsPerInch`
  `OfficeDocumentSettings` fix prevents Outlook from scaling images. `mso-table-lspace/rspace:0`
  removes Outlook's table gutters; spacer cells use explicit `height` + `line-height`.
- **Dark mode:** `meta color-scheme` + `supported-color-schemes` declared, and —
  more importantly — **every** element carries a hard inline color (text, bg,
  rules) plus matching `bgcolor` attributes, so Apple Mail / Gmail dark themes
  can't repaint the layout into mud. The paper card stays `#FBF7F0` and ink text
  stays `#1C2230`.
- **Font fallback:** Playfair Display / Inter are loaded via `<link>` for clients
  that allow webfonts, but nothing depends on them — every font stack falls back
  to Georgia/serif (headings) and -apple-system/Segoe UI/Arial (body).
- **Preheader:** a hidden, zero-height span sets the inbox preview text, padded
  with `&nbsp;&zwnj;` so Gmail doesn't pull body copy into the snippet.
- **Mobile:** a single consistent media query (`max-width:600px`) makes the wrap
  100% wide, drops side gutters to 16px, shrinks H1 to 26px, makes the button
  full-width (max 340px), fluid-scales the hero, and stacks Template C's 3-column
  glyph strip into a single column.
- **Bulletproof structure:** 100% table-based with `role="presentation"`, no
  flexbox/grid, no external CSS dependency, all critical styling inline.

---

## Per-send checklist

- [ ] Subject set in Kit
- [ ] Preheader sentence updated (padding kept)
- [ ] `{{DATE}}` updated
- [ ] `{{BODY}}` (and `{{VISUAL}}` / caption for B & C) swapped
- [ ] `{{CHAT_BLURB}}` written
- [ ] Friction line rotated
- [ ] `utm_content=LV-XX` updated in **both** the `<a>` and the VML href
- [ ] `{firstName}` replaced with the Kit merge tag
- [ ] Real footer mailing address in place
- [ ] Asset URLs point at hosted images
- [ ] Test send checked in Gmail, Apple Mail, Outlook (incl. dark mode + images-off)
