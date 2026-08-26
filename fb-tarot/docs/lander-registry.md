# /fb-tarot — every lander, by category

> 🤖 **GENERATED — do not hand-edit.** Rewrite it with `npx tsx scripts/lander-registry.mts`.
> Categories come from the frame Sets in `server/lib/prompts.ts`, landers from the registry in
> `client/src/content/tarotReads.ts`, and the METHOD from which roster carries the read —
> so the live section cannot claim a lander is something the code says it is not.
> Draft candidates come from the typed `DRAFT_CANDIDATES` roster in `scripts/lander-registry.mts`.

**148 live landers.** money **22** · soulmate × keyword **6** · soulmate × age band **11** · soulmate × after loss **3** · soulmate × where **3** · loneliness **27** · self-frame **2** · decode-him **74**

**0 draft candidates** with both Natural and Shadow manuscripts written for review. They are not routable or armed.

**81 armed** for the Inherited Shadow (`natural + shadow` below): `fb-tarot/docs/shadow-split-test-checklist.md`

**A lander is one hook.** Most live only on `return-mhf`, the face-down deck every live ad
points at; some also have `arcana-mfh` / `arcana-eef` / `decode-him` variants, and an edit has
to be applied to every deck carrying the hook or the parity test fails.

| Column | Means |
|---|---|
| **Method** | `natural` = the Natural Tarot-Cut, 7 bubbles · `shadow` = the Inherited Shadow, 6 bubbles. Derived from which roster carries the read, not from a field |
| `natural + shadow` | **ARMED** — both reads serve this lander while `v1_tarot_shadow_2026` runs, 70% shadow / 30% natural. Nothing was replaced |
| `drafted natural + shadow` | **DRAFT ONLY** — both manuscripts are written for review, but neither method is live and the hook is not routable |
| **Decks** | every deck carrying this hook, in either roster |
| ⛔ | a protected control — never rewritten, never armed (invariant 4) |
| ✝ | carries an extra ban that exists nowhere else on the funnel |

- `natural` → `fb-tarot/docs/natural-tarot-cut.md`
- `shadow` → `fb-tarot/docs/inherited-shadow-cut.md`

Copy-gate state is not here — that is `fb-tarot/docs/copy-migration-checklist.md`,
which is generated the same way. This file answers *what exists and what shape is it in*;
that one answers *is the copy clean*.

## money — 22

Frame Set: `MONEY_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-blocked-retiring` | Why is my money still blocked this close to retiring? | natural + shadow | return-mhf |
|  | `cards-earn-and-gone` | I earn it and it's gone. What's blocking my money? | natural + shadow | return-mhf |
|  | `cards-energy-how-long` | How long has my energy been working against my money? | natural + shadow | return-mhf |
|  | `cards-how-much-longer` | How much longer will something keep blocking my money? | natural + shadow | return-mhf |
|  | `cards-money-cant-stop-working` | I can't stop working yet. What's still blocking my money? | natural + shadow | return-mhf |
|  | `cards-money-has-to-last` | Whatever I've got has to last now. What's blocking my money? | natural + shadow | return-mhf |
|  | `cards-money-reach-me` | Everybody is getting ahead. Why won't the money reach me? | natural + shadow | return-mhf |
|  | `cards-money-time-running-out` | My time is running out. Is my energy blocking my money? | natural + shadow | return-mhf |
|  | `cards-money-wont-stay` | What does my energy say about why money won't stay? | natural + shadow | return-mhf |
|  | `cards-my-energy` | Is my energy blocking my money? | natural + shadow | return-mhf |
|  | `cards-nest-egg` | How long has something been blocking me from a nest egg? | natural + shadow | return-mhf |
|  | `cards-nothing-put-away` | I've got nothing put away. Is my energy blocking my money? | natural + shadow | return-mhf |
|  | `cards-out-of-time` | Is something still blocking my money, or have I run out of time? | natural + shadow | return-mhf |
|  | `cards-paycheck-to-paycheck` | I'm living paycheck to paycheck and can't get started. Is my energy blocking my money? | natural + shadow | return-mhf |
|  | `cards-paying-what-i-owe` | I keep paying what I owe. Why is my money still blocked? | natural + shadow | return-mhf |
| ✝ | `cards-prayed-years` | I've prayed about money for years. What's still blocking it? | natural + shadow | return-mhf |
| ✝ | `cards-prayers-unanswered` | How long will my prayers for money keep going unanswered? | natural + shadow | return-mhf |
|  | `cards-still-working` | Why am I still working when the money should have come by now? | natural + shadow | return-mhf |
|  | `cards-talk-myself-out` | I talk myself out of everything. What's blocking my money? | natural + shadow | return-mhf |
|  | `cards-too-late` | Is something blocking my money, or did I just leave it too late? | natural + shadow | return-mhf |
|  | `cards-trusted-loss-blocking-money` | I lost what I had through someone I trusted. Is that still blocking my money? | natural + shadow | return-mhf |
|  | `cards-working-money-by-now` | I'm still working. What's blocking the money I should have by now? | natural + shadow | return-mhf |

