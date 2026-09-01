# `/fb-read` — coffee as a second device

Design settled 2026-09-01. Branch `soulmate-landers`. **Revised the same day**, after
reference photography and the operator's pick overturned four of its assumptions —
see *What the photograph changed* below. Git history carries the first version.

Adds coffee-ground reading (Turkish/Greek/Armenian tasseography) to the `/fb-read`
quiz bridge as a **device**: one registry entry plus its art. No new funnel, no new
route, no new page, no new hook, no new guard.

---

## The calls this design rests on

Operator decisions, 2026-09-01. Do not relitigate them.

| Question | Call | Consequence |
|---|---|---|
| Is the device axis re-opened? | **Yes — coffee is a real second device** | Built on the SAME three hooks as tea. 9 readings. Zero new guards |
| Position-picking or shape-picking? | **`pick: 'symbol'`** — one cup, three names, as tea | The pick mechanic is held constant, so the picture stays the variable |
| Reuse tea's symbols or go coffee-native? | **Coffee-native** | Bird / Tree / Anchor are not reused. Accepted cost: a second changed variable (see Risks) |
| Which photograph? | **`restos-cafe.jpg`** — CC0, real, unmodified but cropped | No generation. The art phase collapsed to one crop |

### Why the device axis was closed, and why re-opening it is sound

`improve-v1/fb-read/README.md` closed the device axis on 2026-08-31 and made the HOOK
the test variable. That was a **scope** call, not a result: nothing in `/fb-read` has
ever been deployed, so no device has a single data point and there is no winner to
protect. Re-opening costs 9 readings and buys the picture-vs-picture comparison the
funnel was built for and has never run. `dream` stays frozen.

---

## What the photograph changed

The first version of this spec planned a generated cup and reasoned forward from
there. Reference photography reversed four of its conclusions. Recorded because each
one was a confident assumption that the evidence killed.

| First version | What the photographs showed |
|---|---|
| Symbols chosen up front: **Road / Key / Bridge**, then art generated to fit | Symbols must be read OFF the picture. **Road / Tree / Lake** — what the marks actually look like |
| Generate five candidates a round, machine-select, two-round floor | A real **CC0** photograph exists. No generation, no selector, no floor |
| 🔴 "The cup **must have a handle**" — half the grammar was *handle side = her* | Coffee reads by **depth**, not side. The handle is outside the crop and is not needed |
| "Coffee coats, it does not scatter — the premise may not survive" | **It is the DRAW, not the coffee.** A heavy draw coats; a light draw leaves isolated marks on near-bare porcelain. `restos-cafe` is a light draw |

Full evidence: `improve-v1/fb-read/images/reference/REFERENCES.md` (four licence-clean
cups, what each shows) and `improve-v1/fb-read/images/coffee/SOURCE.md` (the crop, the
geometry, why a photograph beat a render).

---

## 1. What gets built

| | Status |
|---|---|
| Art — master, rings, reveal strip, served files, `SOURCE.md` | ✅ **done** (`e393d9a`) |
| `scripts/ring-read-cup.mjs` — the reusable arm-B reveal tool | ✅ **done** (`e393d9a`) |
| Reference photography + licence table | ✅ **done** (`c1affef`) |
| `tests/fb-read-registry.test.ts` — the guard file, plus `cupAlt` | ☐ |
| `compose-read-strips.mjs` roster derived from `DEVICE_IDS` | ☐ |
| `build-read-ad.mjs --device` | ☐ |
| 9 readings as JSON drafts, compiled | ☐ |
| The `COFFEE` registry entry | ☐ |
| README / HANDOVER corrections | ☐ |

### What does NOT get built

- No new hook, so **no new guard**. `READ_FRAME` is not edited.
- No route, server vocab map or validator. The registry **is** the validator.
- No change to `DEFAULT_DEVICE` (stays `tea`) or to any headline — `HEADLINES` is
  hook-level and must not move when the device does.
- No use of `scripts/select-tea-cup.mjs`. It measures generated cups for tea's
  physics; nothing here generates a cup.

