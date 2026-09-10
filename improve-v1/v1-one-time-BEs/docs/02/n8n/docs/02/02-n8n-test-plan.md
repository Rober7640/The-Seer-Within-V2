# 02 — the phased test plan *(the fulfilment workflow)*

> 🔴 **THE PHASES ARE STALE FROM 2026-09-07 — the product changed under them.** ⚠ **The two
> measured-findings sections that follow this banner are NOT stale**; they are the newest thing
> in the file. The banner applies from *"Why 02 is four phases"* downwards.
>
> Everything in the phases is written for a FIXED product: one PDF for everyone, no draw, no
> writing at fulfilment. The operator has since decided 02 is **3 fixed cards + 9 drawn per
> buyer, written per buyer at fulfilment, reversals included** — which is 07's shape, not a
> three-step send.
> ⛔ Do not test the writing half against those phases. What survives: phase 1 (the trigger),
> phase 3 (the wait), phase 4 (the send) and every trap in them. What is dead: "the file goes
> up once", "no words phase", "nothing is generated so nothing can come out wrong".

**Sibling document:** [`07-n8n-test-plan.md`](../07-marcus/07-n8n-test-plan.md). Same method —
run the unrelated failure classes apart, so each failure has one cause — but **02 is a much
smaller machine than 07 and most of 07's plan does not apply here.**

⛔ **Nothing is built.** There is no `02-fulfilment.n8n.json`, no build script and no push
script. This document is what that workflow must pass, and the node numbers below are the shape
it is written against. Build it to these numbers or renumber this file with it.

---

# What a tarot reader's audit found *(2026-09-08)*

**Method.** Two generated readings were graded by
[`02-reader-grade-prompt.md`](02-reader-grade-prompt.md) in a fresh session — a working reader of
twenty years, grading the TAROT and not the copy. ⭐ **It is the only grader we have that judges
whether the reading is any good.** Every other check — the node-7 rubric, `check-02-promises.mjs`,
the dry run's word count — scores a reading that can still be something no reader would sign.

⛔ **Re-run it after any change to a prompt.** Its findings live nowhere else, and five of the
six faults below were invisible to every automated check that was green at the time.

## The five faults, and where each one was actually caused

| | The fault | Where it came from | Fixed by |
|---|---|---|---|
| ⑴ | **Six to ten of the twelve rooms carried a date** — "inside eight days", "by week seven", "between the eighteenth and the twenty-fifth day". Twelve dates is one date's worth of credit divided by twelve | VOICE rule 2 said "A DATE IS ALLOWED" with no budget, and a rotated MOVE said "⭐ NAME THE WINDOW" | `02-houses.json → timing`: ONE room is dated and the spec names which card carries it. Every other house prompt is handed `law_other`; the joiner runs a date audit over the finished passages and closes by saying it dated one room and only one — **the hand-written product's own move** |
| ⑵ | **Reversals read as opposites.** The Hanged Man reversed shipped as a man standing up free, rope loose, "the waiting already ended" — the opposite of that card. Temperance was made to deliver an announcement on a deadline | The prompt said *"say what the picture looks like upside down and read what the room does with it that way"* — so the model inverted the drawing and read the new arrangement. And **nothing in the pipeline had ever told it what a card is** | `02-houses.json → card_lore`: 19 cards × what is genuinely drawn on them + what the card can and cannot carry + what a reversal does to **that** card. The Hanged Man's entry names the shipped sentence and bans it |
| ⑶ | **The reading marvelled that all twelve were Majors** — "In thirty years I have seen that four times" | The letter's own beat 14 is headed *"Why I'm using the Major Arcana for yours"*: **she chose it**. Nothing told the writer that | The fact and the ban went into the cached block, and into the joiner's opening. ⚠ First attempt QUOTED the product's replacement sentence and the writer reproduced it verbatim — the quote was removed |
| ⑷ | **Template bleed across buyers.** Two independent runs opened the Tower on the same sentence and both put an unopened envelope in the money room | A fixed prompt returns its favourite answer every time. And the MOVES carried worked examples — *"a Sunday, a drawer, a bill, a name"* — which are not illustrations to a model, they are templates | A seed off her `order_id` rotates the MOVES **and** picks which true detail of the card the passage opens on. Measured after: the Tower opens 6 different ways across 12 buyers, up from 1. Every example noun was cut out of the MOVES |
| ⑸ | **It asserted where it could have argued.** "Not renewal. Arrival." — while the Devil reversed sat in the seventh house, which is the actual evidence, unmentioned | Houses are written one per call **in order**, so house 5 could not see house 7. The draw is decided in node 3, so the whole table had been available the entire time and was simply never handed over | Every house prompt now gets all twelve, written up or not. The three fixed cards must name another card by card and by house and show the working |
| ⑹ | *(found by fixing ⑸)* **Over-correction: 10 of 12 rooms cross-referenced**, two of them closing on the same tag — "read this beside the X in your eighth" | An instruction that says "argue from the table" with no restraint fires everywhere | The instruction now says most rooms are read alone, and bans the closing-tag form by name |