## soulmate × keyword — 6

Frame Set: `SOULMATE_KEYWORD_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-blocked-before` | Why do I keep getting blocked before my soulmate arrives? | natural + shadow | return-mhf |
|  | `cards-blocking-soulmate` | Is something blocking me from meeting my soulmate? | natural + shadow | return-mhf |
|  | `cards-energy-away` | Is my energy keeping my soulmate away? | natural + shadow | return-mhf |
|  | `cards-energy-soulmate` | What does my energy say about my soulmate? | natural + shadow | return-mhf |
|  | `cards-heal-first` | Do I need to heal before my soulmate arrives? | natural + shadow | return-mhf |
|  | `cards-waiting-to-heal` | Is my soulmate waiting for me to heal? | natural + shadow | return-mhf |

## soulmate × age band — 11

Frame Set: `SOULMATE_AGEBAND_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-after-marriage` | Is there a soulmate for me after the marriage ended? | natural + shadow | return-mhf |
|  | `cards-allowed-to-want` | Am I still allowed to want a soulmate? | natural + shadow | return-mhf |
|  | `cards-best-years` | Why did I give my best years to someone who wasn't my soulmate? | natural + shadow | return-mhf |
|  | `cards-choosing-wrong` | What keeps me choosing everyone but my soulmate? | natural + shadow | return-mhf |
|  | `cards-found-me-yet` | Why hasn't my soulmate found me yet? | natural + shadow | return-mhf |
|  | `cards-keeps-waiting` | How long does a soulmate keep you waiting? | natural + shadow | return-mhf |
|  | `cards-longer-to-wait` | How much longer do I have to wait for my soulmate? | natural + shadow | return-mhf |
|  | `cards-missed-chance` | Is my soulmate still coming, or have I already missed him? | natural + shadow | return-mhf |
|  | `cards-second-time` | How long does it take to find a soulmate the second time? | natural + shadow | return-mhf |
|  | `cards-slipping-past` | Why does my soulmate keep slipping past me? | natural + shadow | return-mhf |
|  | `cards-too-late-love` | Is it too late to meet my soulmate? | natural + shadow | return-mhf |

## soulmate × after loss — 3

Frame Set: `AFTER_LOSS_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-new-soulmate` | Will I find a new soulmate after loss? | natural + shadow | return-mhf |
|  | `cards-ready-to-love` | Am I ready to love again after losing him? | natural + shadow | return-mhf |
|  | `cards-soulmate-out-there` | Is there still a soulmate out there for me? | natural + shadow | return-mhf |

## soulmate × where — 3

Frame Set: `SOULMATE_WHERE_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-not-found-yet` | Why haven't I found my soulmate where I am? | natural + shadow | return-mhf |
|  | `cards-soulmate-closer` | Is my soulmate closer than I think? | natural + shadow | return-mhf |
|  | `cards-where-soulmate` | Where is my soulmate right now? | natural + shadow | return-mhf |

## loneliness — 27

