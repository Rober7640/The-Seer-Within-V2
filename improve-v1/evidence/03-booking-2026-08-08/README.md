# Offer 03 — booking page + order bump (2026-08-08)

Playwright walked `/wiccan/judgement-day` and asserted the gate. Phone shots are
iPhone 13 at 2× DPI; desktop is 1280×900 at 2×.

Build under test: `client/src/pages/JudgementBookingPage.tsx` +
`client/src/lib/judgementBooking.ts`.
Re-run it with:

```
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking.mjs improve-v1/evidence/03-booking-<date>
```

(needs `npm run dev` on port 5000.)

| File | What it shows |
|---|---|
| `01-top-phone.png` | the masthead and the first agreements, nothing ticked |
| `02-full-phone.png` | the whole page, locked |
| `03-floor-refused-phone.png` | $9 typed — under the floor, button still absent |
| `04-ready-phone.png` · `05-full-ready-phone.png` | ticked, $47 + the bump, button live |
| `06-top-desktop.png` · `07-full-desktop.png` | the same on desktop |

## The CHAT treatment — `C1`–`C9`

The second candidate, at `/wiccan/judgement-day/chat`. Re-run with:

```
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking-chat.mjs improve-v1/evidence/03-booking-<date>
```

| File | What it shows |
|---|---|
| `C1-greeting.png` | Evelyn's two opening lines |
| `C2-gate.png` | the gate card — four statements, no minimum printed |
| `C3-ticked.png` | all four ticked, still locked on the amount |
| `C4-floor-spoken.png` | $9 typed — the floor speaks only now |
| `C5-ready.png` | $47, button live, total is her figure |
| `C6-bump.png` · `C7-full.png` | the bump as its own turn, $59.77 total |
| `C8-resumed.png` | after a refresh — back at the gate, boxes clear, field empty |
| `C9-desktop.png` | the same on desktop |

26 assertions, all passing. Beyond the page's list it proves: the gate arrives
unprompted, the fourth statement is the Entry agreement, the floor stays silent
until broken and goes quiet again, the gate stays on screen as her record after
she confirms, both bump actions log the right total, and a resumed session
restores her position but **not** her consent or her amount.

## What the page walk asserts — 21 checks, all passing

- **The gate.** No button until all five statements are ticked *and* an amount is
  entered. The hint says "all five", then "enter what you will give".
- **Five statements, not six.** The cut capacity line (*"one account at a time"*,
  *"the week is spoken for"*) appears nowhere in the DOM — decision D3.
- **The amount box ships empty** and the total starts at $0.00 — decision D4.
- **The floor holds.** $9 stays locked; $17 unlocks; the totals recompute.
- **The bump is never pre-checked**, adds $12.77, and carries its own product
  key `unburdening` — not V1's `double_reading`.
- **P1 placement.** The intake agreement is measured to sit *above* the button.
- **Nothing charges.** The click logs `[preview] would checkout {…}` and the URL
  never changes.
- **The `?fn=` chain.** `?fn=Sarah%20O%27Brien` survives decoding and reaches the
  checkout payload — apostrophe intact.
- No sideways scroll on either viewport; V1's lander still serves.