## What it cost to catch, and the cheap instrument that came out of it

⭐ **`preview-02-prompts.mjs` renders the prompts with no model call.** Every fault above was
caused by a **prompt**, and a prompt can be read for nothing. `dryrun-02-reading.mjs` costs ~$0.70
and four minutes and is the wrong instrument for *"does the prompt say what I think it says"*.

```
node scripts/preview-02-prompts.mjs                    # one house prompt, in full
node scripts/preview-02-prompts.mjs --house 7          # a named room
node scripts/preview-02-prompts.mjs --seed cs_x        # another buyer, same code
node scripts/preview-02-prompts.mjs --spread 8         # eight draws, to eyeball the rules
node scripts/preview-02-prompts.mjs --metrics FILE.md  # run node 6b's counters over any reading
```

⭐ **`--metrics` pointed at an OLD reading should come out BAD.** That is how you know the
counters work. The pre-fix reading reports 14 date-shaped phrases and the Majors marvel; the
post-fix one reports 1 and none.

## Everything a machine can count is now counted in node 6b and handed to the grader

🔴 **The one rubric line that never misfired was the word count**, because it is arithmetic on two
numbers the grader is *given*. Lines 15–18 are now the same shape: node 6b measures the dated
phrases (with the house each stands in), which passages name another card, the `dear` count and
the Majors pattern, and node 7 receives them under **MEASURED FOR YOU**.

⚠ **The list is where to LOOK, not the verdict.** The date regex catches descriptive uses too —
*"the invitation answered on the third day"* is her habit, not a prediction — so the rubric asks
the grader to judge each candidate. A grader asked to also be a regex reports whatever it happened
to notice.

## Two collisions the fixes caused, both real, both now written down

1. 🔴 **The dating close failed rubric line 8** (*"no refusal to answer"*) on a real run, because
   *"the rest I have not dated, and I will not pretend I can"* looks exactly like the sales
   letter's withhold. It is not — it is the reader saying which single claim in the document is
   precise, and it is the shipped product's own closing sentence. Line 8 now carves it out.
2. 🔴 **A generic card fence contradicts the offer.** A textbook World forbids naming her reward
   for finishing; a textbook Lovers forbids naming the man. But the World's obligation makes her
   name both windfalls and the Lovers' arrival branch must say TWIN FLAME and name the week. So
   **the three cards she was already shown have product-true engines**, and they fence the thing
   that would genuinely be a lie: that the CARD knows which door, or which of the two trees. It
   does not. **The house does** — which is the mechanism the whole offer was sold on.

## Where it stands after the fixes

| | |
|---|---|
| Dry run | **PASS**, 2,785 words against 2,600 (7%) |
| Dated claims | **1 stray**, down from 14 · the dated room carries its own justification |
| Passages arguing from the table | 8 of 12, down from 10 after the over-correction fix, up from 3 |
| Majors marvel | none |
| PDF | 18 pages, no broken images, opening present |
| `check-02-promises.mjs` | 10 promises + 9 machinery + **42 audit assertions**, all green |

⛔ **Two dry runs is not a sample.** Both post-fix readings were graded by the reader prompt and
its verdict is the only one that counts here — but template bleed is a fault you can only see
across draws, so any further prompt change wants two fresh runs and another pass of that grader.

## The second pass of the same audit, and what the FIXES broke *(same day)*

⛔ **Re-running the reader prompt on two post-fix readings is not optional.** It found six new
faults, and the worst of them was caused by the first round of fixes.

