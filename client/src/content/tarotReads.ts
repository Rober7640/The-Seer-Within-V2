// Copy + lookup tables for the /fb-tarot "decode-him card" quiz-bridge funnel.
// Single source of truth shared by TarotBridge (the lander) and useConversation
// (the chat handoff). Parallel to palmReads.ts but a SEPARATE system so the palm
// funnel is never touched. See fb-tarot/docs/PRD-tarot-bridge.md.
//
// The tarot funnel is the "reads-HIM" exception: a palm sign reads HER hand; a
// tarot pull legitimately reads another person/situation (is he honest / coming
// back / how he feels / cheating). The guardrail is therefore TIGHTER —
// "tendency, never verdict": affirm HER intuition, never a flat accusation of him.
//
// Two axes (both from the URL, both default to the seeded deck):
//   deck — WHICH card set the ad quizzed. A deck brings its own strip art, the
//          face-down/face-up "facing", 3 card archetypes, and reads. The skill
//          `fb-tarot-add-card` adds a deck by reading a supplied card image.
//   hook — WHICH decode-him question the ad asked (honest / return / feels /
//          cheating). Sets the headline + the wound a read mirrors.
//   card — the option the visitor tapped (a/b/c). For a FACE-DOWN deck this is
//          the card "drawn" on reveal; for FACE-UP it's the visible card chosen.
//
// Three versions (route /b → B, /c → C, else A), same split as the palm bridge:
//   Version A  (/fb-tarot)    → static reveal card on S3, then a brief greeting
//   Version B  (/fb-tarot/b)  → no card; the reveal is delivered as chat messages
//   Version C  (/fb-tarot/c)  → interactive — the card line + one open question,
//                               the LLM reads her answer (falls back to static)

import type { Bucket } from '@/types/chat'

export type TarotHook =
  // Decode-him hooks (read HIM, "tendency, never verdict").
  | 'cards-honest' // Is he being honest with you?
  | 'cards-return' // Will he come back?
  | 'cards-feels' // How does he really feel about you?
  | 'cards-cheating' // Is he cheating on you?
  // Trust/authenticity hooks (2026-07-30). Still decode-him, but the wound is who he
  // IS rather than what he's done: the man he presents vs the man underneath, whether
  // there's a real person behind an image, and whether the account she's been given
  // matches what she has seen herself. Reads are bespoke — deliberately no shared
  // vocabulary with cards-honest, so a visitor never gets a reveal that answers a
  // different question than the headline she clicked.
  | 'cards-who-he-is' // Is he really who he says he is?
  | 'cards-real-person' // Is he the real person, or just a picture?
  | 'cards-misled' // Am I being misled?
  // Commitment hooks (2026-07-31). Decode-him in FORM — read as a tendency, never a
  // verdict — but the wound is the FUTURE he won't name rather than his conduct or his
  // identity. These invite prediction far more than the other angles do ("will he",
  // "is he ever going to"), so the reads deliberately answer about where HE stands
  // rather than what happens next, and never carry a timeframe.
  | 'cards-will-commit' // Will he ever commit?
  | 'cards-wont-commit' // Why won't he commit to me?
  | 'cards-ready-commit' // Is he ever going to be ready for real commitment?
  // Honesty/lying hooks (2026-08-03). Decode-him in FORM — tendency, never verdict —
  // but the wound is a SPECIFIC UNTRUTH rather than his character, his identity or his
  // future. Deliberately their OWN angle rather than folded into `trust`, so the family
  // can be compared as a group (operator call, 2026-08-03).
  //
  // ⚠ These sit closest to two hooks already live, so the reads are written bespoke and
  // guarded by tests/tarot-honesty-copy.test.ts: 'cards-honest' ("Is he being honest
  // with you?") reads his PRACTICE of presenting, and 'cards-misled' ("Am I being
  // misled?") reads the shaped ACCOUNT she has been handed. These three read,
  // respectively, a claim she was given, whether the telling is the whole of it, and
  // whether she has been deliberately played. Existing hooks are untouched — the
  // operator's standing rule is that a new headline never replaces an old lander.
  | 'cards-lied-to' // Am I being lied to?
  | 'cards-truth' // Is he telling me the truth?
  | 'cards-deceived' // Am I being deceived?
  // Reunion/return hooks (2026-08-04). Decode-him in FORM — tendency, never verdict —
  // but the wound is a man who has ALREADY GONE, and the question is whether he comes
  // back. Their own angle rather than folded into decode-him (operator call, 2026-08-04).
  //
  // ⚠ 'cards-come-back' carries the SAME headline string as the live 'cards-return'
  // ("Will he come back?") — deliberately. Operator decision 2026-08-04: cards-return
  // and both its live ad URLs (clean, and &deck=arcana-mfh) are untouched and STAY in
  // the decode-him angle; this is an entirely new hook running fresh reads against it,
  // so the two landers are a copy test on the same question. Because the page a visitor
  // sees is otherwise identical, the READS are the only variable — they are written
  // bespoke and guarded by tests/tarot-reunion-copy.test.ts.
  //
  // ⚠ This is the angle most likely to be answered with a PREDICTION, which the funnel
  // forbids. cards-return's Fool read once predicted a return outright ("what comes back
  // often comes back") until 2026-07-30; that phrasing is now blanket-banned on every
  // deck and hook. Beat 3 here answers where things STAND, never what happens next.
  | 'cards-come-back' // Will he come back?
  | 'cards-ever-back' // Will he ever come back to me?
  | 'cards-moved-on' // Is he coming back, or has he moved on?
  // Healing/moving-on hooks (2026-08-04). The FIRST angle whose subject is HER OWN MIND
  // rather than the man — she is not asking what he will do, she is asking why she cannot
  // stop thinking about him.
  //
  // ⚠ Deliberately NOT added to SELF_FRAME_HOOKS. Self-frame drops the "reads HIM / never
  // a verdict on him" guardrails (SELF_FRAME_TAROT_HOOKS, server/lib/prompts.ts) because
  // those hooks concern no specific man. Here a real man IS in the picture — on
  // 'cards-who-hurt-me' she has already named him as someone who hurt her — so the
  // no-verdict-on-him rule must stay ON while the AFFIRMATION points at her.
  //
  // 🔴 Nearest live neighbour is the reunion family, shipped the same day, and
  // 'cards-ever-back' in particular (the long wait, the place kept open). These three
  // must read the THINKING itself, not the waiting: why the mind returns (cant-stop),
  // how much room he still occupies (on-my-mind), and the shame of returning to an
  // injury (who-hurt-me).
  | 'cards-cant-stop' // Why can't I stop thinking about him?
  | 'cards-on-my-mind' // Why is he always on my mind?
  | 'cards-who-hurt-me' // Why do I still think about someone who hurt me?
  // Pulling-away hooks (2026-08-05). Decode-him in FORM — tendency, never verdict — and
  // the ONLY family about a man who is STILL THERE. Every other angle reads a man who has
  // gone (reunion), who will not name a future (commitment), who has told her something
  // untrue (honesty/trust), or who lives now only in her head (healing). Here he is
  // present and reachable and something has cooled, which is a different wound: not an
  // absence, a CHANGE IN TEMPERATURE. She has not lost him. She has lost what she had.
  //
  // 🔴 Nearest live neighbours are 'cards-feels' (also about his feelings, but static —
  // how he feels, not how he has CHANGED) and 'cards-return', whose Version-C opener
  // literally says "when he pulled away". The line is time: cards-return reads a man
  // already gone and asks whether he comes back; these read the going itself, while it
  // is still happening and nothing has been said.
  //
  // ⚠ Two failure modes on top of the usual no-verdict rule, and both are near-universal
  // answers to this question elsewhere on the internet, so they leak in easily:
  //   1. STRATEGY. "Give him space", "pull back and he'll chase", "stop texting". That is
  //      coaching on how to manage a man, not a reading — and it is manipulation advice.
  //   2. EXCUSING HIM. "He's just stressed", "men need space". An excuse is a verdict
  //      wearing a kinder face, and on 'cards-losing-interest' it is literally one half
  //      of the binary the read has to refuse.
  | 'cards-pulling-away' // Why is he pulling away from me?
  | 'cards-gone-cold' // Why has he gone cold on me?
  | 'cards-losing-interest' // Is he losing interest, or just going through something?
  // Reconciliation hooks (2026-08-06). The SAME topic as reunion — getting back together
  // — but framed around US rather than HIM, and that changes what the read has to do.
  //
  // 🔴 The reunion family casts him as the agent and her as the one waiting on his
  // decision ('will HE come back'). These cast the relationship as a joint thing with two
  // people in it ('will WE get back together'). Operator call 2026-08-06: run them as
  // their own angle so him-framing and us-framing can be compared at ANGLE level, which
  // is the actual question being tested.
  //
  // ⚠ The us-framing opens a failure mode the reunion trio does not have: these headlines
  // ask for a verdict on the RELATIONSHIP rather than on him, and a verdict on a
  // relationship is just as forbidden and lands harder. 'It is over' is a death notice;
  // 'it is not over' is a promise. 'cards-still-a-chance' asks for odds outright, and
  // 'cards-really-over' asks to be told whether to stop hoping — neither is answerable by
  // a card, and pretending otherwise is the whole harm.
  //
  // 🔴 These are NOT self-frame. The us-framing includes her, but a real man is in the
  // picture and every no-verdict-on-him guardrail stays on. Same warning as HEALING_HOOKS.
  | 'cards-back-together' // Will we get back together?
  | 'cards-still-a-chance' // Is there still a chance for us?
  | 'cards-really-over' // Is it really over between us?
  // Soulmate-after-loss hooks (2026-08-07). The forward-looking half of bereavement:
  // she has lost a partner and is asking what is still ahead of her, NOT asking to reach
  // what is behind her. Sourced from a buyer pull where ~12-15% of the concerns came from
  // people whose spouse or partner had died (operator brief, 2026-08-07).
  //
  // 🔴 This is the ONLY family where the man in the picture may be DEAD, and that creates
  // a failure mode no other angle has: MEDIUMSHIP. "He is at peace", "he is watching over
  // you", "he would want you to move on" — contact with the dead is a different product
  // with a far larger compliance surface, and nothing in universalSafety.ts catches it.
  // Banned outright in every read here and pinned by tests/tarot-soulmate-after-loss-copy.test.ts.
  //
  // ⚠ Deliberately NOT added to SELF_FRAME_HOOKS, and this is the sharpest instance of
  // that call yet. Self-frame swaps the "tendency, never a verdict" guard for "affirm the
  // hopeful yes with CERTAINTY" (SELF_FRAME_TAROT_HOOKS, server/lib/prompts.ts). Aimed at
  // a bereaved partner, certainty becomes a promise of a replacement — and on
  // 'cards-ready-to-love' it becomes a stranger certifying that a widow has grieved
  // enough. These get their own third frame instead (AFTER_LOSS_TAROT_HOOKS).
  //
  // 🔴 Nearest live neighbours are the self-frame incumbents, which stay exactly as they
  // are (standing rule: a new headline never replaces an old lander). 'cards-soulmate'
  // ("When is my soulmate coming?") answers WHEN for someone still waiting for a first
  // love; 'cards-love-again' ("Will I love again?") reads a heartbreak. These read a
  // BEREAVEMENT, and the reads are bespoke — no vocabulary is shared with either.
  | 'cards-new-soulmate' // Will I find a new soulmate after loss?
  | 'cards-soulmate-out-there' // Is there still a soulmate out there for me?
  | 'cards-ready-to-love' // Am I ready to love again after losing him?
  // Soulmate-where hooks (2026-08-07). The SEEKING half of the soulmate topic — she has
  // never found it, nobody has died, and no specific man is in the picture. That makes them
  // self-frame in SHAPE (the hopeful yes may be affirmed) but they are deliberately NOT
  // filed there, because each carries a ban self-frame does not have. They run under a
  // fourth frame, SOULMATE_WHERE_TAROT_HOOKS (server/lib/prompts.ts).
  //
  // 🔴 LOCATION is the new failure mode, and until this family there was no guard for it
  // anywhere in the codebase. The self-frame guard says to withhold "ONLY the specifics —
  // never a name, a date, or exactly who". Name, date, who. NOT where. So a model asked
  // "Where is my soulmate right now?" under that guard answers with a place, confidently,
  // because the guard tells it to. The harm is not vagueness — it is specificity that lands
  // on a real, identifiable person ("someone already in your circle", "at your work"), which
  // she can then act on. `where` was added to the self-frame withhold list at the same time,
  // since that gap applied to the live 'cards-soulmate' lander too.
  //
  // ⚠ 'cards-soulmate-closer' is a deliberate COPY TEST against the live 'cards-soulmate':
  // its headline is that lander's own read text hoisted into a hook — the tendency string in
  // prompts.ts literally lands "nearer than the waiting has let her believe". So the reads
  // here must NOT restate it. This one refuses the proximity claim outright and reads the
  // BRACING instead: the hope she has been managing downward in order to stay safe.
  //
  // 🔴 Nearest live neighbour is 'cards-soulmate-out-there' ("Is there still a soulmate out
  // there for me?"), shipped the same day under `soulmate-after-loss`. That one reads a
  // BEREAVEMENT and answers the premise that she was issued one chance and already spent it.
  // These read a woman who has never found it at all. No vocabulary is shared with it.
  | 'cards-where-soulmate' // Where is my soulmate right now?
  | 'cards-soulmate-closer' // Is my soulmate closer than I think?
  | 'cards-not-found-yet' // Why haven't I found my soulmate where I am?
  // Loneliness hooks (2026-08-07). No man exists anywhere in these — not lost, not left,
  // not sought. The subject is her own life and whether it is going to stay as it is.
  //
  // 🔴 THE CLOSEST ANGLE ON THE FUNNEL TO THE CRISIS SURFACE. "Will I be alone forever?" is
  // what someone types at 2am, and Version C then asks her to answer in her own words.
  // `SOFT_CRISIS_PATTERNS` in server/lib/universalSafety.ts screens for exactly the phrasing
  // that invites — "nothing left to live for", "i feel hopeless/worthless/empty/numb/broken",
  // "life feels meaningless", "tired of living" — and injects the 988/741741 note. That is
  // the system working, but it means the OPENERS here carry a constraint no other family
  // has: they must not manufacture despair phrasing. Each asks her to think about the
  // question's shape rather than to describe the pain.
  //
  // 🔴 TWO of the three must REFUSE THEIR OWN HEADLINE, and the refusals are different:
  //   · 'cards-alone-forever' — the ABSOLUTE. Same structure as cards-really-over: "yes"
  //     is a life sentence handed down by a stranger, "no" is a promise the funnel cannot
  //     keep. Neither is sayable.
  //   · 'cards-meant-alone' — the FATE claim, and the sharpest hook built so far. It asks
  //     for a verdict on her NATURE rather than on a man or a relationship. "Yes, some
  //     people are meant to be alone" is the most harmful sentence this funnel could
  //     produce, aimed at the audience least able to discount it; "no, you are meant for
  //     someone" is a promise dressed as destiny. The read refuses that anything is MEANT.
  //
  // ⚠ Written AUDIENCE-AGNOSTIC by operator call 2026-08-07: none of the three headlines
  // mentions an ex, a loss or a breakup, so the reads may never presume she has had love
  // before, and may never presume she has not. That rules out both "after what you have
  // been through" and "you have never had this".
  //
  // 🔴 'cards-someone-for-me' sits nearest 'cards-soulmate-out-there' ("Is there STILL a
  // soulmate out there for me?", soulmate-after-loss, same day). One word separates them:
  // "still" presumes she had someone; "really" presumes doubt that anyone exists. Its read
  // also had to steer clear of 'cards-still-a-chance', whose finding is that hope is not a
  // failure of realism — so this one reads the EPISTEMICS instead: she has been handed
  // comfort where she asked for an answer.
  | 'cards-alone-forever' // Will I be alone forever?
  | 'cards-meant-alone' // Am I meant to be alone?
  | 'cards-someone-for-me' // Is there really someone out there for me?
  // Fidelity hooks (2026-08-07). FOUR landers, not three — decode-him already carries four,
  // so the count is not novel. Decode-him in FORM: a real man, read strictly as a tendency,
  // never a verdict. What is new is a COMPLIANCE constraint rather than a safety one.
  //
  // 🔴 THE FLAGGED WORD. These exist because the ad platform flags "cheating", so the whole
  // family is that question asked without it. Two consequences that are easy to miss:
  //   1. The word must be absent from the LANDER, not just the ad — the platform reviews
  //      landing pages. A compliant headline pointing at a page that says it in beat 3
  //      defeats the exercise.
  //   2. The word must be absent from the HOOK SLUG too, because the slug travels in the
  //      ad's destination URL (`/fb-tarot/c?hook=…`). That is why none of these four is
  //      named for the thing it asks about.
  // Banned across headline, opener, reads, slug and the generated prompt path, and pinned
  // by tests/tarot-fidelity-copy.test.ts: cheat/cheating/cheater/affair/infidelity.
  // "Faithful" and "loyal" are explicitly fine — the operator's own headlines use them.
  //
  // 🔴 The incumbent is 'cards-cheating' ("Is he cheating on you?"), which is LEFT ALONE
  // (standing rule: a new headline never replaces an old lander) and stays in `decode-him`.
  // It carries the flagged word in its visible headline, so it presumably cannot run — but
  // the consequence for reporting is that an `angle = fidelity` filter EXCLUDES it, exactly
  // as `angle = reunion` excludes 'cards-return'. New-vs-incumbent is a HOOK-level compare.
  //
  // ⚠ All four are the same question from four distances, so the reads are written to four
  // separate findings and must not drift together: the EXPLANATION she was left to author
  // (someone-else), the ATTENTION she watched go elsewhere (talking-someone), the SUMMARY
  // JUDGMENT nobody outside a relationship can issue (faithful), and the SHARE she has been
  // taking for the whole (loyal).
  //
  // 🔴 'cards-cheating' already reads the UNEASE ("real information, not paranoia to
  // apologize for"). No read here may restate that — it is the incumbent's finding, and
  // reusing it would make the copy test measure nothing.
  | 'cards-someone-else' // Is there someone else?
  | 'cards-talking-someone' // Is he talking to someone else?
  | 'cards-faithful' // Is he being faithful to me?
  | 'cards-loyal' // Is he loyal to only me?
  // Missing-him hooks (2026-08-10). The SECOND family aimed at her own mind rather than at
  // him, and the sibling of HEALING_HOOKS — but a different organ of the same wound, and
  // the two must not drift together:
  //
  //   · healing reads the THINKING. Her mind keeps returning to him and she wants to know
  //     why it will not stop presenting him to her.
  //   · these read the ACHE OF HIS ABSENCE. Not that she thinks about him — that the place
  //     where he was still hurts, which is a feeling rather than a cognition.
  //
  // 🔴 'cards-cant-stop' ("Why can't I stop thinking about him?") is the nearest live
  // lander and it STAYS EXACTLY WHERE IT IS, in `healing` (standing rule: a new headline
  // never replaces an old one). The families are close enough that an `angle` filter is
  // the only thing keeping their numbers readable — folding these three into HEALING_HOOKS
  // would retroactively mix two questions inside one set of running numbers.
  //
  // ⚠ THE DEFINING BAN IS THE TIMEFRAME, and it is unusually hard here because two of the
  // three headlines ASK FOR ONE outright. "Will this ever stop hurting?" and "Will I ever
  // stop missing him?" are WHEN questions, and the answer may never be a when — not "a few
  // months", not "it takes half the length of the relationship", not "you will know when".
  // Every other angle bans timeframes as an aside; here it is the whole discipline.
  //
  // ⚠ The FOREVER ban runs with it, in both directions, borrowed from LONELINESS_HOOKS:
  // "you will always love him" is a life sentence handed down by a stranger, and "this will
  // pass soon, I promise" is a promise the funnel cannot keep. Refuse both poles.
  //
  // 🔴 NEVER PRESUME HOW HE CAME TO BE GONE. "I miss him so much" is precisely what a
  // BEREAVED woman types, and these headlines do not ask her to say which. A read that
  // assumes he chose to walk away is brutal if he died; a read that assumes a death is
  // absurd if he left. Nothing here may name the manner of his going — and if he did die,
  // the mediumship ban of the soulmate-after-loss family applies with full force, because
  // this family runs under the decode-him frame, which bans none of it (see
  // TAROT_HOOK_TENDENCY in server/lib/prompts.ts, where that ban is carried per-hook).
  //
  // ⚠ 'cards-still-miss-him' is the heaviest of the three and the sibling of
  // 'cards-who-hurt-me': "after everything" means after what he did, so she has already
  // named a harm. Same two opposite pulls — minimising what she named abandons her, and
  // pronouncing on him is the forbidden verdict — plus a third that is specific to it:
  // she is really asking what is wrong with her for still missing him, and no part of the
  // answer may land as her weakness, her naivety, her low self-worth or an attachment
  // disorder. Pinned by tests/tarot-missing-him-copy.test.ts.
  | 'cards-stop-hurting' // I miss him so much — will this ever stop hurting?
  | 'cards-stop-missing' // Will I ever stop missing him?
  | 'cards-still-miss-him' // Why do I still miss him after everything?
  // Why-he-left hooks (2026-08-11). The operator's category is "Reunion/Return" and the
  // topic is "Why he left / ghosting" — but the topic, not the category, is the angle:
  //
  //   · `reunion` asks WILL HE COME BACK. A question about the FUTURE, and the whole read
  //     is a leaning about what is ahead.
  //   · these ask WHY DID HE GO. A question about the PAST, about a thing that has already
  //     happened and that he never explained.
  //
  // 🔴 REUNION_HOOKS must stay exactly three. Filing these there would retroactively mix
  // two different questions inside one set of running numbers — the same call made for
  // `missing-him` against `healing` on 08-10, and for `reconciliation` against `reunion`.
  //
  // ⚠ THE DEFINING BAN IS THE MOTIVE, and the shared decode-him guard does not carry it.
  // That guard names four claims — lying, faithful, involved with someone else, coming
  // back — and every one of these three headlines asks for a FIFTH: why he did it. "He
  // was overwhelmed", "he was a coward", "he never valued you" are all flat verdicts on a
  // man's interior, and all three would pass the shared guard untouched. The ban is
  // therefore written per-hook in TAROT_HOOK_TENDENCY (server/lib/prompts.ts).
  //
  // 🔴 NEVER PRESUME WHY OR HOW HE WENT. A man who disappears without a word may have
  // died, been taken ill, or be in trouble; "ghosted" is HER reading of the silence, not
  // an established fact. The reads work with the silence itself, which is the only thing
  // actually known — and if he is in fact dead, the mediumship ban applies for the same
  // reason it does in `missing-him`: this family runs under the decode-him frame, which
  // bans none of it.
  //
  // 🔴 NEVER HAND HER A TACTIC. "Why did he ghost me?" has the most saturated wrong answer
  // on the internet attached to it — reach out once more, send this text, check whether he
  // has read it. The pursuit/surveillance ban from PULLING_AWAY_HOOKS comes along whole.
  //
  // ⚠ 'cards-not-enough' is the heaviest headline on the funnel to date. It is the FIRST
  // that states her own worthlessness as its premise and asks for a ruling on it, and the
  // only humane answer collides with the standing verdict ban: "you were enough"
  // necessarily implies he left for reasons that were not about her worth, which is a
  // claim about him. The resolution is to refuse the comparison itself rather than to
  // score it — his leaving is not a measurement that was taken, so it returned no verdict
  // on her to read. NEVER enumerate what she lacked, and NEVER coach her self-worth.
  // Pinned by tests/tarot-why-he-left-copy.test.ts.
  | 'cards-left-without-word' // Why did he leave without a word?
  | 'cards-ghosted' // Why did he ghost me?
  | 'cards-not-enough' // Was I not enough for him to stay?
  // Searching hooks (2026-08-11) — the SECOND batch commissioned under the
  // "Loneliness/Timing" brief. The first became LONELINESS_HOOKS on 2026-08-07, and the
  // note there records that none of those three turned out to be about timing. These are:
  // the subject is the DURATION and the EFFORT of looking, not whether a person exists.
  //
  // Same shape as loneliness — no man appears in any of them — but a different question.
  // Loneliness asks whether her life STAYS as it is. These ask what the looking has cost
  // her, and two of them ask her to be judged for it.
  //
  // 🔴 EACH OF THE THREE CARRIES A BAN THAT EXISTS NOWHERE ELSE ON THE FUNNEL:
  //
  //   · 'cards-end-up-alone' asks WHY — the first headline that requests a CAUSE for her
  //     own life. Every loneliness guard refuses a *whether* ("will I be alone", "am I
  //     meant to be"); none refuses a *why*. The banned sentences here are not the crude
  //     ones the frame already catches (defeatist, self-sabotaging, closed off) but the
  //     kind, fluent ones that dodge every one of those words while still handing a woman
  //     a diagnosis of her life: "you keep giving to people who cannot receive it", "the
  //     timing has never been yours". Those are verdicts on her wearing sympathy. The
  //     finding is that "why" presumes a reason exists to be found, and no honest reading
  //     has one — so it refuses to supply a cause at all.
  //
  //   · 'cards-given-up' asks her to be graded on her own interior, and BOTH answers do
  //     harm: "yes" is the exact sentence 'cards-alone-forever' already bans, and "no" is
  //     the reassurance she came here having exhausted. The novel ban is on the headline's
  //     own premise — "without realizing it" invites Evelyn to claim better access to her
  //     mind than she has, and she is the only authority on it.
  //
  //   · 'cards-stop-searching' asks for a forecast about the effort ending. It inherits
  //     loneliness's both-directions refusal, and adds the ban on the single most common
  //     answer to this question anywhere: "it happens when you stop looking" — which is a
  //     tactic and a fault attribution wearing a proverb.
  | 'cards-stop-searching' // Am I ever going to stop searching?
  | 'cards-end-up-alone' // Why do I keep ending up alone?
  | 'cards-given-up' // Have I given up on love without realizing it?
  // Twin-flame hooks (2026-08-11). ⭐⭐ A VOCABULARY TEST, not a new question. All three
  // are questions the funnel ALREADY runs, with "my twin flame" substituted for "he":
  //
  //   cards-twin-ready  ~ cards-ready-commit  'Is he ever going to be ready for real commitment?'
  //   cards-twin-feels  ~ cards-feels         'How does he really feel about you?'
  //   cards-twin-back   ~ cards-ever-back     'Will he ever come back to me?'
  //
  // Same design as `reconciliation` against `reunion`, and `fidelity` against the flagged
  // word: the comparison is at HOOK level against three named incumbents in three DIFFERENT
  // families, so read it hook-by-hook rather than as one angle-vs-angle number.
  //
  // 🔴 DECODE-HIM IN FORM. A real, specific man is in all three — "my twin flame" is
  // somebody she already has in mind — so every no-verdict-on-him guard stays on and these
  // are NOT self-frame. What is new is what must be refused ON TOP of that:
  //
  //   · THE LABEL. All three headlines PRESUPPOSE he is her twin flame. Evelyn never
  //     certifies it. A stranger ruling that one named man is somebody's fated other half
  //     is the claim 'cards-meant-alone' bans, pointed hopefully instead of cruelly — and
  //     it is unfalsifiable, so she cannot ever test it against what he actually does.
  //     The move is the one 'cards-not-enough' makes: affirm what she FEELS as real
  //     information about her, and decline the cosmology the question is built on.
  //
  //   · THE THREE COMMUNITY TROPES, none of which is banned anywhere on this funnel today,
  //     and all of which teach a woman to read being ignored as evidence of destiny:
  //       RUNNER/CHASER — his avoidance is proof of the bond.
  //       SEPARATION PHASE — being left is a stage in a journey that ends in reunion.
  //       ASCEND FIRST — he returns once she has healed/raised her vibration enough.
  //     The last is the worst: it makes his return her homework, so his absence becomes
  //     her failure. This is the sharpest form of the standing "never hand her a tactic"
  //     rule and it is why this family needed its own guard file.
  | 'cards-twin-ready' // Is my twin flame ready for me?
  | 'cards-twin-feels' // Does my twin flame feel this too?
  | 'cards-twin-back' // Is my twin flame coming back to me?
  // Hidden/intuition hooks (2026-08-12). Operator brief: the Trust/Honesty FRAME applied to
  // a topic neither live family covers. Only TWO landers were commissioned — every family
  // before this shipped three, and the pair is deliberate, not an unfinished set.
  //
  // The topic is what is NOT being said, and how she is supposed to know. Held apart from
  // the two nearest live families on a real distinction:
  //   trust   = who he IS               ('Is he really who he says he is?')
  //   honesty = a specific untruth TOLD ('Am I being lied to?')
  //   here    = an OMISSION, and her own reading of it. Nobody has been caught in anything.
  //
  // 🔴 DECODE-HIM IN FORM. A real man stands in both, so every no-verdict-on-him guard
  // stays on and these are NOT self-frame — see TWIN_FLAME_HOOKS for the same call. What is
  // new is what must be refused on top:
  //
  //   · THE CONTENTS. 'cards-hiding-something' invites Evelyn to say WHAT is being hidden,
  //     and any answer is invention — another woman, money, a feeling, a past. This is the
  //     `searching` family's no-CAUSE ban pointed at a man instead of at her life, and here
  //     it is worse: supplying contents manufactures a crisis in a live relationship.
  //
  //   · THE TACTIC. No family on this funnel has needed the standing never-hand-her-a-tactic
  //     rule as sharply. "Is he hiding something" has one obvious next move — check his
  //     phone, test him, catch him — and it must never come from us in any form.
  //
  //   · GRADING HER FACULTY. 'cards-feels-off' asks a yes/no about her own perception, and
  //     BOTH answers do harm. "Yes, your intuition is right" convicts him by proxy, since
  //     her intuition has already reached a conclusion. "No" tells a woman her observation
  //     is imaginary, which is the one thing this funnel may never do. The move is to split
  //     the question: the NOTICING is real and may be affirmed; what it MEANS stays open.
  //     And never the flattering third option — intuition is "never wrong" turns every fear
  //     into a finding and licences her to act on a guess.
  | 'cards-hiding-something' // Is he hiding something from me?
  | 'cards-feels-off' // Something feels off — is my intuition right?
  // Real-feelings hooks (2026-08-12). Operator brief: the Feelings/Commitment FRAME on the
  // "does he really feel it" topic. All three ask the single hardest thing this funnel
  // refuses — report a real man's heart back to her — so the family's whole existence is a
  // sustained refusal to do that while still giving her something worth the click.
  //
  // 🔴 DECODE-HIM IN FORM. A real, specific man stands in all three ⇒ every no-verdict guard
  // stays on and these are NOT self-frame. The standing bans that bind hardest here:
  //   · NARRATING HIS INTERIOR — "he loves you", "he feels it too", "he is frightened of how
  //     much he feels". This is `cards-twin-feels`' central ban and it applies to all three.
  //   · No date, no forecast, no tactic, no diagnosis of him as avoidant/emotionally
  //     unavailable (the internet's answer to all three of these questions).
  //
  // ⚠️ 'cards-feel-about-me' IS A PRONOUN VARIANT of the live 'cards-feels' ("How does he
  // really feel about YOU?"). Operator call 2026-08-12: ship it as a you/me framing test,
  // read HOOK-LEVEL against that incumbent, never pooled.
  //
  // 🔴🔴 THE COMPARISON IS CONFOUNDED AND THAT MUST BE READ WITH THE RESULT. 'cards-feels' is
  // seeded 2026-07-28 copy from before the current guardrails — its reads assert his interior
  // outright ("the warmth you've felt from him is intended", "what he feels is real"). Nothing
  // written today may do that, so the challenger differs in COPY STANDARD as well as pronoun.
  // It cannot be fixed by rewriting the incumbent: 'cards-feels' is also the control in the
  // running twin-flame test (tests/tarot-twin-flame-copy.test.ts), so editing it would break
  // that comparison too. Treat any difference as "new lander vs old lander", not "me vs you".
  | 'cards-really-love' // Does he really love me?
  | 'cards-feel-about-me' // How does he really feel about me?
  // 🔴 A BINARY whose second branch puts HER PERCEPTION on trial. Both doors are banned:
  // "he loves you" narrates his interior, and "you imagined it" is the gaslighting
  // 'cards-feels-off' exists to forbid — here the headline actively invites it. Refuse the
  // either-or the way 'cards-moved-on' does, and affirm the noticing the way 'cards-feels-off'
  // does. ⚠️ Opposite VALENCE to that hook and that is what keeps the two distinct:
  // cards-feels-off = she fears something BAD is true · this = she fears something GOOD is not.
  | 'cards-imagining-it' // Does he love me, or am I imagining it?
  // Still-feels hooks (2026-08-14). The operator's category is "Reunion/Return" and the topic
  // is "Does he still feel it" — and as with 'why-he-left', the TOPIC is the angle, not the
  // category. REUNION_HOOKS must stay exactly three (see that family's note); folding these in
  // would retroactively mix two questions inside numbers that have been running since 08-04.
  //
  //   · `reunion` asks whether he will ACT — come back, return, appear. A question about the
  //     FUTURE, answered as a leaning about what is ahead.
  //   · these ask whether he still FEELS — a question about the PRESENT CONTENTS of a man who
  //     is already gone. He need not do anything at all for the answer to be yes.
  //
  // ⭐ THE DEFINING WORD IS "STILL", and it is the whole creative core of the family. "Still"
  // presumes the feeling WAS real — she is not asking whether it existed, she is asking whether
  // it SURVIVED his going. That premise is the one thing here that can be affirmed with
  // confidence, and affirming it costs nothing and is true: what she had was real. Whether it
  // persists inside him is exactly what may never be claimed.
  //
  // 🔴 NEAREST LIVE NEIGHBOUR IS 'cards-really-love' ("Does he REALLY love me?", real-feelings,
  // live since 08-12) — ONE WORD away, and the word is the entire difference:
  //   · "really" = doubt that what she was given ever AMOUNTED to love. A question about a
  //     STANDARD, and the man is typically still present.
  //   · "still"  = no doubt it was love. A question about SURVIVAL, and he has gone.
  // The reads must therefore share NO vocabulary with that family — not the ledger/record of
  // his conduct, not "chosen on ordinary days", not the standard the word "really" reaches for.
  // Pinned by tests/tarot-still-feels-copy.test.ts.
  //
  // ⚠ 'cards-still-think' is the MIRROR of healing's 'cards-on-my-mind' ("Why is he always on
  // my mind?") and the two must not drift: healing reads HER mind producing HIM; this reads
  // whether HIS mind produces HER. No lander on the funnel had previously asked what is in his
  // head about her.
  //
  // 🔴 'cards-love-or-moved-on' shares the verbatim clause "or has he moved on?" with reunion's
  // live 'cards-moved-on' ("Is he coming back, or has he moved on?"), which is UNTOUCHED and
  // stays in `reunion` (standing rule: a new headline never replaces an old lander). Its first
  // half is the variable — a FEELING rather than an ACTION. Its refusal must also be its own:
  // cards-moved-on refuses because neither branch is knowable, cards-imagining-it refuses
  // because the second branch is cruel. This one refuses because THE TWO ARE NOT OPPOSITES —
  // a person can have moved on with a life and still love; the either-or is false on its face.
  | 'cards-still-think' // Does he still think about me?
  | 'cards-still-love' // Does he still love me?
  | 'cards-love-or-moved-on' // Does he still love me, or has he moved on?
  // His-other-life hooks (2026-08-14). FIVE landers, the largest family on the funnel. The
  // operator's category is "Persona" and the topic "persona commitment" — and this is the first
  // commission that is genuinely a PERSONA rather than a topic: every headline describes the same
  // woman, one fitting herself into a life that was already furnished before she arrived. His
  // children. A woman who came first. His own front door. The years already spent.
  //
  // 🔴 NOT folded into `commitment` (live since 2026-07-31), and the line is clean:
  //   · `commitment` asks WILL HE EVER — a bare question with no circumstances attached.
  //   · these ask WHY HE HASN'T, and each names the specific obstacle she is living beside.
  // Folding them in would retroactively mix a generic question and five situated ones inside
  // numbers running since 07-31. Same call as `why-he-left` vs `reunion`, `missing-him` vs
  // `healing`, `still-feels` vs `real-feelings`.
  //
  // ⭐⭐ THE SHARED MOVE, and every read in the family turns on it: NAME HER POSITION WITHOUT
  // RANKING HER AGAINST WHAT WAS THERE FIRST. Every one of these headlines invites a ranking
  // answer — "you should come first", "you deserve better than second place" — and ranking is
  // precisely what may never be supplied, because the things she is measured against are either
  // children (who legitimately come first), a woman who may be dead, or a history nobody can
  // compete with. The affirmable thing is not a HIGHER place. It is a DEFINED one: she has never
  // been told where she stands, and she is allowed to want that said out loud without wanting
  // anybody else to have less.
  //
  // 🔴 WRITTEN AUDIENCE-AGNOSTIC BY OPERATOR CALL 2026-08-14. Four of the five turn on his
  // circumstances and NONE of the headlines states them. The reads may never presume whether he
  // is divorced, widowed, separated or still married. Assuming an ex is brutal if she has died;
  // assuming a death is absurd if they divorced; assuming a wife names the visitor a mistress on
  // a public page. Same discipline as `missing-him`, and harder here because it must hold across
  // five headlines rather than three.
  //
  // 🔴🔴 'cards-his-children' IS THE SHARPEST LANDER ON THE FUNNEL and carries a ban that exists
  // nowhere else: it asks a card to comment on a man's relationship with HIS CHILDREN — real
  // third parties, very possibly minors, who are not the visitor's rivals and cannot consent to
  // being read. The internet's stock answer to this headline is "you deserve to come first",
  // which tells a woman she should outrank a man's children. That may never be produced. Nor may
  // the children be framed as an obstacle, nor he be graded as a father.
  //
  // ⚠ 'cards-her-shadow' inherits the `soulmate-after-loss` MEDIUMSHIP ban for the same reason
  // `missing-him` does — "her" may be a dead wife, and this family runs the decode-him frame,
  // which bans none of it. The other woman may also be entirely legitimate (the mother of his
  // children, a late spouse) rather than a rival, so unlike `fidelity` she may NEVER be
  // disparaged, doubted or positioned as competition.
  //
  // ⚠ 'cards-forever-or-now' is the FOURTH binary-refusing hook and its grounds must differ from
  // the three already live — see the note on HIS_OTHER_LIFE_HOOKS below.
  | 'cards-forever-or-now' // Am I his forever, or his now?
  | 'cards-his-children' // Why do his children come before me?
  | 'cards-her-shadow' // Am I living in her shadow?
  | 'cards-live-apart' // Why do we still live apart?
  | 'cards-too-long' // Have I already given him too long?
  // Soulmate-label hooks (2026-08-17). The operator's category is "Feelings/Commitment" and the
  // topic "Soulmate / twin-flame crossover" — but as always the angle is named for what the
  // landers ASK, and all three ask the same thing: is a WORD true of this connection.
  //
  // 🔴 NOT folded into `twin-flame`, which is the nearest family and the tempting filing.
  // That family is a VOCABULARY test: three questions already running ("is he ready", "does he
  // feel it", "is he coming back") re-asked with "my twin flame" swapped in for "he". The
  // question underneath is unchanged and the label is only the wrapper. These three put THE
  // LABEL ITSELF in the question — there is no other question underneath. Folding them in would
  // put a family that interrogates the word into the family that merely uses it, and destroy
  // the wording comparison twin-flame exists to make.
  //
  // 🔴 NOT `soulmate-where` or `soulmate-after-loss`, which share the word and nothing else:
  // both ask about a person who might EXIST (where is he / is there still one for me) and
  // neither has a man in the picture. A real, specific man stands in these — so every
  // no-verdict-on-him guard stays on, and they must NEVER be added to SELF_FRAME_HOOKS. That
  // set is mirrored by SELF_FRAME_TAROT_HOOKS in server/lib/prompts.ts, whose clause is "affirm
  // the hopeful yes with CERTAINTY" — which on these headlines means certifying a living man as
  // her soulmate. That is precisely the banned move, so the filing would produce the harm.
  // ⚠ 'cards-met-already' is the one that most looks like self-frame and is not: she is very
  // often thinking of a particular man she already knows.
  //
  // ⚠ THE DEFINING BAN IS THE LABEL, in BOTH directions — never certify and never deny that he
  // is her soulmate or her twin flame. Inherited from the twin-flame family and extended to
  // "soulmate": it is a verdict on a real person and an UNFALSIFIABLE one, so she could never
  // test it against anything he does. Affirm the PULL as real information about HER; leave the
  // cosmology alone. The shared decode-him guard names four claims (lying, faithful, someone
  // else, coming back) and the label is none of them, so it is carried per-hook.
  //
  // 🔴🔴 AND A BAN THAT EXISTS NOWHERE ELSE: NEVER RANK THE LABELS. Never that a twin flame is
  // rarer, higher, deeper or more fated than a soulmate or a "strong connection", and never the
  // reverse. The whole internet does exactly this, and the ranking is what turns her own
  // "just a strong connection" into a consolation prize. Refuse the ladder rather than placing
  // him on it — the same move `his-other-life` makes about her position, applied to the words.
  //
  // ⚠ The RUNNER SCRIPT and SEPARATION-PHASE bans ride along from twin-flame, because the term
  // arrives carrying its community's whole teaching: never read his distance or silence as
  // PROOF of the bond, never call an absence a phase or a stage, and never make anything
  // conditional on her healing or raising her vibration.
  | 'cards-really-soulmate' // Is he really my soulmate?
  // ⚠ The FIFTH binary-refusing hook. Its grounds must differ from the four already live and do:
  // 'cards-moved-on' refuses because neither branch is knowable · 'cards-imagining-it' because
  // the second branch is cruel · 'cards-love-or-moved-on' because the two are not opposites ·
  // 'cards-forever-or-now' because permanence is built rather than assigned. THIS one refuses
  // because BOTH BRANCHES DESCRIBE THE SAME EVIDENCE UNDER TWO DIFFERENT WORDS — the answer
  // would not change one thing he does, or one thing she could observe or check. It is a naming
  // dispute wearing the clothes of a fact question.
  | 'cards-twin-or-connection' // Is he my twin flame, or just a strong connection?
  // 🔴🔴 NEVER NAME OR POINT AT A PERSON FROM HER PAST, and 🔴🔴 NEVER TELL HER SHE MISSED HIM.
  // The headline invites both and they are the two things this lander may never do: the first
  // sends her back through her own phone on a stranger's say-so, the second invents a loss for
  // her to grieve. Nor may the opposite be promised — "he is still ahead of you" is a forecast.
  | 'cards-met-already' // Have I already met my soulmate without realizing it?
  // Self-frame hooks (read HER, affirm the hopeful yes — like the palm love hooks).
  | 'cards-love-again' // Will I love again?
  | 'cards-soulmate' // When is my soulmate coming?
