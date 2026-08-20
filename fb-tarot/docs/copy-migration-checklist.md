# /fb-tarot copy migration — checklist

Two tracks: **A** rewrites the 88 landers already live; **B** builds the 11 new money landers.

> 🤖 **GENERATED — do not hand-edit.** Rewrite it with
> `node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist`.
> The tick is derived from the gate, not from anyone remembering to tick it, so this file
> can never claim a lander is done when the code says otherwise.

`████████████████████`  **95 / 95 landers clean** · 0 gate problems left

Rules: ≤25 words · ≤2 sentences · grade ≤5 · ≤3 syllables · ≤2 negatives per sentence · echo the ad in bubbles 1–2 · no banned constructions.

**A lander is one deck × one hook.** Most hooks live only on `return-mhf` (the default
face-down deck every live ad points at); a few also have `arcana-mfh` / `arcana-eef` /
`decode-him` variants, and an edit must be applied to **every** deck carrying the hook or
the parity test fails.

**Three states per lander:** blank = not started · 📝 DRAFTED = copy written and gated,
waiting on your go (read it in `fb-tarot/docs/drafts/rewrites/PREVIEW.md`) · `[x]` = wired
and passing. Nothing is wired before you have seen it.

📝 awaiting sign-off right now: `cards-after-marriage`, `cards-alone-forever`, `cards-back-together`, `cards-blocked-retiring`, `cards-cant-stop`, `cards-cheating`, `cards-choosing-wrong`, `cards-come-back`, `cards-deceived`, `cards-end-up-alone`, `cards-energy-how-long`, `cards-ever-back`, `cards-faithful`, `cards-feel-about-me`, `cards-feels-off`, `cards-feels`, `cards-forever-or-now`, `cards-found-me-yet`, `cards-ghosted`, `cards-given-up`, `cards-gone-cold`, `cards-her-shadow`, `cards-hiding-something`, `cards-his-children`, `cards-honest`, `cards-how-much-longer`, `cards-imagining-it`, `cards-keeps-waiting`, `cards-left-without-word`, `cards-lied-to`, `cards-live-apart`, `cards-longer-to-wait`, `cards-losing-interest`, `cards-love-again`, `cards-love-or-moved-on`, `cards-loyal`, `cards-meant-alone`, `cards-met-already`, `cards-misled`, `cards-money-wont-stay`, `cards-moved-on`, `cards-my-energy`, `cards-nest-egg`, `cards-new-soulmate`, `cards-not-enough`, `cards-not-found-yet`, `cards-on-my-mind`, `cards-out-of-time`, `cards-prayed-years`, `cards-prayers-unanswered`, `cards-pulling-away`, `cards-ready-commit`, `cards-ready-to-love`, `cards-real-person`, `cards-really-love`, `cards-really-over`, `cards-really-soulmate`, `cards-second-time`, `cards-slipping-past`, `cards-someone-else`, `cards-someone-for-me`, `cards-soulmate-closer`, `cards-soulmate-out-there`, `cards-soulmate`, `cards-still-a-chance`, `cards-still-love`, `cards-still-miss-him`, `cards-still-think`, `cards-still-working`, `cards-stop-hurting`, `cards-stop-missing`, `cards-stop-searching`, `cards-talking-someone`, `cards-too-late-love`, `cards-too-late`, `cards-too-long`, `cards-truth`, `cards-twin-back`, `cards-twin-feels`, `cards-twin-or-connection`, `cards-twin-ready`, `cards-where-soulmate`, `cards-who-he-is`, `cards-who-hurt-me`, `cards-wont-commit`

🔴 **Known content bug, `decode-him` deck.** All four of its hooks open with the SAME
beat 1 per card ("You turned the Sun, dear — the card of what stands in the light." serves
cards-honest, cards-return, cards-feels AND cards-cheating). Every other family has a test
forbidding this; decode-him has no guard file, so it was never caught. Each rewrite there
must write a fresh beat 1 — `scripts/preview-rewrite.mjs` fails the preview if it collides.

## How a lander gets rewritten

> 🔄 **The framework changed on 2026-08-19** (operator: the Natural Tarot-Cut). The old shape
> refused to answer and certified her instead, because the guards forbade a claim about a real
> man in either direction. Those guards are now DIRECTIONAL — see "What may be said" below —
> and the read ANSWERS. If you are reading a lander written before that date, it will not match
> this table; the table is right and the lander is the queue.

