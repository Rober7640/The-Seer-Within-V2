---
name: fb-tarot-hooks
description: "Source, draft, guard, smoke-test and ship new /fb-tarot question-hooks (the QUESTION axis) on the existing card decks. Use when the user says: build new tarot landers, add tarot hooks/questions, write the next soulmate/money/commitment landers, turn these ad headlines into landers, draft a new fb-tarot family, wire the approved tarot reads. A 'lander' in fb-tarot = one hook entry in the deck registry, NOT a new page/route/component and NOT new card art — for a new CARD SET from a supplied image use fb-tarot-add-card instead. This RUNS the proven pipeline (VOC by theme → draft to the CHOSEN method → collision check → guard file + tripwire → live smoke of the generated path → human review gate → wire). TWO methods are live and the operator picks per family at stage 0: the 7-cut Natural Tarot-Cut (fb-tarot/docs/natural-tarot-cut.md) and the 3-beat Inherited Shadow (fb-tarot/docs/inherited-shadow-cut.md)."
---

# /fb-tarot-hooks — launch new question-hooks on the tarot funnel

The operator front-door for scaling the **question axis** of `/fb-tarot`. The card axis (which
deck of art she is shown) is `fb-tarot-add-card`'s job. This adds new *questions* on decks that
already exist — almost always `return-mhf`, the face-down Magician / Hanged Man / Fool deck
every live ad points at. Param-driven (`/fb-tarot/c?hook=X&deck=Y`), no new routes.

> 🔒 **The method is not in this file — and there are TWO of them.** Both are live. Neither
> supersedes the other. **Ask the operator which one before drafting** (stage 0, step 6).
>
> | Method | Doc | Shape | Its job |
> |---|---|---|---|
> | **Natural Tarot-Cut** (7 cuts) | `fb-tarot/docs/natural-tarot-cut.md` | So · And · But · That's why — **resolves** | The read ANSWERS her question. Trust and relief |
> | **Inherited Shadow** (3 beats) | `fb-tarot/docs/inherited-shadow-cut.md` | So · But · And · That's why — **escalates** | The read WITHHOLDS the answer behind a block passed down her family line. Hands the pitch a live problem |
>
> Both fold into the same four registry beats, so every structural guard keeps working either
> way. What differs is the connective order, whether cut 3 answers, and what the loop points at.
>
> `natural-tarot-cut.md` carries what BOTH methods share and the shadow doc does not restate:
> §"How Evelyn sounds" (picture before meaning · grade 5 is not comprehensible · conversational
> · she is the subject), the directional ban table, frame selection, guard design. Read it
> either way. It is also inlined into `fb-tarot/docs/copy-migration-checklist.md` by the
> checklist generator — ⚠ that generator reads the 7-cut doc only, so a shadow-method family is
> **not** described by the generated checklist. Do not restate either doc here.

**Repo assets this skill drives** (all already exist — do not rebuild them):

| Asset | Command |
|---|---|
| VOC by theme (works with **no traffic**) | `LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/voc-by-theme.mjs --live --label X --pattern "<regex>"` |
| VOC by hook (needs traffic) | `…/voc-by-hook.mjs --live --hook <hook>` |
| Readability + comprehension | `node scripts/check-draft.mjs <hook…>` |
| Art / wording collisions | `npx tsx scripts/check-collisions.mts <hook…>` |
| Shared registry gate | `npx tsx scripts/dryrun-drafts.mts` |
| The real guards | `npx vitest run tests/tarot- --testTimeout=300000 --maxWorkers=2` |
| Prove the guard bites | `node scripts/guard-tripwire.mjs <family>` |
| Preview | `node scripts/preview-rewrite.mjs --html` |
| **Did the run actually do each stage** | `npx tsx scripts/skill-smoke.mts --family <name> --all-in-guard` |

## Operating mode (locked)

Semi-auto **with a human review gate**. Drafts are JSON, never code, until approved. **No hook
is wired before the operator has read the copy.** Three cards per hook (a/b/c), seven bubbles
per card, folded to four registry beats at wiring time.

## The 8 stages

`0 scope → 1 VOC → 2 draft → 3 gate → 4 guard → 5 smoke → 6 REVIEW GATE → 7 wire → 8 measure`

### 0 · Scope (interactive)

Establish what a lander IS here before anything else, because the usual request is a table of
ad headlines pointed at hook names.

- 🔴 **Check every proposed hook name against the registry.** `HEADLINES` (client/src/content/
  tarotReads.ts) is rendered on the page (`TarotBridge.tsx`) as the verbatim ad question, so
  pointing a new ad at an existing hook puts a **different question on the lander than in the
  ad**. If the headline differs, it is a NEW hook, not a re-point.
