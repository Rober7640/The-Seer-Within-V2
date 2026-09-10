# 08 Marcus — daily reading funnel


> **Latest confirmed decisions:** standard delivery within 24 hours; +$12.77 bump within 12 hours, both measured from confirmed main payment. Audio shares that order deadline. Use Replicate Chatterbox with the Marcus voice Joel will supply. Create a NEW Marcus n8n workflow; existing workflows must remain untouched. See the delivery policy and Chatterbox setup in the n8n folder. These decisions supersede older open-timing/provider notes below.

AWeber daily email → booking page with bump and payment → bridge page → audio Upsell 1 → thank-you. Supabase stores the reading/order context; the main n8n flow fulfills written and audio purchases.

**Start with [HANDOVER.md](HANDOVER.md), then use [FUNNEL-BUILD-CHECKLIST.md](FUNNEL-BUILD-CHECKLIST.md) as the detailed tracker.** Local test scaffolding exists. Real payments, durable provider integration, completed report/audio generation and production n8n activation are not finished.

| Folder | Main documents / work |
|---|---|
| [daily-email](daily-email/SHAPE.md) | SHAPE, spread/question libraries, STATE, Markdown letters, rendered HTML and editorial reviews |
| [booking-page](booking-page/SCOPE.md) | Booking scope and [HTML mockup](booking-page/mockup.html) |
| [bridge-page](bridge-page/SCOPE.md) | Short post-purchase confirmation and transition into Upsell 1 |
| [paid-reading](paid-reading/SCOPE.md) | What the $35 written report contains and how personalization works |
| [upsell-1-audio](upsell-1-audio/README.md) | Audio product, writing shape, briefs and draft comparison |
| [thank-you](thank-you/SCOPE.md) | Receipt, access and delivery-state requirements |
| [n8n](n8n/README.md) | Main fulfillment plan and [audio branch](n8n/AUDIO-BRANCH.md) |
| [data](data/CONTRACT.md) | Shared edition, per-buyer draw and order contracts |
| [local-testing](local-testing/AUDIT.md) | Environment audit; executable harness remains [outside docs](../../local/08-marcus/README.md) |
| [reference](reference/) | Shared card-meaning source material; retained here because other offers reference it |
| [archive](archive/marcus-voice-profile.md) | Retired voice profile, retained for historical reference only |

## Current decisions

- $35 written PDF reading; optional $12.77 upgrade from 24-hour to 12-hour delivery, selected on the booking page.
- Face-up cards fixed per email edition; paid positions drawn independently per buyer and saved once.
- Each edition supplies its own theme and ordered free/paid positions; report stages derive their shape from that record rather than assuming six cards.
- A separate name-derived personal card guides the interpretation.
- Audio uses the approved written report and chains off the main n8n workflow. Late purchases resume at the audio branch.
- Written delivery does not wait for audio. Tests remain local first.

## Open decisions

PDF attachment versus restricted-link delivery; supplied Marcus voice file and final audio price; name-method edge cases and failed-QA policy. The new inactive workflow has been created in the configured n8n instance. See the [main n8n plan](n8n/MAIN-FLOW.md) for what each decision affects.

## Historical cleanup

`00-ASTRA-BRIEF.md` was obsolete and has been deleted at Joel’s request. It commissioned the retired voice profile. The current daily craft authority is [daily-email/SHAPE.md](daily-email/SHAPE.md), not that earlier experiment. The previous root README’s claims that no letters had been written were also obsolete and are replaced by this index.