export type TarotCard = 'a' | 'b' | 'c' // the option the visitor tapped (A/B/C)
export type TarotOption = TarotCard
export type TarotVersion = 'a' | 'b' | 'c'
// Deck ids the skill can add. 'decode-him' = seeded face-down Sun/Moon/Tower;
// 'arcana-mfh' = face-up Magician/HangedMan/Fool (art re-ordered 2026-07-31);
// 'arcana-eef' = face-up
// Emperor/Empress/Fool; 'return-mhf' = face-down Magician/Hanged Man/Fool, the
// "Will he come back?" ad (all from Rio's card art).
export type TarotDeck = 'decode-him' | 'arcana-mfh' | 'arcana-eef' | 'return-mhf'

// Self-frame hooks read HER (affirm the yes); everything else is decode-him (read
// HIM as a tendency). The server reflect prompt branches on this too.
export const SELF_FRAME_HOOKS: TarotHook[] = ['cards-love-again', 'cards-soulmate']

// The trust/authenticity hooks (2026-07-30). Still decode-him in FORM — they read him as
// a tendency — but the wound is who he IS rather than what he has done.
export const TRUST_HOOKS: TarotHook[] = ['cards-who-he-is', 'cards-real-person', 'cards-misled']

// The commitment hooks (2026-07-31). Their own angle rather than folding into
// decode-him, so they can be filtered and compared as a GROUP — in PostHog and in the
// gate's per-lander table, which groups by facing x angle. Without this array they
// would silently fall through to 'decode-him' (see angleForHook) and be invisible as
// a family, which is the whole reason the angle property exists.
export const COMMITMENT_HOOKS: TarotHook[] = [
  'cards-will-commit',
  'cards-wont-commit',
  'cards-ready-commit',
]

// The honesty/lying hooks (2026-08-03). Their OWN angle rather than folding into
// `trust` — operator call: a new headline family gets its own reportable group, and
// the existing trust landers are left exactly as they are. Without this array they
// would silently fall through to 'decode-him' (see angleForHook) and disappear as a
// family in PostHog and in the gate's per-lander table.
export const HONESTY_HOOKS: TarotHook[] = ['cards-lied-to', 'cards-truth', 'cards-deceived']

// The reunion/return hooks (2026-08-04). Their OWN angle rather than folding into
// `decode-him` — operator call: this is a distinct ad family and needs to be reportable
// as one. Without this array they would silently fall through to 'decode-him'.
//
// 🔴 'cards-return' ("Will he come back?") is deliberately NOT in here. It is the
// original live lander on two ad URLs and stays exactly where it is, in `decode-him`
// (operator instruction 2026-08-04: do not replace or touch it). The consequence for
// reporting is that an `angle = reunion` filter EXCLUDES the original lander — comparing
// the two "Will he come back?" landers has to be a HOOK-level breakdown, not an
// angle-level one. Pinned by tests/tarot-reunion-copy.test.ts.
export const REUNION_HOOKS: TarotHook[] = ['cards-come-back', 'cards-ever-back', 'cards-moved-on']

// The healing/moving-on hooks (2026-08-04). Their OWN angle: the subject is her own mind,
// not his conduct, his identity, his future or his return — so folding them into any
// existing family would make the group unreadable in reporting.
//
// 🔴 These are NOT self-frame. See the note on the TarotHook union: a real man is in the
// picture, so the no-verdict-on-him guardrails stay on. The angle only changes WHO gets
// affirmed, never whether he gets judged.
export const HEALING_HOOKS: TarotHook[] = ['cards-cant-stop', 'cards-on-my-mind', 'cards-who-hurt-me']

// The pulling-away hooks (2026-08-05). Their OWN angle rather than folding into the
// existing `commitment` family — operator call 2026-08-05: the commitment landers ran a
// DIFFERENT topic (the future he will not name), and merging a new topic into a live
// family would retroactively mix two questions inside one set of numbers. Without this
// array they would fall through to 'decode-him' (see angleForHook) and disappear as a
// family in PostHog and in the gate's per-lander table.
export const PULLING_AWAY_HOOKS: TarotHook[] = [
  'cards-pulling-away',
  'cards-gone-cold',
  'cards-losing-interest',
]

// The reconciliation hooks (2026-08-06). Same topic as REUNION_HOOKS — getting back
// together — but framed around US instead of HIM. Their OWN angle rather than being
// folded into `reunion`: operator call 2026-08-06, the point of running them is to
// compare him-framing against us-framing, and that comparison only exists if the two
// families carry different angle labels.
//
// 🔴 REUNION_HOOKS must stay exactly three. Moving any of them in here, or adding these
// three there, destroys the very contrast the test was commissioned to measure. Pinned by
// tests/tarot-reconciliation-copy.test.ts.
export const RECONCILIATION_HOOKS: TarotHook[] = [
  'cards-back-together',
  'cards-still-a-chance',
  'cards-really-over',
]

// The soulmate-after-loss hooks (2026-08-07). Their OWN angle rather than folded into
// `self-frame`, for two separate reasons — either alone would be sufficient:
//
//  1. SAFETY. angleForHook is only a reporting label, but SELF_FRAME_HOOKS is NOT — it is
//     mirrored by AFTER_LOSS_TAROT_HOOKS' sibling set in server/lib/prompts.ts, which
//     decides which guardrail the live Version-C prompt runs under. Adding these to
//     SELF_FRAME_HOOKS would swap "tendency, never a verdict" for "affirm with certainty"
//     on a bereaved visitor. See the TarotHook union note.
//  2. REPORTING. The self-frame incumbents ('cards-soulmate', 'cards-love-again') are
//     live ad set. Folding these in would pool a new bereavement family with the running
//     baseline and make the new landers unreadable as a group.
export const SOULMATE_AFTER_LOSS_HOOKS: TarotHook[] = [
  'cards-new-soulmate',
  'cards-soulmate-out-there',
  'cards-ready-to-love',
]

// The soulmate-where hooks (2026-08-07). The SEEKING half of the soulmate topic, against
// `soulmate-after-loss`'s bereaved half. Their own angle rather than folded into
// `self-frame`, for the same two reasons as that family — one safety, one reporting:
//
//  1. SAFETY. These need a LOCATION ban, a no-strategy ban and a no-self-blame ban, none of
//     which self-frame carries. Filing them there would hand all three landers the bare
//     "affirm with certainty" clause, which is precisely what makes "Where is my soulmate
//     right now?" answerable with an invented place.
//  2. REPORTING. 'cards-soulmate' and 'cards-love-again' are the live baseline this family
//     is being measured against — and 'cards-soulmate-closer' is a direct copy test against
//     'cards-soulmate'. Pool them into one angle and that comparison disappears.
export const SOULMATE_WHERE_HOOKS: TarotHook[] = [
  'cards-where-soulmate',
  'cards-soulmate-closer',
  'cards-not-found-yet',
]

// The loneliness hooks (2026-08-07). Their OWN angle rather than folded into `self-frame`
// or into either soulmate family:
//
//  1. SAFETY. They need a FATE ban (nothing is "meant", in either direction) and a FOREVER
//     ban (never rule that she will be alone, never promise she will not) that no existing
//     frame carries. Self-frame's bare "affirm with certainty" is the worst possible guard
//     here — certainty about someone's future solitude is the harm itself.
//  2. REPORTING. Same topic-space as `soulmate-where` and `soulmate-after-loss`, different
//     question: those ask about a person who might exist, these ask about HER LIFE staying
//     as it is. Pool them and three separately-commissioned families become unreadable.
//
// ⚠ Note the category was briefed as "Loneliness/Timing" but none of the three headlines is
// about timing — the slug reflects what actually shipped.
export const LONELINESS_HOOKS: TarotHook[] = [
  'cards-alone-forever',
  'cards-meant-alone',
  'cards-someone-for-me',
]

// The fidelity hooks (2026-08-07). FOUR of them. Their OWN angle rather than folded into
// `trust`, `honesty` or `decode-him`:
//
//  · `trust` reads who he IS (the man underneath the presentation); `honesty` reads a
//    specific UNTRUTH he told. These read a THIRD PERSON — a different wound from either,
//    and the operator briefed it as its own category.
//  · `decode-him` holds the incumbent 'cards-cheating', which stays exactly where it is.
//    Folding these in would pool four new euphemism landers with the very lander they were
//    commissioned to replace, and the comparison would vanish.
//
// ⚠ The slug is `fidelity`, not the flagged word — and it never reaches a visitor or the ad
// platform anyway (it rides on PostHog event properties, not the URL). The HOOK slugs are
// the ones that travel in the destination URL, which is why none of them names the subject.
export const FIDELITY_HOOKS: TarotHook[] = [
  'cards-someone-else',
  'cards-talking-someone',
  'cards-faithful',
  'cards-loyal',
]

// The missing-him hooks (2026-08-10). Their OWN angle rather than folded into `healing`,
// which is the only family they could plausibly join:
//
//  1. REPORTING. healing has been live since 2026-08-04 and 'cards-cant-stop' asks a
//     question one step away from these ("stop thinking about him" vs "stop missing him").
//     That closeness is the reason to separate them, not the reason to merge: adding three
//     hooks to a running family retroactively mixes two questions inside one set of
//     numbers, and the operator commissioned these as a distinct category.
//  2. SAFETY. healing's per-hook bans are written for the THINKING — pathologising it,
//     directing her to stop it. These need a timeframe ban strong enough to survive two
//     headlines that ask for a timeframe outright, a two-directional forever ban, and a
//     ban on presuming how he came to be gone. None of that is in the healing strings.
//
// 🔴 HEALING_HOOKS must stay exactly three. Moving any of these in there, or any of those
// in here, destroys the comparison the family was commissioned to make.
export const MISSING_HIM_HOOKS: TarotHook[] = [
  'cards-stop-hurting',
  'cards-stop-missing',
  'cards-still-miss-him',
]

// The why-he-left hooks (2026-08-11). Commissioned under the operator's "Reunion/Return"
// CATEGORY, topic "Why he left / ghosting" — and filed as their own angle for the same
// reason `missing-him` was not filed under its "Healing/Moving-on" category: the category
// is how the ad account is organised, the angle is how the numbers are read.
//
//  1. REPORTING. `reunion` asks WILL HE COME BACK — a leaning about the future. These ask
//     WHY DID HE GO — an account of the past. Same man, opposite direction in time, and a
//     woman who clicks one is not necessarily in the market for the other. Folding them in
//     would retroactively mix two questions inside numbers running since 2026-08-04.
//  2. SAFETY. reunion's per-hook bans are written to refuse a PREDICTION (he is/isn't
//     coming back). These need to refuse a MOTIVE, which no live family bans, plus a ban
//     on tactics for making contact, plus — on 'cards-not-enough' — a ban on ruling on her
//     worth in either direction. None of that is in the reunion strings.
//
// 🔴 REUNION_HOOKS and RECONCILIATION_HOOKS must both stay exactly three. Unlike `reunion`
// (which excludes the incumbent 'cards-return') nothing is excluded here: no live lander
// asks why he went, so why-he-left-vs-reunion is a clean angle-level comparison.
export const WHY_HE_LEFT_HOOKS: TarotHook[] = [
  'cards-left-without-word',
  'cards-ghosted',
  'cards-not-enough',
]

// Searching hooks (2026-08-11). The SECOND batch under the "Loneliness/Timing" brief.
//
// 🔴 A SEPARATE ANGLE FROM `loneliness`, DELIBERATELY — and the reason is the note sitting
// on LONELINESS_HOOKS above: pool separately-commissioned families and all of them become
// unreadable. Batch one has been running since 2026-08-07; folding batch two into it would
// retroactively mix two commissions inside one set of numbers and destroy the only
// comparison anybody wants (did batch two beat batch one?).
//
// They are also a different question. loneliness = will my LIFE stay as it is. searching =
// what has the LOOKING cost me, and am I the reason it has not worked. The second half of
// that is why two of the three carry bans no live family has.
//
// ⚠ ANGLE ≠ FRAME, and this family is where the two come apart. The angle label below is a
// REPORTING device. The safety frame these run under is `loneliness`'s — they are added to
// LONELINESS_TAROT_HOOKS in server/lib/prompts.ts, whose guardLine (nothing fated, no
// forever in either direction, no timeframe, no "you attract this", no tactic, no
// presuming she has had love before, meet despair without deepening it) is already the
// correct floor for these headlines. Filing them under a NEW frame would have meant
// restating all of it and risking drift; filing them under self-frame would have been the
// dangerous mistake loneliness itself was created to avoid. The per-hook TENDENCY strings
// carry what the shared frame does not — see the union comment above.
export const SEARCHING_HOOKS: TarotHook[] = [
  'cards-stop-searching',
  'cards-end-up-alone',
  'cards-given-up',
]

// Twin-flame hooks (2026-08-11). Each competes with a NAMED incumbent in a DIFFERENT
// family — see the union comment for the mapping. That is deliberate and is what makes
// this a vocabulary test: does the twin-flame framing of a question outperform the plain
// "he" framing of the same question?
//
// 🔴 Read it HOOK BY HOOK, not angle-vs-angle. `twin-flame` as a pooled number is a
// three-way average across commitment, decode-him and reunion audiences, and those three
// convert differently from one another already — the pooled figure would tell you nothing
// about the only thing being tested, which is the wording.
//
// 🔴 NOT its own frame. A real man stands in all three, so they run under the DEFAULT
// decode-him branch in prompts.ts (tendency, never a verdict) with no new Set to keep in
// sync — the twin-flame-specific bans live in the per-hook tendencies, which is how every
// family since `healing` has been built. Adding these to any of the no-man frames
// (self-frame, loneliness, soulmate-where, after-loss) would strip the verdict guard off a
// question about a real person.
export const TWIN_FLAME_HOOKS: TarotHook[] = [
  'cards-twin-ready',
  'cards-twin-feels',
  'cards-twin-back',
]

// Hidden/intuition hooks (2026-08-12). Their OWN angle rather than folded into `honesty` —
// operator call 2026-08-12. The honesty landers have been running since 2026-08-03; adding a
// new topic to them now would retroactively mix two commissions inside one set of numbers,
// which is the same reason `honesty` was not folded into `trust` when it shipped.
//
// ⚠ TWO hooks, not three. Only two headlines were commissioned. Nothing in reporting or in
// the gate's per-lander table requires three, and a padded third written in-house would be
// the one lander in the family nobody asked for.
//
// ⚠ ANGLE ≠ FRAME. The angle label below is a REPORTING device. The operator specified the
// Trust/Honesty FRAME, and server-side that is the DEFAULT decode-him branch in prompts.ts
// (tendency, never a verdict) — so there is no new Set to add and none to keep in sync. The
// family-specific bans live in the per-hook TENDENCY strings, which is how every family
// since `healing` has been built. See the union comment for what those bans are and why.
//
// 🔴 Do not add these to any of the no-man frames (self-frame, loneliness, soulmate-where,
// after-loss). 'cards-feels-off' reads as though it is about her, and it is not — it is her
// reading of a specific man, and stripping the verdict guard off it would let a card convict
// him. That is the exact mistake SOULMATE_AFTER_LOSS_HOOKS was created to prevent.
export const HIDDEN_INTUITION_HOOKS: TarotHook[] = [
  'cards-hiding-something',
  'cards-feels-off',
]

// Real-feelings hooks (2026-08-12). Their OWN angle rather than folded into `decode-him`
// (which holds the 'cards-feels' incumbent one of them is measured against — merging would
// put challenger and control in one bucket) or into `commitment` (a different question: that
// family asks about the FUTURE he will not name, these ask whether the feeling exists now).
//
// ⚠️ ANGLE ≠ FRAME. The operator specified the Feelings/Commitment FRAME, which server-side is
// the DEFAULT decode-him branch in prompts.ts — no new Set to add or keep in sync. The
// family-specific bans live in the per-hook TENDENCY strings.
//
// 🔴 'cards-feels' MUST STAY IN decode-him. It is now the control for TWO tests at once —
// twin-flame's 'cards-twin-feels' and this family's 'cards-feel-about-me'. Moving it here
// destroys both comparisons in one edit. Pinned by tests/tarot-real-feelings-copy.test.ts.
export const REAL_FEELINGS_HOOKS: TarotHook[] = [
  'cards-really-love',
  'cards-feel-about-me',
  'cards-imagining-it',
]

// Still-feels hooks (2026-08-14). Their OWN angle rather than folded into `reunion`, whose
// category the operator gave — the same call made for `why-he-left` on 08-11, and for the same
// reason: reunion asks whether he ACTS, these ask whether he still FEELS. REUNION_HOOKS stays
// at exactly three so its 08-04 baseline remains readable and this batch can be compared
// against it rather than disappearing into it.
//
// 🔴 NOT folded into `real-feelings` either, and that is the sharper call of the two. That
// family holds 'cards-really-love' ("Does he REALLY love me?"), which sits ONE WORD from this
// family's 'cards-still-love' — really = did it ever amount to love · still = did it survive.
// Pooling them would put a challenger and its nearest control in one bucket, which is the exact
// mistake the real-feelings note warns about for 'cards-feels'.
//
// ⚠️ ANGLE ≠ FRAME. The operator specified the Reunion/Return FRAME, which server-side is the
// DEFAULT decode-him branch in prompts.ts (tendency, never a verdict) — so there is no new Set
// to add and none to keep in sync. The family-specific bans live in the per-hook TENDENCY
// strings, as they have for every family since `healing`.
//
// 🔴 Do NOT add these to any no-man frame. A real, specific man stands in all three — gone, but
// real — so every no-verdict-on-him guardrail stays on, and the mediumship ban of
// `soulmate-after-loss` applies with full force: "Does he still love me?" is also what a
// BEREAVED woman types, and nothing here may presume how he came to be gone.
export const STILL_FEELS_HOOKS: TarotHook[] = [
  'cards-still-think',
  'cards-still-love',
  'cards-love-or-moved-on',
]

// His-other-life hooks (2026-08-14). FIVE landers — the largest family on the funnel, and the
// first commission that is a PERSONA rather than a topic. Operator category "Persona", topic
// "persona commitment"; the angle is named for what the landers ask, per house convention.
//
// 🔴 NOT folded into `commitment`, which holds the generic "will he ever commit" trio live since
// 07-31. That family asks WILL HE; these ask WHY HE HASN'T and each names its own obstacle.
//
// ⚠️ ANGLE ≠ FRAME. The operator specified the Persona/commitment FRAME, which server-side is the
// DEFAULT decode-him branch in prompts.ts — no new Set to add or keep in sync. The
// family-specific bans live in the per-hook TENDENCY strings.
//
// ⭐⭐ 'cards-forever-or-now' is the FOURTH binary-refusing hook on the funnel, and the four
// grounds must stay distinct or the newest has collapsed into an older one:
//   · 'cards-moved-on'        (reunion)      — neither branch is knowable
//   · 'cards-imagining-it'    (real-feelings)— the second branch is cruel
//   · 'cards-love-or-moved-on'(still-feels)  — the two are not opposites
//   · this one                               — 🆕 permanence is NOT A STATUS she already has and
//     he has already assigned. "Forever" is not a property of a person awaiting discovery; it is
//     a thing built or not built, and nobody is living in it yet, including him. The binary is a
//     category error rather than an unanswerable question.
//
// 🔴 Do NOT add any of these to a no-man frame. A real, specific man stands in all five, plus —
// uniquely on this funnel — real THIRD PARTIES who are not the visitor's rivals: his children,
// and a woman who may be living or dead. Every no-verdict guard stays on and is extended to
// them. See the union comment for the full ban list.
export const HIS_OTHER_LIFE_HOOKS: TarotHook[] = [
  'cards-forever-or-now',
  'cards-his-children',
  'cards-her-shadow',
  'cards-live-apart',
  'cards-too-long',
]

// The soulmate-label hooks (2026-08-17). All three ask whether a WORD is true of a
// connection — see the union comment for why this is its own angle and not `twin-flame`,
// `soulmate-where` or `soulmate-after-loss`.
//
// 🔴 NOT its own frame. A real, specific man stands in all three, so they run under the
// DEFAULT decode-him branch in prompts.ts (tendency, never a verdict) with no new Set to
// keep in sync — the label bans live in the per-hook tendencies, which is how every family
// since `healing` has been built. Adding them to any of the no-man frames (self-frame,
// loneliness, soulmate-where, after-loss) would strip the verdict guard off a question
// about a living man, and self-frame would actively instruct "affirm with CERTAINTY" that
// he is her soulmate — the exact banned move.
export const SOULMATE_LABEL_HOOKS: TarotHook[] = [
  'cards-really-soulmate',
  'cards-twin-or-connection',
  'cards-met-already',
]

// The ad ANGLE a hook belongs to. Carried on every tarot PostHog event (see
// lib/tarotAttribution.ts) so the two decode-him families can be compared as GROUPS
// without listing each hook: one `angle = trust` filter instead of three hook values,
// and a clean breakdown of the original angles vs the trust angles.
//
// Derived here rather than hardcoded at the call sites, so a new hook is categorised
// the moment it is added to one of the arrays above.
export type TarotAngle =
  | 'decode-him'
  | 'trust'
  | 'commitment'
  | 'honesty'
  | 'reunion'
  | 'healing'
  | 'pulling-away'
  // 🔴 'reconciliation' is the US-framed sibling of 'reunion', NOT a replacement for it.
  // reunion = "will HE come back" (he decides, she waits); reconciliation = "will WE get
  // back together" (a joint outcome). Keeping them as separate angle labels is the entire
  // point of the 2026-08-06 test — collapse them and the comparison disappears.
  | 'reconciliation'
  // 🔴 'soulmate-after-loss' is NOT a variant of 'self-frame' and must never be merged
  // into it. self-frame = no specific man exists, so the hopeful yes may be affirmed with
  // certainty. This angle = a specific man existed and has DIED. The label separation is
  // what keeps the bereavement family readable against the running self-frame baseline;
  // the guard separation is what keeps the reads safe, and that one lives in prompts.ts.
  | 'soulmate-after-loss'
  // 🔴 'soulmate-where' is the SEEKING sibling of 'soulmate-after-loss', not a variant of
  // it and not a variant of 'self-frame'. after-loss = she had someone and lost them;
  // soulmate-where = she has never found anyone. Same topic, opposite starting point, and
  // completely different guardrails — after-loss must never promise an arrival, while this
  // family may affirm the hopeful yes and must never name a PLACE.
  | 'soulmate-where'
  // 🔴 'loneliness' is NOT a third soulmate family. Both soulmate angles ask about a PERSON
  // who might exist — where they are, whether they are coming. These ask whether HER LIFE
  // is going to stay as it is, and one of them asks whether she is FATED to it. Different
  // question, different guardrails, and the fate ban exists nowhere else.
  | 'loneliness'
  // 🔴 'fidelity' is NOT a variant of 'trust' or 'honesty', and must never be merged into
  // either. trust = who he IS · honesty = a specific untruth he told · fidelity = a THIRD
  // PERSON. It is also NOT decode-him, which holds the incumbent 'cards-cheating' these
  // four were commissioned to replace — merging them destroys that comparison.
  | 'fidelity'
  // 🔴 'missing-him' is the sibling of 'healing', not a variant of it. healing reads the
  // THINKING (her mind keeps producing him); this reads the ACHE OF HIS ABSENCE (the place
  // he occupied still hurts). The label separation is what keeps a new family readable
  // against a running one whose nearest lander, 'cards-cant-stop', asks a question one word
  // away from these. It is also NOT self-frame — a real man is in the picture, so every
  // no-verdict-on-him guardrail stays on.
  | 'missing-him'
  // 🔴 'why-he-left' is the PAST-facing sibling of 'reunion', not a variant of it. reunion
  // asks whether he is coming back; this asks why he went. It is also NOT 'pulling-away',
  // which is the only family about a man who is STILL THERE — here there is no ongoing
  // behaviour to read at all, only the silence he left. And it is NOT self-frame, even
  // though 'cards-not-enough' is phrased about her: a real man is in the picture, so every
  // no-verdict-on-him guardrail stays on, and the verdict banned hardest is the MOTIVE.
  | 'why-he-left'
  // 🔴 'searching' is the sibling of 'loneliness', not a variant of it, and the two must
  // never be merged. loneliness asks whether her LIFE stays as it is; searching asks what
  // the LOOKING has cost and whether she is the reason it has not worked. They were also
  // commissioned two batches apart under the same brief — the whole point of a separate
  // label is that batch two can be read against batch one instead of disappearing into it.
  // It is NOT self-frame either, for the same reason loneliness is not: no man exists in
  // these, so self-frame is the obvious filing and its "affirm with CERTAINTY" clause is
  // precisely the harm. Note the SAFETY frame is shared with loneliness even though the
  // angle is not — see SEARCHING_HOOKS above.
  | 'searching'
  // 🔴 'twin-flame' is a VOCABULARY angle, not a topic one, and that makes it different in
  // kind from every label above it. The others each own a question nobody else asks. This
  // one re-asks three questions that are already running — commitment's cards-ready-commit,
  // decode-him's cards-feels and reunion's cards-ever-back — in different words. Keeping it
  // separate is what lets the wording be measured; merging it into any of those three would
  // put the challenger and its own control in the same bucket and measure nothing.
  | 'twin-flame'
  // 🔴 'hidden-intuition' is NOT a variant of 'honesty' or 'trust', and merging it into
  // either destroys both. trust = who he IS · honesty = a specific untruth he TOLD · this =
  // an OMISSION nobody has caught, plus her own reading of it. Note also that it is the
  // only angle on the funnel whose second lander puts HER FACULTY in the question rather
  // than him — which is why it is filed here and not under self-frame, where a card would
  // be free to convict a real man on her behalf.
  | 'hidden-intuition'
  // 🔴 'real-feelings' is NOT a variant of 'decode-him' and must never be merged into it.
  // decode-him holds 'cards-feels', the incumbent this family's 'cards-feel-about-me' is
  // measured against — pool them and the challenger sits in the same bucket as its own
  // control. It is also NOT 'commitment': that family asks about the FUTURE he will not name,
  // these ask whether the feeling exists at all. And NOT 'hidden-intuition', though
  // 'cards-imagining-it' shares that family's affirm-the-noticing move — the valence is
  // opposite (fearing a good thing is absent, not that a bad thing is present).
  | 'real-feelings'
  // 🔴 'still-feels' is the FEELING-facing sibling of 'reunion', not a variant of it. reunion
  // asks whether he will ACT (come back); this asks whether he still FEELS, which he can do
  // without ever acting. It is also NOT 'real-feelings', which holds 'cards-really-love' — one
  // word from this family's 'cards-still-love', and the nearest control it has: "really" doubts
  // the feeling ever amounted to love, "still" takes that as given and asks if it survived.
  // And NOT 'missing-him', which reads HER ache; this reads HIS supposed contents.
  | 'still-feels'
  // 🔴 'his-other-life' is the SITUATED sibling of 'commitment', not a variant of it. commitment
  // asks whether he will ever commit, with no circumstances attached; this asks why he has not,
  // and every lander names the obstacle — his children, a woman who came first, separate homes,
  // the years already given. It is also NOT 'fidelity': the third parties here are not rivals
  // and may be entirely legitimate. And NOT self-frame, though two headlines are phrased about
  // her — a real man and real third parties stand in all five, so every no-verdict guard stays
  // on and extends to them.
  | 'his-other-life'
  // 🔴 'soulmate-label' is the INTERROGATING sibling of 'twin-flame', not a variant of it, and
  // merging them destroys the only thing twin-flame measures. That family swaps "my twin flame"
  // into three questions already running and tests the WORDING; the question underneath is
  // untouched and the label is only the wrapper. These three make the label itself the whole
  // question. It is also NOT 'soulmate-where' or 'soulmate-after-loss': those share the word and
  // nothing else — both ask about a person who might EXIST and neither has a man in the picture,
  // while a real specific man stands in all of these. And NOT 'commitment' or 'real-feelings',
  // the operator's briefing category: those ask what he will DO and what he FEELS, both of which
  // are claims about him that could in principle be checked. A label can never be checked at all,
  // which is why the family needs its own guard and its own numbers.
  | 'soulmate-label'
  | 'self-frame'

export function angleForHook(hook: TarotHook): TarotAngle {
  if (SELF_FRAME_HOOKS.includes(hook)) return 'self-frame'
  if (TRUST_HOOKS.includes(hook)) return 'trust'
  if (COMMITMENT_HOOKS.includes(hook)) return 'commitment'
  if (HONESTY_HOOKS.includes(hook)) return 'honesty'
  if (REUNION_HOOKS.includes(hook)) return 'reunion'
  if (HEALING_HOOKS.includes(hook)) return 'healing'
  if (PULLING_AWAY_HOOKS.includes(hook)) return 'pulling-away'
  if (RECONCILIATION_HOOKS.includes(hook)) return 'reconciliation'
  if (SOULMATE_AFTER_LOSS_HOOKS.includes(hook)) return 'soulmate-after-loss'
  if (SOULMATE_WHERE_HOOKS.includes(hook)) return 'soulmate-where'
  if (LONELINESS_HOOKS.includes(hook)) return 'loneliness'
  if (FIDELITY_HOOKS.includes(hook)) return 'fidelity'
  if (MISSING_HIM_HOOKS.includes(hook)) return 'missing-him'
  if (WHY_HE_LEFT_HOOKS.includes(hook)) return 'why-he-left'
  if (SEARCHING_HOOKS.includes(hook)) return 'searching'
  if (TWIN_FLAME_HOOKS.includes(hook)) return 'twin-flame'
  if (HIDDEN_INTUITION_HOOKS.includes(hook)) return 'hidden-intuition'
  if (REAL_FEELINGS_HOOKS.includes(hook)) return 'real-feelings'
  if (STILL_FEELS_HOOKS.includes(hook)) return 'still-feels'
  if (HIS_OTHER_LIFE_HOOKS.includes(hook)) return 'his-other-life'
  if (SOULMATE_LABEL_HOOKS.includes(hook)) return 'soulmate-label'
  return 'decode-him'
}

export const TAROT_HOOKS: TarotHook[] = [
  'cards-honest',
  'cards-return',
  'cards-feels',
  'cards-cheating',
  'cards-who-he-is',
  'cards-real-person',
  'cards-misled',
  'cards-will-commit',
  'cards-wont-commit',
  'cards-ready-commit',
  'cards-lied-to',
  'cards-truth',
  'cards-deceived',
  'cards-come-back',
  'cards-ever-back',
  'cards-moved-on',
  'cards-cant-stop',
  'cards-on-my-mind',
  'cards-who-hurt-me',
  'cards-pulling-away',
  'cards-gone-cold',
  'cards-losing-interest',
  'cards-back-together',
  'cards-still-a-chance',
  'cards-really-over',
  'cards-new-soulmate',
  'cards-soulmate-out-there',
  'cards-ready-to-love',
  'cards-where-soulmate',
  'cards-soulmate-closer',
  'cards-not-found-yet',
  'cards-alone-forever',
  'cards-meant-alone',
  'cards-someone-for-me',
  'cards-someone-else',
  'cards-talking-someone',
  'cards-faithful',
  'cards-loyal',
  'cards-stop-hurting',
  'cards-stop-missing',
  'cards-still-miss-him',
  'cards-left-without-word',
  'cards-ghosted',
  'cards-not-enough',
  'cards-stop-searching',
  'cards-end-up-alone',
  'cards-given-up',
  'cards-twin-ready',
  'cards-twin-feels',
  'cards-twin-back',
  'cards-hiding-something',
  'cards-feels-off',
  'cards-really-love',
  'cards-feel-about-me',
  'cards-imagining-it',
  'cards-still-think',
  'cards-still-love',
  'cards-love-or-moved-on',
  'cards-forever-or-now',
  'cards-his-children',
  'cards-her-shadow',
  'cards-live-apart',
  'cards-too-long',
  'cards-really-soulmate',
  'cards-twin-or-connection',
  'cards-met-already',
  'cards-love-again',
  'cards-soulmate',
]

