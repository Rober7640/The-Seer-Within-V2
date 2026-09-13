# 05 — The over-55 phone reader

**Lens:** a woman over 55, one thumb, reading glasses maybe not on, first thing in the morning, just tapped the link in Marcus Stone's email.
**Pages:** booking · bridge · audio upsell · thank-you (`local/08-marcus/index.html`, served at 127.0.0.1:5088).
**Measured live** with Playwright at 390×844 and 320×740 (iPhone-class, DPR 2, touch). Text-zoom 120% simulated by scaling every element's computed font-size ×1.2. Contrast computed from the CSS hex values. Raw numbers: scratchpad `measure.json`.

## The chain

**What we found.** The bones are right: 17px Georgia at 1.6, ink on cream at 15:1, 54–56px fields and buttons, a real focus ring, no horizontal scroll even at 320px with text zoomed. What fails is everything *around* the main text: ten "POSITION n" eyebrows at 12px, a 22px checkbox, a 29px-tall decline link, a 14px error message that renders *below the pay button*, and grey 16px instruction copy sitting exactly where she has to read most carefully (the name explanation before the form). On the booking page she scrolls **3.3 screens before she sees a price** and **4.7 screens before the pay button**, and 1.4 of those screens are seven identical card backs she cannot tap.

**What it means for her.** She can read Marcus's letter but not the labels. She will tap the checkbox and miss. If she mistypes her email she will not see the error. The wall of face-down cards reads as "am I supposed to tap these?" and she has nothing to do for a full screen and a half.

**What we do.** Ten CSS-level fixes below, ordered by how many buyers they touch. Fix 1–4 are one-line size changes. Fix 5 (the error message) is the only one that needs a few lines of JS. The four-field form is new; section 4 specifies it and `05-form-mock.html` shows it.

---

## 1. Measured findings

Thresholds: body ≥ 17px · line-height ≥ 1.5 · no text < 13px · tap targets ≥ 44px · text contrast ≥ 4.5:1 (≥ 3:1 large, ≥ 3:1 non-text) · one primary action per screen.

### Contrast (from CSS, applies to every page)

| Pair | Ratio | Threshold | Result |
|---|---|---|---|
| Body ink `#201c16` on paper `#f4f1e6` | 14.99 | 4.5 | pass |
| Muted `#665d4e` on paper (labels, eyebrows, footer, small print) | 5.73 | 4.5 | pass |
| Muted on soft `#ece6d8` | 5.21 | 4.5 | pass |
| Ink on soft (status box, offer stack) | 13.62 | 4.5 | pass |
| Button text `#fffaf0` on red `#8f2b1f` | 7.97 | 4.5 | pass |
| Red text on paper (decline link, error, links) | 7.33 | 4.5 | pass |
| Red text on soft (`#fulfill` link) | 6.66 | 4.5 | pass |
| Focus ring `#a36b31` on paper (ring sits 4px outside the control, so on paper) | 3.95 | 3.0 | pass |
| **Input border `#a99f8c` on paper** | **2.31** | 3.0 | **fail** — empty fields barely register as boxes |
| Rule `#bcb29e` on paper (decorative) | 1.86 | n/a | ok, decorative |
| Test banner `#423b2f` on desk | 7.29 | 4.5 | pass (test build only) |

### Booking page — 390×844

