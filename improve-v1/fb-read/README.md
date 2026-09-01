# /fb-read — the device-agnostic quiz bridge

A third quiz-bridge funnel alongside `/fb-palm` and `/fb-tarot`. The job it was
built for: **fresh creative for the same women** — same audience, same question,
a new picture to stop the scroll.

Built 2026-08-30/31. Nothing here is deployed or committed to `Production`.

---

## What makes it different from palm and tarot

Those two are the same page twice. Each keeps its device roster hand-copied into
the client registry, a server vocab map, and one or two route validators — and
both funnels' own docs name the resulting drift as their number one failure: the
lander renders perfectly while the chat handoff 400s ("the v1-palm 400 bug").

`/fb-read` has no such lists. `shared/readDevices.ts` is imported by both sides,
so the route validator **is** the roster and the model's vocab **is** the
lander's `mark`/`reading`. They cannot disagree. Adding a device is one config
entry plus its art — there is nothing to keep in sync.

**One bridge, many devices.** `ReadBridge.tsx` renders every instrument from the
registry. `candle` is finished as art and copy-ready; it is one entry away.

---

## 🔴 SCOPE CHANGED 2026-08-31 — tea only

The operator has stopped work on `dream`. **All new hooks are built on `tea` alone.**

`dream` is FROZEN, not deleted: its three hooks are written, tested and passing, it
stays registered, and it still serves. Nothing further gets built on it. Retiring it
from the registry is a one-line change if that is wanted; nobody has asked for it.

### What this changes about the test

The build was originally a DEVICE test — same hook on every device, so the picture
was the only variable, which is why the headline is hook-level and identical across
devices. On one device that framing no longer applies. **The variable is now the
HOOK**, so different landers carry different headlines by design, and the thing being
compared is which question earns most per 1,000 conversations.

The headline stays hook-level in the code regardless — that is what stops a device
ever quietly changing the question — but it is no longer the thing holding the test
together.

---

## The registry

```bash
npx tsx scripts/read-registry.mjs      # -> fb-read/docs/lander-registry.md
```

Generated from `shared/readDevices.ts`, `shared/readCopy.ts`, the approved drafts and
the art on disk. Shows every hook × device × panel, whether it is written and
servable, its mechanism, its frame, the guard in full, the VOC provenance, and the
live URLs. Hand-kept status boards drift the first time someone ships without
updating them and then lie confidently, so this one is generated and never edited.

---

## The test this was built to run

| | |
|---|---|
| Hooks | 3 of 6 built. `love-again` — "Will I love again?" · `still-think` — "Does he still think about me?" · `hiding-something` — "Is he hiding something from me?" |
| Devices | `dream`, `tea` (and `candle`, unwired) |
| Held constant | the hook, the method, the version, the art style |
| The only variable | **the picture** |

The headline is hook-level, never device-level. Swap the device and the headline
must not move — that is what makes a winner readable. Run different questions per
device and you cannot tell whether the picture won or the question did.

**Method:** the Natural Tarot-Cut (`fb-tarot/docs/natural-tarot-cut.md`), forced
by the code rather than chosen: `openerCStart` calls `readsFor`, not
`readsForMethod`, so Version C cannot run the Inherited Shadow.

**Frame:** self-frame. `love-again` is heartbreak, not bereavement — the hopeful
yes is allowed, and only the specifics are withheld (name, date, exactly who,
where).

---

## The Version C fix this funnel has and the other two do not

On Version C exactly two written lines reach her before she types: the opening
bubble (the picture) and the open question. `buildPalmReflectPrompt` and
`buildTarotReflectPrompt` pass **neither** — they hand the model only the short
`mark` string. So the model is told to connect her answer to the picture while
blind to the sentence two bubbles above it, and it re-describes what she has just
read.

`buildReadReflectPrompt` passes both, under an `## ALREADY SAID` heading, with
the first rule being *do not describe the picture again*. Both lines are derived
server-side from validated enums — never sent up by the client, because her own
answer is already untrusted text entering a prompt and a second client-supplied
field would add an injection surface for no gain.

`/fb-palm` and `/fb-tarot` were deliberately left alone (operator call).

---

## Contents

