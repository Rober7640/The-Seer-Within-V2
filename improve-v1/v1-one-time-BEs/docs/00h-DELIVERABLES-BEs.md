# 00h — DELIVERABLES: the booking step

What is **built and locked**, versus what is still a decision. Everything upstream
of this (the letter) and downstream of it (`/welcome1`, `/welcome2`, the thank-you
page, the product) is unchanged and covered elsewhere.

| | |
|---|---|
| **Scope** | what the email sales letter's CTA lands on, for offer 02 |
| **Status** | **BOTH TREATMENTS LOCKED** *(operator, 2026-08-06)* — chat and page |
| **Copy spec** | [`copy/02/02-C1-booking-page.md`](../copy/02/02-C1-booking-page.md) — page above the divider, chat (`02-C1b`) below |
| **Flow diagrams** | [`00-FLOW-BEs.md`](./00-FLOW-BEs.md) Diagram J |
| **Committed** | `7d5c751`, then merged `origin/development` |

---

## ⛔ LOCKED — the chat conversation flow

```
  TURN 1   Evelyn, 2 lines
           "You came."
           "Then let me take this down properly, dear. Three things to
            agree to, and I start tonight."
                            │
                            ▼
  TURN 2   THE GATE — one inline card
           ✦  Before I lay your twelve
              By booking this reading you agree to the following:

              ☐ Yes — you were right, Evelyn. I want to see the rest of
                what you saw.
              ☐ Yes — I give you permission to draw my destiny. The full
                twelve, one to each house.
              ☐ Yes — I agree to pay a modest one-time sum of $35.00.
                Twelve trumps, and a whole night of your work.

              Total today                              $35.00
              ── button does not exist until 3/3 ──
              "Check all three to continue"
                            │
                       she taps it
                            ▼
  TURN 3   Evelyn, 2 lines
           "Good. Your twelve are booked and I'll lay them tonight."
           "One thing before I start, dear."
                            │
                            ▼
  TURN 4   THE BUMP — its own card, after she has committed
           ✦
           "Before I lay your twelve… there is old karma sitting over
            your luck, and it will dull whatever they show you. Want the
            working that lifts it? Just $12.77, and you can start tonight."

              + $12.77  ·  $47.77 total
              [ Yes, clear it first ]      ← amber→orange, full width
              [ No, just my reading ]      ← white, full width, equally legible
                            │
                    either one → Stripe
```

### The nine rules this shape encodes

Each one was decided against a live alternative. Breaking any of them is a
change of design, not a tidy-up.

1. **The letter sells. The chat closes.** Nothing here re-argues the offer — a
   sold buyer who is sold to again can talk herself back out of it.
2. **Ask nothing before the money. Ask everything after it.** No warm-up
   question, no card-preference tap. A question at the close reads as doubt that
   she is ready.
3. **The gate is ONE inline card.** Not per-statement taps, not a checklist on a
   page, not tick marks on her messages. Modelled on `CommitmentGateCard.tsx`
   (`35_palm_gate`).
4. **The button does not exist until 3/3** — absent from the DOM, replaced by
   the locked hint. Not disabled-and-visible. The seed comment for the live gate
   says the absence *is* the point.
5. **Three statements, and the third is the price.** ⚠ A recorded deviation from
   `00e` §3 rule 2, which requires five agreements before money.
6. **The bump is its own turn, after the button** — never a tick inside the
   gate. She has committed before she is asked.
7. **The decline is full-width and equally legible.** Burying it makes this a
   dark pattern, and the arm would "win" on a charge she did not intend.
8. **One live purchase action on screen, ever.** Never the gate button and the
   bump card at once.
9. **No text input anywhere in this flow.** She never types. A visible field
   invites typing that goes nowhere and makes it read as support chat.

### Resume behaviour — also locked

```
  refresh              → open AT THE GATE, boxes empty, 2 welcome-back lines
  back/cancel (Stripe) → open AT THE GATE, warmer copy, bump NOT restored
  tap the button       → the bump turn replays from the top
  already purchased    → must never reach this screen (server-side, NOT BUILT)
```

⚠ **Position is restored, consent is not.** The checkboxes always come back
empty. Re-ticking costs seconds; restoring an agreement she did not re-give
hollows out the device and is the wrong side of a chargeback.

`sessionStorage`, not `localStorage` — it must not outlive the tab. A week-old
*"you came back"* to someone who has since bought is worse than a clean greeting.

### Aesthetic — also locked

The **chat** wears `ChatPage.tsx`'s shell exactly: `CosmicBackground`, a frosted
`max-w-lg` panel, and the `bg-bg-mid` header with Evelyn's avatar in the gold
`border-secondary` ring. The buyer met Evelyn on that screen and returns to it at
`/welcome1`; the booking step sits between them without a seam.

⚠ The **page does NOT** *(operator, 2026-08-06)*. An earlier build put the page
copy inside that same chat shell, which was incoherent — it looked like a
conversation and wasn't one. The page keeps Evelyn's world (starfield, purple,
gold, serif) but is built as a page: **no panel, no avatar, no presence
indicator, no Exit**; it scrolls like a document, uses a wider `max-w-2xl`
measure, and sets the copy on a light sheet, because a 700-word commitment
statement cannot be read off a dark ground. Her stationery, not her chat window.

⚠ Both supersede **`00b` §3's Treatment B** (white / `#B3261E` / `#16A34A` /
Arial), which is dead for this step.

