# /fb-tarot — the audience personas

**Who the 148 live landers are written for.** Derived 2 September 2026 from `fb-tarot/docs/lander-registry.md`,
which is itself generated from the running code — so every ad headline below is exactly what serves today.

A **persona** here is the woman the ad is written for. Not the reader she meets: Evelyn is the reader, and
she is the same on all 148. Each persona has two identifiers — a **keyword** (her own word, for bidding and
talking about groups fast) and a **name** (for remembering who she is).

> ⚠ The headline tables are generated; the prose is written. Adding landers means re-deriving this file.

---

## The roster

| Keyword | Persona | In one line | Ads | Armed | Her word? | Registry home |
|---|---|---|---:|---:|---|---|
| `alone` | **Years, Not Months** | Alone so long it stopped feeling temporary | 27 | 21 | ✅ 19/27 | `loneliness` |
| `soulmate` | **The Soulmate Seeker** | Certain he exists; wants to know when, where, who | 25 | 23 | ✅ 23/25 | `soulmate × 4` + `self-frame` |
| `money` | **Still Working** | Near retirement with nothing put away | 22 | 22 | ✅ 21/22 | `money` |
| `commit` | **Still Waiting on a Ring** | Years in, still no commitment | 15 | 15 | ✅ 15/15 | `decode-him` |
| `come back` | **Will He Come Back** | He left, and she is waiting | 13 | 0 | ◐ 5/13 | `decode-him` |
| `honesty` | **Something Feels Off** | She suspects, she cannot prove it | 12 | 0 | ⚠ concept | `decode-him` |
| `twin flame` | **Fate or Fantasy** | Thinks she has already found him | 11 | 0 | ◐ 5/11 | `decode-him` |
| `miss` | **I Can't Put Him Down** | It is over and she still cannot move | 10 | 0 | ◐ 3/10 | `decode-him` |
| `love` | **Does He Feel Anything** | The softest possible question — weakest rung | 7 | 0 | ◐ 3/7 | `decode-him` |
| `second place` | **Second Place** | In his life, never first in it | 4 | 0 | ⚠ concept | `decode-him` |
| `real` | **Is He Even Real** | She has never met him in person | 2 | 0 | ✅ 2/2 | `decode-him` |
| | | **Total** | **148** | **81** | | |

**Her word?** — how many of that persona's headlines literally contain the keyword.
✅ safe to treat as a real search/bid term · ◐ right label but thinly literal, verify before bidding ·
⚠ my label, not her word — do not buy it.

**Armed** — in the live `v1_tarot_shadow_2026` A/B test, serving two reading styles at 70/30.
Results on armed landers are split results, not clean reads.

### Three things to know before comparing performance

1. **The A/B test covers exactly four personas.** All 81 armed landers sit in `alone`, `soulmate`, `money`
   and `commit` — the same four with a genuinely strong keyword. The other seven personas, 59 landers,
   have **zero**. Half the roster reads clean and half is split, and which half depends on the persona.
2. **`money` and `commit` are 100% armed.** No clean baseline exists for either right now.
3. **Two headlines run twice.** *"Will he come back?"* is both `cards-come-back` and the protected control
   `cards-return` — probably deliberate. *"Is my twin flame coming back to me?"* is both `cards-twin-back`
   and `cards-twinflame-back`, same deck, same method — that one looks accidental, and they would compete
   in the same auction.

---

## Each persona in detail

Flags: ⚡ in the shadow A/B test · ⛔ protected control, never rewritten · ✝ carries a content ban that
exists nowhere else on the funnel.

### `alone` — Years, Not Months

**27 ads · 21 armed · `loneliness`**

Alone for a decade or more, and the house is often empty now — grown children, a life that got quieter rather than one specific loss.

She is not asking **when** someone arrives. She is asking whether this is **permanent** — whether being alone is simply what her life is now. The question underneath is about fate, not timing.

**What varies inside her**