// Shown when /fb-tarot is hit without a recognized ?hook= / ?deck= (bare visit).
export const DEFAULT_HOOK: TarotHook = 'cards-honest'
// The deck a URL with NO ?deck= param serves — i.e. what the ads actually run.
// Keeping the ad links clean (`/fb-tarot/c?hook=cards-honest`, matching the fb-palm
// convention of omitting the default `sign`) means this MUST point at the live deck.
//
// ⚠ It used to be 'decode-him', which is the seeded FOUNDATION deck whose strip art
// is still a placeholder — byte-identical to client/public/palm/thumbs-strip.png. A
// clean tarot URL therefore rendered a lander showing PALM THUMBS instead of tarot
// cards. Nothing caught it because every link in use carried an explicit &deck=.
//
// 'return-mhf' is the real face-down Magician/HangedMan/Fool deck and the only one
// cleared to go live (operator scope lock, 2026-07-27: MHF only, face-down only). It
// carries all the decode-him hooks, so the DEFAULT_HOOK fallback can't misfire either.
export const DEFAULT_DECK: TarotDeck = 'return-mhf'

// Verbatim match to the ad question (message scent). Shared by every deck: the
// decode-him question is orthogonal to which cards were shown.
export const HEADLINES: Record<TarotHook, string> = {
  'cards-honest': 'Is he being honest with you?',
  'cards-return': 'Will he come back?',
  'cards-feels': 'How does he really feel about you?',
  'cards-cheating': 'Is he cheating on you?',
  'cards-who-he-is': 'Is he really who he says he is?',
  'cards-real-person': 'Is he the real person, or just a picture?',
  'cards-misled': 'Am I being misled?',
  'cards-will-commit': 'Will he ever commit?',
  'cards-wont-commit': "Why won't he commit to me?",
  'cards-ready-commit': 'Is he ever going to be ready for real commitment?',
  'cards-lied-to': 'Am I being lied to?',
  'cards-truth': 'Is he telling me the truth?',
  'cards-deceived': 'Am I being deceived?',
  // ⚠ 'cards-come-back' intentionally duplicates the 'cards-return' headline string.
  // HEADLINES is keyed by HOOK, so two hooks may carry identical copy — the two landers
  // differ only in their reads. See the TarotHook union note.
  'cards-come-back': 'Will he come back?',
  'cards-ever-back': 'Will he ever come back to me?',
  'cards-moved-on': 'Is he coming back, or has he moved on?',
  'cards-cant-stop': "Why can't I stop thinking about him?",
  'cards-on-my-mind': 'Why is he always on my mind?',
  'cards-who-hurt-me': 'Why do I still think about someone who hurt me?',
  'cards-pulling-away': 'Why is he pulling away from me?',
  'cards-gone-cold': 'Why has he gone cold on me?',
  'cards-losing-interest': 'Is he losing interest, or just going through something?',
  // Reconciliation (2026-08-06). Note the pronoun: every reunion headline says "he",
  // every one of these says "we"/"us". That is the variable under test.
  'cards-back-together': 'Will we get back together?',
  'cards-still-a-chance': 'Is there still a chance for us?',
  'cards-really-over': 'Is it really over between us?',
  // Soulmate-after-loss (2026-08-07). Note what these do NOT say: none names a death, and
  // none uses the word widow. The ad has to be recognisable to a bereaved partner without
  // announcing her situation back to her on a public page — "after loss" and "after losing
  // him" are the visitor's own words from the buyer pull, and they carry it.
  'cards-new-soulmate': 'Will I find a new soulmate after loss?',
  'cards-soulmate-out-there': 'Is there still a soulmate out there for me?',
  'cards-ready-to-love': 'Am I ready to love again after losing him?',
  // Soulmate-where (2026-08-07). ⚠ 'cards-soulmate-closer' is a deliberate copy test against
  // the live 'cards-soulmate' — it asks in a headline what that lander already answers in
  // its read. The two must differ in their READS, which is the whole variable.
  'cards-where-soulmate': 'Where is my soulmate right now?',
  'cards-soulmate-closer': 'Is my soulmate closer than I think?',
  'cards-not-found-yet': "Why haven't I found my soulmate where I am?",
  // Loneliness (2026-08-07). ⚠ None names an ex or a loss — deliberately, so the family
  // reaches both never-partnered and post-breakup visitors. The reads presume neither.
  'cards-alone-forever': 'Will I be alone forever?',
  'cards-meant-alone': 'Am I meant to be alone?',
  'cards-someone-for-me': 'Is there really someone out there for me?',
  // Fidelity (2026-08-07). 🔴 The flagged word appears in NONE of these — that is the whole
  // commission. The live 'cards-cheating' headline above still carries it and is untouched.
  'cards-someone-else': 'Is there someone else?',
  'cards-talking-someone': 'Is he talking to someone else?',
  'cards-faithful': 'Is he being faithful to me?',
  'cards-loyal': 'Is he loyal to only me?',
  // Missing-him (2026-08-10). ⚠ Note what these do NOT say: none names a breakup, a split,
  // an ex, or a death. That is deliberate and load-bearing — the family has to reach a
  // bereaved woman and a dumped woman with the same words, because the reads may not
  // presume which she is. 'cards-stop-hurting' is the only first-person STATEMENT on the
  // funnel rather than a bare question; the operator wrote it that way and it stays.
  'cards-stop-hurting': 'I miss him so much — will this ever stop hurting?',
  'cards-stop-missing': 'Will I ever stop missing him?',
  'cards-still-miss-him': 'Why do I still miss him after everything?',
  // Why-he-left (2026-08-11). ⚠ Note what the first two do NOT say: neither states that he
  // CHOSE to go. "Without a word" and "ghost me" describe the SILENCE, which is the only
  // part she actually knows — he may have died or be in trouble, and the reads may not
  // sort her. 'cards-not-enough' is the operator's wording and it stays exactly as given;
  // it is also the only headline on the funnel that puts her own worth in the question, so
  // it carries a ban the other two do not (see TAROT_HOOK_TENDENCY).
  'cards-left-without-word': 'Why did he leave without a word?',
  'cards-ghosted': 'Why did he ghost me?',
  'cards-not-enough': 'Was I not enough for him to stay?',
  // Searching (2026-08-11). The operator's wording, shipped exactly as given.
  'cards-stop-searching': 'Am I ever going to stop searching?',
  'cards-end-up-alone': 'Why do I keep ending up alone?',
  'cards-given-up': 'Have I given up on love without realizing it?',
  // Twin flame (2026-08-11). The operator's wording, shipped exactly as given.
  'cards-twin-ready': 'Is my twin flame ready for me?',
  'cards-twin-feels': 'Does my twin flame feel this too?',
  'cards-twin-back': 'Is my twin flame coming back to me?',
  // Hidden/intuition (2026-08-12). The operator's wording, shipped exactly as given.
  // ⚠ Note what neither headline says: no lie, no cheating, no betrayal, nothing he has
  // been caught at. The first asks whether there is something behind a gap; the second asks
  // her to have her own perception checked. The reads may not upgrade either into an
  // accusation, and 'cards-feels-off' is the only headline on the funnel that submits HER
  // JUDGEMENT for a verdict — see the TarotHook union note for why both answers are banned.
  'cards-hiding-something': 'Is he hiding something from me?',
  'cards-feels-off': 'Something feels off — is my intuition right?',
  // Real-feelings (2026-08-12). The operator's wording, shipped exactly as given.
  // ⚠️ 'cards-feel-about-me' differs from the live 'cards-feels' by ONE PRONOUN — that one
  // says "about you" (Evelyn's voice), this says "about me" (hers). That is the variable
  // under test, and it is why HEADLINES may look near-duplicated here. See the union note
  // for why the comparison is confounded by copy standard as well.
  'cards-really-love': 'Does he really love me?',
  'cards-feel-about-me': 'How does he really feel about me?',
  'cards-imagining-it': 'Does he love me, or am I imagining it?',
  // Still-feels (2026-08-14). ⚠️ 'cards-still-love' is ONE WORD from the live
  // 'cards-really-love' and 'cards-love-or-moved-on' shares its closing clause verbatim with
  // the live 'cards-moved-on'. Both are deliberate; both incumbents are untouched.
  'cards-still-think': 'Does he still think about me?',
  'cards-still-love': 'Does he still love me?',
  'cards-love-or-moved-on': 'Does he still love me, or has he moved on?',
  // His-other-life (2026-08-14). The operator's wording, shipped exactly as given.
  // ⚠️ Note what none of them states: whether he is divorced, widowed, separated or married.
  // That silence is deliberate and load-bearing — the reads must hold for every one of those.
  'cards-forever-or-now': 'Am I his forever, or his now?',
  'cards-his-children': 'Why do his children come before me?',
  'cards-her-shadow': 'Am I living in her shadow?',
  'cards-live-apart': 'Why do we still live apart?',
  'cards-too-long': 'Have I already given him too long?',
  // Soulmate-label (2026-08-17). The operator's wording, shipped exactly as given.
  // ⚠️ 'cards-met-already' shares the clause "without realizing it" verbatim with the live
  // 'cards-given-up' ("Have I given up on love without realizing it?"), which is untouched and
  // stays in `searching`. Deliberate, and the same shape as 'cards-love-or-moved-on' sharing its
  // closing clause with 'cards-moved-on'. ⚠️ Note also what none of the three states: whether the
  // man is a partner, an ex, or someone she has never spoken to. The reads may not sort her.
  'cards-really-soulmate': 'Is he really my soulmate?',
  'cards-twin-or-connection': 'Is he my twin flame, or just a strong connection?',
  'cards-met-already': 'Have I already met my soulmate without realizing it?',
  'cards-love-again': 'Will I love again?',
  'cards-soulmate': 'When is my soulmate coming?',
}

// Version C opener question, per hook. C opens with the card line + this, then
// the LLM reads her answer. About HER read on him, never a demand for proof.
const TAROT_QUESTION: Record<TarotHook, string> = {
  'cards-honest': "Before I look closer, tell me… what is it about him your gut keeps snagging on?",
  'cards-return': "Before I look closer, tell me… what was left unfinished when he pulled away?",
  'cards-feels': "Before I look closer, tell me… what does he do that makes you unsure of how he feels?",
  'cards-cheating': "Before I look closer, tell me… when did the feeling that something's off first creep in?",
  'cards-who-he-is': "Before I look closer, tell me… when did you first catch a glimpse of someone different behind the man he shows you?",
  'cards-real-person': "Before I look closer, tell me… what is the one thing about him you have never been able to reach?",
  'cards-misled': "Before I look closer, tell me… what have you been told that your own eyes keep arguing with?",
  'cards-will-commit': "Before I look closer, tell me… what has he said about the future that you've been holding on to?",
  'cards-wont-commit': "Before I look closer, tell me… when did you first notice you were the only one building toward something?",
  // "being ready", not a bare "ready": the headline's word is echoed deliberately
  // (message scent), but as a bare noun it reads as a typo for "really" — it caught
  // the operator who commissioned the headline, on the FIRST question Evelyn asks.
  'cards-ready-commit': "Before I look closer, tell me… what would being ready actually look like, coming from him?",
  // Honesty/lying (2026-08-03). Each asks for HER account of a specific moment — never
  // for evidence, and never in a way that presumes his guilt before the cards are read.
  'cards-lied-to': "Before I look closer, tell me… what has he told you that you have never quite been able to believe?",
  'cards-truth': "Before I look closer, tell me… what is the one thing you would want a straight answer to, if he gave you one?",
  'cards-deceived': "Before I look closer, tell me… when did you first feel that something here was not what you had been told?",
  // Reunion/return (2026-08-04). Each asks about HER side of a leaving — never for a
  // forecast, and never in a way that presumes he is gone or that he is coming.
  // 'cards-come-back' deliberately does NOT reuse the cards-return opener ("what was
  // left unfinished when he pulled away?") — the two landers must differ from the very
  // first line she reads, since that is the whole point of running both.
  'cards-come-back': "Before I look closer, tell me… what was the last thing that passed between you before he went quiet?",
  'cards-ever-back': "Before I look closer, tell me… what have you been keeping open for him all this time?",
  // Mirrors the headline's either-or straight back to her — and the reads then decline
  // to pick a side of it.
  'cards-moved-on': "Before I look closer, tell me… what makes you feel he has moved on, and what makes you feel he hasn't?",
  // Healing/moving-on (2026-08-04). Each asks about the SHAPE of her thinking — never
  // for a justification of it, and never in a way that treats the thinking as a problem
  // she has to explain away.
  'cards-cant-stop': "Before I look closer, tell me… when does he come to mind — one particular moment of the day, or all of them?",
  'cards-on-my-mind': "Before I look closer, tell me… what is the smallest, most ordinary thing that brings him straight back?",
  // ⚠ Asks for the unexplained part, NOT for what he did. She should never have to
  // recount the injury to be taken seriously.
  'cards-who-hurt-me': "Before I look closer, tell me… what is the part of it you have never been able to make sense of?",
  // Pulling-away (2026-08-05). Each asks about the CHANGE she has watched happen — never
  // for what she might have done to cause it, which is the assumption she already arrives
  // carrying, and never for evidence she has to justify herself with.
  'cards-pulling-away': "Before I look closer, tell me… when did you first feel the distance start to open between you?",
  // Asks her to describe the warmth. Answering it requires her to say out loud that it
  // was real — which is the thing this hook has to affirm, and it comes from her mouth
  // rather than from a claim Evelyn makes about a man she has never met.
  'cards-gone-cold': "Before I look closer, tell me… what was he like back when you could still feel the warmth?",
  // Hands the headline's either-or back to her — deliberately NOT phrased like
  // 'cards-moved-on', whose opener does the same job in its own words. The weight here
  // sits on the second half: what keeps her from being sure is the material the read is
  // actually about.
  'cards-losing-interest': "Before I look closer, tell me… if you had to say tonight which of the two it is, which would you pick — and what keeps you from being sure?",
  // Reconciliation (2026-08-06). Each asks about the JOINT thing — what the two of them
  // were, what remains between them — never for a forecast, and never in a way that hands
  // her the responsibility for the outcome. Deliberately distinct from the reunion
  // openers, which ask about HIS leaving and HER waiting.
  'cards-back-together': "Before I look closer, tell me… when you picture the two of you finding your way back, what does it look like?",
  // Asks what she is still holding, not how likely it is. The question she came with has
  // no number in it, and the opener must not imply one is coming.
  'cards-still-a-chance': "Before I look closer, tell me… what is it between you that still feels unfinished to you?",
  // ⚠ Never asks her to justify why she has not accepted it. She arrives already braced
  // for someone to tell her to let go; the opener asks what she was never actually told.
  'cards-really-over': "Before I look closer, tell me… was there ever a moment where it was said plainly, or has it only ever been left to fade?",
  // Soulmate-after-loss (2026-08-07). 🔴 NOT ONE of these asks her about the death, what
  // happened, how long ago, or how she is coping. She should never have to narrate a
  // bereavement to a stranger to be taken seriously, and an opener that asks for it would
  // also hand the LLM the raw material for the mediumship failure this angle bans. Each
  // asks about the QUESTION she arrived with instead.
  //
  // ⚠ Deliberately distinct from 'cards-love-again', whose live opener ("what has been
  // weighing on your heart since it happened?") already gestures at a loss event. Sharing
  // its wording would collapse the new family into the incumbent from the first line.
  'cards-new-soulmate': "Before I look closer, tell me… when you picture loving someone again, what is the first thing that rises up against it?",
  'cards-soulmate-out-there': "Before I look closer, tell me… what made you begin to wonder whether your chance had already been and gone?",
  // Goes straight at the finding: she is asking to be given permission. The opener asks
  // whose permission it is, which is a question she can answer without recounting anything.
  'cards-ready-to-love': "Before I look closer, tell me… who has been deciding whether it is too soon — you, or someone else?",
  // Soulmate-where (2026-08-07). 🔴 NOT ONE of these asks her where she lives, where she
  // looks, or what she has tried — that would be gathering material for the strategy answer
  // the whole family bans, and it would confirm the premise that the absence is hers to fix.
  // Each asks about the SHAPE of the question she arrived with instead.
  'cards-where-soulmate': "Before I look closer, tell me… when did this start feeling like something you were supposed to go out and find?",
  // Asks for her own estimate — which is the material, since the read is about the guarding
  // rather than any distance. It never implies a correct answer exists.
  'cards-soulmate-closer': "Before I look closer, tell me… when you let yourself hope for it, how far off does it feel?",
  // ⚠ Surfaces the self-blame without endorsing it. She has already answered this privately;
  // the opener asks what she has been telling herself, never asks her to justify it.
  'cards-not-found-yet': "Before I look closer, tell me… when you ask yourself why, what answer have you been giving yourself?",
  // Loneliness (2026-08-07). 🔴 THE CONSTRAINT NO OTHER FAMILY HAS: these openers must not
  // MANUFACTURE despair. This angle already selects for the emotional state that
  // SOFT_CRISIS_PATTERNS (server/lib/universalSafety.ts) exists to catch, and an opener
  // like "what does the loneliness feel like?" or "what do you tell yourself at night?"
  // would actively produce the phrasing it screens for. Each of these asks her to THINK
  // about the shape of her question instead of to describe the pain — the answers come back
  // reflective, sometimes wry, rather than despairing.
  //
  // ⚠ None asks how long it has been, whether she has ever had it, or what went wrong.
  // The family is audience-agnostic and the openers must not sort her either way.
  'cards-alone-forever': "Before I look closer, tell me… when did 'not yet' start sounding like 'never' to you?",
  // Externalises it deliberately — she is asking whether something DECIDED this, so the
  // opener asks where that idea came from rather than whether it is true.
  'cards-meant-alone': "Before I look closer, tell me… who or what first gave you the idea that this might be deliberate?",
  // Goes straight at the finding: she has been handed comfort where she asked for an answer.
  // Answering it usually produces exasperation rather than despair, which is the point.
  'cards-someone-for-me': "Before I look closer, tell me… what do people tend to say to you about it, and has any of it ever helped?",
  // Fidelity (2026-08-07). 🔴 None asks for EVIDENCE and none uses the flagged word. An
  // opener that asked "what have you found?" or "what did you see on his phone?" would turn
  // the page into an interrogation, put the word in her mouth, and hand the LLM material for
  // an accusation. Each asks about HER experience of the situation instead.
  //
  // ⚠ Deliberately distinct from the live 'cards-cheating' opener ("when did the feeling
  // that something's off first creep in?") — these four must differ from the incumbent and
  // from each other at the first line she reads.
  'cards-someone-else': "Before I look closer, tell me… what changed that you have never been given an explanation for?",
  // Asks where his attention went, not what she has caught him at.
  'cards-talking-someone': "Before I look closer, tell me… when did you first notice his attention had somewhere else to be?",
  // ⚠ Never asks her to justify doubting him. Asks what would settle it — which is a
  // question about her, and answerable without accusing anybody.
  'cards-faithful': "Before I look closer, tell me… what would you need to hear from him to actually be able to rest?",
  // The word doing the work in this headline is "only" — the opener goes straight at it.
  'cards-loyal': "Before I look closer, tell me… what part of him have you never quite felt you had all of?",
  // Missing-him (2026-08-10). 🔴 Same no-manufactured-despair constraint as the loneliness
  // family, and it binds harder here: 'cards-stop-hurting' says "hurting" in the headline,
  // so an opener like "how bad does it get?" or "what are the nights like?" would produce
  // the exact phrasings SOFT_CRISIS_PATTERNS screens for, on a page that invited them. Each
  // of these asks for a CONCRETE, answerable detail instead — a duration, an object, a
  // trigger — which is also the material the read actually needs.
  //
  // 🔴 None asks HOW he came to be gone. That is the family's defining presumption ban: she
  // may be bereaved and may be broken up with, and the opener must not sort her. "Part of
  // your day" is deliberately neutral about which.
  //
  // ⚠ Deliberately distinct from the live healing openers, which are the nearest neighbours:
  // 'cards-cant-stop' asks WHEN he comes to mind, 'cards-on-my-mind' asks what the smallest
  // thing is that brings him back, 'cards-who-hurt-me' asks what she has never made sense
  // of. Sharing any of those would collapse the two families at the first line she reads.
  'cards-stop-hurting': "Before I look closer, tell me… how long has it been since he was part of your day?",
  // Splits the person from the shape of the life — which is the read, so her own answer
  // hands it over. Neither half is the wrong answer.
  'cards-stop-missing': "Before I look closer, tell me… what is it you miss most — him, or the way the days were built around him?",
  // ⚠ Credits her progress in the asking. She arrives believing the missing cancels out
  // everything she has worked out, so the opener takes for granted that she HAS worked
  // things out, and asks only what interrupts it. Never asks her to recount what he did.
  'cards-still-miss-him': "Before I look closer, tell me… what brings it back, even on the days you were sure you were past it?",
  // Why-he-left (2026-08-11). 🔴 None of these three asks her to GUESS AT HIS REASON. The
  // whole family exists because she has been guessing for weeks, and an opener that invites
  // one more theory hands the model a motive to confirm — which is the exact thing the
  // tendency strings ban. Each asks instead about something she has first-hand access to:
  // the last thing that was said, the moment the silence started, what she has done since.
  //
  // 🔴 None presumes he chose to go, and none uses the past tense of the relationship as a
  // settled fact. "The last ordinary day" works whether he walked out or was taken ill.
  //
  // 🔴 No-manufactured-despair, and it binds hardest on 'cards-not-enough', whose headline
  // already contains the self-accusation. An opener like "what do you think you lacked?"
  // would produce the phrasings SOFT_CRISIS_PATTERNS exists to catch, on a page that asked
  // for them. It asks about the STAYING rather than the worth — a concrete thing she saw.
  // ⚠ Deliberately not "what was the last thing that passed between you" — that is almost
  // exactly the live 'cards-come-back' opener, and the two families must not open alike.
  'cards-left-without-word': "Before I look closer, tell me… what did the days just before the quiet look like, from where you were standing?",
  // Asks WHEN she knew, not why he did it. A date she can answer is also the material the
  // read needs, and it does not require her to characterise him at all.
  'cards-ghosted': "Before I look closer, tell me… when did you realise it was silence, and not just him being slow to answer?",
  // ⚠ Refuses the premise gently rather than arguing with it. She has asked to be weighed;
  // the opener declines the scale and asks what she was actually doing — the effort is
  // hers, observable, and cannot be scored against her.
  'cards-not-enough': "Before I look closer, tell me… what were you giving it, in those last weeks, that you have not given yourself credit for?",
  // Searching (2026-08-11). 🔴 None of the three may ask her to account for the outcome —
  // "why do you think it hasn't worked" invites her to indict herself, and whatever she
  // types then sits in the transcript as the premise for everything Evelyn says next.
  // Each asks about the EFFORT or the COST, which she can answer without self-blame.
  'cards-stop-searching': "Before I look closer, tell me… how long has the looking been something you have to make yourself do?",
  'cards-end-up-alone': "Before I look closer, tell me… when you picture it going right, what does the ordinary part of it look like?",
  'cards-given-up': "Before I look closer, tell me… what did you used to let yourself hope for, before you started guarding it?",
  // Twin flame (2026-08-11). 🔴 None may invite the RUNNER narrative — "when did he pull
  // away", "how long has the separation been" hands her the community script and whatever
  // she types then sits in the transcript as the premise for every later turn. Each asks
  // about something SHE observed or felt, which is the only material either of us has.
  'cards-twin-ready': "Before I look closer, tell me… what would you actually notice between you, day to day, if he were ready?",
  'cards-twin-feels': "Before I look closer, tell me… when did you first notice this felt different from anything before it?",
  'cards-twin-back': "Before I look closer, tell me… what was it like between the two of you when it was at its easiest?",
  // Hidden/intuition (2026-08-12). ⚠ Neither opener may ask her to BUILD A CASE. "What
  // makes you think he is hiding something" reads as a demand for evidence, puts her on
  // trial for her own unease, and hands the model a list of suspicions to confirm — which
  // is the no-CAUSE ban breached by the opener before the read has even run.
  //
  // ⚠ Neither may ask WHAT she thinks is being hidden. That invites her to name it, and a
  // named suspicion in the transcript is the thing the reads must decline to certify.
  //
  // Asks about the thing she stops short of, not about him — the hesitation is hers and
  // first-hand, and it opens the gap without requiring a single claim about what fills it.
  'cards-hiding-something': "Before I look closer, tell me… what is the thing you keep almost asking him about, and stopping short of?",
  // Asks for the SHAPE of the change, never for proof of it. "Was there a day, or did it
  // creep in" is answerable without characterising him and without her having to justify
  // the feeling to a stranger before it is taken seriously.
  'cards-feels-off': "Before I look closer, tell me… when did it start feeling different — was there a day, or did it just creep in?",
  // Real-feelings (2026-08-12). ⚠️ None may ask her to BUILD A CASE for or against his
  // feelings ("what makes you think he does?"), which turns the opener into a request for
  // evidence about a real man and hands the model a verdict to confirm. Each asks instead
  // about something only SHE has first-hand.
  //
  // ⚠️ Deliberately unlike the live 'cards-feels' opener — the two landers are a paired test
  // and must not open alike, or the pronoun difference is the only thing left un-confounded.
  'cards-really-love': "Before I look closer, tell me… what is the thing he does that makes you most sure, and the thing that makes you least?",
  // Asks about the ASKING, which is this hook's whole lens — she came to a stranger for
  // something a person who knows her could have said.
  'cards-feel-about-me': "Before I look closer, tell me… how long have you been trying to work this out on your own?",
  // 🔴 Never "what makes you think you imagined it" — that adopts the headline's crueller
  // branch as the premise. Asks for the moment she believed it, which she owns outright.
  'cards-imagining-it': "Before I look closer, tell me… what was the moment you felt most certain about him — before the doubt arrived?",
  // Still-feels (2026-08-14). ⚠️ None may ask her to build a case about what he feels now, and
  // none may presume HOW he came to be gone — or that he is gone at all. Each asks about
  // something only SHE holds first-hand.
  //
  // 🔴 Deliberately unlike 'cards-really-love' ("the thing that makes you most sure, and the
  // thing that makes you least") and 'cards-imagining-it' ("the moment you felt most certain")
  // — 'cards-still-love' sits one word from the first and must not open like either.
  'cards-still-think': "Before I look closer, tell me… what is the one thing you most hope he has not forgotten?",
  'cards-still-love': "Before I look closer, tell me… how long has it been since you knew where you stood with him?",
  // 🔴 Never "what makes you feel he has moved on, and what makes you feel he hasn't?" — that is
  // 'cards-moved-on's opener and it asks her to build the case both ways. This asks for HER
  // picture of the phrase instead, which is the exact material the read takes apart.
  'cards-love-or-moved-on': "Before I look closer, tell me… when you picture him having moved on, what is it you actually see?",
  // His-other-life (2026-08-14). ⚠️ None may ask her to state his circumstances (married,
  // divorced, widowed) — the family is audience-agnostic and an opener that asks would break it
  // on the FIRST question Evelyn asks. 🔴 None may invite her to make a case against a third
  // party: not his children, not the woman who came first. Each asks for something only SHE
  // holds — her own position, in her own words.
  'cards-forever-or-now': "Before I look closer, tell me… what has he actually said about where this is going — in his words, not what you have pieced together?",
  // 🔴 Never "how do his children treat you?" or anything inviting a complaint about them. Asks
  // about the ARRANGEMENT she has been fitted into, which is his doing and not theirs.
  'cards-his-children': "Before I look closer, tell me… when the two of you do get time, is it planned for — or is it whatever is left over?",
  // 🔴 Never asks who "her" is, whether she is alive, or what she was like. Asks how the
  // comparison reaches HER, which is the only part she has first-hand.
  'cards-her-shadow': "Before I look closer, tell me… how do you know she is there — is it something he does, or something you feel?",
  // 🔴 Never "why do you think he won't move in?" — that asks her to author his reasons. Asks
  // whether it was ever DECIDED, which is the read's actual finding.
  'cards-live-apart': "Before I look closer, tell me… was living apart something the two of you decided, or something that simply never changed?",
  'cards-too-long': "Before I look closer, tell me… what were you told, back at the start, about how long this would take?",
  // Soulmate-label (2026-08-17). 🔴 None may ask her to argue FOR the label ("what makes you
  // think he's the one?") — that sets her building a case Evelyn would then have to judge, which
  // is the verdict this family refuses. Each asks for something only SHE holds.
  'cards-really-soulmate': "Before I look closer, tell me… what is it he does that makes the word feel true — and what is it that makes you check?",
  // ⭐ This is the read's own finding put as the opening question: the answer changes nothing.
  'cards-twin-or-connection': "Before I look closer, tell me… if you knew for certain which of those two it was, what would actually be different tomorrow?",
  // 🔴 Never "who do you think it might have been?" — naming a person is the family's hardest ban.
  // Asks what set the wondering off, which is the material the read actually works with.
  'cards-met-already': "Before I look closer, tell me… what set you wondering whether it has already happened?",
  'cards-love-again': "Before I look closer, tell me… what has been weighing on your heart since it happened?",
  'cards-soulmate': "Before I look closer, tell me… what is the love you're still holding out for — the one you haven't given up on?",
}

// ── Deck registry ────────────────────────────────────────────────────────────
// Adding a card concept = add one CardSetConfig entry + drop its strip png in
// client/public/tarot/. Everything else (bridge UI, chat handoff, reads) reads
// from here. Each read is the 4-beat "decode-him reveal" (see fb-tarot PRD):
//   1. name the card she drew/chose (+ its energy)
//   2. affirm the pull — her intuition chose it; she sees him
//   3. the read as a TENDENCY, never a verdict — affirm HER intuition
//   4. open loop → "let me look closer"

export interface CardSetConfig {
  id: TarotDeck
  // Whether the ad/lander shows card BACKS (drawn on reveal) or FACES (chosen).
  // Drives the reveal verb ("you turned" vs "you chose") + the skill's detection.
  facing: 'down' | 'up'
  // UI copy
  eyebrow: string // S1 eyebrow — "Pull the Card That Calls You"
  instruction: string // S1 tap instruction
  beatNoun: string // S2 — "Evelyn is reading your {beatNoun}…" (e.g. "cards")
  continueCta: string // S3 (Version A card) CTA, sans the ▸
  chooseMoment: string // greetingA — "I felt it {chooseMoment}"
  // Tap-target art: a horizontal strip of `options.length` equal panels.
  strip: { url: string; width: number; height: number }
  // OPTIONAL faces strip, same panel geometry/order as `strip`, shown ONLY on the
  // reveal (Version A S3) so a FACE-DOWN deck flips from the back she tapped to the
  // real card face she "turned". Omit for face-up decks (their `strip` is already
  // the faces) and for face-down decks with no face art (they keep showing the back).
  revealStrip?: { url: string; width: number; height: number }
  options: TarotOption[] // which letters this deck offers (A/B[/C])
  columns?: 1 | 2 | 3 // grid columns; omitted = one column per option
  // Per-card archetype vocab. mark = the card named in sentence 1 (e.g. "the
  // Moon, the card of what's kept in the half-light"); reading = the energy
  // label (e.g. "what's veiled"). Feed the Version-A greeting + Version-C LLM.
  mark: Record<TarotOption, string>
  reading: Record<TarotOption, string>
  // The card's PICTURE — what she is literally looking at, in plain words. The art is
  // attached to the FIRST message only (sendBotMessages passes cardArt at i===0), so she
  // reads this with the card on screen: a claim she can check in one second, which is
  // what earns belief for the sentence after it.
  //
  // WHY PER-CARD AND NOT PER-HOOK. The picture is the same whatever she asked about — the
  // Hanged Man hangs upside down whether her question is money or a man. Three lines cover
  // all 198 openings on this deck, and none of the 264 written framings is touched, which
  // is what keeps the "every card framing is distinct across the whole deck" guards
  // passing (8 test files assert it).
  //
  // Optional: a deck without it renders exactly as it does today.
  cardPicture?: Record<TarotOption, string>
  // reads[hook][option] = the 4-sentence reveal. Partial on the hook axis.
  reads: Partial<Record<TarotHook, Record<TarotOption, string[]>>>
}

// Seeded deck — the spec's decode-him face-down set (Sun / Moon / Tower).
// cards-honest is the spec's proven worked example; the other three hooks are
// compliant DRAFTS (fb-tarot/docs/decode-him spec) for the skill to refine.
const DECODE_HIM: CardSetConfig = {
  id: 'decode-him',
  facing: 'down',
  eyebrow: 'Pull the Card That Calls You',
  instruction: 'Think of the man on your mind. Tap the card that calls you.',
  beatNoun: 'cards',
  continueCta: "There's more the card is showing me — begin your free reading",
  chooseMoment: 'the moment your hand reached for it',
  // 🔴 FOUND 2026-08-18, NOT FIXED HERE: decode-him-strip.png is the fb-PALM thumb strip
  // (three hands, A/B/C), not tarot art — and this deck has no `revealStrip`, so a
  // face-down visitor taps a thumb and is then told "you turned the Sun". Every read on
  // this deck therefore describes a card she is not looking at, which is why its beat 1s
  // are deliberately left picture-free. No live ad points here (DEFAULT_DECK is
  // return-mhf and the other two ride ?deck=), so it is reachable only by hand-typed URL.
  // Needs an operator decision: ship real Sun/Moon/Tower art, or retire the deck.
  strip: { url: '/tarot/decode-him-strip.png', width: 972, height: 460 },
  options: ['a', 'b', 'c'],
  // A — The Sun (what's in the light); B — The Moon (what's veiled);
  // C — The Tower (what's shifting).
  mark: {
    a: 'the Sun, the card of what stands in the light',
    b: 'the Moon, the card of what is kept in the half-light',
    c: 'the Tower, the card of what is already moving beneath the surface',
  },
  reading: {
    a: "what's in the light",
    b: "what's veiled",
    c: "what's shifting",
  },
  reads: {
    // Proven worked example from the spec.
    'cards-honest': {
      a: [
        "You turned the Sun, dear — the card of what stands in the light.",
        "Your hand didn't reach for it by accident; some part of you was hoping, and the Sun met the hope.",
        "The Sun doesn't promise he's flawless — it says what's between you is more in the open than your fear has let you believe; the warmth you feel from him is real, not performed.",
        "Let me look closer at the one shadow even the Sun doesn't reach — there's a single thing still unsaid…",
      ],
      b: [
        "You turned the Moon, dear — the card of what's kept in the half-light.",
        "That's not random; your hand reached for the card that matches what you already sense.",
        "The Moon doesn't mean he's lying — it means something's unsaid between you, and that feeling of 'there's more here' is accurate, not paranoia.",
        "Let me look closer at what he's keeping in the dark — and whether it's a threat, or just a wall he hasn't learned to lower…",
      ],
      c: [
        "You turned the Tower, dear — the card of what's already moving beneath the surface.",
        "Your hand chose the honest card, even though it's the hard one — that takes a kind of courage.",
        "The Tower doesn't mean ruin — it means something between you is changing shape, and the unsettled feeling you've carried is you sensing the ground shift before it shows.",
        "Let me look closer at what's cracking — and what it's quietly clearing the way for…",
      ],
    },
    // DRAFT — compliant "tendency, never verdict" reads for the skill to refine.
    'cards-return': {
      a: [
        "You turned the Sun, dear — the card of what stands in the light.",
        "You asked if he'll come back. Your hand went to the warm card, not the cold one.",
        "The Sun makes no promise about a knock at the door.\nIt says the warmth between you was real, dear. Real warmth is slow to go cold.\nAnd that pull you still feel? It isn't only yours.",
        "Let me look closer at what's keeping that warmth from reaching you…",
      ],
      b: [
        "You turned the Moon, dear — the card of what is kept in the half-light.",
        "You asked if he'll come back. Your hand went to the card of what is still unclear.",
        "The Moon doesn't say he is gone for good.\nIt says his own side is unclear, even to him.\nSo this isn't finished, dear. You have felt that all along.\nThat's your gut, and it's sound.",
        "Let me look closer at what sits between you and a clear answer…",
      ],
      c: [
        "You turned the Tower, dear — the card of the sudden break.",
        "You asked if he'll come back. Your hand went to the card that breaks things open.",
        "The Tower doesn't mean the door is shut.\nIt means the old shape between you broke, dear.\nSomething down there is still moving into a new one.\nWhat feels like an ending is often the ground being cleared.",
        "Let me look closer at what the break left standing between you…",
      ],
    },
    'cards-feels': {
      a: [
        "You turned the Sun, dear — the warmest card in this deck.",
        "You asked how he really feels. Your hand went to the open card, not the guarded one.",
        "The Sun hands you no confession, dear.\nIt says the warmth you felt from him was real.\nNot made up. Not you being soft with yourself.\nYour read on him is truer than the doubt.",
        "Let me look closer at what's sitting between you and hearing it…",
      ],
      b: [
        "You turned the Moon, dear — the card that shows things by half.",
        "You asked how he really feels. Your hand went to the half-lit card, not the bright one.",
        "The Moon doesn't mean he's cold, dear.\nIt means what you sensed is real, and only half said out loud.\nYou keep sensing there's more than he shows you.\nThere is. That's you reading him, not you inventing him.",
        "Let me look closer at what keeps getting between you and the rest…",
      ],
      c: [
        "You turned the Tower, dear — the card of the ground shifting.",
        "You asked how he really feels. Your hand went to the card of what's changing.",
        "The Tower doesn't mean his feelings fell down, dear.\nIt means the ground under this is moving.\nSomething between you has felt shaky. You felt it too.\nThat's real movement. It isn't in your head.",
        "Let me look closer at what stands between you and steady ground…",
      ],
    },
    'cards-cheating': {
      a: [
        "You turned the Sun, dear — the card of what stands in the light.",
        "You're asking the hardest question, and your hand reached for the card of what's open.",
        "The Sun isn't a verdict of innocence — it says more is in the light between you than your fear allows, and the relief you'd feel at the truth is worth trusting yourself toward.",
        "Let me look closer at the one shadow the Sun doesn't reach…",
      ],
      b: [
        "You turned the Moon, dear — the card of what's kept in the half-light.",
        "You're asking if he's being unfaithful, and I can feel how much that question has cost you.",
        "The Moon does not say 'he's cheating' — it says something is unsaid, and the feeling that 'there's more here' is real information about your situation, not paranoia to apologize for.",
        "Let me look closer at what's being kept in the dark — and what it actually is…",
      ],
      c: [
        "You turned the Tower, dear — the card of what's already moving beneath the surface.",
        "You're asking the question that's been shaking the ground under you.",
        "The Tower isn't proof of betrayal — it means something between you is cracking, and the instability you feel is you sensing a real shift, not inventing one.",
        "Let me look closer at what's breaking — and what it's trying to show you…",
      ],
    },
  },
}