- 🔴 **Name collisions are real and silent.** `cards-too-late` and `cards-how-much-longer` are
  MONEY hooks; a love lander wired under either name serves a woman asking about love a reading
  about her pension. Grep before naming.
- 🔴 **Check the frame of any existing hook you are asked to re-point at.** `cards-new-soulmate`
  and `cards-soulmate-out-there` run under `AFTER_LOSS_TAROT_HOOKS`, whose hardest ban is NO
  ARRIVAL because someone has died. Sending a never-married reader there gets a read that
  structurally refuses to say anyone is coming.
- 🔴 **A headline can need TWO frames, and none of the six composes.** Each frame is a separate
  `Set` tested in a first-match ternary, so a hook gets exactly one. "How long before my ex comes
  back to me?" needs decode-him (a real man exists and may be asked something) AND the duration ban
  (it asks for a length) — and no frame does both. When that happens, say so at stage 0 and decide
  before drafting: extend an existing frame's clause, or add a new Set tested ahead of the looser
  one. Never let it fall through "because it is mostly decode-him"; the half that is not is the
  half that hurts.
- Confirm the final list, the age/segment split if there is one, and which headline (if any) is
  the control. A control should be the KNOWN question — often an existing lander, not a new one.

#### 🔴 ASK WHICH METHOD. Never assume one.

**Two methods are live and the operator chooses per family.** Put the question to them before
stage 1, with a recommendation and the reason — do not default to the seven cuts because it is
the incumbent, and do not default to the shadow because it is newer.

| | **Natural Tarot-Cut** — 7 cuts | **Inherited Shadow** — 3 beats |
|---|---|---|
| Doc | `fb-tarot/docs/natural-tarot-cut.md` | `fb-tarot/docs/inherited-shadow-cut.md` |
| Cut 3 | **answers her flat** | withholds it behind the block |
| Chain | So · And · But · That's why (resolves) | So · But · And · That's why (escalates) |
| The loop | names an obstruction | names where it came from — **roots** |
| Best for | trust and relief; her-fault questions whose "it was never you" IS the product | handing the pitch a live problem; block-native questions; families where upsell take matters most |
| Proven? | incumbent, live numbers | **designed, never shipped** |

Recommend the seven cuts when the answer is the thing she came for. Recommend the shadow when
the ad already put a block in her head (money, "is something blocking me"), or when the family's
value is in Act 1 coherence and upsell take rather than front-end conversion.

🔴 **The shadow method constrains the DECK, and the seven cuts do not.** It requires the card's
public meaning to already BE the block, because `TAROT_CARD_VOCAB` injects that meaning into the
Version-C prompt — a canned read fighting it makes B and C contradict each other on the same
lander. Cards that cannot carry it: the Fool, **the Magician**, the Empress, **the Chariot**,
Strength, the Star, the Sun, the World. If the family must run on `return-mhf` (Magician /
Hanged Man / Fool), **say so at stage 0** — two of those three fight the shadow method, and the
choice is then seven cuts or a new deck.

Record the choice in the draft `note` and in the family's guard file `describe()`. A reviewer
must never have to guess which method a lander was written to.

### 1 · VOC — read what she actually typed

🔴 **Never work the intent out from the headline.** Doing that on `cards-who-he-is` produced
copy that ACQUITTED a man, on a lander where a large share of readers are being defrauded.

A new family has no traffic, so `voc-by-hook` returns nothing — use **`voc-by-theme.mjs`**,
which searches the whole V1 corpus by what she SAID. Run one theme per headline cluster, read
the **Buyers** section first, and expect it to change the brief: on the 2026-08-19 soulmate
batch, 438 concerns changed four of eight landers before a word was written (a "slipping past"
ad turned out to collect widowers; a "choosing wrong" ad turned out to collect fraud and abuse
victims the headline blames). Read them; do not count them.

🔴 **Read the pull for readers the ad will HARM, not just for intent.** Every pull so far has
contained a group the headline quietly selects for, and it is never in the headline:

| Seen in | What was in the pull | What it forces |
|---|---|---|
| "slipping past" | widowers — "my second wife, she passed away in 2018" | a mediumship ban |
| "choosing wrong" | fraud and domestic abuse | cut 3 must refuse the headline's premise |
| "too late" | transplant, cancer, stroke, fertility | Meta-prohibited; the read cannot go near it |
| "how long before my ex comes back" | an **active romance scam** — *"he's in australia… I have to pay $3000 which will be returned to me when he arrives"* · a man **married 44 years** · readers already given a date by another psychic | never affirm the return; never predict the end of a third party's relationship |

The scam case is the sharpest: a read that says he is coming back is not a bad line, it is a line
she can act on with $3,000. Grep the pull for money-being-sent, a third party, and "another
reader/spell caster told me" before writing a word.