- **The faith thread.** 3 ads put it to God directly — *"God is with me. Why am I still alone?"*
- **The empty house.** 1 ad names the trigger most of them are living — the children left and the quiet arrived.
- **Still holding a connection.** 3 ads are not about no-one; they are about someone she has kept alive on her own.

| Ad headline | Hook id | |
|---|---|---|
| I've been alone a decade. How much longer? | `cards-alone-a-decade` | ⚡ |
| I've been alone for years. What's keeping me here? | `cards-alone-for-years` | ⚡ |
| Will I be alone forever? | `cards-alone-forever` |  |
| Why does being alone feel heavier now than it used to? | `cards-alone-heavier-now` | ⚡ |
| Will I be alone for the rest of my life? | `cards-alone-rest-of-life` | ⚡ |
| Why have I kept this connection alive on my own? | `cards-connection-kept-alive` | ⚡ |
| Why do I feel destined to be alone? | `cards-destined-alone` | ⚡ |
| Am I destined to be alone, or has it just not happened yet? | `cards-destined-or-not-yet` | ⚡ |
| Why is being alone hardest now that the house is empty? | `cards-empty-house-alone` | ⚡ |
| Why do I keep ending up alone? | `cards-end-up-alone` |  |
| Have I given up on love without realizing it? | `cards-given-up` |  |
| How much longer does God mean me to be alone? | `cards-god-mean-me-alone` | ⚡ |
| God is with me. Why am I still alone? | `cards-god-with-me-alone` | ⚡ |
| Is it God's intention for me to be alone, or is someone coming? | `cards-gods-intention-alone` | ⚡ |
| Is something holding me here alone, or is this just my life now? | `cards-held-alone` | ⚡ |
| How long am I going to be alone? | `cards-how-long-alone` | ⚡ |
| How long before I know I'm not destined to be alone? | `cards-know-not-destined-alone` | ⚡ |
| Why does love never stay with me? | `cards-love-never-stays` | ⚡ |
| Did I miss my chance, or has love just not happened yet? | `cards-love-not-happened-yet` | ⚡ |
| Am I meant to be alone? | `cards-meant-alone` |  |
| Am I meant to be alone now, or is there still time? | `cards-meant-alone-still-time` | ⚡ |
| How many more years alone before something changes? | `cards-more-years-alone` | ⚡ |
| Is a real connection coming, or do I stay alone? | `cards-real-connection-coming` | ⚡ |
| Is there really someone out there for me? | `cards-someone-for-me` |  |
| Am I ever going to stop searching? | `cards-stop-searching` |  |
| Is it too late for love, or is this only where I am now? | `cards-too-late-or-now` | ⚡ |
| How much longer am I going to wait on this connection? | `cards-wait-on-connection` | ⚡ |

### `soulmate` — The Soulmate Seeker

**25 ads · 23 armed · `soulmate × 4` + `self-frame`**

She believes a destined partner exists for her. The only open question is when, where, or who — never whether.

She is waiting on someone who has **not arrived**, and every year that passes is evidence she reads against herself. "Soulmate" is her own word for what she is missing, which is why it works as a keyword as well as an audience.

**What varies inside her**

- **Starting over after a marriage — 11.** The permission angle. *"Am I still allowed to want a soulmate?"*
- **Something is blocking her — 6.** Self-blame reframed as healing she can actually do.
- **After his death — 3.** ⚠ bereavement, never heartbreak copy.
- **Wrong location — 3.** The most practical, least wounded version of her.
- **Unqualified — 2.** The plain question. **Neither is on the live deck.**

