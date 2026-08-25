---
name: fb-tarot-hooks
description: "Source, draft, guard, smoke-test and ship new /fb-tarot question-hooks (the QUESTION axis) on the existing card decks. Use when the user says: build new tarot landers, add tarot hooks/questions, write the next soulmate/money/commitment landers, turn these ad headlines into landers, draft a new fb-tarot family, wire the approved tarot reads. A 'lander' in fb-tarot = one hook entry in the deck registry, NOT a new page/route/component and NOT new card art — for a new CARD SET from a supplied image use fb-tarot-add-card instead. This RUNS the proven pipeline (VOC by theme → draft to the CHOSEN method → collision check → guard file + tripwire → live smoke of the generated path → human review gate → wire). TWO methods are live and the operator picks per family at stage 0: the 7-cut Natural Tarot-Cut (fb-tarot/docs/natural-tarot-cut.md) and the Inherited Shadow (fb-tarot/docs/inherited-shadow-cut.md). The seven cuts serve 7 bubbles; the inherited shadow serves 6. Both fold into four registry slots."
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
> | **Inherited Shadow** | `fb-tarot/docs/inherited-shadow-cut.md` | **But** (beat 4) · **So** (beat 5) — **argues** | The read WITHHOLDS the answer behind a block. Beat 5 is the thing she pays to remove, so it carries a property she can picture. ⚠ The LANDER never says "family line" — the inheritance goes in as AGE (decided 2026-08-24) |
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
is wired before the operator has read the copy.** Three cards per hook (a/b/c), folded to four
registry beats at wiring time — **7 bubbles on the seven cuts, 6 on the inherited shadow**. A
beat may carry `\n` and split itself, so the count is free; the FOLD is what has to be checked,
and only when a lander is actually being wired.

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

#### 🔴 WHAT ALREADY EXISTS — check the registry before proposing anything

`fb-tarot/docs/lander-registry.md` — all 104 landers grouped by category (money, soulmate ×
keyword / age band / after loss / where, loneliness, self-frame, decode-him), each with its ad
headline, the decks carrying it, and **which method it runs**. It is GENERATED from the
registry and the frame Sets — `npx tsx scripts/lander-registry.mts` — so it cannot claim a
lander is something the code says it is not.

Read it at stage 0 to answer three questions the operator will ask: does this hook already
exist, what category does it fall in, and what is running on it today.

⚠ It answers *what exists*. `fb-tarot/docs/copy-migration-checklist.md` answers *is the copy
clean*. Different files, both generated, do not conflate them.

#### 🔴 CHECK THE DECK'S SYMBOL TABLE BEFORE SCOPING

