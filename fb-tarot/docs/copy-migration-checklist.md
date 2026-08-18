# /fb-tarot copy migration — checklist

Two tracks: **A** rewrites the 88 landers already live; **B** builds the 11 new money landers.

> 🤖 **GENERATED — do not hand-edit.** Rewrite it with
> `node .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist`.
> The tick is derived from the gate, not from anyone remembering to tick it, so this file
> can never claim a lander is done when the code says otherwise.

`█░░░░░░░░░░░░░░░░░░░`  **6 / 88 landers clean** · 1748 gate problems left

Rules: ≤25 words · ≤2 sentences · grade ≤5 · ≤3 syllables · ≤2 negatives per sentence · echo the ad in bubbles 1–2 · no banned constructions.

**A lander is one deck × one hook.** Most hooks live only on `return-mhf` (the default
face-down deck every live ad points at); a few also have `arcana-mfh` / `arcana-eef` /
`decode-him` variants, and an edit must be applied to **every** deck carrying the hook or
the parity test fails.

**Three states per lander:** blank = not started · 📝 DRAFTED = copy written and gated,
waiting on your go (read it in `fb-tarot/docs/drafts/rewrites/PREVIEW.md`) · `[x]` = wired
and passing. Nothing is wired before you have seen it.

📝 awaiting sign-off right now: `cards-feels`, `cards-who-he-is`

🔴 **Known content bug, `decode-him` deck.** All four of its hooks open with the SAME
beat 1 per card ("You turned the Sun, dear — the card of what stands in the light." serves
cards-honest, cards-return, cards-feels AND cards-cheating). Every other family has a test
forbidding this; decode-him has no guard file, so it was never caught. Each rewrite there
must write a fresh beat 1 — `scripts/preview-rewrite.mjs` fails the preview if it collides.

## How a lander gets rewritten

**1 · Read what she actually typed.** Not the headline — her words.

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/voc-by-hook.mjs \
  --live --hook <hook>          # read-only, output is gitignored