| Ad headline | Hook id | |
|---|---|---|
| Why do I keep getting blocked before my soulmate arrives? | `cards-blocked-before` | ⚡ |
| Is something blocking me from meeting my soulmate? | `cards-blocking-soulmate` | ⚡ |
| Is my energy keeping my soulmate away? | `cards-energy-away` | ⚡ |
| What does my energy say about my soulmate? | `cards-energy-soulmate` | ⚡ |
| Do I need to heal before my soulmate arrives? | `cards-heal-first` | ⚡ |
| Is my soulmate waiting for me to heal? | `cards-waiting-to-heal` | ⚡ |
| Is there a soulmate for me after the marriage ended? | `cards-after-marriage` | ⚡ |
| Am I still allowed to want a soulmate? | `cards-allowed-to-want` | ⚡ |
| Why did I give my best years to someone who wasn't my soulmate? | `cards-best-years` | ⚡ |
| What keeps me choosing everyone but my soulmate? | `cards-choosing-wrong` | ⚡ |
| Why hasn't my soulmate found me yet? | `cards-found-me-yet` | ⚡ |
| How long does a soulmate keep you waiting? | `cards-keeps-waiting` | ⚡ |
| How much longer do I have to wait for my soulmate? | `cards-longer-to-wait` | ⚡ |
| Is my soulmate still coming, or have I already missed him? | `cards-missed-chance` | ⚡ |
| How long does it take to find a soulmate the second time? | `cards-second-time` | ⚡ |
| Why does my soulmate keep slipping past me? | `cards-slipping-past` | ⚡ |
| Is it too late to meet my soulmate? | `cards-too-late-love` | ⚡ |
| Will I find a new soulmate after loss? | `cards-new-soulmate` | ⚡ |
| Am I ready to love again after losing him? | `cards-ready-to-love` | ⚡ |
| Is there still a soulmate out there for me? | `cards-soulmate-out-there` | ⚡ |
| Why haven't I found my soulmate where I am? | `cards-not-found-yet` | ⚡ |
| Is my soulmate closer than I think? | `cards-soulmate-closer` | ⚡ |
| Where is my soulmate right now? | `cards-where-soulmate` | ⚡ |
| Will I love again? | `cards-love-again` |  |
| When is my soulmate coming? | `cards-soulmate` |  |

### `money` — Still Working

**22 ads · 22 armed · `money`**

At or past retirement age and still working, with nothing put away. Not a young woman trying to get rich — an older woman who expected to have arrived by now.

Every headline carries **a clock**. Not "I want more money" but "I have run out of time to fix this." The mechanism sold is an invisible block, never a budget — she has already tried budgets.

**What varies inside her**

- **The prayer pair — 2.** Marked ✝: they carry a content rule that exists nowhere else on the funnel. Prayer may be discussed because she raised it; the reading never speaks for God.
- **Betrayal — 1.** *"I lost what I had through someone I trusted"* — money grief with a person attached.
- **Acute — 1.** Paycheck to paycheck. Prior analysis found acutely broke buyers convert above average then decline the $47 upsell — price for one purchase, do not exclude them.
- **Self-sabotage — 1.** *"I talk myself out of everything"* — the only one where she names herself as the block.

| Ad headline | Hook id | |
|---|---|---|
| Why is my money still blocked this close to retiring? | `cards-blocked-retiring` | ⚡ |
| I earn it and it's gone. What's blocking my money? | `cards-earn-and-gone` | ⚡ |
| How long has my energy been working against my money? | `cards-energy-how-long` | ⚡ |
| How much longer will something keep blocking my money? | `cards-how-much-longer` | ⚡ |
| I can't stop working yet. What's still blocking my money? | `cards-money-cant-stop-working` | ⚡ |
| Whatever I've got has to last now. What's blocking my money? | `cards-money-has-to-last` | ⚡ |
| Everybody is getting ahead. Why won't the money reach me? | `cards-money-reach-me` | ⚡ |
| My time is running out. Is my energy blocking my money? | `cards-money-time-running-out` | ⚡ |
| What does my energy say about why money won't stay? | `cards-money-wont-stay` | ⚡ |
| Is my energy blocking my money? | `cards-my-energy` | ⚡ |
| How long has something been blocking me from a nest egg? | `cards-nest-egg` | ⚡ |
| I've got nothing put away. Is my energy blocking my money? | `cards-nothing-put-away` | ⚡ |
| Is something still blocking my money, or have I run out of time? | `cards-out-of-time` | ⚡ |
| I'm living paycheck to paycheck and can't get started. Is my energy blocking my money? | `cards-paycheck-to-paycheck` | ⚡ |
| I keep paying what I owe. Why is my money still blocked? | `cards-paying-what-i-owe` | ⚡ |
| I've prayed about money for years. What's still blocking it? | `cards-prayed-years` | ✝⚡ |
| How long will my prayers for money keep going unanswered? | `cards-prayers-unanswered` | ✝⚡ |
| Why am I still working when the money should have come by now? | `cards-still-working` | ⚡ |
| I talk myself out of everything. What's blocking my money? | `cards-talk-myself-out` | ⚡ |
| Is something blocking my money, or did I just leave it too late? | `cards-too-late` | ⚡ |
| I lost what I had through someone I trusted. Is that still blocking my money? | `cards-trusted-loss-blocking-money` | ⚡ |
| I'm still working. What's blocking the money I should have by now? | `cards-working-money-by-now` | ⚡ |

