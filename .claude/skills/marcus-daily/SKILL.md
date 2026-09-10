---
name: marcus-daily
description: "Run one Marcus Stone daily tarot letter end to end — take a named thing she worries about, match it to a spread from the library, cut which cards turn free, write the letter to SHAPE.md, put it through a voice pass and a cold read by people who were never told what it means, generate the hero photograph and the face-down strip, build the broadsheet HTML, and stop at a human review packet. Use when the user says: write the next Marcus daily, run a Marcus letter on X, draft the 08 daily for a named topic, build Marcus's morning letter. One named thing = one run. This RUNS the already-built 08 programme — it does NOT send: AWeber is deliberately not wired, because the booking page, price and delivery are undecided."
---

# Marcus daily — run one morning

Operator front-door for the **08 Marcus daily** letter. The engine already exists: the written
standards in `improve-v1/v1-one-time-BEs/docs/08-marcus/` plus the Python builder and image
generator in that folder's sibling `scripts/`. This skill orchestrates the human-in-the-loop run —
**match → cut → write → voice → cold read → art → build → (human review)** — and reimplements nothing.

⛔ **It stops at the review packet.** There is no send stage and that is on purpose: the booking
page is unbuilt and price, delivery format and SLA are all undecided (`paid-reading/SCOPE.md` §6), so no
letter may promise timing and nothing can honestly go out.

**Knowledge base (read, never rewrite):** `improve-v1/v1-one-time-BEs/docs/08-marcus/`
- `daily-email/SHAPE.md` — the reading structure, card-block guidance, voice preferences, and review questions. **The sole
  craft authority.** One page on purpose: a 571-line voice profile lost a blind test to writers who
  had only the raw sources.
- `daily-email/SPREADS.md` — the spread library. Per spread: name, count, kind (traditional / folk / in-house),
  provenance, positions in true order, which are free-able, and its hero layout paragraph.
- `daily-email/QUESTIONS.md` — a well of candidate named things. A well, not a schedule; you may always name
  something that isn't in it.
- `paid-reading/SCOPE.md` — the product and the plumbing. Its §1 position rule sets the free/paid break.
- `daily-email/letters-02/*.md` — the drafts, and the four existing letters, which are the **only** voice
  evidence that exists. ⚠ `test-01/` — the blind test and its winning control letters — is lost from
  disk and from git. Try OneDrive version history before treating it as gone for good.
- `reference/pictorial-key-to-the-tarot-waite-1911.txt` — Waite's own book. Use it for what is
  painted on a card and what he says it means. ⚠ Never for the register; his prose is archaic.

**Pipeline scripts** (`improve-v1/v1-one-time-BEs/scripts/`):
`build-08-daily.py` (python3) · `make-08-heroes.py` (python3, calls `codex exec`) ·
`host-be-asset.cjs` (node, S3).
⚠ There is no copy linter and the gate is not a script. ⛔ **A script checks bars; bars cannot ask
whether a sentence means anything.** Step 4 is the gate.

---

## ⛔ Before the first run — four things do not exist yet

| # | What | Why it blocks |
|---|---|---|
| 1 | `daily-email/SPREADS.md` and the rewritten `daily-email/SHAPE.md` | Steps 1 and 2 read them |
| 2 | `build-08-daily.py` generalised past six cards | `WORD`/`ROMAN`/`ORD` stop at 6; the dateline says `SIX CARDS · ONE QUESTION`; the hero caption says "six cards on one question". Five hardcodings |
| 3 | `make-08-heroes.py` given a `LAYOUTS` dict | Its prompt hardcodes *"SIX tarot cards… TWO NEAT ROWS OF THREE"*. One layout block per spread, written once, reused every morning that spread runs |
| 4 | ~~`check-08-letter.mjs`~~ | ⚠ **Not a blocker, and not the quality gate.** A script checks bars; bars cannot ask whether a sentence means anything. Step 4 is the gate. Write the linter later if you want the countable bars automated |

⚠ Also worth doing before volume: the builder's per-letter facts live in a Python `LETTERS` dict,
so every morning is a code edit. Moving them into the markdown's own frontmatter removes the build
step's only fragile move.

⚠ `docs/08-marcus/` is **untracked**. Nothing in it has ever been committed. Fix that first or a
bad rebuild has no floor.

---

## Inputs
- **The named thing**, in her words — *"he's gone quiet"*, *"am I asking for too much"*. Ask if not
  given; offer `daily-email/QUESTIONS.md` as a well.
