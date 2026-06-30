# Luna emails — attribution & list wiring (for the dev)

The email side is done. Two app-side pieces make the funnel measurable + automatic.

## 1. UTM scheme (already baked into every email link → `theseerwithin.com/luna`)

| param | value | meaning |
|---|---|---|
| `utm_source` | `kit` | platform |
| `utm_medium` | `email` | channel |
| `utm_campaign` | `luna-daily` (broadcasts) · `luna-followup` (sequence) | program |
| `utm_content` | the **email identity** — the send **date** (`2026-06-20`) for dailies, `email_1..4` for the sequence | **which email** |
| `utm_term` | the **creative** — blurb id (`LV-13`) for dailies, a cta slug for the sequence | which CTA/variant |

So `utm_content` answers "which email drove this," `utm_term` answers "which creative."

## 2. Persist UTMs → activation → purchase (the actual ask)

Kit already gives per-broadcast **click** stats. What it can't see is what happens after the click on our site. To answer **"which email drives activations and purchases,"** persist the landing UTMs through the funnel:

1. **Capture** the `utm_*` query params when a visitor hits `/luna` (and `/chat/luna-voss`). Store on the session/cookie.
2. **Attach** them to the subscriber/user record on account creation, and to the **activation** event (first Luna chat / 3-free-minutes start).
3. **Carry** them onto the **Stripe purchase** event (minutes purchase) — stash in Stripe metadata and/or our `credit_transactions` row.

Then a row in `credit_transactions` / activation log can be traced back to `utm_content` (the exact email) and `utm_term` (the creative). We already fire FB Pixel/CAPI and run Stripe, so these are the same hook points.

## 3. List entry + sequence trigger (the Monday task)

- **Tag on signup:** add Luna subscribers to the Kit tag **`luna-subscriber`** (id `20513588`) by default. The funnel currently feeds AWeber — point new Luna signups at Kit and apply this tag (Kit V4: create/upsert subscriber, then tag).
- **Auto-trigger the follow-up:** in Kit → Automate, build the automation **Trigger: tag `luna-subscriber` added → Action: subscribe to sequence "Luna Voss — Follow-up" (id 2800896)**. Email 1 fires immediately, then 2–4 over the next days.
- **Dailies** are already targeted to `luna-subscriber` (broadcast `subscriber_filter`).

## Reference IDs
- Tag `luna-subscriber`: **20513588**
- Sequence "Luna Voss — Follow-up": **2800896** (emails: 9987296, 9987374, 9987375, 9987376)
- All draft/broadcast ids: `outbox/kit-drafts.json` · clickable index: `outbox/kit-drafts-index.md`