### `commit` — Still Waiting on a Ring

**15 ads · 15 armed · `decode-him`**

In the relationship right now, often years deep. He has not left and he has not committed.

She has **no event to point at**. Nobody cheated, nobody walked out — so she cannot justify her own unhappiness to her friends or to herself.

**What varies inside her**

- **How much longer — 5.** The clock question, the same lever as money and loneliness.
- **Why won't he — 4.** Explanation-seeking.
- **Is he even capable — 3.** Scared, slow, or never going to.
- **Is it me — 1.** *"Why do I keep picking non-committal men?"* — the only self-frame line here.
- **The decision — 2.** She is deciding whether to leave, not whether he loves her.

| Ad headline | Hook id | |
|---|---|---|
| Does he want to commit, or does he just want company? | `cards-commit-or-company` | ⚡ |
| Why is commitment still uncertain after all these years? | `cards-commitment-uncertain-years` | ⚡ |
| What am I doing wrong that he won't commit? | `cards-doing-wrong-wont-commit` | ⚡ |
| How much longer do I wait for him to commit? | `cards-how-much-longer-commit` | ⚡ |
| Why won't he commit when neither of us has time to waste? | `cards-no-time-to-waste-commit` | ⚡ |
| Why do I keep picking non-committal men? | `cards-picking-noncommittal-men` | ⚡ |
| Is he ever going to be ready for real commitment? | `cards-ready-commit` | ⚡ |
| Is he scared to commit, or just never going to? | `cards-scared-or-never-commit` | ⚡ |
| Is he slow to commit, or is he wasting my time? | `cards-slow-commit-or-wasting-time` | ⚡ |
| How long do I give him to commit before I move on? | `cards-time-to-commit-before-moving-on` | ⚡ |
| How long do I wait for him to commit this time? | `cards-wait-commit-this-time` | ⚡ |
| Will he ever commit? | `cards-will-commit` | ⚡ |
| Why won't he commit to me? | `cards-wont-commit` | ⚡ |
| Why won't he commit after all these years together? | `cards-wont-commit-years-together` | ⚡ |
| How many years together before he makes a commitment? | `cards-years-before-commitment` | ⚡ |

### `come back` — Will He Come Back

**13 ads · 0 armed · `decode-him`**

He ended it, or vanished. Recent enough that she is still checking her phone.

Two wounds that need different copy: **the ones who got an explanation** and **the ones who got silence**. Ghosting is not a breakup — there was no event to grieve, which is why she cannot close it.

**What varies inside her**

- **Will he — 4.** Straight ask.
- **Why did he — 3.** Ghosted, gone cold, left without a word — no explanation was ever given.
- **Is it over — 3.** She is asking for permission to stop waiting.
- **Is he drifting — 2.** He is still here but going.

