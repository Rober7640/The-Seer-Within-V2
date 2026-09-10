# 07-C1 — booking page build notes

| | |
|---|---|
| **The page** | [`07-C1-booking-page.html`](./07-C1-booking-page.html) — one self-contained file, opens off disk |
| **Built to** | [`07-C5`](./07-C5-tiers-by-questions-asked.md) §5 *(the spec)* over [`07-C1`](./07-C1-the-booking-page.md) *(the beats)* |
| **Numbers from** | `scripts/07-spreads.json` → `scripts/07-registry.mjs` → `scripts/build-07-booking-data.mjs` |
| **Replaces** | [`07-C1-booking-page-preview.html`](./07-C1-booking-page-preview.html) — right design, dead ladder |
| **Not touched** | `client/` · `server/` · `scripts/build-07-n8n.py` · anything in `daily/` |
| **Not committed** | nothing staged, nothing pushed |

---

## How to review it

Open the file in a browser and add the query string. **`&s=` takes the full registry key.**

```
?c=1&s=the-weight              Mon · The Weight            6 / 9 / 12
?c=2&s=the-two-doors           Tue · The Two Doors         8 / 11 / 14
?c=3&s=the-small-instruction   Wed · The Small Instruction 6 / 9 / 12
?c=1&s=the-undertow            Thu · The Undertow          7 / 10 / 13
?c=2&s=the-ledger              Fri · The Ledger            9 / 12 / 15
?c=3&s=the-other-chair         Sat · The Other Chair       7 / 10 / 13
?c=1&s=the-zodiac-spread       Sun · The Zodiac Spread     12 / 15 / 18
```

Two extra params exist **for review only** and are not part of the link contract:

| | |
|---|---|
| `&d=2026-09-02` | pin the cut date, so a screenshot is reproducible |
| `&recover=1` | beat 17 — the state she comes back to from Stripe's cancel |

Drop `&s=` entirely, or pass a bad one, to see the lost-link page. It lists the seven keys as
links, which is a **review affordance and has to come out before this ships.**

---

## The card counts, which is the one thing that cannot be wrong

The page carries a **generated** copy of the registry in a `<script id="registry">` island. It is
written only by `scripts/build-07-booking-data.mjs`, which reads `07-spreads.json`, resolves every
rung through `07-registry.mjs` `resolve()`, and refuses to write if the island and `tierTable()`
disagree by a single card. It also asserts that free + paid equals the day's own total, that no
rung is null on any day, and that the step between rungs is exactly `open_per_question` on all
seven mornings.

```
node scripts/build-07-booking-data.mjs           # rewrite the island
node scripts/build-07-booking-data.mjs --check    # fail if it is stale, write nothing
```

⛔ **Nothing in the hand-written copy states a card count.** Every number is a `{N_TOTAL}` /
`{N_DOWN_WORD}` / `{N_FREE_WORD}` token filled at render time from the island. Grep the file for a
bare digit next to the word "cards" and you will not find one.

⭐ **Five candidate designs now sit beside this page** — `07-C1-booking-page-v1.html` … `-v5.html`,
one per answer to *what does this page need in order to sell?*, all five with the hero photograph
dropped. [`07-C1-VERSIONS.md`](./07-C1-VERSIONS.md) is the decision doc. `build-07-booking-data.mjs`
writes and checks **every** `07-C1-booking-page*.html` carrying the markers, so all six are guarded
by the one command. ⛔ This file stays the reference until the operator picks a winner.

**`check-07-registry.mjs` runs that guard** — see its §7, which shells out to
`build-07-booking-data.mjs --check`. It also scans the old preview for the literal
string `"11 cards"`, and this page never prints a total as static text — the rung totals appear in
the order receipt, built in JS after she taps. So the guard for this file is
`build-07-booking-data.mjs --check`, and it should go in the same place the registry check runs.
When you are happy with the page, delete the `07-C1-booking-page-preview.html` entry from
`KNOWN_BEHIND` (line 33) and its Tuesday scan (line 245) rather than repointing them here.

---

## The beats — kept, changed, dropped

### Kept as specified

| Beat | Note |
|---|---|
| 1 · masthead | `{DAY} · {SPREAD} · cut {DATE}, before light` |
| 2 · headline | *The other six are still face down* + the lede, both counts from the registry |
| 3 · the strip | photograph, then the face-up cards, then the face-down ones — see the art note below |
| 4 · `?c=` line | all three verbatim; unknown or missing `c` falls back to `c=3` |
| 5 · the question | verbatim, one box, before payment, with the day's own grey example |
| 6 · the five statements | verbatim, before any price |
| 7 · the frame + live router | 07-C5 §5.2 |
| 8 · the three rungs | 07-C5 §5.3 verbatim, none pre-selected, no *most popular*, no crossed-out price |
| 10 · the bump | speed, $12.77, cut-off published, hidden until a rung is picked, never pre-checked |
| 11 · the money line | the sixth agreement, in her voice, after she picks |
| 12 · how it gets made | before payment, on the page, labour split named |
| 13 · the button | gated; the gate line names what is left |
| 14 · under the button | verbatim — one payment, nothing recurring, inside 24 hours |
| 15 · guarantee + guardrail | delivery guaranteed, accuracy not |
| 17 · `?recover=1` | restores **all three** boxes, the rung and the bump |

