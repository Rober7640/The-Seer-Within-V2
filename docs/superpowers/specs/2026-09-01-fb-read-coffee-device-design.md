# `/fb-read` — coffee as a second device

Design settled 2026-09-01. Nothing built yet. Branch `soulmate-landers`.

Adds coffee-ground reading (Turkish/Greek/Armenian tasseography) to the `/fb-read`
quiz bridge as a **device** — one registry entry plus its art. No new funnel, no
new route, no new page, no new hook, no new guard.

---

## The calls this design rests on

Four operator decisions, 2026-09-01. Do not relitigate them.

| Question | Call | Consequence |
|---|---|---|
| Is the device axis re-opened? | **Yes — coffee is a real second device** | Coffee is built on the SAME three hooks as tea. 9 readings. Zero new guards |
| Position-picking or shape-picking? | **`pick: 'symbol'`** — one cup, three names, exactly as tea | The mechanic is held constant so the picture is (nearly) the only variable. `pick: 'panel'` is not used |
| Reuse tea's symbols or go coffee-native? | **Coffee-native** | Bird / Tree / Anchor are NOT reused. All 9 readings are written fresh against new archetypes. Accepted cost: a second changed variable (see Risks) |
| Symbol shortlist, handled cup, saucer out of frame | **Approved as proposed** | Locked below |

### Why the device axis was closed, and why re-opening it is sound

The README's `SCOPE CHANGED 2026-08-31 — tea only` note closed the device axis and
made the HOOK the test variable. That was a **scope** call, not a result: nothing in
`/fb-read` has ever been deployed (764a335 is pushed, not merged, not live), so no
device has a single data point and there is no winner to protect. Re-opening the axis
costs one art round and 9 readings, and buys the picture-vs-picture comparison the
funnel was built for and has never run.

`dream` stays frozen. Nothing here changes that.

---

## 1. What gets built

| | |
|---|---|
| Code | `"coffee"` on the `ReadDevice` union + one `COFFEE: DeviceConfig` + one line in `DEVICES` |
| Art | `client/public/read/coffee-cup.jpg` (1254²) and `coffee-reveal-strip.jpg` (1260×420) |
| Copy | 9 readings — 3 hooks × 3 options × 7 cuts — as JSON drafts, compiled to `shared/readCopy.ts` |
| Tooling | one new script (`ring-read-cup.mjs`) and two small fixes — see §7 |
| Docs | `improve-v1/fb-read/images/coffee/SOURCE.md`, `improve-v1/fb-read/prompts/coffee.md` |

### What does NOT get built

- No new hook, so **no new guard**. Guards are hook-level; `love-again`,
  `still-think` and `hiding-something` already carry theirs in `READ_FRAME`.
- No route, server vocab map or validator. The registry **is** the validator —
  that is the whole design of this funnel.
- No change to `DEFAULT_DEVICE` (stays `tea`) or to any headline. `HEADLINES` is
  hook-level and must not move when the device does.
- No change to `/fb-palm` or `/fb-tarot`.

---

## 2. The test

| | |
|---|---|
| Hooks | all three, same as tea — `love-again`, `still-think`, `hiding-something` |
| Held constant | the hook, the headline, the method (Natural Tarot-Cut), the frame, the pick mechanic, the framing of the shot, the 7-cut shape |
| The variable | the picture — **and the three symbol names**, deliberately (see Risks) |
| Pricing | unchanged. Funnel-level `35_read`, $35/$25. No per-device roster exists to get wrong |

The headline stays hook-level in code. Swap the device and the question must not
move, or a winner is unreadable.

---

## 3. The symbols

Assignment is **position-driven and happens after the art exists**, per the method in
`improve-v1/fb-read/art-selection-method.md`: generate cups, find the strongest
separated regions in the winner, then assign names to whichever regions fit their
logic, then write the position words to match the actual photograph.

So this is a shortlist of five. Three survive.

| Symbol | Turkish | Needs from the photo | Reads as | Position that suits it | Archetype |
|---|---|---|---|---|---|
| **Road** | yol | an **elongated** run | a way through, movement | running toward the rim — the weeks ahead | the moving heart |
| **Key** | anahtar | a **compact**, contained gathering | an opening already hers | handle side — hers | the unlocking heart |
| **Bridge** | köprü | a region that **spans** two areas | a crossing, a distance closed | between her side and the far side | the crossing heart |
| **Fish** | balık | a rounded region low on the wall | luck arriving | near the base — what she was built on | the arriving heart |
| **Door** | kapı | an upright break in a mass | an opening about to be used | far side — from outside her | the opening heart |

**Target the final three at one elongated, one compact, one spanning.** Tea's three
regions are all mid-wall blobs, so on that cup the entire meaning has to be carried
by which side. Three differently-shaped regions let shape and position both work.
This is a human judgement at review time; it needs no change to the selector.

