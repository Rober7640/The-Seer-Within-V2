# /fb sales page test: plan

22 Nov 2026. This is a plan only; nothing is built yet. The copy is in `docs/fb-salespage-copy-draft-2026-11-22.md` and the mockup is described in `docs/fb-salespage-mockup/` (see the end of this file).

## The short version

Some new /fb visitors skip the lander and the chat. They land on a short sales page that picks up exactly where the ad ends:

1. **Her first name**, in the same box the ad's last frame shows ("Send me your first name.").
2. **Her words:** one sentence about what keeps happening.
3. **Her email:** "Where should I write back to you?"
4. **The offer:** the same letter the chat sells, at the same price ($35), with the same $12.77 second-letter bump. She pays on Stripe.
5. The same two upsells, and the same n8n letter by email.

The product, price, bump, upsells and letter are the same in both arms. Only the way in differs: a page instead of a chat. We compare **revenue per 1,000 visitors**.

## Why

- **The ads promise something specific at the click.** Every /fb story ad ends: "Messaging her is free. She asks your first name, and by morning there's a letter. Send your first name to Evelyn." The last frame is Evelyn's chat with an empty "Your first name" box. Today's /fb lander says "Something Is Holding You Back" and "a free reading", which no ad says.
- **The chat interviews her instead of reading to her.** Evelyn asks a median of 9 questions before the offer (details in `~/tsw-convo-flow/FINDINGS.md`; flow B of `v1_fb_chat_flow_2026` is testing a fix inside the chat).
- **A competitor sends ad traffic straight to a sales page** (Psychic Samira, read 21 Nov): no lander, no chat, a short form, then checkout.
- **So the test asks one question:** does a short page that continues the ad's last frame beat the chat?

## Today's numbers (live database, read-only, 18–21 Nov)

| /fb, all leads | |
|---|---|
| Leads (gave her email) | 466 |
| Buyers | 43 (9.2% of leads) |
| Main purchase | 40 × $35, 3 × $25 |
| Bump ($12.77) | 2 of 43 buyers |
| Upsell 1 + Upsell 2 | $628 + $658 |
| Total | $2,786.54 |
| **Per lead / per buyer** | **$5.98 / $64.80** |
| Chat starts, outside belief lanes (first day of the chat-flow test) | 97 |

These leads include belief-lane visitors, because the tag doesn't separate them. We don't record /fb page views in our database, so we can't yet say what a *visitor* is worth today. Step 0 below fixes that.

**What the sales page has to beat.** About 85% of women who start the chat give their email. So the chat earns roughly (share of visitors who start the chat) × 0.85 × $5.98 per visitor. If a page buyer is worth the same $64.80:

| Visitors who start the chat | Chat earns per visitor | Page needs this share of visitors to buy |
|---|---|---|
| 30% | $1.52 | 2.3% |
| 40% | $2.03 | 3.1% |
| 50% | $2.54 | 3.9% |

## The test

| | A: today | B: sales page |
|---|---|---|
| She lands on | /fb lander → chat | `/fb/reading`: name → her words → email → offer |
| She pays for | the letter (Energy Clearing), $35, or $25 downsell | the same letter, $35 |
| Bump | second letter, $12.77 | the same |
| Upsells | Protection Ritual, then bracelet | the same two, same prices |
| The letter | n8n, from her chat answers | the same n8n flow, from her name, her words and her topic |

- **Experiment key:** `v1_fb_entry_2026`, with variants `a` (chat) and `b` (page).
- **When she's assigned:** on /fb page load, by the visitor cookie (`ab_vid`), before the lander shows. Her arm stays the same on later visits. The exposure is logged at that moment with `{ funnel: 'v1-fb', utm_content }`, so both arms count the same kind of visitor.
- **Who's left out:**
  - belief lanes (`?lane=`)
  - non-English visitors (`?lang=`, ready for the FR and es-US launches)
  - resume and recovery links (`?resume=`)
  - previews (`?entry=page` shows the page without logging)
  - /fb-tarot, which isn't touched
- **Main measure:** revenue per 1,000 assigned visitors within 7 days. That's main + bump + upsell 1 + upsell 2, minus refunds.
- **Also tracked:**
  - the share of page visitors who give their name, their words, and their email (each step)
  - the share who buy
  - refunds and complaints about the letter
  - 30-day email sales per arm, read later (the emails are where repeat sales come from)