The bump card is **class-for-class with `BumpOfferCard.tsx`**, the shipped V1
bump, with exactly one deviation: the offer line is roman, not italic. Do not
re-scale its type — an earlier pass set the body to 19px by eye off a screenshot
and it was unreadable in a `max-w-lg` panel. The real card is `text-base`.

---

## ⛔ LOCKED — the page treatment

The A/B challenger, and **deliberately not a shortened chat on a page**. It ships
in its own best form: long, page-shaped, source-faithful.

```
   MASTHEAD          on the starfield — the only part that is
     EVELYN CROSS    gold, letterspaced caps
     The Twin Flame Tarot Reading — your booking      white serif
     By booking this reading you agree to the following:
                            │
   ┌────────── the sheet, max-w-2xl, light ──────────┐
   │  ☐ ① you were right                             │
   │  ☐ ② permission to draw my destiny              │
   │  ☐ ③ done by a professional                     │
   │  ☐ ④ she does not lay a twelve on request       │
   │  ☐ ⑤ the heaviest reading she does · 24h        │
   │  ☐ ⑥ a modest one-time sum of $35.00            │
   │  ──────────────────────────────────────────     │
   │  ⑦ the request — all three withholds by name    │
   │  ⑧ the gift, thanked for before it arrives      │
   │  ┌ ─ bump, INLINE, beside the total  +$12.77 ┐  │
   │  Total today                          $35.00    │
   │  ── button absent until 6/6 ──                  │
   └─────────────────────────────────────────────────┘
```

### The five rules

1. **It is a page, not a chat.** No panel, no avatar, no presence indicator, no
   Exit. It scrolls like a document because it is one.
2. **A light sheet at `max-w-2xl`.** A 700-word commitment statement cannot be
   read off a dark ground, and it needs a real measure. This is exactly what a
   chat bubble cannot do, which is the point of having this arm at all.
3. **Six statements, not three.** ⚠ It keeps the request and the gift too. This
   arm is the source-faithful one; shortening it to match the chat would leave no
   long-form treatment in the test.
4. **The bump stays INLINE, beside the total** — the placement that makes a bump
   a bump. In the chat it is a separate turn. That difference is deliberate.
5. **The button does not exist until 6/6.** Same rule as the gate.

⚠ **The two arms therefore differ on format, length AND bump placement.** That is
a product comparison, not a single-variable test — recorded so nobody reads the
result as "chat beats page" when three things moved.

---

## Built

| Path | What |
|---|---|
| `client/src/lib/twinFlameBooking.ts` | all copy for both treatments, one source of truth |
| `client/src/pages/TwinFlameBookingChat.tsx` | the locked chat flow |
| `client/src/pages/TwinFlameBookingPage.tsx` | the page treatment |
| `client/src/App.tsx` | two lazy routes |

```
  /tarot/twin-flame/preview-chat              the locked flow
  /tarot/twin-flame/preview-chat?cancelled=1  the Stripe-return path
  /tarot/twin-flame/preview-page              the page treatment
```

⛔ **Neither charges.** Both buttons log to console and stop. The routes are
deliberately absent from `App.tsx`'s FB PageView list so previews cannot pollute
pixel data, and nothing links to them.

---

## NOT built

**Stripe.** `POST /api/be/checkout`, the session with the bump as line item 2,
`success_url → /tarot/twin-flame/welcome1?session_id={CHECKOUT_SESSION_ID}`,
`cancel_url → …/preview-chat?cancelled=1`.

**The already-purchased redirect.** A buyer who refreshes must land on her
thank-you page, not a fresh booking chat. Server-side; there is no server in the
preview.

**02's own bump identifiers.** ⛔ The karma bump must NOT inherit the shipped
double-reading ones — `metadata.bumpProduct` is exact-matched by Mike's n8n
filter, so a karma buyer would be sent a second tarot reading, and her receipt
would read *"+ Double Your Reading Add-On"*.

| Shipped constant | Value | 02 needs its own |
|---|---|---|
| `V1_BUMP_PRODUCT_KEY` | `double_reading` | yes |
| `V1_BUMP_PRODUCT_NAME` | `+ Double Your Reading Add-On` | yes |
| `V1_BUMP_DESCRIPTION_MARKER` | ` + Double Reading` | yes |
| `V1_BUMP_CENTS` | `1277` | **no — same $12.77, reuse it** |

**Drop-off instrumentation.** Per-turn, from the first send. Three places to lose
her where a page had one, and it cannot be reconstructed later.

**The doc pass for the free gift.** Both builds promise the first house sent
tonight; these still say the 28-night ledger: `02-C1` statement 8, `02-C1b`'s
gift beat, `02-E6`'s +24h nudge, `02-P3`'s header, `02-T1`, `copy/02/README.md`,
`00-FLOW-BEs.md:77`, and the `backend-esl-deck` memory.

---

## Still open

- **Which arm ships.** Both are locked and built; which one the letter's CTA
  points at is undecided, and needs the completion-rate read.
- **Checkbox enforcement on the page** (`00-FLOW` open decision #5). Built as
  required; the source's wireframe shows them pre-checked.
- **03 and 05's intake.** They cannot be fulfilled without the target's name.
  Whether the chat takes it or the email reply does is a real trade — `01`'s
  Lesson 1 makes the reply the mechanism. ⚠ Do not settle it on 02's behalf.