```
images/
  panels/            the 9 photographs, 1254×1254 each
  strips/            composed 1080×360 strips, one per device
  placeholders-svg/  the 9 engraved vectors the photography replaced
prompts/             the 9 image-generation prompts, with negatives and
                     per-panel failure modes
drafts/              the approved readings as reviewed JSON — the source of
                     truth for shared/readCopy.ts
evals/               the live-LLM Version C eval (see below)
```

**The art is generated placeholder-grade, not final.** It exists so the funnel is
testable end to end. The prompts in `prompts/` are what a designer or a rerun
works from.

### Known art/copy mismatches on `candle` (unwired, fix before shipping it)

- The flame leans **right**; the drafted opening bubble says *"pulls left"*.
- The smoke is **pale grey**; the drafted line says *"dark smoke"*. The prompt
  lights the smoke deliberately — dark smoke on a near-black ground is invisible
  at 120px. The picture should win; change the copy.

---

## Reading the walks — what a new build hands you

The eval scores the copy against a rubric. It cannot tell you whether the reading is
any *good*, and that judgement needs a human reading whole conversations rather than
grepping transcripts. So every walk builds one page:

```bash
# 1. the sandbox server — 🔒 never the ordinary dev server, see the walk warning below
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts

# 2. walk every persona (~40 min, live model calls)
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs          # tea
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs candle   # any device

# 3. read it
open audit-runs/fb-read-walk/index.html
```

Pick a persona on the left, read her whole conversation on the right — ad lander to
the close, both sides, with the line that turns the reading into a $35 sale ringed.
One persona alone is `scripts/walk-read-funnel.mjs <persona> <symbol> [device]`.

**The page rebuilds itself.** `walk-read-funnel.mjs` calls `build-walk-page.mjs` at
the end of every walk, the same way `build-read-copy.mjs` calls `read-registry.mjs`,
and for the same reason: a page you have to remember to rebuild is a page that is
quietly one run out of date, and reading last week's copy believing it is today's is
worse than having no page.

**Nothing to update when the build changes.** Hooks, ad questions, frames and symbol
names are read from `shared/readDevices.ts`; the personas from `evals/personas.mjs`.
Add a hook, a device or a persona and it appears on the page. The one hand-kept thing
is `OPEN_THREADS` in the builder — cases where the funnel serves a woman something it
should not, which no registry knows. A persona whose `note` opens with 🔴 is flagged
automatically, so that is the cheaper way to mark a new one.

**Read the first turns, discount the rest.** Only turn 1 is the persona. The eight
after it are deliberately plain filler, because the walk tests whether the funnel
REACHES the pitch, not her prose. Judge Evelyn's opening replies hard and the later
ones lightly.

**`7/7 reached the close` is the plumbing, not the verdict.** It is exactly the number
that hides a bad reading, which is why the two boundary cases are flagged in red on
the page rather than left to be noticed.

---

## Running the eval

Version C is the only part of this funnel whose words are not written in advance,
so it is the only part that cannot be reviewed by reading a file.

```bash
npm run dev                                        # needs a live ANTHROPIC_API_KEY
npx tsx improve-v1/fb-read/evals/run-eval.mjs
```

Both halves of what she reads are graded, not just the generated one:

| | What it covers | Checks |
|---|---|---|
| **WRITTEN** | the opening bubble + the open question — her entire first impression on Version C | all the bans below, plus word/sentence limits, no bare-pronoun opening, and **art coherence** |
| **GENERATED** | the model's reply to what she typed | all the bans, plus not restating the opening, plus 25 words per message |

Bans: inventing a man, promising his return, speaking for him, a timeframe, a
place, exclamation marks, emoji, offers or urgency, asking her name. Exits
non-zero on any failure.

**Art coherence** is the one worth understanding. `mark` is what the server
injects into the prompt; the opening bubble is what she READS while looking at the
panel. Edit one without the other and the reading names something that is not in
the picture — the exact failure the art brief exists to prevent, and one no type
checker can see. The check requires the opening bubble to carry the mark's content
words. Proven to bite: swapping tea·b's mark to *"a ladder against a wall in the
moonlight"* fails with `mark words absent: ladder, against, wall, moonlight`.

`--dry` runs the WRITTEN half only and makes no model calls, so copy edits can be
checked for free. The generated half still needs a live run before shipping.