---

## 2. The test

| | |
|---|---|
| Hooks | all three, same as tea — `love-again`, `still-think`, `hiding-something` |
| Held constant | hook, headline, method (Natural Tarot-Cut), frame, pick mechanic, the 7-cut shape |
| The variable | the picture — **and the three symbol names**, deliberately (see Risks) |
| Pricing | unchanged. Funnel-level `35_read`, $35/$25 |

---

## 3. The symbols

Read off the photograph, not chosen in advance. All three are in the traditional
tasseography vocabulary, and all three land on **different depths** — which tea's
three, all mid-wall, never did.

| | Symbol | Where | Depth reading | Archetype (`reading`) |
|---|---|---|---|---|
| a | **Road** | high on the far wall, under the rim | the weeks just ahead — the last thing to come to rest | the moving heart |
| b | **Tree** | mid-wall, left of centre | what is standing now | the standing heart |
| c | **Lake** | the floor of the cup | what she was built on — the first thing to settle | the deep heart |

### Cut-3 fears — `love-again`

Cut 3 answers a fear, flat, and the three lines must answer **three different** fears
or the panels collapse into one sentence said three ways.

| Symbol | The fear cut 3 answers |
|---|---|
| Road | nothing is coming; the days ahead are just more of this |
| Tree | it broke me — there is nothing of me left standing |
| Lake | something in me is wrong at the root, and always was |

Equivalent triples get written per hook in each draft's `note`.

### What was excluded, and why

| Excluded | Reason |
|---|---|
| **Heart, Ring** | Self-selecting. On *"Will I love again?"* everyone taps Heart, the tap stops being instinct, and the three readings never get a fair split. `tea-leaf-reading-findings.md` §2 names this failure |
| **Snake, Eye** | Both invent a third party — an enemy, someone watching. `love-again`'s guard bans implying a man she did not name; `hiding-something`'s bans naming the contents of the gap |
| **Bird, Anchor** | Tea's. Reusing them defeats the coffee-native call |
| **Mountain, Sun** | Real and strong — but they are in `coffereading.jpg`, the *other* cup. A `pick:'symbol'` device needs all three marks in ONE photograph |

### Each draft carries its own `note`

The three coffee drafts do **not** inherit tea's notes. Tea's is device-specific in
ways that are wrong here: it names bird / tree / anchor and their clock positions, it
forbids inventing anything about *how she drinks her tea*, and it states that meaning
is carried by which side and never by depth — which on this cup is exactly backwards.
Coffee's notes carry coffee's positions, coffee's fears and the drain grammar. What
transfers unchanged is the hook-level material: the frame, the guard, the
never-a-name / never-a-date / never-a-place rules, and the cut-6-recognises rule.

---

## 4. The art — done

Everything below is built and committed; `improve-v1/fb-read/images/coffee/SOURCE.md`
is the authority.

