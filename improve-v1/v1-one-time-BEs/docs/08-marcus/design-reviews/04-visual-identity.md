# 04 · Visual identity — the four Marcus pages as one system

Reviewed 2026-09-13 against the live local build (booking · bridge · audio upsell · thank-you, desktop 1100 and phone 390) and the email she arrives from (`daily-email/html/what-are-my-blind-spots.html`, rendered at 900 and 390). Tokens read from `local/08-marcus/index.html` (`:root`) and `scripts/build-08-daily.py` (the broadsheet palette, the SCOTCH / DOUBLE / FOLIO rule specs, the masthead ruling).

Companion mock: `04-identity-sheet.html` — the tokens below, applied, in one file.

---

## 1 · Verdict on the current system

**The bones are right. The face is borrowed.** The pages already refuse the things every other tarot site does (no navy, no gold foil, no stars, no countdown), and they sit on the same cream-on-desk paper as the email. But the email's actual signature — the Bodoni nameplate, the Scotch rule, the framed press-cut cards, the FIG. captions — was not carried over. The pages fall back to Georgia and generic web-card styling, so they read as "a nice serif checkout" rather than "the next sheet of Marcus's paper".

### Already distinctive — keep

| What | Where | Why it works |
|---|---|---|
| Cream sheet (#f4f1e6) on a darker desk (#dbd1b9), 1px paper edge, faint shadow | all four | Reads as a printed page lying on a table, not a web app. Same two colours as the email. |
| Square headshot, no circle | masthead | Matches the builder's hard ruling (the round variant ships white corners on newsprint). A framed mugshot is the right form. |
| Red spent only on the action and the exit | booking, upsell | One colour, two uses — the email's "used TWICE only" rule, honoured by instinct. |
| Price flush-right on the heading baseline; the receipt as a ledger | booking, upsell, thank-you | This is an invoice, and it looks like one. Nobody else in the niche does this. |
| Tracked small-cap eyebrows ("ORDER CONFIRMED") | bridge, upsell | Same device as the email dateline. |
| The 2+1 / 4+3 Tree-of-Life grid, RWS art untouched | booking | The spread is the content; the page lets it be. |
| Square-cornered inputs, 54px tall, red only when invalid; brass focus ring | booking | Calm, legible, no chrome. |
| No countdown, no urgency strip, no sticky bar | all four | Correct for the audience and the brand. |

### Generic, or drifted from the email — fix

| # | What | Evidence | Why it matters |
|---|---|---|---|
| 1 | **Georgia only.** No display face. | `--font:Georgia,'Times New Roman',serif`; no font `<link>` | The email's nameplate is Bodoni Moda tracked +4px; its text is Spectral. The pages have neither. This is the single largest continuity break — the thing she recognises first is the type. |
| 2 | **Masthead is a logo lockup, not a nameplate.** | 52px sepia portrait left, "MARCUS STONE" 25px caps beside it, "The Seer Within" italic at right, then `border-bottom:4px double` | The email centres a 90px framed portrait, sets "Marcus Stone" (title case, tracked wide) beneath, the role between two short rules, then the 5/3/1 Scotch rule and a dateline. The page's `4px double` CSS border is two equal 1.3px lines — it is not the thick-over-thin rule that "says newspaper before a word is read". The builder comment explicitly warns against the lockup form. |
| 3 | **Six near-duplicate colours.** | page ink #201c16 vs email #14120f · muted #665d4e vs #5b5343 · rule #bcb29e vs #c4b9a1 · soft #ece6d8 vs stock #eae4d2 (+ #b8ab8e rule) | Each is close enough to look like a mistake, not a choice. One palette, shared by builder and page. |
| 4 | **Web cards, not press cuts.** | `.tarot{border-radius:5px;box-shadow:0 3px 5px}` no frame; same treatment face-up and face-down | The email frames each card in 1px ink with a hairline and a "FIG. I · POSITION ONE" caption. A drop shadow floating on paper is exactly what printed paper cannot do, and it is the most common tarot-site tell. Face-up and face-down cards should differ in the frame, not only in the art. |
| 5 | **Headline set tight, nameplate set wide — opposite instincts.** | `h1{letter-spacing:-1.6px}` | Negative tracking is a 2015 web habit. The email never tightens; Bodoni does not need it. |
| 6 | **Flat beige slabs for boxes.** | `.status-box`, `.offer-stack`, `.payment-note` = `--soft` fill, no rule; `.extra`/`.booking-bump` = 1px **red** border | The email's insert is "slightly darker stock, ruled all round" with a tracked kicker. The red-bordered bump is a coupon, and spends the red a third time. |
| 7 | **Measure too wide on the booking page.** | body copy runs the full 880px sheet minus padding ≈ 95 characters/line at 18px | The email column is 496px ≈ 62 characters. Bridge and thank-you already use a 600–610px column; booking does not. |
| 8 | **No spacing scale.** | margins of 36, 34, 30, 28, 26, 25, 24, 23, 22, 20, 18, 15, 9… | Nothing is wrong on its own; together the rhythm is arbitrary. |
| 9 | **Footer rule is a hairline.** | `.footer{border-top:1px solid var(--rule)}` | The email closes with the FOLIO rule (1/2/3, thin over thick — the mirror of the masthead) and "THE SEER WITHIN · PAGE ONE". |
| 10 | **Old-style figures in prices.** | Georgia's descending 4 7 9 in "$47.77", "$64.77" | Fine in running text; on a receipt a 55+ reader wants lining, tabular figures that sit on the rule. |
| 11 | **Sepia filter on the portrait.** | `.portrait{filter:sepia(.2)}` | The email uses the photograph straight. Sepia is a costume. |
| 12 | **No motion at all.** | only a `.15s` hover on the button | Not wrong — but there is one cheap moment per page that would make the paper feel handled. |

---

## 2 · Aesthetic direction

### Name: **Broadsheet & Ledger**

1. Every page is the next sheet of the morning paper she just read — the same cream newsprint on the same desk, the same Bodoni nameplate over the same Scotch rule — so nothing on screen tells her she has left Marcus's hands.
2. Below the masthead the pages are a ledger, not a landing page: Spectral at 17–18px on a 62-character measure, prices and totals sitting on hairlines and one thick rule like an old bookshop invoice, inserts on darker stock ruled all round, and every card a framed press cut with a FIG. caption — never a floating web card.
3. There is one colour, the oxidised press red, and it is spent like a rubber stamp: the one button and the one way out; there is one motion per page, and it is always something paper does — a card landing, a rule being drawn, a receipt printing — never a bounce or a glow.

Why this and not "mystical": every competitor is Cinzel-gold-on-navy with stars. A printed morning paper with a bearded man's mugshot in the masthead is unmistakably Marcus and impossible to confuse with them — and it is the highest-legibility form there is for a woman over 55 on a phone.

---

## 3 · Token sheet

### 3a · Type

| Role | Face | Weights | Fallback stack | Load |
|---|---|---|---|---|
| Display | **Bodoni Moda** (variable, opsz 6–96) | 400, 700, 400 italic | `'Bodoni MT', Didot, 'Didot LT STD', 'Hoefler Text', Garamond, 'Times New Roman', serif` | Google Fonts, same URL the email already uses |
| Text | **Spectral** | 400, 600, 400 italic | `Georgia, Cambria, 'Times New Roman', Times, serif` | same `<link>` |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

`display=swap` means Georgia shows first and Spectral swaps in; their metrics are close, so the swap does not jump. If Google is blocked she gets the exact page she has today.

**Scale** (phone / desktop). Bodoni is never used below 20px — its hairlines vanish.

| Token | Face | Phone | Desktop | Tracking | Use |
|---|---|---|---|---|---|
| `--t-nameplate` | Bodoni 400 | 24px | 30px | +.14em | masthead name, title case |
| `--t-h1` | Bodoni 400 | 34/1.1 | 46/1.08 | 0 | page headline |
| `--t-h2` | Bodoni 400 | 26/1.15 | 30/1.15 | 0 | section / offer heading |
| `--t-h3` | Spectral 600 | 20/1.3 | 21/1.3 | 0 | insert heading, ledger label |
| `--t-price` | Bodoni 400 | 34/1 | 42/1 | 0 | the price on the offer row |
| `--t-total` | Bodoni 400 | 28/1 | 32/1 | 0 | "Total USD" row |
| `--t-body` | Spectral 400 | 17/1.65 | 18/1.62 | 0 | running text |
| `--t-small` | Spectral 400 | 15/1.5 | 16/1.5 | 0 | notes, under-button line |
| `--t-label` | Spectral 400 caps | 12/1.3 | 12/1.3 | +.14em | FIG. captions, eyebrows, dateline, kicker |
| `--t-role` | Spectral italic | 13/1.2 | 13/1.2 | +.12em | "Daily Tarot Reader" |

Figures: `font-variant-numeric: lining-nums tabular-nums` on every price and total. Old-style figures stay in running text.

### 3b · Colour

| Token | Hex | Role | Note |
|---|---|---|---|
| `--desk` | `#dbd1b9` | the table the paper lies on | unchanged |
| `--paper` | `#f4f1e6` | the sheet | unchanged |
| `--stock` | `#eae4d2` | inserts, the bump box, status box | replaces `--soft #ece6d8` |
| `--stock-rule` | `#b8ab8e` | 1px rule around inserts | new, from the builder |
| `--ink` | `#14120f` | body text | replaces `#201c16` |
| `--headink` | `#0d0c0a` | display type, nameplate | new, from the builder |
| `--muted` | `#5b5343` | captions, roles, notes | replaces `#665d4e` |
| `--hair` | `#c4b9a1` | hairlines, ledger rows, face-down frame | replaces `#bcb29e` |
| `--edge` | `#c8bda8` | the sheet's outer edge | unchanged |
| `--red` | `#8f2b1f` | the button, the decline link — nothing else | unchanged |
| `--red-press` | `#742318` | button hover / press | unchanged |
| `--field` | `#a99f8c` | input border | unchanged |
| `--focus` | `#a36b31` | brass focus ring | unchanged |
| `--on-red` | `#fffaf0` | button text | unchanged |

No new hues. The only blue on any page is the rose card back, and it is the deck's own.

### 3c · Paper and texture

- **Desk light**: `body{background:radial-gradient(120% 60% at 50% 0, #e4dbc6, var(--desk) 55%, #d3c8ad)}` — the paper sits in light instead of on flat colour. One line.
- **Sheet**: `max-width:880px; background:var(--paper); border:1px solid var(--edge); box-shadow:0 2px 10px rgba(66,56,22,.09)`. Padding `32px 52px 28px` desktop, `22px 20px 20px` phone — the email's exact side paddings (52 / 20).
- **Grain**: a `::before` on the sheet carrying an SVG `feTurbulence` data-URI at **4% opacity**, `pointer-events:none`. ~300 bytes, no request. Drop it if it moirés on a cheap phone; it is a garnish, not a load-bearing wall. Text stays at full contrast because the grain is behind it.
- **No** paper-fold shadows, curled corners, coffee rings, or vignette on the sheet itself.

### 3d · Spacing scale

`--s1 4 · --s2 8 · --s3 12 · --s4 16 · --s5 24 · --s6 32 · --s7 48 · --s8 64` (px).

| Rhythm | Desktop | Phone |
|---|---|---|
| paragraph gap | `--s4` (16) | 16 |
| caption stack gaps | `--s2` (8) / `--s1` (4) | same |
| between blocks in a section | `--s5` (24) | 24 |
| between sections (above a DOUBLE rule) | `--s7` (48) | `--s6` (32) |
| masthead → first eyebrow | `--s6` (32) | 24 |
| button → decline link | `--s5` (24) | 24 |
| column measure | 620px (≈ 62 ch at 18px Spectral) | full width |

### 3e · The rules (the ruling system, from the builder)

All plain CSS, one declaration each — a `linear-gradient` with hard stops on an empty block:

| Name | Stack | CSS | Where |
|---|---|---|---|
| SCOTCH | 5 ink / 3 paper / 1 ink | `height:9px;background:linear-gradient(var(--ink) 0 5px,var(--paper) 5px 8px,var(--ink) 8px 9px)` | under the masthead, once per page |
| DOUBLE | 3 / 3 / 1 | `height:7px;…(var(--ink) 0 3px,var(--paper) 3px 6px,var(--ink) 6px 7px)` | above the offer / the spread / "What we'll look at next" |
| FOLIO | 1 / 2 / 3 | `height:6px;…(var(--ink) 0 1px,var(--paper) 1px 3px,var(--ink) 3px 6px)` | above the footer, once per page |
| HAIRLINE | 1 hair | `border-bottom:1px solid var(--hair)` | ledger rows, under captions, under the dateline |
| TOTAL | 1 ink | `border-top:1px solid var(--ink)` | above the Total row only |

Replaces every `border-top:4px double` on the pages.

### 3f · Buttons and links

**Primary — the stamp.** Full width up to the 620px measure. Square. `background:var(--red); color:var(--on-red); font:600 18px/1.35 Spectral; padding:17px 20px; border:0; box-shadow: inset 0 0 0 3px var(--red), inset 0 0 0 4px rgba(244,241,230,.5)` — that inner hairline is the double border of a rubber stamp and is the one detail that makes the button Marcus's rather than Bootstrap's. Hover `--red-press`. Active `transform:translateY(1px)` and the inner line thickens to 5px (the press). Focus: 3px `--focus` outline, offset 4px — unchanged.

**Decline — the way out.** `color:var(--red); font-size:17px; border-bottom:1px solid currentColor; text-decoration:none`, 24px clear above, left-aligned under the button. Never grey, never smaller than 17px — she has to be able to find it.

**Body links.** `--red`, underlined, weight 400 (the email's bold red is for its single CTA line only).

**Back / secondary.** `--muted`, underlined, 16px.

### 3g · Card frames

The art is never touched: `img{display:block;width:100%;height:auto}` and nothing else — no filter, no radius, no shadow. The RWS scan has its own rounded corners and cream margin; the frame sits outside like a plate.

| State | Frame | Caption stack (below a hairline, 8px gap) |
|---|---|---|
| **Face-up (turned)** | `border:1px solid var(--ink)` | `FIG. I · POSITION ONE` (label, ink) → position meaning (Spectral 17, ink) → *The Moon* (italic 15, muted) |
| **Face-down (still down)** | `border:1px solid var(--hair)` | `POSITION FOUR` (label, muted) → position meaning (Spectral 17, ink) → nothing |

Turned vs unturned is told by the frame weight and the FIG. numeral — printed, quiet, consistent. Roman numerals for the turned figures (I, II, III), words for the down positions (FOUR…TEN), exactly as the builder does.

Sizes stay as they are: 173 / 118px desktop, 145 / 112px phone; 2+1 over 4+3.

### 3h · Masthead

A compact form of the email nameplate — a page needs a shorter header than an email, but the same parts in the same order:

1. Portrait, **centred**, 64px (52px phone), `border:1px solid var(--ink)`, no sepia, no radius.
2. **Marcus Stone** — title case, Bodoni 30/24px, tracked +.14em, `padding-left:.14em` to optically centre tracked text.
3. *Daily Tarot Reader* — Spectral italic 13px tracked, between two 34px ink rules (`::before`/`::after`).
4. The SCOTCH rule.
5. **Dateline** — 12px tracked caps, muted, hairline beneath: left = **what this sheet is** (`ORDER FORM` · `ORDER CONFIRMED` · `ONE ADDITION` · `RECEIPT`), right = `THE SEER WITHIN`.

The dateline does the wayfinding a progress bar would do, in the paper's own voice. The italic "The Seer Within" at the right of the current header moves here. Total masthead height ≈ 190px desktop / 160px phone versus ≈ 95px today — worth it; it is the identity.

---

## 4 · The one motion moment per page

All behind `@media (prefers-reduced-motion: no-preference)`; the existing reduce block stays. Nothing loops. Nothing moves after the first second.

| Page | Moment | CSS |
|---|---|---|
| **Booking** | *The three turned cards are dealt.* Each face-up figure rises 14px and un-tilts 1.5° into place, 380ms ease-out, staggered 120ms. The seven face-down cards do not move — they were already on the cloth. | `@keyframes deal{from{opacity:0;transform:translateY(14px) rotate(-1.5deg)}to{opacity:1;transform:none}}` · `.up figure{animation:deal .38s cubic-bezier(.2,.7,.2,1) both}` · `:nth-child(2){animation-delay:.12s}` `:nth-child(3){animation-delay:.24s}` |
| **Bridge** | *The rule draws under "ORDER CONFIRMED".* A hairline scales from 0 to full width, left to right, 600ms; the headline fades up 200ms behind it. | `.eyebrow::after{content:"";display:block;height:1px;background:var(--ink);transform:scaleX(0);transform-origin:left;animation:draw .6s ease-out .1s forwards}` · `@keyframes draw{to{transform:scaleX(1)}}` · `h1{animation:rise .4s ease-out .3s both}` |
| **Upsell** | *The offer ledger surfaces when she reaches it.* The DOUBLE rule + heading + $17 fade up once as they scroll into view. Scroll-driven, no JS. | `@supports (animation-timeline: view()){.offer{animation:rise .5s both;animation-timeline:view();animation-range:entry 0% entry 40%}}` — browsers without support simply show it, no gate. |
| **Thank-you** | *The receipt prints.* Ledger rows fade in top to bottom (90ms apart), then the ink rule above the total draws, then the total appears. ~800ms all in. | `.row{animation:rise .3s both}` with `:nth-child(n)` delays · `.total{border-top:0}` `.total::before{…scaleX draw…}` · total figure `animation-delay:.6s` |

`rise` is shared: `@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`.

Why these four: each is something paper does. None draws attention to itself as an effect, and none delays her reading — the text is legible before the animation finishes.

---

## 5 · Prioritised suggestions

| # | WHAT | WHY | HOW |
|---|---|---|---|
| 1 | **Load Bodoni Moda + Spectral; set `--display` and `--text`; kill negative tracking on h1** | The largest continuity break; the type is what she recognises. | The email's `<link>` in `<head>`; `:root{--display:…;--text:…}`; `body{font:18px/1.62 var(--text)}`; `h1,h2,.price,.total,.mast-name{font-family:var(--display);letter-spacing:0}`. ~12 declarations. |
| 2 | **Rebuild the masthead as the nameplate (§3h) with the SCOTCH rule and a dateline** | The current header is the lockup form the builder warns against; the dateline gives her wayfinding without a progress bar. | Markup exists (`.masthead`, `.portrait`, `.mast-name`, `.role`, `.brand`); change to `flex-direction:column; text-align:center`, add the rule div and a dateline row. ~25 lines. |
| 3 | **Adopt the builder palette (§3b) verbatim** | Six near-duplicate colours look like errors. One palette for email and page. | Swap the seven values in `:root`; add `--stock`, `--stock-rule`, `--headink`. |
| 4 | **Press-cut card frames + FIG. caption stack; hair frame for face-down** | Shadowed rounded cards are the generic tell and cannot happen on paper; the frame weight tells turned from unturned. | `.tarot{border-radius:0;box-shadow:none}` `figure.up .tarot{border:1px solid var(--ink)}` `figure.down .tarot{border:1px solid var(--hair)}`; caption: hairline + `.fig-no` + `.fig-pos` + `.fig-name`. |
| 5 | **Replace `4px double` with SCOTCH / DOUBLE / FOLIO; put ledger rows on hairlines and the total on 1px ink; lining tabular figures on prices** | Makes the pages a ruled ledger rather than a page with dividers; numbers line up for a 55+ reader. | Three gradient rule classes (§3e); `.price,.total,.order-line b{font-variant-numeric:lining-nums tabular-nums}`. |
| 6 | **Cap every text column at 620px, including the booking page** | 95 characters per line is hard reading at any age; the email is 62. Cards may stay wider than the text. | `.intro, .offer, .review, .bridge-page, .upsell-copy{max-width:620px;margin-inline:auto}`; leave `.up-cards`/`.down-cards` at full sheet width. |
| 7 | **Inserts on darker stock, ruled all round, with a kicker; the bump box stops being red** | The email's insert form; red is for the button and the exit only, and the red-bordered bump reads as a coupon. | `.status-box,.offer-stack,.payment-note,.extra,.booking-bump{background:var(--stock);border:1px solid var(--stock-rule)}`; kicker = existing `.review-label` restyled to `--t-label`; the checkbox stays `accent-color:var(--red)`. |
| 8 | **The stamp button and the 17px red decline link** | The inner hairline is a 1-line detail that owns the button; the decline must stay findable. | §3f. `box-shadow:inset 0 0 0 3px var(--red),inset 0 0 0 4px rgba(244,241,230,.5)`; `.text-button{font-size:17px}`. |
| 9 | **One motion per page (§4)** | Cheap, paper-like, makes the pages feel handled; none blocks reading. | Four keyframe blocks; all inside `prefers-reduced-motion:no-preference`. |
| 10 | **Desk light + 4% grain; drop the sepia filter; FOLIO rule and "PAGE" line in the footer** | Small finishes that add up to "printed" rather than "flat". | §3c; `.portrait{filter:none}`; `.footer{border-top:0}` preceded by `.rule-folio`; footer left `MARCUS STONE · THE SEER WITHIN`, right `ORDER FORM` etc. |

Order of value: 1–4 are the identity; 5–7 are legibility and the ledger idea; 8–10 are finish. Items 1, 3, 5, 6, 8 are a `:root` + ~20-rule change and could ship in one pass; 2 and 4 touch markup structure slightly; 9 and 10 last.

---

## 6 · Leave alone

- The cream sheet on the darker desk, its 1px edge, its 880px width, its faint shadow.
- The square headshot. No circle, no ring, no badge — the builder ruling stands.
- Body 17px phone / 18px desktop, ~1.6 line height. Do not go smaller anywhere she has to read; labels at 12px are the floor and only for tracked caps.
- Red used twice per page: the button and the way out. No red headings, no red prices, no red rules.
- The price flush-right on the offer heading's baseline; the thank-you receipt as a line-item ledger.
- The 2+1 / 4+3 Tree-of-Life grid and the card sizes.
- The RWS art and the rose card back — no filters, no tints, no rounded overrides, no hover lift.
- The inputs: 54px tall, transparent, 1px `--field` border, red border only when invalid, labels above.
- The brass focus ring (`#a36b31`, 3px, offset 4).
- The eyebrows on bridge and upsell (only unify them to `--t-label`).
- The `prefers-reduced-motion` block.
- The absence of countdowns, stickies, badges, trust seals, star ratings and testimonials. The paper does not shout; that is the brand.
- The footer's two-cell form (left identity, right note) — only its rule changes.

---

## Claimed vs verified

| Claim | Status |
|---|---|
| All four pages viewed at 1100 and 390 | Verified from the reference screenshots (8 files). I did not re-shoot the live pages; the server was left running and the upsell buttons were not clicked. |
| Page tokens (`:root`, fonts, sizes, every rule quoted in §1) | Verified — read directly from `local/08-marcus/index.html` lines 2–7. |
| Email tokens, fonts, rule stacks, the masthead ruling, "red used twice only" | Verified — read from `scripts/build-08-daily.py` (palette block, SCOTCH/DOUBLE/FOLIO, `masthead()` comment) and the built `what-are-my-blind-spots.html`; the email was rendered at 900 and 390 and its masthead, a card section and the footer were inspected at native size. |
| Bodoni Moda / Spectral load from Google Fonts with the quoted URL | Verified — the URL is copied from the email's `<link>`. Whether the fonts render on a given customer's phone was not tested. |
| The page's card back is an embedded 408×700 rose-lattice JPEG, 173 KB; no single card-back image is hosted on S3 | Verified (extracted the data-URI; three guessed S3 keys returned 403). The mock therefore draws a CSS stand-in for the back, labelled as such. |
| The 95-characters-per-line figure for the booking page | Estimated from 880 − 104 padding = 776px at 18px Georgia (~8.2px per character). Not measured with a ruler. |
| `animation-timeline: view()` works on the audience's phones | **Not verified.** It is guarded by `@supports`, so the fallback is "no animation", never a hidden element. |
| The mock renders at 390px with no horizontal scroll and under 50 KB | Verified by Playwright: 18.4 KB; at 390px `scrollWidth` = `clientWidth` = 390; at 1100px likewise; `document.fonts.check` true for both Bodoni Moda and Spectral; both S3 images resolved (288px headshot, 350px card); zero console errors. Inspected at 2× on phone. |
| Known small wart in the mock | The `FIG. I · POSITION ONE` label wraps to two lines at the 145px phone card width. The email wraps the same way; if it bothers, drop the label to `.10em` tracking on phone. |
| A first draft of the mock used `background-attachment:fixed` for the desk light | Caught in the full-page capture (a visible band) and removed — `fixed` is also unreliable on iOS Safari. The shipped mock uses a plain `no-repeat` gradient over the desk colour. |
| Anything about conversion | **Not claimed.** This review is identity and legibility only. |
