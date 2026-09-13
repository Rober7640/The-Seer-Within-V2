# 08 Marcus — build and test record

Last updated: 2026-09-11

This folder contains the current design, copy, local application, and n8n work for the Marcus daily-reading funnel. The manual n8n Stage 1 can produce a complete, numerology-anchored PDF from test inputs. The local application can simulate the customer journey and preserve the order, draw, deadline, and PDF fixture. The production handoff between those pieces is not connected yet.

For the current completion ledger, use [FUNNEL-STATUS-AUDIT.md](FUNNEL-STATUS-AUDIT.md). For the full project history, read [HANDOVER.md](HANDOVER.md). [FUNNEL-BUILD-CHECKLIST.md](FUNNEL-BUILD-CHECKLIST.md) preserves the original implementation tracker.

## Agreed funnel

**AWeber daily email → booking page with payment and optional speed bump → bridge page → audio Upsell 1 → thank-you page**

After confirmed payment, the fulfillment system generates the written reading in the background. The audio offer cannot cancel or delay the written order.

| Product | Price | Delivery promise |
| --- | ---: | --- |
| Personalized written PDF | $35.00 | Within 24 elapsed hours of confirmed payment |
| Speed bump on booking page | +$12.77 | Changes the written deadline to within 12 elapsed hours |
| Audio narration upsell | Price pending | Uses the written order's 24-hour or 12-hour deadline |

Each daily edition fixes the question, spread, theme, face-up cards, and hidden position labels. Each paid order draws its hidden cards once and saves them for all retries. Numerology is calculated from the customer's full birth name and date of birth. Life Path is the main visible recognition anchor; Expression and Personality guide the private synthesis; the Expression-derived tarot card is a secondary lens.

## What has been built

| Area | Built now | Current boundary |
| --- | --- | --- |
| Daily email | Reusable [writing shape](daily-email/SHAPE.md), [spread library](daily-email/SPREADS.md), [question library](daily-email/QUESTIONS.md), edition [state log](daily-email/STATE.md), Markdown letters, AWeber-ready HTML builder, hero generator, and cold-read review records | Emails are reviewed files; no AWeber campaign was scheduled or sent |
| Latest daily | [What are my blind spots? letter](daily-email/letters-02/what-are-my-blind-spots.md), [HTML](daily-email/html/what-are-my-blind-spots.html), and [cold-read audit](daily-email/reviews/what-are-my-blind-spots-cold-read.md) | CTA still contains `{{BOOKING_URL}}` until edition routing is deployed |
| Booking page | [Approved scope](booking-page/SCOPE.md), standalone [HTML mockup](booking-page/mockup.html), and executable local route with $35 offer and optional +$12.77 speed bump | No live payment session or production form submission |
| Bridge page | [Scope](bridge-page/SCOPE.md) and executable local route that confirms the saved order and deadline before the audio offer | No deployed route or real order lookup |
| Audio Upsell 1 | Reusable [copy shape](upsell-1-audio/SHAPE.md), selected [sales copy](upsell-1-audio/COPY.md), [product scope](upsell-1-audio/SCOPE.md), three comparison drafts, and local accept/decline route | Price, Marcus voice file, Replicate calls, audio assembly, storage, and delivery remain pending |
| Thank-you | [Receipt and delivery scope](thank-you/SCOPE.md) plus a local receipt route showing saved products, totals, status, and deadline | No production receipt, private download, or listening link |
| Local application | Loopback-only funnel, SQLite persistence, edition export, simulated payment, saved buyer draw, personal-card logic, adaptive report fixtures, and local PDF rendering | Uses fake payments and captured deliveries; makes no Supabase, Stripe, OpenAI, PDFShift, Replicate, email, or analytics call |
| n8n Stage 1 | Dedicated inactive 37-node workflow with numerology calculation, fixed canon selection, evidence synthesis, tarot planning, report writing, two graders, one bounded rewrite, fail-closed QA, and PDFShift rendering | Manual test lane only; does not load an order or deliver a customer report |
| n8n Stage 2 | Production flow architecture, delivery policy, operation envelopes, retry/lease design, and an audio branch plan | Parked until the production data and verified-payment contracts are implemented |
| Numerology canon | Versioned 33-entry canon covering Life Path, Expression, and Personality numbers 1–9, 11, and 22, with combination rules and compiled runtime JSON | Prose library still needs final editorial approval; unsupported master number 33 fails explicitly |