| | Found | Fixed |
|---|---|---|
| 🔴 | **`card_lore`'s own words were being printed in the product.** "*a season became an address*" is a phrase written as INSTRUCTION; two readings returned it. The engine and reversed fields had been written vividly, to be useful | Every `engine` and `reversed` de-illustrated — mechanism and ⛔ fence only, no scenes, no objects, no durations. Plus an explicit "it is not phrasing" ban in the prompt. **This is the same lesson the MOVES taught and then the Majors quote taught: a worked example inside a prompt is a template** |
| 🔴 | **The joiner brief's own sentences too**, one level up — two readings for different buyers closed on four word-for-word identical sentences, every one lifted from the brief rather than from her spread | Same ban, and the worst offender de-illustrated |
| 🔴 | **The one surviving date had a faked reason.** "*I can date this room because two people stand apart on this card, and that distance closes on a single day*" — nothing on the Lovers moves; it is a tableau. It was built to sound like the standard's sentence without doing its work | `timing.law_dated` supplies the honest reason — an ARRIVAL IS AN EVENT and events land on a day, the other eleven rooms are weather — and bans arguing it from the picture. Rubric 15 now judges the reason, not just the count |
| 🔴 | **The arrival was written as a stranger walking in.** The letter is flat: *"the encounter the second reading points to is not a stranger. It's someone you already know."* And "*what he looks like*" was answered with the letter's own line about what he is NOT | Both written into the Lovers' obligation, with the standard's model for describing him — manner, never features. The picture detail the letter says decides it (her eyes go past him, his go to her) was missing from `drawn` and is now in |
| 🔴 | **Concreteness was being bought with invention** — a half-empty drawer, a coat off its hook, "*the appointment you have moved twice*". The standard does the same job with categories she fills in herself | The move rewritten around a test — *could a hundred women each point at something different and all be right?* — plus a blanket ban on invented counts and durations, and rubric line 19 |
| 🔴 | **The opening invented a pattern and got it wrong, twice.** One reading called the ninth house "a room about other people" (it is what she believes) and hung its whole closing synthesis on it; another called the twelfth "a room you are standing inside" and then opened its own twelfth with "here is what you cannot see from where you stand" | The joiner now has its own seed and a rotated thing-to-notice, it must be checkable against the table, and the grader is handed all twelve cards to check it — rubric line 20. ⛔ It is the first thing she reads and the easiest thing she can disprove |

### Over-corrections it caught, which is what a second pass is for

- **10 of 12 rooms were cross-referencing**, four closing on the same tag. Capped: most rooms are read alone, no card is the evidence more than twice, and the closing-tag form is banned by name. Now runs 6–7 of 12.
- **The close had become an index** — restating three verdicts she read ten minutes earlier. It now synthesises: the order they happen in, which is the condition of the others.
- **The dating close ended the document on a refusal.** The standard follows it with compensation — the two months are when movement BEGINS, the slow rooms are slow because of the cards in them, and a woman who reads slowness as failure stops just before it comes right. Both readings kept the refusal and dropped that.
- **The Majors fix removed the meaning with the marvelling.** The letter sold a Majors-only twelve as the heaviest reading she does, kept for the women whose first draw asks for it. Reporting "all twelve are Major Arcana" and moving on turned the reason it costs $35 into a line of stock-keeping.

### Two bugs in the fixes themselves, both caught by measuring

1. 🔴 **The seeded opener index collided.** `(SEED + house * 7) % drawn.length` — with six details, `house * 7 ≡ house (mod 6)`, so any two houses **six apart** pick the same detail. 5 and 11 are six apart, and they are two of the three rooms the Lovers may fall in. Two runs put the Lovers in 5 and in 11 and both opened on the winged figure. ⛔ **An arithmetic seed is not a mixed one** — it now hashes order id, card and house together.
2. 🔴 **`preview-02-prompts.mjs --metrics` read the wrong draw.** It always loaded `dryrun-02-draw.json`, so a reading made under `--order X` was measured against the *previous* run's cards — it reported the dated room as house 11 when the Lovers had fallen in 7, and every cross-reference count with it. **A measuring tool that quietly measures the wrong thing is worse than none**, and this one was one step away from causing a prompt change that was not needed. It now derives the draw from the reading's filename and refuses to run if it is missing.

⚠ **`dryrun-02-reading.mjs` now takes `--order`, and you should use it.** The order id is the seed
behind the move rotation, the ending rotation and every card's opening detail — two runs that reuse
the same one get the same choices, which both hides real bleed and invents bleed that is not there.
Output is named after the order, so comparison runs no longer overwrite each other.

### Where it stands

| | |
|---|---|
| Last run | **PASS**, 2,832 words (9% over), one dated room, its reason honest |
| Stray dates | **0** on the last two runs, from 14 |
| Passages arguing from the table | 6–7 of 12, from 3 (and back down from an over-corrected 10) |
| Cross-buyer bleed | passage-level gone; what remains is the deliberately-mandated frame |
| `check-02-promises.mjs` | 10 promises + 9 machinery + **42 audit assertions**, all green |

⛔ **The rubric is now 20 lines and any single NO fails.** The flow regenerates once and sends
anyway, so a permanently-failing line costs one extra generation per order and a log entry — it
does not cost a buyer her reading. But it does make the grade noisier as a signal. ⭐ The 24-hour
wait is the real net: read `why` in the grade log the same day and a bad one can still be stopped.


## The audited build, on the real instance *(execution 30536, 2026-09-08)*