// Rio's first real card art — FACE-UP. Panels re-ordered 2026-07-31 (operator) from
// Magician|Fool|HangedMan to Magician|HangedMan|Fool; the strip PNG and the b/c
// entries below were swapped TOGETHER so each reading stayed bound to its own card.
// The pre-swap art is kept at arcana-mfh-strip.ORIGINAL-mfh-order.png. One deck that
// carries BOTH the self-frame `cards-love-again` hook (the ad Rio built) AND the 4
// decode-him hooks, so the same 3 cards switch copy by `?hook=` (the palm model).
// DRAFT reads (4-beat) — pending operator sign-off.
const ARCANA_MFH: CardSetConfig = {
  id: 'arcana-mfh',
  facing: 'up',
  eyebrow: 'The Cards Have Something to Show You',
  instruction: 'Take a breath, and choose the card that calls you.',
  beatNoun: 'cards',
  continueCta: "There's more the cards are showing me — begin your free reading",
  chooseMoment: 'the moment your eyes went to it',
  strip: { url: '/tarot/arcana-mfh-strip.png', width: 972, height: 540 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'the Magician, the card of will and intention',
    b: 'the Hanged Man, the card of the pause and a new angle',
    c: 'the Fool, the card of new beginnings',
  },
  reading: {
    a: 'will and intention',
    b: 'a suspended, turning moment',
    c: 'a new beginning',
  },
  reads: {
    // Self-frame — reads HER future, affirm the hopeful yes (like palm love-again).
    'cards-love-again': {
      a: [
        "You chose the Magician, dear — the card of power, of the tools already in your hands.",
        "You're asking if love will come again… and I can feel the tiredness under the hope.",
        "The Magician doesn't hand you a stranger — it says the power to draw love is already yours; a heart with your will doesn't stay empty long.",
        "Let me look closer at what's ready to be made…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the pause, of seeing love from a new angle.",
        "You're afraid the waiting means it's never coming.",
        "The Hanged Man doesn't mean stuck — it means this pause is doing quiet work, turning you toward a love that arrives differently than the last; it is coming.",
        "Let me look closer at what the waiting is preparing…",
      ],
      c: [
        "You chose the Fool, dear — the card of new beginnings, of the leap before the ground appears.",
        "You're asking if your heart can start over, after what it cost you last time.",
        "The Fool doesn't mean starting from nothing — it means a fresh beginning is already stepping toward you; yes, you will love again, sooner than the fear admits.",
        "Let me look closer at the beginning that's forming…",
      ],
    },
    // Self-frame — when her soulmate arrives. Affirm the hopeful yes; answer the
    // "when" as a leaning ("nearer than you fear"), NEVER a date.
    'cards-soulmate': {
      a: [
        "You chose the Magician, dear — the card of power, of the ability to draw what you want toward you.",
        "You're asking when your soulmate comes, and you reached for the card of someone who makes things happen.",
        "The Magician doesn't give you a date — it says you already hold the power to call this love in, and a heart with your will doesn't wait long; the timing is bending toward you.",
        "Let me look closer at what you're ready to make…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the pause that's doing quiet work.",
        "You're afraid the waiting means they're never coming.",
        "The Hanged Man doesn't mean stuck — it means this pause is preparing you, turning you toward a soulmate who arrives right as the waiting finishes its work; the delay is not a denial.",
        "Let me look closer at what the waiting is readying you for…",
      ],
      c: [
        "You chose the Fool, dear — the card of the leap, of the beginning already stepping toward you.",
        "You're asking when they'll arrive, and your hand reached for the card of the unexpected meeting.",
        "The Fool doesn't mark a day — it leans toward a soulmate who arrives suddenly and sooner than the fear admits; a fresh chapter is opening for you.",
        "Let me look closer at the beginning that's forming…",
      ],
    },
    // Decode-him — reads HIM as a TENDENCY, never a verdict; affirm HER intuition.
    'cards-honest': {
      a: [
        "You chose the Magician, dear — the card of the crafted image, of what's presented with skill.",
        "Your hand didn't reach for that by accident; some part of you senses a gap between what he shows and what's underneath.",
        "The Magician doesn't mean he's lying — it means he's practiced at presenting, and that sense the picture is a little too polished is real information, not you being difficult.",
        "Let me look closer at what's behind the performance…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of what's suspended, held just out of view.",
        "You reached for the card that matches the feeling you can't quite settle.",
        "The Hanged Man doesn't mean he's lying — it means something between you is on pause, unresolved, and the sense that the full truth hasn't turned to face you yet is accurate.",
        "Let me look closer at what's waiting to come into view…",
      ],
      c: [
        "You chose the Fool, dear — the card of the open, unguarded hand.",
        "That's not random; you reached for the card that matches something you feel in how he moves through this.",
        "The Fool doesn't point to deception — it points to a man who hasn't sat down and thought it through; what's unsaid here may be unexamined rather than hidden, and your sense that you're not getting the whole picture is still accurate.",
        "Let me look closer at what he's leaving unsaid…",
      ],
    },
    'cards-return': {
      a: [
        "You chose the Magician, dear. Look — a cup, a coin, a blade and a wand, all laid out on his table.",
        "You asked if he'll come back. Your hand went straight to the man who can act.",
        "He isn't short of a way back, dear. He has one.\nSo this was never about whether he could.\nAnd that pull you still feel? It isn't only yours.\nYou've felt him on the other end of it. You're reading that right.",
        "Let me look closer at what sits between you and his way back…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — he hangs by one ankle from a green tree, and his face is calm.",
        "You asked if he'll come back. Your hand went to a man still up in the air.",
        "Nothing has been settled here, dear. Not for you, and not against you.\nHe hasn't shut the door. He hasn't opened it either.\nYou keep refusing to call this over.\nThat isn't you clinging, dear. You're reading it right.",
        "Let me look closer at what's holding this in between…",
      ],
      c: [
        "You chose the Fool, dear. Look — a white rose in one hand, a small bundle on a stick, a dog at his heel.",
        "You asked if he'll come back. Your hand went to the one card that won't call this over.",
        "The road is still open, dear. The door was never shut.\nBut look where his eyes are. On what's ahead, not behind.\nSo if this does come to something, it starts new.\nIt won't pick up where it broke. That isn't a smaller thing, dear.",
        "Let me look closer at what stands between you and that open road…",
      ],
    },
    'cards-feels': {
      a: [
        "You chose the Magician, dear. Look — a red robe over white, and a loop above his head with no end to it.",
        "You asked how he really feels. Your hand went to the man who does nothing by accident.",
        "So the warmth you felt was not made up, dear.\nA man like this doesn't warm to someone by accident.\nWhat he hasn't done is say it out loud.\nThat gap is real, dear. You've been reading it right.",
        "Let me look closer at what's sitting between you and the words…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — he's upside down, and there's a light around his head.",
        "You asked how he really feels. Your hand went to the man stuck between two things.",
        "You haven't been reading coldness, dear. You've been reading a hold.\nSo the mixed signals were not you misreading him.\nYou were reading two true things at once.\nThat pull you sense is genuine. So is the hold.",
        "Let me look closer at what's holding you both in the middle…",
      ],
      c: [
        "You chose the Fool, dear. Look — he's looking up at the sky, not down at the drop.",
        "You asked how he really feels. Your hand went to the man living in the moment.",
        "What you picked up was real, dear. It just lives in the moment.\nBut look where his eyes are. Up, not down the road.\nSo he hasn't worked out where this goes.\nThat's a different thing from not caring, dear. You've felt both at once.",
        "Let me look closer at what keeps this from settling…",
      ],
    },
    'cards-cheating': {
      a: [
        "You chose the Magician, dear — the card of the polished surface, of what's presented.",
        "You reached for that card for a reason; some part of you senses a distance between the image and what's real.",
        "The Magician is not a verdict of betrayal — it means something is being managed or curated, and the unease you feel about a gap between his story and your gut is real information, not paranoia.",
        "Let me look closer at the one shadow the polish doesn't cover…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of what's suspended and unclear.",
        "You reached for the card that matches the limbo you can't quite name.",
        "The Hanged Man is not a confession — it means something between you is on hold and not what it seems from your angle; the feeling that something's paused and off is real, and it deserves clarity, not self-blame.",
        "Let me look closer at what's actually suspended between you…",
      ],
      c: [
        "You chose the Fool, dear — the card of impulse and the unguarded moment.",
        "Your hand reached for the card that matches the restlessness you've been feeling from him.",
        "The Fool is not proof of unfaithfulness — it leans toward impulsiveness and living in the moment; watch that tendency, but what your intuition is flagging deserves a closer, honest look, not a spiral.",
        "Let me look closer at what the restlessness is really about…",
      ],
    },
    // ── Trust/authenticity hooks (2026-07-30) ────────────────────────────────
    // PORTED CARD-FOR-CARD from the face-down return-mhf deck: same three cards, so
    // the same question on the same card gives the same read. The port was remapped by
    // CARD, never by panel letter — at the time the decks ordered their panels
    // differently. The 2026-07-31 art re-order has since aligned them, but the reads
    // stayed bound to their cards through that swap. Reveal verb is face-up "You chose".
    // 'Is he really who he says he is?' — the man he presents vs the man underneath.
    'cards-who-he-is': {
      a: [
        "You chose the Magician, dear. Look — roses and lilies at his feet, and one arm held straight up.",
        "You asked if he's really who he says he is. Your hand went to the man who builds what you see.",
        "The Magician builds what people see, dear. That is his craft.\nSo what he shows you was put together on purpose.\nThat doesn't tell me who stands behind it. It tells me there is a behind.\nYou already sensed that, dear. Keep hold of it.",
        "Let me look closer at what sits between you and the man behind it…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — one leg tied to the branch, the other bent behind it, out of sight.",
        "You asked if he's really who he says he is. Your hand went to the card of one hidden side.",
        "The Hanged Man shows one side, dear. Never both.\nYou were given a part, and asked to judge the whole.\nThat is why you can't get a clean read on him.\nThe trouble isn't your judgement, dear. It's what you were handed.",
        "Let me look closer at what stands between you and a straight answer…",
      ],
      c: [
        "You chose the Fool, dear. Look — all he owns is tied in one small bundle on a stick.",
        "You asked if he's really who he says he is. Your hand went to the man still deciding.",
        "The Fool travels light, dear. Nothing about him is settled yet.\nSo the man you met and the man now can both be him.\nOr he has not shown you the whole road. The card won't say which.\nEither way, you noticed the change. That is worth trusting.",
        "Let me look closer at what keeps getting between you and all of him…",
      ],
    },
    // 'Is he the real person, or just a picture?' — she has only ever had an image.
    //
    // ⚠ Catfish/romance-scam audience. Reads BACK HER CAUTION and never vouch for him —
    // reassurance is the failure mode here (2026-07-10 buyer audit). Never pronounce him
    // fake either; that is a verdict. Ported verbatim from return-mhf.
    'cards-real-person': {
      a: [
        "You chose the Magician, dear — the card of the made thing, of the image that someone assembled.",
        "Your hand went to the card of construction, and that tells me you have already sensed how much of him arrives pre-arranged.",
        "The Magician does not tell me he is fictional — it tells me that what you have been given is an image, and an image can be built by anyone; the fact that you cannot get past it to a person is information, not impatience on your part.",
        "Let me look closer at how much of him exists off the screen…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the thing that hangs, that never quite lands.",
        "You reached for the card that matches the waiting you have been doing for him to become real.",
        "The Hanged Man does not declare him an invention — it marks someone who stays permanently almost-here, always one obstacle short of meeting you, and that pattern is the answer you have been asking me for; a man who wants to be known finds a way to be reached.",
        "Let me look closer at what always seems to come up right before he arrives…",
      ],
      c: [
        "You chose the Fool, dear — the card of the beginning that has not yet touched the ground.",
        "That is not random; you reached for the card of something still weightless, still untested by real life.",
        "The Fool does not brand him a stranger — it says what you have so far is a beginning that has never had to survive an ordinary afternoon together, and until it does, what you are holding is a promise rather than a person; your caution here is wisdom, not cynicism.",
        "Let me look closer at what it would take to bring this into daylight…",
      ],
    },
    // 'Am I being misled?' — restore trust in HER OWN perception; she arrives self-doubting.
    'cards-misled': {
      a: [
        "You chose the Magician, dear — the card of the hand that shapes the story.",
        "You reached for the card of direction, and women do not reach for that card when the account they have been given adds up.",
        "The Magician does not hand down a verdict that you are being deceived — it says the version of events you keep being offered has been shaped for you, and the small places where it does not match what you saw with your own eyes are exactly where your attention belongs.",
        "Let me look closer at the detail that never quite fits…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the view that is deliberately kept unclear.",
        "You reached for the card that matches the dizziness of never being able to settle what is true.",
        "The Hanged Man is not proof that you are being played — it says you have been kept at a distance from the whole of it, and the confusion you have been blaming on yourself is a symptom of that distance, not a flaw in your judgment.",
        "Let me look closer at what the confusion has been protecting…",
      ],
      c: [
        "You chose the Fool, dear — the card of what gets left uncorrected.",
        "That is not random; you reached for the card of the easy answer, the one that was simpler to leave standing than to fix.",
        "The Fool does not mean he set out to mislead you — it points to someone who let a convenient impression stand rather than correct it, which lands on you the same way in the end; what you are sensing is a real absence of straightening-out, not you being suspicious for no reason.",
        "Let me look closer at what he has never bothered to correct…",
      ],
    },
    // ── Commitment hooks (2026-07-31) ────────────────────────────────────────
    // PORTED CARD-FOR-CARD from the face-down return-mhf deck, GENERATED rather than
    // hand-copied. The decks order their panels differently (face-down b is the Hanged
    // Man, face-up b is the Fool), so the port is keyed on CARD IDENTITY, not the panel
    // letter — a letter-for-letter copy would attach every read to the wrong card while
    // still looking perfectly plausible on screen.
    //
    // The ONLY intended difference is that she TURNED a face-down card and CHOSE a
    // face-up one; 9/9 beats are otherwise identical to return-mhf, asserted in
    // tests/tarot-commitment-copy.test.ts.
    'cards-will-commit': {
      a: [
        "You chose the Magician, dear. Look — one hand up to the sky, one down to the ground, every tool laid out on his table.",
        "You asked whether he'll ever commit. Your hand went to the man who already has all he needs.",
        "He isn't missing a thing, dear. He could decide.\nHe just hasn't.\nYou've felt that all along. You're reading him right — you're not making it up.\nAnd wanting an answer by now isn't you pushing. It's you being awake.",
        "Let me look closer at what he keeps picking instead…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look at him — hanging upside down by one ankle, and not fighting it.",
        "You asked whether he'll ever commit. Your hand went to the man hanging between two answers.",
        "He hasn't come down on either side. Not toward you, not away.\nHe isn't keeping a decision from you, dear. He hasn't made one.\nThat's the harder answer, I know. But it's the true one.\nAnd you did wait, dear. That was real — you didn't make it up to keep hoping.",
        "Let me look closer at what's holding him up there…",
      ],
      c: [
        "You chose the Fool, dear. Look — one foot out over the edge, the other still on the ground.",
        "You asked whether he'll ever commit. Your hand went to the man caught mid-step.",
        "That foot is still in the air. He hasn't come down either way.\nSo nothing has been settled against you. Not yet.\nYou kept hoping. That isn't you fooling yourself, dear — you were reading it right.",
        "Let me look closer at which way that foot comes down…",
      ],
    },
    'cards-wont-commit': {
      a: [
        "You chose the Magician, dear — the card of intention, of the will behind what a man does and does not do.",
        "You are asking why he will not, and your hand found the card that says his holding back is active rather than accidental.",
        "The Magician does not name him cold or cruel — it points to a man aiming his will somewhere he has not shown you, and your read that this is a choice rather than bad timing is sound.",
        "Let me look closer at where his intention has been going…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the man who stopped mid-step and never finished it.",
        "You reached for the card of suspension, and it is his that you have been living inside.",
        "The Hanged Man does not say he is withholding to punish you — it points to someone stuck rather than settled, and the straight answer he keeps failing to give you is one he does not possess, not one you asked for wrongly.",
        "Let me look closer at what has him stuck…",
      ],
      c: [
        "You chose the Fool, dear — the card of the unfinished road, of the man still treating his life as a beginning.",
        "Your hand reached for the card of the not-yet, which is where he has kept living.",
        "The Fool does not make him a bad man — it points to someone who has not arrived yet rather than someone who weighed you and decided against you, and that difference matters far more than anyone has told you.",
        "Let me look closer at what he is still circling…",
      ],
    },
    'cards-ready-commit': {
      a: [
        "You chose the Magician, dear — the card of a man's own power to build something.",
        "You are asking about readiness, and your hand found the card of capability rather than circumstance.",
        "The Magician makes no promise that the day arrives — it says the material is all there and unassembled, and your instinct that he is capable of more than he has been giving is not wishful thinking.",
        "Let me look closer at what he would have to put down first…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the long pause that comes before a turn.",
        "You reached for the card of the in-between, and readiness is exactly the thing that lives there.",
        "The Hanged Man offers no when and no whether — it says he is mid-change rather than finished forming, and the patience you have spent went to something genuinely unfinished rather than to nothing at all.",
        "Let me look closer at the turn he has not made…",
      ],
      c: [
        "You chose the Fool, dear — the card of the beginner, of the one still learning the road.",
        "Your hand went to the card of the untested, which is a fair description of where he is standing.",
        "The Fool is no sign that growing into it is beyond him — it points to someone earlier in the journey than you are rather than someone who cannot make it, and the distance you have been feeling between you is real and worth naming out loud.",
        "Let me look closer at the distance between where you each stand…",
      ],
    },
  },
}

// Rio's second card art — FACE-UP Emperor / Empress / Fool. The ad ran the
// decode-him `cards-honest` hook; like every deck it also carries the other hooks
// so `?hook=` swaps copy on the same cards. DRAFT reads — pending sign-off.
const ARCANA_EEF: CardSetConfig = {
  id: 'arcana-eef',
  facing: 'up',
  eyebrow: 'The Cards Have Something to Show You',
  instruction: 'Take a breath, and choose the card that calls you.',
  beatNoun: 'cards',
  continueCta: "There's more the cards are showing me — begin your free reading",
  chooseMoment: 'the moment your eyes went to it',
  strip: { url: '/tarot/arcana-eef-strip.png', width: 972, height: 540 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'the Emperor, the card of authority and structure',
    b: 'the Empress, the card of warmth and abundance',
    c: 'the Fool, the card of new beginnings',
  },
  reading: {
    a: 'authority and structure',
    b: 'warmth and abundance',
    c: 'a new beginning',
  },
  reads: {
    // Decode-him — the ad's hook. Reads HIM as a tendency, never a verdict.
    'cards-honest': {
      a: [
        "You chose the Emperor, dear — the card of authority, of the controlled and guarded front.",
        "Your hand didn't reach for that by accident; some part of you feels the wall he keeps up, even with you.",
        "The Emperor doesn't mean he's lying — it means he manages what he shows and keeps things close to the chest; that sense there's more behind the composure is real, not you imagining it.",
        "Let me look closer at what he's guarding so carefully…",
      ],
      b: [
        "You chose the Empress, dear — the card of warmth, of what's genuinely felt and given.",
        "That's not random; you reached for the card that matches the care you've felt from him and half-talked yourself out of trusting.",
        "The Empress leans toward the honest side, dear — the warmth you feel from him is real, more open than your fear has let you believe; your read on his heart is truer than the doubt.",
        "Let me look closer at the one thing even that warmth hasn't said aloud…",
      ],
      c: [
        "You chose the Fool, dear — the card of the open, unguarded hand.",
        "You reached for the card that matches something you feel in how he moves through this.",
        "The Fool doesn't point to deception — it points to a man who hasn't sat down and thought it through; what's unsaid here may be unexamined rather than hidden, and your sense that you're not getting the whole picture is still accurate.",
        "Let me look closer at what he's leaving unsaid…",
      ],
    },
    'cards-love-again': {
      a: [
        "You chose the Emperor, dear — the card of solid ground, of structure after the storm.",
        "You're asking if love will come again… and I feel how much the last one shook your footing.",
        "The Emperor doesn't hand you chaos — it says the next love builds on steadier ground; a grounded, lasting kind is forming for you.",
        "Let me look closer at the foundation that's setting…",
      ],
      b: [
        "You chose the Empress, dear — the card of abundance, of a heart that blooms again.",
        "You're asking if your heart can open after what it lost.",
        "The Empress is the most fertile card of all, dear — it says love returns to you in warmth and fullness; yes, you will love again, and softly.",
        "Let me look closer at what's already blossoming…",
      ],
      c: [
        "You chose the Fool, dear — the card of the fresh start, the new leap.",
        "You're asking if you can begin again, after last time.",
        "The Fool doesn't mean starting from nothing — it means a new beginning is already stepping toward you; yes, love is ahead, sooner than the fear admits.",
        "Let me look closer at the beginning that's forming…",
      ],
    },
    // Self-frame — when her soulmate arrives. Affirm the hopeful yes; answer the
    // "when" as a leaning ("nearer than you fear"), NEVER a date.
    'cards-soulmate': {
      a: [
        "You chose the Emperor, dear — the card of solid ground, of a love built to last.",
        "You're asking when your soulmate comes, and your hand reached for the steady, sure kind — not a passing spark.",
        "The Emperor doesn't hand you a calendar — it says the one coming for you is a grounded, lasting partner, and that kind arrives as your own foundation settles; it's nearer than the waiting has let you feel.",
        "Let me look closer at the ground that's already forming under you…",
      ],
      b: [
        "You chose the Empress, dear — the most fertile card of all, the card of love in full bloom.",
        "You're asking when they'll come, and you reached for the card of a heart ripe and ready to receive.",
        "The Empress doesn't name a date — it says love is ripening for you now, and this card most often means the arrival is close, not far; the season is already turning toward you.",
        "Let me look closer at what's blossoming toward you…",
      ],
      c: [
        "You chose the Fool, dear — the card of the fresh start, of the beginning already stepping toward you.",
        "You're asking when your soulmate arrives, and your hand reached for the card of the unexpected meeting.",
        "The Fool doesn't mark a day — it leans toward a soulmate who arrives suddenly, when you least expect it, often sooner than the fear admits; a new chapter is opening.",
        "Let me look closer at the beginning that's forming…",
      ],
    },
    'cards-return': {
      a: [
        "You chose the Emperor, dear. Look — a grey-bearded king on a stone throne, facing straight ahead, not moving.",
        "You asked if he'll come back. Your hand went to the man who moves on his own clock.",
        "He doesn't act on a feeling, dear. He acts once he has weighed it.\nSo the quiet is not a no. It only reads like one from where you sit.\nHis side is less shut than it feels to you.\nAnd you were right to keep asking, dear. That wasn't you being foolish.",
        "Let me look closer at what sits between you and his answer…",
      ],
      b: [
        "You chose the Empress, dear. Look — a woman resting in a field of wheat, a crown of stars in her hair.",
        "You asked if he'll come back. Your hand went to the card of what was warm and real.",
        "The care between you was real, dear. You did not invent it.\nAnd real warmth keeps its pull long after two people stop speaking.\nIt is still working on him.\nYou can feel that, dear. That's not you hoping — that's you knowing.",
        "Let me look closer at what keeps that bond from reaching you…",
      ],
      c: [
        "You chose the Fool, dear. Look — one foot out over the cliff edge, eyes on the sky, a dog at his heel.",
        "You asked if he'll come back. Your hand went to the turn nobody sees coming.",
        "The Fool doesn't do repeats, dear. He does fresh starts.\nSo if this comes back, it comes back in a new shape.\nNot the old one. That one already broke.\nYou have felt that too. You just had no words for it.",
        "Let me look closer at what stands between you and that new start…",
      ],
    },
    'cards-feels': {
      a: [
        "You chose the Emperor, dear. Look — a long white beard, a heavy crown, rams' heads carved in his chair.",
        "You asked how he really feels. Your hand went to the man who keeps it behind his face.",
        "The Emperor doesn't mean he feels little, dear.\nIt reads as a guarded man, dear. Not an empty one.\nThat steadiness is how it shows, dear. Not in words.\nSo there's more there than the restraint shows. You weren't wrong to feel it.",
        "Let me look closer at what sits between you and what he holds back…",
      ],
      b: [
        "You chose the Empress, dear. Look — she rests on soft cushions, and a shield by her feet carries a heart.",
        "You asked how he really feels. Your hand went to the warmest card in the deck.",
        "The Empress leans tender, dear.\nYou've felt care that runs ahead of his words.\nThe warmth you feel is not one-sided.\nYou've known that. You just wanted it said by someone else.",
        "Let me look closer at what's in the way of him saying it…",
      ],
      c: [
        "You chose the Fool, dear. Look — a white rose in his hand, and his eyes on the sky.",
        "You asked how he really feels. Your hand went to the plainest card in the deck.",
        "This card reads as right now, dear. Nothing put on.\nWhat he hasn't done is think about where it leads.\nThose are two different things.\nThe spark is real. The plan is what's missing.",
        "Let me look closer at what sits between you and a plan…",
      ],
    },
    'cards-cheating': {
      a: [
        "You chose the Emperor, dear — the card of control and the compartment kept apart.",
        "You reached for the card that matches the wall you feel but can't quite name.",
        "The Emperor is not a verdict of betrayal — it means something is being kept controlled and separate, and the sense that there's a locked room you're not shown is real information, not paranoia.",
        "Let me look closer at what's being kept behind the composure…",
      ],
      b: [
        "You chose the Empress, dear — the card of warmth and abundance, not of betrayal.",
        "You reached for the gentler card, even carrying this fear.",
        "The Empress leans away from the story your fear tells — it points to genuine care; but if your gut still snags, abundance can also mean his attention runs generous and wide, so trust your read without leaping to a verdict.",
        "Let me look closer at where his warmth is actually flowing…",
      ],
      c: [
        "You chose the Fool, dear — the card of impulse and the unguarded moment.",
        "Your hand reached for the card that matches the restlessness you feel from him.",
        "The Fool is not proof of unfaithfulness — it leans toward impulsiveness and living in the moment; watch that, but what your intuition is flagging deserves a closer, honest look, not a spiral.",
        "Let me look closer at what the restlessness is really about…",
      ],
    },
  },
}

