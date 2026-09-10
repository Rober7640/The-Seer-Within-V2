# 02 · Twin Flame Tarot — the fulfilment flow, and how to fix it

**Who this is for.** Somebody who has to run, change or rescue this workflow and was not in the
room when it was built. Read part 1 once. Come back to part 2 when something is red.

> ⛔ **Rule zero, before anything else. Never edit the n8n JSON.**
> `docs/02/02-fulfilment*.n8n.json` are **build artefacts**. The source is
> `scripts/build-02-n8n.py` (the machinery) and `scripts/02-houses.json` (the spread, the cards,
> the promises). Edit those, run the build, push. A hand-edit is lost on the next build and
> reviews as an unreadable one-line diff.
> ⛔ **And never write a workflow BESIDE the generator.** One was, on 2026-09-09 — a nine-node
> "test drive" with mock prose and hard-coded card names, pushed to the instance under its own
> name. It duplicated nothing this pipeline does and was thrown away the same day. The test
> drive is `build-02-n8n.py --testdrive`, and it already runs the real nodes.

---

# Part 1 · How the flow works

## What the buyer gets

She pays $35 after a sales letter that showed her **three tarot cards** and deliberately refused
to finish reading them. The letter's promise is that a full twelve-card spread will settle what
those three could not — and that the twelve will be **new**: *"they'll be twelve new cards, dear.
Not these three again."*

So she gets an 18-page PDF: **twelve new cards, one to each of the twelve astrological houses.**
It arrives as a link, 24 hours after she pays, in an email from Evelyn.

⭐ **The answer she paid for lives in the ROOM, not the card.** That is the letter's own
mechanism, stated in both letters — *"the house the Lovers falls into is what separates them."*
So four rooms carry the answers she is owed, and whatever new card lands in each is what answers:

| Room | Answers |
|---|---|
| **2** · what you own | the door, and the first windfall |
| **5** · romance | which of the two readings of the Lovers is hers — and the twin flame |
| **8** · what comes through others | the second windfall, the one that changes her love life |
| **12** · what is being kept from you | who the Tower is |

⛔ **The card decides HOW, never WHETHER.** A random draw will sometimes stand a hard card in a
room that owes good news. The good news still comes — awkwardly, late, or through something she
would rather not touch — because she is holding the letter that promised it. Proved on a real
run: house 5 drew **the Devil reversed** and used it to rule out renewal and deliver the arrival.
The hand-written product pays its second windfall through the **Nameless One**, which is nobody's
lucky card, and it works.

⭐ **The whole document is written per buyer, at fulfilment time, by a model.** Nothing is
pre-written except one static bonus section. Two buyers get different cards and different words.

## The spine, in one line

```
Stripe pays → draw 12 cards → write 12 passages → join into one letter →
grade it → build HTML → render PDF → upload → WAIT 24h → sign a link →
tag her on AWeber (this is the send) → mark delivered
```

## The five stages

| Stage | Nodes | What happens |
|---|---|---|
| **Trigger** | 1 → 2 | A Stripe `checkout.session.completed` arrives. Node 2 matches three fields exactly; anything else takes the ignore branch |
| **Write** | 3 → 4 → 4a/4b/4c → 5 | The draw is made, then a loop writes **one model call per house** — twelve calls, each seeing everything written before it |
| **Assemble** | 6 → 6a → 6b | One more call turns twelve separate notes into one letter, and owns the opening, the bridges and the close |
| **Check** | 7 → 7a → 8 → 8a/8b/8c | A model grades it against a 20-line rubric. Fail once → regenerate the **same cards**. Fail twice → send anyway, but log why |
| **Deliver** | 9 → 10 → 11 → 12 → 13 → 13a → 14 → 14a → 15 | HTML → PDF → storage → **the 24-hour wait** → signed link → AWeber |

## The nodes that matter most

Everything else is plumbing. These six are where the product lives.

### ⭐ `3 · Draw the twelve + build the brief` — the only place chance happens

Turns one webhook into **twelve items, one per house**, and makes the cut. Two rules are enforced
here and nowhere else:

- **Twelve new cards, arc-guided** *(operator, 2026-09-09 — "option 2 is safer")*. Nothing is
  fixed and nothing is re-laid; the pool is every Major neither letter has spent. But the twelve
  are no longer dealt straight: **her letter sets the story shape**, and each house is filled from
  the cards whose engine can carry that house's part of it — v1 (letter 02-E2) runs Recognition →
  Shadow → Choice → Arrival, v2 (letter 02-E3) runs Illusion → Clarity → Power → Integration.
  Same arc, same shape; different buyer, different cards. The per-house candidate lists live in
  `02-houses.json → arcs`; the fill is a seeded backtracking search, tightest room first, so the
  four promise rooms get the widest choice. Reversals are off (rate 0; the machinery is kept).