Frame Set: `LONELINESS_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-alone-a-decade` | I've been alone a decade. How much longer? | natural + shadow | return-mhf |
|  | `cards-alone-for-years` | I've been alone for years. What's keeping me here? | natural + shadow | return-mhf |
|  | `cards-alone-forever` | Will I be alone forever? | natural | return-mhf |
|  | `cards-alone-heavier-now` | Why does being alone feel heavier now than it used to? | natural + shadow | return-mhf |
|  | `cards-alone-rest-of-life` | Will I be alone for the rest of my life? | natural + shadow | return-mhf |
|  | `cards-connection-kept-alive` | Why have I kept this connection alive on my own? | natural + shadow | return-mhf |
|  | `cards-destined-alone` | Why do I feel destined to be alone? | natural + shadow | return-mhf |
|  | `cards-destined-or-not-yet` | Am I destined to be alone, or has it just not happened yet? | natural + shadow | return-mhf |
|  | `cards-empty-house-alone` | Why is being alone hardest now that the house is empty? | natural + shadow | return-mhf |
|  | `cards-end-up-alone` | Why do I keep ending up alone? | natural | return-mhf |
|  | `cards-given-up` | Have I given up on love without realizing it? | natural | return-mhf |
|  | `cards-god-mean-me-alone` | How much longer does God mean me to be alone? | natural + shadow | return-mhf |
|  | `cards-god-with-me-alone` | God is with me. Why am I still alone? | natural + shadow | return-mhf |
|  | `cards-gods-intention-alone` | Is it God's intention for me to be alone, or is someone coming? | natural + shadow | return-mhf |
|  | `cards-held-alone` | Is something holding me here alone, or is this just my life now? | natural + shadow | return-mhf |
|  | `cards-how-long-alone` | How long am I going to be alone? | natural + shadow | return-mhf |
|  | `cards-know-not-destined-alone` | How long before I know I'm not destined to be alone? | natural + shadow | return-mhf |
|  | `cards-love-never-stays` | Why does love never stay with me? | natural + shadow | return-mhf |
|  | `cards-love-not-happened-yet` | Did I miss my chance, or has love just not happened yet? | natural + shadow | return-mhf |
|  | `cards-meant-alone` | Am I meant to be alone? | natural | return-mhf |
|  | `cards-meant-alone-still-time` | Am I meant to be alone now, or is there still time? | natural + shadow | return-mhf |
|  | `cards-more-years-alone` | How many more years alone before something changes? | natural + shadow | return-mhf |
|  | `cards-real-connection-coming` | Is a real connection coming, or do I stay alone? | natural + shadow | return-mhf |
|  | `cards-someone-for-me` | Is there really someone out there for me? | natural | return-mhf |
|  | `cards-stop-searching` | Am I ever going to stop searching? | natural | return-mhf |
|  | `cards-too-late-or-now` | Is it too late for love, or is this only where I am now? | natural + shadow | return-mhf |
|  | `cards-wait-on-connection` | How much longer am I going to wait on this connection? | natural + shadow | return-mhf |

## self-frame — 2

Frame Set: `SELF_FRAME_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-love-again` | Will I love again? | natural | arcana-mfh · arcana-eef |
|  | `cards-soulmate` | When is my soulmate coming? | natural | arcana-mfh · arcana-eef |

## decode-him — 74