### Changed, and why

| | |
|---|---|
| ⛔ **Beat 9 deleted** | 07-C5 §5.6. There is no rung that isn't there. Thursday keeps its $57 and Saturday its $87, by construction, and the page has no code path that can hide one |
| ⛔ **Beat 7's printed 3-row routing table deleted** | Its rows named The Pattern and The Table, which are dead labels. 07-C5 §5.2 replaces the whole beat with the frame plus the live router |
| **The router's job** | It no longer argues *your question needs a bigger reading*. It says *you asked me two things*, which she can check by reading her own sentence back |
| **Boxes two and three** | New. They open under the rung row, not under box one. §5.3's copy says "a second box opens under the first" — putting them 400px up the page, above the price she just tapped, moves the thing she is looking at off screen. ⚠ **operator call** |
| **The guardrail's wording** | C1's version says *"Everything in The Table is what the spread says about him."* The Table is gone, so it now reads *"Anything I write about somebody else…"*. Same rule, no dead label |
| **`{FREE_NAMES}`** | C1's Tuesday example is *"You saw door one and door two"* — the position names. The page prints the **card** names instead: *"You saw the Devil and the Eight of Cups this morning."* They are in the registry, they are what she actually looked at in the letter, and the position name is already printed under each card in the strip. ⚠ **operator call** |
| **The order receipt** | New, and it is the one place a rung total is printed: *7 + 6 = 13 cards*. It appears only after she has picked, so the count keeps its receipt job and never gets a comparison job (07-C4 rule 3). It is also what the seven-day audit reads |
| **The fork router line** | 07-C5's line names *whether to stay, and whether to go now*, which is only true when she wrote those words. Typing *"do I keep waiting or do I leave"* would get a line she cannot check, which is the exact failure the router is supposed to avoid. A second line, `forkOr`, handles every other *or*: *"There's an 'or' in there, which is two questions sharing one question mark. Both can be laid."* ⚠ **NEW COPY, needs sign-off** |
| **The fork's one tap** | The router offers *Put the second half in its own box*. Tapping it splits her sentence on the *or*, drops the second half into box two and selects $57. §5.1 asks for the pre-fill; this is it, made explicit rather than automatic |

Beats 14 and 15 are unchanged from `07-C1`: one payment, nothing recurring, the reading reaches
her inside 24 hours at the address she paid from, and the money comes back if it does not. The
guarantee covers delivery and never accuracy.

### Deliberately not built

- **The challenger three-tap shape picker.** Dead — 07-C5 §5.1.
- **Beat 16.** That is the thank-you page, not this one.
- Everything in C1's *"deliberately not on this page"* table: no name/birthday fields, no counter,
  no *no sugarcoating*, no testimonials, no inline sample, no `/marcus` link, no email capture.

---

## The art

⭐ **Every face-down card on the page is a photograph of the deck that was actually cut** — one card
back, cropped out of that day's own `marcus/07-down-<day>.jpg`. No flat graphic, no vector, no CSS
pattern. The retired `marcus/card-back.jpg` is a vector star and is not used.

**A deck has one back**, so every back tile on a day is the *same* crop. The first pass stepped the
crop across the photograph to make the tiles differ, and it looked like six different photographs of
six different things — the exact fault `scripts/make-07-facedown.py`'s own header was written to
correct.

The crop is three numbers per day in `COPY.backCrop`: a `background-size` and an x/y
`background-position`. They were measured off each photograph — the card's centre and its height as
a fraction of the frame — and the CSS was solved so the tile window lands on one card at the tile's
own 350×600 aspect.

⛔ **Re-measure `COPY.backCrop` whenever a `07-down-<day>.jpg` is re-shot.** It is the one thing on
this page that is coupled to a specific photograph. The comment in the file says so.

Face-up cards are the RWS scans at `evelyn/tarot-rws/<slug>.jpg`, keyed off `built_email.face_up` in
the registry. The hero is `marcus/07-spread-<day>.jpg`, the same picture she saw in the letter forty
minutes ago, which is the cheapest continuity device on the page.

Twenty-eight image URLs are used across the seven days — 7 spread photographs, 7 face-down
photographs and 14 RWS card scans — and the browser pass recorded **zero 4xx responses on any day**,
so every one of them resolves. The page works offline apart from the images and the Google font
link.