That makes **Road / Key / Bridge** the leading trio. **Fish** and **Door** are the
alternates, taken only if the winning photograph does not offer a region of the shape
their sibling needs — a cup with no elongated run cannot carry a road, and forcing one
onto a blob is the stale-ring fault in slower motion.

### Excluded, and why

| Excluded | Reason |
|---|---|
| **Heart, Ring** | Self-selecting. On *"Will I love again?"* everyone taps Heart. `tea-leaf-reading-findings.md` §2 names this exact failure: she picks the symbol she *wants*, the tap stops being instinct, and the three readings never get a fair comparison |
| **Snake, Eye** | Both invent a third party — an enemy, someone watching. `love-again`'s guard already bans implying a man she did not name; an invented adversary is the same fault in a different coat. `hiding-something`'s guard bans naming the contents of the gap, and "an enemy" is exactly that |
| **Bird, Tree** | Tea's. Reusing them defeats the coffee-native call |

### Cut-3 fears

Cut 3 answers a fear, flat, and the three cut-3 lines must answer **three different**
fears or the panels collapse into one sentence said three ways. Tea's `love-again`
triple is: nothing is coming (bird) / the heartbreak destroyed what I had (tree) /
I will never feel settled again (anchor). Coffee's, per shortlist symbol:

| Symbol | The fear cut 3 answers (`love-again`) |
|---|---|
| Road | nothing is moving; I am stuck where this left me |
| Key | the way back is shut to me now |
| Bridge | the distance between me and anyone is too far to cross |
| Fish | nothing good comes to me any more |
| Door | it has already passed me by |

Equivalent triples get written per hook in each draft's `note`.

### Each draft carries its own `note`

The three coffee drafts do **not** inherit tea's notes. A draft's `note` is the copy
brief the writer works to, and tea's is device-specific in ways that are wrong here:
it names bird / tree / anchor and their measured clock positions, it forbids inventing
anything about *how she drinks her tea*, and it states that on that cup meaning is
carried by which side and never by depth — which is a fact about that photograph, not
about tasseography. Coffee's notes carry coffee's positions, coffee's three fears, and
the drain grammar. What transfers unchanged is the hook-level material: the frame, the
guard, the never-a-name / never-a-date / never-a-place rules, and the cut-6-recognises
rule.

---

## 4. The art

### Order of work

1. **Reference photography first**, licence-checked before it informs anything.
   🔒 The `tasseo-*` set in `images/reference/` is CC BY-SA **and is literally from
   a coffee-reading site** — share-alike is viral, so it is study-only. The
   competitor swipe is all-rights-reserved, never. See `REFERENCES.md`.
2. Write `improve-v1/fb-read/prompts/coffee.md` from what the references show.
3. Generate **five per round**, never one. Vary grounds density and distribution.
4. `node scripts/select-tea-cup.mjs <candidates-dir> --debug` rejects mechanically.
   Run `--debug` on the first candidate of the shoot before believing any number —
   that harness printed confident wrong numbers five times.
5. Human picks at zoom from the crop strips, judging findability, difference
   between the three, nothing self-naming at cup scale, **and shape**
   (elongated / compact / spanning).
6. Assign the three symbols to the regions. Ring them. Write `SOURCE.md`.
7. Write the copy to the photograph.

### The brief

| | |
|---|---|
| Subject | a **handled** cup — see below. White or near-white interior |
| Framing | cup only, from **directly overhead**, cup filling a little over half the frame, 1254² |
| Saucer | **out of frame.** It would be a second changed variable and it costs cup detail at 1254². The turn lives in `grammar` as language, not pixels |
| Content | genuine drain-scatter. **Nothing nameable.** A cup that visibly contains a key is a logo with coffee in it |
| Rings | gold, drawn on grounds **genuinely present**, in the region the copy names. The ring says *look here*; the copy supplies the symbol; she does the seeing. Ringing bare porcelain is worse than the obvious version — it asks her to see nothing |

### 🔴 The cup must have a handle

Traditional Turkish *fincan* frequently have **no handle**, and half of this device's
grammar is *handle side = her*. Greek and Armenian cups commonly do have one.

**Require a handle in the generation prompt and reject any candidate without one.**
The fallback — the "no handle → start at 12 o'clock" convention noted in
`tea-leaf-reading-findings.md` §3 — loses the strongest position rule and is not
taken here.

### 🔴 The risk that could stop this

`REFERENCES.md` established that **grade decides scatter**: fine dust/CTC tea drains
into one dominant mass, whole-leaf scatters into separated constellations. Turkish
coffee is ground finer than tea dust. There is a real chance every candidate is
rejected as *cup drowned* or *only 1 usable region* and the arm-B premise cannot be
met on coffee at all.