- Optional: a spread, if you want to force one. Otherwise step 1 picks it.
- Slug = the named thing, kebab-cased. Draft lands at `docs/08-marcus/daily-email/letters-02/<slug>.md`.

---

## Steps

### 1. Match and cut → **SLATE GATE**
Read `daily-email/SPREADS.md`. Pick the spread whose positions actually answer the named thing — not the one
with a nice count. Then cut it:

- **How many turn free** ≈ a third: 3→1, 5→2, 7→2, 10→3, 12→4.
- **Which positions turn** is set by the honesty rule, not by the template: a position is free if
  Marcus can answer it truthfully for *any* woman with that topic on her mind; it stays face down if
  answering it needs to know her. `daily-email/SPREADS.md` marks each position `free-able` or `needs her`; the
  turned cards come from the free-able set. ⛔ Never turn a position you cannot honestly fill — that
  is the letter lying, and it is the one failure the reader can feel.
- **Choose the card for each turned position**, against Waite. Then, for each, **choose the
  load-bearing detail** — the odd, peripheral fact about the drawing that the reading will hang on.
  *"her feet aren't tied."* *"one foot is in the water."* ⭐ Pick this before anything is written:
  the transfer, the turn and the P.S. all depend on it, and a writer left to find it will reach for
  the obvious central image and the letter will have nothing a card-meanings site doesn't.

Present the **slate** and STOP for a yes:

```
named thing   he's gone quiet
spread        The Horseshoe · 7 · folk
turned        2 of 7   positions 1, 4
  pos 1  what the quiet actually is      Four of Cups   → the hand he isn't looking at
  pos 4  what it costs you while it lasts Eight of Swords → her feet aren't tied
face down     positions 2, 3, 5, 6, 7
  what it is not · what he's protecting · what you've been doing inside it ·
  what ends it · where it lands
```

### 2. Write (one subagent)
Spawn **one** writer. ⚠ Not several: the house is split on this and 08's own evidence favours one
voice — the reframe deck's `daily-email/STATE.md` records four of seven parallel drafts converging on the
previous send. Give it the slate as a locked brief plus:

> Read `docs/08-marcus/daily-email/SHAPE.md` and the two closest letters in `docs/08-marcus/daily-email/letters-02/`. Then
> write ONE letter to the beat map and save it to `docs/08-marcus/daily-email/letters-02/<slug>.md`. SHAPE.md is
> the sole craft authority — do not invoke `direct-response-copy` or any generic copy skill; they
> conflict with it. Compose in this order: the picture of each turned card, then its load-bearing
> detail (given to you — do not substitute your own), then the transfer, then everything else.
> Plan one clear free discovery and the next question the remaining reading answers. Open with
> her concern and move directly into the first card, without a second introduction or mandatory
> spread explanation. Follow SHAPE.md's current opening guidance. Each card must advance the discovery.
> Card headings use the **real position number in the spread**, not a re-count. Use
> `300 + 120 × <cards turned>` as a length estimate, not a quota. Follow the current SHAPE.md close, including its plain-language
> example, even when an older letter uses a different close. Continue THIS question's emotional
> thread into the invitation. Weave the personal-card purpose into her specific situation instead
> of listing features or form instructions. Use a relevant CTA. If the close fits another topic
> with a few nouns changed, rewrite it. Render it as normal letter text, without NOTICE TO READERS;
> use close_style="letter" in the builder for this treatment.
> Write the connection to this topic fresh. Clarity takes priority over compression and voice
> counts; retain explanatory sentences and conditional wording where appropriate. End the body
> on the link, followed only by Marcus and the P.S.

### 3. Voice pass
One editor checks the draft against SHAPE.md's voice preferences and review questions. Preserve
clear explanations; vary the emotional movement when appropriate. Check comprehension and desire
separately: what has she learned, and what specific answer does she now want? Do not edit to quotas.

### 4. **COLD READ — this is the gate**
Invoke the **`cold-read`** skill on the letter.

⛔ **Run it AFTER the voice pass, on the edited text.** A sentence rewritten in the edit has been
read by exactly one person — whoever rewrote it. That is how *"Read through the wrong lens, what
settles it settles it for a stranger"* reached a finished letter: written during a voice pass, by
the person doing the voice pass.

⛔ **Nobody who has seen the slate, `daily-email/SHAPE.md` or a sibling letter may be a reader.** They already
know what the line was meant to mean, so they cannot discover that it does not say it.

Any sentence coming back **BROKEN** or **AMBIGUOUS** goes back to step 3. Gate: every sentence
CLEAR.