| Ad headline | Hook id | |
|---|---|---|
| Will we get back together? | `cards-back-together` |  |
| Will he come back? | `cards-come-back` |  |
| Will he ever come back to me? | `cards-ever-back` |  |
| Why did he ghost me? | `cards-ghosted` |  |
| Why has he gone cold on me? | `cards-gone-cold` |  |
| Why did he leave without a word? | `cards-left-without-word` |  |
| Is he losing interest, or just going through something? | `cards-losing-interest` |  |
| Does he still love me, or has he moved on? | `cards-love-or-moved-on` |  |
| Is he coming back, or has he moved on? | `cards-moved-on` |  |
| Why is he pulling away from me? | `cards-pulling-away` |  |
| Is it really over between us? | `cards-really-over` |  |
| Will he come back? | `cards-return` | ⛔ |
| Is there still a chance for us? | `cards-still-a-chance` |  |

### `honesty` — Something Feels Off

**12 ads · 0 armed · `decode-him`**

Still with him. Nothing provable. Usually already told by someone that she is imagining it.

The wound is not the affair — it is **being made to doubt her own judgement**. The one headline that validates her instinct rather than asking about him does a different job to the other eleven.

**What varies inside her**

- **Twelve headlines, no repeated word.** Cheating, deceived, faithful, intuition, hiding, honest, lied, loyal, misled, someone else, talking to someone, truth. Either healthy variety or an angle never settled — performance data can tell you which.
- **Three are written in second person.** *"Is he cheating on **you**?"* These are the oldest hooks in the account and carry all three decks. Everything newer says "me".

| Ad headline | Hook id | |
|---|---|---|
| Is he cheating on you? | `cards-cheating` |  |
| Am I being deceived? | `cards-deceived` |  |
| Is he being faithful to me? | `cards-faithful` |  |
| Something feels off — is my intuition right? | `cards-feels-off` |  |
| Is he hiding something from me? | `cards-hiding-something` |  |
| Is he being honest with you? | `cards-honest` |  |
| Am I being lied to? | `cards-lied-to` |  |
| Is he loyal to only me? | `cards-loyal` |  |
| Am I being misled? | `cards-misled` |  |
| Is there someone else? | `cards-someone-else` |  |
| Is he talking to someone else? | `cards-talking-someone` |  |
| Is he telling me the truth? | `cards-truth` |  |

### `twin flame` — Fate or Fantasy

**11 ads · 0 armed · `decode-him`**

An intense connection, often with very little actually happening. Twin-flame vocabulary.

She is not asking about him. She is asking **whether she can trust her own reading of it** — because if it is not fate, she has spent years on something that was never there.

**What varies inside her**

- **Shares her word with the Soulmate Seeker.** 6 of these 11 say "soulmate". The difference is position: that woman is waiting for someone unmet, this one thinks she has already found him.
- **⚠ Two hooks, one headline.** `cards-twin-back` and `cards-twinflame-back` carry **identical ad copy** on the same deck. They would compete in the same auction.

| Ad headline | Hook id | |
|---|---|---|
| Why does this connection feel like my soulmate when nothing is happening? | `cards-connection-nothing` |  |
| Is this connection my soulmate, or something else? | `cards-connection-soulmate` |  |
| Have I already met my soulmate without realizing it? | `cards-met-already` |  |
| Is my soulmate coming back to me? | `cards-my-soulmate-back` |  |
| Is he really my soulmate? | `cards-really-soulmate` |  |
| Is my twin flame coming back to me? | `cards-twin-back` |  |
| Does my twin flame feel this too? | `cards-twin-feels` |  |
| Is he my twin flame, or just a strong connection? | `cards-twin-or-connection` |  |
| Is my twin flame ready for me? | `cards-twin-ready` |  |
| Is my twin flame coming back to me? | `cards-twinflame-back` |  |
| Was he ever really my soulmate? | `cards-was-he-soulmate` |  |

### `miss` — I Can't Put Him Down

**10 ads · 0 armed · `decode-him`**

It is genuinely over. She knows. She is still thinking about him daily.

Not asking for his return — asking **when she gets herself back**. Some of it is about a man who hurt her, which she knows makes no sense, and that self-judgement is what to write to.

**What varies inside her**