`fb-tarot/docs/decks/<deck>/symbols.md` — for `return-mhf` it lists, per card, which drawn
detail proves what, and which details to leave alone because they are ambiguous (the Fool's
cliff) or easy to invert (the Magician's lemniscate). It also carries **card-level decisions**.
Read it at stage 0 rather than discovering it at stage 2.

> ✅ **No card on `return-mhf` is currently restricted.** An earlier note told the next set of
> landers to avoid the Magician, on the grounds that its beat 5 came out weakest. **That was
> withdrawn on 2026-08-23** — beat 5 has since changed job, from a cold read to the "SO"
> conclusion, and re-testing three cards × three questions put the Magician strongest in two
> and weakest in none. The full working is in `symbols.md`.
>
> 🔴 **The reason this is worth reading rather than skipping.** A card-level restriction can
> outlive the evidence behind it by a matter of hours. Before you honour one, check WHAT it was
> measured on and whether that thing still works the same way.

⚠ Two live cautions on this deck, neither of them a restriction:
- **Ration the Magician's table.** The four objects are its strongest detail by a distance and
  will try to open every Magician card. Three landers in a row nearly did.
- **Split the Hanged Man's halves.** Its warrant already names the block, so beat 3 and beat 5
  collapse into each other unless beat 3 carries *you are not broken* and beat 5 carries *so
  something else is holding it*.

#### 🔴 ASK WHICH METHOD. Never assume one.

**Two methods are live and the operator chooses per family.** Put the question to them before
stage 1, with a recommendation and the reason — do not default to the seven cuts because it is
the incumbent, and do not default to the shadow because it is newer.

| | **Natural Tarot-Cut** | **Inherited Shadow** |
|---|---|---|
| Doc | `fb-tarot/docs/natural-tarot-cut.md` | `fb-tarot/docs/inherited-shadow-cut.md` |
| Cut 3 | **answers her flat** | withholds it behind the block |
| Chain | So · And · But · That's why (resolves) | So · But · And · That's why (escalates) |
| The loop | names an obstruction | names where it came from — **roots** |
| Best for | trust and relief; her-fault questions whose "it was never you" IS the product | handing the pitch a live problem; block-native questions; families where upsell take matters most |
| Deck | any | any — the card is the warrant, so a bright card works best |
| Proven? | incumbent, live numbers | **designed, never shipped** |

Recommend the seven cuts when the answer is the thing she came for. Recommend the shadow when
the ad already put a block in her head (money, "is something blocking me"), or when the family's
value is in Act 1 coherence and upsell take rather than front-end conversion.

🔴 **Neither method constrains the deck.** Both run on `return-mhf` or anywhere else. What the
shadow method requires is that the card be read **as it actually means** — its meaning is the
WARRANT for cut 1 ("you have what it takes"), and the block is what that positivity proves must
exist. A bright card is the *strongest* warrant, not a disqualification.

⛔ An earlier version of this file ruled out eight cards here — the Fool, Magician, Empress,
Chariot, Strength, Star, Sun, World — on the premise that the card must CONTAIN the block. That
premise was wrong (operator correction 2026-08-23) and the list is deleted. The failure it was
groping at is a read that INVERTS a card: the Magician's lemniscate written as a treadmill when
it means unlimited potential. See `fb-tarot/docs/inherited-shadow-cut.md` §Never invert the card.

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
decks:{<deck>:{a,b,c}}}` — **7 flat bubbles per card on `natural-cut`, 6 on `inherited-shadow`**.
Both fold into the same four registry beats, so the file shape and every structural guard are
identical; only the fold differs. The `note`
field carries the family's bans and WHY each exists; it is what the next person reads.

- `"method": "natural-cut"` → follow `fb-tarot/docs/natural-tarot-cut.md`
- `"method": "inherited-shadow"` → follow `fb-tarot/docs/inherited-shadow-cut.md`

Pick the frame here, **before** writing — §"Choosing the frame" in `natural-tarot-cut.md`, which
governs both methods. A family in no frame set inherits decode-him and the model invents a man.

**If the method is inherited-shadow, run the 4-step PRE-FLIGHT before the first bubble** —
`fb-tarot/docs/inherited-shadow-cut.md` §Pre-flight. These are not gates. A gate catches the
fault after the copy exists, and each one then costs a rewrite:

1. **Write cut 1 FROM `TAROT_CARD_VOCAB`, not against it** (`server/lib/prompts.ts`). Cut 1 says
   what that line says — she has what it takes. If cut 1 argues with the vocab, rewrite cut 1;
   the deck is not the problem. Proven necessary 2026-08-23: on the live deck the copy passed
   **every** mechanical gate while two of three cards contradicted their own stated meaning. No
   gate in this pipeline can see it.
2. **Write the card grammar, once per deck.** One shadow side per card, constant across every
   lander on that deck — that is what makes the block arrive from the picture instead of being
   asserted. ⚠ Keeping the fact constant while varying the angle is the whole job: five landers
   on one card grammar produced **17 shared six-word runs** on the first pass.
3. 🔴 **Write the THREE AFFIRMATIONS first and check they differ.** Cut 1 for all three cards,
   nothing else, read side by side. It fires whenever the ad blames her or asserts a block,
   because then every card must open the same way — *"So it isn't you, dear"* ×3. Fix it here,
   where it costs a line, not at the collision gate where it costs a read.
   ⚠ This was a prose warning in the doc first and the very next run walked into it anyway.
4. 🔴 **Write the THREE BLOCKS first, and give each one a PROPERTY.** Beat 5 for all three cards,
   nothing else, side by side. Beat 5 is not a tidy conclusion — it is **the thing she is being
   asked to pay to remove**, and she will not pay to remove something she cannot picture. Each
   card names one property: **age** (*"since before he ever turned up"*), **timing** (*"it turns
   up whenever this gets close"*), **position** (*"it steps in at the landing"*) or **manner**
   (*"it has held this quietly"*). A card ending on a bare *"something is in the way"* is not
   written yet. ⚠ Found 2026-08-24: 37 landers written to the old instruction passed every
   mechanical gate with ~100 of 111 beat 5s blank. A blank is short, plain, grade-2 English that
   breaks no ban, so no gate can see it.

#### 🔴 THE READ-BACK — run it before you show anyone, and report the result

`fb-tarot/docs/natural-tarot-cut.md` §"The read-back". Five questions, read aloud, per bubble:

1. **Would a person say this?** 2. **Is every noun real** — on the card, or in her life?
3. **Is there anything she could catch me getting wrong?** 4. **Does the symbol prove the line
at a glance, with no explaining?** 5. **Does the card mean what `TAROT_CARD_VOCAB` says?**

🔴 **Those five ask whether the copy is TRUE. Three more ask whether it SELLS** — added
2026-08-24, after an audit of 37 landers found copy that passed all five and did none of the
three jobs the lander exists to do. A lander that is accurate and does not convert has failed.

6. **Does the opener earn the tap?** Beat 1 is the uncanny reach — *she* could not see the card
   and still chose the one that answers her. If it is about the deck (*"Of the three backs…"*
   ×111, on rotation) it is furniture, not a hook.
7. **Can she picture the block?** Beat 5 is the offer. If she cannot see it, she will not pay to
   have it removed. *"Something is in the way"* is a blank.
8. **Does the last message make her type?** *"Let me look closer at…"* announces that Evelyn will
   continue. It does not ask her anything, and her first reply is the metric.

🔴 **This is not the gate below, and passing the gate is not a substitute.** On 2026-08-23 a
batch passed every mechanical check while containing an invented word, an invented prop, an
invented fact about her life, and a symbol that proved the opposite of its line. The gate counts
syllables — it cannot see any of that, and it pushes the wrong way: reading grade FALLS when you
delete a real noun, so *"Something holds this, dear"* scores better than *"Something is holding
your love life back, dear."*

Two working rules that go with it:
- **One lander at a time, finished.** Thirty reads shown at once wastes the reviewer — the fault
  is usually in the first three, and everything after was written to the same broken assumption.
- **Do not invent rules.** If it is not in these docs or in the operator's own feedback, do not
  optimise to it. An invented loop rule produced *"the fence that was put up long before you
  walked to it"* within the hour.

### 3 · Gate the copy

```bash
node scripts/check-draft.mjs <hook…>          # ≤25 words · ≤2 sentences · ≤3 syllables · ≤2 negatives
#   ⚠ reading grade is REPORTED, not gated (removed 2026-08-23) — it fell when you deleted a
#     real noun, so it rewarded the vagueness it was meant to prevent
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
10. On the inherited-shadow method the card is the WARRANT, never the block: cut 1 states what
    the card means, and the block is what that positivity proves must exist. NEVER invert a card
    to find a block in it. No card is ruled out by its meaning.