- **Which arc.** Stripe metadata `c` — the letter's own CTA code, now carried from the booking
  URL's `?c=` through checkout (`client/src/lib/funnel.ts → bookingLetterCode`,
  `server/routes/backendOffers.ts`). v2 is `c` in 21..26; **anything else, or no `c`, is v1**,
  because every buyer has read letter 1. A v2 buyer has read both and is paid both: her four
  rooms carry `obligations_v2`, each of which begins with the v1 string verbatim and adds the
  second letter's debt (the Star → 2, the Emperor → 5 and conditionally 8, the Moon → 12).
- ⛔ **The card still decides HOW, never WHETHER.** A room's list keeps out only the cards whose
  lore fence would contradict what the room owes — no card that "cannot give a date" stands in the
  one dated room — never a card because it is bad news.
- **Six cards are out of the deck, not three.** Letter 1 spent the World, the Lovers and the
  Tower; letter 2 spent the Star, the Emperor and the Moon. Letter 2 goes to the same woman, so a
  buyer from it has read all six. ⛔ A rule that depends on which letter she opened is a rule that
  will be got wrong, so all six are excluded for everybody. **That leaves 16 cards for 12
  houses** — four spare, and a third letter spending three more would break it.

⛔ It also **refuses to re-draw on a regeneration**. If the grade fails, the same twelve cards are
written again — otherwise the grade log would describe a spread that was never sent. Node 8c
carries `arc` back with the draw; without that a regenerated v2 order would be written as v1.
⭐ `scripts/check-02-draw.mjs` runs this node over thousands of order ids per arc and refuses if
any seed starves, repeats a card, leaves the pool, breaks a role list, or replays differently.

### ⭐ `4a · Compose the house prompt` — the biggest single thing in the workflow (54 KB)

Builds the instructions for one passage. It hands the writer:

- the room, and what that room is for
- **the whole table** — all twelve cards, including rooms not yet written, so a card can be read
  against another card
- **what this card is physically drawn with** (from `02-houses.json → card_lore`) — the accuracy
  fence, so nobody describes a card they half-remember
- **what the card can and cannot honestly say**, and for a reversed card, what a reversal does to
  *that specific card*
- everything the earlier houses already said, and how they opened
- **what this room owes her**, if it is one of the four — and an order to argue the
  answer from another card on the table, by card and by house
- **which letter she bought from.** The letter's own mechanism line is quoted to the promise
  rooms (the Lovers' for v1, the Emperor's for v2), and for a v2 buyer what the second letter
  showed her is appended **after** the cached block, so both arcs share one cached prefix
- **one rotated "move"** and **one rotated ending**, both seeded off her order id

⭐ **Why the seeding matters.** A fixed prompt returns its favourite answer every time. Before
seeding, two different buyers got the same opening sentence for the Tower and the same object in
the money room. The seed decides which true detail of the card the passage opens on, which move it
owes, and how it ends — so the same card in the same room reads differently for the next buyer.

### ⭐ `6 · Compose the joiner` — the one call that decides if this reads as a letter

Twelve passages arrive as twelve separate notes. This node writes the brief that turns them into
one sitting: the opening (which states the answer flat, takes the shame out, and warns her the
twelve will look like they contradict each other), a few bridges, and the close.

⛔ **It is also the last chance to catch a fault across passages** — a repeated shape, a stray
date, one card used as evidence too many times.

### ⭐ `7 · Grade it` + `7a · Read the verdict` — and it **fails open on purpose**

A 20-line rubric. Any single NO fails the reading.

🔴 **A broken grader must never cost a paying customer her reading**, so if the grader errors,
refuses, or returns something unparseable, `7a` marks it **passed** and writes the reason into
`why`. ⛔ It fails open **loudly** — the reason is the only record that something shipped
ungraded.

⭐ Everything a machine can count is counted in `6b` and handed to the grader as arithmetic: word
count, how many times "dear" appears, every date-shaped phrase and which room it stands in, which
passages name another card, and whether the reading marvels at the deck. **A grader asked to also
be a regex reports whatever it happened to notice.**

### ⭐ `10 · Build the HTML` — everything personal is in this one node

Her name, her twelve, where her three fell, the card art, the cover, the static bonus section.
**If personalisation is ever wrong, this is the only file to read.**