Write down, per hook: **the word doing the work**, **the fear under the headline** (rarely the
literal question), **who the ad will harm**, and **what she has already been told** that the read
must refuse.

🔴 **Record the pull as a `voc` block in the draft, not as prose in the note.** Prose is what
failed: on 2026-08-20 eight landers shipped with no pull at all and the only trace was a
sentence someone happened to type. `scripts/skill-smoke.mts` reads this field and fails without
it, so the evidence level travels with the copy instead of living in someone's memory.

```json
"voc": { "pulled": "2026-08-20", "pattern": "sm-best-years",
         "matched": 60, "buyers": 9, "verdict": "ok", "why": "" }
```

| verdict | when | what it costs you |
|---|---|---|
| `ok` | 5+ buyers, counts recorded | nothing |
| `thin` | fewer than 5 buyers | a WARN, and `why` is required |
| `unrecorded` | the pull ran, the numbers were not written down | a WARN — re-pull to clear it |
| `none` | no pull ran | a **FAIL**. The run is incomplete. |

### When the pull comes back thin or empty

🔴 **A thin pull is a finding, not a formality.** `cards-found-me-yet` matched FOUR concerns and
ZERO buyers, because nobody phrases it as him finding her — the agency flip is the AD's idea.
That is not "no data"; it is the data telling you the headline invented a question. Do not then
answer the headline. Write to the fear the corpus DOES record (there, `"HAVE I DONE SOMETHING TO
PREVENT OUR MEETING?"` from the how-long pull) and say in the note that you did.

🔴 **With no pull at all, you may not invent an intent.** Inheriting a *shipped* family's finding
is allowed and is what the money family is for — `cards-my-energy` had already solved "is it me?"
on the identical headline. Inventing what she means from the ad copy is the thing that produced a
read acquitting a man. The difference is whether the finding has ever been checked against a real
person's words.

⚠ **And "the operator said skip it" is a reason, not an exemption.** Mark it `none`, write the
reason and the theme to pull, and expect the smoke test to fail — that failure is the record.

### 2 · Draft to the method chosen at stage 0

To `fb-tarot/docs/drafts/rewrites/<hook>.json` — `{hook, headline, method, note, voc,
decks:{<deck>:{a,b,c}}}`, 7 flat bubbles per card **either way** — both methods fold into the
same four registry beats, so the file shape and every structural guard are identical. The `note`
field carries the family's bans and WHY each exists; it is what the next person reads.

- `"method": "natural-cut"` → follow `fb-tarot/docs/natural-tarot-cut.md`
- `"method": "inherited-shadow"` → follow `fb-tarot/docs/inherited-shadow-cut.md`

Pick the frame here, **before** writing — §"Choosing the frame" in `natural-tarot-cut.md`, which
governs both methods. A family in no frame set inherits decode-him and the model invents a man.

**If the method is inherited-shadow, two extra things happen before the first bubble:**

1. **Check `TAROT_CARD_VOCAB`** (`server/lib/prompts.ts`) for the deck. The meaning it injects
   must agree with the block the read will name. If it does not, pick a different card or write
   the vocab — never let Version B and Version C disagree about what a card means.
2. **Write the card grammar first, once per deck, and reuse it.** One shadow side per card,
   constant across every lander on that deck — that is what makes the block arrive from the
   picture instead of being asserted. ⚠ It also makes the block SENTENCE collide: keeping the
   fact constant while varying the angle is the whole job. Measured 2026-08-23: five landers on
   one card grammar produced **17 shared six-word runs** on the first pass.

### 3 · Gate the copy

```bash
node scripts/check-draft.mjs <hook…>          # ≤25 words · ≤2 sentences · grade ≤5 · ≤3 syllables
npx tsx scripts/check-collisions.mts <hook…>  # beat-1 art + beat-3 six-word runs
npx tsx scripts/dryrun-drafts.mts             # shared registry guards
```

