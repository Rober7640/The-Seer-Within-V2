# /fb-tarot — every lander, by category

> 🤖 **GENERATED — do not hand-edit.** Rewrite it with `npx tsx scripts/lander-registry.mts`.
> Categories come from the frame Sets in `server/lib/prompts.ts`, landers from the registry in
> `client/src/content/tarotReads.ts`, and the METHOD from which roster carries the read —
> so this file cannot claim a lander is something the code says it is not.

**104 landers.** money **11** · soulmate × keyword **6** · soulmate × age band **11** · soulmate × after loss **3** · soulmate × where **3** · loneliness **6** · self-frame **2** · decode-him **62**

**37 armed** for the Inherited Shadow (`natural + shadow` below): `fb-tarot/docs/shadow-split-test-checklist.md`

**A lander is one hook.** Most live only on `return-mhf`, the face-down deck every live ad
points at; some also have `arcana-mfh` / `arcana-eef` / `decode-him` variants, and an edit has
to be applied to every deck carrying the hook or the parity test fails.

| Column | Means |
|---|---|
| **Method** | `natural` = the Natural Tarot-Cut, 7 bubbles · `shadow` = the Inherited Shadow, 6 bubbles. Derived from which roster carries the read, not from a field |
| `natural + shadow` | **ARMED** — both reads serve this lander while `v1_tarot_shadow_2026` runs, 70% shadow / 30% natural. Nothing was replaced |
| **Decks** | every deck carrying this hook, in either roster |
| ⛔ | a protected control — never rewritten, never armed (invariant 4) |
| ✝ | carries an extra ban that exists nowhere else on the funnel |

- `natural` → `fb-tarot/docs/natural-tarot-cut.md`
- `shadow` → `fb-tarot/docs/inherited-shadow-cut.md`

Copy-gate state is not here — that is `fb-tarot/docs/copy-migration-checklist.md`,
which is generated the same way. This file answers *what exists and what shape is it in*;
that one answers *is the copy clean*.

## money — 11

Frame Set: `MONEY_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-blocked-retiring` | Why is my money still blocked this close to retiring? | natural + shadow | return-mhf |
|  | `cards-energy-how-long` | How long has my energy been working against my money? | natural + shadow | return-mhf |
|  | `cards-how-much-longer` | How much longer will something keep blocking my money? | natural + shadow | return-mhf |
|  | `cards-money-wont-stay` | What does my energy say about why money won't stay? | natural + shadow | return-mhf |
|  | `cards-my-energy` | Is my energy blocking my money? | natural + shadow | return-mhf |
|  | `cards-nest-egg` | How long has something been blocking me from a nest egg? | natural + shadow | return-mhf |
|  | `cards-out-of-time` | Is something still blocking my money, or have I run out of time? | natural + shadow | return-mhf |
| ✝ | `cards-prayed-years` | I've prayed about money for years. What's still blocking it? | natural + shadow | return-mhf |
| ✝ | `cards-prayers-unanswered` | How long will my prayers for money keep going unanswered? | natural + shadow | return-mhf |
|  | `cards-still-working` | Why am I still working when the money should have come by now? | natural + shadow | return-mhf |
|  | `cards-too-late` | Is something blocking my money, or did I just leave it too late? | natural + shadow | return-mhf |

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

## loneliness — 6

Frame Set: `LONELINESS_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-alone-forever` | Will I be alone forever? | natural | return-mhf |
|  | `cards-end-up-alone` | Why do I keep ending up alone? | natural | return-mhf |
|  | `cards-given-up` | Have I given up on love without realizing it? | natural | return-mhf |
|  | `cards-meant-alone` | Am I meant to be alone? | natural | return-mhf |
|  | `cards-someone-for-me` | Is there really someone out there for me? | natural | return-mhf |
|  | `cards-stop-searching` | Am I ever going to stop searching? | natural | return-mhf |

## self-frame — 2

Frame Set: `SELF_FRAME_TAROT_HOOKS` (`server/lib/prompts.ts`)

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-love-again` | Will I love again? | natural | arcana-mfh · arcana-eef |
|  | `cards-soulmate` | When is my soulmate coming? | natural | arcana-mfh · arcana-eef |

## decode-him — 62

No frame Set — these fall through to the default `decode-him` clause.

| | Hook | Ad headline | Method | Decks |
|---|---|---|---|---|
|  | `cards-back-together` | Will we get back together? | natural | return-mhf |
|  | `cards-cant-stop` | Why can't I stop thinking about him? | natural | return-mhf |
|  | `cards-cheating` | Is he cheating on you? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-come-back` | Will he come back? | natural | return-mhf |
|  | `cards-connection-nothing` | Why does this connection feel like my soulmate when nothing is happening? | natural | return-mhf |
|  | `cards-connection-soulmate` | Is this connection my soulmate, or something else? | natural | return-mhf |
|  | `cards-deceived` | Am I being deceived? | natural | return-mhf |
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
|  | `cards-not-enough` | Was I not enough for him to stay? | natural | return-mhf |
|  | `cards-on-my-mind` | Why is he always on my mind? | natural | return-mhf |
|  | `cards-pulling-away` | Why is he pulling away from me? | natural | return-mhf |
|  | `cards-ready-commit` | Is he ever going to be ready for real commitment? | natural + shadow | arcana-mfh · return-mhf |
|  | `cards-real-person` | Is he the real person, or just a picture? | natural | arcana-mfh · return-mhf |
|  | `cards-really-love` | Does he really love me? | natural | return-mhf |
|  | `cards-really-over` | Is it really over between us? | natural | return-mhf |
|  | `cards-really-soulmate` | Is he really my soulmate? | natural | return-mhf |
| ⛔ | `cards-return` | Will he come back? | natural | arcana-mfh · arcana-eef · return-mhf |
|  | `cards-someone-else` | Is there someone else? | natural | return-mhf |
|  | `cards-still-a-chance` | Is there still a chance for us? | natural | return-mhf |
|  | `cards-still-love` | Does he still love me? | natural | return-mhf |
|  | `cards-still-miss-him` | Why do I still miss him after everything? | natural | return-mhf |
|  | `cards-still-think` | Does he still think about me? | natural | return-mhf |
|  | `cards-stop-hurting` | I miss him so much — will this ever stop hurting? | natural | return-mhf |
|  | `cards-stop-missing` | Will I ever stop missing him? | natural | return-mhf |
|  | `cards-talking-someone` | Is he talking to someone else? | natural | return-mhf |
|  | `cards-too-long` | Have I already given him too long? | natural | return-mhf |
|  | `cards-truth` | Is he telling me the truth? | natural | return-mhf |
|  | `cards-twin-back` | Is my twin flame coming back to me? | natural | return-mhf |
|  | `cards-twin-feels` | Does my twin flame feel this too? | natural | return-mhf |
|  | `cards-twin-or-connection` | Is he my twin flame, or just a strong connection? | natural | return-mhf |
|  | `cards-twin-ready` | Is my twin flame ready for me? | natural | return-mhf |
|  | `cards-twinflame-back` | Is my twin flame coming back to me? | natural | return-mhf |
|  | `cards-was-he-soulmate` | Was he ever really my soulmate? | natural | return-mhf |
|  | `cards-who-he-is` | Is he really who he says he is? | natural | arcana-mfh · return-mhf |
|  | `cards-who-hurt-me` | Why do I still think about someone who hurt me? | natural | return-mhf |
|  | `cards-will-commit` | Will he ever commit? | natural + shadow | arcana-mfh · return-mhf |
|  | `cards-wont-commit` | Why won't he commit to me? | natural + shadow | arcana-mfh · return-mhf |