⛔ The card images are looked up **by house number from the draw record** — never from what the
model typed. A model that writes "The Wheel" would otherwise get a 403 from S3 and leave a silent
hole in a paid document.

### ⭐ `14a · Tag + reading_url` — **the PATCH is the send**

Nothing in this workflow sends an email. Adding the `be-02-delivered` tag on AWeber is what fires
the campaign that carries the link.

🔴 **`custom_fields` is a whole-state write.** Sending `{ reading_url }` on its own **wipes**
`stripe_order_id` and `offer`. That is not theoretical — a soulmate buyer lost hers 11 seconds
after paying. Node 14a re-sends all three every time.

## Two design choices that look odd and are deliberate

**The wait sits between the PDF and the signing.** The document is built immediately, but the link
is only minted at delivery. That means a 7-day link does not spend its first day in a queue — and
it buys a full day between a failed grade and the send, in which a human can still stop it.

**The cover is one generic image for everybody.** A per-buyer wheel was built and thrown away:
labelled seats contradict a random draw. The cover shows her three face-up, the other nine face
**down**, and no house labels. A face-down card makes no claim, so it cannot contradict anything.

---

# Part 2 · When it breaks

## The instruments, cheapest first

⭐ **Always go in this order.** Nearly every fault so far has been caused by a **prompt**, and a
prompt can be read for nothing.

⚠ **All commands below run from `improve-v1/v1-one-time-BEs/`.** The n8n workflow ids are
`NeXeQ9U8yU700xFF` (test drive, v1 buyer — press Execute, never activate), `sKwnqW5zGAxt8ghY`
(test drive, **v2 buyer** — the fixture carries `c=23`), `mOFO9VgRgSpw3caN` (the OpenAI arm) and
`5QkhGbpsusvIfh6j` (the full flow). Rebuild with
`python3 scripts/build-02-n8n.py [--test | --testdrive [--arc v2] [--storage]] [--openai]`, push with
`python3 scripts/push-02-n8n.py <same flags> --update <id>`.

🔴 **The test drive now stops BEFORE Supabase.** Nodes 12 and 13a are disabled in every
`--testdrive` build (a disabled n8n node passes its input through), so a run ends **green** on the
PDF at node 11 instead of red at the known blocker. Read the result with `read-02-run.mjs`, below.
Pass `--storage` to the build once the bucket exists.

| Cost | Command | Use it for |
|---|---|---|
| **free** | `node scripts/check-02-promises.mjs` | Did an edit quietly drop a promise or an audited fix? 69 assertions |
| **free** | `node scripts/check-02-draw.mjs` | After ANY edit to `arcs`: sweeps node 3 over 3,000 order ids per arc — no starvation, no repeats, replay-safe |
| **free** | `node scripts/preview-02-prompts.mjs` | Read a real house prompt with no model call. `--house N`, `--seed cs_x`, `--spread 8`, **`--arc v2`** |
| **free** | `node scripts/preview-02-prompts.mjs --metrics FILE.md` | Run the workflow's own counters over any reading — dates, cross-references, the deck marvel |
| **~$0.70** | `node scripts/dryrun-02-reading.mjs --order cs_x [--arc v2]` | A real reading, locally, no n8n. Runs the workflow's **own** Code nodes, not a copy |
| **free** | `node scripts/read-02-run.mjs <executionId>` | Pull a finished n8n run: saves `n8n-02-reading-<id>.md` + its draw sidecar, prints the arc, the twelve and the grade. ⭐ The only way to see a test-drive result now that it stops before Supabase |
| **free** | `node scripts/make-02-pdf.mjs [--from <basename>]` | Render ANY saved reading to PDF through local Chromium — no PDFShift key. ⭐ `--from n8n-02-reading-30541` renders a real n8n run, which is the only way to see what a buyer actually receives |
| **~$1** | `python3 scripts/testdrive-02-n8n.py NeXeQ9U8yU700xFF` | The real instance, delivery half removed. `sKwnqW5zGAxt8ghY --arc v2` for the second letter's buyer |

⚠ **Always pass `--order` when comparing two readings.** The order id is the seed. Two runs that
reuse the same one make the same choices — which hides real repetition and invents repetition that
is not there.

## 🔴 Three things this n8n instance does that nothing in the docs prepared us for

These cost real money to learn. **Do not re-learn them.**

**1 · Activating over the API does not register a webhook.** `POST /workflows/:id/activate` returns
200 and `active: true`, and the webhook URL still answers **404 not registered**. Proved with a
two-node control. ⛔ So a real order cannot be driven from a script. **Arm webhooks from the UI.**
Schedule triggers *do* work from the API, which is why the test drive uses one.