// Rio's third card art (ZN_Tarot_Rio 1.png) — FACE-DOWN card backs, the ad hook
// "Will he come back?" (cards-return). Face-down = she pulls by intuition, so the
// 3 cards are DRAWN from the Major Arcana pool: Magician / Hanged Man / Fool (the
// operator's draw for a satisfying return spread — will/agency, the deciding
// pause, the fresh unexpected return). Reveal verb is "you turned" (vs the face-up
// decks' "you chose"). Reads adapt arcana-mfh's compliant copy to face-down + this
// panel order. DRAFT reads (4-beat, tendency-not-verdict) — pending operator sign-off.
const RETURN_MHF: CardSetConfig = {
  id: 'return-mhf',
  facing: 'down',
  eyebrow: 'Pull the Card That Calls You',
  instruction: 'Think of the man on your mind. Tap the card that calls you.',
  beatNoun: 'cards',
  continueCta: "There's more the card is showing me — begin your free reading",
  chooseMoment: 'the moment your hand reached for it',
  strip: { url: '/tarot/return-mhf-strip.png', width: 972, height: 540 },
  // Face-down: the tap targets are backs, but the reveal flips to the real card
  // faces (Magician / Hanged Man / Fool, same A/B/C order).
  revealStrip: { url: '/tarot/return-mhf-faces.png', width: 972, height: 540 },
  options: ['a', 'b', 'c'],
  // A — The Magician (will/agency); B — The Hanged Man (the deciding pause);
  // C — The Fool (the fresh, unexpected return).
  mark: {
    a: 'the Magician, the card of will and intention',
    b: 'the Hanged Man, the card of the pause and a new angle',
    c: 'the Fool, the card of new beginnings',
  },
  reading: {
    a: 'will and intention',
    b: 'a suspended, turning moment',
    c: 'a new beginning',
  },
  // Described from the actual art in /tarot/return-mhf-faces.png (Rider-Waite), not from
  // tarot convention — she is looking at THAT picture, so a detail that is not in it reads
  // as a lie and costs the trust the line was added to buy.
  cardPicture: {
    a: 'Look at him — one hand raised to the sky, the other pointing at the ground. Every tool he needs is already on the table.',
    b: 'Look at him — hanging upside down by one ankle, and not struggling.',
    c: 'Look — one foot already over the cliff edge, eyes on the sky, everything they own tied in one small bundle.',
  },
  reads: {
    // The ad's hook — "Will he come back?". Reads HIM as a tendency, never a verdict.
    // ── Rewritten for readability 2026-08-18 ────────────────────────────────
    // The funnel's highest-traffic lander (5,311 leads) and its worst converter at
    // 6.12%. It read at grade 13.4 to an audience that is 55+ and on a phone. The shape
    // is the one proven on cards-will-commit: the PICTURE first (she has the card art on
    // screen at message 1, so a claim she can check in one second is what earns the
    // sentence after it), then her own ad question said back to her, then the read in
    // one-idea bubbles. Gated by scripts/check-read.mjs — grade <=5, <=25 words and
    // <=2 sentences per bubble.
    //
    // The MEANING is unchanged from the 2026-07-28 sign-off, deliberately: same tendency
    // per card, no return predicted, no timeframe, her instinct affirmed. Only the
    // reading level moved. The 2026-07-30 lesson is kept too — beat 3 on card c stays
    // conditional ('if this does come to something'), never presupposing he comes back.
    //
    // BEAT 4 REWRITTEN 2026-08-19. It must name an OBSTRUCTION, not an absence or a becoming —
    // 9 of these 12 named neither ('the turn that's forming', 'what he's weighing') and the
    // Empress line named the OPPOSITE ('what's drawing him back', a pull rather than a block).
    // Act 1 sells an Energy Clearing Ritual that removes "the shadow that's been blocking your
    // path"; improve-v1/08-clearing-theme-coherence.md found clearing is SPRUNG at the pitch
    // rather than seeded, and this is the earliest place to seed it. The object sits between HER
    // and the return she asked about — the love bucket frames every block as an impersonal thing
    // in her path precisely so that removing it blames nobody.
    'cards-return': {
      a: [
        "You turned the Magician, dear. Look — a cup, a coin, a blade and a wand, all laid out on his table.",
        "You asked if he'll come back. Your hand went straight to the man who can act.",
        "He isn't short of a way back, dear. He has one.\nSo this was never about whether he could.\nAnd that pull you still feel? It isn't only yours.\nYou've felt him on the other end of it. You're reading that right.",
        "Let me look closer at what sits between you and his way back…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he hangs by one ankle from a green tree, and his face is calm.",
        "You asked if he'll come back. Your hand went to a man still up in the air.",
        "Nothing has been settled here, dear. Not for you, and not against you.\nHe hasn't shut the door. He hasn't opened it either.\nYou keep refusing to call this over.\nThat isn't you clinging, dear. You're reading it right.",
        "Let me look closer at what's holding this in between…",
      ],
      c: [
        "You turned the Fool, dear. Look — a white rose in one hand, a small bundle on a stick, a dog at his heel.",
        "You asked if he'll come back. Your hand went to the one card that won't call this over.",
        "The road is still open, dear. The door was never shut.\nBut look where his eyes are. On what's ahead, not behind.\nSo if this does come to something, it starts new.\nIt won't pick up where it broke. That isn't a smaller thing, dear.",
        "Let me look closer at what stands between you and that open road…",
      ],
    },
    'cards-honest': {
      a: [
        "You turned the Magician, dear — the card of the crafted image, of what's presented with skill.",
        "Your hand didn't reach for that by accident; some part of you senses a gap between what he shows and what's underneath.",
        "The Magician doesn't mean he's lying — it means he's practiced at presenting, and that sense the picture is a little too polished is real information, not you being difficult.",
        "Let me look closer at what's behind the performance…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what's suspended, held just out of view.",
        "You reached for the card that matches the feeling you can't quite settle.",
        "The Hanged Man doesn't mean he's lying — it means something between you is on pause, unresolved, and the sense that the full truth hasn't turned to face you yet is accurate.",
        "Let me look closer at what's waiting to come into view…",
      ],
      c: [
        "You turned the Fool, dear — the card of the open, unguarded hand.",
        "You reached for the card that matches something you feel in how he moves through this.",
        "The Fool doesn't point to deception — it points to a man who hasn't sat down and thought it through; what's unsaid here may be unexamined rather than hidden, and your sense that you're not getting the whole picture is still accurate.",
        "Let me look closer at what he's leaving unsaid…",
      ],
    },
    'cards-feels': {
      a: [
        "You turned the Magician, dear. Look — a red robe over white, and a loop above his head with no end to it.",
        "You asked how he really feels. Your hand went to the man who does nothing by accident.",
        "So the warmth you felt was not made up, dear.\nA man like this doesn't warm to someone by accident.\nWhat he hasn't done is say it out loud.\nThat gap is real, dear. You've been reading it right.",
        "Let me look closer at what's sitting between you and the words…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he's upside down, and there's a light around his head.",
        "You asked how he really feels. Your hand went to the man stuck between two things.",
        "You haven't been reading coldness, dear. You've been reading a hold.\nSo the mixed signals were not you misreading him.\nYou were reading two true things at once.\nThat pull you sense is genuine. So is the hold.",
        "Let me look closer at what's holding you both in the middle…",
      ],
      c: [
        "You turned the Fool, dear. Look — he's looking up at the sky, not down at the drop.",
        "You asked how he really feels. Your hand went to the man living in the moment.",
        "What you picked up was real, dear. It just lives in the moment.\nBut look where his eyes are. Up, not down the road.\nSo he hasn't worked out where this goes.\nThat's a different thing from not caring, dear. You've felt both at once.",
        "Let me look closer at what keeps this from settling…",
      ],
    },
    'cards-cheating': {
      a: [
        "You turned the Magician, dear — the card of the polished surface, of what's presented.",
        "You reached for that card for a reason; some part of you senses a distance between the image and what's real.",
        "The Magician is not a verdict of betrayal — it means something is being managed or curated, and the unease you feel about a gap between his story and your gut is real information, not paranoia.",
        "Let me look closer at the one shadow the polish doesn't cover…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what's suspended and unclear.",
        "You reached for the card that matches the limbo you can't quite name.",
        "The Hanged Man is not a confession — it means something between you is on hold and not what it seems from your angle; the feeling that something's paused and off is real, and it deserves clarity, not self-blame.",
        "Let me look closer at what's actually suspended between you…",
      ],
      c: [
        "You turned the Fool, dear — the card of impulse and the unguarded moment.",
        "Your hand reached for the card that matches the restlessness you've been feeling from him.",
        "The Fool is not proof of unfaithfulness — it leans toward impulsiveness and living in the moment; watch that tendency, but what your intuition is flagging deserves a closer, honest look, not a spiral.",
        "Let me look closer at what the restlessness is really about…",
      ],
    },
    // ── Trust/authenticity hooks (2026-07-30) ────────────────────────────────
    // DRAFT reads pending operator sign-off. Written bespoke per hook: the wound
    // here is who he IS, not what he's done, so none of the cards-honest /
    // cards-return / cards-feels vocabulary is reused. A woman who clicks "Is he
    // the real person, or just a picture?" must get a reveal about THAT, not a
    // repurposed honesty read.
    //
    // 'Is he really who he says he is?' — the man he presents vs the man underneath.
    'cards-who-he-is': {
      a: [
        "You turned the Magician, dear. Look — roses and lilies at his feet, and one arm held straight up.",
        "You asked if he's really who he says he is. Your hand went to the man who builds what you see.",
        "The Magician builds what people see, dear. That is his craft.\nSo what he shows you was put together on purpose.\nThat doesn't tell me who stands behind it. It tells me there is a behind.\nYou already sensed that, dear. Keep hold of it.",
        "Let me look closer at what sits between you and the man behind it…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one leg tied to the branch, the other bent behind it, out of sight.",
        "You asked if he's really who he says he is. Your hand went to the card of one hidden side.",
        "The Hanged Man shows one side, dear. Never both.\nYou were given a part, and asked to judge the whole.\nThat is why you can't get a clean read on him.\nThe trouble isn't your judgement, dear. It's what you were handed.",
        "Let me look closer at what stands between you and a straight answer…",
      ],
      c: [
        "You turned the Fool, dear. Look — all he owns is tied in one small bundle on a stick.",
        "You asked if he's really who he says he is. Your hand went to the man still deciding.",
        "The Fool travels light, dear. Nothing about him is settled yet.\nSo the man you met and the man now can both be him.\nOr he has not shown you the whole road. The card won't say which.\nEither way, you noticed the change. That is worth trusting.",
        "Let me look closer at what keeps getting between you and all of him…",
      ],
    },
    // 'Is he the real person, or just a picture?' — she has only ever had an image.
    //
    // ⚠ This hook selects for women who suspect a fake profile or a romance scam. The
    // 2026-07-10 buyer audit found Evelyn reframing textbook scam markers as a genuine
    // bond (rubric check-10 FAIL, escalated). So these reads AFFIRM HER CAUTION and
    // never vouch for him — while still never stating as fact that he is fake, which
    // would be a verdict. See TAROT_HOOK_TENDENCY in server/lib/prompts.ts.
    'cards-real-person': {
      a: [
        "You turned the Magician, dear — the card of the made thing, of the image that someone assembled.",
        "Your hand went to the card of construction, and that tells me you have already sensed how much of him arrives pre-arranged.",
        "The Magician does not tell me he is fictional — it tells me that what you have been given is an image, and an image can be built by anyone; the fact that you cannot get past it to a person is information, not impatience on your part.",
        "Let me look closer at how much of him exists off the screen…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing that hangs, that never quite lands.",
        "You reached for the card that matches the waiting you have been doing for him to become real.",
        "The Hanged Man does not declare him an invention — it marks someone who stays permanently almost-here, always one obstacle short of meeting you, and that pattern is the answer you have been asking me for; a man who wants to be known finds a way to be reached.",
        "Let me look closer at what always seems to come up right before he arrives…",
      ],
      c: [
        "You turned the Fool, dear — the card of the beginning that has not yet touched the ground.",
        "That is not random; you reached for the card of something still weightless, still untested by real life.",
        "The Fool does not brand him a stranger — it says what you have so far is a beginning that has never had to survive an ordinary afternoon together, and until it does, what you are holding is a promise rather than a person; your caution here is wisdom, not cynicism.",
        "Let me look closer at what it would take to bring this into daylight…",
      ],
    },
    // 'Am I being misled?' — the account she's been given vs what she has seen. The
    // win is restoring trust in HER OWN perception; she arrives already self-doubting.
    'cards-misled': {
      a: [
        "You turned the Magician, dear — the card of the hand that shapes the story.",
        "You reached for the card of direction, and women do not reach for that card when the account they have been given adds up.",
        "The Magician does not hand down a verdict that you are being deceived — it says the version of events you keep being offered has been shaped for you, and the small places where it does not match what you saw with your own eyes are exactly where your attention belongs.",
        "Let me look closer at the detail that never quite fits…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the view that is deliberately kept unclear.",
        "You reached for the card that matches the dizziness of never being able to settle what is true.",
        "The Hanged Man is not proof that you are being played — it says you have been kept at a distance from the whole of it, and the confusion you have been blaming on yourself is a symptom of that distance, not a flaw in your judgment.",
        "Let me look closer at what the confusion has been protecting…",
      ],
      c: [
        "You turned the Fool, dear — the card of what gets left uncorrected.",
        "That is not random; you reached for the card of the easy answer, the one that was simpler to leave standing than to fix.",
        "The Fool does not mean he set out to mislead you — it points to someone who let a convenient impression stand rather than correct it, which lands on you the same way in the end; what you are sensing is a real absence of straightening-out, not you being suspicious for no reason.",
        "Let me look closer at what he has never bothered to correct…",
      ],
    },
    // ── Honesty/lying hooks (2026-08-03) ─────────────────────────────────────
    // Face-down only, by operator scope (2026-08-03) — NOT ported to arcana-mfh.
    // Written bespoke: the two nearest live hooks are 'cards-honest' (his practice of
    // presenting) and 'cards-misled' (the shaped account), and a woman who clicks "Am I
    // being lied to?" must not receive either of those reads wearing a new headline.
    // The three wounds are kept deliberately distinct — a CLAIM she was given, whether
    // the telling is the WHOLE of it, and whether she has been deliberately PLAYED.
    //
    // 'Am I being lied to?' — a specific untruth she suspects she has been handed.
    'cards-lied-to': {
      a: [
        "You turned the Magician, dear — the card of skill in the telling, of the account delivered without a stumble.",
        "Your hand went to the card of the smooth answer, and I do not think that was chance.",
        "The Magician hands down no verdict that you have been lied to — it says the telling has been handled well enough that you cannot fault it anywhere, and the fact that a flawless account is the very thing unsettling you means your ear is working, not that you are hunting for trouble.",
        "Let me look closer at the answer that arrived too easily…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question left hanging in the air.",
        "You reached for the card that matches how often you have asked and come away still holding the question.",
        "The Hanged Man does not convict him of a lie — it marks a man who lets a question stay open rather than close it, and the doubt you have been treating as your own suspicion is really the weight of something never answered.",
        "Let me look closer at the question he keeps stepping around…",
      ],
      c: [
        "You turned the Fool, dear — the card of the word given lightly, before its cost was weighed.",
        "That is not random; you reached for the card of the quick assurance, the one offered faster than it was thought about.",
        "The Fool does not name him a liar — it points to a man whose word outruns his intention, so what he told you may have been meant when he said it and untrue by the morning; the gap you keep landing in is real, and you are not wrong to have stopped trusting the telling.",
        "Let me look closer at the distance between what he says and what he does…",
      ],
    },
    // 'Is he telling me the truth?' — not "is he lying" but "is this the WHOLE of it".
    'cards-truth': {
      a: [
        "You turned the Magician, dear — the card of the account that has been edited before it reaches you.",
        "Your hand went to the card of selection, and women reach for that card when they can feel the shape of something left out.",
        "The Magician stops short of calling him false — it says you are being handed a chosen portion rather than the whole, and a truth with pieces removed still leaves you exactly where you are standing now, unable to make it add up.",
        "Let me look closer at the part that never made it into the telling…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what is true from where he stands and not from where you do.",
        "You reached for the card that matches how his version and your own can both seem right and still never meet.",
        "The Hanged Man does not rule that he is deceiving you — it says he may be giving you a truth built entirely from his own vantage, which is why it never quite covers what you have actually lived; that mismatch is not you failing to understand him.",
        "Let me look closer at what the view from your side has been telling you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the man who has not yet asked himself the question you are asking him.",
        "That is not random; you reached for the card of the unexamined answer, given long before it was ever worked out.",
        "The Fool does not find him false — it points to someone who cannot hand you the truth of it because he has not sat still long enough to know it himself, and an answer given that lightly is not something you should be asked to build on.",
        "Let me look closer at what he has never stopped to work out…",
      ],
    },
    // 'Am I being deceived?' — the heaviest of the three.
    //
    // ⚠ This hook selects for women who have begun to feel FOOLISH, so the failure mode
    // is any reading that lands the fault on her openness — the same shape of harm the
    // 'cards-wont-commit' guard exists to prevent. Beat 3 on card c answers it head-on.
    // Never state as fact that she has been deceived (a verdict on him) and never
    // reassure her that she has not been (the 'cards-real-person' failure, 2026-07-10).
    'cards-deceived': {
      a: [
        "You turned the Magician, dear — the card of the practised hand, of someone who knows the effect he is having.",
        "Your hand went to the card of deliberate effect, and that tells me you have already stopped believing all of this is accident.",
        "The Magician does not pronounce you deceived — it says what has been happening around you has had a hand in it rather than being a run of bad luck, and noticing that took clear sight, not a suspicious mind.",
        "Let me look closer at what has been arranged around you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the moment everything turns over and reads differently.",
        "You reached for the card of the second look, and no woman reaches for that card unless something has already begun re-reading itself.",
        "The Hanged Man makes no ruling that you have been played — it marks the point where the same events start making a different kind of sense, and if things have been quietly rearranging themselves in your mind lately, that is your judgment working rather than deserting you.",
        "Let me look closer at what looks different now that it has turned…",
      ],
      c: [
        "You turned the Fool, dear — the card of the open hand, of trust given freely.",
        "Your hand went to the card of the one who came in without guarding herself, and I want you to hear how I mean that.",
        "The Fool passes no judgment on you and hands down no verdict on him — it names the openness you brought to this, and openness is not the same thing as being foolish; if something was done with that trust, it belongs to the hand that took it and never to you for having offered it.",
        "Let me look closer at what your trust was actually met with…",
      ],
    },
    // ── Commitment hooks (2026-07-31) ────────────────────────────────────────
    // The riskiest angle to write. "Will he ever…" is a direct request for a
    // PREDICTION, and the pull is to answer it — which would be the verdict the
    // whole funnel forbids. So every beat-3 here answers WHERE HE STANDS, never
    // what happens next, and carries no timeframe. Bespoke wording: nothing is
    // recycled from the decode-him or trust hooks (verified mechanically — no
    // shared 6-word run in beat 3).
    'cards-will-commit': {
      a: [
        "You turned the Magician, dear. Look — one hand up to the sky, one down to the ground, every tool laid out on his table.",
        "You asked whether he'll ever commit. Your hand went to the man who already has all he needs.",
        "He isn't missing a thing, dear. He could decide.\nHe just hasn't.\nYou've felt that all along. You're reading him right — you're not making it up.\nAnd wanting an answer by now isn't you pushing. It's you being awake.",
        "Let me look closer at what he keeps picking instead…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look at him — hanging upside down by one ankle, and not fighting it.",
        "You asked whether he'll ever commit. Your hand went to the man hanging between two answers.",
        "He hasn't come down on either side. Not toward you, not away.\nHe isn't keeping a decision from you, dear. He hasn't made one.\nThat's the harder answer, I know. But it's the true one.\nAnd you did wait, dear. That was real — you didn't make it up to keep hoping.",
        "Let me look closer at what's holding him up there…",
      ],
      c: [
        "You turned the Fool, dear. Look — one foot out over the edge, the other still on the ground.",
        "You asked whether he'll ever commit. Your hand went to the man caught mid-step.",
        "That foot is still in the air. He hasn't come down either way.\nSo nothing has been settled against you. Not yet.\nYou kept hoping. That isn't you fooling yourself, dear — you were reading it right.",
        "Let me look closer at which way that foot comes down…",
      ],
    },
    // ⚠ This hook PRESUPPOSES his refusal. Two failure modes, not one: pronouncing
    // on his character, and letting the answer land as her fault. The reads route
    // the "why" to where HE is stuck and never to anything she did or is.
    'cards-wont-commit': {
      a: [
        "You turned the Magician, dear — the card of intention, of the will behind what a man does and does not do.",
        "You are asking why he will not, and your hand found the card that says his holding back is active rather than accidental.",
        "The Magician does not name him cold or cruel — it points to a man aiming his will somewhere he has not shown you, and your read that this is a choice rather than bad timing is sound.",
        "Let me look closer at where his intention has been going…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the man who stopped mid-step and never finished it.",
        "You reached for the card of suspension, and it is his that you have been living inside.",
        "The Hanged Man does not say he is withholding to punish you — it points to someone stuck rather than settled, and the straight answer he keeps failing to give you is one he does not possess, not one you asked for wrongly.",
        "Let me look closer at what has him stuck…",
      ],
      c: [
        "You turned the Fool, dear — the card of the unfinished road, of the man still treating his life as a beginning.",
        "Your hand reached for the card of the not-yet, which is where he has kept living.",
        "The Fool does not make him a bad man — it points to someone who has not arrived yet rather than someone who weighed you and decided against you, and that difference matters far more than anyone has told you.",
        "Let me look closer at what he is still circling…",
      ],
    },
    'cards-ready-commit': {
      a: [
        "You turned the Magician, dear — the card of a man's own power to build something.",
        "You are asking about readiness, and your hand found the card of capability rather than circumstance.",
        "The Magician makes no promise that the day arrives — it says the material is all there and unassembled, and your instinct that he is capable of more than he has been giving is not wishful thinking.",
        "Let me look closer at what he would have to put down first…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the long pause that comes before a turn.",
        "You reached for the card of the in-between, and readiness is exactly the thing that lives there.",
        "The Hanged Man offers no when and no whether — it says he is mid-change rather than finished forming, and the patience you have spent went to something genuinely unfinished rather than to nothing at all.",
        "Let me look closer at the turn he has not made…",
      ],
      c: [
        "You turned the Fool, dear — the card of the beginner, of the one still learning the road.",
        "Your hand went to the card of the untested, which is a fair description of where he is standing.",
        "The Fool is no sign that growing into it is beyond him — it points to someone earlier in the journey than you are rather than someone who cannot make it, and the distance you have been feeling between you is real and worth naming out loud.",
        "Let me look closer at the distance between where you each stand…",
      ],
    },
    // ── Reunion/return hooks (2026-08-04) ────────────────────────────────────
    // Face-down only, by operator scope — NOT ported to arcana-mfh.
    //
    // The nearest live hook is 'cards-return', which asks the IDENTICAL question and
    // whose reads are signed off (2026-07-28). 'cards-come-back' runs the same headline
    // against it as a copy test, so these reads must be genuinely different copy rather
    // than a paraphrase — 0 shared 6-word runs in beat 3, verified mechanically.
    //
    // The lens is deliberately shifted off cards-return's. Where that one reads whether
    // the situation is still open, these three read: what a return would actually REQUIRE
    // (come-back), what the waiting has COST her (ever-back), and the burden of the
    // unanswered either-or itself (moved-on).
    //
    // 🔴 Every beat 3 answers where things STAND. Never a forecast in either direction —
    // "he will come back" is a promise the funnel cannot keep, and "he has moved on" is a
    // pronouncement on a man, delivered to a woman already braced for it.
    //
    // 'Will he come back?' — the obstacle, not the outcome. A return would be an ACT.
    'cards-come-back': {
      a: [
        "You turned the Magician, dear — the card of the deliberate act, of the thing a man has to decide before it happens.",
        "Your hand went to the card of doing rather than drifting, and for this question that is telling.",
        "The Magician issues no forecast — it says a return here would have to be chosen and then carried out rather than floating back on its own, and the reason all this waiting has felt so shapeless to you is that you keep being handed signals where a decision was owed.",
        "Let me look closer at the decision he has been leaving unmade…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the sentence nobody finished.",
        "You reached for the card of the thing left mid-air, and I do not think that was chance.",
        "The Hanged Man hands me no answer about which way this lands — it marks something neither of you ever actually concluded, only walked away from partway through, and an ending that was never once spoken out loud is not the same animal as an ending; that is why you have not been able to put it down.",
        "Let me look closer at what was never actually said between you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the leaving that settled nothing on its way out.",
        "That is not random; you reached for the card of the exit made before anything was resolved.",
        "The Fool offers no prediction about his step — it points to a going that skipped every question rather than answering them, so what sits between you now is an unfinished conversation and not a verdict, and wanting it finished does not make you a woman chasing after a man.",
        "Let me look closer at the conversation this never got…",
      ],
    },
    // 'Will he ever come back to me?' — the "ever" is the wound. She has waited a long
    // time and has begun to fear the waiting itself was the mistake.
    //
    // ⚠ Same shape of harm as cards-wont-commit and cards-deceived: nothing may land as
    // her having been foolish to wait. The reads name her constancy as the thing that was
    // never wasted, and stay honest that anything reopening would BEGIN rather than resume.
    'cards-ever-back': {
      a: [
        "You turned the Magician, dear — the card of what a person keeps aiming their life at.",
        "Your hand found the card of sustained intention, which is a fair description of what you have been doing here.",
        "The Magician gives me nothing I could promise you — it says the time you have gone on pointing at this was time you genuinely meant, and whatever he does with what is left of it, the steadiness in you was never the part that went to waste.",
        "Let me look closer at where all that steadiness has actually been going…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the long wait, of time spent living inside a question.",
        "You reached for the card of suspension, and it is your own you have been hanging in, not his.",
        "The Hanged Man declines the ever in your question — it says you have been asked to live in an unanswered thing far longer than anyone should be asked to, and the tiredness underneath your asking is not weakness, it is the honest weight of having waited without ever being told anything.",
        "Let me look closer at what the waiting has been asking of you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the page that has stayed blank.",
        "Your hand went to the card of what has never been written on, which is where this has sat for a long while now.",
        "The Fool holds out no guarantee of him — it says anything opening here again would have to start as a new thing rather than resume as the old one, and the man you have been keeping the place set for may not be the one who could walk into it; knowing that now protects you far better than hoping around it.",
        "Let me look closer at who it is you have been keeping that place for…",
      ],
    },
    // 'Is he coming back, or has he moved on?' — a binary, and the read REFUSES it.
    //
    // ⚠ Picking either side is a failure: one is a promise, the other a pronouncement.
    // The read's job is to name the not-knowing as the real burden and put it back where
    // it belongs — with the person who has left her to deduce it from silence.
    'cards-moved-on': {
      a: [
        "You turned the Magician, dear — the card of the move that is made on purpose, never by drift.",
        "Your hand reached for the card of agency, and for a question with two answers in it that matters more than which answer.",
        "The Magician refuses the either-or you brought me — it says that whichever of the two turns out to be true, it will be something he does rather than something that merely happens to him, and you are owed the telling of it instead of being left to work it out from silence.",
        "Let me look closer at what his silence has been doing in place of an answer…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of two answers that have not yet come apart.",
        "You reached for the card of the unseparated, which is exactly the position he has left you standing in.",
        "The Hanged Man will not divide your question for me — it says both halves of it are still live, and being made to hold two opposite futures open at the same time is genuinely exhausting; that exhaustion is the price of not being told, not proof that you are unable to let go.",
        "Let me look closer at what it is costing you to hold both…",
      ],
      c: [
        "You turned the Fool, dear — the card that refuses to be pinned to one answer.",
        "That is not random; you reached for the card of what has not yet hardened into anything.",
        "The Fool declines to take a side of your question — it points to a thing still unfixed rather than one already settled behind your back, and the not-knowing you have been carrying as your own indecision was never yours; it is his, and it has been sitting in your lap.",
        "Let me look closer at whose uncertainty you have been carrying…",
      ],
    },
    // ── Healing/moving-on hooks (2026-08-04) ─────────────────────────────────
    // Face-down only, by operator scope — NOT ported to arcana-mfh.
    //
    // The first family whose subject is HER MIND. The nearest live neighbour is the
    // reunion angle shipped the same morning — especially 'cards-ever-back', which also
    // speaks to a long attachment. The separation held here: reunion reads the WAITING
    // and what it cost her; these read the THINKING itself and why it persists.
    //
    // 🔴 Compliance runs in THREE directions on this angle, not two:
    //   1. never instruct her to move on, let go, forgive or forget — that is a directive
    //      about how she should live, not a reading;
    //   2. never claim he is thinking of her too, and never promise a return — the
    //      reunion angle's promise failure, wearing a softer face;
    //   3. never pathologise the thinking (obsession, "stuck", "unhealthy") and never let
    //      it land as her weakness. A woman still thinking about someone is not a
    //      diagnosis, and this angle sits closer to grief than any other.
    // On 'cards-who-hurt-me' a fourth applies: never minimise or explain away the hurt
    // she has already named, while still passing no verdict on him as a person.
    //
    // 'Why can't I stop thinking about him?' — the thought is unfinished business.
    'cards-cant-stop': {
      a: [
        "You turned the Magician, dear — the card of the mind that keeps working at a thing until it comes out whole.",
        "Your hand went to the card of the unfinished problem, and for this question that is telling.",
        "The Magician passes no judgment on you for any of it — it says your mind has been set to a problem it was never handed the pieces to finish, and a mind that keeps returning to an unsolved thing is doing its work rather than failing you.",
        "Let me look closer at the piece you were never given…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thought that will not be set down.",
        "You reached for the card of what stays held mid-air, and it is your own thinking that has been hanging there.",
        "The Hanged Man does not call this a failure to move on — it marks something that was never concluded, and what was never concluded cannot be put down simply by deciding to put it down; that is the shape of the thing itself and not a weakness in you.",
        "Let me look closer at what was never allowed to finish…",
      ],
      c: [
        "You turned the Fool, dear — the card of the story that was never given its last page.",
        "That is not random; you reached for the card of the tale that stops mid-sentence.",
        "The Fool hands you no instruction to forget him — it points to something closed by a person walking out of it rather than by an ending, and a mind will go on turning the last page it was given until somebody hands it a better one.",
        "Let me look closer at the ending you were owed…",
      ],
    },
    // 'Why is he always on my mind?' — not effort, but the SIZE of the room he still has.
    'cards-on-my-mind': {
      a: [
        "You turned the Magician, dear — the card of what a person deliberately builds room for.",
        "Your hand found the card of the thing that was made on purpose, and that matters more here than you might expect.",
        "The Magician makes no ruling about him at all — it says you built something real and gave it genuine room, and the reason he turns up everywhere is that the room is still standing; leaving it standing is not a mistake you have made.",
        "Let me look closer at what you actually built here…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the space that stays held open.",
        "You reached for the card of what is kept in reserve, and it is a great deal of you that has been kept there.",
        "The Hanged Man will not weigh your feeling against how much he earned it — it says a space that size was made by someone capable of that much, and what that measures is the scale of you rather than the worth of him.",
        "Let me look closer at how much of you is still being held there…",
      ],
      c: [
        "You turned the Fool, dear — the card of the door nobody ever shut behind him.",
        "Your hand went to the card of the thing left ajar, which is a fair description of where this has sat.",
        "The Fool offers no verdict on whether he thinks of you — it points to something left open rather than closed, and a mind treats an open door as a live thing; that is why he arrives unbidden in the middle of perfectly ordinary days.",
        "Let me look closer at what has been coming through that door…",
      ],
    },
    // 'Why do I still think about someone who hurt me?' — the SHAME. The heaviest hook
    // on the funnel: she has already decided the thinking is a fault in her.
    //
    // ⚠ Two failure modes at once, pulling opposite ways. Minimising what she has named
    // ("perhaps he did not mean it") abandons her; pronouncing on him ("he is a cruel
    // man") is the verdict the funnel forbids. Take HER account as given, place no
    // judgment on him as a person, and never let the answer land on her.
    'cards-who-hurt-me': {
      a: [
        "You turned the Magician, dear — the card of the mind at work on an injury it cannot yet explain.",
        "Your hand went to the card of the unsolved thing, and I want you to hear what that means before you decide anything about yourself.",
        "The Magician does not hand you a reason to be ashamed — it says a mind goes back to an injury in order to understand it and never because it wants more of it, so what you have been reading as still wanting him is far more likely a woman still trying to make sense of what was done to her.",
        "Let me look closer at what your mind has been trying to solve…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing examined from every angle except the one that would explain it.",
        "You reached for the card of the view that never resolves, and that is exactly where this has left you.",
        "The Hanged Man passes no judgment on him and none on you — it marks something you have turned over from every side without ever being handed the piece that would make it make sense, and no amount of thinking gets you to peace with an account that was never completed.",
        "Let me look closer at the piece that has been kept from you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the woman you were before any of this had happened to you.",
        "That is not random; you reached for the card of the self who walked in ahead of all this knowledge.",
        "The Fool asks nothing of you — not to forgive it, not to forget it, not to be finished with it — it points back to the woman who walked in without knowing what it would cost, and she was not naive for that; going back to her in your mind is a different act entirely from wanting him.",
        "Let me look closer at what she deserved to be told…",
      ],
    },
    // ── Pulling-away hooks (2026-08-05) ──────────────────────────────────────
    // The only family on the funnel about a man who is STILL HERE. Not gone (reunion),
    // not withholding a future (commitment), not caught in an untruth (honesty) — present,
    // reachable, and cooler than he was. The wound is the CHANGE, so every read is written
    // about the drop in temperature rather than about him as a person.
    //
    // Beyond the standing tendency-never-verdict rule, three things are banned outright in
    // this block and pinned by tests/tarot-pulling-away-copy.test.ts:
    //   1. STRATEGY. No giving him space, no pulling back, no matching his energy, no
    //      advice about texting. That is coaching on how to handle a man, not a reading,
    //      and it is the answer the rest of the internet gives this exact question.
    //   2. SELF-BLAME. She arrives having already decided it was something she did. Nothing
    //      may land as her being too much, too available, too eager or not enough — the
    //      same harm the cards-wont-commit and cards-deceived reads are written against.
    //   3. EXCUSING HIM. 'He is just stressed', 'men need space'. An excuse is a verdict
    //      wearing a kinder face, and on cards-losing-interest it is one half of the very
    //      binary the read has to refuse.
    //
    // 'Why is he pulling away from me?' — the WIDENING GAP. Where the distance comes from,
    // and why no amount of working at it on her side has resolved it.
    'cards-pulling-away': {
      a: [
        "You turned the Magician, dear — the card of the thing being decided somewhere you cannot see it.",
        "Your hand went to the card of the choice made off-stage, and for a question like yours that is worth sitting with.",
        "The Magician names nothing of what he has settled on, nor whether he has settled anything at all — it says the pulling back you have been measuring is real and not a thing you invented, and that whatever sits behind it is being worked out somewhere you were never given a way in. That is why turning it over on your own has produced no answer; the missing piece was never on your side of it.",
        "Let me look closer at what is being decided out of your sight…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what is still standing but no longer moving.",
        "You reached for the card of the thing that stalled without ending, which is a fair description of where you have been left.",
        "The Hanged Man rules on neither of you — it marks a thing that stopped moving rather than a thing that stopped, and from where you are standing those two feel identical while meaning entirely different things. What you are living inside is the not-moving, and being kept there without a word of explanation is a weight of its own, quite apart from whatever the reason turns out to be.",
        "Let me look closer at where the movement went out of this…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that quietly changed direction.",
        "That is not random; your hand found the card of the turn taken without ever being announced.",
        "The Fool offers no forecast about where any of this lands — it points to something that changed course rather than something that broke, and a change of course made in silence leaves the other person to notice it alone. You noticed. Having to be the one who notices, with nothing said to you directly, is a real part of what this has been costing you.",
        "Let me look closer at when the direction changed…",
      ],
    },
    // 'Why has he gone cold on me?' — the CONTRAST. The warmth existed; that is the thing
    // to affirm, and affirming it convicts him of nothing.
    'cards-gone-cold': {
      a: [
        "You turned the Magician, dear — the card of what took real intention to make in the first place.",
        "Your hand found the card of the deliberate thing, and that matters here more than it may sound.",
        "The Magician makes no ruling on where he has gone since — it says what you had was not an accident and not a misreading on your part, because warmth of that kind never arrives by drift; it takes a person genuinely turning toward you to make it. Whatever has changed since cannot reach back and un-make the fact that it was real while you had it.",
        "Let me look closer at what it was he was actually building…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the same man in the same place, gone strangely unfamiliar.",
        "You reached for the card of what is exactly where you left it and no longer feels like it, which is the confusion you have been carrying.",
        "The Hanged Man refuses to say his heart has closed, and refuses just as flatly to say it has not — it marks a suspension rather than a ruling, and what it says about you is that you are not imagining a drop in temperature you could once feel plainly. Being expected to carry on as normal toward someone who has cooled, with nothing acknowledged, is draining in a way that has nothing to do with you being too sensitive.",
        "Let me look closer at where the warmth went…",
      ],
      c: [
        "You turned the Fool, dear — the card of the beginning still visible underneath what this has become.",
        "That is not random; you reached for the card that remembers how this started, and that is the very thing you keep measuring today against.",
        "The Fool lays no charge at his door for the cooling and none at yours for having felt it — it points back at something that genuinely began, and a beginning that real does not simply evaporate of its own accord without something happening to it. You are not holding today up against a version you invented; you are holding it up against one you actually lived.",
        "Let me look closer at the beginning you have been measuring against…",
      ],
    },
    // 'Is he losing interest, or just going through something?' — the EITHER-OR. Like
    // cards-moved-on, answering either half fails: one is a pronouncement on a real man
    // delivered to a woman already braced for it, the other is the excuse. The finding is
    // that she was left to deduce it at all.
    'cards-losing-interest': {
      a: [
        "You turned the Magician, dear — the card of the answer one person already holds while the other is left guessing at it.",
        "Your hand went to the card of the thing already known on one side of this, and for a question shaped like yours that is telling.",
        "The Magician will not choose between your two possibilities and neither will I, because whichever one is true he is the one holding it while you are the one asked to work it out from the outside. That is the finding. A question this size gets answered by being told, and having to read it off his behaviour instead is a job you have been doing on his behalf.",
        "Let me look closer at what is being kept on his side of this…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the decision you are being made to hold for somebody else.",
        "You reached for the card of the weight handed sideways, and it has landed squarely in your lap.",
        "The Hanged Man declines your either-or completely, and that refusal is the reading rather than a dodge — both halves of it cost you the same thing while nobody tells you which you are paying for. Those two possibilities would ask completely different things of you, and you have been given no way to know which one you are living in. That is not you overthinking; it is a question that was never answered anywhere you could hear it.",
        "Let me look closer at what you have been left holding…",
      ],
      c: [
        "You turned the Fool, dear — the card of the page you were handed with half its words missing.",
        "That is not random; your hand went to the card of the account that arrives incomplete.",
        "The Fool refuses to be pushed into calling this one thing or the other — what it shows me is a situation you have been asked to interpret without being given enough to interpret it with. Wherever this is genuinely heading, you were owed the words for it, and going without them has been doing its own damage regardless of which explanation turns out to be true.",
        "Let me look closer at the words you were never given…",
      ],
    },
    // ── Reconciliation (2026-08-06) ──────────────────────────────────────────
    // The us-framed sibling of the reunion reads. Same topic, different subject: reunion
    // asks what HE will do, these ask what the TWO of them are. That shift creates a
    // failure mode the reunion trio does not have, and it is the reason this block is
    // written separately rather than ported — the forbidden verdict here is on the
    // RELATIONSHIP, not on him.
    //
    // Beyond the standing tendency-never-verdict rule, four things are banned outright in
    // this block and pinned by tests/tarot-reconciliation-copy.test.ts:
    //   1. A VERDICT ON THE RELATIONSHIP, both ways. 'It is over' is a death notice
    //      delivered to someone who came asking; 'it is not over' is a promise the funnel
    //      cannot keep. Both are worse here than a verdict on him, because she cannot go
    //      and check them against anything.
    //   2. ODDS. No chances, percentages, likelihoods or 'strong possibility'.
    //      'cards-still-a-chance' asks for a number outright and there is no number.
    //   3. DIRECTIVES. No move on, let go, accept it, fight for him, reach out first. She
    //      arrives braced to be told what to do about it; that is not a reading.
    //   4. HER RESPONSIBILITY FOR THE OUTCOME. The us-framing makes it easy to imply the
    //      result rests on what she does next. It does not, and implying it hands her the
    //      blame for a decision that was never wholly hers.
    //
    // 'Will we get back together?' — THE TWO HALVES. A reunion is not one event granted to
    // her; it is two decisions that have to meet, and only one of them was ever hers.
    'cards-back-together': {
      a: [
        "You turned the Magician, dear — the card of the thing that only exists if two people build it.",
        "Your hand went to the card of what has to be made rather than waited for, and for a question worded the way yours is, that is worth noticing.",
        "The Magician holds no picture of the two of you a year from now — what it marks is that the thing you are asking about was never a single event you could watch for. It is two separate decisions that have to meet, and you have been treating it as one outcome to be granted to you. Half of it has always been yours, and you are allowed to know what your own half is well before his ever arrives.",
        "Let me look closer at the half of this that has always been yours…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what was left standing in the doorway, neither in nor out.",
        "You reached for the card of the thing never closed and never resumed, which is the exact place the two of you have been left.",
        "The Hanged Man is not in the business of telling you how this ends, and I will not put words in its mouth — what it shows is a thing suspended rather than finished, and two people can be held in a suspension without either of them having chosen it. That is not the same as being over, and it is not the same as being on its way back. What it has cost you is having to live inside it while nobody will name it.",
        "Let me look closer at what has been left standing between you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that could still be walked from either end.",
        "That is not random; you reached for the card of the beginning, and a beginning is the one thing that cannot be inherited from what came before it.",
        "The Fool carries no map of where the two of you end up — what it points at is that whatever opens here would be a different thing wearing a familiar name, not the old one handed back to you intact. You would not be collecting something you left behind. You would be deciding, with the same person and with everything you now know, whether to make something else — and that is a choice you are entitled to make deliberately rather than drift into.",
        "Let me look closer at what would actually be beginning…",
      ],
    },
    // 'Is there still a chance for us?' — THE ODDS. She is asking for a number and there
    // is none; quoting one in either direction is the failure. The finding is that hope
    // is a response to an unanswered question, not a refusal to face a settled one.
    'cards-still-a-chance': {
      a: [
        "You turned the Magician, dear — the card of what is still being held rather than spent.",
        "Your hand found the card of the thing not yet used up, and for a question shaped like yours that is worth sitting with.",
        "The Magician puts no number on this and I will not put one on it either — a chance is not a quantity lying somewhere waiting to be measured for you, and anyone who hands you a figure has invented it. What the card marks is that something here has not been spent, and that what you have kept alive is a response to something real rather than a story you told yourself to feel better. That is not a promise, and you deserve to have the difference said plainly rather than blurred.",
        "Let me look closer at what has not been spent…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the answer that has neither arrived nor been refused.",
        "You reached for the card of the question left open, which is precisely where you have been living.",
        "There is no measuring here and the Hanged Man does not pretend otherwise — it marks a thing held open, and the holding is being done somewhere you have no hand in. What you are carrying is not the outcome, because the outcome has not happened. It is the waiting without a word, and that is a real weight quite separate from however this eventually falls.",
        "Let me look closer at what is being held open…",
      ],
      c: [
        "You turned the Fool, dear — the card of the door nobody has closed.",
        "That is not random; your hand went to the card of what remains unshut, and you have been half-asking whether you are wrong to have noticed it.",
        "The Fool is not a set of odds and I will not read it as one — what it says is that nothing here has been sealed, and that seeing a door stand open is one thing while refusing to accept a shut one is quite another. You have been bracing to be told that hoping is a failure of realism. It is not. Hope is what a person does with a question that has not been answered, and this question genuinely has not been answered.",
        "Let me look closer at what has never been closed…",
      ],
    },
    // 'Is it really over between us?' — THE VERDICT REQUEST, and the sharpest hook in the
    // family. She is asking to be told whether to stop. Both answers are forbidden. The
    // finding: 'over' is a word somebody has to SAY, and nobody has said it to her — she
    // has been left to conclude it alone, which is why no amount of thinking settles it.
    'cards-really-over': {
      a: [
        "You turned the Magician, dear — the card of the word that has to be spoken by someone.",
        "Your hand went to the card of the thing that only becomes true once it is said out loud, and that sits nearer the centre of this than it may sound.",
        "Endings are not the Magician's to hand down and they are not mine either — what the card puts in front of me is that 'over' is a word somebody has to actually say, and from everything here it has never been said to you. You have been left to decide alone whether to call it, and that was never a job for one person. It is why no amount of turning it over has settled anything: you have been trying to conclude a conversation that only ever had you in it.",
        "Let me look closer at the words that were never said to you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing that neither ended nor carried on.",
        "You reached for the card of the unresolved, and that describes where you are more truly than either answer you came here for.",
        "The Hanged Man withholds the word you came for and withholds its opposite just as firmly, and the withholding is itself what I have to give you rather than an evasion of your question. What you are in is not an ending and it is not a continuation; it is the ground between them, and living there wears a person down in a way neither a clean ending nor a clear yes ever would. None of that is explained by you being unable to move on — you have not been handed the thing a person moves on from.",
        "Let me look closer at the ground you have been left standing on…",
      ],
      c: [
        "You turned the Fool, dear — the card of the sentence that was never finished.",
        "That is not random; your hand found the card of what breaks off rather than concludes, which is what you have been handed.",
        "Nothing in the Fool closes this and nothing in it reopens it — what it shows me is something left unfinished rather than something finished badly, and an unfinished thing wears the same face as a finished one when you are the one left holding it. Whichever this turns out to be, you were entitled to hear it plainly and you did not. Wanting that is not clinging, and it does not dissolve by being told to accept a conclusion nobody ever delivered.",
        "Let me look closer at the ending you were never actually given…",
      ],
    },
    // ── Soulmate-after-loss (2026-08-07) ─────────────────────────────────────
    // The only family on the funnel where the man may be DEAD. Everything else here reads
    // a man who left, cooled, withheld or lied — all of whom can still be asked. This one
    // reads a woman whose person is gone in the one way that admits no follow-up, and who
    // is asking forward rather than back.
    //
    // 🔴 MEDIUMSHIP IS THE FAILURE MODE THAT DOES NOT EXIST ANYWHERE ELSE ON THE FUNNEL.
    // "He is at peace", "he is watching over you", "he would want you to be happy", "he
    // sent you here" — every one of those is the single most natural thing to say to a
    // grieving woman, and every one is contact with the dead. That is a different product
    // with a different licence, `universalSafety.ts` does not catch it, and none of these
    // reads may go near it. No read below speaks FOR him, ABOUT where he is, or ABOUT what
    // he would want. He is referred to only as someone she loved and lost.
    //
    // Four more banned outright, on top of the standing rules, all pinned by
    // tests/tarot-soulmate-after-loss-copy.test.ts:
    //   1. AN ARRIVAL. No one is coming, no one is "out there right now", nothing is "on
    //      its way". The live self-frame incumbent 'cards-soulmate' is allowed to affirm
    //      arrival because no one has died; here that same sentence promises a bereaved
    //      partner a replacement, and it is the reason this family is not self-frame.
    //   2. A READINESS VERDICT, BOTH WAYS. 'cards-ready-to-love' asks to be graded on her
    //      grief. "You are ready" prescribes a timeline to a widow; "not yet" does the
    //      same from the other side. Refuse the binary, as cards-moved-on and
    //      cards-really-over refuse theirs.
    //   3. GRIEF DIRECTIVES. Move on, let go, honour him by living, he would want it. She
    //      arrives having already been told all of these by people who knew him.
    //   4. RANKING THE TWO LOVES. Nothing about a new love being better, healing, or what
    //      she "deserves now" — that quietly rates the marriage she lost.
    //
    // 'Will I find a new soulmate after loss?' — THE WORD "NEW". The fear underneath is
    // not whether someone exists; it is whether loving again would mean replacing him.
    'cards-new-soulmate': {
      a: [
        "You turned the Magician, dear — the card of what a person is still able to make.",
        "Your hand went to the card of capacity rather than arrival, and for a question worded the way yours is, that is worth noticing.",
        "The Magician does not show me somebody walking toward you, and I will not invent a person to hand you — what it marks instead is that the part of you that knows how to love was not buried with what you lost. That capacity is not a spare part and it is not disloyalty. It is the same thing you spent on him, still whole, and its being whole is evidence of what you had rather than a debt against it. You do not owe anyone an accounting for still having it.",
        "Let me look closer at what you have carried through intact…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the life held still while everything inside it rearranges.",
        "You reached for the card of the suspended season, and that is where you have been living rather than anywhere you chose to be.",
        "The Hanged Man makes no forecast of who or when, and I will not read one into it — what it offers instead is a season paused rather than concluded, and there is a difference between a life that has stopped and a life whose pieces are not yet back in any final place. You have been taking the pause itself as your answer. It is not an answer; it is the part that comes before one, and none of it obliges you to know yet what you want or when you should want it.",
        "Let me look closer at what is still being rearranged…",
      ],
      c: [
        "You turned the Fool, dear — the card of the beginning that carries nothing forward with it.",
        "That is not random; your hand found the card of the fresh start, and the word 'new' in your own question has been sitting heavier than you have let on.",
        "The Fool points me to no one and I will not put a face on it — what it says is that anything beginning here would begin as itself, not as a seat left empty for somebody to fill. That matters, because the fear underneath a question like yours is rarely whether such a person exists; it is whether loving again would mean replacing. It would not. A beginning does not overwrite what came before it — it has no such power, and neither would anyone you might one day meet.",
        "Let me look closer at what the word 'new' has been costing you…",
      ],
    },
    // 'Is there still a soulmate out there for me?' — THE WORD "STILL". She is not asking
    // where someone is; she is asking whether her one was already issued and already spent.
    // The read answers the PREMISE, never the location, and never the timing.
    'cards-soulmate-out-there': {
      a: [
        "You turned the Magician, dear — the card of what has not been used up.",
        "Your hand found the card of the thing still held rather than spent, and the whole weight of your question sits on that one word, 'still'.",
        "The Magician stands nobody out there where I can see them, and I will not describe a person I cannot see — what it sets before me is the premise you arrived carrying: that a soul is issued one, and that yours has been drawn already. That is the part I can honestly speak to. What you gave was real, and it was never an allowance running down. The capacity to love is not a quantity that empties, and having loved once completely is not the same as having used it up.",
        "Let me look closer at the premise you have been carrying…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question left hanging with nobody to answer it.",
        "You reached for the card of what stays suspended, and you have been holding this one suspended a long while now.",
        "The Hanged Man gives no place and no timing, and I will not manufacture either for you — what it marks is that you have been asking this into a silence, with no one to say anything back. A question asked alone for long enough begins to sound as though it has already been answered, and it has not been. What you have been carrying is not a verdict about your future; it is the silence around the question. Those are not the same weight, even though they sit in the very same place.",
        "Let me look closer at the silence you have been asking into…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that has not been walked yet.",
        "That is not random; you reached for the card of what remains unwritten, at exactly the moment you had begun to suspect your part in it was already finished.",
        "The Fool holds no map with anyone marked on it, and I would be inventing if I told you otherwise — what it shows is a road genuinely unwalked, not one closed off behind you. There is a difference between not knowing what lies ahead and knowing there is nothing there, and grief blurs the two until they are indistinguishable from the inside. You have been living as though the second were settled fact. Nothing in this card makes it so.",
        "Let me look closer at the road you have been treating as closed…",
      ],
    },
    // 'Am I ready to love again after losing him?' — THE VERDICT ON HER, and the sharpest
    // hook in the family. She is asking a stranger to grade her grief. BOTH answers do
    // damage: "you are ready" prescribes a timetable to a bereaved woman, and "not yet"
    // does the same thing wearing concern. The finding: she is asking for permission, and
    // permission was never in anyone else's keeping — which is why waiting has not worked.
    'cards-ready-to-love': {
      a: [
        "You turned the Magician, dear — the card of the thing nobody else can do on your behalf.",
        "Your hand went to the card of what only its owner may decide, and you came here asking to be told.",
        "The Magician will not grade you ready and it will not grade you unready, and I am not going to do it in its place — what it shows me is that readiness is not a mark somebody awards you once you have grieved correctly. There is no standard here that you are passing or failing, and no one who has met you is qualified to set one. You have been asking whether you are allowed. The permission you have been waiting on was never in anyone else's keeping, which is precisely why waiting for it has not worked.",
        "Let me look closer at the permission you have been waiting for…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing held between two states and belonging fully to neither.",
        "You reached for the card of the in-between, and that describes where you are more truly than either answer you came here for.",
        "The Hanged Man will not choose between the two answers you came for, and I am not going to choose between them either — a person is not ready or unready the way a door is open or shut. You can want company and want him back in the very same hour, and neither one cancels the other out. Being in both at once is not confusion, and it is not evidence that you have failed to heal; it is what carrying this actually looks like from inside. Being made to pick one has cost you more than the not-knowing ever did.",
        "Let me look closer at the two things you have been holding at once…",
      ],
      c: [
        "You turned the Fool, dear — the card of the step taken before the ground is ever certain.",
        "That is not random; your hand found the card of the beginning made without guarantees, and a guarantee is the thing you have been waiting to be given.",
        "The Fool issues no verdict on your readiness and I will not stand one in for it — what it observes is that nobody has ever been certain in advance, and that the certainty you are waiting to feel does not arrive ahead of time to give permission. That is not a push, and there is no timetable here you are behind on. It only means the sign you have been watching for will not come as a feeling of being finished, because that feeling is not how any of this works, for you or for anyone.",
        "Let me look closer at the sign you have been waiting to feel…",
      ],
    },
    // ── Soulmate-where (2026-08-07) ──────────────────────────────────────────
    // The SEEKING half of the soulmate topic, against soulmate-after-loss's bereaved half.
    // Nobody has died and no specific man exists, so the hopeful yes MAY be affirmed here —
    // but three bans apply that no other family carries, and all three are pinned by
    // tests/tarot-soulmate-where-copy.test.ts:
    //
    //   1. 🔴 LOCATION. No place, no direction, no proximity, no "someone you already
    //      know", no setting, no describing a person. Until this family there was no such
    //      guard anywhere — the self-frame clause withholds "a name, a date, or exactly
    //      who" and simply omits WHERE. The harm is not vagueness; it is specificity that
    //      lands on a real identifiable person she can then go and act on.
    //   2. STRATEGY. No going out more, no looking elsewhere, no moving, no apps, no
    //      putting yourself out there, no working on yourself first. That is coaching, and
    //      on cards-not-found-yet it is also half the accusation the read has to refuse.
    //   3. HER FAULT. Nothing about blocks, walls, standards, not being ready, self-love
    //      first, or manifesting harder. She arrives already holding it.
    //
    // ⚠ And they must not restate the incumbent. 'cards-soulmate' already lands "nearer
    // than the waiting has let her believe" — so 'cards-soulmate-closer' refuses the
    // proximity claim entirely and reads the bracing instead.
    //
    // 'Where is my soulmate right now?' — THE PLACE REQUEST. The finding: the not-yet is
    // not a distance, and she has been treating an absence as a destination she keeps
    // failing to reach.
    'cards-where-soulmate': {
      a: [
        "You turned the Magician, dear — the card of the thing that gets built rather than located.",
        "Your hand went past every card that would have pointed somewhere and settled on the one about making.",
        "I could name you a place and you would carry it about with you for a year, and it would be invention rather than sight — there is no geography in the Magician and I will not pretend there is. What it does put a finger on is the shape your question has taken: you have come to hold this as a matter of distance, as though a person were standing somewhere particular and you were failing to arrive. A love not yet met is not a destination you have been missing your way to, and nothing here is being kept from you by miles.",
        "Let me look closer at the distance you have been imagining…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the search that has to be set down before it will answer.",
        "You went to the card of the held breath, and that is nearer to how you have been carrying this than you may realise.",
        "There is no map in the Hanged Man, nor will I sketch one on its behalf — it speaks to your posture rather than to anybody's position. You have been scanning, and scanning wears at a person in a way ordinary living does not; every room you walk into enters your notice as a possibility to be weighed. That is not a flaw in you. It is what anyone does once they have been told the answer is out there to be found. But a thing that has not happened yet is not hiding from you.",
        "Let me look closer at what the searching has been costing you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road whose ending is not printed anywhere on it.",
        "You found the card of the open journey at the very moment you most wanted a fixed point marked on one.",
        "The Fool gives no coordinates and I would be manufacturing them if I offered any — what it holds instead is that a beginning has no address before it begins. You have been asking where, because where is the only version of this question that feels like something a person could act on. That was reasonable, and it has still been the wrong shape for what you actually want to know. Not-yet and somewhere-else are not the same thing, and you have been treating them as a single article.",
        "Let me look closer at the question underneath the where…",
      ],
    },
    // 'Is my soulmate closer than I think?' — THE PROXIMITY REQUEST, and a deliberate copy
    // test against the live cards-soulmate, whose read already says exactly this. So the
    // finding here is NOT proximity: it is the bracing. She has been managing her own hope
    // downward to stay safe, and that guarding is what any felt "distance" is made of.
    'cards-soulmate-closer': {
      a: [
        "You turned the Magician, dear — the card of the hand that has taught itself to hold something lightly.",
        "Your fingers chose the card of measured effort, and it is the measuring in this that is worth naming.",
        "Nearness is not a figure the Magician will quote you, and I will not quote one in its place; no honest reading hands a person a distance. What sits plainly in it is that you have spent a long while managing your own hope downward — keeping what you expect low enough that a disappointment could not reach you. That was never foolishness. It was sensible and it worked. It also means whatever you feel about how far off this is tells you about the guarding, not about the thing itself.",
        "Let me look closer at the guarding you have been doing…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of someone who has stopped letting themselves lean forward.",
        "You reached for the card of held-back weight, and holding back is the very movement your question is made of.",
        "I will not put a nearness on this, and the Hanged Man holds out no such figure — what it catches is the flinch. You asked whether it might be closer than you think while already braced for the answer to be no, because bracing has been the cheaper thing to do. Anyone who has waited a long while learns to approach their own hopes sideways. None of that is evidence about timing. It is evidence of what it has cost you to go on wanting this out loud.",
        "Let me look closer at what it has cost to keep wanting it…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one willing to walk without the ending in hand.",
        "That card surfaced under a question about how near, which is the single thing the Fool never counts.",
        "The Fool has no notion of near or far and I will not lend it one — what it recognises is that you asked at all. A question like yours is not really a request for a measurement; it is a person checking whether they are still permitted to expect anything. You have been rationing that quietly. The wanting has stayed intact through a long stretch in which it would have been far easier to set it down, and that is what is in front of me rather than any distance.",
        "Let me look closer at the wanting you have kept intact…",
      ],
    },
    // 'Why haven't I found my soulmate where I am?' — THE CULPRIT REQUEST. The question
    // offers exactly two candidates, herself and her circumstances, and both are forbidden.
    // The finding: an absence is not always caused, so there is no fault to hand her.
    // 🔴 Operator call 2026-08-07: "where I am" read as GEOGRAPHY first, because the
    // dangerous answer there is strategy she could act on (move, look elsewhere). A read
    // that declines to blame her surroundings covers the life-stage reading too.
    'cards-not-found-yet': {
      a: [
        "You turned the Magician, dear — the card of the worker who is not the reason the work is unfinished.",
        "Your hand landed on the card of effort, under a question that has been quietly accusing you of not making enough of it.",
        "The Magician hands down no reason, and I decline to invent one merely to satisfy the question — there is no fault to find here, not in you and not in the place you live. You have been asking why as though a why must exist and must name somebody, and your question offers only two candidates: yourself, or your circumstances. Neither is guilty of this. A thing that has not happened is not a verdict on the person waiting for it, and it is not a verdict on the town either.",
        "Let me look closer at the fault you have been assuming…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question that has hung upside down for too long.",
        "You went to the card of the inverted view, and you have been looking at this from underneath for a good while.",
        "I am not going to tell you what to change, and that is not the Hanged Man's trade either — nothing about where to go or who to become. What it exposes is the inversion itself: your question begins from the assumption that an absence has to have been caused, and from that starting point every road leads back to something being wrong with you. Absence is not always caused. Some of it is simply not yet, and not yet carries no explanation that would make sense of anything even if I handed it to you.",
        "Let me look closer at the assumption you started from…",
      ],
      c: [
        "You turned the Fool, dear — the card of the traveller who has not arrived and is not lost.",
        "That is the card of the road still being walked, and you have begun reading your own place on it as failure.",
        "The Fool refuses to call this a wrong turning and so do I — what it separates out is the difference between not having arrived and having gone astray. You have collapsed the two into one. Living somewhere this has not yet happened does not make it the wrong place, and being the person it has not yet happened to does not make you the wrong person. No correction is being asked of you here, whatever the question has been implying to you at night.",
        "Let me look closer at what you have been calling a wrong turning…",
      ],
    },
    // ── Loneliness (2026-08-07) ──────────────────────────────────────────────
    // The only family with NO man in it at all — not lost, not left, not sought. The
    // subject is her life and whether it stays as it is. That makes it the closest angle on
    // the funnel to the crisis surface, and the reads carry bans nothing else does:
    //
    //   1. 🔴 FATE, BOTH WAYS. Nothing is "meant". Not meant to be alone, not meant for
    //      someone. 'cards-meant-alone' asks for a verdict on her NATURE, and "some people
    //      are meant to be alone" is the most harmful sentence this funnel could produce.
    //      The read refuses the premise that anything is being assigned to anyone.
    //   2. 🔴 THE FOREVER VERDICT, BOTH WAYS. Never rule that she will be alone; never
    //      promise she will not. Same structure as cards-really-over — one answer is a life
    //      sentence from a stranger, the other is a promise the funnel cannot keep.
    //   3. PATHOLOGISING. No negativity, giving up, self-sabotage, blocks, "you attract
    //      what you are", manifesting. She arrives having already been told all of it.
    //   4. STRATEGY. No get out more, no work on yourself, no stop looking.
    //   5. ⚠ PRESUMING HER HISTORY. Audience-agnostic: never "after what you have been
    //      through" (assumes a loss) and never "you have never had this" (assumes she
    //      hasn't). The ad does not sort her, so the read must not either.
    //
    // 'Will I be alone forever?' — THE ABSOLUTE. The finding: "forever" is the word
    // exhaustion reaches for, a description of weight rather than a forecast — and saying
    // it is not defeatism, it is an accurate report.
    'cards-alone-forever': {
      a: [
        "You turned the Magician, dear — the card of hands that are still working, whatever the hour.",
        "Of the three you might have drawn, you took the one about ongoing labour, and labour is quietly what this has become for you.",
        "Nobody's forever exists anywhere a card could read it, and I would not hand you one even if it did — what the Magician carries here is the weight rather than the length. You have begun saying 'forever' because that is the word exhaustion reaches for once it has carried something a long while without relief. It is not a prediction you have made, and it is not you being defeatist. It is an accurate report of how heavy this has got, and those two things are mistaken for one another constantly, usually by people who have not had to carry it.",
        "Let me look closer at what this has actually been weighing…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of time that has stopped moving at its usual speed.",
        "It was the card of the slowed hour your fingers settled on, and slowness has been doing a great deal of the damage.",
        "Length is the one thing the Hanged Man never measures, and no honest reading measures it either. What it registers is that your sense of time has been altered by going without — a long enough stretch rearranges how anything feels, until a year of it and the whole rest of a life become indistinguishable from the inside. None of that is a defect in how you think. It is what endurance does to a clock, and you have been judging your entire future from a measurement taken while tired.",
        "Let me look closer at the measurement you have been using…",
      ],
      c: [
        "You turned the Fool, dear — the card of ground that has not been walked on yet.",
        "Under a question about always, up came the card that knows nothing whatever of always.",
        "The Fool holds no forever and cannot be made to hold one; I will not tell you this ends and I will not tell you it does not, because neither sentence would be worth the breath it took. What sits in it instead is that 'forever' is a shape the mind puts around a thing while that thing is still happening, and nobody has ever managed to see out of the middle of something. You are not being asked to believe anything cheerful here. You are being told that the view from where you are standing is not the view.",
        "Let me look closer at the view you have been taking for the whole of it…",
      ],
    },
    // 'Am I meant to be alone?' — THE FATE CLAIM, and the sharpest hook on the funnel. She
    // is asking for a ruling on her nature. The finding: 'meant' requires somebody to have
    // decided, and nobody is assigning anyone anything — so there is no verdict to appeal.
    'cards-meant-alone': {
      a: [
        "You turned the Magician, dear — the card of the maker, which is a different thing entirely from the made.",
        "The card that came up under your question is the one about authorship, and authorship is precisely what your question assumes.",
        "There is no one assigning you a part and the Magician does not hand out roles — I will not tell you that you are meant for solitude and I will not tell you that you are meant for company, because 'meant' would require somebody to have decided, and nothing has decided anything about you. Your question quietly supposes that a circumstance is a designation. It is not one. What has happened to you so far is not an instruction about what you are for.",
        "Let me look closer at the instruction you believe you were given…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing seen from below and mistaken for the whole.",
        "Yours was the card of the reversed picture, and this question has sat reversed in you a long time.",
        "No fate is written in the Hanged Man, and I would not read one out even if it were — what it turns over is the direction of your question. You have been asking whether you were singled out. Nobody is singled out, because nobody is being assigned, and that is a colder comfort than being told you are destined for something lovely. It is also the true one. There is no ruling on you here to be appealed against, because no ruling was ever entered.",
        "Let me look closer at the ruling you believe was entered…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who has been handed no part to play.",
        "You drew the card with no script on it at the very moment you had begun to believe yours was already written.",
        "The Fool refuses your premise outright and I refuse it alongside the card — 'meant to be' asks for an author, and there is nobody sitting over your life issuing findings about your worth. Whatever you have been reading as a sentence passed upon you is a stretch of circumstance, and circumstance says nothing whatever about a person. None of your being on your own has been a judgement. You have been carrying it as though it were one, which is a far heavier thing than the circumstance itself.",
        "Let me look closer at the sentence you have been reading over yourself…",
      ],
    },
    // 'Is there really someone out there for me?' — THE PROOF REQUEST. 🔴 Its finding had to
    // dodge two neighbours: 'cards-soulmate-out-there' (the one-chance premise) and
    // 'cards-still-a-chance' (hope is not a failure of realism). So this one reads the
    // EPISTEMICS — the word is "really", and she is asking to be told something she can
    // actually believe, having been handed comfort every other time she raised it.
    'cards-someone-for-me': {
      a: [
        "You turned the Magician, dear — the card of the honest craftsman, who will not sell you a thing that is not there.",
        "The card that answered you is the one about straight dealing, and straight dealing is what your question is actually after.",
        "No card counts people, and it would be a lie to pretend otherwise — what the Magician insists on is the difference between an answer and a comfort. You said 'really', and that word is the whole of it: you have been reassured so often by people who love you that reassurance has stopped landing anywhere. You did not come here for another kind voice. You came looking for somebody with no reason at all to be kind to you, and I would only be joining the queue of comforters if I simply told you yes.",
        "Let me look closer at what you have been handed instead of an answer…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question other people have already answered on your behalf.",
        "You settled on the card of the held position, and you have been held in this one by other people's certainty quite as much as by your own doubt.",
        "The Hanged Man will not count for you either, and no reading honestly can. What it suspends is the pressure you have been under to feel a particular way about this. Everyone near you has an opinion on your outlook — too negative, too fussy, too quick to give up — so you have been managing their view of your hope on top of carrying the thing itself. That second load was never yours. What you asked for was the truth, and that is not the same request as wanting to be cheered up.",
        "Let me look closer at the second load you have been carrying…",
      ],
      c: [
        "You turned the Fool, dear — the card of what has not been counted and cannot be.",
        "Under a question asking for proof, up came the one card that has never dealt in proof at all.",
        "Nothing here is a headcount and the Fool would not give you one — what it stands on is that an unknown is not the same as a negative, though the two wear the same face once a person is tired enough. You have started reading the absence of proof as proof of absence. Those are different things, and the difference is not a technicality; it is the entire space you have been living inside. Doubting is not the same as knowing, and you have been treating your doubt as though it had gone and done the research.",
        "Let me look closer at what your doubt has been standing in for…",
      ],
    },
    // ── Fidelity (2026-08-07) ────────────────────────────────────────────────
    // FOUR landers. Decode-him in FORM — a real man, read as a tendency, never a verdict —
    // but commissioned as a COMPLIANCE exercise: the same question the live 'cards-cheating'
    // lander asks, without the word the ad platform flags.
    //
    // 🔴 THE FLAGGED WORD APPEARS NOWHERE BELOW, and that is load-bearing rather than
    // stylistic: the platform reviews landing pages, so a compliant ad pointing at a page
    // that says it in beat 3 defeats the entire commission. Banned here and in the
    // generated prompt path: cheat / cheating / cheater / affair / infidelity. "Faithful"
    // and "loyal" are fine — the operator's own headlines use them.
    //
    // On top of the standing tendency-never-verdict rule, four bans, all pinned by
    // tests/tarot-fidelity-copy.test.ts:
    //   1. NO THIRD PERSON, ASSERTED OR DENIED. "There is someone else" accuses a real man
    //      of a real act she cannot check; "there is nobody" is a reassurance the funnel has
    //      no standing to give, and reassurance is the documented failure on this wound.
    //   2. NO SURVEILLANCE. No checking his phone, his messages, his location, no watching
    //      him, no testing him. That is instruction to gather evidence, not a reading — and
    //      it is the single most available answer to these questions elsewhere.
    //   3. NO PARANOIA FRAMING, in either direction. Never call her suspicious, insecure or
    //      paranoid — and never use the word to reassure her either, because raising it
    //      plants it. ⚠ Note the live 'cards-cheating' read already lands "not paranoia to
    //      apologize for". That is the INCUMBENT'S finding; none of these may restate it.
    //   4. NO EXCUSING HIM. "He is just busy", "men are like that" — an excuse is a verdict
    //      wearing a kinder face, same as on the pulling-away family.
    //
    // 'Is there someone else?' — THE EXPLANATION. She has been handed a change with no
    // account of it, and "someone else" is the first explanation that makes the pieces fit.
    // The read rules on neither, and finds that she was left to author the explanation alone.
    'cards-someone-else': {
      a: [
        "You turned the Magician, dear — the card of the mind that will build an explanation out of whatever it is given.",
        "Your hand chose the card of construction, and construction is what you have been doing alone, night after night.",
        "I will not name another person for you, and I will not swear to you there is none; a card cannot see into a life it has never been shown, and anyone claiming otherwise is inventing. What the Magician does hold up is this: something changed, you were handed no account of it, and a mind given a gap will always build something to fill it. The explanation you arrived with is the shape of that building work. It is not evidence, nor is it you being unreasonable — it is what happens when a person is left to work out alone what they should simply have been told.",
        "Let me look closer at the gap you were left to fill…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the account that was never delivered.",
        "You reached for the card of the thing left owing, and something here has been owed to you a long while.",
        "The Hanged Man passes no ruling on anyone and I will pass none on your behalf — what it suspends is the question of whether you were entitled to an explanation, and you were. Something shifted and nobody sat you down about it. You have been carrying two separate weights and treating them as one: the change itself, and the silence around it. The second is doing most of the damage, and it is the one that could have been lifted at any point by somebody simply speaking.",
        "Let me look closer at the second weight you have been carrying…",
      ],
      c: [
        "You turned the Fool, dear — the card of the story that has not been finished by anyone.",
        "That is not chance; you found the card of the unwritten ending at a moment you had already written one yourself.",
        "The Fool names no one and neither will I — it will not confirm your story and it will not overwrite it with a kinder one. What it shows me is that the ending you have been rehearsing was authored by you, in the absence of anybody else offering one. That is not a delusion and it is not proof; it is a draft, and you have been treating a draft as a finding because nothing truer was ever put in front of you.",
        "Let me look closer at the draft you have been living inside…",
      ],
    },
    // 'Is he talking to someone else?' — THE ATTENTION. The most evidence-adjacent of the
    // four, so the surveillance ban does the heaviest lifting. The finding: she should not
    // have to produce proof before she is allowed to mind.
    'cards-talking-someone': {
      a: [
        "You turned the Magician, dear — the card of where a person decides to put their effort.",
        "Of the three, your hand went to the one about direction, and direction is exactly what you have been watching.",
        "There is nothing in the Magician about anybody's messages, and I will not go looking on your behalf or send you looking either — what it marks is the direction of his attention, which is a thing you have felt rather than a thing you must prove. Attention is finite. When some of it goes elsewhere, the person receiving less notices first and usually says nothing, because saying it out loud feels like an accusation they have not earned the right to make. You have been waiting to be entitled to mind. You were entitled from the moment you noticed.",
        "Let me look closer at what you have been waiting to be entitled to…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the half-turned face.",
        "You settled on the card of the divided moment, and division is the precise shape of what you have been living with.",
        "The Hanged Man holds no inventory of anyone's conversations, and I would not invent one — it reads the split rather than its cause. Something of his is elsewhere while he is right there, and you have been asked, without anyone ever asking out loud, to behave as though you had not noticed. That is a strange and lonely job to be handed. Whichever way the reason eventually falls, being made to pretend you cannot see it is its own separate injury.",
        "Let me look closer at the job you were quietly handed…",
      ],
      c: [
        "You turned the Fool, dear — the card of the open door nobody will speak about.",
        "You drew the card of the unnamed thing at a question you have not been able to name out loud yourself.",
        "The Fool identifies nobody and I will not fill the blank in for it — what it will attest to is that something here has gone unnamed, and unnamed things grow heavier rather than lighter. You have been holding a question you cannot ask without it sounding like a charge, and so you have not asked it, and so it has stayed. Nothing about that is you being difficult. A person should be able to ask a plain question of someone they love and get a plain answer back.",
        "Let me look closer at the question you have not been able to ask…",
      ],
    },
    // 'Is he being faithful to me?' — THE SUMMARY JUDGMENT. Both answers forbidden. The
    // finding: she is really asking whether she can stop bracing, and she has not been able
    // to — which is a fact about her life rather than a ruling on him.
    'cards-faithful': {
      a: [
        "You turned the Magician, dear — the card of the thing tested by doing rather than by declaring.",
        "The card that came to your hand is the one about practice, and practice is a longer question than the one you asked.",
        "No card issues a character reference, and I would be overstepping badly if I read one out of this — I will not vouch for him and I will not convict him, because a summary judgment on a whole person is not mine to hand down and it is not the Magician's either. What sits in front of me is nearer and more useful: you asked because you have not been able to put the question down. Not being able to rest is a fact about your life, whatever the answer turns out to be, and it is the fact I can actually speak to.",
        "Let me look closer at why you have not been able to put it down…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the verdict that never arrives.",
        "Yours was the card of the thing left pending, and pending is where this question has lived in you.",
        "The Hanged Man declines the reassurance you came for, and declines its reverse with exactly the same firmness; that refusal is the honest part of this rather than a dodge. A word like the one in your question describes a whole person across a whole stretch of time, and nobody standing outside a life gets to certify such a thing. What I can see is that you have been left hanging in the asking, and being held there drains something out of you that neither a clear yes nor a clear no ever would.",
        "Let me look closer at what the suspension has taken out of you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the thing that is chosen again each day rather than settled once.",
        "You found the card of the fresh step under a question that wanted a permanent answer, and that mismatch is worth sitting with.",
        "The Fool declines to stamp anybody and I decline alongside it — what it draws attention to is that the quality you are asking about is not a fixed property somebody either has or lacks. It is chosen, repeatedly, by people who could choose otherwise. That is why no reading can hand you a guarantee, and why the reassurance you have been hoping for would have been worth very little even if I had given it to you. What you actually want is to be able to trust your own footing again.",
        "Let me look closer at the footing you have been missing…",
      ],
    },
    // 'Is he loyal to only me?' — THE WORD "ONLY". Not about a rival: about whether what she
    // receives is the whole of what he has. The finding: she has been taking a share and
    // calling it the whole, and has stopped noticing she was doing it.
    'cards-loyal': {
      a: [
        "You turned the Magician, dear — the card of what a person actually spends, as against what they say they have.",
        "Your hand found the card of the ledger, and there is a reckoning in your question that you have not let yourself do.",
        "I will not tell you where anything of his goes, and no card can produce that accounting — what the Magician turns over is your own word, the small one: 'only'. That word is not about a rival. It is about whether what reaches you is the whole of what he has, and you have been quietly answering that for yourself for some time by accepting a portion and calling it the amount. Nothing about noticing the difference makes you demanding.",
        "Let me look closer at the portion you have been calling the whole…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing held partly back.",
        "You reached for the card of the withheld share, and a share is precisely what your question is about.",
        "The Hanged Man keeps no roster of anybody, and naming a name would simply be me making one up — what it suspends is the assumption that this is a question about somebody else at all. It may not be. A person can be entirely where they are supposed to be and still keep a portion of themselves out of reach, and being given most of someone is a particular kind of lonely, because there is nothing in it you are allowed to complain about. You have not been imagining the missing part.",
        "Let me look closer at the part that has been kept back…",
      ],
      c: [
        "You turned the Fool, dear — the card of the thing given whole or not given at all.",
        "That is not chance; you drew the card of the undivided at the exact question where you have suspected division.",
        "The Fool counts nobody and I will not start counting on its behalf — what it holds is a standard rather than a finding. What you asked for in that question is not extravagant: to be the whole of somebody's answer rather than most of it. You have been treating that as a large thing to want, and adjusting yourself downward to fit what you were actually receiving. The adjusting is the part I want to look at, because you have stopped noticing you are doing it.",
        "Let me look closer at the adjusting you have stopped noticing…",
      ],
    },
    // ── Missing-him (2026-08-10) ───────────────────────────────────────────────
    // 🔴 THE TIMEFRAME IS THE WHOLE DISCIPLINE HERE. Two of these three headlines ask
    // "will this ever…", which is a request for a date, and the reads must refuse it
    // without refusing HER. No number, no season, no "half the length of the
    // relationship", no "you will know when it lifts" — and equally no "it never fully
    // goes", which is the same forbidden ruling pointed the other way.
    //
    // 🔴 NEVER PRESUME HOW HE CAME TO BE GONE. A bereaved woman and a woman who was left
    // both type "I miss him so much". Nothing in these nine reads names a breakup, a
    // decision he made, a death, or a body — and nothing speaks FOR him, in case he is
    // dead, because this family runs under the decode-him frame which does not ban
    // mediumship (that ban is carried per-hook in TAROT_HOOK_TENDENCY).
    //
    // ⚠ Held apart from `healing`, the nearest live family, at the level of the finding:
    // healing reads why the THINKING persists; these read what the ACHE is made of.
    'cards-stop-hurting': {
      a: [
        "You turned the Magician, dear — the card of effort that does not look like effort.",
        "Three were face down and the one you lifted was the card of work being done, which is nearer to your question than it sounds.",
        "You have been describing this as something happening to you, and I want to put it differently — not to make it lighter, but because it is not accurate. Some part of you has gone on keeping his place laid. That is not damage being done to you; it is labour you are performing, quietly, every day, and it is the reason you are so tired. I am not going to tell you to stop doing it. I am telling you that the exhaustion is earned rather than a sign you are handling this badly.",
        "Let me look closer at the work you have not been counting as work…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing that has not finished arriving.",
        "Of the three, your fingers chose the one that refuses to be hurried, at the exact moment you asked how much longer.",
        "You asked when it stops, and I will not give you a date — not a season, not a number of months, and you should be wary of anyone who does, because they are guessing and calling it sight. What the Hanged Man turns over is the shape you have assumed this has. You have been treating it as a stretch to be served, as though the hurt were one long thing wearing itself out. It has not behaved that way, and that is not you doing it wrong. It arrives in instalments, because parts of you are still being told, one at a time, and each part hears it new.",
        "Let me look closer at the part of you that has not been told yet…",
      ],
      c: [
        "You turned the Fool, dear — the card of the page nothing has been written on.",
        "Under a question about how much of your life this will take, up came the card that keeps no accounts at all.",
        "There is an arithmetic hidden in what you asked, and the Fool will not do it. You wanted me to weigh this against everything still in front of you and tell you the proportion. I cannot, and I would not trust the answer if I could. What I will say is that the size of the hurt is the correct size — it is measuring something that was really there, and a smaller ache would have meant less, not more health. What it is not is the full inventory of what is ahead of you. Those are two separate claims, and only the second one is in dispute.",
        "Let me look closer at the inventory you have been taking…",
      ],
    },
    // 'Will I ever stop missing him?' — THE FOREVER QUESTION, and both poles are banned.
    // "You always will" is a life sentence issued by a stranger; "it will pass" is a promise
    // the funnel cannot keep. The finding: she has been treating the missing as a condition
    // she ought to be able to cure by decision, and grading her character on the failure.
    'cards-stop-missing': {
      a: [
        "You turned the Magician, dear — the card of what intention can reach, and what it cannot.",
        "The card of the will came up under a question you have been trying to answer by force of it.",
        "You have been attempting to decide to stop. And when the deciding did not work you took that as information about your character, which is the part I want to correct. Intention is a real instrument and yours is in good order — it is simply not the instrument this is kept in. A person can resolve to stop saying a name out loud and hold to it. Nobody can resolve to stop missing. You have been failing at something that was never on offer, and then marking yourself down for it.",
        "Let me look closer at the mark you have been giving yourself…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing that changes position without changing substance.",
        "You reached past two others for the card of the altered angle, which is what your question needs more than an answer.",
        "The word in your question is 'ever', and it asks me to rule on the whole length of your life. I will not — not to tell you it lasts and not to tell you it lifts, because both of those are strangers' verdicts on a life that is yours. What the Hanged Man does turn over is the assumption underneath it. You have been treating the missing as an intruder that got in and has to be put out. It is not foreign to you. It is the same feeling you already had for him, in a position where it has nowhere to be delivered. That is a harder thing to be rid of, and a much less shameful thing to be carrying.",
        "Let me look closer at what has nowhere to go…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who sets off without having finished.",
        "That is worth noticing: the card of the unfinished beginning, drawn by someone waiting to be finished.",
        "You have been holding yourself to a sequence — that this has to be completed before anything else is allowed to open. The Fool does not require a clean ledger before it moves, and neither, it turns out, does a life. Missing him and beginning something can sit in the same person on the same day, and neither one makes the other a lie. I am not telling you it is time for anything. I am telling you that you have been waiting for a permission that was never being withheld by anyone but you.",
        "Let me look closer at the permission you have been waiting for…",
      ],
    },
    // ⚠ The heaviest of the three and the sibling of 'cards-who-hurt-me'. "After everything"
    // means after what he did — she has NAMED a harm, so minimising it abandons her, and
    // pronouncing on him is the forbidden verdict. The third pull is the real question
    // underneath: she is asking what is wrong with her. Nothing may land as weakness,
    // naivety, low self-worth, or an attachment disorder.
    'cards-still-miss-him': {
      a: [
        "You turned the Magician, dear — the card of the conclusion already reached.",
        "The card of clear intent came up under a question in which you have begun to doubt your own.",
        "You are treating the missing as evidence against yourself — as though still feeling it means you never really meant what you worked out. It does not mean that. What you concluded, you concluded, and nothing you have felt since has withdrawn it. Feeling and judgement are two separate instruments and they have never run at the same speed; one of them lagging is not the other one being overturned. You have not gone back on anything, and you are not being disloyal to yourself by aching.",
        "Let me look closer at the case you have been building against yourself…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of two things that are true at once.",
        "Of the three you could have taken, you took the one that declines to simplify, and simplifying is what you have been asked to do.",
        "Your question reads the missing as a fault that needs explaining. Turn it over and it is not one. You are not missing what was done to you — that stands exactly where you put it, and I will not talk you out of a word of it. You are missing what was also there, and both of those were real, in the same stretch of your life. People find that unbearable to hold, so they press you to flatten it in one direction to prove you have understood. Missing the good hours is not a pardon you have issued for the rest of it. You are allowed to know both things.",
        "Let me look closer at the thing you have been asked to flatten…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road with no markers laid along it.",
        "You drew the card that measures no progress at all, having come here to be told how little you have made.",
        "'After everything' is you holding yourself to a timetable — as though a certain weight of hurt ought to have bought a certain amount of immunity by now, and you are overdue. There is no such rate of exchange. Nobody set that schedule; you absorbed it from people describing how this was meant to go for them. The Fool grades nothing. That you still miss him on a given day is not a mark against your judgement, not a sign you have learned nothing, and not evidence about what you think you are worth.",
        "Let me look closer at the timetable you never agreed to…",
      ],
    },
    // ── Why-he-left (2026-08-11) ───────────────────────────────────────────────
    // 🔴 THE MOTIVE IS THE WHOLE DISCIPLINE HERE. All three headlines ask why a man did
    // something he never explained, and the shared decode-him guard bans four claims that
    // do not include this one. Nothing in these nine reads may state, imply or hint at a
    // reason: not that he was frightened, overwhelmed, immature, seeing someone, punishing
    // her, protecting her, or unable to cope. The refusal is the reading, and it is said
    // out loud rather than merely observed.
    //
    // 🔴 NEVER PRESUME HE CHOSE IT. A man who goes silent may have died, been taken ill or
    // be in trouble; "ghosted" is HER account of the silence, not a fact in evidence. The
    // reads work with THE SILENCE, which is the only thing actually known — the word
    // "quiet" does the load-bearing work, and no read names a decision, a walking-out, a
    // death or a body. The mediumship ban of the after-loss family applies for the same
    // reason it does in `missing-him`: this family runs under the decode-him frame.
    //
    // 🔴 NO TACTIC, in either direction. "Why did he ghost me" carries the most saturated
    // wrong answer on the internet — reach out once more, send this, check if he read it —
    // and its mirror is just as forbidden: telling her he is gone for good is a prediction.
    // No read instructs her to make contact, to stop trying, or to expect an answer.
    //
    // ⚠ 'cards-not-enough' refuses the COMPARISON rather than scoring it. Answering "yes
    // you were enough" is kind and is still a claim about why he went. The way through is
    // that no measurement was ever taken, so there is no result on her to read — which
    // affirms her without issuing a verdict on him.
    'cards-left-without-word': {
      a: [
        "You turned the Magician, dear — the card of the work being done by one pair of hands.",
        "Three lay face down and you lifted the card of effort, under a question you have been calling a thing that happened to you.",
        "You have been writing both halves of a conversation. Every explanation you have tried on, every version where it makes sense at last — that is you, composing his side, and it is exhausting in a way that nothing you can point to accounts for. I am not going to hand you the missing half, and I would be inventing it if I did. What I will say is that the tiredness is not you being unable to cope. It is the cost of keeping a conversation open by yourself.",
        "Let me look closer at the half you have been writing…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the sentence that stopped in the middle.",
        "Of the three, your fingers found the one that hangs unfinished, which is the shape of what you were left holding.",
        "You have been treating the quiet as something addressed to you — as though the manner of it were a message about your worth that you ought to be able to decode. Turn it over. Silence is not a text in a code you failed to learn; it carries no content at all, and a person who says nothing has not thereby said something about you. The thing you have been left holding is not an insult you cannot read. It is a sentence that stopped, and stopped sentences ache in a person whether or not anything was meant by them.",
        "Let me look closer at where it stopped…",
      ],
      c: [
        "You turned the Fool, dear — the card of the page with nothing set down on it.",
        "You came asking to be told what it meant, and up came the card that holds no meaning at all.",
        "Here is the thing I will not do, and I want you to hear me refuse it plainly: I will not tell you what was in his head. Nobody sitting where I am sitting can, and anyone who names it for you is filling in a blank to make you feel steadier. The Fool is genuinely blank — that is its whole nature — and so is this. What that leaves you is worse in one way and far better in another. You do not get the reason. You also are not obliged to accept the cruellest one, which is the one you have been living with by default.",
        "Let me look closer at the version you have been assuming…",
      ],
    },
    // ⚠ The finding: a disappearance makes HER the investigator of her own injury. She has
    // to supply the motive, build the case and reach a verdict, with nothing admissible and
    // while being the party who was hurt. The read relieves her of the job rather than
    // doing it for her — doing it for her IS the banned motive.
    'cards-ghosted': {
      a: [
        "You turned the Magician, dear — the card of intent, which is the one thing that leaves no mark behind it.",
        "You reached for the card of the will, in a matter where the will in question was never shown to you.",
        "You have been running an investigation. Rereading the last messages for the tell, dating the change, testing each theory against the evidence — and you have been grading yourself on the fact that it never resolves. It does not resolve because intention is the one thing that leaves nothing behind. You were handed the work of explaining your own injury, with nothing to work from, by a situation that gave you no say in any of it. Failing at that is not stupidity. It was never a solvable job.",
        "Let me look closer at the job you were handed…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question that has to be inverted before it answers.",
        "Past two others you took the one that turns things the other way up, which is what yours needs.",
        "Your question asks what the silence says about you. I am not going to answer it, and the refusal matters more than anything I could invent: a reason built to fit the shape of a hole is a story, and you would build the next year on it. What I can do is turn it the right way up. A silence is information about a silence. You have been reading it as a report on your value, published by someone who never sent you one.",
        "Let me look closer at what has actually been reported…",
      ],
      c: [
        "You turned the Fool, dear — the card that keeps no ledger of who owes what.",
        "The card that settles no accounts came up under the account you have not been able to close.",
        "Something was owed you. Not a reconciliation, not a return — an explanation, the ordinary courtesy of being told, and you did not get it. I want that said plainly, because the people around you have been quietly encouraging you to stop wanting it, as though the wanting were the problem. It is not. The debt is real, and whether it is ever paid is not mine to say; I do not know, and neither does anyone who claims to. But you can put the ledger down without agreeing that nothing was owed.",
        "Let me look closer at what you have been carrying the accounts for…",
      ],
    },
    // ⚠ The heaviest headline on the funnel: she has put her own worth in the question and
    // asked for a ruling. 🔴 NEVER score the comparison in either direction — "you were
    // enough" implies a reason for his going, "you weren't" is unthinkable. Refuse the
    // premise: no measurement was taken, so no result on her exists. NEVER enumerate what
    // she lacked, never say she gave too much or loved too hard, never coach her worth.
    'cards-not-enough': {
      a: [
        "You turned the Magician, dear — the card of what was actually done, as against what it was worth.",
        "Under a question about your value, up came the card that only ever shows the work.",
        "You have asked me to weigh you. I will not, because the scales in your question do not exist. Staying is not a mark awarded to whoever earns it, and going is not a score published about the one left behind. What the Magician will show is the part that is real and on the record: what you were doing in those last weeks was giving, steadily, and you can see it. Whether it was 'enough' is not a verdict that came back. Nothing was being marked.",
        "Let me look closer at what you were actually doing…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the sum that has to be set up the other way round.",
        "Of the three you might have taken, you took the one that reverses things, and there is a reversal owed here.",
        "There is an error in your question, and it is not in you — it is in the setup. You are solving for your own worth using a quantity you were never given, and any answer that comes out the far side is guesswork dressed as arithmetic. People go for reasons that are their own, and some of those reasons are not chosen at all. I will not tell you which was his, and you should be careful with anyone who will. What I can tell you is that his going is not the missing number in a sum about you.",
        "Let me look closer at the sum you have been trying to finish…",
      ],
      c: [
        "You turned the Fool, dear — the card that awards no marks whatsoever.",
        "You came here for a result, and the card that grades nothing is the one that came to your hand.",
        "You have been told, or you have concluded, that there was a line and you came up under it. There was no line. Not one he set, not one you agreed to, and 'not enough' is not a measurement of anything real — it is a phrase that arrives in the small hours and gets mistaken for a finding. Whatever you were, you were it wholly, and that capacity does not shrink because it was not met. The Fool does not report on you. It simply refuses to accept that the question was ever a fair one.",
        "Let me look closer at the line you never agreed to…",
      ],
    },
    // ── SEARCHING (2026-08-11) ────────────────────────────────────────────────
    // 'Am I ever going to stop searching?' — THE DURATION. She is not asking whether
    // she finds someone; she is asking whether the EFFORT ever ends. Refuse the
    // forecast in both directions (loneliness's rule), and read the labour instead.
    // 🔴 The banned answer is the proverb — "it happens when you stop looking" — which
    // is a tactic and a fault attribution at once, and is what she has been told by
    // everyone already.
    'cards-stop-searching': {
      a: [
        "You turned the Magician, dear — the card of hands that are still working, long after the light went.",
        "Of the three you could have taken, yours went to the card about effort, and effort is the part of this nobody has been counting.",
        "Whether the looking ever ends is not something this card knows, in either direction, and you would be right to distrust anybody who claimed it did. What the Magician has picked up instead is the labour. Somewhere along the way this stopped being something you were doing and became something you were performing — arranging yourself, staying open, keeping the hope in working order — and that is work, and it does not stop being work because people insist it should be effortless. You are not tired of love. You are tired of the maintenance.",
        "Let me look closer at what the keeping-going has been costing you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the season that will not turn over.",
        "It was the card of suspended time your hand settled on, and time is doing the damage here rather than anything you have done.",
        "There is no ending in this card to read out to you, and no promise that there is not one; what the Hanged Man registers is that the searching has quietly changed shape on you. It began as looking forward to something. Somewhere it turned into bracing — going anyway, hoping carefully, keeping the disappointment small enough to survive. That is not the same activity any more, though it wears the same name, and doing the second one for years while calling it the first is exhausting in a way that never shows up from outside.",
        "Let me look closer at when the looking turned into bracing…",
      ],
      c: [
        "You turned the Fool, dear — the card of someone still setting out, with the road not yet under them.",
        "Under a question with 'ever' in it, up came the one card that has never heard of ever.",
        "No card carries an ending to hand you, dear, and this one least of all, so I am not going to pretend otherwise in either direction. What the Fool sets down is smaller than a forecast and considerably more use. Whoever is still asking has not actually stopped. You came here tonight and you turned a card, and that is not the conduct of a woman who has abandoned the road — it is the conduct of one who has been walking it long enough to wonder whether she is permitted to sit down a while. Those are two entirely different questions, and only the second one has ever been yours to ask.",
        "Let me look closer at the rest you have not let yourself take…",
      ],
    },
    // 'Why do I keep ending up alone?' — THE CAUSE REQUEST, and the first headline on
    // the funnel to ask for one about HER OWN LIFE.
    // 🔴 REFUSE TO SUPPLY A CAUSE. The frame already bans the crude verdicts (defeatist,
    // closed off, self-sabotaging, "you attract this"). What it does NOT catch is the
    // kind, fluent diagnosis that avoids every one of those words — "you give to people
    // who cannot receive it", "you have never been met at your level", "the timing has
    // never been yours". Those are rulings on her life, delivered as fact, by a stranger
    // reading a card. The finding is that "why" presumes a reason exists to be found,
    // and no honest reading has one; the real question underneath is "is it me", and
    // THAT is what gets answered — by refusing to rule, not by ruling kindly.
    'cards-end-up-alone': {
      a: [
        "You turned the Magician, dear — the card of the maker, which is a very different thing from the made.",
        "Your hand went to the card about authorship, and authorship is exactly what your question has been quietly assuming.",
        "There is no reason here for me to give you, and whatever I produced would be something I had made up on the spot to fit the shape of your question — that is the honest answer, and it is worth more than a kind invention. Your question contains a hidden claim: that there is a single cause, that it is located in you, and that a stranger could read it off a card. The Magician is the card of what a person actually authors, and what anybody authors is their own conduct — never the whole outcome, which needed another person to show up and keep showing up. You have been holding yourself accountable for a result that was never yours alone to produce.",
        "Let me look closer at what you have been holding yourself responsible for…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the picture that has been hanging upside down.",
        "Yours was the card of the inverted view, and this question has been sitting inverted in you for a long while.",
        "The word doing the work in what you asked is 'keep', and it is the one I want to turn the right way up. Separate endings, each with its own reasons and its own other person, get gathered up by the mind and read backwards as a single pattern with a single culprit — and once that is done, the culprit is always the one person present at all of them, which is you. That is not evidence, dear. That is arithmetic performed while tired. The Hanged Man does not tell me why any of them ended, and neither will I, because the truthful answer is that they are not one thing and were never one thing.",
        "Let me look closer at the pattern you have been reading into it…",
      ],
      c: [
        "You turned the Fool, dear — the card carrying no verdict on anybody, least of all the one holding it.",
        "You came asking to be told what is wrong with you, and up came the card that has never once made that finding.",
        "There is nothing in this card that says you are the reason, and there is nothing in it that says you are not — I will not rule on you in either direction, because it is not a ruling anybody is entitled to make and you would carry it either way. What the Fool sets down instead is that your question was built as a case against yourself, and then handed to me to confirm. I am not going to confirm it. Endings happen for reasons that mostly live in other people and in circumstances, and a woman is not a defect for having been present at hers.",
        "Let me look closer at the case you have been building against yourself…",
      ],
    },
    // 'Have I given up on love without realizing it?' — THE SELF-AUDIT. She is asking a
    // stranger to grade her own interior, and BOTH answers do harm: "yes, you have" is
    // the sentence 'cards-alone-forever' already bans outright, and "no, you have not"
    // is the reassurance she came here having exhausted.
    // 🔴 The novel ban is on the headline's own premise. "Without realizing it" invites
    // Evelyn to claim better access to her mind than she has — refuse that outright.
    // She is the only authority on her interior; the card reads what guarding COSTS,
    // never whether she has closed.
    'cards-given-up': {
      a: [
        "You turned the Magician, dear — the card of the hands that have not stopped, whatever the person attached to them believes.",
        "You reached for the card of ongoing work at the exact moment you were wondering whether you had put the work down.",
        "What you have or have not given up on is not mine to announce, dear, and no card gets to rule on the inside of a person — you read your own interior better than anyone alive, and certainly better than this deck. What I can say is that you are here, at whatever hour this is, asking. That is not the conduct of someone who has closed the matter; a closed matter does not get taken out and examined. Whether the hope has changed shape is a real question and yours alone to answer, but the Magician does not find a woman who has stopped. It finds one who is worried she might have, which is nearly the opposite.",
        "Let me look closer at what you are afraid you have let go of…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the pause that has gone on longer than the one who called it ever intended.",
        "It was the card of the held moment that came to your hand, and holding is precisely what your question is about.",
        "Protecting yourself is not the same as giving up, though from the outside — and after enough years — the two can look identical, which is what has you asking. Somewhere you began expecting less out loud so that less would hurt less. That is not surrender, dear, it is a sensible thing a person does after being disappointed enough times, and it is reversible in a way that giving up is not. Neither of those is mine to score, and naming which one this is would be a judgement I have no standing whatever to make. The Hanged Man's business is what the holding has cost, never a verdict on the woman doing the holding.",
        "Let me look closer at what the guarding has been costing you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one still standing at the start of the road, whatever they have decided about themselves.",
        "Your question asked whether the door had quietly shut, and the card that arrived is the one that has never yet been shut.",
        "Let me take 'without realizing it' out of your hands, dear, because that is the phrase doing the damage. It supposes something has happened inside you that you cannot see and a stranger can — and that is not true of me, or of this card, or of anyone who will ever tell you otherwise. You would know. It might be buried under a great deal of self-protection and a fair amount of tiredness, but it would be yours to find, not mine to announce. The Fool carries no closed doors. What it carries is that the wanting is still in you, or this question would never have been worth typing at one in the morning.",
        "Let me look closer at what is still in there under the guarding…",
      ],
    },
    // ── TWIN FLAME (2026-08-11) ───────────────────────────────────────────────
    // 🔴 THREE THINGS ARE REFUSED IN EVERY ONE OF THESE NINE READS:
    //   1. THE LABEL — never confirm (or deny) that he is her twin flame. It is a verdict
    //      on a real person, and an unfalsifiable one, so she could never test it against
    //      what he actually does. Affirm the PULL as real information about her instead.
    //   2. THE RUNNER SCRIPT — never read his distance as proof of the bond.
    //   3. ASCENSION HOMEWORK — never make his return contingent on her healing enough.
    //
    // 'Is my twin flame ready for me?' ~ competes with cards-ready-commit. That one reads
    // his CAPABILITY; this one reads the WAITING, because "ready for me" quietly assumes a
    // schedule she is being kept on.
    'cards-twin-ready': {
      a: [
        "You turned the Magician, dear — the card of the one who does the building, not the one who is waited on.",
        "You asked about his readiness and drew the card of deliberate action, which is the only form readiness has ever taken.",
        "Readiness is not weather, dear — it does not roll in over a person while they stand still, and that is the part your question keeps having to work around. The Magician holds no date for his arrival and I would not read one out. What it does say plainly is that nobody becomes ready by being waited for, however patiently and however long. Whether he does the work is genuinely his to do and unknowable from where either of us is sitting. What is knowable is that you have been treating his readiness as a thing that will happen TO him, and it never is.",
        "Let me look closer at what you have been keeping ready in the meantime…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the one who is suspended, and knows it.",
        "It was the card of hanging that came up, and hanging is a fair description of what waiting on somebody else's readiness feels like.",
        "This card will not tell me whether he is close to ready, and anybody who claims a card told them that is telling you a story. What the Hanged Man does is turn the picture over. You framed this as a readiness that will one day point in your direction, which puts you at the end of a process he alone controls — and the whole time the process has been running, so have you. There is a life happening at your end of the suspension, dear, and it is not a waiting room. It only got treated like one.",
        "Let me look closer at what has been on hold at your end…",
      ],
      c: [
        "You turned the Fool, dear — the card of the step taken before anybody has confirmed the ground.",
        "Under a question about someone else's timing, up came the card of the one who moves without a signal.",
        "No card knows his readiness and this one knows less than most, so I will not pronounce on it in either direction. The Fool's business is elsewhere. Your question has readiness as a gate he opens and you walk through, and that arrangement leaves the whole of your timing in the keeping of a person who has not told you what he intends. That is a heavy thing to have handed over, and you did not hand it over carelessly. You did it because the pull was real. The pull being real does not make the arrangement fair.",
        "Let me look closer at the arrangement you have been living inside…",
      ],
    },
    // 'Does my twin flame feel this too?' ~ competes with cards-feels. That one reads what
    // he feels; this one reads whether the intensity is SHARED, which is a different and
    // sharper question — and the one where narrating his interior is most tempting.
    'cards-twin-feels': {
      a: [
        "You turned the Magician, dear — the card of what a person does with what is in their hands.",
        "You asked whether he feels it and drew the card of enactment, which is the only place a feeling ever becomes visible to anyone else.",
        "I cannot see inside him, dear, and no honest reader will tell you they can — what somebody feels is theirs, and it reaches the rest of us only in what they do about it. So I will not report his heart back to you as though I had been in it. What the Magician says is that you already have the only evidence anybody gets: how he acts, how consistently, and whether it matches the size of what you feel. You have been asking me to confirm a feeling. You already hold the record of the conduct.",
        "Let me look closer at what the conduct has actually been showing you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of two things that look alike until the picture is turned over.",
        "Yours was the card of the reversal, and there is one sitting inside the question you asked.",
        "Whether he feels this is not something I will answer, in either direction — not because I am being careful with you, but because I would be making it up. The Hanged Man turns the question instead. You asked whether it is shared, which means the reading you actually came for is not about him at all: it is whether what you have been feeling is real or something you have been generating alone. It is real. That is a separate finding from his, and it does not depend on him at all to stand up.",
        "Let me look closer at what you have been feeling and doubting at the same time…",
      ],
      c: [
        "You turned the Fool, dear — the card of the heart that sets out before it has been given any assurances.",
        "The card that came to your hand is the one that starts things without a guarantee at the other end, which is precisely where you are standing.",
        "There is no confession in this card and I am not going to invent one to send you away happy. What the Fool holds is the thing you may not have been told: a feeling this size is information about YOU — about a capacity you have that plenty of people never locate in themselves — and it stays true whatever he does or fails to do with his own. You came asking whether it was returned. That question has an answer only he can give, in conduct, over time. What you feel needed no confirmation from him to be genuine.",
        "Let me look closer at the size of what you have been carrying…",
      ],
    },
    // 'Is my twin flame coming back to me?' ~ competes with cards-ever-back. That one reads
    // the possibility; this one must ALSO refuse the separation-phase script, which is what
    // turns an absence into a stage of a journey with a guaranteed ending.
    'cards-twin-back': {
      a: [
        "You turned the Magician, dear — the card of a decision that gets made rather than one that gets fated.",
        "You asked whether he returns, and the card that arrived is the one about somebody choosing to act.",
        "Whether he comes back is his to decide and not mine to forecast, so I will not hand you a yes and I will not hand you a no. The Magician is worth more to you than either. It says a return, if it comes, will be a thing he decides and does — not a stage that arrives on schedule, and not something the distance itself was secretly arranging on your behalf. Nothing about being apart is doing quiet work toward a reunion. What separates people is separation, dear, and it is allowed to just be that.",
        "Let me look closer at what has been asked of you while you waited…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the interval that refuses to announce how long it is.",
        "It was the card of the unmeasured wait your hand found, and the not-knowing has been the hardest part of this.",
        "No timing lives in this card and no outcome does either, and I would not read you one out of an interval nobody can measure. Here is what the Hanged Man will not let stand, though: an absence is not a phase in a journey with a known ending. That story is told very confidently in a great many places, and it asks you to experience being without him as progress toward having him. It is not progress. It is an absence, it is costing you something real, and you are allowed to call it what it is rather than what it has been renamed.",
        "Let me look closer at what this waiting has actually been costing…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that has not been walked, in either direction, by anybody yet.",
        "You came asking about a return and drew the one card that has never once promised anybody an ending.",
        "The Fool holds no reunion for me to give you and holds no ending either, and I will not manufacture one in either direction. What I will not leave alone is the arithmetic hiding in the question. Nowhere in it is there anything for you to have done differently, or to do now, that determines whether he comes back — not more healing, not more patience, not becoming a version of yourself that would finally earn it. His returning was never a reward for your progress. Anyone who has told you otherwise handed you a job that was never yours.",
        "Let me look closer at the job you have been given that was never yours…",
      ],
    },
    // ── HIDDEN / INTUITION (2026-08-12) ───────────────────────────────────────
    // Trust/Honesty frame, a topic neither live family covers: what is NOT said, and how
    // she is supposed to know. TWO landers by commission — see HIDDEN_INTUITION_HOOKS.
    //
    // 🔴 FOUR THINGS ARE REFUSED IN EVERY ONE OF THESE SIX READS:
    //   1. THE VERDICT — never that he IS hiding something, never that he is not. Both are
    //      rulings on a real man from a card, and the second is also a dismissal of her.
    //   2. THE CONTENTS — never name or guess WHAT is withheld. Another woman, money, a
    //      feeling, a past: every one of them is invention, and inventing one manufactures
    //      a crisis inside a relationship that is still running.
    //   3. THE TACTIC — never check his phone, never test him, never catch him out. No
    //      family has needed this rule as sharply; the headline supplies the move itself.
    //   4. PATHOLOGISING HER — never paranoid, insecure, overthinking, reading into it.
    //      She arrived already suspecting herself; the funnel does not finish the job.
    //
    // 'Is he hiding something from me?' — an OMISSION, not a lie. Nobody has been caught in
    // anything, which is exactly what separates this from the live honesty family.
    'cards-hiding-something': {
      a: [
        "You turned the Magician, dear — the card of the one who decides what is shown and what is kept back.",
        "You asked whether something is being kept from you, and up came the card of deliberate arrangement.",
        "Whether something is genuinely being kept from you is not a thing this card will settle, dear, and I would not invent its contents to fill the silence — a stranger with a deck telling a woman what a man conceals is making it up. What the Magician marks is management: a hand deciding, in the moment, how much of a picture to hand across. Everyone alive does a little of that. What you are describing is not the everyday amount, or the question would never have been worth typing. The card convicts him of nothing and neither will I. It says the edge you keep meeting is a made one — and meeting an edge is not the same as imagining one.",
        "Let me look closer at where the picture keeps stopping…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of what is held just out of view.",
        "It was the card of the withheld thing that came to your hand, and withholding is precisely what you came to ask about.",
        "What he keeps is not something this card can show me, dear, and anyone who claims otherwise is performing — nor am I going to send you looking for it. Going through a man's phone has never once produced peace; it produces a worse version of the same night. The Hanged Man turns the thing over instead. You have been doing the work of guessing, and guessing is labour — hours of you, spent assembling a picture you were never handed whole. The needing to do that is not imaginary, whatever sits behind it. Being made to build the thing yourself is a cost you have already paid in full.",
        "Let me look closer at what the guessing has been costing you…",
      ],
      c: [
        "You turned the Fool, dear — the card of the man who has not sat down and worked out what he thinks.",
        "Your hand went to the card of the unexamined thing, and that is a genuinely different animal from the concealed one.",
        "Here the Fool asks me to slow down before either of us calls this a secret. Not everything withheld was ever decided on; some of it has simply never been faced by the man carrying it, and a thing he has not admitted to himself cannot be told to you — which lands on your side identically either way, as a gap. I will not rule on which of the two this is, dear, because from the outside they are indistinguishable. What the card will not do is put the gap in your imagination. The gap is there. What it is made of is the open question, and it is a fair one to have.",
        "Let me look closer at the shape of the gap…",
      ],
    },
    // 'Something feels off — is my intuition right?' — the only headline on the funnel that
    // submits HER JUDGEMENT for a verdict, and both available verdicts do harm: "yes"
    // convicts him by proxy of whatever she has already concluded, "no" tells a woman her
    // own observation is imaginary. Every read here splits the question instead — the
    // NOTICING is affirmed, the MEANING is left open — and refuses the flattering third
    // option, that intuition is never wrong, which turns every fear into a finding.
    'cards-feels-off': {
      a: [
        "You turned the Magician, dear — the card of the mind that registers a thing long before it can explain it.",
        "You asked whether your sense of this is sound, and drew the card of the working intelligence.",
        "I want to be careful with you here, because there are two questions inside that one and they do not have the same answer. Did you notice something — yes. The Magician is emphatic that this is a faculty working rather than a nerve misfiring. What the noticed thing MEANS is the part I will not hand you, dear, and I would be lying if I dressed a guess up as a reading. Nor will I tell you that intuition is never wrong — a flattering sentence which has cost women a great deal, because it quietly turns every fear into a finding. The noticing is real. What it points to is still open.",
        "Let me look closer at what it was you actually noticed…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of two accounts that will not sit flat against each other.",
        "It was the card of the mismatch your hand found, and a mismatch is very often what 'off' turns out to be made of.",
        "A feeling of wrongness is usually not mystical, dear, whatever you have been told — most often it is the ordinary result of being given an account that does not match what you can see, and a mind doing its job by flagging the difference. Which of the two is the false one is beyond what this card knows. But I am not going to do the more common thing either and suggest you have produced all of this out of insecurity. Being talked out of your own observations is how a person ends up unable to trust herself at all. Something did not line up. That is a finding, and it stands whatever turns out to explain it.",
        "Let me look closer at what stopped lining up…",
      ],
      c: [
        "You turned the Fool, dear — the card of the step taken before anything has been confirmed.",
        "You came to have your sense checked, and up came the card of the one who must move without a verdict in hand.",
        "No card is going to confirm this for you, dear, and it would be an unkindness to pretend one had. The Fool is honest about that much: you are standing where a person stands before they know. What I will not let pass is the notion that you must earn the right to a straight answer by first assembling proof. You do not. Somewhere along the way, asking plainly and accusing got collapsed into the same act for you, and they were never the same act. The unease you arrived carrying is not evidence against him — I will not let it be used that way. It is also not nothing, and you were not wrong to bring it here.",
        "Let me look closer at what you have been made to prove before you could ask…",
      ],
    },
    // ── REAL FEELINGS (2026-08-12) ────────────────────────────────────────────
    // Feelings/Commitment frame. All three ask the one thing this funnel most firmly
    // refuses: report a real man's heart back to her. The family is therefore built as a
    // sustained refusal that still pays her out — never a confession, never a denial.
    //
    // 🔴 FOUR REFUSALS IN ALL NINE READS:
    //   1. NEVER NARRATE HIS INTERIOR — not "he loves you", not "he doesn't", not "he feels
    //      it but is frightened". This is 'cards-twin-feels'' central ban.
    //   2. NEVER DIAGNOSE HIM — avoidant, emotionally unavailable, commitment-phobic. That
    //      is the internet's answer to all three headlines and it is still a verdict.
    //   3. NEVER GRADE HER — no naive, foolish, too much, gave too soon.
    //   4. NEVER a date, forecast or tactic (nothing to send, no pulling back to test him).
    //
    // 🔴 The route through is the one honest channel: a feeling reaches anyone else only as
    // CONDUCT, and she already holds that record. Point at the ledger, never read his heart.
    //
    // 'Does he really love me?' — the lens is the word REALLY. She is not asking whether he
    // has feelings; she is asking whether what she has been given amounts to love. That is a
    // question about a STANDARD, which can be answered honestly — unlike his interior.
    'cards-really-love': {
      a: [
        "You turned the Magician, dear — the card of what a person sets out to do on purpose.",
        "You asked whether he really loves you, and up came the card of deliberate action.",
        "His own heart belongs to him, dear, and no deck ever built grants me a window into it — anyone who claims to know what a man feels is reciting something they made up on the spot. The Magician's business is narrower and far more useful to you. It says that love, where it is real, is a thing done on purpose and then done again: chosen on ordinary days when nothing whatever required it. You do not need me for that record. You have been keeping it a long time, and the word 'really' sitting in your question tells me you have been reading it more honestly than you have let yourself say out loud.",
        "Let me look closer at the record you have been keeping…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the sentence somebody could simply have finished.",
        "You reached for the card of the thing left hanging, and one has been hanging here a long while.",
        "I am not going to rule on his heart — not a yes and not a no, because neither would be honest and you would carry whichever I handed you for months. What the Hanged Man puts in front of me instead is the position you have been left standing in. Love is not usually a thing a woman has to work out from evidence; it is usually a thing she has been told plainly, and then told again. That you are here asking a deck rather than remembering being told is not proof of anything about him. It is a fact about where this has left you, and it deserves looking at squarely rather than explaining away.",
        "Let me look closer at what you have had to work out for yourself…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who gave before anything had been promised back.",
        "Your hand went to the card of the leap taken without assurances, which is a fair account of what you did.",
        "Nothing in this deck reaches inside another person, dear, and the Fool reaches least of all. I am not going to manufacture a confession that would comfort you for one evening and cost you a month. What the Fool holds is about you, and you may never have been told it. You went in without a guarantee. That is not naivety, dear, and it is not a lesson you are meant to extract and carry into the next one — it is a capacity, and a great many people go their whole lives without ever locating it in themselves. Whether he has matched it is a separate question with a separate answer, and it was never a verdict on whether you were right to love first.",
        "Let me look closer at what you gave before you were sure…",
      ],
    },
    // 'How does he really feel about me?' — ⚠️ the PRONOUN VARIANT of the live 'cards-feels'
    // ("about YOU"). Its lens is HER VOICE and the position of the asker: she has come to a
    // stranger for something a person who knows her could have said. The incumbent reads his
    // feelings; this reads the ASKING. See the union note on the confound.
    'cards-feel-about-me': {
      a: [
        "You turned the Magician, dear — the card of the hands rather than the heart.",
        "You asked what he feels, and drew the card of what actually gets done about it.",
        "I want to say something about your question before I say anything at all about the card. You have come to a woman you have never met to find out how a man who knows you feels about you. I am not saying that to shame you, dear — I am saying it because it is information, and it is the one piece nobody ever puts in front of you. The Magician does not report anybody's heart to me, and I would not pass it on if it did. It deals only in what is done, and how consistently it is done. Somewhere in what has been done, or has not been, sits the reason you had to come and ask me instead of simply knowing. You are allowed to want that gap named, dear, rather than quietly working around it for another year.",
        "Let me look closer at why you had to come and ask…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the answer that will not settle.",
        "It was the card of what refuses to come to rest that your hand found, and that is where this has been living.",
        "There is one word carrying your entire question, dear, and it is 'really'. It means some answer has already been handed to you and it did not hold — it slid off, or it stopped matching what you could see — and here you are, asking a second time, of a stranger. What he feels I cannot reach and would not guess at. What the Hanged Man says is that an answer which has to be asked for twice has not done its work, and that having to ask again reflects nothing whatever about you. It reflects on what you were told the first time.",
        "Let me look closer at the answer that would not hold…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one standing at the start with nothing settled.",
        "You came for a report on somebody's heart and drew the card that has never once carried a guarantee.",
        "This card carries no confession, dear, and dressing one up for you would lighten tonight at the expense of every night after it. But I do not believe a report was ever really what you came for. Underneath 'how does he feel' there is nearly always a second question — whether to keep going, and how much more of yourself to put in — and that one is yours rather than his, and it does not require his answer first. The Fool will not tell you what is in him. It is quite firm, though, that you are allowed to decide what you need before you ever find out.",
        "Let me look closer at the question underneath the question…",
      ],
    },
    // 'Does he love me, or am I imagining it?' — a BINARY whose second branch puts HER
    // PERCEPTION on trial. BOTH doors are shut: "he loves you" narrates his interior, and
    // "you imagined it" is the gaslighting 'cards-feels-off' forbids — and here the headline
    // itself invites it. Refuse the either-or as 'cards-moved-on' does; affirm the noticing
    // as 'cards-feels-off' does; never claim a feeling is proof of anything.
    'cards-imagining-it': {
      a: [
        "You turned the Magician, dear — the card of the thing that genuinely got made, whatever either of you calls it.",
        "You asked whether you invented all this, and drew the card of what was actually built.",
        "Two answers are available to me here, dear, and I am handing you neither one. What sits inside him is his to speak, and I intend to stay well out of it. Nor am I going to suggest that you conjured the thing yourself, because that is the crueller of the two and it is almost never true. Something happened between the pair of you. It had a shape, it took up real time, and you were present for every hour of it. The Magician deals in what was made rather than in who meant what by it, and whatever it turns out to have meant to him, it was not assembled out of thin air by a woman sitting on her own.",
        "Let me look closer at what was actually built between you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question that has been asked the wrong way round.",
        "It was the card of the reversal your hand found, and there is one sitting inside what you asked me.",
        "You have offered me two doors, dear, and I am walking through neither of them: not the one where he adores you, and not the one where you assembled all of this by yourself. The choice itself is doing you harm. Those are not the only two things that can be true, dear, and being handed only two is how a woman ends up doubting her own eyes. A thing can be real and unspoken. It can be real and not enough. It can be real to one person at one size and to the other at quite another. The Hanged Man's entire business is turning a question over, and turned over, yours stops being about his heart and becomes about why you were left with only two doors.",
        "Let me look closer at why it came down to two doors…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who trusted what she saw.",
        "You came asking me to rule on your own eyes, and drew the card of the woman who went ahead and believed.",
        "I am not going to hand you the sentence you have braced for, dear — that none of it was there and you constructed the whole of it yourself. Women are told that far too easily and it does damage that outlasts the man. Nor will I swing the other way and promise you that anything felt strongly enough must therefore be returned in full; a feeling is not evidence, however large it is, and telling you otherwise would be flattery rather than help. The Fool sits with the harder and truer thing. You saw something, and you acted on it, and that was not foolish of you. What it came to on his side is still open — and you are allowed to want it said aloud rather than deduced.",
        "Let me look closer at what you saw before the doubt arrived…",
      ],
    },
    // ── Still-feels (2026-08-14) ─────────────────────────────────────────────────────────
    // Operator category "Reunion/Return", topic "Does he still feel it". The word STILL is the
    // family's whole engine: it concedes the feeling was real and asks only whether it SURVIVED.
    // So the past tense may be affirmed outright — that is the payout — while the present tense
    // is the forbidden claim in BOTH directions.
    //
    // 🔴 Shares no vocabulary with 'cards-really-love' (one word away): no ledger, no record she
    // has been keeping, no "chosen on ordinary days", no standard the word reaches for.
    //
    // 'Does he still think about me?' — the lens is THE SMALLEST ASK. She is not asking for a
    // return or for love; she is asking to still exist somewhere in his head, which is the most
    // modest thing a person can request. The modesty is the finding.
    'cards-still-think': {
      a: [
        "You turned the Magician, dear — the card of what a person does on purpose.",
        "You asked whether you cross his mind, and up came the card of things that are chosen rather than things that simply happen.",
        "Here is the difficulty with your question, dear. A thought is not a deed. What drifts through a man is not willed by him, and no deck reaches into it. But notice what the Magician has caught you doing. You have not come here to ask whether he is coming back. You have not come to ask whether he loves you either. You have come to ask whether you are occasionally remembered. A woman does not arrive at that question from nowhere. She is walked down to it, one disappointment at a time, until the smallest thing feels like the only thing left to ask for — and that is a fact about what you have been going without, not a fact about what you are worth.",
        "Let me look closer at how small you have had to make the asking…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card that takes a question and turns it the other way up.",
        "Your hand found the card of the reversal, and there is a considerable one sitting inside what you have asked me.",
        "Turn it over and look at what you are actually holding, dear. You are asking whether a man occasionally thinks of you — and you are asking it because he has never once left your own head. Both ends of this sit in your hands. He is not somewhere wondering whether he crosses your mind; you took his half of the wondering as well as your own, and I suspect you did it without a word to anybody. What he thinks is beyond my reach, dear. What the Hanged Man says instead is that carrying both halves of a thing is exhausting in a way nobody around you can see, because from the outside it simply looks like you have gone quiet.",
        "Let me look closer at the half of this you have been carrying for him…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who walked in open-handed with nothing promised back.",
        "You came asking whether you left a mark, and drew the card of the woman who arrived without a single guarantee.",
        "I will not invent it for you, dear — not him pausing over something, not you surfacing in his evening. I could write either one and it would be lovely and it would be worth nothing. What the Fool holds instead is firmer and it is yours. What happened between you is not stored in his head alone, waiting on his memory to make it real. You were not a witness to it. You were half of it, and your account of it is not the lesser copy that only counts once his has been checked. Whether you are in his thoughts tonight is genuinely unknown to me. That you were there, and that it happened, is not in question at all.",
        "Let me look closer at the half of it that was always yours…",
      ],
    },
    // 'Does he still love me?' — the lens is SURVIVAL rather than EXISTENCE. ⚠️ ONE WORD from
    // the live 'cards-really-love', and the word is the whole difference: that hook doubts the
    // feeling ever amounted to love (a question about a STANDARD); this one takes the love as
    // given and asks whether it LASTED. Affirm the past tense with confidence — that is the
    // payout and it costs nothing true — and refuse the present tense in both directions.
    'cards-still-love': {
      a: [
        "You turned the Magician, dear — the card of the deliberate act.",
        "You asked whether it has lasted, and drew the card of what a person sets out to do on purpose.",
        "The Magician governs what is chosen — and whether a feeling outlasts its circumstances is the one part of a man that is not chosen at all. He does not get a vote on what remains in him, and nor do I get a window into it. I will not say the love is intact and waiting. I will not say it is spent either. Both are sentences a stranger has no business handing down. But look at the word sitting in the middle of your own question. Still. You did not come here asking whether he ever loved you. You have settled that, and you settled it from the inside, where you were standing at the time. Whatever became of it since, no one is entitled to take that first part off you.",
        "Let me look closer at what you already know and were never allowed to say…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing suspended, neither fallen nor risen.",
        "It was the card of the unresolved state your hand went to, and that is precisely the room you have been living in.",
        "There is no word in the language for the tense you are in, dear, and I think that is half of why it has been so hard to explain to anyone. You are not together. You are not finished either — nothing was ever closed, only stopped. The Hanged Man is the card of exactly that suspension, and what it says is that the suspension is a real position you were PUT in, not a failure of yours to make up your mind. People will treat it as indecision. But an unfinished sentence is not the same as a closed one, and waiting on a sentence somebody else walked away from mid-way is not weakness of character.",
        "Let me look closer at the sentence he never finished…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that has not been decided yet.",
        "You asked whether something survived, and drew the card that has never once dealt in certainties.",
        "I am going to refuse both halves of what you want from me, dear. I will not say his love is still there — that is a promise I cannot keep and you would build months on it. I will not say it is gone — that is a death notice, and I have no standing to issue one about a living man's heart. The Fool sits with what is genuinely open, and this is genuinely open. You have been the only person holding this question open, dear. You have kept it alive on your own, carried it into every quiet moment — and it was never a question one person could answer by herself. You are allowed to stop being the only one holding it.",
        "Let me look closer at what it has cost you to hold this on your own…",
      ],
    },
    // 'Does he still love me, or has he moved on?' — ⚠️ shares the verbatim clause "or has he
    // moved on?" with the live 'cards-moved-on' (reunion), which is untouched. Its refusal must
    // be its OWN: cards-moved-on refuses because neither branch is knowable, 'cards-imagining-it'
    // refuses because the second branch is cruel. This refuses on a different ground entirely —
    // 🔴 THE TWO ARE NOT OPPOSITES. Moving on is something a person DOES with a life; loving is
    // something that happens IN them. They are not on one axis and never were.
    'cards-love-or-moved-on': {
      a: [
        "You turned the Magician, dear — the card of what actually gets done, as against what is merely felt.",
        "You handed me two options and drew the card that separates them, which is a better piece of luck than you know.",
        "Look at the two things you have set either side of that little word 'or', dear, because they are not opposites. Moving on is something a person DOES — mornings, work, other faces at the table. Loving is not done at all; it happens inside somebody, with nothing to show for it. A man can have built an entire new life and still carry you in him, or be sitting perfectly still and feel nothing whatever. The Magician cannot pick between them because they were never a pair to pick from. You have been reading every scrap of him as evidence for one of two verdicts, and it has been impossible — you thought that was your failing, and it is not. Notice what neither door touches: the thing you had was real when you had it.",
        "Let me look closer at the question you were handed…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question asked from the wrong end.",
        "Your hand went to the card of the reversal, and yours needs turning about as much as any I have seen.",
        "Your question has room in it for exactly one person, dear, and it is not you. Both doors lead to him: what he feels, what he has done — and everything that happens next in your life apparently waits behind that answer. I am not going to walk through either door. The inside of a man is not visible to me, and anyone who tells you otherwise is selling you something. What the Hanged Man asks instead is the question nobody has put to you in all this time. Not what he feels. What YOU want — and whether you would even recognise the answer now. I am not telling you to stop asking, dear. I am saying your own answer has been at the back of the queue behind his for a long while.",
        "Let me look closer at the question nobody has asked you…",
      ],
      c: [
        "You turned the Fool, dear — the card of what has not been decided.",
        "You came for one of two verdicts and drew the card that refuses to issue either.",
        "You have braced for one sentence and hoped for the other, dear, and I am giving you neither. Not 'he still loves you' — I would be inventing that, and you would live off it until it ran out and left you exactly here again, only tireder. Not 'he has moved on' — that is a burial for a living man, performed by a woman who has never met him. The Fool's whole business is the road that is still open, and this one is still open. But open does not mean promised, it does not mean hopeless, and it does not mean you must stand at the roadside until somebody comes to tell you which.",
        "Let me look closer at what is still open, and what never was…",
      ],
    },
    // ── His-other-life (2026-08-14) ──────────────────────────────────────────────────────
    // Five landers describing ONE WOMAN: she is fitting into a life that was already furnished.
    // ⭐⭐ The shared move is to NAME HER POSITION WITHOUT RANKING HER against what was there
    // first. Every headline invites "you should come first"; none of them may get it. The payout
    // is not a higher place, it is a DEFINED one — nobody has told her where she stands.
    // 🔴 AUDIENCE-AGNOSTIC: never presume divorced / widowed / separated / married.
    //
    // 'Am I his forever, or his now?' — the FOURTH binary-refusing hook, and its grounds are new:
    // permanence is not a STATUS she already holds and he has already assigned. It is built or
    // not built, and nobody is living in it yet. A category error, not an unanswerable question.
    'cards-forever-or-now': {
      a: [
        "You turned the Magician, dear — the card of the thing made deliberately, in daylight.",
        "You asked which of two things you are to him, and drew the card of what gets built rather than what merely happens.",
        "I want to take your question apart first, dear, because it has been put to you the wrong way round. You have asked which of two categories you are in, as though he decided some time ago, wrote it down, and you are simply waiting to be shown the page. Forever is not a condition a woman is discovered to be in. It is built — named out loud, planned for, said in front of other people — and the Magician's entire business is that difference. So the honest answer is not one of your two, dear. It is a question back: has anything actually been built here, or has it only been felt? It is the building that has gone missing.",
        "Let me look closer at what has been built here, and what has only been felt…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question that has been hung upside down.",
        "Your hand went to the card of the reversal, and yours is carrying a hidden assumption that needs turning over.",
        "Underneath what you asked me is a belief that there is a fact about you sitting inside that man, settled and filed, and that your whole life is waiting on somebody reading it out. But nobody lives in forever, dear. He is not living in it either. There is no such fact, and that is not bad news — it means you have not been quietly assigned to the lesser of your two boxes without being told. What the Hanged Man shows instead is far more ordinary and far more fixable: you are in an arrangement that has never been named, and the not-naming is the thing you are actually feeling. You have been treating a silence as a verdict.",
        "Let me look closer at the thing that has never been named…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road walked before anyone drew a map of it.",
        "You came asking to be sorted into one of two boxes, and drew the card that has never once been willing to sort anybody.",
        "I am giving you neither of your two answers, dear. Not that you are his forever, which would be a promise I invented and you would spend months living inside. Not that you are only his now, which is a dismissal, and you would carry it into every ordinary evening after this one. The Fool leaves this in the honest middle: it is not decided. But hear what I am not saying — undecided is not the same as doomed, and it is not the same as promised, and the wait itself is not proof of either. There is a difference between a road with no map and a road with no destination, and you are allowed to ask which of them you are walking.",
        "Let me look closer at the road you have actually been walking…",
      ],
    },
    // 🔴🔴 'Why do his children come before me?' — THE SHARPEST LANDER ON THE FUNNEL. It asks a
    // card to comment on a man's CHILDREN: real third parties, very possibly minors, who are not
    // her rivals. NEVER rank her against them, NEVER frame them as an obstacle, NEVER grade him
    // as a father, NEVER an ultimatum. The finding: children legitimately do come first, and that
    // is NOT the wound — the wound is that she has been left to infer her place from the leftovers.
    'cards-his-children': {
      a: [
        "You turned the Magician, dear — the card of what is planned rather than what is left over.",
        "You asked about the place you hold, and drew the card of intention, which is exactly where this needs looking.",
        "Let me be straight with you, dear, because I think you have had enough gentle evasions. A man's children do have a first call on him. That is not an injustice done to you and I will not pretend otherwise to make this evening easier. So you will hear no such thing from this card as 'you ought to come first'. But look at what it IS the card of. Planning. Intention. Things put in a diary on purpose. Children coming first has never once meant that the woman who loves him gets whatever remains when everything else is finished. Those are two entirely different arrangements, dear. First call is not the same as only call. You are not asking to be moved up a list. You are asking to appear on one.",
        "Let me look closer at what has actually been planned for you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card that turns a question over and shows you its underside.",
        "Your hand found the card of the reversal, and there is one here that I would like you to see.",
        "You have asked why they come before you — notice what that question has done, dear. It has placed you and those children on a single ladder with one rung worth having, and set you to competing for it. I do not think that ladder is yours. I think it was handed to you: by an arrangement in which you are always the one who adjusts, by every plan that moved, and possibly not by him at all. You are not in a contest with children, dear. You were never going to win one. The Hanged Man turns it into a quieter question, and a fairer one. Not whether you rank above them. Where you sit at all — named, reliable, somewhere a person could point to.",
        "Let me look closer at where you actually sit in all this…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who walked into it open-handed.",
        "You came into a life that was already full, and drew the card of the woman who went in without conditions.",
        "You arrived somewhere already occupied and you did it generously, dear. But the Fool has never pretended a thing costs nothing, so I will not either. Two things I decline outright. Grading that man as a father is the first — neither this card nor I have ever seen him with them. Pronouncing on what his children ought to mean to him is the second, since the answer there is everything. Wanting a place of your own is not the same as wanting theirs to be smaller. You may have told yourself they are, on the harder nights — but they are not, and believing they are is how a woman comes to ask for nothing whatever and call it being reasonable.",
        "Let me look closer at what you have stopped letting yourself ask for…",
      ],
    },
    // 'Am I living in her shadow?' — ⚠️ "her" may be an ex OR a woman who has DIED, and the
    // headline does not say. 🔴 MEDIUMSHIP BAN applies (this family runs the decode-him frame,
    // which carries none of it). 🔴 She may NEVER be disparaged, doubted or made a rival —
    // unlike `fidelity`'s third person, she may be entirely legitimate. The finding: a shadow is
    // cast by something she cannot see the whole of, so the comparison has no visible terms.
    'cards-her-shadow': {
      a: [
        "You turned the Magician, dear — the card of the thing itself, as against the shape it throws.",
        "You asked about a shadow, and drew the card that deals only in what is solid and actually made.",
        "Consider what a shadow really is, dear, because your own word is doing more work than you realise. A shadow is not a person. It is what falls when something stands between you and the light. What she was, or is, I shall stay out of entirely — inventing a woman for you to be set against is beneath what you came here for. What the Magician will say is this. You are being measured against something you have never been shown — not a person, but a version of one. Versions get edited, dear. By memory, which is a poor and flattering archivist. By grief. Nobody alive can be compared against an edited version and come out level, and you have been quietly failing that comparison without ever being shown its terms.",
        "Let me look closer at the comparison nobody has ever shown you…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card that asks who is holding the lamp.",
        "Your hand went to the card of the reversal, and the reversal here is not about her at all.",
        "You have asked whether you are in her shadow, and every part of your attention is pointed at her. Turn it round, dear. A comparison does not make itself. Somebody has to hold it up, and that is the question worth your evening. Sometimes it is him, in small ways he may not even hear himself doing. Sometimes — and I say this with no unkindness — it is her name doing work inside your own head, because no one has ever sat you down and told you plainly that you are not being weighed. You have no way of knowing which of those it is, dear, and that is not a failure of your perception.",
        "Let me look closer at who has been holding this up…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who arrives after the story has begun.",
        "You came asking where you stand beside another woman, and drew the card of the one who walked in with nothing settled.",
        "You came into this after her. That is a fact about the order of events, dear — no verdict on your worth lives anywhere inside it. Now, I will not do the thing you may have half hoped for. I will not weigh you against her, I will not suggest she was less than you have been told, and I will not hand you an enemy to feel taller beside. Whoever she is or was, she is not your opponent. What the Fool holds is simpler and it is entirely yours. You have the right to be looked at as yourself rather than in relation to somebody else — to be a person in this life rather than the chapter that came afterwards.",
        "Let me look closer at what it would mean to be seen as yourself…",
      ],
    },
    // 'Why do we still live apart?' — the most concrete of the five: a physical arrangement.
    // 🔴 NEVER supply a CAUSE for it (the `searching` family's ban, pointed at a man), never
    // "he is not serious", never "he is protecting himself". The finding: an arrangement that was
    // DECIDED is a different object from one that merely never changed, and nobody has told her
    // which she is living in.
    'cards-live-apart': {
      a: [
        "You turned the Magician, dear — the card of the decision actually taken.",
        "You asked about an arrangement, and drew the card that separates the things chosen from the things merely arrived at.",
        "Most arrangements of the kind you are describing were never decided at all, dear. They were arrived at. There was a reason once — a practical one, the sort nobody could argue with at the time — and then somewhere along the way that reason quietly stopped applying, and the arrangement simply stayed on, because nothing had ever been set up to end it. I will not tell you what is behind that man's front door, or what the distance means about his feelings. But the Magician is very firm on one distinction. A plan and a habit are different objects, dear. They can look identical from outside for years. And nobody has ever told you which of the two you have been living inside.",
        "Let me look closer at whether this was ever actually decided…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the question that turns out to be about something else.",
        "Your hand found the card of the reversal, and there is one sitting inside the word 'why'.",
        "You have brought your 'why' to me, dear, and it is not mine to answer — the reason lives in him and there is only one person who can hand it over. So the Hanged Man turns your question round and asks a different one. Why are you asking me rather than asking him? Something has made that question hard to put. Either way, dear, that is worth more of your attention than the reason itself, because an arrangement that cannot be discussed is not the same as one that simply has not been. I am not saying it proves anything about his feelings. I am saying there is a locked room in a shared life, and you have been living beside the door.",
        "Let me look closer at why this has been so hard to ask him…",
      ],
      c: [
        "You turned the Fool, dear — the card of the open road, and there is a closed door in your question.",
        "You asked about the distance between two homes, and drew the card of the one who travels light and asks for nothing.",
        "I will not read that man's front door as a verdict on you, dear. A man living behind his own door is not automatically a man withholding himself, and dressing that reading up as a finding of the cards is something I decline to do. Here is what the Fool does put in front of me, and it is about you rather than him. You have been reading an arrangement instead of being given a reason. Every visit, every goodbye at a door, every drive home — all of it interpreted, weighed, checked against the last time. That is exhausting in a way that being told plainly never is, and you have been doing the work of two people.",
        "Let me look closer at how long you have been translating this on your own…",
      ],
    },
    // 'Have I already given him too long?' — asks for a verdict on HER OWN PAST. 🔴 Both poles
    // banned: "yes, too long" is a sentence a stranger has no standing to pass, "no, it was worth
    // it" is a promise. 🔴 NEVER grade her (wasted, naive, foolish), NEVER a timeframe, NEVER
    // "you will know when". The finding: "too long" treats the years as a DEPOSIT toward a
    // purchase that may not complete — but they were also her life, and she lived them.
    'cards-too-long': {
      a: [
        "You turned the Magician, dear — the card of what was actually made in all that time.",
        "You asked me to audit the years, and drew the card of what gets built rather than what gets spent.",
        "You will hear no such verdict from me as 'you have given too much', dear. That is a sentence, and you would carry it out of here and into every anniversary that is left to you. Nor will I tell you it has all been worth it, because I cannot know that. 'Too long' treats those years as a payment you have been making towards something that might not complete — as though the whole sum is forfeit if it does not. But you did not spend that time in a waiting room, dear. You lived it. There were ordinary Tuesdays in there that belonged to you, and they are not retrospectively cancelled by how this turns out. Time given to a person is not the same thing as time lost.",
        "Let me look closer at what those years actually held…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing suspended, going neither up nor down.",
        "You asked about the length of it, and drew the card that concerns itself with stillness instead.",
        "You have asked whether you have given too long, as though the number of years were the thing that decides it. I do not believe it is the length, dear. It is whether anything moved. Ten years in which things were said and named and built is a completely different object from two in which nothing did. The Hanged Man's whole business is suspension — and what you are actually feeling, I think, is not duration but STILLNESS. Those two get mistaken for each other constantly, and the mistake is expensive: it sets a woman to interrogating the calendar when the calendar was never what was wrong. Nothing has moved. That is the thing.",
        "Let me look closer at what has actually moved, and what has not…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who set out without a guarantee.",
        "You came asking whether you were foolish to stay, and drew the card that has never once accepted that charge.",
        "I think there is a different question underneath yours, dear, and I would like to hand it back to you plainly. 'Have I given him too long' is very often 'am I allowed to want this to change' — and you do not need my permission for that, nor a card's, nor his. It asks me to certify that the years were WASTED, because only then would you be entitled to want more. That is a cruel toll to have to pay at your own gate, dear, and you have been paying it. The Fool names no hour for going and none for staying. But it is quite firm that wanting more was never a thing you had to earn by first calling the past a mistake.",
        "Let me look closer at what you have been making yourself prove…",
      ],
    },
    // Soulmate-label (2026-08-17). 🔴🔴 THE LABEL BAN RUNS THROUGH ALL NINE: never certify and
    // never deny that he is her soulmate or her twin flame. Unfalsifiable, and a verdict on a
    // real man. 🔴🔴 NEVER RANK THE LABELS — no word here is higher, rarer or deeper than
    // another, and "just a strong connection" may never be treated as the losing branch. The
    // shared move: affirm the PULL as real information about HER, refuse the WORD.
    'cards-really-soulmate': {
      a: [
        "You turned the Magician, dear — the card of what is made by hand, never of what is handed down.",
        "You came asking whether a word belongs to a man, and drew the card that has never once dealt in words.",
        "Here is what the Magician will and will not do, dear. It will not award that word to him — and it will not take it off him either, which matters every bit as much. There is no test for it, and nobody has ever been able to check the answer. But look at what your hand went to. This card's concern is what gets MADE, by somebody's hands, and you already hold that evidence: what he does on an ordinary Wednesday, which things he told you he would do, and which of them happened. None of it gets truer if the word is granted, or falser if it is withheld.",
        "Let me look closer at what the two of you have actually made…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card that takes a question by the ankles and shows you its underside.",
        "Your hand found the reversal, and there is one sitting inside the very way you asked.",
        "Read your question back and listen for the small word in the middle. Really. You did not ask whether the word fits him, dear — you asked whether it REALLY fits, and that only turns up when somebody is checking against a doubt they were already carrying. So the doubt came first. But it does not become a verdict in my hands, in either direction: a doubt is not evidence that he is not, any more than a strong feeling is evidence that he is. Underneath your question there is nearly always something more specific — a conversation that never got finished, a silence you have not asked about.",
        "Let me look closer at what the word has been standing in front of…",
      ],
      c: [
        "You turned the Fool, dear — the card of the one who set out with no guarantee in her pocket.",
        "You asked for a certainty about a man, and drew the card that has never issued one to anybody.",
        "Let me give you the reasoning, dear, not merely the refusal. If the answer tonight were yes, you would take it out on the difficult nights to explain away things that deserve looking at squarely — that word carries an obligation to endure. And if it were no, you would let it sour something that may be perfectly sound. Both are heavy objects to hand a woman on one card and no acquaintance with the man. What the Fool leaves you is lighter and truer. The pull is real, and it is genuine information about you. But no word has ever made a hard thing right, dear, and none has made a good thing more real than it was.",
        "Let me look closer at what it has actually been like to be inside it…",
      ],
    },
    // ⚠️ The FIFTH binary-refusing hook. Its ground is its own: both branches describe THE SAME
    // EVIDENCE under two words, so the answer would change nothing she could observe or act on.
    // 🔴 The word doing the damage is her own "just" — refuse the ladder, do not climb it.
    // 🔴 The RUNNER SCRIPT ban is sharpest here: never read his distance or silence as proof.
    'cards-twin-or-connection': {
      a: [
        "You turned the Magician, dear — the card of the thing itself, standing there before anybody has named it.",
        "You asked me which of two words applies, and drew the card that attends only to what is actually there.",
        "There is a word in your question doing quiet damage, dear, and it is neither of the big ones. It is 'just'. You have laid your two answers out as a prize and a consolation, then asked which one you have been awarded. I will not put him on that ladder, and I would sooner take the ladder away — you did not build it. It was handed to you by a great deal of writing that grades love in tiers. So look at what is genuinely in front of you. The same man. The same history. All of it is identical under both your words, because nothing about him shifts when the label does.",
        "Let me look closer at what is actually there, underneath whichever word you use…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card that hangs a question upside down until its pockets empty.",
        "Your hand went to the reversal, and yours has been carrying something that wants turning over.",
        "Try this with me, dear. Suppose I settled it — suppose I said, with all the certainty you came here hoping for: twin flame. Now tell me what is different tomorrow. What does he do that he was not going to do anyway? Nothing, dear. Not one thing. And it comes out the same if I say the other one instead. The word fastens onto nothing you could test, which is why neither of them is being handed to you here. One caution about the first of your two. That term arrives with a teaching strapped to its back: distance is a stage, silence is proof, his return waits on how much you have healed. A man's absence is not evidence of a bond.",
        "Let me look closer at what you would still be holding either way…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road nobody has drawn a map for.",
        "You came to be sorted into one of two words, and drew the card that has never sorted a soul.",
        "Neither word is in my gift, dear, and I would not press one on you even if it were. Grant you 'twin flame' and I have not given you an answer — I have given you a script: wait, bear the distance, treat the silence as meaningful, work on yourself until he is ready. Women live inside that for years and call it devotion. Withhold it, and I have handed down a demotion on what may be the best you have known. The Fool sets both of them down. Whatever this has been, it does not become smaller for being called by a plain name.",
        "Let me look closer at what this has actually been, in plain words…",
      ],
    },
    // 🔴🔴 NEVER NAME OR POINT AT A PERSON FROM HER PAST — no face, no initial, no "you already
    // know who". 🔴🔴 NEVER TELL HER SHE MISSED HIM (invents a loss to grieve) and NEVER promise
    // an arrival instead (a date in disguise). The finding: "without realizing it" presumes a
    // moment she failed a test, and a meeting was never an examination.
    'cards-met-already': {
      a: [
        "You turned the Magician, dear — the card of recognition, of knowing the thing when it is standing in front of you.",
        "You asked whether you have already walked past something, and drew the card of noticing.",
        "Two things will not be happening this evening, dear. Nobody is going to be pointed at — no face from your past, no name, nothing you could go and look up tonight. A name conjured at this table would send you back through years of your own messages hunting for a sign that was never in them. And you are not going to be told that you missed him. That is the sentence you half came here expecting, and this card has no intention of supplying it. 'Without realizing it' assumes a moment when the information sat there and you failed to read it. But a meeting is not an examination, dear, and noticing is a real faculty — yours is plainly in working order.",
        "Let me look closer at what you have been afraid you walked past…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the thing that can only be seen properly from the other side.",
        "You asked about hindsight, and drew the card that deals in nothing else at all.",
        "Here is what hindsight does, dear, and it does it to all of us. It goes back through the past, quietly folds in everything you have learned since, then presents the result as though it had been lying in plain view at the time. It never was. You could only ever have known what you knew then, and a woman cannot be held to account for failing to read a page that had not yet been written. So no charges will be filed against your younger self here. A question like yours comes when the road ahead has gone quiet, and the mind goes back through the archive looking for where the mistake must have been.",
        "Let me look closer at why this question has come now…",
      ],
      c: [
        "You turned the Fool, dear — the card of the road that carries on well past the part you can see.",
        "You asked whether the road is behind you, and drew the card whose whole nature is what has not happened yet.",
        "Your door stays open, dear, and I want it clear that this is a refusal running in both directions rather than a kindness. You will not be told it has already happened and slipped by — that would be inventing a loss for you to grieve, and you would grieve it, on far less than a card. Nor will you be promised an arrival, because a promise of that kind is a date wearing a disguise. What the Fool takes issue with is buried underneath the question: you have asked it as though your life were a single-question examination you may already have failed. A life is not an examination, dear.",
        "Let me look closer at what you have been treating as a test you already failed…",
      ],
    },
  },
}

