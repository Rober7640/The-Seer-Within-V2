# Soulmate Initials Reading — PDF engine

Turns one paid order into the finished reading PDF the buyer receives. The
operator owns the plumbing (Stripe webhook → n8n → AWeber email); this module is
the product that plumbing delivers.

## Use it

```ts
import { generateReadingPdf } from './server/lib/soulmateReading';

const { pdf, html, meta } = await generateReadingPdf({
  sessionId: 'cs_live_…',      // Stripe checkout session id — the reproducibility seed
  firstName: 'Priya',
  dateOfBirth: '1990-04-12',   // YYYY-MM-DD
  stone: 'Rose Quartz',        // display label
  bump: true,                  // bought the "charge my stone" add-on
});
// pdf  : Buffer  → upload to storage, email the link
// html : string  → the exact document (feed your own PDFShift if you prefer)
// meta : { numbers, initials, draw, prose }  → store/inspect the facts
```

Needs `ANTHROPIC_API_KEY` in the environment (the reading is written by Claude).
PDF rendering uses the Playwright Chromium already in this repo — no external PDF
service required. If you render on the n8n side with PDFShift, pass it `html`
instead and skip the Playwright step (`buildReading()` returns `html` without
rendering).

## What's inside the PDF
Cover (name + stone) → the 7-card Soulmate Initials reading with the real RWS
spread → the 1,000+ word Soulmate Portrait → Heart Block bonus → Past Love bonus
→ a "your {stone} has been charged" page when `bump` is true.

## Guarantees
- **Deterministic:** the same `sessionId` always produces the same initials and
  the same 7 cards. A Stripe retry or a re-run never changes what she was told.
- **Initials are facts, not model output:** derived from her Life Path + first-name
  number via the Pythagorean groups, seeded + frequency-weighted, with sub-1%
  starting letters (Q/U/X/Y/Z) excluded. The model is told the initials; it never
  invents them.
- **Card art by slug, never model text:** images come from the draw record
  (`…/evelyn/tarot-rws/<slug>.jpg`), base64-embedded at render so a missing image
  degrades to a styled placeholder, never a silent hole.

## Generate samples
```bash
npx tsx server/scripts/soulmate-reading-sample.ts            # all 3 fixtures
npx tsx server/scripts/soulmate-reading-sample.ts jade       # one
```
Writes `samples/soulmate-<name>.pdf` (+ `.html`).

## Recommended before go-live (operator)
- **A grading/QA pass** on the generated prose — one model slip was seen in a
  sample ("Four of Pentagons" for "Pentacles"). The spec's grading node (word
  count, initials stated exactly, all 7 positions answered, both bonuses present,
  no guarantees/advice, card names faithful) belongs in your n8n flow; regenerate
  once on fail, then send + log. This engine does not grade.
- The `stone` label is passed through verbatim — send `"Rose Quartz" | "Jade" |
  "Garnet"`, matching the funnel's stone keys.
- Tune `nameFrequency.ts` weights if you want a different initial distribution;
  they are approximate US-name shares, not law.

## Files
`numbers.ts` (numerology) · `initials.ts` + `nameFrequency.ts` · `draw.ts`
(7-card draw) · `content.ts` (Claude prose) · `html.ts` (document) · `pdf.ts`
(render) · `index.ts` (entry point) · `seededRandom.ts` (shared RNG).