**2 · n8n serves the version it had at activation.** A tick 7 seconds after a successful `PUT` ran
the *previous* code — an execution reported a fix as missing that a `GET` showed as deployed.
⭐ `testdrive-02-n8n.py` now diffs every node against the instance and **refuses to arm** until they
match. Trust that check; do not bypass it.

**3 · The executions list lags.** A 3-minute run first appeared at ~2m30s. ⛔ **Never wait to
"see it start" before disarming** — that is how four unintended full runs (48 model calls) got
billed. Arm, wait one tick, disarm **on the clock**.

**4 · 🔴 The n8n UI runs the workflow in your OPEN EDITOR TAB, not the saved version.** A tab
opened before a push executes the code that was there when you opened it. ⛔ **Press Execute in a
tab you opened after the push, or reload first.** Measured 2026-09-08: executions 30537 and 30541
were seven minutes apart on the same workflow, and 30537 ran the previous day's build — no card
lore, no dating law, no reversal rule. Its PDF showed every fault that had already been fixed, and
it was very nearly read as a regression.
⭐ **How to tell which build a run used**, before drawing any conclusion from it:

```
… /api/v1/executions/<id>?includeData=true
runData['4a · Compose the house prompt'][0]…json.prompt
```
Then check for `WHAT THIS CARD IS DRAWN WITH`, `DO NOT DATE THIS ROOM`, `HOW THIS ROOM ENDS`.
Absent = an old build, and nothing in that run tells you anything about the current one.

> ⛔ **Never leave the test-drive schedule armed.** It fires every minute. The script disarms after
> 74s by itself; if you ever stop it early, check the workflow is `active: false` by hand.

## Symptom → cause