**Last run: 18/18 clean, both halves** (3 hooks × 2 devices × 3 panels).

### 🔴 The eval has been loosened three times. Read this before loosening it again.

Every time, it flagged a move the approved copy makes deliberately:

| It flagged | Why that was wrong |
|---|---|
| any `he/him/his` as "invents a man" | she wrote *"he said he still loved me"*; reflecting her words back is the prompt's first rule |
| *"you're not asking if he loves you"* | naming her SMALLER ask — cut 6 does this by design |
| a man on `still-think` | that hook's **headline** names him, so he is presupposed, not invented |
| *"whether you cross his mind at all"* | quotes her question; states nothing either way |

The fix each time was the same principle, and it is the one to keep: **check the
assertion, not the vocabulary.** A claim only counts when it is not sitting behind
a negation or an interrogative.

That is also how a guard rots into decoration, so the loosening is provable rather
than trusted:

```bash
npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest    # no model calls
```

Ten cases: six phrasings the guard MUST still catch (including every softened form
the live tarot guard names), and four the copy depends on it letting through.
**10/10.** Run it after any change to the checks.

🔴 **One eval lesson worth keeping.** The first version flagged any `he/him/his`
as "invents a man" and reported two false failures. Self-frame bans *inventing* a
man, not echoing one the woman herself just described — and the prompt's first
rule is to reflect her words back. When she writes *"he said he still loved me"*,
answering *"he said he loved you… and left anyway"* is the reading working
correctly. The check now only fires when **she** never mentioned a man, and tests
the real harms separately.

---

## Still missing before this ships

- **No vitest guard file.** Every other funnel family has `tests/<family>-copy.test.ts`
  plus tripwire rows; `/fb-read` has the eval and its self-test, but nothing in the
  normal test run bites on this copy. Flagged by the agent that wrote the dream
  readings, and it is right.
- **Three hooks still to build, on `tea` only**: feelings/commitment (its own guard,
  closest to `hiding-something`), soulmate/destiny (self-frame, already exists), and
  loneliness/timing (needs its own frame — nothing fated, no forever ruled on in
  either direction).

### 🔴 Every hook needs its OWN guard. Do not reuse one because the shape matches.

`still-think` and `hiding-something` are both decode-him in shape, and their guards
share almost nothing:

| | `still-think` | `hiding-something` |
|---|---|---|
| The unknowable thing | what he thinks | what sits behind the gap |
| Banned in both directions | that he thinks of her / that he does not | that he IS hiding / that he is not |
| Its own specific harm | softened forms — "part of him still" | naming the contents; handing her a tactic |
| Where it lands | what happened is not stored in his memory alone | meeting an edge is not the same as imagining one |

Both were inherited verbatim from the live tarot hooks of the same questions rather
than written fresh. That is the cheapest and safest source: those guards have been
through review on a funnel where the question already runs.

---

## Regenerating the copy

Readings are written and reviewed as JSON in `fb-read/docs/drafts/`, then compiled:

```bash
node scripts/build-read-copy.mjs      # drafts -> shared/readCopy.ts
```

The build **refuses** to emit anything carrying the `__UNWRITTEN__` sentinel, over
25 words, over 2 sentences, or containing an exclamation mark. `isReadWritten()`
gates both the bridge and the API, so a URL handed out early cannot serve
half-written copy.

### Two copy failures caught in review, worth watching for

1. **Cut 6 became a slot.** The first dream draft opened cut 6 by restating her
   question in all three panels. Cut 2 already echoes the ad question; cut 6 is
   the recognition — it describes what she has lived, it does not re-ask.
2. **An invented fact about her life.** *"Your hand goes up to your mouth before
   you've thought about it"* — a waking habit she may not have. Nothing may be
   named that is not in the picture or in what she said. She can catch you, and
   the moment she does the reading is over.

---

## Live URLs

```
https://www.theseerwithin.com/fb-read/c?hook=love-again&device=dream&utm_content=<ad>
https://www.theseerwithin.com/fb-read/c?hook=love-again&device=tea&utm_content=<ad>
```

`/fb-read` = Version A · `/fb-read/b` = B · `/fb-read/c` = C. Pricing is
funnel-level (`35_read`, $35/$25), so every device is priced correctly with no
per-device money-safety roster to sync.