Driven with `testdrive-02-n8n.py NeXeQ9U8yU700xFF`. **Every node ran clean except the one known
blocker.** 12 house calls · the joiner · the grade · node 8 took the PASS branch · the HTML ·
PDFShift returned a **2.03 MB PDF**. 🔴 Node 12 (Supabase upload) 400s — the project and bucket
for `wealth-scriba-customer-report-generator` are still unknown, and that is the only thing
standing between this and a fetchable document.

⭐ **The draw dealt both cards that shipped the original faults, and both now read correctly:**

| | |
|---|---|
| **the Hanged Man reversed**, house 6 | *"The difference is consent. He is paid, in a changed view, for the hours he gives. You give the same hours and collect nothing, because you have decided this stretch does not count… You call that good sense about timing. It is a refusal, dear."* — the surrender REFUSED. The shipped fault read the same card as a man standing up free with the waiting already over |
| **Temperance reversed**, house 3 | *"You keep it all back, then say the whole of it at once, then hear how much it was and go quiet again."* — the tempo forced. The shipped fault made Temperance deliver an announcement on a deadline |

Measured on the run itself, by node 6b: **0 dated claims**, dated room house 5 where the Lovers
fell, the five-to-seven-day first sign named once, no Majors marvel, 5 of 12 passages arguing from
the table, 2,809 words against 2,600. Grade **PASS**.

⚠ The concreteness fix is visible and is in the standard's register — *"The reply you give when
somebody asks how you are. The message you write out in full and do not send."* Categories she
fills in, not possessions the reader decided she owns.

⛔ Both workflows confirmed `active=false` afterwards. The test-drive schedule ticks every minute
while armed and has cost 48 wasted model calls once; `testdrive-02-n8n.py` disarms on the clock
rather than on a sighting, and it did (74s).

Artefacts: `n8n-02-reading.md` · `n8n-02-draw.json` · `n8n-02-reading.html`.


## 🔴 A fourth instance behaviour, and it nearly caused a wrong conclusion *(2026-09-08)*

**The n8n UI executes the workflow as it stands in your open editor tab, not as saved.**
Executions 30537 and 30541 ran seven minutes apart on the same workflow: 30537 used the previous
day's build (no `card_lore`, no dating law, no rotated ending, no reversal rule in the voice) and
30541 used the current one. 30537's PDF showed the Hanged Man reversed as *"the waiting that has
already ended… he is on his feet"* — the exact fault fixed hours earlier — because that fix was
not in the code it ran. ⛔ **Reload the tab after any push before pressing Execute**, and check
which build a run used before treating anything it produced as a finding.

⭐ **30541 is the artefact to look at**, saved as `n8n-02-reading-30541.md` / `-draw-30541.json` /
`-30541.pdf`. Grade PASS, 2 date-shaped phrases both in the dated room, no Majors marvel, and the
same card reversed reads *"a card of time already paid"*.

### Three defects the rendered PDF showed that no other check could

| | Fixed |
|---|---|
| 🔴 **A heading stranded at the foot of a page.** House 1 is the only one that can hit it — every later house opens its own sheet — and its `HOUSE 1 / yourself / …the Tower, a card of…` sat alone at the bottom with the passage overleaf | The two headings are wrapped in `header.hh` with break-inside/after avoid. ⚠ `break-after` on the tags alone was **not** enough: the break then fell *inside* the `h2`, stranding "House 1" and carrying "yourself" over |
| 🔴 **A warning written as an imperative.** *"Read this crown as good luck and sit still, and you will hear it from a third party"* — which instructs her to do the very thing being warned against | The move now requires a consequence, never an instruction |
| ⚠ **The close renders inside house 12.** The joiner's close follows the last `[n · house · card]` marker, so node 10 appends it to the twelfth room's prose — it has no page or heading of its own, and reads as though house 12 continues. The hand-written product gives it its own section | ⛔ **Not fixed — it needs a joiner-contract change** (a close marker node 10 can split on) and is a layout decision, not a bug |

⭐ `make-02-pdf.mjs --from <basename>` now renders any saved reading through local Chromium, so a
real n8n artefact can be looked at without a PDFShift credit or a Supabase bucket.

---

# What a real n8n run found *(2026-09-07)*

**Method.** The workflow was pushed to `ezyabsorb.app.n8n.cloud` as a TEST-DRIVE build — the
delivery half REMOVED (not disabled), its own trigger, and the two grade-log POSTs off — and
driven from the API. Local harness: `dryrun-02-reading.mjs` + `make-02-pdf.mjs`. Everything
below was measured on execution 30470–30478, not reasoned about.

## The instance behaves in three ways nothing in this repo said