Mitigations, in order:
- Reference photographs first — real turned cups show grounds running **down the
  wall in rivulets**, leaving bare porcelain between, which is a different and more
  separable behaviour than tea's settling. Confirm this before generating.
- Follow the method's remedy table; change the **prompt**, never just the seed.
- **The floor stands: two failed rounds means a photograph cannot do this.** Stop
  generating and shoot a real cup. Do not loosen the selector's thresholds to make a
  weak candidate pass — they are set before any candidate is seen for exactly that
  reason.

---

## 5. The grammar

Coffee gets its **own** `grammar` string. Tea's grammar is *settling*; coffee's is
the **drain**, so direction and running carry meaning that tea's cannot.

> The cup was drunk down, turned upside down onto the saucer and left to drain, so
> the grounds ran DOWN the wall and settled as they went. A thing near the RIM came
> to rest last and belongs to the weeks just ahead. A thing low on the wall or on
> the FLOOR of the cup settled first and belongs to what she was built on, or to
> what is far off. The HANDLE SIDE is HER. The side OPPOSITE the handle is other
> people and what arrives from outside her. Grounds that run in a LINE are movement;
> grounds that sit in ONE PLACE are something settled and already hers. Use this; it
> is what makes a reading feel earned rather than guessed. Never explain the system
> to her — she should feel the position mean something, never be taught it.

Without this the generated half is blind to the device and invents meanings — the
documented failure where a low mark got explained as *"trust doesn't live in your
head"* instead of the ground she was built on.

---

## 6. The registry entry

```ts
const COFFEE: DeviceConfig = {
  id: "coffee",
  eyebrow: "The Cup Has Been Turned",
  instruction: "Look into the cup. Which of these do you see?",
  beatNoun: "cup",
  continueCta: "There's more the cup is showing me — begin your free reading",
  chooseMoment: "the moment you named it",
  pick: "symbol",
  cupImage: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  optionLabel: { a: "…", b: "…", c: "…" },      // bare nouns; after the art
  strip:       { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  revealStrip: { url: "/read/coffee-reveal-strip.jpg", width: 1260, height: 420 },
  grammar: "…",                                  // §5
  options: ["a", "b", "c"],
  mark:    { a: "…", b: "…", c: "…" },           // measured off the photograph
  reading: { a: "…", b: "…", c: "…" },           // archetypes, §3
};
```

`eyebrow` is the one place the device announces itself. *"The Cup Has Been Turned"*
signals coffee without saying "Turkish" — see Risks.

`optionLabel` stays **bare nouns, no article and no letter**. The A/B/C prefix is
derived at render time from the option key in both the lander and the ad generator.
Writing letters here puts the same fact in two places, and it is how tea's first
draft produced two options both labelled A.

### Everything else derives

`DEVICE_IDS`, `isReadDevice`, the route validators, `read-registry.mjs`,
`run-eval.mjs` and `build-read-copy.mjs` all read `DEVICES` and need **no edit**.
`walk-read-all.mjs` and `walk-read-funnel.mjs` take the device as an argument
(defaulting to `tea`), so they work unchanged. (`scripts/check-read.mjs` is a
/fb-tarot draft checker and is not part of this chain at all.)

---

## 7. Tooling gaps — the real work the handoff did not name

The handoff says a device is "one config entry plus its art". True for the *runtime*.
The **art pipeline for a `pick:'symbol'` device does not exist as reusable tooling** —
tea's arm-B assets were produced ad hoc on 2026-08-31 and the script was not kept.

| Script | State | Action |
|---|---|---|
| `scripts/select-tea-cup.mjs` | device-agnostic; takes a candidates dir | **none.** Only its name is tea-flavoured |
| `scripts/ring-read-cup.mjs` | **does not exist.** All seven `images/armb/` files date from one run at 15:49 on 2026-08-31 with no script retained | **write it.** Device-agnostic: cup image + three ring specs + labels → `cup-ringed.png`, three 420² reveal crops, and the 1260×420 reveal strip. Ring coordinates live in a per-device file, never hardcoded |
| `scripts/trace-tea-reveals.mjs` | **stale.** Rings hardcoded to *arm-A* copy (road / bird / heart) and reads `tea-{a,b,c}.png` — three cups, the mechanic tea no longer uses | not usable for coffee. Leave it; `ring-read-cup.mjs` supersedes it |
| `scripts/compose-read-strips.mjs` | hand-typed roster `const DEVICES = ['candle','dream','tea']`, and it composes three **panels** into a strip — the arm-A shape | derive the roster from `DEVICE_IDS` rather than adding `'coffee'` to a literal. It does **not** build a symbol-device reveal strip (three zooms of one photo); that is `ring-read-cup.mjs`'s job |
| `scripts/build-read-ad.mjs` | hardcodes `CUP = 'improve-v1/fb-read/images/armb/cup.png'` and `DEVICE = DEVICES.tea` | **cannot build a coffee ad today.** Add a device argument and resolve the cup path per device. The headline stays imported from `HEADLINES`, never typed |
| `client/src/pages/ReadBridge.tsx:176` | the cup's `aria-label` is the hardcoded string `"The inside of a teacup, tea leaves settled in it"` | wrong on coffee, and it is a device fact living outside the registry. Add a `cupAlt` field to `DeviceConfig` and render it |