```

Working the intent out from the headline gets you close and confidently wrong. On
`cards-who-he-is` it produced copy that ACQUITTED a man — and a large share of that
lander's readers have never met the man, and some are being defrauded by him.

**2 · Find the intent.** The question is carried by one word, not by its subject.

- *Which word is doing the work?* `really` = did it ever amount to love · `still` = did it
  survive · `ever` = she has waited long enough to be asking whether to stop.
- *What answer would she actually accept?* "He loves you" is what her friends say for free.
  "The warmth you felt was real" certifies HER evidence, and she believes it.
- *What has she already been told?* Overthinking. Clinging. Imagining it. The read exists to
  refuse that.
- *Can the question be answered at all?* Some are traps where every literal answer harms.
  Then split it — affirm the noticing, leave the meaning open.

Cross-check against the hook's own entry in `TAROT_HOOK_TENDENCY` (`server/lib/prompts.ts`)
before writing. It carries the bans, and they are there because someone thought about this hook.

**3 · Write the seven bubbles.** Four registry beats; beat 3 carries four bubbles.

| # | Beat | Job | Without it |
|---|---|---|---|
| 1 | 1 | **The picture** — what is literally on the card | She has nothing to check, so she discounts everything after |
| 2 | 2 | **The echo + the pull** — her question back, then *where her hand went* | It reads as a horoscope. The pull makes her the author |
| 3 | 3 | **The payoff** — certify HER evidence, never his heart | She got no answer and feels conned |
| 4 | 3 | **The reason why** — tie it back to the card | Bubble 3 is flattery with nothing carrying it |
| 5 | 3 | **The gap** — answers the SHAPE, withholds the CONTENT | The question closes and there is nothing left to buy |
| 6 | 3 | **The absolution** — name the accusation, refuse it | The most valuable line on the page goes unsaid |
| 7 | 4 | **The object** — something *sitting between her and what she wants* | The clearing ritual arrives from nowhere at minute eight |

**The order is doing work.**

- **Payoff before gap.** Reverse them and she feels short-changed before she has been given
  anything.
- **Absolution last of the read.** It is the only line that is about *her*, so it is the note
  she carries into the chat.
- **Object last of all.** It is the handover, and the one line that has to survive into the sale.

**4 · Gate it, then show a human.**

```bash
node scripts/preview-rewrite.mjs --html    # draft JSON -> PREVIEW.html, exits 1 if unwirable
```

### The three rules that decide whether it works

🔴 **Bubble 3 is about her PERCEPTION, never his heart.** Not delicacy — the only version she
believes, and what the per-hook bans require.

🔴 **Bubble 7 names an OBSTRUCTION, not an absence.** "What he never said" cannot be cleared;
"what sits between you and a straight answer" can. Act 1 sells an **Energy Clearing Ritual**
that removes "the shadow that's been blocking your path", and
`improve-v1/08-clearing-theme-coherence.md` found that clearing is SPRUNG at the pitch rather
than seeded. Bubble 7 is where it gets seeded — and the object goes between HER and what she
wants, because the love bucket frames every block as an impersonal thing in her path precisely
so that removing it blames nobody.

🔴 **The picture comes from the ART FILE, not from tarot convention.** She is looking at the
card. A detail that is not there reads as a lie and costs the trust the line was added to buy.

### What the arc is doing

> She sees the card is real → she picked it, so the reading is hers → her instinct was right →
> but something is in the way → **"I know exactly what needs to be cleared."**

Bubbles 1-6 buy her trust. Bubble 7 hands the sale a thread to pull.

---

### Worked example — `cards-feels` on `return-mhf`, card a — DRAFTED, not yet live

The ad asked **"How does he really feel about you?"**. Bubble by bubble:

**1 · THE PICTURE**

> You turned the Magician, dear. Look — a red robe over white, and a loop above his head with no end to it.

She is looking at that card while she reads this. Every detail is on the art, so she checks it in one second without deciding to. That is the credit everything after it spends.

**2 · THE ECHO + THE PULL**

> You asked how he really feels. Your hand went to the man who does nothing by accident.

First half: she is on the right page. The second half is the one that matters — *her hand went*. The reading is now hers, not the card's.

**3 · THE PAYOFF**

> So the warmth you felt was not made up, dear.

Note what it certifies: **her evidence**. Not his heart. Say "he loves you" and she does not believe you — her friends say that for free.

**4 · THE REASON WHY**

> A man like this doesn't warm to someone by accident.

Ties the payoff back to the card. Without this, bubble 3 is a compliment. With it, it is evidence.

**5 · THE GAP**

> What he hasn't done is say it out loud.

She now has something real **and** something unfinished. This is what keeps the question alive.

**6 · THE ABSOLUTION**

> That gap is real, dear. You've been reading it right.

The accusation she walked in with — *you are overthinking it, you are inventing it* — named and refused. The line she will remember.

**7 · THE OBJECT**

> Let me look closer at what's sitting between you and the words…

Not an absence. Something is **sitting between** them. An object. Objects can be moved.

### Why bubble 7 matters — the thread landing

Forty turns later Evelyn says this, and it is already in the code:

> "I know exactly what needs to be cleared. But I need your full permission to begin."
> "What you need, Sarah, is an Energy Clearing Ritual — I'll focus entirely on removing the shadow that's been blocking your path."
> "I'll trace the roots of this block, sever its hold, and seal the clearing so it can't return."

With an ABSENCE in bubble 7, *"the shadow that's been blocking your path"* is the first
she has heard of any shadow. A block appears at minute eight and a ritual is sold to
remove it.

With an OBSTRUCTION, she was told something was in the way in the first thirty seconds —
by the card, before Evelyn had anything to sell. The pitch is not a swerve. It is Evelyn
finally naming the thing the card already showed her.

### The whole arc

| Bubble | What she does |
|---|---|
| 1 | *That's really what's on the card* |
| 2 | *I picked this one* |
| 3–4 | *So I wasn't imagining it* |
| 5 | *But something's still missing* |
| 6 | *I wasn't crazy after all* |
| 7 | *…something's in the way* |
| ↓ | **"I know exactly what needs to be cleared."** |

Bubbles 1–6 buy her trust. Bubble 7 hands the sale a thread to pull. That is the
difference between a lander that validates her and a lander that sells.

⚠️ **Bubble 7 is the one piece with no evidence behind it.** Bubbles 1–6 were checked
against 400 real concerns, and that check changed the copy. The obstruction framing is
reasoning from how the offer works, not an observation — and at this traffic
(96% on three hooks) a test will not settle it either. Ship it knowing that.

⚠️ **The already-wired landers map only loosely.** `cards-return` and
`cards-will-commit` were written before the middle bubbles had names, so they carry the
payoff and the absolution but not always a distinct gap. They pass the gate and they
read well; they are just not the thing to copy. Copy the shape above.

---

Full version, with the reasoning behind each rule:
`.claude/skills/v1-funnel-audit/SKILL.md` § "Migrating a lander".

Work top-down: families are ordered by how much unreadable copy they hold.

---

# Track A — the 88 live landers

## decode-him — 4/16 clean · 166 problems

⚠️ **No dedicated guard file** (`tests/tarot-decode-him-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [ ] `cards-honest` `arcana-eef` — "Is he being honest with you?" · **18**
- [ ] `cards-cheating` — "Is he cheating on you?" · **17**
- [ ] `cards-cheating` `arcana-mfh` — "Is he cheating on you?" · **15**
- [ ] `cards-honest` — "Is he being honest with you?" · **15**
- [ ] `cards-honest` `arcana-mfh` — "Is he being honest with you?" · **14**
- [ ] `cards-feels` — "How does he really feel about you?" · **14** · 📝 **DRAFTED — awaiting sign-off**
- [ ] `cards-feels` `arcana-mfh` — "How does he really feel about you?" · **13** · 📝 **DRAFTED — awaiting sign-off**
- [ ] `cards-cheating` `arcana-eef` — "Is he cheating on you?" · **13**
- [ ] `cards-honest` `decode-him` — "Is he being honest with you?" · **12**
      🔴 B2 — decode-him-strip.png is the fb-PALM thumb strip, not tarot art, and there is no revealStrip. These 4 cannot take a picture line until the art is settled or the deck is retired.