| | Measured |
|---|---|
| 🔴 **API activation does not register a production webhook** | `POST /workflows/:id/activate` returns 200 and `active: true`, and the webhook URL still answers **404 "not registered"**. Proved with a two-node control (webhook → noOp) that fails identically, and a second control with a **schedule** trigger that fired in 30s. ⛔ So "one real order through n8n" cannot be driven from a script against the webhook — for 02 **or 07**. Arm webhooks from the UI; drive tests with a schedule trigger |
| 🔴 **n8n serves the version it had at activation** | A tick 7s after a successful `PUT` ran the PREVIOUS code — an execution reported a fix as absent that a `GET` showed as deployed. `testdrive-02-n8n.py` now diffs every node against the instance and refuses to arm until they match |
| ⚠ **The executions list lags** | A 3-minute run first appeared in `/executions` at ~2m30s. Gating "deactivate" on seeing the run leaves a 1-minute schedule armed for minutes — that is how four unintended full runs (48 model calls) got billed. Arm, wait one tick, disarm on the clock |

⭐ `$env` **is** blocked in Code nodes — "access to env vars denied", exactly as 07's README says.
*(Untested: whether it still resolves inside node PARAMETER expressions, which is where the live
Cosmo flow uses `$env.SUPABASE_URL` and appears to work.)*

## Four defects in the workflow, three of which the local harness cannot see

| | Found by | Fixed |
|---|---|---|
| 🔴 **The Anthropic credential 07 uses is not workspace-scoped** — `anthropic-header-auth` (`8H0t9TxeiNyZfZbK`) returns 400 *"must include the anthropic-workspace-id header"*. ⛔ **07 is wired to it and would fail on its first real order** | exec 30470 | ✅ 02 now uses `81fRDrOUHCoZiLBw`, the credential the LIVE flow calls Anthropic with |
| 🔴 **The joiner never received the voice.** `4c` rebuilds its item from `$('4 · Each house')` — the LOOP's output, which never saw `4a` — so `$json.voice` reached node 6a as `undefined`, and `JSON.stringify(undefined)` made the request body invalid JSON. ⛔ **The harness hid this**: its shim answered `$('4 · Each house')` with 4a's output, which does carry the voice | exec 30471 | ✅ node 6 supplies its own voice; the harness shim now returns what n8n returns |
| 🔴 **The regenerate loop did not reset.** On a failed grade, `8c` sends the order back to node 3 — and n8n keeps a Loop Over Items node's state per EXECUTION, so the twelve fresh briefs went straight to "done". The aggregate handed the joiner **24 rows, twelve of them with no prose**. ⛔ This is the hazard flagged for **07**, whose own plan says nodes 9/9a/9b have *"never executed once"* | exec 30476/30477 | ✅ `reset: {{ $json.prose === undefined }}` — proved on a 6-node probe (GEN×2, WORK×6, both passes clean), then end to end: exec 30478 ran **24 house calls, two grades and a regeneration** |
| ⚠ **A stray `KEYNOTE:` shipped into the prose** — house 2 emitted the line twice, only the leading one was lifted, and an all-caps label landed mid-reading | exec 30478's own grader, line 12 | ✅ every `KEYNOTE:` line is stripped, not just the first |

## Still broken, and it is the one a buyer would see

🔴 **The cover is a black page.** `evelyn/02-zodiac-spread.jpg` answers **403** — and on S3 a 403
means ABSENT. PDFShift renders the page with no art and no error, and the title sits grey-on-black
at almost no contrast. ⚠ The local harness swapped in the local file, so **only the n8n run shows
what a buyer gets.** Needs one upload before any real order.
⚠ And the asset itself is wrong even when present: it is a fixed wheel of the OLD hand-written
twelve, so it contradicts every generated draw. It has to lose its cards or be drawn per buyer.

⚠ **Node 12's Supabase upload 400s.** It was copied from a credential-less legacy node in the live
flow (hardcoded `pqolqzddzxubquukxnhk` + `analysis_pdf`) while using the credential from a
DIFFERENT node, which points at `$env.SUPABASE_URL` with bucket `$env.SUPABASE_BUCKET || 'readings'`.
⛔ The real project and bucket for `wealth-scriba-customer-report-generator` are still unknown —
`$env` cannot be read from a Code node, and no recent live execution reached its upload node.
**This is the one blocker left before the workflow can produce a fetchable PDF.**

## Why 02 is four phases and 07 is five

07 writes the reading at fulfilment time: six model calls, a grader, a regenerate loop, a card
for every passage, a PDF rendered per buyer. **02's reading was written in August and is sitting
in `build/02/02-product.pdf` — 31 pages, 3.7MB, one file for everybody (decision D7).**

So everything 07 tests before its phase 3 has no equivalent here. What is left is a wait and a
send — which are exactly the two things 07's own plan has never been able to test either.