### 🔴 The registry staleness gate does not exist

`fb-read/docs/HANDOVER.md:247` states *"the test run calls `read-registry.mjs
--check`, so editing a device, hook or guard without regenerating fails the tests
rather than quietly drifting."* **That is not true.** Nothing in `package.json`,
`tests/` or `vitest.config.ts` references `read-registry`. Only
`build-read-copy.mjs` invokes the generator (without `--check`), so the registry
refreshes solely as a side effect of compiling copy.

Adding coffee edits `shared/readDevices.ts` repeatedly — the config, the grammar,
the marks — and every one of those edits leaves `lander-registry.md` stale with
nothing failing. Fix it in this work: a vitest that runs `--check`. `--check`
already exits 1 with a clear message and exits 0 with a tally, so the test is a
subprocess assertion and nothing more. This also closes part of the "no vitest
guard file for `/fb-read`" gap noted in Risks.

Deriving `compose-read-strips.mjs`'s roster from `DEVICE_IDS` is in scope: it is a
hand-typed device list inside a funnel whose entire premise is that no such list
exists, and coffee is the change that would otherwise grow it.

---

## 8. Verification order

Run in this order. Each step gates the next.

```bash
# 1. compile the drafts — refuses unwritten, >25 words, >2 sentences, or "!"
node scripts/build-read-copy.mjs

# 2. registry must not be stale
npx tsx scripts/read-registry.mjs --check

# 3. free copy check, no model calls
npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry

# 4. pin the guards — 10/10, no model calls
npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest

# 5. live eval, both halves
npx tsx improve-v1/fb-read/evals/run-eval.mjs

# 6. 🔒 SANDBOX ONLY — dev and prod share a DB
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs coffee
open audit-runs/fb-read-walk/index.html

# 7. the ad
npx tsx scripts/build-read-ad.mjs love-again --device coffee
```

### Rules that bite here

- 🔒 **Sandbox only.** A "sandboxed" run in July fired 309 real Lead events.
- **Restart the dev server after any `shared/readDevices.ts` edit.** A stale server
  serves old marks while the eval grades new ones.
- **Art coherence.** The eval requires the opening bubble to carry the `mark`'s
  content words. Edit one without the other and the build fails — which is the point.
- **Check the assertion, not the vocabulary.** The eval has cried wolf five times,
  always by flagging something the approved copy does deliberately. Pin any guard
  change with `--selftest` before trusting it.
- **The live eval is not deterministic** (18/18 and 16/18 on clean runs). Never
  quote one number as stable.
- **The repo does not typecheck clean** (19 pre-existing files). Judge only new files.

---

## 9. Risks and known limits

| Risk | Standing |
|---|---|
| **The symbol confound.** Coffee-native names change the picture *and* the option labels, so a coffee-vs-tea winner is not cleanly attributable to the photograph | **Accepted, operator call 2026-09-01.** Recorded so nobody later reads the result as a pure picture test |
| **Coffee grounds may not scatter into three regions.** Finer than tea dust; may drain into one mass | Live. Reference photography first; the two-round floor stands. Never loosen the selector to pass a weak cup |
| **No handle** on traditional *fincan* | Mitigated: a handle is a hard requirement of the brief, enforced at candidate review |
| **Audience fit is unknown.** Tea reads British/generic-Western; coffee reads Turkish/Greek/Armenian to US/UK women 45+ | Unresolved, and not a blocker. The lander never has to say "Turkish" — the eyebrow says *the cup has been turned*. Whether the **ad** should lean into the novelty is a separate decision, deliberately not taken here |
| **`candle` still waits**, drawn and one entry from live, with two art/copy mismatches (flame leans right vs copy "pulls left"; pale smoke vs "dark smoke") | Out of scope. Coffee was chosen ahead of it |
| **No vitest guard file for `/fb-read`** — every other funnel family has one | Pre-existing gap, unchanged by this work. Not fixed here |

---

## 10. Out of scope

- Shape-picking (`pick:'panel'`) as a mechanic test. It is a real question and it
  should be run as its own test on one device with everything else held — not
  smuggled into a picture test.
- Retiring `tea` or `dream`.
- Wiring `candle`.
- The vitest guard file.
- Any deploy or merge. This branch is not merged and not live.
