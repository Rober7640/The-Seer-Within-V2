# 08 Marcus — design reviews, 2026-09-13

Five reviewers ran the `frontend-design` skill against the live local pages (booking, bridge, audio
upsell, thank-you), each with one lens so they would not converge. Suggestions only; no existing file
was changed. Each review carries a claimed-vs-verified note at the end.

| # | Lens | Review | Mock |
|---|---|---|---|
| 01 | Booking page — conversion and hierarchy | [01-booking.md](01-booking.md) | [01-booking-mock.html](01-booking-mock.html) |
| 02 | Bridge + thank-you — the second after paying | [02-bridge-thank-you.md](02-bridge-thank-you.md) | [02-bridge-mock.html](02-bridge-mock.html) |
| 03 | Audio upsell — making sound believable | [03-audio-upsell.md](03-audio-upsell.md) | [03-audio-upsell-mock.html](03-audio-upsell-mock.html) |
| 04 | Visual identity across all four | [04-visual-identity.md](04-visual-identity.md) | [04-identity-sheet.html](04-identity-sheet.html) |
| 05 | The over-55 phone reader — measured | [05-over-55-phone.md](05-over-55-phone.md) | [05-form-mock.html](05-form-mock.html) |

## Where all five agree

1. **The pages are not yet the email she clicked.** The email is a Bodoni nameplate, Spectral body,
   Scotch rules, `FIG.` captions and a photograph of the table. The pages are Georgia, a side-by-side
   logo masthead, web-card shadows and beige slabs. Reviews 01 and 04 reach this independently; 04
   proposes one token sheet shared with `build-08-daily.py` so email and page use one palette and
   two typefaces. This is the highest-value change and mostly a `:root` plus ~20 rules.
2. **Small type is too small.** Measured: eyebrows 12px, footer 11px, instruction copy 16px grey,
   body cut to 17px on phones (05). Floor: nothing under 13px, body 18px on phone.
3. **Tap targets.** Decline link 29px tall, checkbox 22px at the far-left edge (05); 03 and 02
   independently make decline a full-size outlined button and put the checkbox in a 56px row.
4. **Red is spent too often.** The bump box border, its checkbox and the eyebrow text all use the
   action red (01, 04). Keep red for the button and one stamp-like mark per page.
5. **The booking page is too long on a phone.** Price at 3.3 screens, pay button at 4.7, seven
   face-down backs occupy 1.4 screens she cannot tap (05, measured; 01 measured the same).
6. **The error message is in the wrong place** — rendered below the pay button, hidden when the
   keyboard is up (05). Per-field errors above the input, scroll to the first.
7. **The thank-you total is the loudest thing on the page** (02) — 27px bold "$47.77" is what
   triggers "was I charged twice?". Status first, total last and quieter; one spelling of the price (05).
8. **Copy and form disagree today**: the booking text promises name + date of birth; the form has
   first/last/email (01, 05). Wave 2 T6 resolves this with the four-field form.

## Where they conflict — Joel picks

| Question | Option A | Option B | Coordinator's read |
|---|---|---|---|
| The seven face-down positions on a phone | **01:** a ruled ledger — small back + question at 19px, read down like a column (price ~450px sooner) | **05:** keep the grid, 3-up on phones (~700px instead of 1,153) | Ledger is more "letter", grid is more "cards". Ledger also survives 12-card spreads better |
| Date of birth input | **01:** Day / Month-name select / Year | **05:** three numeric boxes Month · Day · Year, no picker, no dropdowns (iOS date pickers default to today and hide year mode; dropdowns are three wheel modals) | 05's is argued from device behaviour and the GOV.UK pattern; take it, with month first for a US list |
| Column width on desktop | **01:** 880 → 680px (65-char measure like the letter) | **04:** notes a ~95-char measure as generic; same direction | Agree; 680 |
| Motion | **04:** one paper-like moment per page (cards dealt · rule draws · offer surfaces · receipt prints) | **01/02/03:** each proposes the same moment for its page | Agree; `prefers-reduced-motion` guards everywhere |

## Mock flags (things the mocks say that must not ship as-is)

- **03 names her personal card** ("The Magician, your personal card") in the running-order sleeve.
  No page or email may name her card before the report; the sleeve row must say "your personal
  card" without a name. The sleeve also lists ten chapters plus lens plus closing — fine, but the
  count must come from the edition, not be hard-coded.
- **03's `animation-timeline: view()`** and scroll trigger: the sleeve renders empty in a headless
  full-page capture until the trigger fires; the timed fallback covers real browsers.
- **01's card back** links a file that is not on S3 (`08-booking-card-back.jpg`); a hosted single
  back is needed (`assets/email/cards/` has faces only).
- All mocks add UI micro-copy (captions, hints, error sentences, ledger tags). Each review lists
  them; every one goes through `cold-read` before it ships.

## Rulings — Joel, 2026-09-13

1. **Bridge is a redirect page, not a click.** It shows the order-is-safe message and moves to
   Upsell 1 by itself after 5–10 seconds. Keep one plain "continue now" link for anyone who does
   not want to wait or has scripts off; the countdown also gives the Stripe webhook time to land
   before the upsell page reads order state.
2. **Upsell 1 keeps the audio player treatment** (03's running-order sleeve) — with the fix that it
   never names her personal card, and the chapter count comes from the edition.
3. **No order form on the booking page.** ⚠ **Superseded 2026-09-14, re-confirmed 2026-09-15 (Joel):
   birth name and date of birth are collected on OUR booking page (three boxes, MM/DD/YYYY), never as
   Stripe custom fields — Stripe's docs forbid personal data there. Kept below as the record of the
   original ruling.** Original: Stripe's hosted Checkout collects name, email and card;
   full birth name and date of birth go in as Stripe custom fields (Checkout allows three). The
   booking page is: cards → price → speed bump → one button to Stripe. 01's form section and the
   whole of 05-form-mock.html are therefore moot; 05's type, tap-target and length findings stand.
   Consequence: date of birth arrives as free text with no format validation inside Stripe, so the
   server validates it after payment and a bad value routes to support instead of blocking the order.

## Suggested order of work (wave 2, T6–T8)

1. Token sheet from 04 applied to the local SPA (`:root`, fonts, rules, masthead) — one pass, all pages.
2. Booking: 01's layout (column, left headline, three cards in a row, table photo, price block)
   with 05's measured floors; birth-name/DOB boxes (superseded the no-form rule, 2026-09-14) + bump + one button to Stripe Checkout (no custom fields).
3. Bridge: 02's mock reworked as a 5–10 s auto-redirect with a "continue now" link.
4. Upsell: 03's ledger + full-size decline; the sleeve only after the card-name fix and a decision
   on whether an "object" is wanted at all.
5. Thank-you: 02 §4 status rows; total last.