| 07 has | 02 needs it? |
|---|---|
| Per-position model calls, the joiner, the voice block | ⛔ no — the words are written |
| The grader, the regenerate loop, the grade log | ⛔ no — nothing is generated, so nothing can come out wrong |
| Card art, the `[n · name · card]` markers, `slug()` | ⛔ no |
| PDFShift render + upload per order | ⛔ no — **the file goes up once, and every order only signs it** |
| A stored draw, a spread registry, her typed question | ⛔ no — 02 is a fixed product |
| Supabase signed URL · the 24h wait · find-then-PATCH on AWeber | ✅ yes, and they are the whole workflow |

---

## The workflow this plan tests

| # | Node | What it does |
|---|---|---|
| **1** | Stripe webhook | `checkout.session.completed` |
| **2** | Is this a paid 02 order? | three exact matches — see phase 1 |
| *(3)* | *Load the order* | ⭐ **probably not needed. See below** |
| **4** | Hold to the 24h mark | Wait, counted from the session's own paid time |
| **5** | Sign the PDF | Supabase `/object/sign/…` on the ONE stored file |
| **6** | Find her on AWeber | list `6972552`, `ws.op=find&email=` |
| **7** | PATCH: `reading_url` + `be-02-delivered` | ⭐ **this is the send** — the tag fires the campaign |
| **8** | Mark delivered | writes `reading_url` + `delivered_at` back to `be_orders` |

### ⭐ Node 3 has nothing to fetch

07 must call our API because her questions and the morning's draw are not in Stripe. **02's
webhook already carries everything the send needs:**

| Needed | Where it is on the webhook |
|---|---|
| Her email | ⛔ **the same fallback chain our server uses**, or the lookup misses her: `customer_details.email` → `customer_email` → `metadata.email` (`server/lib/beOrders.ts:143`) |
| Her first name | `metadata.firstName` — ⚠ **absent is normal** (no `?fn=` on the letter link). Our server then falls back to `customer_details.name`, the cardholder name |
| The order id | `body.data.object.id` — the `cs_…` session id, which is **exactly what her AWeber record already carries as `stripe_order_id`** (`server/lib/beOrders.ts`) |
| Did she take the bump | `metadata.bump` = `'1'` / `'0'`, and `metadata.bumpProduct` = `astro_force` |
| When she paid | `body.data.object.created` — epoch seconds |

So node 3 exists only if the send fork below needs our order UUID. Decide it there, not here.

---

## ⛔ The one decision this plan deliberately leaves open

**Who talks to AWeber — n8n, or our own server?** Parked by the operator (2026-09-07):
write the plan first. It is parked, not forgotten, and **phase 5 cannot run until it is made.**

