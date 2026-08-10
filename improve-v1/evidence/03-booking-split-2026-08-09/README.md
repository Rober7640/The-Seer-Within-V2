# 03 booking — the page, split in two (2026-08-09)

The booking page for **Judgement Day** is now two screens. Same copy, same
order, nothing added — except that the reply-by-email block is gone, because
the Entry becomes its own screen after the money.

⛔ Preview only. Nothing charges. The button logs `[preview] would checkout`.

```
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking.mjs improve-v1/evidence/03-booking-split-2026-08-09
```

**50 assertions, all passing** (it was 21 on the single page). The chat's walk
is now **39**, up from 26 — it had the same floor-timing bug and took the same
fix, then gained the thread title, the tense rule, the cancelled-checkout door
and a 320px layout guard.

Both screens now say **Judgement Day — confirm your booking**. ⛔ The tense is
asserted in both directions: *confirm* (a job she is here to do) yes, *confirmed
/ confirmation / receipt* (a state) never — nothing is confirmed until she pays.

## What it measured

| | Before | After |
|---|---|---|
| the page on a phone | 3,450px · 4.1 screens | — |
| step 1 · Agree | — | **1,173px · 1.4 screens** |
| step 2 · Give | — | **2,377px · 2.8 screens** |

Step 1 asks for four taps and nothing else — no keyboard, no price, no bump.

## Screenshots

| File | What |
|---|---|
| `01-step1-top-phone.png` | how she arrives |
| `02-step1-full-phone.png` | the whole of step 1 on a phone |
| `03-floor-refused-phone.png` | $9 typed — the floor speaks for the first time, and the button stays absent |
| `04-step2-full-phone.png` | the whole of step 2, bump taken, $59.77 |
| `05-step2-ready-phone.png` | the close |
| `06-back-to-step1-phone.png` | after browser Back — all four ticks still there |
| `07-step1-desktop.png` | step 1 fits one desktop screen with room to spare |
| `08-step2-desktop.png` | step 2 on desktop |
| `chat/` | the chat treatment's own walk — **47 assertions**, all passing. `C0-typing.png` is the chat opening on Evelyn already writing; `C0b` is her second sentence coming; `C8b-cancelled.png` is the back-from-Stripe door |

## What the walk proves

**Step 1 — Agree**

- announces itself: *Step one of two · Agree*
- four statements, not five: the capacity rung is still cut (D3)
- no amount box, no total, no bump, and **no price named anywhere**
- the button does not exist until all four are ticked; before that the hint
  reads *Agree to all four above to continue*
- `GO ON, EVELYN` carries her on, and the step goes into the URL

**Step 2 — Give**

- announces itself: *Step two of two · Give*; the four agreements are behind her
- her request opens the screen, above the price rung
- the amount box ships empty, the total starts at $0.00
- ⛔ **no minimum is printed.** A stated floor reads as the price — put $17 under
  an empty box and the box fills with $17. It speaks only once she is under it
  (*"$17 is the smallest amount that will go through."*) and goes quiet again
  the moment she is over it
- ⛔ **and never while she is typing.** She types the `1` of `17` and hears
  nothing; finishing the number is never corrected at all. It waits for the
  field to be still, or for her to leave it — then speaks at once — and goes
  quiet again on the next keystroke even while she is still under the floor
- locks on the price rung first, then on the amount
- $9 is refused, $17 unlocks, the bump adds $12.77, $47 + bump = $59.77
- the reply-by-email block is gone, and the reassurance no longer promises it
- the button logs instead of charging, carries `Sarah O'Brien` from `?fn=`
  across the step change, and carries the bump's own key `unburdening`

**Between the two**

- browser Back lands on step 1, inside the funnel, with all four ticks intact
- going forward again keeps her amount and her bump
- ⛔ a **cold** `?step=give` — refresh, deep link, a shared URL — bounces to
  step 1 with the boxes clear. Consent not given in this page's lifetime is
  never assumed

**And around it**

- no sideways scroll on phone or desktop
- the V1 lander still serves

## Still owed

Until the Entry screen is built, **nothing on this page tells her about the part
only she can do.** That is the deliberate cost of retiring the reply-by-email
block, and it closes with the thank-you rewrite — not later.