| What you see | What it actually is |
|---|---|
| **Node 12 · Supabase, `Bad request`** | 🔴 **The known blocker.** The project and bucket for the `wealth-scriba-customer-report-generator` credential are still unknown. Nothing downstream can run until somebody supplies them. ⚠ The test-drive builds disable 12/13a so a smoke run no longer dies here; the FULL build still does |
| **A v2 order reads as v1** (the Lovers' mechanism line, four debts not six) | `c` never reached Stripe metadata. The booking screen reads `?c=` once per visit and keeps it in sessionStorage; check the letter's link carries it, and that `metadata.c` is on the session. ⚠ `BACKEND_CHECKOUT_LIVE` is still false, so this path has never run against a real Stripe session |
| **Node 9 / 8b / 15, host not found** | 🔴 `APP_BASE_URL` is still `https://TODO-set-app-base-url` in the build script, and the `/api/be/02/*` endpoints do not exist. ⛔ **The FULL build would die at node 9, right after the grade.** The test build disables them, which is why the test drive never saw this |
| **Anthropic returns 400 about a workspace header** | The wrong credential. Use `81fRDrOUHCoZiLBw`. ⛔ **Not** `anthropic-header-auth` — its key is not workspace-scoped. 07 is still wired to that one and will fail on its first real order |
| **Node 6 dies on "no prose"** | The loop did not reset on a regeneration. n8n keeps a Loop Over Items node's state per execution. The fix is the `reset` option on node 4; if it goes missing the joiner gets 24 rows, twelve of them empty |
| **A passage is empty, or the PDF has a hole** | The model hit `max_tokens` with only thinking, or declined. Both are **HTTP 200**, so they look like success. `4c` throws loudly on each — if you removed that, put it back |
| **The PDF renders with gaps and no error** | PDFShift fetches the card images itself. A slow or 403 fetch silently drops them. `make-02-pdf.mjs` reports broken images; use it |
| **The cover is a black page** | The cover image 403s on S3. On S3 a 403 means **absent** |
| **A run shows faults you know are fixed** | 🔴 Check which build it ran (above) before anything else. The UI executes your open tab, not the saved workflow |
| **A heading sits alone at the foot of a page** | Only house 1 can hit this. The `.hh` wrapper keeps the heading block together — if it goes missing, this comes back |
| **A house heading has no keynote after the card name** | The model wrote its own heading first and the keynote lift missed it. `4c` now finds it anywhere and strips a self-written heading; `metrics.keynotes_missing` lists any that still fail |
| **The reading is fine but the grade says FAIL** | Read `why` before changing anything. The rubric is 20 lines and any single NO fails, so the grade is a **signal, not a gate** — it regenerates once and sends regardless |
| **Two identical emails a day later** | Stripe retried the webhook. ⛔ **Nothing dedupes this yet.** Two deliveries = two parked waits = two sends |
| **She paid and heard nothing** | A parked execution was lost. There is no net under the 24-hour wait except this query, and it has to be run: `be_orders` where `delivered_at is null` and `created_at < now() - 26 hours` |

## If the writing gets worse

The grade and the promise-check can both be green while the reading is something no tarot reader
would sign. There is one instrument for that and it lives nowhere else:

⭐ **`docs/02/02-reader-grade-prompt.md`** — paste it whole into a fresh session. It grades the
**tarot**, not the copy: whether a claim is carried by the card that is actually there, whether a
reversal is a real modification, whether it reads a spread or twelve cards in a row.

⚠ **Give it two readings from different draws and different `--order` seeds.** Repetition between
buyers is invisible in a single reading, and it is the fault this product dies of.

Two full passes have been run. What they found, what caused each fault and what fixed it is in
[`02-n8n-test-plan.md`](02-n8n-test-plan.md). ⛔ Read that before changing a prompt — several
"obvious" improvements in there were tried and made things worse.

## The lesson this codebase has learned three times

🔴 **A worked example inside a prompt is not an illustration. It is a template.**

It has happened with example nouns in a rotated move, with a quoted sentence about the deck, and
with the card lore's own vivid phrasing — all three were reproduced word for word in real
readings, in a document a buyer keeps. **Write instructions as mechanisms, never as sentences
somebody could lift.**

## Still open, and both need a person

1. 🔴 **The Supabase project URL and bucket** for `wealth-scriba-customer-report-generator`. This
   is the last thing between the workflow and a fetchable PDF.
2. ✅ **Which letter's promises does the PDF owe? — answered 2026-09-09.** `c` now rides from the
   letter's link through the booking screen into Stripe metadata, node 3 reads it, and a v2 buyer
   is paid both letters' debts from `obligations_v2`. ⚠ Two things still need a person: the
   wiring has never run against a real Stripe checkout (`BACKEND_CHECKOUT_LIVE` is false), and
   the v2 test drive (`sKwnqW5zGAxt8ghY`) has been pushed but not yet pressed.
3. ⚠ **Phase 3 of the operator's handoff is not started** — the per-card reveal shape at
   gold-standard length (a Waite block per card, then 500–800 words of interpretation following
   the House 5 / Chariot test write; ~8,000 words, ~32 pages). Today's passages run ~180 words.
   That is a rewrite of `HOUSE_JS`, the word budget, node 4b's ceiling and the PDF CSS, and it
   wants its own tarot-reader audit pass before it ships.


## 2026-09-10 — Shorter Terra report and manual test

Operator accepted an above-6 full-report test gate. An extractive edit of execution 30656 reduced generated prose from 8,174 to 6,384 words (37→33 pages). A fresh paired blind review scored the original 6.33 and shortened PDF 7.0, with no missing promises. The old 5.67 standalone score was from a different reviewer. Waite, takeaways, gift, imagery and styling were unchanged.

Generator/spec now target 6,400 with differentiated per-house bounds and a shorter joiner. No sample sentences were inserted. Required checks passed. Dedicated manual-only Terra workflow **IT3T9VNJOLBIADwQ** is pushed and inactive; full report generation through PDFShift is wired, Supabase/signing disabled and delivery absent. No fresh run of the new prompts has been scored: 7.0 belongs to the edited PDF. Production workflow is unchanged.

See [shortening experiment and manual handover](02-shortening-and-manual-handover.md) for the PDF, paired review, exact budgets, verification and testing instructions. Do not use the old 500–800-per-house or 8,000-total assertions for this shorter build.


## Main workflow pushed — 2026-09-10

Operator subsequently authorized pushing the accepted shorter Terra configuration to the main fulfilment workflow. Rebuilt from the generator with `--openai --model gpt-5.6-terra`, pushed to **5QkhGbpsusvIfh6j**, and verified all authored node parameters, model credentials, retry settings and connections against the remote copy. Main workflow now has 30 nodes and remains **inactive**. All four model nodes use Terra; the production Stripe webhook and full storage/delivery wiring are retained. No execution or activation was started, no customer message was sent, and no commit was made.

[Main fulfilment workflow](https://ezyabsorb.app.n8n.cloud/workflow/5QkhGbpsusvIfh6j). The separate manual test remains **IT3T9VNJOLBIADwQ**. Supabase's unresolved storage configuration and the lack of a fresh score for generated shorter output remain unchanged; the 7.0 score belongs to the edited PDF.