| | |
|---|---|
| Source | [*Restos de café para adivinar*](https://commons.wikimedia.org/wiki/File:Restos_de_café_para_adivinar.jpg), Álvaro de la Paz Franco, Wikimedia Commons, **CC0** — no attribution required, commercial use unrestricted |
| Master | `improve-v1/fb-read/images/coffee/cup.png`, 1254², cropped `{left:400, top:120, width:1540, height:1540}` from the 2592×1944 original |
| Why that crop | puts the thumb, the notebook and the handwriting outside the frame while keeping all three marks well inside. A sliver of the cup's own red rim stays — that is the cup, not clutter |
| Served | `client/public/read/coffee-cup.jpg` (1254², 210 KB) · `client/public/read/coffee-reveal-strip.jpg` (1560×520, 122 KB) |
| Ring geometry | `improve-v1/fb-read/images/coffee/rings.json` — the only place the coordinates live |

🔴 **Depth on this cup is OBSERVED, not computed.** The cup is tilted toward the
camera, so its floor is low in the frame rather than at the image centre. Anyone who
recomputes the positions as distance-from-centre gets the lake — pooled liquid at the
cup's lowest point, unambiguously the floor — back as "near the rim", and inverts the
whole reading.

🔴 **The reveal crop is 520, not tea's 420.** The road is a long mark; a ring around
any useful length of it exceeds 420px, and `ring-read-cup.mjs` refuses a ring larger
than the crop rather than cutting it in half. 520 still shows 41% of the cup.

---

## 5. The grammar

Coffee gets its **own** `grammar` string. Tea's is *settling* and leans on handle-side;
coffee's is the **drain**, and depth carries the meaning.

> The cup was drunk down, turned upside down onto the saucer and left to drain, so the
> grounds ran DOWN the wall and settled as they went. Depth is the whole reading here.
> A mark high on the wall, just under the RIM, came to rest last and belongs to the
> weeks just ahead. A mark HALFWAY UP the wall is what is standing in her life now. A
> mark on the FLOOR of the cup settled first and belongs to what she was built on —
> the oldest thing, the ground under everything else. Grounds that run in a LINE are
> movement; grounds gathered in ONE PLACE are something settled and already hers. Use
> this; it is what makes a reading feel earned rather than guessed. Never explain the
> system to her — she should feel the position mean something, never be taught it.

**No handle rule**, deliberately. Without a device `grammar` the generated half is
blind and invents meanings — the documented failure where a low mark was explained as
*"trust doesn't live in your head"* instead of the ground she was built on.

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
  cupAlt: "The inside of a coffee cup, the grounds drained down its pale wall",
  optionLabel: { a: "Road", b: "Tree", c: "Lake" },
  // Unused while pick is 'symbol' — the lander reads cupImage. Kept pointing at the
  // same file so a missing cupImage degrades to the right picture.
  strip: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  revealStrip: { url: "/read/coffee-reveal-strip.jpg", width: 1560, height: 520 },
  grammar: "…",                                  // §5, verbatim
  options: ["a", "b", "c"],
  // Read off the photograph — see improve-v1/fb-read/images/coffee/SOURCE.md.
  // 🔴 These must carry the same content words as cut 1 of each read, or the eval's
  // art-coherence check fails the build.
  mark: {
    a: "a road running under the rim of the cup",
    b: "a tree halfway up the wall of the cup",
    c: "a lake in the bottom of the cup, where the grounds settled first",
  },
  reading: {
    a: "the moving heart",
    b: "the standing heart",
    c: "the deep heart",
  },
};
```

`optionLabel` stays **bare nouns, no article and no letter** — the A/B/C prefix is
derived at render time in both the lander and the ad generator. Writing letters here
put the same fact in two places, and it is how tea's first draft produced two options
both labelled A.

### Everything else derives

`DEVICE_IDS`, `isReadDevice`, the route validators, `read-registry.mjs`,
`run-eval.mjs` and `build-read-copy.mjs` all read `DEVICES` and need no edit.
`walk-read-all.mjs` and `walk-read-funnel.mjs` take the device as an argument.
(`scripts/check-read.mjs` is a /fb-tarot draft checker and is not in this chain.)

---

## 7. Tooling — what was missing, and what is left

The handoff said a device is "one config entry plus its art". True for the *runtime*.
The **art pipeline for a `pick:'symbol'` device did not exist as reusable tooling** —
tea's arm-B assets were produced ad hoc on 2026-08-31 and no script was kept.

| Script | State | Action |
|---|---|---|
| `scripts/ring-read-cup.mjs` | ✅ **written** | Two rules it earned on first use: a ring must be INSIDE the photograph while the crop need only CONTAIN it (sliding inward rather than failing — demanding a centred crop rejected the lake purely for sitting low, a fact about the box, not the cup); and it refuses a ring larger than the reveal crop, which fired at once on the 880px road |
| `scripts/trace-tea-reveals.mjs` | stale — rings hardcoded to arm A's road/bird/heart across three cups | Leave it. `ring-read-cup.mjs` supersedes it |
| `scripts/select-tea-cup.mjs` | fine, unused here | none |
| `scripts/compose-read-strips.mjs` | hand-typed roster `['candle','dream','tea']`, and it composes three **panels** — the arm-A shape | derive from `DEVICE_IDS`. It does not build a symbol-device reveal strip; that is `ring-read-cup.mjs`'s job |
| `scripts/build-read-ad.mjs` | hardcodes the armb cup path and `DEVICES.tea` | **cannot build a coffee ad today.** Add `--device`; point coffee at `improve-v1/fb-read/images/coffee/cup.png` |
| `client/src/pages/ReadBridge.tsx:176` | cup `aria-label` hardcoded to `"a teacup, tea leaves settled in it"` | wrong on coffee, and a device fact outside the registry. Add `cupAlt` to `DeviceConfig` |

### 🔴 The registry staleness gate does not exist

`fb-read/docs/HANDOVER.md:247` states *"the test run calls `read-registry.mjs --check`
… so editing a device, hook or guard without regenerating fails the tests rather than
quietly drifting."* **Nothing calls it.** Only `build-read-copy.mjs` invokes the
generator, as a side effect of compiling copy. Adding coffee edits `readDevices.ts`
repeatedly, and every edit leaves `lander-registry.md` stale and silent. Fix it here
with a vitest that runs `--check`, which already exits 1 with a clear message.

---

## 8. Verification order

```bash
node scripts/build-read-copy.mjs                                # compile drafts
npx tsx scripts/read-registry.mjs --check                       # not stale
npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry             # 27/27 WRITTEN, free
npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest        # 10/10, free
npx tsx improve-v1/fb-read/evals/run-eval.mjs                   # live, both halves
# 🔒 SANDBOX ONLY — dev and prod share a DB
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs coffee
npx tsx scripts/build-read-ad.mjs love-again --device coffee
```

**Rules that bite here.** 🔒 Sandbox only — a "sandboxed" run in July fired 309 real
Lead events. Restart the dev server after any `shared/readDevices.ts` edit. Art
coherence requires the opening bubble to carry the `mark`'s content words. **Check the
assertion, not the vocabulary** — the eval has cried wolf five times, always flagging
something the approved copy does deliberately. The live eval is not deterministic
(18/18 and 16/18 on clean runs). The repo does not typecheck clean (19 pre-existing
files).

---

## 9. Risks and known limits

| Risk | Standing |
|---|---|
| **The symbol confound.** Coffee changes the picture *and* the option names, so a coffee-vs-tea winner is not cleanly attributable to the photograph | **Accepted, operator call.** Recorded so nobody reads the result as a pure picture test |
| **"Most people would see a road / tree / lake" is one viewer.** The traditional atlas corroborates (all three are historical symbol names) but it is not a poll | Open. Showing the cup to 5–10 people and recording first answers only would settle it before copy is written. Cheap, and not yet done |
| **The two cups look nothing alike.** Tea's is a dark studio render; coffee's is a bright real snapshot with a red rim | Deliberate — it is fresh creative for the same women, and a real cup is arguably more credible than a render. But it is a second uncontrolled difference |
| **Audience fit unknown.** Tea reads British/generic-Western; coffee reads Turkish/Greek/Armenian to US/UK women 45+ | Not a blocker. The lander never says "Turkish" — the eyebrow says *the cup has been turned*. Whether the **ad** should lean into the novelty is a separate call |
| **No vitest guard file for `/fb-read`** | Partly fixed here: `tests/fb-read-registry.test.ts` gates registry staleness and the `pick:'symbol'` invariants. It does not check copy quality — that stays the eval's job |
| **`candle` still waits**, drawn and one entry from live, with two art/copy mismatches | Out of scope |
| **The `lake` is pooled liquid, not a formation** | No longer a risk. It mattered only while cups were to be generated or re-shot; one fixed photograph ships one fixed lake |

---

## 10. Out of scope

- Shape-picking (`pick:'panel'`) as a mechanic test — a real question, but it should be
  run as its own test with everything else held, not smuggled into a picture test.
- Retiring `tea` or `dream`; wiring `candle`.
- Any deploy or merge. This branch is not merged and not live.
