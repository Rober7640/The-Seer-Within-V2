<!-- 🔒 CANONICAL. This file is the ONE source for the Natural Tarot-Cut.
     It is READ AND INLINED into fb-tarot/docs/copy-migration-checklist.md by
     .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist, so the operator's
     page stays self-contained without a second copy on disk.
     Before 2026-08-19 the method existed in THREE places — the generator's FRAMEWORK
     const, v1-funnel-audit/SKILL.md, and the generated checklist — and they had already
     begun to disagree. Edit here; everything else points at it. -->

# The Natural Tarot-Cut

How a /fb-tarot lander is written. Applies to a rewrite of a live lander and to a brand-new
hook alike — the only difference is that a new hook has no traffic, so step 1 changes tool.

> 🔀 **There are now TWO methods, and this is the incumbent.** The other is the **Inherited
> Shadow** (3 beats) — `fb-tarot/docs/inherited-shadow-cut.md`. Neither supersedes the other.
> Where this method's cut 3 **answers** her question flat, that one **withholds** it behind a
> block passed down her family line, to hand the pitch a live problem instead of springing the
> clearing on her. `fb-tarot-hooks` asks the operator which to use at stage 0, per family.
>
> **Everything below still applies to both** except the cut table, the connective order, and
> whether cut 3 answers. §"How Evelyn sounds", the directional ban table, §"Choosing the frame"
> and §"Guard files" are shared, and the shadow doc deliberately does not restate them.
>
> ⚠ This file is the only one the checklist generator inlines, so
> `fb-tarot/docs/copy-migration-checklist.md` describes the 7-cut method **only**. A
> shadow-method family is not covered by the generated checklist.

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

### How Evelyn sounds — the four voice rules

The four rules above decide whether the read WORKS. These four decide whether it sounds like a
person. They are the operator's own corrections, each one written down after it had already cost
a batch, and three of the four are now machine-checked — the fourth is judgement.

**1 · Picture before meaning.** Describe what is literally on the card, THEN what it means. The
art is attached to message 1, so she is looking at it while she reads. No metaphor she has to
decode first, and no detail that is not on the card — a detail she cannot find reads as a lie
and costs the trust the line was added to buy. *Enforced:* beat-1 uniqueness across the deck
(the guard files) and "the picture comes from the ART FILE" above. *Operator, 2026-08-18.*

**2 · Grade 5 is not the same as comprehensible.** The numeric gate counts syllables and
sentence length; it cannot see abstraction. It passed *"It is not a length."* — grade 2, and she
still stops. Three specific failures follow from that, all of them now caught:

- Never open a bubble on a bare *It / That / This / They*. Each bubble is its own chat message
  with a typing pause, so the referent has scrolled. *"That gap is real"* is fine — the noun is
  attached.
- No concept-nouns. Not *a length*, *the premise*, *the unknown*, *mid-air*. Name the thing.
- Never make her analyse her own wording. Do that work for her.

*Enforced:* the COMPREHENSION rules in `scripts/check-draft.mjs`. *Operator, 2026-08-19.*

**3 · Conversational — she is being spoken to, not written at.** The signed-off landers run
**83–100% contractions**; treat 60% as the floor and anything under it as a defect. Then two
shapes that make copy sound written even when the contractions are there:

- **No balanced clauses.** *"Drawing it in is one job; keeping it is a second one."*
- **No aphorisms.** A line that would work on a fridge magnet is not about the woman reading it.
  *"Stopped and gone are not the same." · "Careful looks the same from outside." · "Waiting is
  not the same as leaving."* Measured 2026-08-20: the signed-off landers contain **zero**; the
  batch the operator flagged as flowery carried up to three per lander. The tell is that the
  sentence would survive unchanged on any other lander on the funnel.

⚠ **Never run a blind contraction regex over copy.** One produced *"which one it's"* and *"the
most modest thing there's"*. Contract by hand, clause by clause.

⚠ **Do NOT strip the short verbless tail** — *"One thing at a time, and quietly." · "Close, and
then quiet."* It reads flowery in isolation, and it is not: there are 246 across the wired
corpus, it is house style, and removing them makes the copy stiffer rather than plainer. This
was very nearly "fixed" on 2026-08-20 and measuring stopped it.

*Enforced:* the aphorism patterns and the per-lander contraction floor in `check-draft.mjs`.

**4 · She is the subject, and the card figure is a prop.** The `return-mhf` figures are all male,
so leaning on one as the subject of the read silently turns a soulmate lander into reunion copy:
written as an ACTOR — *"he is walking", "he can't reach it", "he isn't falling", "he's out in
full sun"* — a reader hears a specific man who is stalled, held, or on his way back. That is the
`cards-back-together` job, not a read about someone she has not met.

In cuts 2–7 SHE is the subject. The figure may be DESCRIBED — *"he hangs with no road and no map
behind him"* — but never given intent or motion toward her. **Cut 1 is exempt**: describing the
figure IS the picture, and that is its job.

Measured benchmark: the shipped soulmate families run **0.41–0.63** he/him/his per registry beat
2–4. The first age-band drafts ran roughly double, and 36 of 144 middle bubbles put the figure in
the subject slot. *Enforced:* the ACTOR ban and the density check in the soulmate guard files.
*Operator, 2026-08-19: "soulmate landers are not about will we get back together."*

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