Budget for collisions: eight landers in one sitting hit **17** beat-3 collisions, nearly all on
the framework's own mandated `That's why…` opener.

### 4 · Guard file, then prove it bites

Write `tests/tarot-<family>-copy.test.ts` — copy the newest sibling. It must load the DRAFT JSON
while unwired and the registry once wired, and say which in its `describe()`.

```bash
npx vitest run tests/tarot- --testTimeout=300000 --maxWorkers=2   # default workers time out at 30s — not a failure
node scripts/guard-tripwire.mjs <family>                          # 🔴 required, not optional
```

Add a tripwire row to `scripts/guard-tripwire.mjs` for every ban the family invents. **A green
suite on an unwired family means nothing until the tripwire has run.**

The `describe()` must also name the METHOD — a reviewer reading a guard file has to know whether
cut 3 is supposed to answer or withhold, or they will "fix" the wrong thing.

**An inherited-shadow family gets four authorship tripwire rows, not one.** The ban dies by
degrees, so feed it all four: a named relative (*"your mother"*), a gestured-at relative
(*"someone close to you"*), a generation count (*"three women back"*), and *"you passed it to
your children"*. Plus the method's own set — curse/karma/fate, trauma language, "who laid that
table". See `fb-tarot/docs/inherited-shadow-cut.md` §The authorship ban.

### 5 · Smoke the generated path

The guard covers the canned bubbles. It cannot cover the Version-C reply the model writes to
what she actually types — the half where the frame either holds or does not. Build the real
prompt with `buildTarotReflectPrompt`, send answers lifted from the stage-1 VOC, and scan the
replies with the guard's own ban patterns. Run it **twice**: as it stands, and with the proposed
frame swapped in. If the frame does not measurably cut violations, it is not the right frame.

Two findings from the first run of this stage, both worth expecting again: a "never repeat her
age" ban was ignored twice until rewritten as a positive instruction ("open on the card"), and
guard patterns written against the draft's own vocabulary scored the model's actual self-blame
("a pattern your soul is ready to break") as CLEAN. Fix the patterns from what comes back.

### 5b · Did the run actually happen?

```bash
npx tsx scripts/skill-smoke.mts --family <name> --all-in-guard
```

Every gate above checks the COPY. This checks the RUN — that each stage left the artifact it was
supposed to. It reads the `voc` block (stage 1), the seven-cut shape (2), the guard file and
tripwire rows (4), a Playwright spec per lander (5), and all three rosters plus exactly-one-frame
(7). It exists because on 2026-08-20 eight landers passed readability, collisions, the registry
gate, their own guard file and 12/12 tripwire cases **while no VOC pull had ever run behind
them**. Every copy gate was green; the stage that decides who the ad reaches had been skipped.

⚠ The guard file needs `@roster-start` / `@roster-end` markers around its roster, or
`--all-in-guard` cannot tell the family's own hooks from the neighbours it names as collision
twins. Add them when you copy the sibling guard.

Green here means the run was complete. It says nothing about whether the copy is good — that is
what the guards and the human below are for.

### 6 · REVIEW GATE — hard stop

`node scripts/preview-rewrite.mjs --html`, then publish a focused review page for the operator
(the full PREVIEW.html covers every lander on the funnel and is too big to review). Show, per
lander: the ad, the fear, what cut 3 answers, the VOC behind it, the bans, and all 21 bubbles.
**Nothing is wired until the operator says go.**

### 7 · Wire (only after approval)

Per `fb-tarot/docs/drafts/money-block.draft.md` §7, the most recent worked example of adding a
whole new family. Keep the un-synced rosters in step or the chat handoff 400s:

- `client/src/content/tarotReads.ts` — the `TarotHook` union · `TAROT_HOOKS` · `HEADLINES` ·
  the opener map · `reads[hook]` on every deck carrying it · the angle array
- `server/lib/prompts.ts` — `TAROT_HOOK_CONTEXT` · `TAROT_HOOK_TENDENCY` · **the frame Set**
- `server/routes.ts` — the hook validator

**Verify:** `npx tsc --noEmit` (no new errors vs baseline) · the full tarot suite · the tripwire
again, now loading from the registry rather than the draft.

### 8 · Measure

PostHog by `deck × hook × card × version` + V1 purchase rate. Rank by **revenue per 1,000
conversations**, not buy-rate — buy-rate hides upsell take and ranks sub-groups wrong.

## Invariants

1. A lander is one registry entry. Never a new page, route, component, or card art.
2. Client registry ↔ server vocab ↔ route validator, always in sync.
3. No code before the review gate; nothing wired before the operator has read it.
4. ⛔ `cards-feels` and `cards-return` are live controls — never rewritten, never touched.
5. Never `git checkout` to undo, and never run a blind regex pass over copy.
6. Every new family gets its own guard file AND its own tripwire rows.
7. Every lander carries a `voc` record. No pull is a FAIL, not a footnote.
8. **Two methods are live. ASK which one — never assume, never default.** The choice is the
   operator's, it is made per family at stage 0, and it is recorded in the draft `method` field
   and the guard file's `describe()`.
9. **The seven cuts are never deleted or migrated away from.** They are the incumbent, the
   control, and the only method with live numbers behind them. A shadow family is an ARM
   alongside them, not a replacement, until a result says otherwise.
10. On the inherited-shadow method the CARD's public meaning must already be the block, and
    `TAROT_CARD_VOCAB` must agree. A card meaning power, hope or completion cannot carry it.