- [ ] `cards-cheating` `decode-him` — "Is he cheating on you?" · **12**
- [ ] `cards-feels` `arcana-eef` — "How does he really feel about you?" · **12** · 📝 **DRAFTED — awaiting sign-off**
- [ ] `cards-feels` `decode-him` — "How does he really feel about you?" · **11** · 📝 **DRAFTED — awaiting sign-off**
- [x] `cards-return` `decode-him` — "Will he come back?" · clean
- [x] `cards-return` `arcana-mfh` — "Will he come back?" · clean
- [x] `cards-return` `arcana-eef` — "Will he come back?" · clean
- [x] `cards-return` — "Will he come back?" · clean

## his-other-life — 0/5 clean · 120 problems

`tests/tarot-his-other-life-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-forever-or-now` — "Am I his forever, or his now?" · **26**
- [ ] `cards-live-apart` — "Why do we still live apart?" · **26**
- [ ] `cards-her-shadow` — "Am I living in her shadow?" · **25**
- [ ] `cards-his-children` — "Why do his children come before me?" · **22**
- [ ] `cards-too-long` — "Have I already given him too long?" · **21**

## trust — 0/6 clean · 116 problems

⚠️ **No dedicated guard file** (`tests/tarot-trust-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [ ] `cards-who-he-is` — "Is he really who he says he is?" · **20** · 📝 **DRAFTED — awaiting sign-off**
- [ ] `cards-real-person` — "Is he the real person, or just a picture?" · **20**
- [ ] `cards-who-he-is` `arcana-mfh` — "Is he really who he says he is?" · **19** · 📝 **DRAFTED — awaiting sign-off**
- [ ] `cards-real-person` `arcana-mfh` — "Is he the real person, or just a picture?" · **19**
- [ ] `cards-misled` `arcana-mfh` — "Am I being misled?" · **19**
- [ ] `cards-misled` — "Am I being misled?" · **19**

## fidelity — 0/4 clean · 101 problems

`tests/tarot-fidelity-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-someone-else` — "Is there someone else?" · **28**
      ⚠️ STUDY FIRST — best converter on the funnel (9.8%). A grade-5 pass could remove what works.
- [ ] `cards-loyal` — "Is he loyal to only me?" · **25**
- [ ] `cards-talking-someone` — "Is he talking to someone else?" · **24**
- [ ] `cards-faithful` — "Is he being faithful to me?" · **24**

## twin-flame — 0/3 clean · 85 problems

`tests/tarot-twin-flame-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-twin-back` — "Is my twin flame coming back to me?" · **32**
- [ ] `cards-twin-ready` — "Is my twin flame ready for me?" · **28**
- [ ] `cards-twin-feels` — "Does my twin flame feel this too?" · **25**

## reconciliation — 0/3 clean · 84 problems

`tests/tarot-reconciliation-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-still-a-chance` — "Is there still a chance for us?" · **29**
- [ ] `cards-really-over` — "Is it really over between us?" · **29**
- [ ] `cards-back-together` — "Will we get back together?" · **26**

## soulmate-after-loss — 0/3 clean · 80 problems

`tests/tarot-soulmate-after-loss-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-new-soulmate` — "Will I find a new soulmate after loss?" · **29**
- [ ] `cards-ready-to-love` — "Am I ready to love again after losing him?" · **26**
- [ ] `cards-soulmate-out-there` — "Is there still a soulmate out there for me?" · **25**

## commitment — 2/6 clean · 78 problems

`tests/tarot-commitment-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-ready-commit` — "Is he ever going to be ready for real commitment?" · **22**
- [ ] `cards-ready-commit` `arcana-mfh` — "Is he ever going to be ready for real commitment?" · **20**
- [ ] `cards-wont-commit` `arcana-mfh` — "Why won't he commit to me?" · **18**
- [ ] `cards-wont-commit` — "Why won't he commit to me?" · **18**
- [x] `cards-will-commit` `arcana-mfh` — "Will he ever commit?" · clean
- [x] `cards-will-commit` — "Will he ever commit?" · clean

## soulmate-where — 0/3 clean · 77 problems

`tests/tarot-soulmate-where-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-not-found-yet` — "Why haven't I found my soulmate where I am?" · **29**
- [ ] `cards-where-soulmate` — "Where is my soulmate right now?" · **25**
- [ ] `cards-soulmate-closer` — "Is my soulmate closer than I think?" · **23**

## searching — 0/3 clean · 74 problems

`tests/tarot-searching-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-end-up-alone` — "Why do I keep ending up alone?" · **28**
- [ ] `cards-stop-searching` — "Am I ever going to stop searching?" · **23**
- [ ] `cards-given-up` — "Have I given up on love without realizing it?" · **23**

## still-feels — 0/3 clean · 74 problems

`tests/tarot-still-feels-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-still-think` — "Does he still think about me?" · **25**
- [ ] `cards-still-love` — "Does he still love me?" · **25**
- [ ] `cards-love-or-moved-on` — "Does he still love me, or has he moved on?" · **24**

## loneliness — 0/3 clean · 73 problems

`tests/tarot-loneliness-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-meant-alone` — "Am I meant to be alone?" · **27**
- [ ] `cards-someone-for-me` — "Is there really someone out there for me?" · **24**
- [ ] `cards-alone-forever` — "Will I be alone forever?" · **22**

## pulling-away — 0/3 clean · 71 problems

`tests/tarot-pulling-away-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-gone-cold` — "Why has he gone cold on me?" · **25**
- [ ] `cards-losing-interest` — "Is he losing interest, or just going through something?" · **25**
- [ ] `cards-pulling-away` — "Why is he pulling away from me?" · **21**

## real-feelings — 0/3 clean · 69 problems

`tests/tarot-real-feelings-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-really-love` — "Does he really love me?" · **27**
- [ ] `cards-imagining-it` — "Does he love me, or am I imagining it?" · **22**
- [ ] `cards-feel-about-me` — "How does he really feel about me?" · **20**

## missing-him — 0/3 clean · 66 problems

`tests/tarot-missing-him-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-stop-missing` — "Will I ever stop missing him?" · **25**
- [ ] `cards-still-miss-him` — "Why do I still miss him after everything?" · **21**
      ⚠️ sibling of cards-who-hurt-me — never minimise the named harm.
- [ ] `cards-stop-hurting` — "I miss him so much — will this ever stop hurting?" · **20**

## reunion — 0/3 clean · 65 problems

`tests/tarot-reunion-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-come-back` — "Will he come back?" · **25**
- [ ] `cards-moved-on` — "Is he coming back, or has he moved on?" · **22**
- [ ] `cards-ever-back` — "Will he ever come back to me?" · **18**

## soulmate-label — 0/3 clean · 65 problems

`tests/tarot-soulmate-label-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-really-soulmate` — "Is he really my soulmate?" · **24**
      ⚠️ B1 — tests/tarot-soulmate-label-copy.test.ts:439/441/444 assume ONE unsplit beat 3. Delete those three with a note before migrating this family.
- [ ] `cards-met-already` — "Have I already met my soulmate without realizing it?" · **23**
      ⚠️ B1 — see cards-really-soulmate.
- [ ] `cards-twin-or-connection` — "Is he my twin flame, or just a strong connection?" · **18**
      ⚠️ B1 — see cards-really-soulmate.

## why-he-left — 0/3 clean · 62 problems

`tests/tarot-why-he-left-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-ghosted` — "Why did he ghost me?" · **25**
- [ ] `cards-left-without-word` — "Why did he leave without a word?" · **20**
- [ ] `cards-not-enough` — "Was I not enough for him to stay?" · **17**

## honesty — 0/3 clean · 61 problems

`tests/tarot-honesty-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-truth` — "Is he telling me the truth?" · **21**
- [ ] `cards-lied-to` — "Am I being lied to?" · **20**
- [ ] `cards-deceived` — "Am I being deceived?" · **20**

## healing — 0/3 clean · 58 problems

`tests/tarot-healing-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-who-hurt-me` — "Why do I still think about someone who hurt me?" · **21**
      ⚠️ heaviest hook on the funnel — never minimise, never convict, never blame her.
- [ ] `cards-on-my-mind` — "Why is he always on my mind?" · **19**
- [ ] `cards-cant-stop` — "Why can't I stop thinking about him?" · **18**

## self-frame — 0/4 clean · 53 problems

⚠️ **No dedicated guard file** (`tests/tarot-self-frame-copy.test.ts` does not exist) — a seed family, written before the per-family convention. Only the generic guards apply, so this copy is the least protected on the funnel.

- [ ] `cards-soulmate` `arcana-mfh` — "When is my soulmate coming?" · **17**
- [ ] `cards-soulmate` `arcana-eef` — "When is my soulmate coming?" · **15**
- [ ] `cards-love-again` `arcana-mfh` — "Will I love again?" · **13**
- [ ] `cards-love-again` `arcana-eef` — "Will I love again?" · **8**

## hidden-intuition — 0/2 clean · 50 problems

`tests/tarot-hidden-intuition-copy.test.ts` — read it BEFORE rewriting; it carries bans, and some copy is pinned verbatim.

- [ ] `cards-hiding-something` — "Is he hiding something from me?" · **26**
- [ ] `cards-feels-off` — "Something feels off — is my intuition right?" · **24**
      ⚠️ submits HER JUDGEMENT for a verdict. Split the question; do not answer it.

---

# Track B — the money batch (not built yet)

The first non-love territory on the funnel. Deck: `return-mhf`, face-down, no new art.
Draft + the 7 bans + the wiring list: `fb-tarot/docs/drafts/money-block.draft.md`.

🔴 **The 33 reveals in that draft must be REWRITTEN, not just wired.** Scored against this
gate they carry ~176 problems — the same failure rate `cards-return` had before its
rewrite. Track B's copy work is the four steps above, run on 11 new hooks: pull the VOC,
find the intent, write the seven bubbles, gate and preview.

Two of the steps land differently on money and are worth flagging before drafting:

- **Step 1 has no data yet.** These hooks have never run, so `voc-by-hook.mjs` returns
  nothing. The nearest real corpus is `docs/v1-money-bucket-voc.md` — 10,514 money
  concerns from V1, already themed. Read that instead of skipping the step.
- **Bubble 7 is easier here, and bubble 3 is harder.** The block is the headline, so the
  object practically writes itself. But the payoff has to certify her noticing WITHOUT
  conceding the self-blame the `money-energy` headlines offer ("Is my energy blocking my
  money?") — affirm the noticing, refuse the fault, exactly as `hidden-intuition` splits it.

**Structural work these 11 need that no love lander did:**

- [ ] `hookToBucket()` returns `'money'` for the 11 — `tarotReads.ts`, hardcoded `'love'` today.
      This is the load-bearing one: it sets `userData.bucket`, which steers the whole V1 chat
      after the opener. V1 already has a full money path (`MONEY_BUCKET_PROMPT`), so the flip
      routes her into an established path rather than needing new prompt work.
- [ ] Per-hook tap instruction — an optional `hookInstruction` on `CardSetConfig`, read by
      `TarotBridge.tsx`. The deck-level line says *"Think of the man on your mind."*
- [ ] Money frame in `buildTarotReflectPrompt` — **insurance, not a pillar.** Version C is
      unreachable on tarot today (`/fb-tarot/c` 302s to `/b`), so this only runs if a hook is
      ever enrolled in the version experiment.
- [ ] 4 angles, 4 family arrays, `TAROT_HOOKS` / `HEADLINES` / `TAROT_QUESTION`,
      `TAROT_HOOK_CONTEXT` / `TAROT_HOOK_TENDENCY`, `validHooks` in `routes.ts`, `STATUS.md`.
- [ ] `tests/tarot-money-block-copy.test.ts` — the 7 bans (no amount/date/source · never name a
      person as the block · no financial advice · never blame her · never "too late" and never a
      promised arrival · never rule on God · never presume her finances).

## money-retiring (55–64) — 0/3 built

- [ ] `cards-blocked-retiring` — "Why is my money still blocked this close to retiring?" · 3 reveals
- [ ] `cards-nest-egg` — "How long has something been blocking me from a nest egg?" · 3 reveals
- [ ] `cards-too-late` — "Is something blocking my money, or did I just leave it too late?" · 3 reveals

## money-working (65+) — 0/3 built

- [ ] `cards-still-working` — "Why am I still working when the money should have come by now?" · 3 reveals
- [ ] `cards-how-much-longer` — "How much longer will something keep blocking my money?" · 3 reveals
- [ ] `cards-out-of-time` — "Is something still blocking my money, or have I run out of time?" · 3 reveals

## money-energy — 0/3 built

- [ ] `cards-my-energy` — "Is my energy blocking my money?" · 3 reveals
- [ ] `cards-money-wont-stay` — "What does my energy say about why money won't stay?" · 3 reveals
- [ ] `cards-energy-how-long` — "How long has my energy been working against my money?" · 3 reveals

## money-prayer — 0/2 built

- [ ] `cards-prayed-years` — "I've prayed about money for years. What's still blocking it?" · 3 reveals
- [ ] `cards-prayers-unanswered` — "How long will my prayers for money keep going unanswered?" · 3 reveals