### 5. Art
```
python3 improve-v1/v1-one-time-BEs/scripts/make-08-heroes.py <slug>
```
⭐ **Art comes after the copy is frozen, never before.** The letter describes what is painted on each
turned card; if the picture shows a different card the letter is wrong about the one thing it cannot
be wrong about. Check the generated image against the written letter, never against a doc.

- The hero uses the spread's own layout block from `daily-email/SPREADS.md` — a cross laid as a cross, an arc as
  an arc — with the turned positions face up and the rest face down.
- ⚠ **Check the card backs on every roll**: pale blue-grey roses on a fine trellis, no red. Tile
  grids and ornate red-and-blue are generation noise. **Re-roll the image; do not edit the prompt.**
- Then the face-down strip, one asset per **count** (`08-backs-<n>.jpg`), never per letter. If that
  count has no asset yet, copy the nearest `assets/.08-prompts/backs-*.txt`, change only the count
  words, and generate.
- Convert and upload both:
  ```
  sips -Z 1200 -s format jpeg -s formatOptions 82 assets/08-<name>.png --out /tmp/08-<name>.jpg
  node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file /tmp/08-<name>.jpg marcus/08/08-<name>.jpg
  ```
  ⛔ Heroes are `.jpg`. The `.png` key on S3 returns 403 and the reader gets alt text where the
  spread should be. Confirm the `GET 200` line before moving on.

### 6. Build
```
python3 improve-v1/v1-one-time-BEs/scripts/build-08-daily.py
```
⛔ **Never edit the built HTML.** Four fixes were once hand-patched into `html/` and each was
silently destroyed by the next rebuild. Everything durable goes in the generator.
The build asserts its own anchors and fails loudly if a copy change moved one — that is the feature.

### 7. **REVIEW GATE** — present and STOP
Give the operator:
- the built `docs/08-marcus/daily-email/html/<slug>.html`, opened,
- the slate table from step 1,
- the `daily-email/STATE.md` line you are about to write,
- and anything you could not verify.

⛔ **Do not log STATE or commit without an explicit in-turn "go".**

### 8. Log
On "go": append the row to `docs/08-marcus/daily-email/STATE.md` — `date · named thing · spread · count · turned
positions · cards · load-bearing details · slug · hero key`. Then commit the markdown, the spec docs
and `daily-email/STATE.md`. ⛔ Never commit `html/` by hand-edit; commit it only as the builder wrote it.

---

## Rules
- **Nothing here sends.** There is no AWeber stage. If the operator asks to schedule one, say the
  booking page, price, delivery format and SLA are undecided, and that no letter may promise timing.
- **⛔ Never edit `docs/08-marcus/daily-email/html/`.** Edit the markdown, run the builder.
- **Avoid repeating the face-down inventory.** Let the transition name the next question and the
  close explain the remaining reading's scope. Preserve parser anchors or update the letter's
  configuration and rendering when the new structure needs it; never force unclear prose to fit
  an old template.
- **Her personal card guides the interpretation on every spread.** It is not an extra position,
  never "in the middle", never "read around it". Explain that her name identifies a personal tarot
  card, whose interpretation of her strengths and familiar patterns helps Marcus interpret the
  remaining cards on this topic. Say what that adds for the reader; "lens" is internal shorthand,
  not a reader-facing explanation. Do not use "your name gives me your lens", "read through it",
  or comparisons with a stranger's reading to explain the offer. No calculation lesson is needed.
  Describe only what the paid reading actually does; do not invent personal facts from a name.
  Follow SHAPE.md's current close rather than copying the old numbered close from sibling letters.
- **⛔ No plural reader, ever.** "for a list", "everyone", "for one woman… for another" all break the
  spell the same way.
- **⛔ The square headshot** (`08-headshot.jpg`). The round one is masked onto white and would ship
  four white corners onto newsprint. The signature is flattened onto `#f4f1e6` and breaks if the
  page ground changes.
- **The reading has to stand alone.** Delete every mention of the booking page: does she still have a
  reading this morning? If all she has is that Marcus is worried about her, it fails. ⚠ With the
  closing act cut, the reading alone now has to carry this test.
- This is the **run** skill for the 08 daily. Evelyn's deck → `evelyn-reframe`. Luna's batch →
  `luna-daily`. A new persona's whole programme → `persona-email-kit`.

## Validate without building
Run steps 1–4 for one letter and stop before the art. The cheapest useful run is **step 4 on its
own**: point `cold-read` at a letter that is already written and see what comes back.