- **Six ask "will I ever".** The shape of the whole group: a future she cannot picture.
- **One asks about him, not her.** *"Was I not enough for him to stay?"* — the only line that turns the blame outward and back.

| Ad headline | Hook id | |
|---|---|---|
| Why can't I stop thinking about him? | `cards-cant-stop` |  |
| Am I ever going to feel like myself again? | `cards-feel-like-myself` |  |
| Will I ever find closure? | `cards-find-closure` |  |
| Will my heart ever heal? | `cards-heart-heal` |  |
| Was I not enough for him to stay? | `cards-not-enough` |  |
| Why is he always on my mind? | `cards-on-my-mind` |  |
| Why do I still miss him after everything? | `cards-still-miss-him` |  |
| I miss him so much — will this ever stop hurting? | `cards-stop-hurting` |  |
| Will I ever stop missing him? | `cards-stop-missing` |  |
| Why do I still think about someone who hurt me? | `cards-who-hurt-me` |  |

### `love` — Does He Feel Anything

**7 ads · 0 armed · `decode-him`**

Any stage of any relationship. The softest, most general ask in the account.

Careful with this group. Prior analysis found the soft *"does he love me"* question converts **below** the trust and doubt questions asking essentially the same thing — *"Is he telling me the truth?"* beats *"Does he really love me?"*, because doubt gives her something specific she wants answered.

**What varies inside her**

- **Holds a protected control.** `cards-feels` is never rewritten and never tested — it is the baseline the account is read against.
- **One does not belong.** *"Have I already given him too long?"* is a decision, not a feelings question. It sits closest to the commitment persona.

| Ad headline | Hook id | |
|---|---|---|
| How does he really feel about me? | `cards-feel-about-me` |  |
| How does he really feel about you? | `cards-feels` | ⛔ |
| Does he love me, or am I imagining it? | `cards-imagining-it` |  |
| Does he really love me? | `cards-really-love` |  |
| Does he still love me? | `cards-still-love` |  |
| Does he still think about me? | `cards-still-think` |  |
| Have I already given him too long? | `cards-too-long` |  |

### `second place` — Second Place

**4 ads · 0 armed · `decode-him`**

She is in his life. She is not first in it — his children, his ex, another household.

She cannot complain to anyone, because the thing hurting her is a man **doing something admirable** (putting his kids first) or an arrangement she agreed to. Four ads for a wound this specific is under-served.

**What varies inside her**

- **Four headlines, four different rivals.** His future, her shadow, his children, the distance. Each is a different competitor for his attention and arguably a different woman.

| Ad headline | Hook id | |
|---|---|---|
| Am I his forever, or his now? | `cards-forever-or-now` |  |
| Am I living in her shadow? | `cards-her-shadow` |  |
| Why do his children come before me? | `cards-his-children` |  |
| Why do we still live apart? | `cards-live-apart` |  |

### `real` — Is He Even Real

**2 ads · 0 armed · `decode-him`**

An online-only relationship. She has never met him. Often money has already changed hands.

The only persona whose question has a **real-world answer with her money attached**. Everyone around her has already told her it is a scam; she is here because we are the only one who will not say it outright.

**What varies inside her**

- **Two ads for a common, serious situation.** The clearest coverage gap in the account.

| Ad headline | Hook id | |
|---|---|---|
| Is he the real person, or just a picture? | `cards-real-person` |  |
| Is he really who he says he is? | `cards-who-he-is` |  |

---

## Where this came from

`fb-tarot/docs/lander-registry.md` — generated from `client/src/content/tarotReads.ts` and the frame Sets
in `server/lib/prompts.ts`, so it cannot claim a lander the code does not serve. Personas are grouped by
a strict partition: every headline is assigned to exactly one persona, and the eleven sum to 148 with the
armed count landing on 81 — matching the registry's own figure, which cross-checks the grouping.

Persona names and keywords are labels for talking about groups quickly. They do not exist in the code —
the registry's own words are *category* and *frame Set*.
