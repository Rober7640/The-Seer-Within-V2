# Design review 03 · Audio upsell (Upsell 1)

Reviewed 2026-09-13 against the local build at `/upsell?order=…` (test order: Karen Miller, *What are my blind spots?*, Tree of Life, 12-hour delivery, paid $47.77) at 1100px and 390px.
Docs respected: [SCOPE.md](../upsell-1-audio/SCOPE.md) · [SHAPE.md](../upsell-1-audio/SHAPE.md) · [COPY.md](../upsell-1-audio/COPY.md). Markup reviewed: `local/08-marcus/index.html`, `function upsell()`.
Mock: [03-audio-upsell-mock.html](03-audio-upsell-mock.html) (single file, 17 KB, inline JS only, copy verbatim from COPY.md).

Nothing in the funnel was edited. The copy was not rewritten; two small copy notes are flagged in §6.

---

## 1. Verdict

**What works**

- It reads as the next page of Marcus's letter. Same paper, same masthead, same Georgia, same double rule. The bridge page promised "one optional way to receive the same reading" and this page delivers exactly that tone.
- The argument is honest and the page obeys the hard rules: no countdown, no scarcity, no "one-time offer" shouting, price stated once beside the offer and once in the button, the $35 is never shown as a charge, decline is visible and worded without shame.
- The step label → headline → salutation stack is the right hierarchy. The headline is a real warning, not a slogan.
- Body text at 18px/1.6 (17px on phone), 610px measure, generous paragraph gaps. A 55+ reader can read this without pinching.
- The includes list resolves the deadline from the order (`12-hour` here), so she never sees the "24-hour or 12-hour" either/or.

**Single biggest weakness: the product is invisible.**
The page sells sound with nothing on it that looks, or behaves, like a recording. She reads 300 words about listening in order, then meets a grey bullet list and a price. There is no object to want. The two things the letter says ("built in an order", "hear each part lead into the next") are never *shown* — and her own spread already has the ten position names that would show them. The take-rate lever here is not more persuasion; it is making the recording feel like a real thing that already has a shape.

Second, smaller: the decline is a 16px underlined link, 29px tall — under the 44px tap minimum and visually a "fine print" control, which contradicts the brief that declining must feel safe.

---

## 2. Aesthetic direction

The letter continues, and the recording becomes an object on his desk: a running-order sleeve drawn in ink under the offer, each chapter named after a position in *her* spread, so she can see that the sound has an order before she has heard a note. Everything else stays paper — cream, one serif, one red held back for the accept button — and the page moves exactly once: the track fills left to right and the chapters settle into place as the sleeve scrolls into view, like a needle running through a record.

---

## 3. Suggestions (prioritised)

Legend for WHY — **her** = comprehension/ease for a woman 55+ on a phone · **trust** = believability, no pressure · **take** = take-rate without pressure.

### 1. Put the recording on the page as an honest "running-order sleeve"
- **WHAT** Between "That is why I can also prepare your complete reading as an audio recording." and "Instead of scanning ahead, press play…", insert a bordered card showing: a small kicker (*Your audio reading · running order*), an italic status (*Not yet recorded*), a player row (dimmed play glyph + a 12-segment chapter track + `0:00`), and a numbered list of chapters generated from `order.editionSnapshot.positions` (ten here), then a red-marked row for the personal-card pass (*The ten cards read together through The Magician, your personal card*) and a final row for the closing advice.
- **WHY** take + trust. It makes sound believable without a fake preview: nothing plays, nothing pretends to be a waveform, the length is not invented. It turns "built in an order" into something she can see, and the closing-advice row is the argument of the headline in one line — the answer sits at the *end* of a visible sequence. It also uses her own spread, so it is personal in fact, not just in name.
- **HOW** `figure.sleeve{border:1px solid #a99f8c;background:linear-gradient(180deg,#f7f4ea,#efe9da);padding:18px 20px 16px}` with an inner hairline `::after{inset:5px;border:1px solid #d8cfba}` (a printed sleeve, not a web card). Track: `display:grid;grid-template-columns:repeat(N+2,1fr);gap:3px;height:22px;align-items:end`, segments `height:14px;background:var(--ink);opacity:.82`, the personal-card segment `background:var(--red);height:22px`, the closing segment `height:9px`. Chapters: `ol` in two columns on desktop (`grid-template-columns:1fr 1fr;column-gap:26px`), one column under 620px; rows `padding:6px 0;border-top:1px solid #dcd3bf;font-size:16px`; the lens row `grid-column:1/-1;border-top:1px solid var(--ink)`. Play glyph `46px` circle, `opacity:.55`, `aria-hidden` — it is a picture of a control, not a control. Caption under the list: *Recorded after your written reading is prepared. Ready by the same 12-hour deadline. Length shown once recorded.* (UI text, see §6.)

