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

The migration loop is in `.claude/skills/v1-funnel-audit/SKILL.md` § "Migrating a lander".
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
rewrite. Track B's copy work is the Track A loop, run on 11 new hooks.

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