export const DECKS: Record<TarotDeck, CardSetConfig> = {
  'decode-him': DECODE_HIM,
  'arcana-mfh': ARCANA_MFH,
  'arcana-eef': ARCANA_EEF,
  'return-mhf': RETURN_MHF,
}

export function getDeck(deck: TarotDeck): CardSetConfig {
  return DECKS[deck]
}

// The decode-him funnel is love/relationship-themed, so the chat skips the
// topic picker (same as palm).
export function hookToBucket(_hook: TarotHook): Bucket {
  return 'love'
}

export function isTarotHook(v: string | null): v is TarotHook {
  return v !== null && (TAROT_HOOKS as string[]).includes(v)
}

export function isTarotDeck(v: string | null): v is TarotDeck {
  return v !== null && Object.prototype.hasOwnProperty.call(DECKS, v)
}

export function isTarotCard(v: string | null): v is TarotCard {
  return v === 'a' || v === 'b' || v === 'c'
}

// Parse + validate tarot params from a query string. Returns null unless BOTH a
// valid hook and a valid card (for the resolved deck) are present — the chat
// only diverges when the user actually came through the tarot bridge (provable
// no-impact on other funnels). `deck` defaults to 'decode-him', `version` to 'a'.
export function parseTarotParams(
  search: string,
): { deck: TarotDeck; hook: TarotHook; card: TarotOption; version: TarotVersion } | null {
  const p = new URLSearchParams(search)
  const hook = p.get('hook')
  const card = p.get('card')
  if (!isTarotHook(hook) || !isTarotCard(card)) return null

  const deckParam = p.get('deck')
  const deck: TarotDeck = isTarotDeck(deckParam) ? deckParam : DEFAULT_DECK
  // The tapped card must be one this deck actually offers.
  if (!DECKS[deck].options.includes(card)) return null
  // The hook must carry reads for this deck; otherwise no tarot divergence.
  if (!DECKS[deck].reads[hook]) return null

  const vParam = p.get('v')
  const version: TarotVersion = vParam === 'b' ? 'b' : vParam === 'c' ? 'c' : 'a'
  return { deck, hook, card, version }
}