### 2. Make decline a real button, same size as accept
- **WHAT** Replace the underlined text link with a full-width outlined button directly under the accept button.
- **WHY** her + trust. A 29px-tall link fails the tap target and reads as the "escape hatch" pattern she has learned to distrust. Two equal-height buttons say "both of these are fine".
- **HOW** `.decline{display:block;width:100%;min-height:60px;padding:15px 18px;border:1px solid #a99f8c;background:transparent;color:var(--ink);font-size:17px;border-radius:0}` `:hover{background:#ede7d8;border-color:var(--ink)}`. Stack with `display:grid;gap:12px`. Keep red for accept only.

### 3. Add a two-line charge ledger above the buttons
- **WHAT** Between "One additional payment…" and the buttons: `Your written reading  [✓ PAID]  $47.77` (muted) / `Audio recording  [ONLY IF YOU ADD IT]  $17` (ink, tag in red). No total row.
- **WHY** trust. "One additional payment" is only believable next to the thing it is additional to. SCOPE asks to show the two separately; showing the paid amount *with the word Paid* is what stops it looking like a second charge. Omitting the total row is deliberate — a total would read as "you owe $64.77".
- **HOW** `dl.ledger{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}` rows `display:flex;justify-content:space-between;padding:12px 0;font-size:16px`, tags `font-size:12px;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border:1px solid currentColor`, paid row `color:var(--muted)`, add row `dd{font-size:19px}`. Amount reads from `order.totalCents` (never hardcode $35 — with the speed bump it is $47.77).

### 4. Give the includes list ticks, a left rule, and a smaller heading
- **WHAT** Replace disc bullets with small ink check marks; add a 3px ink rule down the left; drop the heading from h2 29px to 26px (24px phone).
- **WHY** her. Ticks read as "included" faster than dots; the 29px heading currently outweighs the offer heading below it, so the eye lands on the wrong h2 first.
- **HOW** `.includes{padding:22px 26px;background:var(--soft);border-left:3px solid var(--ink)}` `li{padding:7px 0 7px 30px;position:relative}` `li::before{content:"";position:absolute;left:2px;top:15px;width:11px;height:6px;border-left:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(-45deg)}`.

### 5. Mark the eyebrow as a warning with a short red rule, not colour on the words
- **WHAT** Keep the muted small-caps step label; add a 34×2px red rule above it.
- **WHY** her + trust. It is a *warning* label; a quiet red mark says so without turning the text red (which would make it look like an error). Red stays reserved for accept and the one lens row.
- **HOW** `.eyebrow{position:relative;padding-top:12px;letter-spacing:1.4px}` `::before{content:"";position:absolute;left:0;top:0;width:34px;height:2px;background:var(--red)}`.

### 6. Tighten the headline block
- **WHAT** `h1` line-height 1.08, margin `12px 0 26px`, keep 49px / 36px. Set the salutation as a normal paragraph directly under it.
- **WHY** her. The current h1 → "Karen," gap (≈44px) reads as a section break; the letter should begin at once.
- **HOW** `h1{line-height:1.08;margin:12px 0 26px}` and drop `.review>p{margin:15px 0 28px}` for the letter.