**1 · Read what she actually typed.** Not the headline — her words.

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/voc-by-hook.mjs \
  --live --hook <hook>          # read-only, output is gitignored
```

Working the intent out from the headline gets you close and confidently wrong. On
`cards-who-he-is` it produced copy that ACQUITTED a man — and a large share of that
lander's readers have never met the man, and some are being defrauded by him.

**2 · Find the intent, then find the FEAR under it.** The question is carried by one word.

- *Which word is doing the work?* `really` = did it ever amount to love · `still` = did it
  survive · `ever` = she has waited long enough to be asking whether to stop.
- *What is she actually afraid of?* This is what cut 3 answers, and it is rarely the literal
  headline. Under "does he love me" sits *did I invent this*. Under "why is my money blocked"
  sits *was this my own fault*. Answer the fear, not the sentence.
- *What has she already been told?* Overthinking. Clinging. Imagining it. The read exists to
  refuse that — but by DESCRIBING what she has lived, never by announcing she was right.

Cross-check against the hook's own entry in `TAROT_HOOK_TENDENCY` (`server/lib/prompts.ts`)
before writing. It carries the per-hook bans, and it is the copy the Version-C model obeys —
if you loosen a guard file without loosening the tendency, B and C contradict each other on
the same lander.

**3 · Write the seven cuts.** Four registry beats; beat 3 carries four bubbles.

| # | Beat | Cut | Job | Without it |
|---|---|---|---|---|
| 1 | 1 | **The picture** | One or two details that are literally on the art | She has nothing to check, so she discounts everything after |
| 2 | 2 | **The bridge** | Her question back, plus the card in plain English | It reads as a horoscope, and the card does no work |
| 3 | 3 | **The answer** | Answers her deepest fear, flat. The clearest line on the page | She got no answer and feels conned |
| 4 | 3 | **The hidden layer** | Something she could not see — what he holds, or what the block has been doing | Cut 3 gets restated in different words and the read stalls |
| 5 | 3 | **The contradiction** | Why the behaviour does not match the answer | Nothing is left unresolved, so there is nothing to buy |
| 6 | 3 | **The recognition** | The specific thing she has actually lived | The read is a claim she has to take on trust |
| 7 | 4 | **The next mystery** | Narrow, aimed at the CAUSE of the contradiction — and still an obstruction | The clearing ritual arrives from nowhere at minute eight |

**4 · Make it one thought, not seven lines.** This is the single biggest difference between
copy that reads spoken and copy that reads written, and it is mechanical:

| Cut | Opens on | Doing |
|---|---|---|
| 3 | *So…* | gives the answer |
| 4 | *And…* | deepens it |
| 5 | *But…* | turns it |
| 6 | *That is why…* | explains her experience |
| 7 | *Let me look closer at…* | opens the next layer |

Each line must make the next line necessary. Measured on the pre-2026-08-19 batch, only
**121 of 1,020** middle bubbles opened on a connective — 12%. That is what made 255 reveals
read as seven separate copywriting lines sitting next to each other.

**5 · Gate it, then show a human.**

```bash
node scripts/check-draft.mjs <hook>                                  # readability + comprehension
npx tsx scripts/dryrun-drafts.mts                                    # the shared registry guards
npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-  # the REAL guard files
node scripts/preview-rewrite.mjs --html                              # draft JSON -> PREVIEW.html
```

⚠️ **A green gate on an UNWIRED family means nothing.** The three money drafts passed both
gates for a day while being checked by neither: their hooks are not in the registry, so every
deck-level guard skipped them and the run still printed a tick. Before trusting a gate on a new
family, feed it a deliberate violation and watch it fail.

### The four rules that decide whether it works

🔴 **Cut 3 answers, and the CARD is the warrant.** "He loves you" from a stranger is what her
friends say for free. "You pulled the card of intention, so the warmth was not one-sided" is
evidence-shaped, and she believes it. Never make HER FEELING the proof ("a feeling that strong
must be returned") — that is flattery that licences her to act on a guess.

🔴 **Cut 6 describes, it does not announce.** "You have been reading it right" is the psychic
ruling on her. "That is why he can feel close one moment and guarded the next" is her own week
handed back to her. She believes the second because it describes her life, not because someone
certified her. Same rule kills "you did not make it up" and "you are not crazy" — those repeat
the insult while denying it. Prefer "it was not one-sided", "he felt the shift too".

🔴 **Cut 7 names an OBSTRUCTION, and it is NARROW.** "What he never said" cannot be cleared;
"what goes up in him the moment this gets real" can. Act 1 sells an **Energy Clearing Ritual**
that removes "the shadow that's been blocking your path", and
`improve-v1/08-clearing-theme-coherence.md` found that clearing is SPRUNG at the pitch rather
than seeded. Cut 7 is where it gets seeded. Narrow beats broad — "let me look closer at what is
between you" tells her nothing about what comes next; naming the exact unresolved cause makes
the next question obvious to her before Evelyn asks it.

🔴 **The picture comes from the ART FILE, not from tarot convention.** She is looking at the
card. A detail that is not there reads as a lie and costs the trust the line was added to buy.

### What may now be said, and what may not

Loosened 2026-08-19. The rule is DIRECTIONAL: the half she came for is allowed, the half with a
victim is not. Nothing here was relaxed because it was inconvenient — each row is the answer the
ad already sold her.

| Family | Now allowed | Still banned |
|---|---|---|
| real-feelings | "he loves you", "he feels it" | "he does not love you" |
| still-feels | it survived | "he has moved on", "he has forgotten you" |
| reunion · reconciliation | it is not over | "he is gone for good", "it is over" |
| loneliness · searching | this is not forever; fate language | "you will always be alone"; suffering made purposeful |
| commitment | "he will commit" | "he never will"; a ruling on his capacity |
| soulmate-where · after-loss | the arrival promise, "closer than you think" | a PLACE; mediumship |
| missing-him | the hurt will pass | "you will always hurt" |
| twin-flame | "he feels it too" | the runner script; a promised return |
| pulling-away | reassurance | "he is losing interest" |

**Banned everywhere, and not up for negotiation:** a DATE (the only claim she can check, and a
failed one is a refund) · a quantified probability · mediumship · naming a real person as the
block · blaming or pathologising her · platform-flagged words.

**Deliberately NOT loosened.** `honesty` and `hidden-intuition` keep both doors shut — "he is
lying" convicts a real man and "he is telling the truth" vouches for one who may be defrauding
her, and neither is the hopeful direction. `why-he-left` and `missing-him` keep the motive ban,
because a man who falls silent may have died and supplying a reason presumes he chose it.
`cards-honest` / `cards-cheating` / `cards-real-person` / `cards-misled` keep the full interior
ban for the same reason. **All seven money bans stand** — the directional argument does not
reach a family where she can act on the reading with her actual savings.

⛔ **`cards-feels` and `cards-return` are OUT of the migration.** `cards-feels` is the control
for two live comparisons and its baseline already broke once on 2026-08-19. A second break
inside the same month makes both numbers unreadable.

### On a lander with no man in it

Cuts 4, 5 and 6 are written around a person. Money, loneliness and the self-frame hooks have
nobody to contradict, so the hinge moves — it does not disappear. For money the VOC supplies it
outright (*"I feel I am close to money only to have it vanish"*):

| Cut | With a man | Without one |
|---|---|---|
| 3 | her fear about him | her fear about **herself** — "it was never you" |
| 4 | what he holds back | where the thing in the way actually sits |
| 5 | feeling against action | **earning against keeping** |
| 6 | hot and cold | the **near-miss** — "it goes just as it is about to land" |

### What the arc is doing

> I see the card → this is what it means for your question → here is the answer you needed →
> but there is another layer → here is the contradiction → that explains what you have lived →
> **"I know exactly what needs to be cleared."**

Cuts 1-6 buy her trust. Cut 7 hands the sale a thread to pull.

---


## Choosing the frame — do this BEFORE you draft

🔴 **A new family that is in no frame set inherits `decode-him`, which says "This reading is
about HIM".** Aimed at a woman who has never met anyone, the model obeys it and invents a
man. Measured live on 2026-08-19: four new soulmate hooks, unframed, and the reply to a
70-year-old asking when her soulmate arrives was *"there's something you need to see
differently about **him**… what's actually holding you **both** in place."* There is no him.

The frames live in `server/lib/prompts.ts`, each a `Set` tested in order inside
`buildTarotReflectPrompt`. Read them before writing copy, and answer three questions:

| Question | If the answer is no |
|---|---|
| Does a real man exist in this headline? | It is not decode-him. Do not let it fall through. |
| Does an existing frame ban everything this headline can go wrong on? | You need a new frame. Say so before drafting. |
| Is the stricter frame tested first? | Reorder. Every frame in that ternary is ordered strictest-first on purpose. |

**A frame gap does not announce itself.** Each one so far was found by asking what the
headline asks for that the frame never mentions:

| Family | The gap | Why the standing bans missed it |
|---|---|---|
| soulmate-where | a PLACE | the clause withheld "a name, a date, or exactly who" — and omitted *where* |
| soulmate age-band | a DURATION | every frame bans a *date*; "not much longer" is a **length**, and a length is not a date |

### Write the ban as an instruction, not a prohibition

🔴 **A "never do X" does not beat a strong generative instinct.** The strongest pull in a
Version-C reply is to reflect back what she just typed. A frame that said *"never repeat her
age or anything she said about her health"* was ignored twice in three runs — *"Seventy
years…"*, *"A stroke at sixty-eight…"*. Replacing it with a positive instruction —
*"open on the card; acknowledge her feeling in words of your own, never in hers"* — stopped
it, and the refusal improved unprompted (*"I won't lie and give you a timeline"*).

Prohibit the thing AND name what to do instead. The instinct needs somewhere to go.

## Guard files

One per family, `tests/tarot-<family>-copy.test.ts`. Copy the newest sibling's shape.

🔴 **An unwired family is checked by NOTHING.** `scripts/wire-drafts-setup.mts` only patches
hooks the registry already has (`if (!reads?.[d.hook]) continue`), so for a new family every
deck-level guard skips and the run still prints a tick. Three money drafts passed both gates
for a day while being checked by neither. So the guard file must load **whichever source is
real** — the registry once wired, the draft JSON until then — and say which in its
`describe()`.

**Then prove it bites:** `node scripts/guard-tripwire.mjs <family>` injects a deliberate
violation per ban into the real draft files, asserts the suite fails, and restores
byte-for-byte. A gate that silently passes is worse than no gate.

### Negation exemptions: narrow for the ban, broad for the assertion

Correct copy names a banned thing in order to refuse it, so every guard exempts clauses
carrying a negator. 🔴 **That blanket exemption is wrong wherever the violation itself
carries one.** `"it won't be long now"` IS the duration violation, and a blanket negator
exemption waves through the exact sentence the ban exists to stop.

Two patterns, kept separate:

- **The exemption** — narrow. Only the reader *declining* ("I won't…", "no reader can…").
  Every phrase added here punches a hole in the ban.
- **The presence assertion** — broad. "Did the read decline out loud?" Widening it can only
  ever demand more of the copy.

Merging them means every new way of saying "I can't tell you" becomes a new way to smuggle
the banned thing past.

### Write the patterns against the MODEL's vocabulary, not your own

A guard written while reading your own draft learns your draft's wording. Ban patterns for
self-blame written against copy that says *"you keep choosing"* scored **clean** on the
model's actual output — *"a pattern your soul is ready to break"*, *"what keeps pulling you
toward the wrong ones"*. Run the generated path first (below), then write the patterns
against what came back.

## Smoke the generated path before wiring

The guard file covers the canned bubbles. It cannot cover the Version-C reply the model
writes to what she actually types — and that is the half where the frame either holds or
does not. Build the real prompt with `buildTarotReflectPrompt`, send a real answer drawn
from the VOC pull, and scan the reply with the guard's own ban patterns. Two configurations
minimum: as it stands today, and with the proposed frame swapped in. If the frame does not
measurably reduce violations, it is not the right frame yet.

### Worked example — `cards-alone-forever` on `return-mhf`, card a — DRAFTED, not yet live

The ad asked **"Will I be alone forever?"**. Bubble by bubble:

**1 · THE PICTURE**

> You turned the Magician, dear. Look — his white inner robe shows at the neck and the wrists.

She is looking at that card while she reads this. Every detail is on the art, so she checks it in one second without deciding to. That is the credit everything after it spends.

**2 · THE BRIDGE**

> You asked me about alone and forever. Your hand went to the man still at work.

Her question back, so she knows she is on the right page — then the card in plain English, because that is what makes the next line evidence rather than an opinion.

**3 · THE ANSWER**

> So I will not tell you how long, dear. Nobody honestly can.

The clearest line on the page, and it answers the fear rather than the headline. The CARD carries it; a stranger asserting it carries nothing.

**4 · THE HIDDEN LAYER**

> And there's no clock anywhere on his table, dear.

Adds something she could not see. If this restates cut 3 in different words, the read has stalled and she can feel it.

**5 · THE CONTRADICTION**

> But you said forever, dear, and I don't think you meant years.

The turn. Why his behaviour does not match the answer she just got — this is what is left unresolved, and it is the only reason there is anything to buy.

**6 · THE RECOGNITION**

> That's why it lands so heavy, dear. Forever is the weight of it.

Her own week handed back to her. Not "you were right about him" (that is the psychic ruling on her) but the specific thing she has watched happen.

**7 · THE NEXT MYSTERY**

> Let me look closer at what has made this so heavy to carry…

Not an absence. Something is **sitting between** them, named narrowly enough that she already knows what the next question is. Objects can be moved.

### Why cut 7 matters — the thread landing

Forty turns later Evelyn says this, and it is already in the code:

> "I know exactly what needs to be cleared. But I need your full permission to begin."
> "What you need, Sarah, is an Energy Clearing Ritual — I'll focus entirely on removing the shadow that's been blocking your path."
> "I'll trace the roots of this block, sever its hold, and seal the clearing so it can't return."

With an ABSENCE in cut 7, *"the shadow that's been blocking your path"* is the first
she has heard of any shadow. A block appears at minute eight and a ritual is sold to
remove it.

With an OBSTRUCTION, she was told something was in the way in the first thirty seconds —
by the card, before Evelyn had anything to sell. The pitch is not a swerve. It is Evelyn
finally naming the thing the card already showed her.

### The whole arc

| Cut | What she does |
|---|---|
| 1 | *That's really what's on the card* |
| 2 | *I picked this one* |
| 3 | *So there IS an answer* |
| 4 | *And there's more to it than I knew* |
| 5 | *But that's not the whole of it* |
| 6 | *That's exactly what my week has been like* |
| 7 | *…so THAT's what's in the way* |
| ↓ | **"I know exactly what needs to be cleared."** |

Cuts 1–6 buy her trust. Cut 7 hands the sale a thread to pull. That is the
difference between a lander that validates her and a lander that sells.

⚠️ **Cut 7 is the one piece with no evidence behind it.** Cuts 1–6 were checked
against 400 real concerns, and that check changed the copy. The obstruction framing is
reasoning from how the offer works, not an observation — and at this traffic
(96% on three hooks) a test will not settle it either. Ship it knowing that.

⚠️ **Most drafts in the queue predate this framework.** Everything written before
2026-08-19 — the wired `cards-return` / `cards-will-commit` / `cards-feels`, and the bulk
of the drafts awaiting sign-off — was built to REFUSE rather than answer, because the
guards required it. They pass the gate and they read well. They are not the thing to
copy. Copy the worked example above, which is written to the cuts.

---

Full version, with the reasoning behind each rule:
`.claude/skills/v1-funnel-audit/SKILL.md` § "Migrating a lander".

Work top-down: families are ordered by how much unreadable copy they hold.

---

# Track A — the 88 live landers

## self-frame — 4/4 clean · 0 problems

⚠️ **No dedicated guard file** (`tests/tarot-self-frame-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [x] `cards-love-again` `arcana-mfh` — "Will I love again?" · clean
- [x] `cards-soulmate` `arcana-mfh` — "When is my soulmate coming?" · clean
- [x] `cards-love-again` `arcana-eef` — "Will I love again?" · clean
- [x] `cards-soulmate` `arcana-eef` — "When is my soulmate coming?" · clean