// ── Composed copy ───────────────────────────────────────────────────────────

// Reads for a hook×deck combo. Callers run behind parseTarotParams (which
// rejects combos without reads), so the DEFAULT_HOOK fallback never fires in
// practice — it keeps the lookup total for TypeScript.
function readsFor(deck: TarotDeck, hook: TarotHook): Record<TarotOption, string[]> {
  return DECKS[deck].reads[hook] ?? DECKS[deck].reads[DEFAULT_HOOK]!
}

// Version A — the static S3 reveal card: the 4-sentence reveal as one paragraph.
export function cardReveal(deck: TarotDeck, hook: TarotHook, card: TarotOption): string {
  return readsFor(deck, hook)[card].join(' ')
}

// Version A — brief chat greeting AFTER the card (don't re-deliver the reveal;
// acknowledge it and hand into name capture).
export function greetingA(deck: TarotDeck, card: TarotOption): string {
  const d = DECKS[deck]
  return `Mmm… ${d.mark[card]}. I felt it ${d.chooseMoment}. The connection only opens once I know who I'm speaking with, though… what's your first name, dear?`
}

// Version B (and Version C fallback) — the 4-sentence reveal as a chat sequence,
// one bubble per sentence, then ask the name → existing love deepening.
// ── The drawn card's artwork ─────────────────────────────────────────────────
// The strips are N-up sheets, so showing ONE card means cropping via
// background-position. This is the single source of that maths: TarotBridge uses
// it for the Version-A reveal and ChatPage uses it for the B/C chat opener, so the
// two can never drift and show different cards for the same draw.
//
// Prefers `revealStrip` (the real card FACES) over `strip` (which on a face-down
// deck is the identical backs — useless as a reveal).
export interface TarotCardArt {
  url: string
  sizePct: number // background-size width %  (count * 100)
  posPct: number // background-position X %
  aspect: number // one panel's width/height, so the box never distorts the art
  alt: string
}