---

## Open questions for the operator

| # | | |
|---|---|---|
| 1 | 🔴 **The link carries `&s=` but not the draw date** | Already C1's open item and it is still open. The page currently walks back from today to that spread's weekday, which is a **guess** and will show the wrong morning on a forwarded email. `&d=` exists for review only. Either the daily's link carries the date, or the page resolves the newest draw for that spread and says which morning it came from |
| 2 | 🔴 **The open six's edge case is undecided** | 07-C5 §2 — two orders from the same woman on the same morning land the same open three twice. The page sells "three that are only its own", so this has to be settled before it takes money. Nothing on the page changes either way |
| 3 | ⚠ **Where boxes two and three sit** | Under the rung row here; §5.3's copy says under box one. See above |
| 4 | ⚠ **Card names or position names in beat 3's line** | See above |
| 5 | ⚠ **The `forkOr` router line** | New copy |
| 6 | ⚠ **The open six are shown, not just named** | 07-C5 §5.5 says show them and names the risk: a woman who buys one question can count six backs she never got. They are rendered smaller, dashed, unnumbered and unlabelled, under their own sentence. If that reads as withholding rather than as the table's own cards, the fallback is to keep the sentence and drop the row |
| 7 | ⚠ **The sample reading does not exist** | The text link is on the page pointing at `#sample`. `dryrun-tue-spread.md` is the whole thing already written; it needs a fictional asker and somewhere to live |
| 8 | ⚠ **The bump's definition disagrees between two files** | `README.md` still calls the bump an **expansion** (~1,000 → ~3,000 words). C1 open thread 2 and 07-C5 §5.6 both say **speed**, $12.77, and speed is what is built. The README line is stale and should be corrected |
| 9 | ⚠ **The lost-link page lists the seven keys** | Review affordance. Delete before ship |
| 10 | ⚠ **The button is a mockup** | It alerts the payload it would send to Stripe — spread key, rung, bump, her questions, and the card count sold. The refusal of a rung must happen in `priceBackendOffer` before Stripe, never in the browser |
| 11 | ⚠ **`localStorage` carries the recover state** | Enough for a mockup. The real page should round-trip through the Stripe session so a different device still recovers |

---

## The self-audit that was run

`scripts/build-07-booking-data.mjs` asserts the island against `tierTable()` on every run. On top of
that, a Playwright pass opened the page at **all seven** `&s=` values, tapped **all three** rungs on
each, and read the total back out of the order receipt.

| Day | Page says | `tierTable()` | |
|---|---|---|---|
| Mon · The Weight | 6 / 9 / 12 | 6 / 9 / 12 | ✅ |
| Tue · The Two Doors | 8 / 11 / 14 | 8 / 11 / 14 | ✅ |
| Wed · The Small Instruction | 6 / 9 / 12 | 6 / 9 / 12 | ✅ |
| Thu · The Undertow | 7 / 10 / 13 | 7 / 10 / 13 | ✅ |
| Fri · The Ledger | 9 / 12 / 15 | 9 / 12 / 15 | ✅ |
| Sat · The Other Chair | 7 / 10 / 13 | 7 / 10 / 13 | ✅ |
| Sun · The Zodiac Spread | 12 / 15 / 18 | 12 / 15 / 18 | ✅ |

Also checked, and passing:

- Three rungs render on **all seven days**. No day is missing one.
- The strip's face-up count equals `counts.free` and the face-down count equals `counts.paid`, every
  day. The open row is six, every day.
- `?c=1`, `?c=2`, `?c=3` each print their own line; `?c=9` and a missing `c` fall back to `c=3`.
- Missing `&s=`, and `&s=nope`, both render the lost-link page rather than an empty one.
- The router fires correctly on six typed sentences, including the two that must **not** fire:
  *"Do I keep waiting for him"* mentions him and is a $35 question, and it gets the one-question
  line.
- The fork's one tap splits the sentence, fills box two and selects $57.
- The $57 rung opens one extra box, $87 opens two, and going back down to $35 hides them without
  losing what she typed.
- The button appears only when the question, the rung, every required box and all six ticks are
  done, and it carries the right total — the top rung plus the bump, 87 and 12.77 added.
- `?recover=1` restores all three boxes, the rung and the bump, and shows the banner.
- Zero console errors and zero 4xx responses on all seven days, so every image resolves.
- **320px** phone: no sideways scroll on the page body. The card rows scroll inside themselves and
  say *swipe →* in their own label when they do.
- Desktop 1280px, mobile 390px and 320px, light and dark, all read correctly.
- `node scripts/copy-check.cjs copy/07-marcus` — PASS, no findings.
