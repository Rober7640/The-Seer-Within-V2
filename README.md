# Branch `04-tea-reading` — backend offer 04 "The Turn" (tea reading)

> ⚠ **Branch-only file.** This README exists so the handover is the first thing you see on this
> branch. **Delete it before merging** into `development`.

## 👉 Start here: [the handover to dev](improve-v1/v1-one-time-BEs/docs/04/HANDOVER.md)

`improve-v1/v1-one-time-BEs/docs/04/HANDOVER.md` — what's built, what Joel has already decided,
the go-live steps in order, and what isn't proven yet.

## Status (2026-10-12)

- **Built and tested in preview. Dark:** `readyForMoney: false`, so nothing can charge.
  Nothing is deployed, uploaded or sent.
- **All product decisions are made.** Joel's only open item: which AWeber lists the sales emails go to.
- **What's left is switching it on:** upload the PDFs and the email photo, build the emails in
  AWeber, one real test purchase, flip `readyForMoney`, then send. Steps D1–D9 in the handover.

## In one screen

| Part | What |
|---|---|
| Booking page | `/offers/wiccan/tea-reading` (+ `/chat`), one tick, fixed price |
| Price | Split test **$35 vs $45** (`be_04_price_2026`), a draft until started in `/admin/experiments` — everyone pays $35 until then |
| Order bump | **The Double Turning**, $12.77, intangible — nothing to deliver |
| Upsells | Shared `/offers/upsell/welcome1` → `welcome2` |
| Product | Three PDF readings of one real cup; each buyer gets one, drawn at random; delivered by email within 24 hours |
| Emails | Confirmation + delivery (AWeber Campaigns), and three approved sales emails (email 1 → RE: → email 2) |

## Other docs

| Doc | Path |
|---|---|
| Full record of every decision and departure | `improve-v1/v1-one-time-BEs/docs/04/04-DELIVERABLES.md` |
| Sales emails: AWeber handoff | `improve-v1/v1-one-time-BEs/copy/04/sales/AWeber-handoff.md` |
| Tick sheet | `improve-v1/v1-one-time-BEs/docs/04/0-WORKFLOW-04.md` |

Click through the whole journey locally (fake server, nothing charges):
`npx tsx improve-v1/v1-one-time-BEs/scripts/preview-04-journey.ts` → `http://localhost:5096/offers/wiccan/tea-reading?fn=Sarah`
