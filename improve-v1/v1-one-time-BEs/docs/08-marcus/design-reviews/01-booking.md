# 08 Marcus — design review 01: the booking page

Reviewed: `local/08-marcus/index.html` (`/booking?edition=blind-spots-v1`, served at
http://127.0.0.1:5088) and the mockup it grew from, `booking-page/mockup.html`.
Compared against the letter she arrives from: `daily-email/html/what-are-my-blind-spots.html`.
Mock of the proposed page: [`01-booking-mock.html`](01-booking-mock.html).

Scope respected: `booking-page/SCOPE.md`. Copy is not rewritten here; a few lines are flagged
for the copy gate at the end.

---

## 1. Verdict

The page already does the hard things right. The order is correct (headline → the three turned
cards → the seven still down → $35 → form → bump → total), the price is on the page before any
field, the bump is a real opt-in with a live total, red is kept for the action, and nothing on
it shouts. Its single biggest weakness is that it stops being Marcus's letter the moment she
lands: the letter has a centred Bodoni nameplate, a Spectral body, Scotch rules, "FIG." captions
and a photograph of the cards on his table; the booking page has a left-aligned Georgia
masthead, a wider column, and the seven face-down positions laid out as a catalogue grid of
identical grey thumbnails. Those seven positions are the product, and as a grid they are the
least readable thing on the page — seven 112 px rectangles she scrolls past with the questions
squeezed under them at 16 px — so on a phone she reaches the price only at 2,759 px, three and
a quarter screens down, having read almost nothing on the way.

## 2. Aesthetic direction

**Page two of the same morning paper.** The booking page is the letter continued — the same
nameplate, the same two faces (Bodoni Moda for display, Spectral for text), the same rules and
figure captions, the same photograph of the table — and the seven positions become a ruled
ledger of questions she can read down like a column, ending in a reply slip and one red button.

---

## 3. Suggestions, in priority order

### 3.1 Use the letter's masthead and type, not the SPA's

**What.** Replace the horizontal Georgia masthead with the email's centred one: portrait,
"Marcus Stone" nameplate, ruled "Daily Tarot Reader", Scotch rule, dateline. Switch the type to
the email's stacks. Adopt the email's colour tokens (they differ slightly from the SPA's).

**Why.** She clicked "Continue the blind-spot reading" inside a page that looks one way and
lands on a page that looks another. For a reader over 55 that jolt reads as "different site",
and "different site" reads as "is this safe to type my details into". Recognition is the
cheapest trust there is.

**How.**
```
--desk:#dbd1b9 --paper:#f4f1e6 --ink:#14120f --head:#0d0c0a --muted:#5b5343
--hair:#c4b9a1  --red:#8f2b1f  --box:#eae4d2  --boxhair:#b8ab8e
display: 'Bodoni Moda','Bodoni MT',Didot,'Hoefler Text',Garamond,'Times New Roman',serif
text:    'Spectral',Georgia,Cambria,'Times New Roman',serif
```
Same Google Fonts link as the email (`Bodoni+Moda` + `Spectral`, `display=swap`); the fallback
is the design, exactly as the builder says. Masthead: portrait 64 px (56 on phone), square
`08-headshot.jpg` on newsprint (not the round one), nameplate 30/26 px Bodoni at
`letter-spacing:.06em`, role line 14 px italic Spectral with 44 px rules either side, Scotch
rule = `border-top:3px solid ink; border-bottom:1px solid ink; height:3px`. Dateline 11 px
uppercase `letter-spacing:.16em` muted: "MORNING EDITION · PAGE TWO" (the email's folio says
"PAGE ONE", so this is a true continuation, not a slogan). On phone keep only the left half.

### 3.2 Narrow the column to the letter's measure

**What.** `.paper{max-width:680px}` instead of 880, padding 44 px (18 px on phone).

**Why.** At 880 px the body runs 95–100 characters a line. The letter runs about 65. Long
lines are the first thing an older reader loses her place in, and a wide sheet makes the page
look like a web form rather than a page of print.

**How.** 680 px outer, 592 px text column. Everything below inherits a single body style:
`font:18px/1.65 Spectral`. Do not step body text down on phone; only the display sizes change
(h1 40→32, h2 28→25).

### 3.3 Left-align the headline and intro

**What.** Drop `text-align:center` on `.intro`.

**Why.** The letter is left-aligned throughout. A centred headline is a landing-page habit; a
left-aligned bold crosshead is what she just read three of ("One — how a blind spot affects
you. The Moon.").

**How.** `h1{font:700 40px/1.12 Bodoni; letter-spacing:-.01em; text-wrap:balance}`; intro
20 px/1.5 (18 on phone) directly beneath, 16 px gap.

### 3.4 Put the three turned cards in one row, with the letter's figure captions

**What.** `grid-template-columns:repeat(3,1fr)` at every width. Caption = eyebrow
"FIG. I · POSITION ONE" (11 px, `.14em`, uppercase, muted), the position label bold 17 px
(15 on phone), the card name 14 px italic muted.

**Why.** Today the desktop grid is `repeat(2, 190px)` so the Three of Pentacles sits alone
on a second row — an orphan where the page should be showing "three of ten, turned". Three in
a row is also how they sit on his table in the photograph she has just seen. The "FIG." eyebrow
is the email's own device, so the cards read as figures in the same article.

**How.** Art at 184 px wide on desktop, 104 px at 390 px. 104 px is small, but she saw each of
these cards at full width in the email; here they are for recognition, and the labels carry
the meaning. Frame: `border:1px solid #fff; outline:1px solid var(--hair); box-shadow:0 2px 6px
#302a1926`. On phone drop "FIG. I ·" from the eyebrow (`display:none`) so "POSITION THREE" fits
one line. Reserve `aspect-ratio:7/12` so the layout does not jump while the JPEGs load.

### 3.5 Turn the seven face-down cards into a ruled ledger

**What.** Replace the 4-up / 2-up grid of card backs with a list: one hairline-ruled row per
position, a small card back (52 × 89 px) at the left, "POSITION FOUR" eyebrow and the question
at 19 px beside it. Two columns on desktop, one on phone.

**Why.** This is the product, and in the grid it is the least legible thing on the page: seven
identical backs, questions in 16 px under 112 px thumbnails, two lines each. In a ledger the
question is the line. She reads "What you keep excusing / What you feel you are owed / What's
left of the love…" straight down at body size, the way she read the ruled sidebar of positions
in the email itself (the builder calls it exactly that: "ruled sidebar of the positions still
down"). It is more prominent, not less — the card back is still there on every row as proof the
card exists, but the words do the selling. On phone the seven questions take ~800 px instead of
~1,000 px, and the price arrives at 2,321 px instead of 2,759 px (measured, see §7).

**How.** `ol.ledger{list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:0 32px;
border-top:1px solid var(--hair)}`, `li{display:flex; gap:16px; align-items:center;
padding:12px 0; border-bottom:1px solid var(--hair)}`. Card back: the real
`08-booking-card-back.jpg` at 52 px, with a CSS pattern behind it
(`#5d6c80 repeating-radial-gradient(circle,#7a889a 0 1px,transparent 1px 7px)`) so a slow
image never leaves a hole. `@media(max-width:640px){grid-template-columns:1fr}`.

### 3.6 Bring back the photograph of the table, once

**What.** Above the ledger, the same `08-backs-tree-of-life.jpg` she saw at the end of the
letter, full column width, hairline frame, "FIG. IV · THE TABLE" caption.

**Why.** Scope says a duplicate hero "is not required"; it does not forbid one, and this is not
the hero — it is the picture of the seven backs on his cloth that appeared directly above the
"Continue" link she clicked. Seeing it again on the next page is the single strongest
"this is the same reading" cue available, and it gives the abstract idea "seven still face
down" a real object before the list of questions.

**How.** `img{width:100%; border:1px solid var(--hair)}`, caption 14 px muted with the eyebrow
in 11 px uppercase ink. Costs ~230 px on phone; §3.5 saves more than that.

### 3.7 Set the price like a price in a paper, and put the delivery promise next to it

**What.** "$35" in Bodoni Moda at 58 px (50 on phone), `line-height:.9`, bottom-aligned with the
"Your personal reading" crosshead; a small italic line under it; then the offer copy; then a
one-line delivery promise in the email's box tint with a left rule; then his signature.

**Why.** Scope: the $35 must be visible below the cards and must "stand on its own", and the page
must say beside it what she gets (a written PDF, by link, within 24 hours). Today the delivery
promise only appears inside the bump box, phrased as the thing the bump improves. Putting it
beside the price makes the $35 complete before the bump is ever mentioned. The signature is the
letter's own closing device; ending the offer paragraph with it says "this is still me talking"
without a word of copy.

**How.** `.pricerow{display:flex; justify-content:space-between; align-items:flex-end}`.
`.delivery{padding:12px 16px; background:var(--box); border-left:3px solid var(--boxhair);
font-size:16.5px}`. `08-signature.jpg` at `height:44px` — it is already flattened to paper
colour, so do **not** use `mix-blend-mode:multiply` (it darkens the box; verified while building
the mock).

### 3.8 Take the red off the bump

**What.** Bump box in `--box` tint with a `--boxhair` border; checkbox `accent-color:var(--ink)`;
the "+$12.77" in Bodoni 26 px, ink. Red stays on the payment button and on error states only.

**Why.** The email's rule is "accent used TWICE only". On the current page red appears on the
bump border, the checkbox and the button — the eye is pulled to the upsell before the action.
An unselected optional box outlined in red also reads, to a cautious reader, as a warning.

**How.** `.bump{border:1px solid var(--boxhair); background:var(--box); padding:18px 20px}`;
the opt-in row is its own paler box (`background:var(--paper)`, 1 px boxhair border, 12 px
padding) so the whole row is the tap target, with a 26 px checkbox. Below the total, a muted
line that flips with the checkbox: "Arrives within 24 hours of payment" → "within 12 hours" —
so what the bump changes is stated where she is looking when she ticks it.

### 3.9 Bigger, calmer form controls

**What.** Inputs 56 px tall, 19 px text, `background:#fbf9f2` (a shade lighter than the paper so
a field looks like a field), 1 px `--boxhair` border, square corners. Labels 17 px semibold ink
with a 15 px muted hint on the next line. 18 px between fields. Button 19 px semibold, 17 px
vertical padding, full width.

**Why.** Current inputs are 54 px on transparent paper with a 1 px grey border — on a cream
phone screen in morning light the field edges nearly disappear, and the labels (16 px) are the
smallest text in the section she has to act on. Older thumbs need height; older eyes need the
edge.

**How.** See §4 for the full field spec. `input:focus{border-color:var(--ink); outline:3px solid
#a36b31; outline-offset:2px}` — a warm ring, visible, not the browser blue.

### 3.10 One motion moment: the three cards settle

**What.** On load the three turned cards fade up 16 px with a 1.2° un-rotate, staggered 140 ms,
750 ms `cubic-bezier(.2,.7,.2,1)`. Nothing else on the page moves except the button's hover
tint. `prefers-reduced-motion` turns it off.

**Why.** It is the one place motion carries meaning — the cards being laid on the page in the
order he turned them — and it happens once, above the fold, before she has started reading.
Anything further down (scroll-reveals on the ledger, a pulsing button, a sliding total) would be
noise for this reader.

**How.** `.turned figure{animation:settle .75s cubic-bezier(.2,.7,.2,1) both}` with
`:nth-child(2){animation-delay:.14s}`, `:nth-child(3){.28s}`;
`@keyframes settle{from{opacity:0;transform:translateY(16px) rotate(-1.2deg)}}`.

### 3.11 Folio and imprint, not a footer bar

**What.** A 3 px ink rule, "THE SEER WITHIN · PAGE TWO" in 11 px uppercase, then a 13 px imprint
line.

**Why.** The email closes with a folio; closing the page the same way completes the "page two"
idea and quietly tells her the page has ended (no sticky bars, nothing chasing her down).

### 3.12 Reserve image space and never rely on the S3 PNG keys

**What.** Every `<img>` gets width/height or `aspect-ratio`; card art uses the `.jpg` keys.

**Why.** Layout shift while she is reading is worse on a phone than a slow image. And the
builder's own warning holds: the `.png` keys under `evelyn/tarot-rws/` return 403 (verified
today for `the-moon.png`, `two-of-swords.png`, `three-of-pentacles.png`); the `.jpg` keys are
live. `08-booking-card-back.jpg` is **not** on S3 (403) — it exists only locally under
`assets/email/`, so the ledger needs it uploaded before the page goes live, or the CSS pattern
fallback in §3.5 is what she will see.

---

## 4. The four-field form

### Layout

Single column at every width, in this order, each field full width:

1. **First name** — hint "What I'll call you in the reading". `autocomplete="given-name"`,
   `autocapitalize="words"`.
2. **Full birth name** — hint "As written on your birth certificate". `autocomplete="name"`.
   One field, not first/middle/last: she should type it the way it is written, and a three-box
   split is what makes a page feel like a passport application.
3. **Date of birth** — three boxes on one line: **Day** (76–84 px, `inputmode="numeric"`,
   `maxlength="2"`), **Month** (a `<select>` of month *names*, flexible width), **Year**
   (96–108 px, `inputmode="numeric"`, `maxlength="4"`). `autocomplete="bday-day|month|year"`.
   Month as a word removes the 03/07 vs 07/03 ambiguity for a list that spans countries, and a
   select is one tap on iOS. Avoid `<input type="date">`: on desktop it is a masked
   `mm/dd/yyyy` field, on Android it opens a calendar defaulting to this month — which means
   scrolling back sixty years — and neither looks like anything else on the page.
4. **Delivery email** — hint "Where I'll send the link to your reading". `type="email"
   inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"`. Last, because
   it is the one field she expects and the one she will not resent.

First name before birth name matters: the first thing he asks is what to call her, which is a
person's question; the birth certificate question comes second, after the paragraph explaining
why.

### The privacy line

One line, once, directly under the date-of-birth boxes (so it sits between the two sensitive
fields and the email), 15 px italic muted, no icon, no lock, no box:

> Your birth name and date of birth are used for this reading only. They are kept private,
> never shown to anyone else, and never used for marketing.

That is the scope's own sentence. It is not repeated under the birth-name field, and it is not
a link to a policy — a policy link is where the "government form" feeling starts. Reference it
from the fieldset with `aria-describedby` so a screen reader hears it with the date fields.

### Why it will not feel like a government form

- Marcus's explanation paragraph sits *above* the fields, in his voice, in body size — the
  form is the reply slip to a letter, not a section titled "Your details".
- Labels are short nouns with a one-line hint in his phrasing, not "Applicant's legal name".
- No asterisks, no "required", no "(optional)" tags: every field is required, and the button
  tells her if one is missing.
- No borders around groups except the bump, no numbered steps, no progress bar, no "Step 1 of
  3", no separate review screen.
- Fields sit on the same cream sheet, in the same serif, with the letter's hairline colour for
  edges.

### Validation states

- Validate on submit, not on every keystroke; an over-55 reader who is still typing does not
  want to be told she is wrong mid-word. Clear a field's error as soon as she edits it.
- On submit with errors: every failing field gets `aria-invalid="true"`, a 2 px `--red` border,
  and one sentence in 15.5 px red under it that says what to do, not what is wrong ("Enter your
  full name as it was given at birth", "Enter the day, month and year you were born"). The page
  scrolls the *first* failing field to the middle of the screen and focuses it.
- The date group is validated as one thing (day 1–31, a month chosen, year 1900 to
  current-year-16) with one message under the three boxes.
- The email test is loose (`something@something.something`) — a strict pattern that rejects a
  real address is a lost sale and a confused reader.
- Never disable the button while fields are empty; a grey button is a dead end for someone who
  cannot tell why.
- Nothing green: a filled field is just a filled field.

### Sizes

Inputs `height:56px; padding:10px 14px; font-size:19px`. Labels 17 px/600. Hints 15 px muted.
Error 15.5 px red. Gap between fields 18 px. On phone the date row is `76px 1fr 96px` with
8 px gaps; all three stay on one line at 390 px.

---

## 5. Leave alone

- **The order of the page.** Headline → turned → down → price → fields → bump → total → button
  is right and matches the scope's flow. Do not add a summary/review step.
- **Price before form, bump unselected, live total in the button.** All correct today; the mock
  keeps the exact behaviour (`$35.00` / `$47.77`, button text follows).
- **The existing copy blocks** — headline, intro, bridge, offer, the name explanation, the bump
  sentences, "One payment. Nothing recurring." They are gated elsewhere; the mock uses them
  verbatim.
- **Red for the button only.** Keep `#8f2b1f`, hover `#701f16`, square corners, full width.
- **No sticky bar, no countdown, no "NOTICE TO READERS", no feature list, no trust badges.**
  None are on the page now; none should be added. The folio is the last thing on the page.
- **The `LOCAL TEST` banner** — test-only, fine.
- **Focus ring colour** `#a36b31` — already good, keep it.

### Copy flagged for the gate (design-motivated, not rewritten here)

- "FIG. IV · THE TABLE — the seven still face down, as they lie this morning." (mock caption;
  needs a real line).
- "one reading · one payment" under the $35 (mock tagline; could be dropped).
- Field hints: "What I'll call you in the reading", "As written on your birth certificate",
  "Where I'll send the link to your reading".
- Error sentences listed in §4.
- "Arrives within 24 hours of payment." / "…12 hours…" under the total.
- The name-explanation paragraph currently begins "I'll use the strengths and habits…" (the
  SPA prepends "Enter your first and last name so I can identify your personal tarot card."). With
  four fields that sentence is wrong — it is the one line on the page that actively fights the
  new form and should be first in the copy queue.

---

## 6. Measured

Playwright, same viewports, `networkidle` + 1.5 s.

| | Live page 390 px | Mock 390 px | Live 1100 px | Mock 1100 px |
|---|---|---|---|---|
| Price `$35` top | 2,759 px | 2,321 px | 2,247 px | 2,172 px |
| Form top | 3,227 px | 2,757 px | 2,536 px | 2,526 px |
| Pay button top | 3,946 px | 3,980 px | 3,100 px | 3,577 px |
| Page height | 4,175 px | 4,279 px | 3,332 px | 3,856 px |
| Turned card width | 145 px | 104 px | 173 px | 183 px |
| Horizontal overflow | no | no | no | no |

The mock is ~100 px longer on phone because it carries two more fields and the table photo;
the price and the form both arrive ~450 px sooner. Desktop is longer only because the column is
narrower (680 vs 880), which was the point.

---

## 7. Claimed vs verified

**Looked at.** `SCOPE.md` in full; the SPA's CSS (`:root` tokens, `.paper`, `.masthead`,
`.up-cards`, `.down-cards`, `.offer`, form and bump rules) and its `booking()` render function;
the mockup's `<head>` CSS and form markup; `scripts/build-08-daily.py` palette/type constants
and the "THE LOOK" comment block; `editions.json` for the `blind-spots-v1` positions and
`bookingCopy`; the two reference screenshots (read as images).

**Rendered.** The source email `what-are-my-blind-spots.html` at 390 px (own screenshot, three
crops read). The live booking page at 390 and 1100 for the measurements in §6 (positions read
from the DOM, not estimated). The mock at 1100 and 390: full-page screenshots, then submit-empty
(all four error states shown), then bump ticked (total `$47.77`, button and "arrives" line
follow). All 13 images loaded (`naturalWidth>0`), both webfonts reported `loaded`, no console
errors, no horizontal overflow at 390.

**Assets.** S3 `.jpg` card keys, `08-headshot.jpg`, `08-signature.jpg`,
`08-backs-tree-of-life.jpg`, and the hero `08-hero-what-are-my-blind-spots.jpg` return 200/206.
The brief's `.png` card URLs return 403, as does `marcus/08/08-booking-card-back.jpg`; the mock
links the card back **relatively** (`../../../assets/email/08-booking-card-back.jpg`) with a
CSS-pattern fallback, so it works when opened from the repo and degrades to a drawn back
elsewhere. The hero is not used — the scope says it is not required and the table photograph
does the continuity job better.

**Assumed, not verified.** That the email will keep its current design (the review continues
it). That the list is mostly US-based (month names chosen to be safe either way). That Stripe
Checkout follows this page, so no card fields belong here. That
`08-booking-card-back.jpg` will be uploaded before launch. Real-user behaviour: none of this
was tested with a reader over 55; the size and contrast choices come from the scope's audience
line and general large-text practice, not from a session.

**Not done.** No existing file edited. Nothing committed. The mock is 19.7 KB, one file, no
external JS (one Google Fonts stylesheet link, same as the email; fallbacks render without it).