| | n8n → AWeber directly *(07's shape)* | n8n → our API |
|---|---|---|
| Nodes 6+7 | in n8n | replaced by one call |
| What we must build | a small `POST /api/be/02/delivered` for node 8 | one endpoint that does the whole send |
| ⭐ The fact that decides it | `markBackendReadingDelivered()` **already exists, is tested, and has no caller** (`server/lib/aweber.ts`). It already handles the two landmines in phase 4 | — |
| Cost of the other door | the `custom_fields` landmine gets a second implementation, in a system with no test suite | one more endpoint on our server |

⭐ **The phase-4 PASS gate is the same either way.** Only who makes the call changes, so the
testing below is not blocked by this — the writing of the workflow is.

---

## The phases

| Phase | Nodes | Proves | Needs |
|---|---|---|---|
| **1 · The trigger** | 1 → 2 | only a paid 02 order starts it | a copied webhook body — nothing else |
| **2 · The link** | 5 | a URL exists, opens, and is the right document | Supabase creds + the file uploaded once |
| **3 · The wait** | 4 | it fires 24h later, **once**, and survives a restart | nothing |
| **4 · The send** | 6 → 7 | it reaches an inbox as Evelyn and wipes nothing | list `6972552` + the campaign |
| **5 · A real order** | 1 → 8 | Stripe starts it and it finishes | the flag + the parked decision |

**Running one in isolation** is n8n's pinned data, same as 07: pin the node *before* the phase,
then "Execute from here".

- **Phase 1** needs no pin — paste a real `checkout.session.completed` body into the webhook.
- **Phase 2** pins node **4** with any item. The signing call reads nothing from upstream.
- **Phase 3** pins node **2**'s output, and ⚠ shortens the wait.
- **Phase 4** pins node **5** with a signed URL you already know resolves.

⛔ **Unpin everything before phase 5.** A forgotten pin makes a live order silently deliver a
fixture, and it looks like a clean run. (07's warning, and it costs the same here.)

---

## Phase 1 · The trigger

Node 2 exact-matches three strings, `AND`:

| Field | Value |
|---|---|
| `body.type` | `checkout.session.completed` |
| `body.data.object.metadata.product` | ⛔ **`be_twin_flame`** |
| `body.data.object.payment_status` | `paid` |

⛔ **`be_twin_flame` is the Stripe product key, not the offer key.** `twin-flame` also exists
(`BackendOfferKey`, and `metadata.offer` carries it). They are different strings and matching the
wrong one matches nothing. Both are in `shared/backendOffers.ts`.

### ⭐ The bump is not a second order

Astro Force ($12.77) is a **line item on the same checkout session** — `metadata.bump: '1'` plus
`metadata.bumpProduct: astro_force`. One webhook, one buyer, one send.

⛔ **Do not build a bump branch into this workflow.** `02-C4` delivers Astro Force **on the
thank-you page, immediately, before the reading** — the bump copy promised *"I can start it
tonight"*. It never travels through fulfilment.
*(Blocked elsewhere: that link is still `[Open it here.](#)` in `02-T1` and no Astro Force PDF has
been built. Not this workflow's problem; it is somebody's.)*

### PASS gate
- [ ] A real 02 body passes all three conditions
- [ ] A 03 (`be_judgement_day`) and a 07 (`be_marcus_daily`) body take the ignore branch
- [ ] A session with `payment_status` other than `paid` takes the ignore branch
- [ ] A **bump** order takes the same single path as a plain one — one run, not two
- [ ] The two BE upsells (Protection Ritual, Bracelet) do **not** match — they are their own
      products with their own keys and must never start a reading delivery

---

## Phase 2 · The link

**D8 answered 2026-09-07: hosted and linked, signed by Supabase — 07's shape.** Not an
attachment. 3.7MB on every send hurts inbox placement and can never be recalled.

⭐ **Per order, 02 uploads nothing.** One file for everybody, so it is stored **once** — by hand
or by a one-line script — and each order does a single sign call. 07's node 11 (render) and node
12 (upload) have no equivalent here. This is the largest structural difference between the two
workflows and the reason 02's phase 2 is one node.

- **Decide the stored path and write it down.** e.g. `analysis_pdf/02/02-product.pdf`, matching
  07's `analysis_pdf/07/<order>/<file>.pdf`.
- ⚠ **Supabase returns `signedURL` as a RELATIVE path.** Prefix `SUPABASE_URL/storage/v1` or the
  AWeber field carries a link that goes nowhere. Same trap as 07, and the most likely failure in
  this phase.
- ⚠ **Sign AFTER the wait, never before.** Signing at purchase burns 24 hours of the life of the
  link before she has been given it.

### 🔴 The expiry is a copy problem, not a settings problem

07 signs for 7 days. **02's own copy sells this document as a keepsake:**

> *"Keep it somewhere you'll find it again; women come back to these months later, around the
> time something in them starts happening."* — `02-T4`

A 7-day link makes that sentence false, and the support ticket arrives months later when nobody
remembers why. ⚠ And the thing signing normally protects — one buyer's private reading — **does
not exist here.** Every buyer gets a byte-identical file, so there is nothing behind the lock.

**Decide one of two, and put the number in the support answer for "my link is dead":**
a very long TTL (a year or more), or a plain unguessable public URL and no signing at all.

### PASS gate
- [ ] The URL opens in a private window, and on a phone
- [ ] It is the **current** build — 31 pages, the zodiac-spread cover, the four B7 defects fixed
- [ ] The link is **absolute** by the time it reaches the AWeber field
- [ ] It still opens after the TTL decision is applied, tested at the boundary and not assumed
- [ ] ⚠ Look at the filename she downloads. `02-product.pdf` reads as something from a build
      directory, and it is the name that sits in her downloads folder for years

---

## Phase 3 · The wait

**The full 24 hours stays** (operator, 2026-09-07). It is promised three times in copy she has
already read: *"within 24 hours"* and *"by this time tomorrow"* (`02-T1`), and *"I finished a
little after three"* (`02-T4`). The pre-built PDF makes an instant send possible; the copy makes
it a lie.

- ⚠ **Count from the session, not from the run.** `data.object.created` → ISO → `+24h`. A webhook
  replayed six hours late must still deliver at the original +24, not at +30.

### 🔴 Nothing dedupes a retried webhook

Stripe retries `checkout.session.completed`. Two deliveries = **two parked executions = two sends
a day later**, and the buyer sees two identical emails from a woman who was supposedly sitting up
with her cards. Our own server code is idempotent by construction for exactly this reason; this
workflow would not be.

⚠ The cheap fix is a guard before the wait — skip if she already carries `be-02-delivered`, or if
`be_orders.delivered_at` is set. **Test it by replaying the same body twice, deliberately.**
*(07 has the same hole and it is untested there too.)*

### ⚠ A parked execution is a day of exposure

Confirm what survives, on this instance, by doing it:

- [ ] an n8n restart
- [ ] an edit and save of the workflow while an execution is parked
- [ ] a re-import of the workflow
- [ ] deactivating and reactivating it

**A lost parked execution is a woman who paid and hears nothing, and nothing looks for her.**
⭐ Before this goes live, the "paid but never delivered" query has to exist and be run:
`be_orders` where `delivered_at is null` and `created_at < now() - 26 hours`. One line, and it is
the only net under a 24-hour wait.

### PASS gate
- [ ] Fires at paid time + 24h, not at run time + 24h
- [ ] A replayed webhook produces **one** send, not two
- [ ] A parked execution survives the four events above
- [ ] The shortened test wait is **put back** (07's rule, and it is easy to forget)
- [ ] The orphan query exists and returns zero on a clean day

---

## Phase 4 · The send

Node 6 finds her, node 7 PATCHes. **The PATCH is the send** — `be-02-delivered` is what triggers
the delivery campaign. Nothing here "sends an email".

### 🔴 `custom_fields` is a whole-state write

AWeber reads a `custom_fields` object on write as the subscriber's **entire** custom-field state.
Send `{ reading_url }` on its own and `stripe_order_id` and `offer` are **cleared**. This is not
theoretical — it is written into `server/lib/aweber.ts` because a soulmate buyer lost hers 11
seconds after paying.

⛔ Node 7 re-sends all three, or spreads what node 6 returned. `stripe_order_id` is the `cs_…` on
the webhook, so it costs nothing to send correctly.

### 🔴 What if she is not on the list?

Our server writes her at payment. If that write failed, the reason is on
`be_orders.customer_list_error` and **she is not there** — node 6 returns no entries and node 7
dies on `entries[0]`.

⛔ **Never create her here.** She is meant to be a subscriber already, and creating her again can
reset her fields. Decide what happens instead — hold the order and alert — and make it a visible
failure, not a red execution nobody opens. *(07 has this hole too.)*

### ⚠ Two things to read with your own eyes on a test send

- **The from-name and reply-to on list `6972552`.** 02 *is* Evelyn, so this is not 07's problem —
  but the list is new, and `02-T4` asks her to reply if the file will not open. A reply-to nobody
  reads is worse than no offer to reply.
- **A buyer with no first name.** `metadata.firstName` is absent whenever the letter link carried
  no `?fn=`. The subject is `%FIRSTNAME% — your twelve are laid`. Send one test with no name and
  **read the subject line** — it is the first thing she sees, and a subject that opens on a dash
  is the whole promise broken. ⚠ Do not be fooled by a name that appears anyway: our server falls
  back to Stripe's cardholder name, so the AWeber record may hold *"Sarah J Mitchell"* and the
  subject reads as a form letter rather than as Evelyn.

⛔ Test on a subscriber you control, never on a real buyer.

### Blocked elsewhere — one line each, not this plan's job
- The thank-you Campaign and the delivery Campaign do not exist in AWeber (`C1`/`C2` written, not uploaded)
- The tags `be-02-twin-flame` and `be-02-delivered` do not exist yet
- ⚠ Both AWeber tokens were **401 expired** on 2026-08-10
- The delivery subject must match `02-T1` and `02-T3` **character for character** — she was told twice what to watch for

### PASS gate
- [ ] The test subscriber gets the email, from Evelyn, with a working link
- [ ] `stripe_order_id` and `offer` are **still on her record** after the PATCH
- [ ] The delivered tag is applied once and the campaign fires once
- [ ] A no-first-name send has a subject line you would be happy to see in your own inbox
- [ ] A missing subscriber holds the order loudly instead of crashing quietly

---

## Phase 5 · A real order

- [ ] The parked send decision is made, and the workflow matches it
- [ ] `VITE_BACKEND_CHECKOUT_LIVE=true` at build time — the flag behind `BACKEND_CHECKOUT_LIVE`
      (`client/src/lib/backendCheckout.ts`). Deliberately last
- [ ] **Every pin removed**
- [ ] One real $35 payment, end to end, with the wait shortened — **then put the wait back**
- [ ] One real payment **with the bump**, and confirm she gets exactly **one** reading email
- [ ] `be_orders` carries `reading_url` and `delivered_at` afterwards (or knowingly does not, if
      the fork went the no-write-back way — that is a choice, not an outcome)
- [ ] The orphan query run the next morning, and it is empty

---

## ⚠ Which n8n instance

Same warning as 07's README. The live fulfilment for 02–06 is said to run in **Mike's** n8n,
triggered by Stripe and filtered on `metadata.product`. The instance our tooling is connected to
shows zero workflows. **Confirm whose instance this is before importing** — importing into an
empty or personal instance puts the workflow somewhere Stripe never reaches, and it will look
installed.