No frame Set — these fall through to the default `decode-him` clause.

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-back-together` | Will we get back together? | natural | return-mhf |
|  | `cards-cant-stop` | Why can't I stop thinking about him? | natural | return-mhf |
|  | `cards-cheating` | Is he cheating on you? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-come-back` | Will he come back? | natural | return-mhf |
|  | `cards-commit-or-company` | Does he want to commit, or does he just want company? | natural + shadow | return-mhf |
|  | `cards-commitment-uncertain-years` | Why is commitment still uncertain after all these years? | natural + shadow | return-mhf |
|  | `cards-connection-nothing` | Why does this connection feel like my soulmate when nothing is happening? | natural | return-mhf |
|  | `cards-connection-soulmate` | Is this connection my soulmate, or something else? | natural | return-mhf |
|  | `cards-deceived` | Am I being deceived? | natural | return-mhf |
|  | `cards-doing-wrong-wont-commit` | What am I doing wrong that he won't commit? | natural + shadow | return-mhf |
|  | `cards-ever-back` | Will he ever come back to me? | natural | return-mhf |
|  | `cards-faithful` | Is he being faithful to me? | natural | return-mhf |
|  | `cards-feel-about-me` | How does he really feel about me? | natural | return-mhf |
|  | `cards-feel-like-myself` | Am I ever going to feel like myself again? | natural | return-mhf |
| ⛔ | `cards-feels` | How does he really feel about you? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-feels-off` | Something feels off — is my intuition right? | natural | return-mhf |
|  | `cards-find-closure` | Will I ever find closure? | natural | return-mhf |
|  | `cards-forever-or-now` | Am I his forever, or his now? | natural | return-mhf |
|  | `cards-ghosted` | Why did he ghost me? | natural | return-mhf |
|  | `cards-gone-cold` | Why has he gone cold on me? | natural | return-mhf |
|  | `cards-heart-heal` | Will my heart ever heal? | natural | return-mhf |
|  | `cards-her-shadow` | Am I living in her shadow? | natural | return-mhf |
|  | `cards-hiding-something` | Is he hiding something from me? | natural | return-mhf |
|  | `cards-his-children` | Why do his children come before me? | natural | return-mhf |
|  | `cards-honest` | Is he being honest with you? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-how-much-longer-commit` | How much longer do I wait for him to commit? | natural + shadow | return-mhf |
|  | `cards-imagining-it` | Does he love me, or am I imagining it? | natural | return-mhf |
|  | `cards-left-without-word` | Why did he leave without a word? | natural | return-mhf |
|  | `cards-lied-to` | Am I being lied to? | natural | return-mhf |
|  | `cards-live-apart` | Why do we still live apart? | natural | return-mhf |
|  | `cards-losing-interest` | Is he losing interest, or just going through something? | natural | return-mhf |
|  | `cards-love-or-moved-on` | Does he still love me, or has he moved on? | natural | return-mhf |
|  | `cards-loyal` | Is he loyal to only me? | natural | return-mhf |
|  | `cards-met-already` | Have I already met my soulmate without realizing it? | natural | return-mhf |
|  | `cards-misled` | Am I being misled? | natural | arcana-mfh · return-mhf |
|  | `cards-moved-on` | Is he coming back, or has he moved on? | natural | return-mhf |
|  | `cards-my-soulmate-back` | Is my soulmate coming back to me? | natural | return-mhf |
|  | `cards-no-time-to-waste-commit` | Why won't he commit when neither of us has time to waste? | natural + shadow | return-mhf |
|  | `cards-not-enough` | Was I not enough for him to stay? | natural | return-mhf |
|  | `cards-on-my-mind` | Why is he always on my mind? | natural | return-mhf |
|  | `cards-picking-noncommittal-men` | Why do I keep picking non-committal men? | natural + shadow | return-mhf |
|  | `cards-pulling-away` | Why is he pulling away from me? | natural | return-mhf |
|  | `cards-ready-commit` | Is he ever going to be ready for real commitment? | natural + shadow | arcana-mfh · return-mhf |
|  | `cards-real-person` | Is he the real person, or just a picture? | natural | arcana-mfh · return-mhf |
|  | `cards-really-love` | Does he really love me? | natural | return-mhf |
|  | `cards-really-over` | Is it really over between us? | natural | return-mhf |
|  | `cards-really-soulmate` | Is he really my soulmate? | natural | return-mhf |
| ⛔ | `cards-return` | Will he come back? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-scared-or-never-commit` | Is he scared to commit, or just never going to? | natural + shadow | return-mhf |
|  | `cards-slow-commit-or-wasting-time` | Is he slow to commit, or is he wasting my time? | natural + shadow | return-mhf |
|  | `cards-someone-else` | Is there someone else? | natural | return-mhf |
|  | `cards-still-a-chance` | Is there still a chance for us? | natural | return-mhf |
|  | `cards-still-love` | Does he still love me? | natural | return-mhf |
|  | `cards-still-miss-him` | Why do I still miss him after everything? | natural | return-mhf |
|  | `cards-still-think` | Does he still think about me? | natural | return-mhf |
|  | `cards-stop-hurting` | I miss him so much — will this ever stop hurting? | natural | return-mhf |
|  | `cards-stop-missing` | Will I ever stop missing him? | natural | return-mhf |
|  | `cards-talking-someone` | Is he talking to someone else? | natural | return-mhf |
|  | `cards-time-to-commit-before-moving-on` | How long do I give him to commit before I move on? | natural + shadow | return-mhf |
|  | `cards-too-long` | Have I already given him too long? | natural | return-mhf |
|  | `cards-truth` | Is he telling me the truth? | natural | return-mhf |
|  | `cards-twin-back` | Is my twin flame coming back to me? | natural | return-mhf |
|  | `cards-twin-feels` | Does my twin flame feel this too? | natural | return-mhf |
|  | `cards-twin-or-connection` | Is he my twin flame, or just a strong connection? | natural | return-mhf |
|  | `cards-twin-ready` | Is my twin flame ready for me? | natural | return-mhf |
|  | `cards-twinflame-back` | Is my twin flame coming back to me? | natural | return-mhf |
|  | `cards-wait-commit-this-time` | How long do I wait for him to commit this time? | natural + shadow | return-mhf |
|  | `cards-was-he-soulmate` | Was he ever really my soulmate? | natural | return-mhf |
|  | `cards-who-he-is` | Is he really who he says he is? | natural | arcana-mfh · return-mhf |
|  | `cards-who-hurt-me` | Why do I still think about someone who hurt me? | natural | return-mhf |
|  | `cards-will-commit` | Will he ever commit? | natural + shadow | arcana-mfh · return-mhf |
|  | `cards-wont-commit` | Why won't he commit to me? | natural + shadow | arcana-mfh · return-mhf |
|  | `cards-wont-commit-years-together` | Why won't he commit after all these years together? | natural + shadow | return-mhf |
|  | `cards-years-before-commitment` | How many years together before he makes a commitment? | natural + shadow | return-mhf |

## Draft — reading copy written, awaiting approval

**0 hooks awaiting approval.**

**Status for every row:** draft Natural Tarot-Cut (3 cards × 7 cuts) + draft Inherited Shadow (3 cards × 6 beats), awaiting operator approval.

**Deck for every row:** `return-mhf` · face down · a Magician · b Hanged Man · c Fool.

**Review manuscripts:** `fb-tarot/docs/drafts/natural/REVIEW-money-alone-commit-2026-08-25.md` · `fb-tarot/docs/drafts/shadow/REVIEW-money-alone-commit-2026-08-25.md`.

These hooks have review copy only. They do not exist in `TarotHook`, `TAROT_HOOKS`,
`HEADLINES`, either read roster, route validation, the armed population, or experiment weights.

### Draft frame rules

| Frame | Shared rule for both methods |
|---|---|
| `money` | Her money, never love or a person. No amount, source, date, duration, person, cause, financial advice, presumed financial state, self-blame or promise. |
| `loneliness` | No particular man. No fate, forever verdict, promised arrival, date, duration, tactic, self-blame, invented history or invented reason. |
| `connection` | Only the connection she named. No certified bond, narrated feelings or motives, promised contact or commitment, duration, or wait/leave/reach-out advice. |
| `commitment` | A real man, read only as a tendency or situation. No private thoughts, character, diagnosis, motive, future decision, duration, leave/stay advice, self-blame or promise. |

### Additional guard labels

| Label | Added requirement |
|---|---|
| `TIME` | No date, length, pace, “soon,” “not much longer,” or position on a timeline; visibly decline a requested length. |
| `ENERGY` | Energy may be read but never scored as low, blocked, closed, wrong, misaligned, or something she must fix. |
| `SCAM` | No accusation, identified person, predicted recovery or return, and no financial advice. |
| `SELF-BLAME` | Do not accept the headline’s case against her, even in sympathetic language. |
| `EMPTY-HOUSE` | Do not infer children, bereavement, divorce, estrangement, or why the house became empty. |
| `FAITH` | Prayer and God may be discussed because she named them; never speak for God or declare a divine response, test, punishment, lesson, plan or promise. |
| `NO-MAN` | Do not invent a current or future person, their location, traits, feelings, or approach. |
| `MIND-READING` | The binary asks for an interior verdict; refuse to decide either motive from a card. |

### money — 0

| Hook | Exact headline | Source placement | Planned method | Deck / facing | Added guards | Relationship / writing note |
|---|---|---|---|---|---|---|

### loneliness — 0

| Hook | Exact headline | Source placement | Planned method | Deck / facing | Added guards | Relationship / writing note |
|---|---|---|---|---|---|---|

### connection — 0

| Hook | Exact headline | Source placement | Planned method | Deck / facing | Added guards | Relationship / writing note |
|---|---|---|---|---|---|---|

### commitment — 0

| Hook | Exact headline | Source placement | Planned method | Deck / facing | Added guards | Relationship / writing note |
|---|---|---|---|---|---|---|

### Draft-to-live contract

1. Use the exact headline above in both manuscripts.
2. Write the two methods separately; never mechanically convert one into the other.
3. Approve all three Natural reads and all three Shadow reads before wiring a hook.
4. Wire the live type, headline, frame, reporting family, natural roster, shadow roster, route validation and safety tests in one pass.
5. Remove the hook from `DRAFT_CANDIDATES` in that same pass. Generation refuses a hook that appears in both draft and live rosters.
6. Regenerate this file. Only then does the hook move from this draft section into the live categories above.
7. Draft registration never changes experiment weights or the armed population.