The executable local application is under [local/08-marcus](../../local/08-marcus/README.md). Its routes are `/email`, `/booking`, `/bridge`, `/upsell`, and `/thank-you` on `127.0.0.1:5088`.

## What has been tested

### Daily email continuity

The **What are my blind spots?** edition uses the traditional ten-card Tree of Life spread:

- fixed face-up cards: The Moon, Two of Swords, and Three of Pentacles;
- seven hidden positions reserved for the buyer-specific draw;
- HTML hierarchy verified as 17 px opening copy → 22 px spread line → hero image;
- hero visually checked for exactly three face-up and seven face-down cards;
- hosted hero returned HTTP 200;
- final copy passed three independent cold reads with no blocking findings.

The hosted hero is:

`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/08-hero-what-are-my-blind-spots.jpg`

### Cloud n8n Stage 1

The dedicated workflow is inactive and safe for manual tests:

**[Open the Marcus Stage 1 workflow](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg)**

The strongest end-to-end test is [execution 30700](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg/executions/30700):

| Check | Result |
| --- | --- |
| Input | Hng Ye Ying, 16 March 1986; “What are my blind spots?” |
| Spread | Tree of Life, 3 fixed face up / 7 buyer-specific face down |
| Numerology | Life Path 7 · The Seeker; private Expression 6 and Personality 1 |
| Personal card | The Lovers, used as a secondary lens |
| Fixed cards preserved | The Moon · Two of Swords · Three of Pentacles |
| Buyer draw | Seven of Pentacles · Ace of Wands · King of Wands · The Hierophant · Queen of Wands · Knight of Cups · The Hanged Man |
| Private grade | 9–10/10 across all eight dimensions |
| Customer grade | Every applicable dimension 5/5; 40 sound, 0 invented, 0 unsupported claims |
| Rewrite | Not needed |
| Output | `marcus-stage1-ye-ying-numerology-tree_of_life.pdf`, 1.92 MB |

Execution `30699` first exposed that a token budget sized for six cards truncated the ten-card writer response. Writer and rewrite budgets now scale with the number of positions: 7,000 tokens for six cards, 14,000 for ten, and 17,500 for twelve, capped at 18,000. Execution `30700` then completed through both graders and PDFShift.

Earlier passing runs also proved:

- execution `30694`: Life Path 4 remained plainly **The Builder**, while The Lovers stayed subordinate as the personal-card lens;
- execution `30695`: a second profile correctly produced Life Path 7 · **The Seeker**;
- rejected final QA ends at `QA HOLD · NO PDF` instead of sending weak copy to PDFShift;
- supported layouts include `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, and `twelve_houses`.

Full run details are recorded in [STAGE-1-TEST-EVIDENCE.md](n8n/STAGE-1-TEST-EVIDENCE.md). The workflow contract suite contains seven tests for code validity, exact canon selection, privacy boundaries, citation enforcement, adaptive token budgets, and fail-closed routing; all seven pass.

### Local funnel and fulfillment

The isolated local harness has tested:

- email-edition continuity through booking, bridge, upsell, and thank-you;
- server-controlled totals of 3,500 or 4,777 cents;
- one simulated paid order per intake, including concurrent replay protection;
- a separately saved hidden-card draw for each order and stable retry behavior;
- fixed face-up cards and a separate name-derived personal-card lens;
- immutable paid timestamps and 24-hour or 12-hour deadlines across restarts;
- audio accept, decline, refresh, and late-purchase paths without blocking the written reading;
- adaptive report and PDF fixtures for six-card and eight-card spreads;
- local-only authenticated fulfillment operations, leases, rollback, and captured unsent deliveries;
- desktop and mobile browser journeys with no external requests.

These tests prove the local contracts and page flow. They do not prove live Stripe, Supabase, model, audio, delivery, or production authentication behavior.

## How to test what works today

### Render the latest daily email

From the repository root:

```sh
python3 improve-v1/v1-one-time-BEs/scripts/build-08-daily.py
```

The builder regenerates all registered daily emails, including [the latest rendered HTML](daily-email/html/what-are-my-blind-spots.html). Building the files does not publish or send them through AWeber.

### Run the local customer journey

```sh
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