- **How it sits with the chat-flow test.** `v1_fb_chat_flow_2026` assigns later, at chat start, so it only ever runs inside arm A. Both tests stay valid; the chat test just gets fewer chats a day.
- **When to read it:**
  - **Early stop.** After 1,000 page visitors, stop if the page earns less than half of what the chat earns per 1,000 visitors.
  - **Final read** at about 2,500 visitors in the page arm. That's enough to see a gap of about half (for example 3% vs 4.5% of visitors buying).
  - **The limit.** A 20% gap would need about 14,000 visitors per arm, which /fb can't supply. A page and a chat are very different, so a big gap either way is the likely result.

## What she sees in B

All four steps are on one route, `/fb/reading`, with no page reload between them. The words are final in the copy draft; the look is in the mockup.

1. **First screen:** plum strip "Messaging Evelyn is free", Evelyn's photo tagged "Evelyn · Ireland", the headline "Send me your first name." / "Messaging me is free. By morning, there's a letter.", the name box, and **Send to Evelyn** ("Free · no card needed"). Three pink check lines under it.
2. **Her words:** "Thank you, {name}. Now tell me what keeps happening. One sentence is enough, in your own words." Three tap-to-start lines drop into the box and can be edited. Before launch, swap them for the three most common openings from real /fb chats.
3. **Her email:** "Thank you for telling me, {name}. Where should I write back to you?" This is where she becomes a lead (see the build table).
4. **The offer:** what the letter holds (what keeps happening, where it started, what Evelyn cleared overnight, her next 30 days), "$35 for your letter · one payment", the 30-day refund, "Your letter goes to {email}" with a Change link, the $12.77 second-letter tick box, and **Send me my letter · $35**. Then Stripe's own checkout.
5. **Below the fold:** how it works, "Why only your first name?", a facts strip (By morning · 5–7 pages · 1:1 · 30 days), a comparison table, the questions, and the name box again.

**Look:** cream page `#FCFBF4`, deep purple serif headings `#2D0458` (Fraunces), body text `#373737` (Archivo), plum `#5B146F` / `#59166C`, pink `#D1007B` for labels with white text and `#FB0797` for check marks, and a mint button `#63D39A` with dark text `#1F0340` (white on mint fails contrast).

**Not on the page:** struck-through prices, review counts, "last slots", countdown timers, testimonials, "free reading". The FTC's fake-review rule fines each violation, and every number on the page must be real.

## The letter she gets

- **The same n8n letter as the chat** (Energy Clearing flow, `UaLPiVVs7j5jzNyO`, reached through the Live Stripe Router). Nothing new to build if it reads well from page inputs.
- **The catch: it reads her chat answers.** The flow's "Prepare data" node pulls her answers from her `conversations` row. A page order has only her first name, her one sentence (the concern) and her topic (bucket). Two things to check before any traffic:
  - which fields the flow reads, and that the page writes her sentence into the one it uses for her concern;
  - that the letter still reads well from those inputs alone. Make 3–5 sample letters from page-style inputs and have the operator review them.
- **Known live bug, related:** "Prepare data" reads camelCase fields (`deeperResponse`, `emotionalResponse`, `blockSource`, `commitmentResponse`, `personName`), but the rows are snake_case. So only 2 of her 6 chat answers reach today's English letter. It was fixed in the FR and ES copies of the flow only; the English fix awaits the operator's OK.
- **"By morning" must be true.** The ads, the headline and the facts strip all promise it. The chat says "within 24 hours". Check how long the letter really takes from payment to inbox before launch.

## How it's built: reuse the chat's own checkout

Because the product is the same letter, the page reuses the chat's checkout path end to end. The backend-offer path in an earlier draft of this plan is no longer needed.

| Piece | Already there | New |
|---|---|---|
| Split | experiments `assign` + `logExposure` + the `ab_vid` cookie, the same as `GET /api/fb/chat-flow` | `GET /api/fb/entry`, and the redirect in `client/src/pages/LandingPage.tsx` |
| The page | none | `/fb/reading`, mobile first, four steps on one route |
| Lead, at the email step | `POST /api/lead`: saves the `conversations` row, the /fb AWeber list, Meta Lead | call it with `funnel: 'v1-fb'`, her name, her topic, and her sentence saved where the letter flow reads her concern; mark page leads (for example `entry: 'page'`) so stats can split them |
| Her topic (bucket) | the four chat buckets (love, money, purpose, someone) | work it out from her words: the tap-to-start lines map directly; free text needs a small classifier or keyword rule, defaulting to love |
| Checkout | `POST /api/checkout`, the bump metadata, the price variants | send `entry: 'page'` in Stripe metadata; the cancel URL must return to `/fb/reading`, not `/fb/chat` |
| Purchase events, upsells, letter | unchanged: the `energy_clearing_ritual` Purchase gate (Meta, Google, PostHog), `/welcome1` and `/welcome2`, the n8n router | none. ⛔ `product` stays `energy_clearing_ritual`: Mike's n8n flow exact-matches it, and renaming it means no letter. Check the upsell opening lines don't refer to "our chat" |
| Meta PageView | the FB PageView route list in `client/src/App.tsx` | add `/fb/reading` |
| Stats | `~/tsw-convo-flow/scripts/fb-flow-stats.mjs` | revenue per 1,000 assigned visitors per arm, plus each page step's completion |

