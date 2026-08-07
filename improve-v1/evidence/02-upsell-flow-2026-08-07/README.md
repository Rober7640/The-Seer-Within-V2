# Offer 02 — U1 + U2 flow screenshots (2026-08-07)

Playwright walked both rebuilt upsells end to end and captured what the buyer
actually sees. iPhone-ish viewport, **430×880 at 2× DPI**, `?demo=true`.

Build under test: `client/src/lib/twinFlameUpsellCopy.ts` + the pinned chat shell.
Decisions behind it: [`00i-DELIVERABLES-U1-U2.md`](../../v1-one-time-BEs/docs/00i-DELIVERABLES-U1-U2.md).

## U1 — Protection Ritual, `/tarot/twin-flame/welcome1`

| File | What it shows |
|---|---|
| `U1-01-opens.png` | first bubble — *"Your twelve are booked"* |
| `U1-02-mid.png` · `U1-03-mid.png` | the gap, then the risk |
| `U1-04-pause-go-on.png` | **tap 1** after bubble 15 |
| `U1-05-mid.png` · `U1-06-mid.png` | the stone, the ritual |
| `U1-07-pause-i-m-listening.png` | **tap 2** after bubble 30 |
| `U1-08-mid.png` | what she'll feel, the spread block |
| `U1-09-pause-tell-me.png` | **tap 3** after bubble 41 |
| `U1-10-mid.png` | delivery |
| `U1-11-offer-cta.png` | **the offer** — $47, *"Yes, guard me while I wait"* |
| `U1-21..24-exit.png` | decline → her *"Not right now"* → the soft exit |
| `U1-FULL-conversation.png` | all 50 messages in one tall image (860×12116) |

## U2 — Manifestation Bracelet, `/tarot/twin-flame/welcome2` (Path A)

| File | What it shows |
|---|---|
| `U2-01-opens.png` | *"both are confirmed now"* |
| `U2-02-mid.png` | the Chariot reveal |
| `U2-03-pause-go-on.png` | **tap 1** after bubble 11 |
| `U2-04..05-mid.png` | the gap, the eight stones |
| `U2-06-pause-i-m-listening.png` | **tap 2** after bubble 29 |
| `U2-07-mid.png` | which stone, how to wear it |
| `U2-08-pause-tell-me.png` | **tap 3** after bubble 42 |
| `U2-09-mid.png` | social proof, price |
| `U2-10-offer-cta.png` | **the offer** — $47 |
| `U2-21-downsell-30.png` | decline → **the $30 downsell**, *"No thanks, just my twelve"* |
| `U2-22..24-exit.png` | second decline → the soft exit |
| `U2-FULL-conversation.png` | all 50 messages in one tall image (860×13436) |

⚠ The `FULL-conversation` images are produced by unrolling the scroll container,
so they are a reading aid, not a layout reference. Judge layout from the numbered
viewport shots.

## What the run confirmed

- **50 bot bubbles each**, three continue taps at exactly the intended seams
  (U1 15/30/41 · U2 11/29/42), and no text input anywhere in either flow.
- **The handoff works in a real browser**: U1's decline landed on
  `/tarot/twin-flame/welcome2?session_id=…` — staying inside offer 02, which had
  previously only been proven by unit test.
- U2's second decline landed on `/success?session_id=…&upsell=true` — V1's
  success page, as expected while `02-T1` is unbuilt.
- Every button is on screen when it appears; nothing is clipped behind the footer.

## The accept path (added 2026-08-07, after the first pass)

Captured by stubbing ONLY the money endpoints in the test browser
(`/api/upsell/charge`, `/api/upsell2/charge`, the two shipping saves). Nothing was
charged and no Stripe was involved — this shows the client-side flow past the
charge, which is otherwise unreachable until 02's checkout exists.

| File | What it shows |
|---|---|
| `U1-31-accepted-shipping-form.png` | accept → *"Both are set now — your twelve, and your stone"* → the address form |
| `U1-32-shipping-filled.png` | filled in |
| `U1-33..36-confirmed.png` | the confirmation copy, then → `/tarot/twin-flame/welcome2` |
| `U2-31..37-accepted.png` | accept → attuned-tonight copy (Path A skips the form, address on file) |
| `U2-38-THANKYOU-page.png` · `THANKYOU-full.png` | **the thank-you page she lands on** |
| `THANKYOU-with-name.png` | the same page with a real first name, so the email subject line renders in full |
| `OVERLAP-430x880.png` · `OVERLAP-375x667.png` | the volume-button collision, before the fix |

## Two things to look at — both now FIXED

1. **The volume button was stealing taps.** Measured at the CTA: the toggle is
   44×44 at `bottom-4 right-4`, the CTA stack is full-width to `right-4`, so they
   share an edge — it covered the last **11% (430px) / 13% (375px)** of the
   decline button, and `elementFromPoint` at its centre returned the music icon,
   not the button beneath. On the shipping form it sat on the **submit**. Fixed
   for offer 02 by moving the toggle to the top right, beside the "Sound on"
   notice it belongs with: **overlap is now 0px² at both viewports**. A bottom
   offset could not work — the footer is ~134px at the CTA and ~400px with the
   form open. ⚠ Every live funnel still has the original collision.
2. **The thank-you page told her the wrong product.** She landed on V1's
   `/success`: *"Energy Clearing Ritual — your personalized clearing begins
   tonight"*. 02 now has its own page (`02-T1`) at
   `/tarot/twin-flame/success`.

## Superseded

The `01`–`24` shots were taken BEFORE both fixes above, so they still show the
volume button overlapping the decline row. They are kept as the evidence for it.

## Reproducing

Scripts used: `flow.mjs` (opening → taps → offer → tall image) and `flow2.mjs`
(offer → decline → downsell → exit), run against `npm run dev` on port 5000.
Both live in the session scratchpad; the whole run is ~10 minutes because the
typing delays are real time.