Open `http://127.0.0.1:5088`. Use made-up customer information. The detailed commands and API are in the [local harness README](../../local/08-marcus/README.md).

Focused tests:

```sh
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/draw.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/server.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/fulfillment.test.ts
node --import tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/store.test.ts
node improve-v1/v1-one-time-BEs/local/08-marcus/browser.test.cjs
```

### Generate a real test PDF in n8n

1. Open the [inactive Marcus workflow](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg).
2. Edit `2 · TEST INPUTS — EDIT ME`.
3. Enter `question`, `spreadType`, `displayFirstName`, `fullBirthName`, and `dateOfBirth`.
4. Click **Execute workflow**.
5. Open `26 · REPORT READY — DOWNLOAD PDF`, choose **Binary**, and download `data`.

Stage 1 already uses stored OpenAI and PDFShift credentials. It does not use Supabase or send the resulting PDF. Keep the workflow inactive while Stage 2 is unbuilt.

To regenerate and verify the workflow source locally:

```sh
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-numerology-workflow.py
node --test improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/numerology-canon/workflow-contract.test.cjs
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/update-staged-workflow.py --dry-run
```

## Production gap that must be resolved first

The current booking scope collects first name, last name, and delivery email. The tested numerology workflow requires:

- display first name;
- full birth name;
- date of birth;
- delivery email.

Life Path cannot be calculated without date of birth, and Expression and Personality cannot reliably use a shortened or married name when the method expects the full birth name. Before Stage 2 is connected, the booking form, privacy copy, data contract, and Supabase schema must agree on these exact inputs. The daily email only needs to explain enough to earn the click; the booking page should explain why the added birth details improve the reading.

## Remaining production work

- [ ] Add full birth name and date of birth to the approved booking experience and data contract.
- [ ] Bind each AWeber CTA to an immutable edition/version and replace `{{BOOKING_URL}}`.
- [ ] Implement the live booking, bridge, upsell, and thank-you routes against saved order state.
- [ ] Choose and integrate the secure payment surface while keeping the +$12.77 bump on the booking page.
- [ ] Create the dedicated Supabase tables, private storage, access rules, and atomic saved-draw operation.
- [ ] Build Stage 2 service endpoints for verified payment, idempotency, leases, retries, grading, storage, and delivery.
- [ ] Connect Stage 2 to the existing Stage 1 generation core and test it with test-mode orders.
- [ ] Decide PDF attachment versus restricted-link delivery and implement the selected provider/template.
- [ ] Approve the audio price and narration promise.
- [ ] Receive and privately store Marcus's authorized reference voice.
- [ ] Wire Replicate Chatterbox, segment narration, assemble and QA the audio, and issue a private listening link.
- [ ] Test late audio purchases, provider failures, missed deadlines, retries, duplicate webhooks, and customer-safe recovery.
- [ ] Complete privacy, retention, support, refund, and deadline-remedy decisions before accepting real orders.
- [ ] Activate the new Marcus workflow only after the full production path passes test-mode checks.

## Folder map

| Folder | Authority |
| --- | --- |
| [daily-email](daily-email/) | Email craft, spreads, questions, state, source letters, HTML, and reviews |
| [booking-page](booking-page/) | $35 offer, buyer inputs, inline speed bump, and prototype |
| [bridge-page](bridge-page/) | Paid-order reassurance between checkout and audio offer |
| [paid-reading](paid-reading/) | Written report product scope |
| [upsell-1-audio](upsell-1-audio/) | Audio product, approved copy shape, and variants |
| [thank-you](thank-you/) | Receipt, access, and delivery-state requirements |
| [data](data/) | Edition, buyer draw, personal lens, and order contracts |
| [n8n](n8n/) | Manual workflow, production architecture, evidence, canon, delivery, and audio plans |
| [local-testing](local-testing/) | Initial isolation audit |
| [reference](reference/) | Tarot source material |
| [archive](archive/) | Retired material kept only for history |

`00-ASTRA-BRIEF.md` was obsolete and was deleted at Joel's request. The current daily writing authority is [daily-email/SHAPE.md](daily-email/SHAPE.md).