| Element | Measured | Threshold | Result |
|---|---|---|---|
| Body font / line-height | 17px / 27.2px (1.6) | ≥17 / ≥1.5 | pass — at the floor; desktop gets 18px, phone is *cut* to 17 |
| Page length | 4,175px = **4.95 screens** | — | long |
| Price first visible | y 2,759 = **3.27 screens down** | — | late |
| First form field | y 3,260 = 3.86 screens | — | late |
| Pay button | y 3,946 = **4.68 screens down** | — | late |
| Footer `MARCUS STONE · THE SEER WITHIN` | **11px** | ≥13 | fail |
| `.position` eyebrow "POSITION 4" (×10, uppercase, 1.6px tracking, muted) | **12px** | ≥13 | fail |
| `.review-label` "OPTIONAL SPEED UPGRADE" | **12px** | ≥13 | fail |
| `.card-name` "The Moon" (×3, muted) | 13px | ≥13 | borderline |
| `.role` "Daily Tarot Reader" | 13px | ≥13 | borderline |
| `.under` "Local test only…" | 14px | ≥13 | pass (test copy) |
| `.error` message | 14px, rendered **after** `#app` i.e. below the pay button | ≥17 wanted, near the field | fail |
| Card labels `figcaption` | 16px | ≥17 for reading copy | soft fail |
| `.name-note` (8 lines, grey, the instruction for the form) | 16px muted | ≥17 | soft fail |
| Field `label` | 16px | ≥17 | soft fail |
| `.extra-desc` bump explanation | 16px muted | ≥17 | soft fail |
| Input `#first-name`, `#last-name` | 54 × 326px | ≥44 | pass |
| Input `#email` (inline-styled, no class) | 53.2 × 326px | ≥44 | pass |
| Checkbox `#same-day` box | **22 × 22px** | ≥44 | fail |
| Checkbox row `label.check` (tappable, but she doesn't know that) | 47.6px tall | ≥44 | pass by accident |
| Pay button `#pay` | 55.8 × 326px, 17px text | ≥44 | pass |
| Total updates on tick | scrollY 3331→3331, doc height 4175→4175, button text `$35.00`→`$47.77` | no jump | **pass** — no jump, total + button both visible while ticking |
| Focus-visible (Tab through all 6 controls) | `solid 3px #a36b31`, offset 4px, `:focus-visible` true on each | visible ring | pass |
| Horizontal overflow | none | none | pass |
| Text zoom 120% | 5.77 screens; no h-overflow; labels stay under cards; checkbox still 22px | reflows | pass (checkbox still fails) |
| Primary actions on the pay screen | pay button + (test-only) "Start a new test" link at top of page | one | pass |

### Booking page — 320×740

| Element | Measured | Threshold | Result |
|---|---|---|---|
| Page length | 4,526px = **6.12 screens** | — | long |
| Price / pay button | 3.92 / **5.81 screens down** | — | late |
| Card grid columns | 2 × 117px, gap 22px | labels under their cards | **pass** — captions 117px wide, `scrollWidth ≤ clientWidth` on all 10 |
| Longest label "What you already understand" | wraps to 3 lines (108.9px caption) | readable | pass |
| Face-down card size | 112px wide in a 117px column | — | ok |
| h1 "Let's look at where it's costing you most." | 37px, −0.9px tracking, **4 lines**, 163px tall | — | soft fail (tight tracking at 4 lines) |
| Checkbox row | 71.4px tall (3 lines of label); box still 22px | ≥44 | box fails |
| Text zoom 120% | 7.47 screens; bump `.price-row` overflows **223 > 218px**; "Total USD" wraps to two lines; h1 195px tall | no overflow | **fail** (5px, from `.price-row h2{max-width:220px}` + `white-space:nowrap` price) |

### Bridge page

| Element | 390 | 320 | Threshold | Result |
|---|---|---|---|---|
| Page length | 1.28 screens | 1.60 | — | good |
| `.eyebrow` "ORDER CONFIRMED" | 13px | 13px | ≥13 | borderline |
| Footer | 11px | 11px | ≥13 | fail |
| Continue button | 55.8 × 326 | 55.8 × 256 | ≥44 | pass |
| Primary actions | one | one | one | pass |
| Text zoom 120% | 1.59 screens | 2.04; `.status-box` reports 260 > 256 (the long email string) | — | 320+zoom: email may clip by 4px — add `overflow-wrap:anywhere` on the `<strong>` |

### Audio upsell page

| Element | 390 | 320 | Threshold | Result |
|---|---|---|---|---|
| Page length | 2,469px = 2.93 screens | 3.86 | — | long for a yes/no |
| Yes button first visible | 2.57 screens down | 3.4 | — | late; 10 paragraphs first |
| `.step-label` "A QUICK WARNING BEFORE YOU VIEW YOUR RECEIPT" | **12px**, 2 lines | 12px | ≥13 | fail |
| `p.note` "Marcus" sign-off | 15px | 15px | ≥13 | pass |
| `.summary p` "One additional payment…" | 16px | 16px | ≥17 | soft fail |
| Yes button `#audio-yes` | 55.8 × 326 | 79.6 × 256 (2 lines) | ≥44 | pass |
| **Decline `#audio-no`** (text-button, 16px) | **29.4 × 240.6px** | 29.4 × 240.6 | ≥44 | **fail** |
| Gap between Yes and decline | 24px | 24px | — | ok |
| Focus-visible | ring on Yes and on decline | same | — | pass |
| Text zoom 120% | decline 33.9px | 60.8px (2 lines) | ≥44 | still fails at 390 |
| Primary actions | one + a de-emphasised decline | — | one | pass |

### Thank-you page

| Element | 390 | 320 | Threshold | Result |
|---|---|---|---|---|
| Page length | 1.41 screens | 1.84 | — | good |
| Order lines / total | 17px / 25px | same | ≥17 | pass |
| `#fulfill` "Generate local PDF fixture" (test-only text-button) | **29.4 × 187px**, 16px | same | ≥44 | fail (same `.text-button` rule as the decline link) |
| Footer | 11px | 11px | ≥13 | fail |
| Primary actions | the only control is the test fixture link | — | — | n/a; in production there is nothing to do here, which is right |

---

## 2. Reading-order walk — booking page at 390×844

Five screens (`screen-booking-390-00..04.png` in the scratchpad). Right-handed, one thumb; comfortable thumb zone is the bottom ~60% of the screen and the right two-thirds of its width.

| Screen | What she sees | What her thumb does |
|---|---|---|
| **1** (0–844) | Test banner (test build only, ~230px — will not ship). Marcus's portrait and name. Headline "Let's look at where it's costing you most." (37px, 2 lines). Centered intro, 3 lines. The tops of the Moon and Two of Swords cards, with their labels just at the bottom edge. | Nothing to tap. She swipes up. The cards are the first thing that looks like content. |
| **2** (844–1688) | Three of Pentacles alone in the left column (right column empty). Double rule. "What we'll look at next" (27px). The bridge paragraph — **9 lines, centered**, so every line starts in a different place. Tops of two face-down cards. | Nothing to tap. She swipes up. The centered paragraph is the hardest reading on the page: ragged left edge, 17px, no paragraph break. |
| **3** (1688–2532) | Six identical blue card backs in a 2×3 grid, each with a 12px "POSITION n" eyebrow and a 16px label. | Nothing to tap — but they look tappable (cards, shadows, face down). She may tap one, get nothing, and lose trust. She swipes up through 1,153px of backs (1.4 screens in all). |
| **4** (2532–3376) | Position 10 alone (left column, right empty). Double rule. **"Your personal reading — $35"** — the first price, 3.3 screens in. Offer paragraph (17px ink, 5 lines). Then the **name-note: 8 lines of 16px grey** telling her Marcus needs "your full name as it was given at birth and your date of birth" — but the form beneath asks for first name, last name, email. Then "First name" label and an empty field at the very bottom edge. | Thumb goes to the field at y≈3,260 — bottom 20% of the screen. Keyboard opens and covers the lower half; the field is scrolled up by the browser. She types, taps "next" or scrolls. |
| **5** (3376–4175) | Last name. Delivery email (prefilled with a test address; in production, empty or from the link). Red-bordered bump box: "OPTIONAL SPEED UPGRADE" (12px), "Receive it within 12 hours +$12.77", 3 lines of 16px grey, a **22px checkbox at the far left** (x 32–54px — the hardest spot for a right thumb) with 2 lines of text. Rule. "Total USD $35.00". Full-width red button. 14px "Local test only" line. 11px footer. | Left thumb-stretch to the checkbox, or a miss onto the text (which does toggle it, but she does not know that). Then the red button, full width, 56px, in the thumb zone. If validation fails, the message appears **below** the button at 14px red — off-screen if the keyboard is up. |

**Where the price lives vs where her attention is.** She gets the *what* (cards) for 3 screens and the *how much* on screen 4. Nothing on screens 1–3 tells her a purchase is coming or how far away it is. That is fine for a warm email click, but the seven card backs cost her a full screen and a half of scrolling for zero information beyond the 7 position labels.

---

## 3. Prioritised fixes

Ordered by buyers affected × severity. Each is CSS in the `<style>` block of `index.html` unless noted. Sizes below are for the `@media(max-width:620px)` block unless stated.

### 1. Raise every piece of small type to 14px minimum, and the reading copy to 17
**What.** `.footer` 11→13px · `.position` 12→14px and tracking 1.6→1px · `.review-label`, `.step-label` 12→14px · `.eyebrow`, `.role`, `.card-name` 13→15px · `.error`, `.under`, `.selection-note` 14→16px · `figcaption`, `label`, `.name-note`, `.extra-desc`, `.remaining>p`, `.summary p` 16→17px.
**Why (her).** 12px uppercase tracked grey is texture, not text, without glasses. "POSITION 4" appears ten times and she cannot read one of them. The name-note is the one paragraph that explains what the form is for, and it is the smallest, greyest paragraph on the page.
**How.** In the phone block: `.position{font-size:14px;letter-spacing:1px}.review-label,.step-label{font-size:14px}.eyebrow,.role,.card-name{font-size:15px}.footer{font-size:13px}figcaption,label,.name-note,.extra-desc,.remaining>p,.summary p{font-size:17px}.error,.under{font-size:16px}`. The `.position` eyebrow can also simply be folded into the label — "4 · What you keep excusing" at 17px — which removes the 12px text entirely.

### 2. Stop cutting body text to 17px on phones; go the other way
**What.** `body{font-size:17px}` in the phone media query → 18px. Keep 1.6.
**Why.** Phones are held further away than laptops by readers with presbyopia, not closer. The desktop reader gets 18px; she gets 17.
**How.** Change the one declaration. Re-check the 320 h1 wrap (fix 8) after.

### 3. Make the checkbox a target, and make the whole row look tappable
**What.** Box 22→28px; row `min-height:56px` with padding so the tap zone includes the words; a pressed state.
**Why.** 22px at the far-left edge is the worst spot for a right thumb. She does not know the words toggle it.
**How.** `.check{min-height:56px;padding:12px;margin:8px -12px 0;border-radius:4px}.check:active{background:var(--soft)}.check input{width:28px;height:28px;flex:0 0 28px}`. Optionally make the entire `.booking-bump` a `<label>` so the whole red box toggles.

### 4. Decline link (and every `.text-button`) to 44px
**What.** `#audio-no` is 29.4px tall.
**Why.** The decline is the one control a hesitant reader hunts for; a miss lands on nothing and she taps again, harder, or gives up and taps Yes because it is the big thing.
**How.** `.text-button{display:inline-flex;align-items:center;min-height:44px;padding:8px 0;font-size:17px}.back{margin-top:16px}`. Keep it underlined and red; do not make it a second box.

### 5. Put the error where she is looking, at 17px, and stop relying on native bubbles
**What.** `#error` is one `<p>` rendered *after* `#app`, i.e. below the pay button and the "Local test only" line. Fields carry `required` so iOS shows its own small, vanishing bubble first. The `input[aria-invalid=true]` style exists but nothing sets the attribute.
**Why.** With the keyboard up she cannot see below the button. A 14px red line under a test-copy line is not where a first-time buyer looks.
**How.** `novalidate` on the form; per-field `<p class="err" id="e-…">` placed **between the label and the input** (visible even when the keyboard is up and the browser scrolls the field into view); set `aria-invalid="true"` + `aria-describedby`; on submit focus the first invalid field and `scrollIntoView({block:'center'})`. Copy starts with "Error:" so it does not rely on colour. `.err{font-size:17px;font-weight:bold;color:var(--red)}`. Keep the global `#error` for server failures only, but move it *above* the pay button.

### 6. Shrink the wall of card backs to one screen
**What.** Seven face-down cards in a 2-column grid = 1,153px at 390 (1.4 screens), 10 position labels she cannot act on.
**Why.** They look tappable and are not. She has nothing to do for a screen and a half, and the price is 3.3 screens down.
**How.** Phone block: `.down-cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px 12px}.down-cards .tarot{max-width:88px}` — 3 rows instead of 4, ~700px instead of 1,153. With fix 1's 14px eyebrow or folded labels the captions still fit (measured 117px columns at 320 hold 3-line labels; at 3-up the column is ~104px at 390 and ~85px at 320 — set `figcaption{font-size:16px}` inside `.down-cards` only at ≤360px). Alternative if the seven-card image is sacred: keep 2-up but add a one-line pointer under the h1 — "Your personal reading is $35. The form is at the bottom of this page." — so she knows what is coming.

### 7. Left-align the long centered paragraphs
**What.** `.intro p` (3 lines) can stay centered. `.remaining .bridge` (9 lines at 390, 11 at 320) and `.remaining>p` should not be.
**Why.** Every line of centered text starts in a new place; an older eye has to find the start each time. Nine lines of that is the single hardest block on the page.
**How.** `.remaining .bridge{text-align:left;max-width:560px;margin-left:auto;margin-right:auto}`. Keep the h2 centered.

### 8. Let price rows wrap instead of clipping
**What.** At 320 with 120% text the bump's `.price-row` overflows by 5px; "Total USD" wraps to two lines; the h1 becomes 5 lines at −0.9 tracking.
**Why.** She is the person most likely to have text zoom on.
**How.** Remove `.price-row h2{max-width:220px}`; add `.price-row,.total{flex-wrap:wrap;gap:4px 16px}`; `@media(max-width:360px){h1{font-size:33px;letter-spacing:0}}`. On the bridge page add `.status-box strong{overflow-wrap:anywhere}` for long email addresses.

### 9. Make the fields look like fields
**What.** Border `#a99f8c` is 2.31:1 on paper, 1px, transparent fill.
**Why.** An empty box on cream with a faint 1px line disappears in morning light or with glasses off. She taps the label, nothing happens (labels are `for`-linked so it does focus, but she cannot see the box she is now typing into until the caret blinks).
**How.** `input[type=text],input[type=email]{border:2px solid #776d5b;background:#fffdf7;font-size:19px;height:58px}` (4.5:1 border on paper). Move `#email`'s inline style into the same rule so it stops drifting from the other two.

### 10. The email field needs its attributes
**What.** `#email` has no `autocomplete`, `inputmode`, `autocapitalize="none"` or `spellcheck="false"`; it is prefilled with a test address.
**Why.** iOS will capitalise the first letter and autocorrect "gmail" without these; autofill will not offer her address. A wrong email is the one error that silently loses the whole order.
**How.** `autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false"`; in production prefill from the AWeber link (`?e=` param) and show it editable, with the hint "Check it once — this is where the reading goes." (See section 4.)

### 11 (small). One way of writing the price
**What.** "$35" on the offer row, "$35.00" on the total, "Simulate payment — $35.00" on the button.
**Why.** Three spellings of the same number reads as three numbers when she is checking she is not being overcharged.
**How.** Use `$35` everywhere the number is whole; `$47.77` when it isn't. Under the total add a 17px muted line that changes with the checkbox: "Personal reading $35 + 12-hour delivery $12.77" — the total already updates without a jump (measured), but nothing tells her *why* it changed.

### 12 (upsell copy, not CSS — flagged only). 10 paragraphs before the yes/no
The Yes button is 2.6 screens down at 390 and 3.4 at 320, after ten paragraphs at 17px. Copy is owned elsewhere; from her side the only design change worth making is raising the "A QUICK WARNING…" step-label from 12px (fix 1) so the frame is readable, and keeping the offer-stack box (which is the scannable summary) where it is.

---

## 4. The four-field form (new)

Fields: **display first name · full birth name · date of birth · delivery email.** Mock: `05-form-mock.html` (8.6 KB, renders at 390 and 320 with no overflow; every field 58px tall; smallest text 14px eyebrow, everything she reads 17–19px).

### Order and labels
1. **What should I call you?** — hint "Your first name is fine." `autocomplete="given-name" autocapitalize="words"`.
2. **Your full name as it was given at birth** — hint "The name on your birth certificate, before any marriage." This is where autofill is actively *wrong*: Chrome/Safari will offer her current name. Use a non-standard `name="birth-name"` and `autocomplete="off"` (Chrome may still suggest; the hint copy does the real work). Do **not** split into first/middle/last — she should type it as one line the way it was written.
3. **Your date of birth** — see below.
4. **Where should I send your reading?** — hint "Check it once — this is where the reading goes." `type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false"`. Prefill from the email link when the param is present.

Email last, not first: it is the field most likely to be prefilled and the one she double-checks right before paying. Also move the explanation ("Why I ask for your name and birthday") **above** the form as 2 sentences in ink on a soft panel, not 8 lines of grey. The current name-note promises a birth-date field that does not exist on the live form — that mismatch goes away.

### The date input: what each option does on her phone

| Option | iOS Safari (her most likely phone) | Android Chrome | Verdict for a 55+ birth date |
|---|---|---|---|
| **Native `<input type="date">`** | Renders as a blank pill; `placeholder` is ignored, so an empty field shows *nothing*. Tap opens a calendar popover defaulting to **today**; to reach 1965 she must know to tap the "September 2026" header to get the year wheel. The control's height collapses unless `min-height` + `-webkit-appearance:none` are set; `display:flex` inside a label misbehaves. | Material calendar dialog defaulting to today; year is reachable by tapping the header year, then scrolling a year list. Better than iOS but still 3–4 taps and a scroll of 60 rows. | **No.** Pickers are built for near dates. A 60-year-old date is 700 months of swiping or a hidden year mode. |
| **Three `<select>` dropdowns** | Each opens the iOS wheel. The year wheel is 100 rows; the wheel is familiar to her but slow, and three wheels is three modal interruptions. Month names vs numbers is a choice; wheels do not autofill. | Native dropdown lists; year list 100 rows. | Workable but slow; three modals. Second choice. |
| **One text field with a format hint** | Numeric keyboard if `inputmode="numeric"`. She must know the order (US: MM/DD/YYYY) and where the slashes go; auto-inserting slashes as she types is fragile with backspace. "3/4/61" is ambiguous. | Same. | No — one field means one ambiguous format and one vague error. |
| **Three numeric text boxes — Month · Day · Year** (the GOV.UK "memorable date" pattern) | Numeric keyboard on all three; no picker, no wheel; she types what she already knows: `3` `14` `1961`. Tab/next moves along. `autocomplete="bday-month|bday-day|bday-year"` is honoured by Chrome and Safari when a birthday is saved. Identical on iOS and Android. | Identical. | **Yes.** Three boxes, one visible example ("For example, 3 14 1961"), no modes. This is what the mock shows. |

Implementation notes for the three boxes: `type="text" inputmode="numeric" pattern="[0-9]*"` (not `type="number"` — spinners, and iOS's number keyboard lacks a "next" path on some versions); Month first for a US list (the current copy and prices are USD); `maxlength` 2/2/4; the year box wider (7ch) than the others (5ch); labels above each box at 17px; accept `61` and expand to `1961` only if the operator wants forgiveness — safer to require 4 digits and say so in the error. Validate on submit only (not on blur — a blur error while she is still typing the year reads as "you did it wrong").

### Error copy placement
- **Above the field, below the label** (mock shows it). The keyboard hides the bottom third of the screen; browsers scroll the *focused field* into view, not what is under it. Text under the field is the text most likely to be hidden.
- 17px, bold, red `#8f2b1f` (7.3:1), starts with "Error:" so it works without colour. Border of the bad field goes red at 3px.
- One plain sentence that says what to do, not what is wrong: "please enter your first name", "the year should have four numbers, for example 1961", "that email address is missing the part after the @".
- On submit: mark every bad field, focus the first one, scroll it to the middle of the screen. No error summary block — on a 4-field form the summary is further away than the field.
- Keep the pay button enabled; a disabled button with no explanation is the classic "the site is broken" for this reader.

### Autofill
Let it help where it is right (first name, email, birthday tokens) and get out of its way where it is wrong (birth name). Test on a real iPhone with a saved Contact card: Safari offers "AutoFill Contact" above the keyboard, which fills given-name and email in one tap — that is the fastest path for her and it only works if the tokens are set.

### Checkbox and total
As in fix 3 and fix 11: 28px box, 56px row, a line under the total that names what the total contains. The pay button says what it does and the amount: "Pay $35 and start my reading".

---

## 5. What to leave alone

- **Georgia at 1.6.** A serif she has read all her life, generous leading, ink at 15:1. Do not swap it for a display face — the skill's "avoid system fonts" rule is about brand novelty; her lens says a familiar face is the feature.
- **Cream paper on a darker desk.** Lower glare than white, still 15:1 for body text. Keep the double rules; they are the only structure she can see at arm's length.
- **Full-width red buttons at 56px with 8:1 text.** Right size, right colour, one per page. The hover darkening is fine.
- **The 54px inputs and the focus ring.** Both already pass; fix 9 only adds contrast to the border.
- **Total updating in place.** Measured: no scroll jump, no height change, checkbox + total + button all in view while she ticks. Do not replace this with a sticky bar.
- **The 2-column card grid.** It holds at 320px with 3-line labels under their own cards; the face-up cards at 145px are big enough to see the art. Only the *face-down* grid needs to shrink (fix 6).
- **Bridge and thank-you pages.** 1.3–1.8 screens, one action or none, order lines at 17px. Right length, right hierarchy. Only the 11px footer and (test-only) fixture link need the global fixes.
- **The order of the upsell (written order secured first, then the ask).** That reassurance box is the best thing on the page for a wary buyer; keep it in the soft panel at 17px ink.
- **No sticky headers, no modals, no toasts.** None exist; do not add any.

---

## Claimed vs verified

**Measured (Playwright, 390×844 and 320×740, DPR 2, touch, on the running local server; 4 pages × 2 widths):** computed body font-size and line-height; the font-size of every text node on every page (min, <13px, <17px lists); bounding boxes of every input, checkbox, label, button and text-button; y-position of price, first field, pay button, footer on each page and the resulting screen counts; card-grid column widths, image and caption boxes and caption overflow at both widths; document scroll width (no horizontal overflow at either width); total/button text before and after ticking the checkbox, with scrollY and document height before/after; `:focus-visible` state and computed outline after keyboard Tab on every control of the booking and upsell pages; the 120% text-zoom reflow (screens, overflowing elements, target heights, grid captions) on all four pages at both widths; the mock's target sizes, text sizes and overflow at both widths and its byte size.

**Computed from CSS, not observed on a device:** all contrast ratios (WCAG relative luminance from the hex values in `:root` and the rules); the 3:1 border colour candidate `#776d5b`.

**Simulated, not real:** iOS text zoom was approximated by multiplying every element's computed font-size by 1.2 in the DOM. Real iOS "Larger Text" also scales some form-control chrome and the date picker; direction of the result (reflow holds, price-row clips at 320) is reliable, exact pixel values are not.

**Estimated from experience, not measured here:** the behaviour of `<input type="date">`, `<select>` wheels and Safari AutoFill on iOS vs Android in section 4 (based on current WebKit/Chrome behaviour; not run on a device in this review); the thumb-zone geometry in the walk; "looks tappable" for the face-down cards is a judgement, not a test with users.

**Not done:** no click on the upsell Yes/No (as instructed — the existing order was left untouched); the booking form was filled and the checkbox ticked but never submitted, so no new order was created; no existing file was edited; the two files written are `design-reviews/05-over-55-phone.md` and `design-reviews/05-form-mock.html`. The "Start a new test" banner link, "Local test only" line and "Generate local PDF fixture" button were measured but treated as test-build-only.
