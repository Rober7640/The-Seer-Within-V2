# 06-T4 — Delivery email *("he's shipped")*

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — OBJECT, not a reading |
| **Sends** | once the order actually ships — not at purchase. That's C1, already sent |
| **Carries** | tracking info — a placeholder slot, no PDF, no reading |
| **Register** | Evelyn confirming it's moving, and a short reminder for the moment it lands |

⚠ **This is a structurally different email from every other T4 in this deck, not a reskin of
one.** 02/03/04 hand over a finished document — the PDF *is* the product, and the email exists to
point at it without paraphrasing it. 06 has no document. What's shipping is the object itself, so
this email's only job is confirming that and reminding the buyer, briefly, what to do when it lands.

⚠ **It does not re-run the letter.** They already read the full mythology — the court, the sealing,
the anatomy, Bixie, the capsule. Restating any of that here would read as padding a shipping
notice. The ritual gets one short paragraph, not a second telling.

---

**Subject:** %FIRSTNAME% — Bixie's on his way to you

**Preheader:** He shipped. Here's what to do when he lands.

---

Dear %FIRSTNAME%,

He's shipped, dear.

**Track him here → [Track your order]({{AWEBER_TRACKING_URL}})**

When he arrives, here's what to do.

Left wrist, dear — never the right. The left is the hand that receives, the one nearer your
heart.

Write your one sentence on the paper inside — not "more money," the actual thing that got away.
Then seal it into the capsule, same as he is.

You'll find a few blank papers in the box. The capsule only needs one.

I'll be glad to know he's found his way to your wrist.

— Evelyn

---

## Build notes

- **No re-sell, no CTA.** The tracking link is the one link in this email, and it's functional,
  not sales — the same rule 02-T4 sets for its reading link. No next-offer teaser, no upsell
  mention. That belongs in a separate send, after they've had the object in hand for a while, not
  here.
- **`{{AWEBER_TRACKING_URL}}` is a placeholder, not real AWeber syntax** — swapped from AWeber's
  custom-field picker when the Campaign is built, same convention as `{{AWEBER_ENTRY_URL}}` in
  `03-T3-confirmation-email.md`. No invented tracking number, no invented carrier. Confirm it
  resolves on a seed test before this goes live, same as every other `{{AWEBER_…}}` slot in the
  deck.
- **No delivery date stated.** The shipping-wait SLA (7 business days processing, 1–2 weeks
  delivery) already lives on the booking page — restating an estimate here, after the fact, risks
  reading as a second promise if the real date lands differently. This email confirms movement,
  not a day.
- **The ritual line is short on purpose.** Left wrist / never right, one sentence, seal it — the
  three facts they actually need the moment the box is open. Everything else from Beat 6 and 8 of
  the sales letter (the stone, the mantra, why the wrist matters, Rosalind, the honest limit) stays
  in the letter. Repeating it here would be the padding this email is built not to have.
- **"You'll find a few blank papers in the box"** reflects the real packaging spec (D7-equiv,
  `docs/06/0-WORKFLOW-06.md`) — 4–5 blank inserts ship in the box and the buyer picks one, not a
  personalized single insert. Stated as a small practical fact, not explained further; they don't
  need the reasoning, just to not be surprised there's more than one paper.
- **Sign-off is new, not reused.** Avoids "I'm on your side in this, dear," which
  `0-WORKFLOW-06.md`'s Third round note already flags as a corpus collision with 02's ratified
  letters elsewhere in this offer.
- **No price, no offer number, no $ anywhere.** This is a delivery notice; money was settled at
  the booking page.
- Passes `copy-check.cjs` clean.