The redirect has to happen before the lander paints, so she never sees /fb flash and disappear. If the assignment call fails, she gets the chat.

## Build order

| # | Step | Who | Done when |
|---|---|---|---|
| 0 | /fb landing-page views per day, from Meta or PostHog | operator | we know what a visitor is worth today, and the timing below is firm |
| 1 | Check the letter flow's inputs; make 3–5 sample letters from page-style inputs; check the real delivery time | dev, then operator | the operator has approved the samples and "by morning" is true (or the copy is changed) |
| 2 | The page, the lead at the email step, the bucket, and checkout wiring, as a preview on the dev server | dev | the operator has reviewed it on a phone |
| 3 | The split: experiment key, `/api/fb/entry`, redirect, exclusions, `?entry=page` preview | dev | tests pass, and the preview is never logged |
| 4 | Stats | dev | it reads both arms from a test run |
| 5 | PR → merge → Railway deploys (~2 min) → draft experiment row → start | dev, operator | it's running |
| 6 | Walk it live: the first 20 visitors split and log correctly; the first page order reaches n8n and the letter arrives | dev | confirmed |

## Timing alongside the chat-flow test

The chat-flow test needs about 1,900 chats per arm (confirmed on day 3, around 24 Nov). At 80–100 chats a day, it ends around the turn of the year.

These numbers assume /fb gets about 250 visitors a day; step 0 gives the real figure.

| Option | Page test result | Chat-flow test ends |
|---|---|---|
| **25% of visitors to the page from ~1 Dec (recommended)** | ~10 Jan | about 9 days later than planned |
| 50/50 from ~1 Dec | ~21 Dec | late Jan or later |
| Wait for the chat test to end, then run 50/50 | ~17 Jan | as planned |

25% gets the page answer soonest without stalling the chat test. If the page is badly losing, the early stop catches it after about 16 days. When the chat test ends, raise the page arm to 50%; the framework allows a weight change while keeping visitors in the arm they already had.

## Decisions

Decided (22 Nov):

- **Product and price:** the same letter as the chat, $35, so the test is page vs chat and not product vs product.
- **Bump:** the same second letter, $12.77.
- **Headline:** "Send me your first name." / "Messaging me is free. By morning, there's a letter."
- **Order:** name → her words → email → offer.
- **No date of birth, no "one question answered" box.**

Still open:

1. **Traffic share.** Recommended: 25% from when it's ready.
2. **"By morning".** Confirm the real delivery time, or change the words.
3. **Downsell.** The chat offers $25 when she hesitates; the page has no downsell. Leave it out for the first run, or show $25 when she comes back from a cancelled checkout.
4. **An overnight email for women who don't buy.** The ads promise a letter by morning without a price. The first list email should arrive overnight and read like a note from Evelyn.
5. **The comparison table** ("Evelyn's letter vs a quick reading") is the boldest piece borrowed from the competitor. Keep it or drop it.

## Risks

- **Drop-off at her words.** Anyone who quits at step 2 leaves no email. That's why the step is kept light (tap-to-start lines, one sentence). A later test: email before vs after her words.
- **The letter from fewer inputs.** A page order gives the letter less to work from than a chat. That's why sample letters come first.
- **Small traffic.** Only a big gap will show; a 10–20% difference won't.
- **Meta learning.** Both arms fire Purchase on the same pixel, so Meta keeps learning from both. Watch cost per purchase for a week after the start.

## The mockup

- **Live canvas (private until the operator shares it):** https://claude.ai/artifact/Kqff47fe9zWevAoJETW2Sm. Six phone screens: the ad's last frame, then the page's four steps, then below the fold.
- **Source:** `docs/fb-salespage-mockup/`. These are the canvas's own files, kept for exact copy, colours and spacing. They don't run on their own (images point at the canvas's storage); use them as a spec, not as code.