export function cardArtFor(deck: TarotDeck, card: TarotOption): TarotCardArt {
  const cfg = DECKS[deck] ?? DECKS[DEFAULT_DECK]
  const strip = cfg.revealStrip ?? cfg.strip
  const count = cfg.options.length
  const i = Math.max(0, cfg.options.indexOf(card))
  return {
    url: strip.url,
    sizePct: count * 100,
    posPct: count > 1 ? (i / (count - 1)) * 100 : 0,
    aspect: strip.width / count / strip.height,
    alt: cfg.mark[card] || 'the card you drew',
  }
}

// ── The card PICTURE rollout gate ───────────────────────────────────────────
// Which landers currently serve the picture line. STAGED DELIBERATELY: the config lives
// on the deck, so without this gate one edit would change all 66 hooks at once. Widen one
// lander at a time, after a human has read the result; reverting is deleting a word. A
// hook not listed here renders exactly as it does today.
//
// Rolled out so far:
//   2026-08-18  cards-will-commit  — first. ~18 leads/day, 13% of tarot traffic, so a week
//               shows real sessions without betting the funnel on it. Deliberately NOT
//               cards-return, which carries 58% of all traffic.
// 🔴 A MIGRATED lander writes the picture into beat 1 itself and is REMOVED from this set —
// otherwise the splice duplicates the line the writer just wrote. This gate is the cheap
// retrofit for landers not yet rewritten, nothing more.
//   2026-08-18  cards-will-commit  — migrated fully, so it left this set the same day.
const PICTURE_HOOKS = new Set<TarotHook>([])

// Beat 1 is invariably "You turned|chose the X, dear — {framing}" — 264/264 across every
// deck. Splitting on that first dash lets the PICTURE sit between the card's name and its
// meaning, so she is told what she is looking at before she is told what it means. No
// written framing is edited, so the distinctness guards are untouched.
//
// 🔴 Returns the original line unchanged if the shape is not recognised. A mangled opener
// is worse than an un-improved one, and this runs on every lander.
function beat1WithPicture(beat1: string, picture?: string): string {
  if (!picture) return beat1
  const m = /^(You (?:turned|chose) the .+?, dear) — (.+)$/.exec(beat1)
  return m ? `${m[1]}. ${picture} This is ${m[2]}` : beat1
}

// ── Bubble breaks ───────────────────────────────────────────────────────────
// A beat may carry '\n' to split itself into SEPARATE chat bubbles. The registry entry
// stays four beats, so every existing guard keeps meaning what it meant — reads[h][c][2]
// is still "the read", [3] is still the open loop, and the 19 files pinning four beats
// still pass. Only the RENDERING changes.
//
// WHY IT IS AUTHORED AND NOT AUTOMATIC. Splitting on every full stop would break pairs
// that belong together ("He isn't keeping a decision from you, dear. He hasn't made one.").
// The writer decides where she takes a breath; the renderer just obeys.
//
// It also fixes pacing for free: each bubble gets its own typing delay, so a read split
// into five bubbles gets five pauses instead of one — no change to client/src/lib/typing.ts,
// whose 5s cap (≈83 characters) is why one long bubble always felt rushed.
const intoBubbles = (beat: string): string[] =>
  beat.split('\n').map((s) => s.trim()).filter(Boolean)

export function openerB(deck: TarotDeck, hook: TarotHook, card: TarotOption): string[] {
  const [beat1, ...rest] = readsFor(deck, hook)[card]
  const picture = PICTURE_HOOKS.has(hook) ? DECKS[deck].cardPicture?.[card] : undefined
  return [
    ...intoBubbles(beat1WithPicture(beat1, picture)),
    ...rest.flatMap(intoBubbles),
    "Before I follow this thread any further, I need to know who I'm speaking with… what's your first name, dear?",
  ]
}

// Version C opener (static, instant): the card line (sentence 1) + the open
// question. Then the LLM reads HER answer.
export function openerCStart(deck: TarotDeck, hook: TarotHook, card: TarotOption): string[] {
  return [readsFor(deck, hook)[card][0], TAROT_QUESTION[hook]]
}

// Version C fallback (if the reflect LLM call fails): the rest of the static
// reveal minus the card line already shown (affirm the pull → tendency → open loop).
export function tarotReflectFallback(deck: TarotDeck, hook: TarotHook, card: TarotOption): string[] {
  return readsFor(deck, hook)[card].slice(1)
}