### 7. One motion moment, scroll-triggered, with fallbacks
- **WHAT** When the sleeve enters the viewport: segments scale from 0 (staggered 75ms), chapter rows fade/rise (staggered 60ms after a 250ms lead). Nothing else on the page animates.
- **WHY** take (memorability) + her (it demonstrates "in order" without a word). A 55+ reader should never be made to wait for content, so it must be safe.
- **HOW** `IntersectionObserver` at `threshold:.35` adds `.in`; a 4s `setTimeout` adds `.in` regardless; `html.no-js` shows everything static; `@media(prefers-reduced-motion:reduce)` disables it. Keyframes: `fill{to{transform:scaleX(1)}}`, `settle{to{opacity:1;transform:none}}` with `transform-origin:left`.

### 8. Sign off in his hand, not in "note" grey
- **WHAT** The current sign-off is `.note` (15px, muted) — it reads as a footnote. Use the flattened handwriting signature the daily uses (`build-08-daily.py` notes it must be flattened onto `#f4f1e6`), or until then an italic 26px "Marcus".
- **WHY** trust. This is a letter; the last thing she sees before the receipt should be him, not a caption.
- **HOW** `.sign{margin:34px 0 0;font-style:italic;font-size:26px}`; swap to `<img>` of the signature asset when wired, `height:44px`, no background.

### 9. Paper depth without noise
- **WHAT** A faint radial glow on the desk behind the paper and a longer, softer second shadow.
- **WHY** her (nothing changes for reading) + coherence with the daily broadsheet; it lifts the page off the desk without any texture that could compete with 18px text.
- **HOW** `body{background-image:radial-gradient(ellipse at 50% -10%,#e6dec9 0,transparent 60%)}` `.paper{box-shadow:0 2px 10px #42382616,0 18px 40px -30px #42382640}`.

### 10. Sleeve bleeds slightly on phone
- **WHAT** At ≤620px let the sleeve run 6px past the text column on each side.
- **WHY** her. It reads as an object laid on the letter rather than a paragraph in a box; it also buys the chapter names a few characters.
- **HOW** `@media(max-width:620px){.sleeve{margin-left:-6px;margin-right:-6px;padding:16px 14px 14px}.chapters{grid-template-columns:1fr}.time{display:none}}`.

### 11. Do not ship the local test banner styling into the real page
- **WHAT** The grey system-ui banner above the paper is right for the harness and wrong for the customer. Keep it, but make sure the real build has no element above the masthead.
- **WHY** trust. The first thing she sees must be his masthead.
- **HOW** Harness-only class; nothing to add to the customer CSS.

---

## 4. The accept / decline pair

| | Accept | Decline |
|---|---|---|
| Label (COPY.md) | **Yes—add my audio reading for $17** | **No thanks—I'll read it on my own.** |
| Element | `<button type="button">` | `<button type="button">` — a button, not a link |
| Size | full width, `min-height:60px`, 19px (18px phone) | full width, `min-height:60px`, 17px |
| Colour | red fill `#8f2b1f`, cream text `#fffaf0` | transparent, ink text, 1px `#a99f8c` border; hover fills `#ede7d8` |
| Placement | first, directly under the ledger | 12px below accept, same width — no scrolling, no "small print" distance |
| Focus | 3px `#a36b31` ring, 4px offset (existing) | same |

**Hierarchy.** Colour carries the hierarchy, not size, position tricks or wording. Accept is the only red block on the page; decline is the same shape in paper colour. A reader who does not want audio should be able to find her button in the same glance as the one who does.

**Wording-neutral placement.** Because the two buttons are equal in size and adjacent, the page would still be fair if the labels were swapped. That is the test: the layout must not lean on the decline text being softer or smaller.

**What the charge line must show** (in this order, all above the buttons):
1. The offer heading with the price once: *Add your complete audio reading* — **$17**.
2. *One additional payment. Your written order is already confirmed and will continue whether you add audio or not.* (verbatim)
3. The ledger: written reading — tag **Paid** — actual paid amount from the order; audio — tag **Only if you add it** — $17. No total. No strike-through (strike-through reads as a discount).
4. The accept button repeats the price. The decline never mentions money.