## decode-him — 12/12 clean · 0 problems

⚠️ **No dedicated guard file** (`tests/tarot-decode-him-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [x] `cards-honest` `arcana-mfh` — "Is he being honest with you?" · clean
- [x] `cards-return` `arcana-mfh` — "Will he come back?" · clean
- [x] `cards-feels` `arcana-mfh` — "How does he really feel about you?" · clean
- [x] `cards-cheating` `arcana-mfh` — "Is he cheating on you?" · clean
- [x] `cards-honest` `arcana-eef` — "Is he being honest with you?" · clean
- [x] `cards-return` `arcana-eef` — "Will he come back?" · clean
- [x] `cards-feels` `arcana-eef` — "How does he really feel about you?" · clean
- [x] `cards-cheating` `arcana-eef` — "Is he cheating on you?" · clean
- [x] `cards-return` — "Will he come back?" · clean
- [x] `cards-honest` — "Is he being honest with you?" · clean
- [x] `cards-feels` — "How does he really feel about you?" · clean
- [x] `cards-cheating` — "Is he cheating on you?" · clean

## trust — 6/6 clean · 0 problems

⚠️ **No dedicated guard file** (`tests/tarot-trust-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [x] `cards-who-he-is` `arcana-mfh` — "Is he really who he says he is?" · clean
- [x] `cards-real-person` `arcana-mfh` — "Is he the real person, or just a picture?" · clean
- [x] `cards-misled` `arcana-mfh` — "Am I being misled?" · clean
- [x] `cards-who-he-is` — "Is he really who he says he is?" · clean
- [x] `cards-real-person` — "Is he the real person, or just a picture?" · clean
- [x] `cards-misled` — "Am I being misled?" · clean

## commitment — 6/6 clean · 0 problems

`tests/tarot-commitment-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-will-commit` `arcana-mfh` — "Will he ever commit?" · clean
- [x] `cards-wont-commit` `arcana-mfh` — "Why won't he commit to me?" · clean
- [x] `cards-ready-commit` `arcana-mfh` — "Is he ever going to be ready for real commitment?" · clean
- [x] `cards-will-commit` — "Will he ever commit?" · clean
- [x] `cards-wont-commit` — "Why won't he commit to me?" · clean
- [x] `cards-ready-commit` — "Is he ever going to be ready for real commitment?" · clean

## honesty — 3/3 clean · 0 problems

`tests/tarot-honesty-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-lied-to` — "Am I being lied to?" · clean
- [x] `cards-truth` — "Is he telling me the truth?" · clean
- [x] `cards-deceived` — "Am I being deceived?" · clean

## reunion — 3/3 clean · 0 problems

`tests/tarot-reunion-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-come-back` — "Will he come back?" · clean
- [x] `cards-ever-back` — "Will he ever come back to me?" · clean
- [x] `cards-moved-on` — "Is he coming back, or has he moved on?" · clean

## healing — 3/3 clean · 0 problems

`tests/tarot-healing-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-cant-stop` — "Why can't I stop thinking about him?" · clean
- [x] `cards-on-my-mind` — "Why is he always on my mind?" · clean
- [x] `cards-who-hurt-me` — "Why do I still think about someone who hurt me?" · clean

## pulling-away — 3/3 clean · 0 problems

`tests/tarot-pulling-away-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-pulling-away` — "Why is he pulling away from me?" · clean
- [x] `cards-gone-cold` — "Why has he gone cold on me?" · clean
- [x] `cards-losing-interest` — "Is he losing interest, or just going through something?" · clean

## reconciliation — 3/3 clean · 0 problems

`tests/tarot-reconciliation-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-back-together` — "Will we get back together?" · clean
- [x] `cards-still-a-chance` — "Is there still a chance for us?" · clean
- [x] `cards-really-over` — "Is it really over between us?" · clean

## soulmate-after-loss — 3/3 clean · 0 problems

`tests/tarot-soulmate-after-loss-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-new-soulmate` — "Will I find a new soulmate after loss?" · clean
- [x] `cards-soulmate-out-there` — "Is there still a soulmate out there for me?" · clean
- [x] `cards-ready-to-love` — "Am I ready to love again after losing him?" · clean

## soulmate-where — 3/3 clean · 0 problems

`tests/tarot-soulmate-where-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-where-soulmate` — "Where is my soulmate right now?" · clean
- [x] `cards-soulmate-closer` — "Is my soulmate closer than I think?" · clean
- [x] `cards-not-found-yet` — "Why haven't I found my soulmate where I am?" · clean

## loneliness — 3/3 clean · 0 problems

`tests/tarot-loneliness-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-alone-forever` — "Will I be alone forever?" · clean
- [x] `cards-meant-alone` — "Am I meant to be alone?" · clean
- [x] `cards-someone-for-me` — "Is there really someone out there for me?" · clean

## fidelity — 4/4 clean · 0 problems

`tests/tarot-fidelity-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-someone-else` — "Is there someone else?" · clean
- [x] `cards-talking-someone` — "Is he talking to someone else?" · clean
- [x] `cards-faithful` — "Is he being faithful to me?" · clean
- [x] `cards-loyal` — "Is he loyal to only me?" · clean

## missing-him — 3/3 clean · 0 problems

`tests/tarot-missing-him-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-stop-hurting` — "I miss him so much — will this ever stop hurting?" · clean
- [x] `cards-stop-missing` — "Will I ever stop missing him?" · clean
- [x] `cards-still-miss-him` — "Why do I still miss him after everything?" · clean

## why-he-left — 3/3 clean · 0 problems

`tests/tarot-why-he-left-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-left-without-word` — "Why did he leave without a word?" · clean
- [x] `cards-ghosted` — "Why did he ghost me?" · clean
- [x] `cards-not-enough` — "Was I not enough for him to stay?" · clean

## searching — 3/3 clean · 0 problems

`tests/tarot-searching-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-stop-searching` — "Am I ever going to stop searching?" · clean
- [x] `cards-end-up-alone` — "Why do I keep ending up alone?" · clean
- [x] `cards-given-up` — "Have I given up on love without realizing it?" · clean

## twin-flame — 3/3 clean · 0 problems

`tests/tarot-twin-flame-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-twin-ready` — "Is my twin flame ready for me?" · clean
- [x] `cards-twin-feels` — "Does my twin flame feel this too?" · clean
- [x] `cards-twin-back` — "Is my twin flame coming back to me?" · clean

## hidden-intuition — 2/2 clean · 0 problems

`tests/tarot-hidden-intuition-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-hiding-something` — "Is he hiding something from me?" · clean
- [x] `cards-feels-off` — "Something feels off — is my intuition right?" · clean

## real-feelings — 3/3 clean · 0 problems

`tests/tarot-real-feelings-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-really-love` — "Does he really love me?" · clean
- [x] `cards-feel-about-me` — "How does he really feel about me?" · clean
- [x] `cards-imagining-it` — "Does he love me, or am I imagining it?" · clean

## still-feels — 3/3 clean · 0 problems

`tests/tarot-still-feels-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-still-think` — "Does he still think about me?" · clean
- [x] `cards-still-love` — "Does he still love me?" · clean
- [x] `cards-love-or-moved-on` — "Does he still love me, or has he moved on?" · clean

## his-other-life — 5/5 clean · 0 problems

`tests/tarot-his-other-life-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-forever-or-now` — "Am I his forever, or his now?" · clean
- [x] `cards-his-children` — "Why do his children come before me?" · clean
- [x] `cards-her-shadow` — "Am I living in her shadow?" · clean
- [x] `cards-live-apart` — "Why do we still live apart?" · clean
- [x] `cards-too-long` — "Have I already given him too long?" · clean

## soulmate-label — 3/3 clean · 0 problems

`tests/tarot-soulmate-label-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-really-soulmate` — "Is he really my soulmate?" · clean
- [x] `cards-twin-or-connection` — "Is he my twin flame, or just a strong connection?" · clean
- [x] `cards-met-already` — "Have I already met my soulmate without realizing it?" · clean

## money-retiring — 3/3 clean · 0 problems

`tests/tarot-money-block-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-blocked-retiring` — "Why is my money still blocked this close to retiring?" · clean
- [x] `cards-nest-egg` — "How long has something been blocking me from a nest egg?" · clean
- [x] `cards-too-late` — "Is something blocking my money, or did I just leave it too late?" · clean

## money-working — 3/3 clean · 0 problems

`tests/tarot-money-block-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-still-working` — "Why am I still working when the money should have come by now?" · clean
- [x] `cards-how-much-longer` — "How much longer will something keep blocking my money?" · clean
- [x] `cards-out-of-time` — "Is something still blocking my money, or have I run out of time?" · clean

## money-energy — 3/3 clean · 0 problems

`tests/tarot-money-block-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-my-energy` — "Is my energy blocking my money?" · clean
- [x] `cards-money-wont-stay` — "What does my energy say about why money won't stay?" · clean
- [x] `cards-energy-how-long` — "How long has my energy been working against my money?" · clean

## money-prayer — 2/2 clean · 0 problems

`tests/tarot-money-block-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [x] `cards-prayed-years` — "I've prayed about money for years. What's still blocking it?" · clean
- [x] `cards-prayers-unanswered` — "How long will my prayers for money keep going unanswered?" · clean

---

# Track B — the money batch (not built yet)

The first non-love territory on the funnel. Deck: `return-mhf`, face-down, no new art.
Draft + the 7 bans + the wiring list: `fb-tarot/docs/drafts/money-block.draft.md`.

🔴 **The 33 reveals in that draft must be REWRITTEN, not just wired.** Scored against this
gate they carry ~176 problems — the same failure rate `cards-return` had before its
rewrite. Track B's copy work is the four steps above, run on 11 new hooks: pull the VOC,
find the fear under the question, write the seven cuts, chain them, gate and preview.

Two of the steps land differently on money and are worth flagging before drafting:

- **Step 1 has no data yet.** These hooks have never run, so `voc-by-hook.mjs` returns
  nothing. The nearest real corpus is `docs/v1-money-bucket-voc.md` — 10,514 money
  concerns from V1, already themed. Read that instead of skipping the step.
- **Cut 7 is easier here, and cuts 4-6 are harder.** The block IS the headline, so the
  obstruction practically writes itself. The hinge is the problem: cuts 4, 5 and 6 are
  written around a person and there is nobody here to contradict. Use the money
  translation in the framework above — cut 3 answers her fear about HERSELF ("it was
  never you"), cut 5 becomes the EARNING against the KEEPING, and cut 6 names the
  near-miss, which is the VOC's own sentence: *"I feel I am close to money only to have
  it vanish."*
- **Cut 3 must not concede the self-blame the `money-energy` headlines offer** ("Is my
  energy blocking my money?"). Affirm the noticing, refuse the fault, exactly as
  `hidden-intuition` splits it — and note that **none of the seven money bans was
  loosened** on 2026-08-19. The directional argument does not reach a family where she
  can act on the reading with her own savings.

**Structural work these 11 need that no love lander did:**

- [x] `hookToBucket()` returns `'money'` for the 11 — done 2026-08-19, `tarotReads.ts`.
      This is the load-bearing one: it sets `userData.bucket`, which steers the whole V1 chat
      after the opener. V1 already has a full money path (`MONEY_BUCKET_PROMPT`), so the flip
      routes her into an established path rather than needing new prompt work.
- [x] Per-hook tap instruction — done 2026-08-19: `hookInstruction` on `CardSetConfig`, read via
      `instructionFor()` in `TarotBridge.tsx`. The deck line says *"Think of the man on your mind."*
- [x] Money frame in `buildTarotReflectPrompt` — done 2026-08-19, tested FIRST. **Insurance, not a pillar.** Version C is
      unreachable on tarot today (`/fb-tarot/c` 302s to `/b`), so this only runs if a hook is
      ever enrolled in the version experiment.
- [x] 4 angles, 4 family arrays, `TAROT_HOOKS` / `HEADLINES` / `TAROT_QUESTION`,
      `TAROT_HOOK_CONTEXT` / `TAROT_HOOK_TENDENCY`, `validHooks` in `routes.ts`, `STATUS.md`.
- [x] `tests/tarot-money-block-copy.test.ts` — written 2026-08-19, and every one of the 7 bans was fed a deliberate violation and fired (no amount/date/source · never name a
      person as the block · no financial advice · never blame her · never "too late" and never a
      promised arrival · never rule on God · never presume her finances).

## money-retiring (55–64) — 0/3 built

- [x] `cards-blocked-retiring` — "Why is my money still blocked this close to retiring?" · 3 reveals
- [x] `cards-nest-egg` — "How long has something been blocking me from a nest egg?" · 3 reveals
- [x] `cards-too-late` — "Is something blocking my money, or did I just leave it too late?" · 3 reveals

## money-working (65+) — 0/3 built

- [x] `cards-still-working` — "Why am I still working when the money should have come by now?" · 3 reveals
- [x] `cards-how-much-longer` — "How much longer will something keep blocking my money?" · 3 reveals
- [x] `cards-out-of-time` — "Is something still blocking my money, or have I run out of time?" · 3 reveals

## money-energy — 0/3 built

- [x] `cards-my-energy` — "Is my energy blocking my money?" · 3 reveals
- [x] `cards-money-wont-stay` — "What does my energy say about why money won't stay?" · 3 reveals
- [x] `cards-energy-how-long` — "How long has my energy been working against my money?" · 3 reveals

## money-prayer — 0/2 built

- [x] `cards-prayed-years` — "I've prayed about money for years. What's still blocking it?" · 3 reveals
- [x] `cards-prayers-unanswered` — "How long will my prayers for money keep going unanswered?" · 3 reveals