Never: a total, a "today you pay", the $35/$47.77 in ink weight next to the $17, a checkbox pre-ticked, or a second confirmation page (SHAPE: accept purchases directly).

---

## 5. What to leave alone

- The copy, in its order. The warning-led argument is approved; the mock only inserts the sleeve between two existing paragraphs and adds UI labels.
- Georgia, the cream/ink/red tokens, the double-rule masthead, the 610px review column, 18px/1.6 body. Continuity with the booking and bridge pages matters more than a new display face for this audience.
- Price shown once beside the offer and once in the button — no more.
- The dynamic deadline (`order.deliveryHours`) in the includes list and any new caption.
- The absence of testimonials, timers, badges, guarantees, bonus stacks and any "preview" audio.
- Decline → thank-you page. Accept → purchase directly. No interstitials.

---

## 6. Copy notes (flagged, not changed)

- COPY.md's eyebrow is *A quick warning before you view your receipt.* with a full stop. Live and mock set it as a small-caps label without the stop. Keep or restore — a one-character call for the copy owner.
- Live page renders the includes heading as *Your audio reading includes:* (colon). COPY.md has no colon. The mock follows COPY.md.
- COPY.md's offer line *Add your complete audio reading — [approved audio price]* is rendered as heading + price at the right on both live and mock; the em dash becomes layout. Fine, but note it when the approved price lands.
- **[UI] text the mock adds, outside COPY.md, for the operator to accept or strike:** sleeve kicker *Your audio reading · running order*; status *Not yet recorded*; lens row *The ten cards read together through The Magician, your personal card*; closing row *The closing advice, and the reasoning behind it*; caption *Recorded after your written reading is prepared. Ready by the same 12-hour deadline. Length shown once recorded.*; ledger tags *Paid* / *Only if you add it*. None states a narrator, a duration, or a customer-behaviour claim. "The ten cards" and "The Magician" are read from the order and must be templated, not typed.

---

## 7. Claimed vs verified

| Claim | Verified how | Status |
|---|---|---|
| Live page measured (h1 49/36px, body 18/17px, accept 59px tall, decline 29px tall, 16px) | Playwright probe against `127.0.0.1:5088/upsell?order=…` at 1100 and 390 | verified |
| Live decline is under 44px tap height | same probe (`h:29`) | verified |
| Mock is one file, < 50 KB, no external JS/CSS/fonts | `wc -c` = 17,252 bytes; inline `<script>` only; portrait embedded as 3.4 KB data URI | verified |
| Mock works at 390px, no horizontal scroll | probe: `docW:390 innerW:390`; screenshots at 390 reviewed | verified |
| Accept and decline both 60px tall, full column width, 12px apart | probe: yes `h:60`, no `h:60`, y 2848/2920 (phone) | verified |
| Reveal animation fires and completes; content visible without scroll trigger | probe after scroll: `segsFilled:12`, chapter opacity 1; 4s fallback added after the first full-page shot showed an empty sleeve | verified (fallback added because of a real failure) |
| Copy is COPY.md verbatim (with `%FIRSTNAME%`→Karen, price token→$17, deadline token→12-hour) | script: every non-empty COPY.md line searched in the mock's text after token substitution — 20 of 21 exact; the one miss is the eyebrow's trailing period (COPY.md *…receipt.*, mock and live *…receipt* as a small-caps label) | verified, one flagged deviation |
| The sleeve chapter names match the test order's positions | copied from `GET /api/orders/<id>` `editionSnapshot.positions` | verified |
| Accept/decline were not clicked on the live order | only `goto` + screenshots were run; `audioDecision` still `pending` in the order JSON fetched afterwards | verified |
| Ledger amount $47.77 is the actual paid total | order JSON `totalCents: 4777` | verified |
| Signature asset exists and is flattened to `#f4f1e6` | from `build-08-daily.py` comments only; the image was not opened | claimed, not verified |
| No existing file was edited | `git status` unchanged apart from the two new files under `design-reviews/` | verified |
| Reduced-motion and no-JS paths | CSS present; not run under an emulated `prefers-reduced-motion` or with JS disabled | claimed, not verified |
