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
  // ── Money-block hooks (2026-08-19) — TRACK B, the first NON-LOVE family on the funnel ──
  // Every family above asks about a man. These ask about her money, and that changes what a
  // wrong sentence costs: on a love lander it hurts her feelings, here she can act on it with
  // her actual savings. Four angles so the age-matched framing (55-64 vs 65+) can be compared
  // against the mechanism-matched framing (energy, prayer) — folding them into one angle would
  // throw away the only thing the batch measures.
  //
  // 🔴 Three consequences no love hook has. hookToBucket() was hardcoded to 'love' and now
  // branches; the tap instruction lives on the DECK ("Think of the man on your mind"), so
  // CardSetConfig gained an optional per-hook override; and buildTarotReflectPrompt needed a
  // sixth frame, tested FIRST rather than appended to a five-branch ternary already at its
  // readable limit. Seven bans, three of which exist nowhere else — see
  // tests/tarot-money-block-copy.test.ts.
  | 'cards-blocked-retiring' // Why is my money still blocked this close to retiring?
  | 'cards-nest-egg' // How long has something been blocking me from a nest egg?
  | 'cards-too-late' // Is something blocking my money, or did I just leave it too late?
  | 'cards-still-working' // Why am I still working when the money should have come by now?
  | 'cards-how-much-longer' // How much longer will something keep blocking my money?
  | 'cards-out-of-time' // Is something still blocking my money, or have I run out of time?
  | 'cards-my-energy' // Is my energy blocking my money?
  | 'cards-money-wont-stay' // What does my energy say about why money won't stay?
  | 'cards-energy-how-long' // How long has my energy been working against my money?
  | 'cards-prayed-years' // I've prayed about money for years. What's still blocking it?
  | 'cards-prayers-unanswered' // How long will my prayers for money keep going unanswered?
  // ── Soulmate age-band, test A (2026-08-19) ───────────────────────────────────────────
  // Eleven landers for docs/fb-ad-test-queue.md test A. Every destination in that table was
  // an EXISTING lander asking a different question — HEADLINES is printed on the page, so
  // pointing a new ad at an old hook puts one question in the ad and another in front of
  // her. These carry the ad's own question.
  //
  // 🔴 They need a frame nothing else on the funnel provides. Every existing frame bans a
  // DATE; four of these ask HOW LONG, and "not much longer" is a LENGTH, which walks
  // straight through a date ban. See SOULMATE_AGEBAND_TAROT_HOOKS in server/lib/prompts.ts.
  //
  // ⚠ Two names here are deliberate near-misses. 'cards-too-late-love' is NOT 'cards-too-late'
  // and 'cards-longer-to-wait' is NOT 'cards-how-much-longer' — both of those are MONEY
  // landers above, and wiring a love hook under either would serve a woman asking about love
  // a reading about her pension. 'cards-missed-chance' is likewise NOT 'cards-already-missed',
  // which sits one word from the live 'cards-met-already'.
  | 'cards-slipping-past' // Why does my soulmate keep slipping past me?
  | 'cards-choosing-wrong' // What keeps me choosing everyone but my soulmate?
  | 'cards-found-me-yet' // Why hasn't my soulmate found me yet?
  | 'cards-keeps-waiting' // How long does a soulmate keep you waiting?
  | 'cards-missed-chance' // Is my soulmate still coming, or have I already missed him?
  | 'cards-after-marriage' // Is there a soulmate for me after the marriage ended?
  | 'cards-second-time' // How long does it take to find a soulmate the second time?
  | 'cards-best-years' // Why did I give my best years to someone who wasn't my soulmate?
  | 'cards-too-late-love' // Is it too late to meet my soulmate?
  | 'cards-longer-to-wait' // How much longer do I have to wait for my soulmate?
  | 'cards-allowed-to-want' // Am I still allowed to want a soulmate?
  // ── Soulmate keyword, test B (2026-08-20) ────────────────────────────────────────────
  // Eight landers for test B — the contrast is identity/outcome (soulmate) against practice
  // (blocked, energy, healing). Five are the MONEY landers above with one noun swapped, so
  // the reads had to be pushed apart by hand; check-collisions caught 25 shared six-word runs
  // on the first pass.
  //
  // 🔴 SIX OF THESE HEADLINES ASK A HER-FAULT QUESTION whose "yes" is banned funnel-wide.
  // The answer is no — but a bare "it wasn't you" restates cards-not-found-yet, so they use
  // the money family's move instead: turn the keyword from an accusation into an ASSET, then
  // name what has been taking it. See SOULMATE_KEYWORD_TAROT_HOOKS.
  //
  // 🔴 THE TWO CONNECTION HOOKS ARE DECODE-HIM AND THE OTHER SIX ARE NOT. "This connection"
  // means a real, specific man exists. One test, two frames — deliberate, and the reason
  // they are absent from SOULMATE_KEYWORD_TAROT_HOOKS.
  | 'cards-blocking-soulmate' // Is something blocking me from meeting my soulmate?
  | 'cards-blocked-before' // Why do I keep getting blocked before my soulmate arrives?
  | 'cards-connection-soulmate' // Is this connection my soulmate, or something else?
  | 'cards-connection-nothing' // Why does this connection feel like my soulmate when nothing is happening?
  | 'cards-energy-away' // Is my energy keeping my soulmate away?
  | 'cards-energy-soulmate' // What does my energy say about my soulmate?
  | 'cards-waiting-to-heal' // Is my soulmate waiting for me to heal?
  | 'cards-heal-first' // Do I need to heal before my soulmate arrives?
export type TarotCard = 'a' | 'b' | 'c' // the option the visitor tapped (A/B/C)
export type TarotOption = TarotCard
export type TarotVersion = 'a' | 'b' | 'c'
// Deck ids the skill can add. 'decode-him' = seeded face-down Sun/Moon/Tower;
// 'arcana-mfh' = face-up Magician/HangedMan/Fool (art re-ordered 2026-07-31);
// 'arcana-eef' = face-up
// Emperor/Empress/Fool; 'return-mhf' = face-down Magician/Hanged Man/Fool, the
// "Will he come back?" ad (all from Rio's card art).
// ── 'decode-him' the DECK was RETIRED 2026-08-19 (operator call) ─────────────────────────
// It was the seeded foundation set (Sun / Moon / Tower) and it never got real art: its strip
// png was byte-identical to client/public/palm/thumbs-strip.png, so a visitor tapped a PALM
// THUMB and was then told "you turned the Sun". No live ad ever pointed at it — DEFAULT_DECK
// is return-mhf and nothing in the repo linked `deck=decode-him` — so it was reachable only
// by a hand-typed URL, and retiring it removes a broken lander rather than a working one.
//
// ⚠️ 'decode-him' the ANGLE is a different thing and STAYS: it is the reporting label for the
// hooks that read HIM (angleForHook), and it is what every no-verdict guard is named after.
// The deck is gone; the angle is untouched.
export type TarotDeck = 'arcana-mfh' | 'arcana-eef' | 'return-mhf'

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

// ── The money-block families (2026-08-19) ────────────────────────────────────────────────
// Four angles, not one, because the comparison IS the batch: age-matched framing (55-64 vs
// 65+) against mechanism-matched framing (her energy, her prayers). money-prayer is pinned at
// TWO hooks — only two headlines were commissioned, and the count is pinned so a well-meaning
// third cannot appear later without a decision (the treatment hidden-intuition got).
//
// 🔴 These are in NO decode-him family and no no-man family either. There is no man in them at
// all, and their guard is its own file: tests/tarot-money-block-copy.test.ts.
export const MONEY_RETIRING_HOOKS: TarotHook[] = [
  'cards-blocked-retiring',
  'cards-nest-egg',
  'cards-too-late',
]

export const MONEY_WORKING_HOOKS: TarotHook[] = [
  'cards-still-working',
  'cards-how-much-longer',
  'cards-out-of-time',
]

export const MONEY_ENERGY_HOOKS: TarotHook[] = [
  'cards-my-energy',
  'cards-money-wont-stay',
  'cards-energy-how-long',
]

export const MONEY_PRAYER_HOOKS: TarotHook[] = [
  'cards-prayed-years',
  'cards-prayers-unanswered',
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
  // The four money-block angles (2026-08-19). Separate labels so PostHog can compare
  // age-matched framing against mechanism-matched framing, and 55-64 against 65+.
  | 'money-retiring'
  | 'money-working'
  | 'money-energy'
  | 'money-prayer'

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
  if (MONEY_RETIRING_HOOKS.includes(hook)) return 'money-retiring'
  if (MONEY_WORKING_HOOKS.includes(hook)) return 'money-working'
  if (MONEY_ENERGY_HOOKS.includes(hook)) return 'money-energy'
  if (MONEY_PRAYER_HOOKS.includes(hook)) return 'money-prayer'
  return 'decode-him'
}

// Soulmate age-band (2026-08-19) — ONE angle, not four. The band lives in the ad set and
// never in the copy, so per-band reporting comes from the ad, not from the hook.
export const SOULMATE_AGEBAND_HOOKS: TarotHook[] = [
  'cards-slipping-past',
  'cards-choosing-wrong',
  'cards-found-me-yet',
  'cards-keeps-waiting',
  'cards-missed-chance',
  'cards-after-marriage',
  'cards-second-time',
  'cards-best-years',
  'cards-too-late-love',
  'cards-longer-to-wait',
  'cards-allowed-to-want',
]

// Soulmate keyword (2026-08-20) — one angle PER KEYWORD, because the keyword is the variable
// under test and it is carried by the hook. Mirrors the money family's four sub-angles.
export const KEYWORD_BLOCKED_HOOKS: TarotHook[] = [
  'cards-blocking-soulmate',
  'cards-blocked-before',
]

export const KEYWORD_CONNECTION_HOOKS: TarotHook[] = [
  'cards-connection-soulmate',
  'cards-connection-nothing',
]

export const KEYWORD_ENERGY_HOOKS: TarotHook[] = [
  'cards-energy-away',
  'cards-energy-soulmate',
]

export const KEYWORD_HEALING_HOOKS: TarotHook[] = [
  'cards-waiting-to-heal',
  'cards-heal-first',
]

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
  'cards-blocked-retiring',
  'cards-nest-egg',
  'cards-too-late',
  'cards-still-working',
  'cards-how-much-longer',
  'cards-out-of-time',
  'cards-my-energy',
  'cards-money-wont-stay',
  'cards-energy-how-long',
  'cards-prayed-years',
  'cards-prayers-unanswered',
  'cards-slipping-past',
  'cards-choosing-wrong',
  'cards-found-me-yet',
  'cards-keeps-waiting',
  'cards-missed-chance',
  'cards-after-marriage',
  'cards-second-time',
  'cards-best-years',
  'cards-too-late-love',
  'cards-longer-to-wait',
  'cards-allowed-to-want',
  'cards-blocking-soulmate',
  'cards-blocked-before',
  'cards-connection-soulmate',
  'cards-connection-nothing',
  'cards-energy-away',
  'cards-energy-soulmate',
  'cards-waiting-to-heal',
  'cards-heal-first',
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
  'cards-blocked-retiring': "Why is my money still blocked this close to retiring?",
  'cards-nest-egg': "How long has something been blocking me from a nest egg?",
  'cards-too-late': "Is something blocking my money, or did I just leave it too late?",
  'cards-still-working': "Why am I still working when the money should have come by now?",
  'cards-how-much-longer': "How much longer will something keep blocking my money?",
  'cards-out-of-time': "Is something still blocking my money, or have I run out of time?",
  'cards-my-energy': "Is my energy blocking my money?",
  'cards-money-wont-stay': "What does my energy say about why money won't stay?",
  'cards-energy-how-long': "How long has my energy been working against my money?",
  'cards-prayed-years': "I've prayed about money for years. What's still blocking it?",
  'cards-prayers-unanswered': "How long will my prayers for money keep going unanswered?",
  // Soulmate age-band (2026-08-19). Verbatim from docs/fb-ad-test-queue.md test A.
  'cards-slipping-past': 'Why does my soulmate keep slipping past me?',
  'cards-choosing-wrong': 'What keeps me choosing everyone but my soulmate?',
  'cards-found-me-yet': "Why hasn't my soulmate found me yet?",
  'cards-keeps-waiting': 'How long does a soulmate keep you waiting?',
  'cards-missed-chance': 'Is my soulmate still coming, or have I already missed him?',
  'cards-after-marriage': 'Is there a soulmate for me after the marriage ended?',
  'cards-second-time': 'How long does it take to find a soulmate the second time?',
  'cards-best-years': "Why did I give my best years to someone who wasn't my soulmate?",
  'cards-too-late-love': 'Is it too late to meet my soulmate?',
  'cards-longer-to-wait': 'How much longer do I have to wait for my soulmate?',
  'cards-allowed-to-want': 'Am I still allowed to want a soulmate?',
  // Soulmate keyword (2026-08-20). Verbatim from test B.
  'cards-blocking-soulmate': 'Is something blocking me from meeting my soulmate?',
  'cards-blocked-before': 'Why do I keep getting blocked before my soulmate arrives?',
  'cards-connection-soulmate': 'Is this connection my soulmate, or something else?',
  'cards-connection-nothing': 'Why does this connection feel like my soulmate when nothing is happening?',
  'cards-energy-away': 'Is my energy keeping my soulmate away?',
  'cards-energy-soulmate': 'What does my energy say about my soulmate?',
  'cards-waiting-to-heal': 'Is my soulmate waiting for me to heal?',
  'cards-heal-first': 'Do I need to heal before my soulmate arrives?',
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
  'cards-blocked-retiring': "Before I look closer, tell me… what was that money supposed to have made possible by now?",
  'cards-nest-egg': "Before I look closer, tell me… when did you first realise it wasn't building?",
  'cards-too-late': "Before I look closer, tell me… what is it you think you left too late?",
  'cards-still-working': "Before I look closer, tell me… what were you meant to be doing by now, instead of working?",
  'cards-how-much-longer': "Before I look closer, tell me… how long have you been telling yourself it is nearly turned?",
  'cards-out-of-time': "Before I look closer, tell me… when did you start counting the years ahead instead of the ones behind?",
  'cards-my-energy': "Before I look closer, tell me… what happens with money that made you start suspecting yourself?",
  'cards-money-wont-stay': "Before I look closer, tell me… where does it tend to go, when it goes?",
  'cards-energy-how-long': "Before I look closer, tell me… when did you first feel you were working against yourself?",
  'cards-prayed-years': "Before I look closer, tell me… what have you been asking for, in all those years?",
  'cards-prayers-unanswered': "Before I look closer, tell me… what would it look like, if it were answered tomorrow?",
  // Soulmate age-band (2026-08-19). ⚠ None of these asks her age, and none asks HOW LONG she
  // has waited — the family's defining ban is a duration, and an opener that invites her to
  // supply one hands the model the number it must not repeat.
  'cards-slipping-past': 'Before I look closer, tell me… when it starts to go quiet, what is the first thing you notice?',
  'cards-choosing-wrong': 'Before I look closer, tell me… what did the last one show you at the start that turned out not to be true?',
  'cards-found-me-yet': 'Before I look closer, tell me… what reason have you settled on for why it has not happened?',
  'cards-keeps-waiting': 'Before I look closer, tell me… what does the waiting actually take out of you?',
  'cards-missed-chance': 'Before I look closer, tell me… which moment do you keep going back to?',
  'cards-after-marriage': 'Before I look closer, tell me… what have you told yourself about starting again?',
  'cards-second-time': 'Before I look closer, tell me… what do you carry now that you did not carry the first time?',
  'cards-best-years': 'Before I look closer, tell me… when you count those years up, what is the part that stings?',
  'cards-too-late-love': 'Before I look closer, tell me… when did late first start to feel like the right word?',
  'cards-longer-to-wait': 'Before I look closer, tell me… what would it change for you, to be told a number?',
  'cards-allowed-to-want': 'Before I look closer, tell me… what do you add on the end when you say it out loud?',
  // Soulmate keyword (2026-08-20). ⚠ The healing and energy openers ask what she was TOLD or
  // what it COSTS, never what is wrong with her — the headline already put that on the table.
  'cards-blocking-soulmate': 'Before I look closer, tell me… what have you already been told is in the way?',
  'cards-blocked-before': 'Before I look closer, tell me… how far does it usually get before it stops?',
  'cards-connection-soulmate': 'Before I look closer, tell me… what made you start looking for a name for it?',
  'cards-connection-nothing': 'Before I look closer, tell me… what do you tell yourself on the days nothing comes?',
  'cards-energy-away': 'Before I look closer, tell me… what takes the most out of you in a week?',
  'cards-energy-soulmate': 'Before I look closer, tell me… when did you last feel like yourself about this?',
  'cards-waiting-to-heal': 'Before I look closer, tell me… what were you told you had to do first?',
  'cards-heal-first': 'Before I look closer, tell me… what is at the top of the list, before love?',
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
  // Per-hook override of `instruction`, for hooks the deck's own line does not fit. The
  // money hooks need it: return-mhf says "Think of the man on your mind", which is the wrong
  // sentence entirely in front of a woman who clicked an ad about her pension. Additive —
  // every hook without an entry keeps the deck line. Read it through instructionFor().
  hookInstruction?: Partial<Record<TarotHook, string>>
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-love-again.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — the roses over his head are fully out.",
        "You asked if you'll love again. Your hand went to the man who can still make things.",
        "So yes, dear. The part of you that loves isn't used up.\nAnd the roses are out again, dear. They come back every winter.\nBut you've been told otherwise, dear. I don't think that was true.\nThat's why you look yourself over for damage, dear. There's none to find.",
        "Let me look closer at what has been sitting over that part of you…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — the gold at his head is the brightest thing on the card.",
        "You asked if you'll love again. Your hand went to the card that pauses before a turn.",
        "So you've been in a pause, dear. Not an ending.\nAnd the gold is brightest at the very point of hanging, dear.\nBut something in you kept its light through all of it, dear.\nThat's why things can still move you, dear. It is all intact.",
        "Let me look closer at what has been dimming it from outside…",
      ],
      c: [
        "You chose the Fool, dear. Look — the flower in his hand is fresh and white.",
        "You asked if you'll love again. Your hand went to the one who begins again.",
        "So beginning again is the whole of this card, dear.\nAnd the flower is fresh, dear, and he carries it forward with him.\nBut you've been told you carry a dead thing, dear. You carry that.\nThat's why it feels so heavy, dear. You've held it up alone.",
        "Let me look closer at what has been weighing on your hands…",
      ],
    },
    // Self-frame — when her soulmate arrives. Affirm the hopeful yes; answer the
    // "when" as a leaning ("nearer than you fear"), NEVER a date.
    'cards-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — his right hand holds a white rod straight at the sky.",
        "You asked when your soulmate is coming. Your hand went to the man who makes things happen.",
        "So yes, dear. Something is on its way to being made.\nAnd his hand is up, dear, because a thing is being made now.\nBut no date from me, dear. Nobody honest would give one.\nThat's why the wait has felt so long, dear. No one gave you a marker.",
        "Let me look closer at what still stands in the way…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — the tree he hangs in is still green and alive.",
        "You asked when your soulmate is coming. Your hand went to the card of a last stretch.",
        "So you're on the last stretch, dear. Not the whole road.\nAnd the tree is still green, dear, right through the hanging.\nBut a pause isn't a stop, dear, and you have been in one.\nThat's why believing through it took so much, dear. It wasn't silly.",
        "Let me look closer at what has been holding this pause open…",
      ],
      c: [
        "You chose the Fool, dear. Look — he's walking into open air with his chin up.",
        "You asked when your soulmate is coming. Your hand went to the one who steps first.",
        "So something begins here, dear. That is what this card is.\nAnd he's already moving, dear, before he can see the end of it.\nBut no date, dear, and no name. That part isn't mine to give.\nThat's why the road looks empty, dear. You are already on it.",
        "Let me look closer at what's standing on that road…",
      ],
    },
    // Decode-him — reads HIM as a TENDENCY, never a verdict; affirm HER intuition.
    'cards-honest': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-honest.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — he looks straight out at you, and his mouth is closed.",
        "You asked if he's being honest with you. Your hand went to the man who tells it well.",
        "So what you're short of is a fact, dear. Not sense, and not calm.\nAnd look how he holds himself. He's very good at how a thing is put.\nBut a smooth account isn't proof either way, dear.\nThat's why his answers land fine, dear, and you still go back over them.",
        "Let me look closer at what stands between you and the whole story…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — the whole card is upright but him.",
        "You asked if he's being honest with you. Your hand went to the card that shows one side.",
        "So you've only ever had one side of this, dear. The card is blunt about that.\nAnd the other side of it sits with him, dear. It always has.\nBut you can't weigh a thing you were never shown, dear.\nThat's why he explains it, dear, and an hour later you're still checking.",
        "Let me look closer at what's keeping the other side out of view…",
      ],
      c: [
        "You chose the Fool, dear. Look — a small white dog up on its back legs beside him.",
        "You asked if he's being honest with you. Your hand went to the one still on the road.",
        "So this story isn't finished, dear. Nothing about it has been closed.\nAnd look at the little dog, dear. Up on its back legs, trying to tell him.\nBut a warning with no words in it is all you've had, dear.\nThat's why you ask again in a good week, dear, when nothing has gone wrong.",
        "Let me look closer at what has been standing in the way of the truth…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-cheating.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — his table stands on the grass, out in the open.",
        "You asked if he has been true to you. Your hand went to the man who sets the scene.",
        "So the distance is real, dear. I will not talk you out of it.\nAnd a scene like that gets set on purpose, dear. Look at his table.\nBut what's set out isn't the same as what's so, dear.\nThat's why you can sit through a fine evening, dear, and still feel outside it.",
        "Let me look closer at what stands between you and the plain view…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — red trousers, a blue tunic, and gold light at his head.",
        "You asked if he has been true to you. Your hand went to the card left up in the air.",
        "So you've been left hanging in this, dear. Nobody has put an end to it.\nAnd no answer ever came, dear. Unease turns into a way of living.\nBut nothing has gone wrong on paper, dear. You still live braced.\nThat's why there's nothing to point at, dear, and you check anyway.",
        "Let me look closer at what has kept this hanging over you…",
      ],
      c: [
        "You chose the Fool, dear. Look — the dog is the only other living thing on his card.",
        "You asked if he has been true to you. Your hand went to the one who doesn't look down.",
        "So something has been moving, dear. You felt the ground change.\nAnd look at the dog, dear. Up on its legs, and he walks on.\nBut the card won't name what's coming, dear. Nobody can from here.\nThat's why you've been watching him for weeks, dear, and found nothing to hold.",
        "Let me look closer at what has been shifting under you…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-real-person.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — his front is all you get; his back is off the card.",
        "You asked if he's the real person or just a picture. Your hand went to the man who makes images.",
        "So something has kept you from reaching him, dear. That's real, not nerves.\nAnd a made picture can be very good, dear. Good enough to hold up.\nBut I won't tell you he's real, dear, and I won't call him false.\nThat's why you go quiet when a friend asks, dear. You've no proof either way.",
        "Let me look closer at what stands between you and meeting the man…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — the beam holds him up, and you can't see what holds the beam.",
        "You asked if he's the real person or just a picture. Your hand went to the card held up by something unseen.",
        "So you're being asked to take this on trust, dear. All of it.\nAnd what holds him up is off the card. You can't see it from here.\nBut nobody can check a thing they have never been shown, dear.\nThat's why it never quite settles, dear. Nothing has answered it.",
        "Let me look closer at what's keeping this out of your reach…",
      ],
      c: [
        "You chose the Fool, dear. Look — his face is turned up, so you never quite meet his eye.",
        "You asked if he's the real person or just a picture. Your hand went to the one whose face you can't catch.",
        "So you've been reaching for something that keeps moving, dear.\nAnd he's always mid-step, dear. Never still long enough to be seen.\nBut the card shows me no face to check him against, dear.\nThat's why every plan to meet slides a week, dear. Something always comes up.",
        "Let me look closer at what keeps this from getting real…",
      ],
    },
    // 'Am I being misled?' — restore trust in HER OWN perception; she arrives self-doubting.
    'cards-misled': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-misled.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — the four things on his table don't match each other.",
        "You asked if you're being misled. Your hand went to the man who arranges things.",
        "So two things you were given don't fit, dear. You saw that yourself.\nAnd there on his table, four things, and no two of them alike.\nBut a mismatch tells you nothing about why, dear. Only that it's there.\nThat's why you keep going back over what he said, lining it up.",
        "Let me look closer at what stands between you and a story that fits…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — from where you stand, his face is where his feet should be.",
        "You asked if you're being misled. Your hand went to the card that flips a view.",
        "So the muddle is in the picture, dear. It isn't in you.\nAnd you've been handed this the wrong way up, dear.\nBut nobody has turned it round for you, dear. You've had to do it.\nThat's why working it out takes you hours. It arrives upside down, dear.",
        "Let me look closer at what has been turning this around on you…",
      ],
      c: [
        "You chose the Fool, dear. Look — the rocks he stands on are cut in flat layers.",
        "You asked if you're being misled. Your hand went to the one who doesn't check his footing.",
        "So you've been asked to walk without checking, dear. That's what feels wrong.\nAnd he's one step from a drop, dear, and looking the other way.\nBut this card names nothing about what sits under it, dear.\nThat's why checking felt like doubt to you. Checking is just looking, dear.",
        "Let me look closer at what has been hidden under this…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-wont-commit.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — a white band round his dark hair.",
        "You asked why he won't commit to you. Your hand went to the man who decides.",
        "So the hold on this isn't yours, dear. Nothing you did put it there.\nAnd the tools for building are all laid out in front of him, dear.\nBut having the tools is not the same as picking them up, dear.\nThat's why you get the words, dear, and the week after looks the same.",
        "Let me look closer at what stands in the way of a choice…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — his arms are out of sight, and his body makes a triangle.",
        "You asked why he won't commit to you. Your hand went to the card that stalls.",
        "So something has him stuck, dear. You've been feeling exactly that.\nAnd his arms are out of sight, dear. You can't see what he's holding.\nBut where he is stuck is his to name, dear. Not mine, and not yours.\nThat's why every reason you land on slides off, dear. None of them stick.",
        "Let me look closer at what has this stuck in place…",
      ],
      c: [
        "You chose the Fool, dear. Look — the little dog has its tail straight up.",
        "You asked why he won't commit to you. Your hand went to the one who ties nothing down.",
        "So nothing in his life is tied down, dear. You saw that early.\nAnd the little dog has its tail straight up, dear. It knows the mood.\nBut loose isn't the same as gone, dear. He still walks beside you.\nThat's why asking for more never turns into a row. It just slides off.",
        "Let me look closer at what has been keeping this loose…",
      ],
    },
    'cards-ready-commit': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-ready-commit.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Magician, dear. Look — the table hides him from the waist down.",
        "You asked if he will be ready for real commitment. Your hand went to the man who builds.",
        "So he will get there, dear. This card is a man who builds things.\nAnd the making of it is already in his hands, dear.\nBut the table hides him from the waist down. You can't see his footing.\nThat's why he can talk about a future, dear. He never steps toward it.",
        "Let me look closer at what sits in the gap between you…",
      ],
      b: [
        "You chose the Hanged Man, dear. Look — one shoe points down, and the other points out sideways.",
        "You asked if he will be ready for real commitment. Your hand went to the card that stops the clock.",
        "So he has stopped in one spot, dear. Stopped is not finished.\nAnd look at his feet. One shoe points down, one points off sideways.\nBut I won't name a day for you, dear. There's no day on this card.\nThat's why it stalls at the very same place, dear, every single time.",
        "Let me look closer at what keeps stopping this at the same spot…",
      ],
      c: [
        "You chose the Fool, dear. Look — a small circle floats above him, next to a big bright sun.",
        "You asked if he will be ready for real commitment. Your hand went to the one who hasn't chosen.",
        "So nothing has been chosen yet, dear. Nothing has been ruled out either.\nAnd he's stepping out with no one thing in mind, dear.\nBut you know exactly what you're ready for. That's the difference here.\nThat's why you wait for him to catch up, dear. You got there first.",
        "Let me look closer at what stands between you and a real choice…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-honest.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Emperor, dear. Look — armour on his legs, and a stone chair he doesn't leave.",
        "You asked if he's being honest with you. Your hand went to the man who states things.",
        "So you've had rulings from him, dear, and no reasons to go with them.\nAnd a man on a stone chair doesn't explain himself much.\nBut a firm answer isn't the same as a full one, dear.\nThat's why you stopped asking twice, dear. The first answer closed the door.",
        "Let me look closer at what sits between you and the real reason…",
      ],
      b: [
        "You chose the Empress, dear. Look — a field of wheat at her feet, and trees behind her.",
        "You asked if he's being honest with you. Your hand went to the softest card in this deck.",
        "So the warmth was real, dear. That much this card will give you.\nAnd look at the wheat, dear. You can't see the ground through it.\nBut feeling loved and being told the facts are two different things.\nThat's why the evening can be lovely, dear. You still don't know where you stand.",
        "Let me look closer at what stands between you and the plain facts…",
      ],
      c: [
        "You chose the Fool, dear. Look — a small white dog up on its back legs beside him.",
        "You asked if he's being honest with you. Your hand went to the one still on the road.",
        "So this story isn't finished, dear. Nothing about it has been closed.\nAnd look at the little dog, dear. Up on its back legs, trying to tell him.\nBut a warning with no words in it is all you've had, dear.\nThat's why you ask again in a good week, dear, when nothing has gone wrong.",
        "Let me look closer at what has been standing in the way of the truth…",
      ],
    },
    'cards-love-again': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-love-again.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Emperor, dear. Look — his beard is long and white and reaches his chest.",
        "You asked if you'll love again. Your hand went to the man who has seen a great deal.",
        "So you've come a long way, dear. It shows, and it should.\nAnd he's old and seated, dear, and still holding the whole thing up.\nBut a long past doesn't use a person up, dear.\nThat's why the years have felt like a loss, dear. They never were.",
        "Let me look closer at what has been taking from that count…",
      ],
      b: [
        "You chose the Empress, dear. Look — the trees behind her are dark green and close together.",
        "You asked if you'll love again. Your hand went to the card of things that grow back.",
        "So things grow back, dear. That is what she is.\nAnd the trees behind her are thick, dear, and none of it was forced.\nBut you don't have to make it happen by trying, dear.\nThat's why the trying has worn you out, dear. It was never the problem.",
        "Let me look closer at what has been shading this over…",
      ],
      c: [
        "You chose the Fool, dear. Look — the flower in his hand is fresh and white.",
        "You asked if you'll love again. Your hand went to the one who begins again.",
        "So beginning again is the whole of this card, dear.\nAnd the flower is fresh, dear, and he carries it forward with him.\nBut you've been told you carry a dead thing, dear. You carry that.\nThat's why it feels so heavy, dear. You've held it up alone.",
        "Let me look closer at what has been weighing on your hands…",
      ],
    },
    // Self-frame — when her soulmate arrives. Affirm the hopeful yes; answer the
    // "when" as a leaning ("nearer than you fear"), NEVER a date.
    'cards-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Emperor, dear. Look — he holds a gold ball in his left hand.",
        "You asked when your soulmate is coming. Your hand went to the man who builds to last.",
        "So what you're holding out for is solid, dear. It does exist.\nAnd the gold in his hand is weighty, dear, and meant to keep.\nBut you've turned down things that wouldn't have lasted, dear.\nThat's why it has taken this long, dear. You knew your own worth.",
        "Let me look closer at what still sits between you and it…",
      ],
      b: [
        "You chose the Empress, dear. Look — twelve stars in the crown on her head.",
        "You asked when your soulmate is coming. Your hand went to the warmest woman in the deck.",
        "So this card is full, dear. There's nothing empty in it.\nAnd her crown has twelve stars, dear, and every one is lit.\nBut you've held the door open a long time, dear. That costs.\nThat's why waiting wears you, dear. The holding is the heavy part.",
        "Let me look closer at what has been sitting in that doorway…",
      ],
      c: [
        "You chose the Fool, dear. Look — he's walking into open air with his chin up.",
        "You asked when your soulmate is coming. Your hand went to the one who steps first.",
        "So something begins here, dear. That is what this card is.\nAnd he's already moving, dear, before he can see the end of it.\nBut no date, dear, and no name. That part isn't mine to give.\nThat's why the road looks empty, dear. You are already on it.",
        "Let me look closer at what's standing on that road…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-cheating.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You chose the Emperor, dear. Look — a bare grey mountain behind him, and no green on it.",
        "You asked if he has been true to you. Your hand went to the man who gives orders.",
        "So the cold you felt is real, dear. Look behind him — bare rock, nothing growing.\nAnd he answers like a man reading out a rule, dear.\nBut a rule doesn't tell you what sits under it, dear.\nThat's why you let it drop, dear. The answer never changed.",
        "Let me look closer at what has been standing where the warmth was…",
      ],
      b: [
        "You chose the Empress, dear. Look — a crown of stars, and red fruit all over her gown.",
        "You asked if he has been true to you. Your hand went to the card of plenty.",
        "So the good part was real, dear. Look at her — every fruit on her is ripe.\nAnd plenty is not the same as only yours, dear.\nBut no one has ever told you which one this is.\nThat's why Sunday can be good, dear. By Wednesday you're counting again.",
        "Let me look closer at what keeps this from being wholly yours…",
      ],
      c: [
        "You chose the Fool, dear. Look — the dog is the only other living thing on his card.",
        "You asked if he has been true to you. Your hand went to the one who doesn't look down.",
        "So something has been moving, dear. You felt the ground change.\nAnd look at the dog, dear. Up on its legs, and he walks on.\nBut the card won't name what's coming, dear. Nobody can from here.\nThat's why you've been watching him for weeks, dear, and found nothing to hold.",
        "Let me look closer at what has been shifting under you…",
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
  // The money hooks may not say "Think of the man on your mind" to a woman who clicked an ad
  // about her pension, and the instruction lives on the deck rather than the hook — so these
  // eleven override it. Everything else on every deck is untouched.
  hookInstruction: {
    'cards-blocked-retiring': "Think of the money that never came. Tap the card that calls you.",
    'cards-nest-egg': "Think of the money that never came. Tap the card that calls you.",
    'cards-too-late': "Think of the money that never came. Tap the card that calls you.",
    'cards-still-working': "Think of the money that never came. Tap the card that calls you.",
    'cards-how-much-longer': "Think of the money that never came. Tap the card that calls you.",
    'cards-out-of-time': "Think of the money that never came. Tap the card that calls you.",
    'cards-my-energy': "Think of the money that never came. Tap the card that calls you.",
    'cards-money-wont-stay': "Think of the money that never came. Tap the card that calls you.",
    'cards-energy-how-long': "Think of the money that never came. Tap the card that calls you.",
    'cards-prayed-years': "Think of the money that never came. Tap the card that calls you.",
    'cards-prayers-unanswered': "Think of the money that never came. Tap the card that calls you.",
  },
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-honest.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he looks straight out at you, and his mouth is closed.",
        "You asked if he's being honest with you. Your hand went to the man who tells it well.",
        "So what you're short of is a fact, dear. Not sense, and not calm.\nAnd look how he holds himself. He's very good at how a thing is put.\nBut a smooth account isn't proof either way, dear.\nThat's why his answers land fine, dear, and you still go back over them.",
        "Let me look closer at what stands between you and the whole story…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the whole card is upright but him.",
        "You asked if he's being honest with you. Your hand went to the card that shows one side.",
        "So you've only ever had one side of this, dear. The card is blunt about that.\nAnd the other side of it sits with him, dear. It always has.\nBut you can't weigh a thing you were never shown, dear.\nThat's why he explains it, dear, and an hour later you're still checking.",
        "Let me look closer at what's keeping the other side out of view…",
      ],
      c: [
        "You turned the Fool, dear. Look — a small white dog up on its back legs beside him.",
        "You asked if he's being honest with you. Your hand went to the one still on the road.",
        "So this story isn't finished, dear. Nothing about it has been closed.\nAnd look at the little dog, dear. Up on its back legs, trying to tell him.\nBut a warning with no words in it is all you've had, dear.\nThat's why you ask again in a good week, dear, when nothing has gone wrong.",
        "Let me look closer at what has been standing in the way of the truth…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-cheating.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his table stands on the grass, out in the open.",
        "You asked if he has been true to you. Your hand went to the man who sets the scene.",
        "So the distance is real, dear. I will not talk you out of it.\nAnd a scene like that gets set on purpose, dear. Look at his table.\nBut what's set out isn't the same as what's so, dear.\nThat's why you can sit through a fine evening, dear, and still feel outside it.",
        "Let me look closer at what stands between you and the plain view…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — red trousers, a blue tunic, and gold light at his head.",
        "You asked if he has been true to you. Your hand went to the card left up in the air.",
        "So you've been left hanging in this, dear. Nobody has put an end to it.\nAnd no answer ever came, dear. Unease turns into a way of living.\nBut nothing has gone wrong on paper, dear. You still live braced.\nThat's why there's nothing to point at, dear, and you check anyway.",
        "Let me look closer at what has kept this hanging over you…",
      ],
      c: [
        "You turned the Fool, dear. Look — the dog is the only other living thing on his card.",
        "You asked if he has been true to you. Your hand went to the one who doesn't look down.",
        "So something has been moving, dear. You felt the ground change.\nAnd look at the dog, dear. Up on its legs, and he walks on.\nBut the card won't name what's coming, dear. Nobody can from here.\nThat's why you've been watching him for weeks, dear, and found nothing to hold.",
        "Let me look closer at what has been shifting under you…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-real-person.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his front is all you get; his back is off the card.",
        "You asked if he's the real person or just a picture. Your hand went to the man who makes images.",
        "So something has kept you from reaching him, dear. That's real, not nerves.\nAnd a made picture can be very good, dear. Good enough to hold up.\nBut I won't tell you he's real, dear, and I won't call him false.\nThat's why you go quiet when a friend asks, dear. You've no proof either way.",
        "Let me look closer at what stands between you and meeting the man…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam holds him up, and you can't see what holds the beam.",
        "You asked if he's the real person or just a picture. Your hand went to the card held up by something unseen.",
        "So you're being asked to take this on trust, dear. All of it.\nAnd what holds him up is off the card. You can't see it from here.\nBut nobody can check a thing they have never been shown, dear.\nThat's why it never quite settles, dear. Nothing has answered it.",
        "Let me look closer at what's keeping this out of your reach…",
      ],
      c: [
        "You turned the Fool, dear. Look — his face is turned up, so you never quite meet his eye.",
        "You asked if he's the real person or just a picture. Your hand went to the one whose face you can't catch.",
        "So you've been reaching for something that keeps moving, dear.\nAnd he's always mid-step, dear. Never still long enough to be seen.\nBut the card shows me no face to check him against, dear.\nThat's why every plan to meet slides a week, dear. Something always comes up.",
        "Let me look closer at what keeps this from getting real…",
      ],
    },
    // 'Am I being misled?' — the account she's been given vs what she has seen. The
    // win is restoring trust in HER OWN perception; she arrives already self-doubting.
    'cards-misled': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-misled.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the four things on his table don't match each other.",
        "You asked if you're being misled. Your hand went to the man who arranges things.",
        "So two things you were given don't fit, dear. You saw that yourself.\nAnd there on his table, four things, and no two of them alike.\nBut a mismatch tells you nothing about why, dear. Only that it's there.\nThat's why you keep going back over what he said, lining it up.",
        "Let me look closer at what stands between you and a story that fits…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — from where you stand, his face is where his feet should be.",
        "You asked if you're being misled. Your hand went to the card that flips a view.",
        "So the muddle is in the picture, dear. It isn't in you.\nAnd you've been handed this the wrong way up, dear.\nBut nobody has turned it round for you, dear. You've had to do it.\nThat's why working it out takes you hours. It arrives upside down, dear.",
        "Let me look closer at what has been turning this around on you…",
      ],
      c: [
        "You turned the Fool, dear. Look — the rocks he stands on are cut in flat layers.",
        "You asked if you're being misled. Your hand went to the one who doesn't check his footing.",
        "So you've been asked to walk without checking, dear. That's what feels wrong.\nAnd he's one step from a drop, dear, and looking the other way.\nBut this card names nothing about what sits under it, dear.\nThat's why checking felt like doubt to you. Checking is just looking, dear.",
        "Let me look closer at what has been hidden under this…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-lied-to.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his belt sits low and dark against the red robe.",
        "You asked if you're being lied to. Your hand went to the man with a practised hand.",
        "So no honest reader can settle this for you, dear. I won't pretend.\nAnd a hand that practised is hard to read from outside, dear.\nBut you've gone over this again and again, dear. Something snagged.\nThat's why you return to it, dear. Your ear caught on something.",
        "Let me look closer at what your ear keeps catching on…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his knees are bent and one is behind the other.",
        "You asked if you're being lied to. Your hand went to the card that holds a thing open.",
        "So the question won't resolve, dear. Not from where you stand.\nAnd half the shape is behind the other half, dear.\nBut you can't see round it, dear, and neither can I.\nThat's why the choice sits wrong, dear. You've had half a picture.",
        "Let me look closer at what has been hiding the other half…",
      ],
      c: [
        "You turned the Fool, dear. Look — his sleeve ends in a wide pale cuff.",
        "You asked if you're being lied to. Your hand went to the one with nothing up his sleeve.",
        "So you wanted someone with nothing up the sleeve, dear.\nAnd he's open, dear. Plain, and carrying no trick at all.\nBut that's exactly what's been missing, dear. I think you know it.\nThat's why wanting it plain feels like blame, dear. It isn't blame.",
        "Let me look closer at what sits between you and plain dealing…",
      ],
    },
    // 'Is he telling me the truth?' — not "is he lying" but "is this the WHOLE of it".
    'cards-truth': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-truth.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his sleeve falls in heavy folds from the raised arm.",
        "You asked about the truth of it. Your hand went to the man who chooses what to show.",
        "So you've been given an account, dear. Not the whole of it.\nAnd he shows exactly what he means to show, dear. No more.\nBut a tidy account can still miss pieces, dear.\nThat's why it sounds fine, dear, and something in it still catches.",
        "Let me look closer at what stands between you and the whole of it…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his tied foot is higher than his head.",
        "You asked about the truth of it. Your hand went to the card that shows the other way up.",
        "So there's another way up to this, dear. You've only had one.\nAnd what's true from up there looks odd from down here, dear.\nBut two people can both be honest and still not match, dear.\nThat's why it stays open, dear, however long you sit with it.",
        "Let me look closer at what keeps the two views apart…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun's rays are drawn as straight lines out from it.",
        "You asked about the truth of it. Your hand went to the plainest card in the deck.",
        "So you want it plain, dear. Straight lines, like those rays.\nAnd nothing about him is put on for show, dear.\nBut what you've been handed is arranged, dear. That's the difference.\nThat's why plain talk feels like too much to ask. It isn't, dear.",
        "Let me look closer at what has been bending this out of shape…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-deceived.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his right arm is straight up and quite still.",
        "You asked about being deceived. Your hand went to the man who sets a whole scene.",
        "So deceived is a big word, dear. It means the whole picture.\nAnd he sets out all of it himself, dear. Every piece.\nBut a whole picture is harder to check than one line, dear.\nThat's why nothing pins down, dear. You're checking it all at once.",
        "Let me look closer at what has been arranged around you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the wood he hangs from is a single cut beam.",
        "You asked about being deceived. Your hand went to the card that turns a whole picture over.",
        "So you've been trying to turn the whole thing over, dear.\nAnd there's one view of him, dear, and no way to walk round it.\nBut the shape of what you can't see isn't mine to give, dear.\nThat's why the not-seeing has worn you down. You've carried it alone, dear.",
        "Let me look closer at what has been keeping this side-on to you…",
      ],
      c: [
        "You turned the Fool, dear. Look — his tunic is patterned all over with small shapes.",
        "You asked about being deceived. Your hand went to the one who wears no disguise.",
        "So one odd piece doesn't tell you the whole design, dear.\nAnd his coat has many small shapes, dear, and only one pattern.\nBut you've been holding the pieces up one at a time, dear.\nThat's why nothing has come together yet, dear. You were right to look.",
        "Let me look closer at what has been holding the pattern out of view…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-wont-commit.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a white band round his dark hair.",
        "You asked why he won't commit to you. Your hand went to the man who decides.",
        "So the hold on this isn't yours, dear. Nothing you did put it there.\nAnd the tools for building are all laid out in front of him, dear.\nBut having the tools is not the same as picking them up, dear.\nThat's why you get the words, dear, and the week after looks the same.",
        "Let me look closer at what stands in the way of a choice…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his arms are out of sight, and his body makes a triangle.",
        "You asked why he won't commit to you. Your hand went to the card that stalls.",
        "So something has him stuck, dear. You've been feeling exactly that.\nAnd his arms are out of sight, dear. You can't see what he's holding.\nBut where he is stuck is his to name, dear. Not mine, and not yours.\nThat's why every reason you land on slides off, dear. None of them stick.",
        "Let me look closer at what has this stuck in place…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog has its tail straight up.",
        "You asked why he won't commit to you. Your hand went to the one who ties nothing down.",
        "So nothing in his life is tied down, dear. You saw that early.\nAnd the little dog has its tail straight up, dear. It knows the mood.\nBut loose isn't the same as gone, dear. He still walks beside you.\nThat's why asking for more never turns into a row. It just slides off.",
        "Let me look closer at what has been keeping this loose…",
      ],
    },
    'cards-ready-commit': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-ready-commit.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the table hides him from the waist down.",
        "You asked if he will be ready for real commitment. Your hand went to the man who builds.",
        "So he will get there, dear. This card is a man who builds things.\nAnd the making of it is already in his hands, dear.\nBut the table hides him from the waist down. You can't see his footing.\nThat's why he can talk about a future, dear. He never steps toward it.",
        "Let me look closer at what sits in the gap between you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one shoe points down, and the other points out sideways.",
        "You asked if he will be ready for real commitment. Your hand went to the card that stops the clock.",
        "So he has stopped in one spot, dear. Stopped is not finished.\nAnd look at his feet. One shoe points down, one points off sideways.\nBut I won't name a day for you, dear. There's no day on this card.\nThat's why it stalls at the very same place, dear, every single time.",
        "Let me look closer at what keeps stopping this at the same spot…",
      ],
      c: [
        "You turned the Fool, dear. Look — a small circle floats above him, next to a big bright sun.",
        "You asked if he will be ready for real commitment. Your hand went to the one who hasn't chosen.",
        "So nothing has been chosen yet, dear. Nothing has been ruled out either.\nAnd he's stepping out with no one thing in mind, dear.\nBut you know exactly what you're ready for. That's the difference here.\nThat's why you wait for him to catch up, dear. You got there first.",
        "Let me look closer at what stands between you and a real choice…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-come-back.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the roses above him are wide open, not in bud.",
        "You asked about him coming back. Your hand went to the man who does the doing.",
        "So this hasn't closed, dear. The door you've held is still open.\nAnd it's one person doing all the holding, dear. Look at him.\nBut holding a door open takes it out of you, dear. Every day.\nThat's why you're worn thin, dear. Nobody offered to take a turn.",
        "Let me look closer at what has been wedged in that doorway…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the crossbar sits just above his tied foot.",
        "You asked about him coming back. Your hand went to the card that neither opens nor shuts.",
        "So the door has neither opened nor shut, dear. It just hangs there.\nAnd he's fixed in place, dear, with no news arriving either way.\nBut you've been standing in the same spot with it, dear.\nThat's why the wait sits so heavy on you, dear. It has just been long.",
        "Let me look closer at what has kept this fixed so long…",
      ],
      c: [
        "You turned the Fool, dear. Look — his cap has a feather and a small green sprig.",
        "You asked about him coming back. Your hand went to the one who keeps moving.",
        "So you kept your life going, dear. You have not stopped.\nAnd he's loaded up, dear, and still putting one foot out.\nBut the card won't say who walks towards whom, dear.\nThat's why the road keeps pulling your eye, dear. You've done the walking.",
        "Let me look closer at what has been slowing the road between you…",
      ],
    },
    // 'Will he ever come back to me?' — the "ever" is the wound. She has waited a long
    // time and has begun to fear the waiting itself was the mistake.
    //
    // ⚠ Same shape of harm as cards-wont-commit and cards-deceived: nothing may land as
    // her having been foolish to wait. The reads name her constancy as the thing that was
    // never wasted, and stay honest that anything reopening would BEGIN rather than resume.
    'cards-ever-back': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-ever-back.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his left hand points down at the white lilies.",
        "You asked if he will ever come back to you. Your hand went to the man rooted in now.",
        "So the question has stretched, dear. You began by asking about a week.\nAnd both his hands are in the present, dear. Nothing of his is ahead.\nBut now you're asking about the rest of your life, dear.\nThat's why the word ever slipped in, dear. It came without you noticing.",
        "Let me look closer at what has stretched this out so far…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — you can see pale sky right through the gap under him.",
        "You asked if he will ever come back to you. Your hand went to the card that keeps a thing hanging.",
        "So nothing has ended, dear, and the card gives no end date.\nAnd he's held there, dear, with pale sky showing right through the gap.\nBut ever isn't about him any more, dear. It's about you.\nThat's why the question got heavier, dear. You changed what you were asking.",
        "Let me look closer at what has been holding you in place…",
      ],
      c: [
        "You turned the Fool, dear. Look — the bundle is red and tied with a small knot.",
        "You asked if he will ever come back to you. Your hand went to the one who packs and goes.",
        "So you're still able to move, dear. That's what this card shows me.\nAnd nothing weighs him down, dear. He's packed and ready to go.\nBut you've kept your own bag packed for a long time, dear.\nThat's why standing still costs you so much, dear. You were made to move.",
        "Let me look closer at what has been keeping you standing still…",
      ],
    },
    // 'Is he coming back, or has he moved on?' — a binary, and the read REFUSES it.
    //
    // ⚠ Picking either side is a failure: one is a promise, the other a pronouncement.
    // The read's job is to name the not-knowing as the real burden and put it back where
    // it belongs — with the person who has left her to deduce it from silence.
    'cards-moved-on': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-moved-on.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a gold cup, a coin, and two long things beside them.",
        "You asked about coming back, or moving on. Your hand went to the man who lays things out.",
        "So I will not pick either one, dear. Neither box is filled yet.\nAnd four things lie on that wood, dear, and none above another.\nBut those two boxes came out of long waiting, dear. Not out of him.\nThat's why sorting him has never worked, dear. He hasn't been sorted.",
        "Let me look closer at what has kept this question open…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the light behind his head doesn't touch the rest of him.",
        "You asked about coming back, or moving on. Your hand went to the card that refuses to land.",
        "So this card declines to land, dear. So will I.\nAnd he's between, dear, and content to stay between.\nBut neither of your boxes has anything in it yet, dear.\nThat's why the two swap places all day, dear. Hour by hour.",
        "Let me look closer at what has been holding this between…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sky is gold and there's not one cloud in it.",
        "You asked about coming back, or moving on. Your hand went to the one who files nobody.",
        "So the Fool will not sort him for you, dear. Nor will I.\nAnd he's still walking, dear, with nothing filed behind him.\nBut that answer sits with one person, dear, and he hasn't given it.\nThat's why you built two boxes, dear. Standing in nothing is hard.",
        "Let me look closer at what has kept you standing between them…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-cant-stop.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — both his hands are busy and neither is resting.",
        "You asked why you can't stop thinking about him. Your hand went to the man who can't put it down.",
        "So you've been trying to stop by force, dear. That's the tiring bit.\nAnd his hands are busy, dear, with no off switch anywhere on him.\nBut a mind doesn't take orders like that, dear. Not one.\nThat's why the trying costs you more than the thinking does, dear.",
        "Let me look closer at what has kept you fighting your own head…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he's quite still and nothing about him is resolved.",
        "You asked why you can't stop thinking about him. Your hand went to the card that stays open.",
        "So this is still open, dear. That's the whole of it.\nAnd nothing is closed off on his card, dear. Nothing put away.\nBut open things keep asking to be closed, dear.\nThat's why he turns up at two in the morning, dear. Nobody asked him.",
        "Let me look closer at what has held this open…",
      ],
      c: [
        "You turned the Fool, dear. Look — the road under him runs right up to the edge.",
        "You asked why you can't stop thinking about him. Your hand went to the one who walks with it.",
        "So he walks and thinks at once, dear. He stops for neither.\nAnd he's moving, dear, with the whole load still on his back.\nBut you were told to stop before you could carry on, dear.\nThat's why stopping felt like the only way out, dear. It never was.",
        "Let me look closer at what made stopping the only option…",
      ],
    },
    // 'Why is he always on my mind?' — not effort, but the SIZE of the room he still has.
    'cards-on-my-mind': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-on-my-mind.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his workbench is full and there's no space left on it.",
        "You asked why he's always on your mind. Your hand went to the man whose bench is full.",
        "So there's no room left, dear. That's what full looks like.\nAnd there's not one clear space on that wood, dear.\nBut an open thing takes up room, dear. It doesn't ask first.\nThat's why he's there when you wake, dear. Room isn't the same as love.",
        "Let me look closer at what has been taking up all that room…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his body makes a shape that won't lie flat.",
        "You asked why he's always on your mind. Your hand went to the card that won't settle.",
        "So you didn't choose to think about him, dear. Nobody chooses that.\nAnd he's stuck in one spot, dear, with nothing settled about him.\nBut an unsettled thing keeps coming back, dear. That's how minds work.\nThat's why wanting to stop does nothing, dear. It isn't a failing.",
        "Let me look closer at what has never been settled…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog won't leave his side.",
        "You asked why he's always on your mind. Your hand went to the one with company he didn't pick.",
        "So some things follow you, dear. You didn't invite them.\nAnd the dog came along, dear, and it stays along.\nBut you've been ordering yourself to stop, dear. That never works.\nThat's why it keeps pace with you, dear, however fast you go.",
        "Let me look closer at what has been keeping pace with you…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-who-hurt-me.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the tools are laid out and none of them is put away.",
        "You asked why you still think about someone who hurt you. Your hand went to the mind at work.",
        "So your mind is still working on it, dear. That's what this shows.\nAnd every tool is still out, dear. The job isn't done yet.\nBut thinking of him isn't excusing him, dear. Not for a moment.\nThat's why you are hard on yourself, dear. You read memory as a charge.",
        "Let me look closer at what has kept this job open…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one thing holds him and the rest of him is free.",
        "You asked why you still think about someone who hurt you. Your hand went to the card that holds one point.",
        "So one thing has hold of you, dear. The rest of you moved on.\nAnd he's caught at one point only, dear. The rest of him is loose.\nBut from outside, that looks like being stuck, dear.\nThat's why you call yourself stuck, dear, when it's one held point.",
        "Let me look closer at what has hold of that one point…",
      ],
      c: [
        "You turned the Fool, dear. Look — the ground behind him has fallen away in steps.",
        "You asked why you still think about someone who hurt you. Your hand went to the one who kept going.",
        "So you kept going, dear. That's the first thing I see.\nAnd the ground has gone behind him, dear, and his feet still move.\nBut what happened to you was real, dear, and so is the going on.\nThat's why the two fight in you, dear. Neither cancels the other.",
        "Let me look closer at what has been catching at you as you go…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-pulling-away.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his right hand is up and his left hangs open and low.",
        "You asked why he's pulling away from you. Your hand went to the man who acts on purpose.",
        "So something did change, dear. The card shows the shift plainly.\nAnd look at his hands, dear. One reaching up, one letting go low.\nBut the reason sits with him, dear, and he hasn't said it out loud.\nThat's why guessing has taken up your weeks, dear. It's hard work.",
        "Let me look closer at what has opened up between you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he hangs from one ankle and the rest of him is loose.",
        "You asked why he's pulling away from you. Your hand went to the card that hangs a thing halfway.",
        "So you're halfway, dear. Not ended, and not held either.\nAnd nobody has cut him down, dear. He just hangs there.\nBut you're being asked to read a gap with no words in it, dear.\nThat's why evenings leave you spent, dear. You've translated all day.",
        "Let me look closer at what has been widening this…",
      ],
      c: [
        "You turned the Fool, dear. Look — the dog is white and small against all that rock.",
        "You asked why he's pulling away from you. Your hand went to the one already in motion.",
        "So he is moving, dear. You saw it before anyone said so.\nAnd he moves off, dear, with bare rock behind him.\nBut motion is all the card gives, dear. It gives no reason.\nThat's why you noticed first, dear, and had nobody to tell.",
        "Let me look closer at what has been pushing this apart…",
      ],
    },
    // 'Why has he gone cold on me?' — the CONTRAST. The warmth existed; that is the thing
    // to affirm, and affirming it convicts him of nothing.
    'cards-gone-cold': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-gone-cold.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the coin on his table has a star drawn inside a circle.",
        "You asked why he has gone cold on you. Your hand went to the man who once made warmth on purpose.",
        "So the warmth was real, dear. It was made, not made up.\nAnd warmth like that gets made on purpose, dear. He built it.\nBut what reaches you now has changed, dear. You felt the drop.\nThat's why you go back over that week, dear, hunting the day it turned.",
        "Let me look closer at what has come between you and that warmth…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the leaves on his beam are the only green in the picture.",
        "You asked why he has gone cold on you. Your hand went to the card that freezes a thing.",
        "So the whole thing has gone still, dear. You felt that happen.\nAnd green still shows on that wood, dear, while nothing else moves.\nBut cold describes what reached you, dear. Not what sits in him.\nThat's why nothing you try warms it, dear. You're working the wrong end.",
        "Let me look closer at what has settled over this…",
      ],
      c: [
        "You turned the Fool, dear. Look — he wears a wreath of green leaves on his head.",
        "You asked why he has gone cold on you. Your hand went to the one who doesn't look back.",
        "So you've been hunting for the moment it turned. There may not be one, dear.\nAnd he walks on, dear, with no account of it left behind him.\nBut the card gives no reason for the change, dear. Only that it came.\nThat's why you keep asking, dear, and nobody will answer it.",
        "Let me look closer at what has been chilling this…",
      ],
    },
    // 'Is he losing interest, or just going through something?' — the EITHER-OR. Like
    // cards-moved-on, answering either half fails: one is a pronouncement on a real man
    // delivered to a woman already braced for it, the other is the excuse. The finding is
    // that she was left to deduce it at all.
    'cards-losing-interest': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-losing-interest.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the blade, the cup and the coin sit close together on the wood.",
        "You asked about losing interest, or a thing he's going through. Your hand went to the sorter.",
        "So I will not choose between your two, dear. Neither will I guess.\nAnd things sit side by side on his table, dear, without being ranked.\nBut only he can say which one it is, dear.\nThat's why running both at once has worn you out, dear.",
        "Let me look closer at what keeps this split in two…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his clothes fall the wrong way, up towards his feet.",
        "You asked about losing interest, or a thing he's going through. Your hand went to the card between.",
        "So I will not choose for you, dear. Not honestly, and not from here.\nAnd he's between two states, dear, and settled in neither one.\nBut the card holds both open, dear, which is where you've been living.\nThat's why you feel pulled two ways, dear. The road really does split.",
        "Let me look closer at what has kept this hanging between two…",
      ],
      c: [
        "You turned the Fool, dear. Look — the red feather in his cap points backwards.",
        "You asked about losing interest, or something he's going through. Your hand went to the one who never sorts.",
        "So the Fool declines your either-or, dear. He files nobody.\nAnd nothing about him is sorted yet, dear. He's still stepping.\nBut one person holds that answer, dear, and it isn't me.\nThat's why the choice sat wrong with you. It was never yours, dear.",
        "Let me look closer at what put those two in front of you…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-back-together.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his right arm is raised higher than the top of his head.",
        "You came asking about getting back together. Your hand went to the man working alone.",
        "So this isn't finished, dear. The card won't let me call it that.\nAnd on that table, dear, one pair of hands does all the work.\nBut a thing like this takes two, dear, and only you have been working it.\nThat's why nothing moves, however hard you push. You've been the only one pushing.",
        "Let me look closer at what has been keeping this a one-person job…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his tied leg is straight, and the rope is short.",
        "Your question was about getting back together. Your hand went to the card that holds the middle.",
        "So you've been living in the middle of this, dear. It has no floor.\nAnd look at him. Neither down nor up, and quite still.\nBut the middle is a place two people leave together, dear.\nThat's why you keep nearly getting out, dear, and end up back in it.",
        "Let me look closer at what has been holding you in the middle…",
      ],
      c: [
        "You turned the Fool, dear. Look — the stick over his shoulder is long and thin.",
        "You asked about the road back together. Your hand went to the one who set out alone.",
        "So the road back is still there, dear. Nobody has closed it.\nAnd look at him. One road, one traveller, no second pair of boots.\nBut a road back needs two people walking it, dear.\nThat's why rest doesn't fix it, dear. You walked both parts of this.",
        "Let me look closer at what has been standing on the road back…",
      ],
    },
    // 'Is there still a chance for us?' — THE ODDS. She is asking for a number and there
    // is none; quoting one in either direction is the failure. The finding is that hope
    // is a response to an unanswered question, not a refusal to face a settled one.
    'cards-still-a-chance': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-still-a-chance.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — red flowers along the top of his card, and green leaves with them.",
        "You asked if there's still a chance for us. Your hand went to the man whose work isn't done.",
        "So there's still a chance, dear. Hope here isn't poor judgement.\nAnd look at his table. The work is laid out, not packed away.\nBut an open thing can sit open a long time, dear, and wear you out.\nThat's why you've kept this open by yourself, dear. It cost you something.",
        "Let me look closer at what stands between you and a straight yes or no…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the light round his head is drawn in thin straight lines.",
        "You asked if there's still a chance for us. Your hand went to the card that settles nothing.",
        "So the whole thing is unsettled, dear. You've been feeling that.\nAnd look at him. Held between two things, and going to neither.\nBut I won't put a number on it, dear. There's none to give.\nThat's why waiting on this is so heavy, dear. Nothing in it settles.",
        "Let me look closer at what has been keeping this unsettled…",
      ],
      c: [
        "You turned the Fool, dear. Look — his sleeves are wide and pale, and they hang loose.",
        "You asked if there's still a chance for us. Your hand went to the one whose road keeps going.",
        "So nothing has been sealed, dear. Not one part of this.\nAnd look at him. Mid-step, with nothing decided about where he lands.\nBut open isn't the same as promised, dear. I won't dress it up.\nThat's why hoping feels risky, dear. You've had nothing firm to hope on.",
        "Let me look closer at what keeps this from being answered…",
      ],
    },
    // 'Is it really over between us?' — THE VERDICT REQUEST, and the sharpest hook in the
    // family. She is asking to be told whether to stop. Both answers are forbidden. The
    // finding: 'over' is a word somebody has to SAY, and nobody has said it to her — she
    // has been left to conclude it alone, which is why no amount of thinking settles it.
    'cards-really-over': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-really-over.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a small white flower open at the front of his table.",
        "You asked if it's really over between you. Your hand went to the man who says things out loud.",
        "So I will not call it done, dear. Nor will I call it alive.\nAnd look at him. He's the one who speaks a thing into being.\nBut nobody has spoken this, dear. Not plainly, and not to you.\nThat's why it won't sit still in you. Nothing was ever closed off, dear.",
        "Let me look closer at what stands between you and the words themselves…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — no hills and no sun, just pale space behind him.",
        "You asked if it's really over between you. Your hand went to the card that won't land.",
        "So I will not rule on this, dear. It isn't mine to rule.\nAnd look at him. Hung between, with nothing behind him to say which way.\nBut you were never handed an ending, dear. That's the part still open.\nThat's why nothing you do settles it, dear. You have nothing to settle.",
        "Let me look closer at what has been standing in place of that ending…",
      ],
      c: [
        "You turned the Fool, dear. Look — the drop below his front foot goes down out of sight.",
        "You asked if it's really over between you. Your hand went to the one who never closes a road.",
        "So the Fool will not close this for you, dear. That road stays open.\nAnd look at him. He's stepping, and nothing has landed yet.\nBut no one has told you where this ends, dear. You were left to guess.\nThat's why you go over the last talk you had, dear, word by word.",
        "Let me look closer at what has kept those words from reaching you…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-new-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the front edge of his table runs straight across the card.",
        "You asked if you'll find a new soulmate after loss. Your hand went to the man who makes things.",
        "So you will love again, dear. And it takes nothing away from him.\nAnd putting a thing on that table takes nothing off it, dear.\nBut you've been holding that as disloyal, dear. Nobody said you must.\nThat's why you stop yourself before you start, dear. Every single time.",
        "Let me look closer at what sits in the way of a new love…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his hair hangs straight down, pointing at the bottom of the card.",
        "You asked if you'll find a new soulmate after loss. Your hand went to the card that turns a world over.",
        "So the seat left empty can be filled, dear. Asking that is fair.\nAnd look at him. All he knew is the other way up now.\nBut you were never told it was allowed, dear. So you carried the question.\nThat's why you ask it quietly, dear, and never out loud to anyone.",
        "Let me look closer at what has been standing over that empty seat…",
      ],
      c: [
        "You turned the Fool, dear. Look — his tunic is dark, and the flowers on it are red.",
        "You asked if you'll find a new soulmate after loss. Your hand went to the one starting out again.",
        "So starting again isn't a debt against what came before, dear.\nAnd he carries what he has, dear, and still walks on.\nBut nothing about a new love replaces the old one, dear.\nThat's why wanting it has felt like a betrayal. It never was one, dear.",
        "Let me look closer at what has been standing between you and starting…",
      ],
    },
    // 'Is there still a soulmate out there for me?' — THE WORD "STILL". She is not asking
    // where someone is; she is asking whether her one was already issued and already spent.
    // The read answers the PREMISE, never the location, and never the timing.
    'cards-soulmate-out-there': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-soulmate-out-there.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — behind the table, the flowers come up past his knees.",
        "You asked if there's still a soulmate out there. Your hand went to the man with a full table.",
        "So you have not used it up, dear. Nobody handed you just one.\nAnd look at his table. Nothing on it runs down with use.\nBut you've been living as though your one was already spent, dear.\nThat's why every year feels like a loss, dear. You've been counting down.",
        "Let me look closer at what has been standing in your road…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — you can see the sole of his tied foot.",
        "You asked if there's still a soulmate out there. Your hand went to the card that hangs a question up.",
        "So love doesn't run out, dear. That was never the rule.\nAnd look at him. Held still, and nothing about him empties.\nBut your question assumes a store that runs down, dear.\nThat's why the word still got into your question. Someone put it there, dear.",
        "Let me look closer at what has been holding that question up…",
      ],
      c: [
        "You turned the Fool, dear. Look — nothing behind him but sky, and nothing ahead but air.",
        "You asked if there's still a soulmate out there. Your hand went to the one with road left.",
        "So there's road left, dear. Plenty of it, and unwalked.\nAnd look where he is. Mid-step, not at the end of one.\nBut nothing about you has closed off, dear. Not one door.\nThat's why you started asking if you'd missed it, dear. You have not.",
        "Let me look closer at what has been laid across your road…",
      ],
    },
    // 'Am I ready to love again after losing him?' — THE VERDICT ON HER, and the sharpest
    // hook in the family. She is asking a stranger to grade her grief. BOTH answers do
    // damage: "you are ready" prescribes a timetable to a bereaved woman, and "not yet"
    // does the same thing wearing concern. The finding: she is asking for permission, and
    // permission was never in anyone else's keeping — which is why waiting has not worked.
    'cards-ready-to-love': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-ready-to-love.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the wand he holds is short, and he grips it near the middle.",
        "You asked about loving again after losing him. Your hand went to the man who builds rather than rules.",
        "So I will not grade you on this, dear. Nobody gets to.\nAnd look at his hands. They're for making things, not for measuring them.\nBut there's no standard here that anyone could hold you to, dear.\nThat's why the question keeps coming back, dear. The permission was yours all along.",
        "Let me look closer at what has been standing between you and your own say…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his tunic hangs down toward his chin.",
        "You asked about loving again after losing him. Your hand went to the card that won't hurry.",
        "So the Hanged Man declines to rule on you, dear.\nAnd look at him. Nobody is timing him, and nobody is timing you.\nBut you've been keeping a clock on yourself, dear. Someone handed it to you.\nThat's why you weigh it up again each morning. It was always yours to say.",
        "Let me look closer at what has been putting a clock on you…",
      ],
      c: [
        "You turned the Fool, dear. Look — his weight is on his back foot, and the front one is out.",
        "You asked about loving again after losing him. Your hand went to the one who steps without knowing.",
        "So the Fool will not grade you either, dear.\nAnd look at him. He goes without being certain in advance.\nBut nobody is sure before they step, dear. Not one person.\nThat's why you've read your own doubt as a no, dear. Doubt says nothing.",
        "Let me look closer at what has been standing in the way of your own step…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-where-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the blade on his table lies flat, pointing away from him.",
        "You asked where your soulmate is right now. Your hand went to the man who makes rather than finds.",
        "So this isn't a distance, dear. Nothing is keeping him miles from you.\nAnd nothing on that table came from far away, dear.\nBut I won't give you an address, dear. There's none on this card.\nThat's why looking harder has never helped, dear. You were looking outward.",
        "Let me look closer at what has been standing in that gap…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his belt hangs down away from his waist.",
        "You asked where your soulmate is right now. Your hand went to the card with no ground in it.",
        "So there's no place on this card, dear. None at all.\nAnd he hangs with no road and no map behind him, dear.\nBut you made it a somewhere else, dear. That felt easier to hold.\nThat's why you've thought about moving, dear. A new town, a fresh start.",
        "Let me look closer at what's actually in your way…",
      ],
      c: [
        "You turned the Fool, dear. Look — his right foot is flat and his left one is lifting.",
        "You asked where your soulmate is right now. Your hand went to the one with no fixed end.",
        "So you're still moving, dear. You have not stopped at all.\nAnd he's mid-step, dear, going somewhere he can't name yet.\nBut not knowing where isn't the same as stopping, dear.\nThat's why those years feel wasted to you, dear. The road was under you.",
        "Let me look closer at what has been slowing your road…",
      ],
    },
    // 'Is my soulmate closer than I think?' — THE PROXIMITY REQUEST, and a deliberate copy
    // test against the live cards-soulmate, whose read already says exactly this. So the
    // finding here is NOT proximity: it is the bracing. She has been managing her own hope
    // downward to stay safe, and that guarding is what any felt "distance" is made of.
    'cards-soulmate-closer': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-soulmate-closer.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — red flowers below him, white ones beside them.",
        "You asked if your soulmate is closer than you feel. Your hand went to the man who measures nothing.",
        "So I will not put a distance on this, dear. What I will say is it's coming.\nAnd his table holds tools, dear, not a measuring tape.\nBut look what the question does to you. It braces you.\nThat's why you check yourself before you let yourself hope, dear.",
        "Let me look closer at what put that guard up…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope is tied in a simple loop round his foot.",
        "You asked if your soulmate is closer than you feel. Your hand went to the card with no near or far.",
        "So this card does not offer distances, dear. It shows a person, holding still.\nAnd there's no ground under him, dear. So there's no near or far.\nBut you've been holding your own hope back, dear. I would too.\nThat's why good news makes you flinch first, dear, before it makes you glad.",
        "Let me look closer at what taught you to hold back…",
      ],
      c: [
        "You turned the Fool, dear. Look — his bundle is tied at the very end of the stick.",
        "You asked if your soulmate is closer than you feel. Your hand went to the one who counts no steps.",
        "So there's no honest reading of near, dear. The Fool counts no steps.\nAnd he steps without knowing how far is left to go, dear.\nBut you've been rationing your own hope, dear. A little at a time.\nThat's why you talk yourself down first, dear. Before a thing has happened.",
        "Let me look closer at what makes you flinch first…",
      ],
    },
    // 'Why haven't I found my soulmate where I am?' — THE CULPRIT REQUEST. The question
    // offers exactly two candidates, herself and her circumstances, and both are forbidden.
    // The finding: an absence is not always caused, so there is no fault to hand her.
    // 🔴 Operator call 2026-08-07: "where I am" read as GEOGRAPHY first, because the
    // dangerous answer there is strategy she could act on (move, look elsewhere). A read
    // that declines to blame her surroundings covers the life-stage reading too.
    'cards-not-found-yet': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-not-found-yet.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the cup on his table is gold, and it's empty.",
        "You asked why you've not found your soulmate yet. Your hand went to the maker.",
        "So there's no wrong turning to find, dear. You didn't miss it.\nAnd look at the cup. It's empty, and nobody emptied it.\nBut you've been hunting for whose fault this is, dear.\nThat's why a quiet year feels like a mark against you, dear.",
        "Let me look closer at what has been sitting in the empty place…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — there's nothing under his head but empty space.",
        "You asked why you've not found your soulmate yet. Your hand went to the card that waits.",
        "So a pause needs no guilty party, dear. Yours has none.\nAnd nothing is happening on this card. Nobody made it stop, dear.\nBut you went looking for someone to blame, dear, and you picked you.\nThat's why you go over old choices at night, dear, one by one.",
        "Let me look closer at what has been sitting across your path…",
      ],
      c: [
        "You turned the Fool, dear. Look — the cliff face below him is striped orange and grey.",
        "You asked why you've not found your soulmate yet. Your hand went to the one still walking.",
        "So you're still on the road, dear. That's all this card says.\nAnd he's mid-walk, dear, and nobody has told him he's late.\nBut no one is to blame for a road that isn't finished, dear.\nThat's why the blame never fits. You've carried one that was never yours, dear.",
        "Let me look closer at what has been weighing on this road…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-alone-forever.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his white inner robe shows at the neck and the wrists.",
        "You asked me about alone and forever. Your hand went to the man still at work.",
        "So I will not tell you how long, dear. Nobody honestly can.\nAnd there's no clock anywhere on his table, dear.\nBut you said forever, dear, and I don't think you meant years.\nThat's why it lands so heavy, dear. Forever is the weight of it.",
        "Let me look closer at what has made this so heavy to carry…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — nothing is holding him up but one rope at the ankle.",
        "You asked me about alone and forever. Your hand went to the card that keeps no clock.",
        "So this card never measures time, dear. It only hangs there.\nAnd there's no clock on it anywhere, dear. None at all.\nBut you're not counting years, dear. You're tired.\nThat's why the days feel long, dear. You've carried this on your own.",
        "Let me look closer at what has been adding to the load…",
      ],
      c: [
        "You turned the Fool, dear. Look — the bundle on his stick is smaller than his head.",
        "You asked me about alone and forever. Your hand went to the one who packs light.",
        "So forever cannot be made to hold, dear. Not by me.\nAnd he carries little, dear, because the far end is unknown.\nBut what I can see is the weight you've been under, dear.\nThat's why you are worn out, dear. I can see that much.",
        "Let me look closer at what has been pressing down on you…",
      ],
    },
    // 'Am I meant to be alone?' — THE FATE CLAIM, and the sharpest hook on the funnel. She
    // is asking for a ruling on her nature. The finding: 'meant' requires somebody to have
    // decided, and nobody is assigning anyone anything — so there is no verdict to appeal.
    'cards-meant-alone': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-meant-alone.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — one hand points up and the other points at the flowers.",
        "You came asking about being meant to be alone. Your hand went to the man who decides for himself.",
        "So nothing was assigned to you, dear. There was no one to assign it.\nAnd he makes the thing himself, dear. It wasn't handed to him.\nBut being alone now is a fact about now, dear. It isn't a label.\nThat's why meant has stuck to you, dear. Someone else said it first.",
        "Let me look closer at what has been standing in for a reason…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the tree he hangs from has bark still on it.",
        "You came asking about being meant to be alone. Your hand went to the card hung the other way up.",
        "So nobody decided this for you, dear. Not one person.\nAnd he hangs there, dear, and no one chose that for him either.\nBut you've been living as though a choice was made, dear.\nThat's why there is nothing here to accept, dear, and nothing to fight.",
        "Let me look closer at what has been sitting where that author was…",
      ],
      c: [
        "You turned the Fool, dear. Look — the mountains behind him have snow on their tops.",
        "You came asking about being meant to be alone. Your hand went to the one with nothing decided.",
        "So no fate is written on the Fool, dear. None is written on you.\nAnd he's out on open ground, dear, with no path marked at all.\nBut a sentence has been sitting on you, dear. Nobody passed one.\nThat's why it feels settled, dear, when nothing has been settled at all.",
        "Let me look closer at what has been holding that sentence over you…",
      ],
    },
    // 'Is there really someone out there for me?' — THE PROOF REQUEST. 🔴 Its finding had to
    // dodge two neighbours: 'cards-soulmate-out-there' (the one-chance premise) and
    // 'cards-still-a-chance' (hope is not a failure of realism). So this one reads the
    // EPISTEMICS — the word is "really", and she is asking to be told something she can
    // actually believe, having been handed comfort every other time she raised it.
    'cards-someone-for-me': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-someone-for-me.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — there's a wand on his table and another in his hand.",
        "You asked if there's really someone out there for you. Your hand went to the honest workman.",
        "So here's the truth, dear. You didn't come for comfort.\nAnd he works only with what's in front of him, dear. So do I.\nBut nobody can answer that, dear. Not me, and not anyone.\nThat's why every kind word has slid off you, dear. You wanted the truth.",
        "Let me look closer at what has been standing in the way of trust…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — there's more empty space than man on this card.",
        "You asked if there's really someone out there for you. Your hand went to the card that stays honest.",
        "So nobody knows yet, dear. That's not the same as bad news.\nAnd he's suspended there, dear, telling you nothing he can't know.\nBut reassurance is cheap, dear, and you've been handed plenty.\nThat's why none of it has held, dear. It cost the giver nothing.",
        "Let me look closer at what has been standing in place of proof…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun is high and the sky around it's plain gold.",
        "You asked if there's really someone out there for you. Your hand went to the one who sets out anyway.",
        "So the Fool has no proof either, dear. He steps all the same.\nAnd there's no guarantee in his hand, dear, and his foot still moves.\nBut you've been asked to believe with nothing to hold, dear.\nThat's why believing has got so hard, dear. You've had nothing solid.",
        "Let me look closer at what has been keeping this so hard to believe…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-someone-else.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a plain yellow sky behind him, with nothing in it.",
        "You came asking about someone else. Your hand went to the man who builds.",
        "So something did change, dear. You were told nothing about it.\nAnd a mind will build to fill a gap like that. Yours did, dear.\nBut what you built is yours, dear. He never gave you a word of it.\nThat's why the story runs in your head at night, dear, and never in his.",
        "Let me look closer at what sits between you and a straight account…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the only card here with a pale sky behind it.",
        "You asked me about someone else. Your hand went to the card of what's owed.",
        "So you were owed an account, dear. You still are.\nAnd you've been carrying two weights, dear. The change, and the quiet after it.\nBut the quiet is doing most of the harm, dear. Anyone could have lifted it.\nThat's why a whole good day, dear, can be undone by one long pause.",
        "Let me look closer at what has kept that silence in place…",
      ],
      c: [
        "You turned the Fool, dear. Look — bright yellow boots, right at the edge of the rock.",
        "Your question was about someone else. Your hand went to the one whose road is unwritten.",
        "So what you're holding is a draft, dear. You wrote it in the quiet.\nAnd look at his road. No ending has been drawn on it yet.\nBut nobody has offered you a truer one, dear. Not one word.\nThat's why you go back over the same week, dear, looking for the join.",
        "Let me look closer at what stands between you and something truer…",
      ],
    },
    // 'Is he talking to someone else?' — THE ATTENTION. The most evidence-adjacent of the
    // four, so the surveillance ban does the heaviest lifting. The finding: she should not
    // have to produce proof before she is allowed to mind.
    'cards-talking-someone': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-talking-someone.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a wand pointing up, and a finger pointing down.",
        "You asked who else he has been talking to. Your hand went to the man who aims his effort.",
        "So you can feel where his attention goes, dear. You always could.\nAnd look at him. He points two ways at once.\nBut some of it points away from you, dear, and no one has said why.\nThat's why a room can be full of him, dear, and you still feel skipped.",
        "Let me look closer at what has been pulling that away…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his free leg is bent, and it makes the shape of a four.",
        "You asked about him talking to someone else. Your hand went to the card that splits in two.",
        "So this is split, dear. You've been feeling both halves of him.\nAnd look at him. One leg tied, one leg free.\nBut the split has gone unnamed, dear. That's what you keep hitting.\nThat's why an argument can't get started, dear. There's nothing to hold.",
        "Let me look closer at what has gone unnamed between you…",
      ],
      c: [
        "You turned the Fool, dear. Look — his head is turned back, away from the road ahead.",
        "You came asking who else he talks to. Your hand went to the one facing two ways.",
        "So his direction isn't fixed, dear. You've sensed that all along.\nAnd look at him. Walking one way, looking another.\nBut you can't tell where this is headed, dear. He hasn't said.\nThat's why you ask small questions, dear, that sound like nothing at all.",
        "Let me look closer at what keeps this pointing away from you…",
      ],
    },
    // 'Is he being faithful to me?' — THE SUMMARY JUDGMENT. Both answers forbidden. The
    // finding: she is really asking whether she can stop bracing, and she has not been able
    // to — which is a fact about her life rather than a ruling on him.
    'cards-faithful': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-faithful.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he stands square behind his table and doesn't lean.",
        "You asked if he's being faithful to you. Your hand went to the steadiest man in this deck.",
        "So you haven't had a moment's rest from this, dear. Not one.\nAnd look at him. He stands square, and you have not been able to.\nBut no card gives you a guarantee, dear. This steady one won't either.\nThat's why you keep asking, dear. Asking is the only thing that quiets it.",
        "Let me look closer at what keeps you from setting this down…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope is on his right ankle, and it holds.",
        "You asked if he's being faithful to you. Your hand went to the card that holds its breath.",
        "So the question has stayed up, dear. Nothing has let it down.\nAnd you've been holding it up on your own, dear. All of it.\nBut a thing held that long stops feeling like a question, dear.\nThat's why you're worn out, dear. You never once got to rest.",
        "Let me look closer at what won't let this settle…",
      ],
      c: [
        "You turned the Fool, dear. Look — his stick rests on his shoulder, and the bundle swings behind.",
        "You asked if he's being faithful to you. Your hand went to the one with no fixed ground.",
        "So you've had no firm footing here, dear. Look at his feet.\nAnd look — rock on one side of him, and air on the other.\nBut you've been standing on that all the same, dear.\nThat's why you can't put this down. There's been nothing to put it on.",
        "Let me look closer at what has been keeping this off solid ground…",
      ],
    },
    // 'Is he loyal to only me?' — THE WORD "ONLY". Not about a rival: about whether what she
    // receives is the whole of what he has. The finding: she has been taking a share and
    // calling it the whole, and has stopped noticing she was doing it.
    'cards-loyal': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-loyal.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he's the only figure on his card.",
        "You asked if he's loyal to only you. Your hand went to the man with it all laid out.",
        "So you've been given a share, dear, and you know its size.\nAnd look at his table. Each thing on it has been counted out.\nBut a share isn't the whole, dear. You've felt where it stops.\nThat's why you can be right beside him, dear, and still be doing sums.",
        "Let me look closer at what keeps the rest of it out of reach…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the number twelve sits at the top of his card.",
        "You asked if he's loyal to only you. Your hand went to the card that holds part of it back.",
        "So part of this is held back, dear. You've felt that for a while.\nAnd look at him. Fixed there, giving out no more than he has to.\nBut you've been taking the part for the whole, dear. Anyone would.\nThat's why a good day never quite covers it. The rest is still missing.",
        "Let me look closer at what's holding the rest of it back…",
      ],
      c: [
        "You turned the Fool, dear. Look — snowy peaks behind him, and open ground ahead.",
        "You asked if he's loyal to only you. Your hand went to the one who hasn't settled.",
        "So you've been adjusting, dear. Fitting yourself round what's left.\nAnd look at him. Nothing he carries is tied down.\nBut you made that room yourself, dear. Nobody asked you to.\nThat's why you call it keeping the peace, dear, and it still costs you.",
        "Let me look closer at what has been taking up the room you gave…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-stop-hurting.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he holds the wand high and it doesn't waver.",
        "You asked if this will ever stop hurting. Your hand went to the man who holds a thing up.",
        "So it will not always weigh this much, dear. That much I can say.\nAnd he holds the whole weight in one pair of hands, dear.\nBut you have held this up alone, dear. Nobody took a turn.\nThat's why it hurts as much as it does. You lost something big, dear.",
        "Let me look closer at what has been leaning all of it on you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the gold round his head is bright and the rest is pale.",
        "You asked if this will ever stop hurting. Your hand went to the card that bears without moving.",
        "So this eases, dear. I won't tell you when, and neither can anyone.\nAnd he takes the whole of it, dear, quite still and without a word.\nBut you've had no help with it, dear. Not one pair of hands.\nThat's why the days are so long, dear. You carry it and nobody sees.",
        "Let me look closer at what has kept you carrying this alone…",
      ],
      c: [
        "You turned the Fool, dear. Look — his bundle is small for a journey that long.",
        "You asked if this will ever stop hurting. Your hand went to the one who travels with what he has.",
        "So you're still walking, dear. With all of this on you.\nAnd he's loaded light, dear, and going a long way regardless.\nBut walking on isn't nothing, dear. Most would have sat down.\nThat's why you count it as failing, dear, when it is the opposite.",
        "Let me look closer at what has been adding to the load…",
      ],
    },
    // 'Will I ever stop missing him?' — THE FOREVER QUESTION, and both poles are banned.
    // "You always will" is a life sentence issued by a stranger; "it will pass" is a promise
    // the funnel cannot keep. The finding: she has been treating the missing as a condition
    // she ought to be able to cure by decision, and grading her character on the failure.
    'cards-stop-missing': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-stop-missing.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the lilies at his feet are white and fully open.",
        "You asked if you'll ever stop missing him. Your hand went to the man with no calendar.",
        "So yes, dear — this does get lighter. Nobody can tell you when.\nAnd there's not one date anywhere on his card, dear.\nBut there was never a schedule for it, dear. Nobody set one.\nThat's why you feel behind, dear. You've been marking yourself late.",
        "Let me look closer at what has been keeping this so present…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam above him doesn't bend at all.",
        "You asked if you'll ever stop missing him. Your hand went to the card that holds without ending.",
        "So this holds for now, dear, and holding is not the same as forever.\nAnd nobody is timing him up there, dear. Nobody is timing you.\nBut missing is not a task with a date on it, dear.\nThat's why each month feels like a failing, dear. You set a due date.",
        "Let me look closer at what set that deadline on you…",
      ],
      c: [
        "You turned the Fool, dear. Look — the road behind him isn't in the picture.",
        "You asked if you'll ever stop missing him. Your hand went to the one who carries what he carries.",
        "So you can carry this and still walk, dear. He does exactly that.\nAnd the bundle moves with him, dear. He doesn't put it down to go.\nBut you were handed two choices only, dear. Carry it, or stop.\nThat's why it feels like failing. There's a third way, dear.",
        "Let me look closer at what made this a matter of stopping…",
      ],
    },
    // ⚠ The heaviest of the three and the sibling of 'cards-who-hurt-me'. "After everything"
    // means after what he did — she has NAMED a harm, so minimising it abandons her, and
    // pronouncing on him is the forbidden verdict. The third pull is the real question
    // underneath: she is asking what is wrong with her. Nothing may land as weakness,
    // naivety, low self-worth, or an attachment disorder.
    'cards-still-miss-him': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-still-miss-him.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the sword on his table lies flat and still.",
        "You asked why you still miss him after all of it. Your hand went to the man who holds two things at once.",
        "So both are true, dear. What he did, and the missing.\nAnd there they sit on his table, dear. A blade and a cup, side by side.\nBut neither one cancels the other out, dear. They never did.\nThat's why picking one has never worked, dear. Someone told you to.",
        "Let me look closer at what has been forcing those two apart…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his head is below his heart in this picture.",
        "You asked why you still miss him after all of it. Your hand went to the card that holds what won't sit flat.",
        "So the missing doesn't undo what it cost you, dear. Both stand.\nAnd he hangs upside down, dear, with every part of him still true.\nBut what it cost doesn't make the missing wrong either, dear.\nThat's why you argue with yourself at night, dear. Both sides are yours.",
        "Let me look closer at what has been pulling you between the two…",
      ],
      c: [
        "You turned the Fool, dear. Look — the mountains are far off and the edge is right here.",
        "You asked why you still miss him after all of it. Your hand went to the one who keeps what he keeps.",
        "So you're carrying a real weight, dear. I won't weigh it for you.\nAnd the far country is behind him, dear, and the drop is right here.\nBut nobody gets to tell you what that should feel like, dear.\nThat's why so much advice has bounced off you, dear. It was measuring.",
        "Let me look closer at what has been sitting on top of this…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-left-without-word.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a wand, a cup, a coin, a blade, and no letter among them.",
        "You asked why he left without a word. Your hand went to the man who speaks a thing into being.",
        "So there are two hurts here, dear. The going, and the silence.\nAnd there's no note anywhere on that table, dear. Not one page.\nBut one word would have lifted half of it, dear. Nobody said it.\nThat's why it sits so heavy, dear. You've carried both of them.",
        "Let me look closer at what stands between you and one plain sentence…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his lips are together and his face is calm.",
        "You asked why he left without a word. Your hand went to the card that stops mid-sentence.",
        "So a sentence was started and left, dear. That's what this shows.\nAnd he hangs between, dear, with the end of it never spoken.\nBut you've been holding the half he left, dear. All by yourself.\nThat's why you keep finishing it for him, dear, in your own head.",
        "Let me look closer at what has kept that half unsaid…",
      ],
      c: [
        "You turned the Fool, dear. Look — nothing in his hands is a note or a page.",
        "You asked why he left without a word. Your hand went to the one who goes light.",
        "So he went light, dear. He left the explaining behind him.\nAnd there's nothing on him that looks like an answer, dear.\nBut I won't put words in a mouth that stayed shut, dear.\nThat's why the words never came. You were owed some, dear, and that stands.",
        "Let me look closer at what has been standing where those words go…",
      ],
    },
    // ⚠ The finding: a disappearance makes HER the investigator of her own injury. She has
    // to supply the motive, build the case and reach a verdict, with nothing admissible and
    // while being the party who was hurt. The read relieves her of the job rather than
    // doing it for her — doing it for her IS the banned motive.
    'cards-ghosted': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-ghosted.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the flowers under his table are still growing.",
        "You asked why he ghosted you. Your hand went to the man who leaves a mark when he acts.",
        "So this left no mark, dear. That's the strange part of it.\nAnd every act on that table leaves a mark, dear. This one left none.\nBut a person just going gives you nothing to read, dear.\nThat's why you write the reason yourself, dear. Night after night.",
        "Let me look closer at what has been filling that silence…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — there's no ladder and no one else in the picture.",
        "You asked why he ghosted you. Your hand went to the card that leaves a thing hanging.",
        "So nothing was finished, dear. It was just left.\nAnd he hangs there, dear, with nobody coming to say why.\nBut an ending has words in it, dear. This one had none.\nThat's why the silence reads like a verdict, dear. It isn't one.",
        "Let me look closer at what has been standing in for those words…",
      ],
      c: [
        "You turned the Fool, dear. Look — his left hand is empty and open.",
        "You asked why he ghosted you. Your hand went to the one who owes no account.",
        "So you were owed an account, dear. You didn't get one.\nAnd he walks off with an open hand, dear, and nothing in it.\nBut I won't invent a reason to fill that, dear. Nobody honestly can.\nThat's why the gap stays, dear. It was never yours to explain.",
        "Let me look closer at what has been sitting in that gap…",
      ],
    },
    // ⚠ The heaviest headline on the funnel: she has put her own worth in the question and
    // asked for a ruling. 🔴 NEVER score the comparison in either direction — "you were
    // enough" implies a reason for his going, "you weren't" is unthinkable. Refuse the
    // premise: no measurement was taken, so no result on her exists. NEVER enumerate what
    // she lacked, never say she gave too much or loved too hard, never coach her worth.
    'cards-not-enough': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-not-enough.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — there is no set of scales anywhere on his table.",
        "You asked what was lacking in you. Your hand went to the man with no scales at all.",
        "So I won't weigh you, dear. Not up, and not down.\nAnd there's nothing on that table to measure with, dear. No scales at all.\nBut a person leaving isn't a score against you, dear.\nThat's why the sums never come out, dear. Someone handed you that scale.",
        "Let me look closer at what put that scale in your hands…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — nothing on this card is being weighed against anything.",
        "You asked if you fell short. Your hand went to the card that measures nobody.",
        "So there's no scoring here, dear. None to be had at all.\nAnd there's no scale under him, dear. Nobody is being weighed.\nBut your question needs a reason, dear, and nobody gave you one.\nThat's why you supplied one yourself, dear, and you picked you.",
        "Let me look closer at what has been keeping you on that scale…",
      ],
      c: [
        "You turned the Fool, dear. Look — he carries no list and no ledger.",
        "You asked if you fell short. Your hand went to the one who counts nothing.",
        "So he keeps no accounts, dear. Neither will I.\nAnd there's no tally in that bundle, dear. He counts nothing.\nBut why a person goes is no measure of who was left, dear.\nThat's why it never adds up, dear. You've been reading it as a mark.",
        "Let me look closer at what has been sitting on that scale…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-stop-searching.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the wand in his raised hand catches light at the tip.",
        "You asked if the searching ever ends. Your hand went to the man always at work.",
        "So this turned into work, dear. Heavy work, and nobody gave it to you.\nAnd his hands are never idle, dear. That's the whole of his card.\nBut you're allowed to set a job like that down, dear.\nThat's why it feels like unpaid work. No one said you could rest, dear.",
        "Let me look closer at what keeps putting it back in your hands…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam is bare where the branches were cut off.",
        "You asked if the searching ever ends. Your hand went to the card that stops without ending.",
        "So you're asking to be let off, dear. Not asking to find someone.\nAnd he has stopped, dear, and nothing bad has happened to him.\nBut stopping and giving up are two different things, dear.\nThat's why resting feels like quitting, dear. You've held them as one.",
        "Let me look closer at what has been holding those two together…",
      ],
      c: [
        "You turned the Fool, dear. Look — a dark green cap sits low on his head.",
        "You asked if the searching ever ends. Your hand went to the one who never calls it that.",
        "So he's just walking, dear. He'd never call it a search.\nAnd he goes without counting what he hasn't found, dear.\nBut the word searching turns a life into a hunt, dear.\nThat's why your own days tire you, dear. You didn't pick that word.",
        "Let me look closer at what keeps handing you that word…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-end-up-alone.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his cloak falls open down one side.",
        "You asked why you keep ending up alone. Your hand went to the man who looks for reasons.",
        "So there's no reason to find here, dear. You've hunted for one for years.\nAnd a mind like his can build a reason out of anything, dear.\nBut a reason you built yourself isn't a finding, dear.\nThat's why every answer you land on has your own name in it.",
        "Let me look closer at what keeps landing in the same place…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his knee makes a sharp corner against the beam.",
        "You asked why you keep ending up alone. Your hand went to the card that hangs a why upside down.",
        "So nothing falls out when you turn this over, dear. I've watched you try.\nAnd he hangs there turned over, dear, and still no answer drops.\nBut some things just happen, dear. There's no reason underneath them.\nThat's why you've been the only suspect in your own case, dear.",
        "Let me look closer at what has been standing in for an answer…",
      ],
      c: [
        "You turned the Fool, dear. Look — the dog's mouth is open, and it's right at his heel.",
        "You asked why you keep ending up alone. Your hand went to the one who keeps setting out.",
        "So you keep setting out again, dear. That is the part worth seeing.\nAnd he takes the same step at the same edge, dear, and goes anyway.\nBut this card counts no failures, dear. It keeps no tally at all.\nThat's why the tally hurts, dear. Nobody else was keeping one.",
        "Let me look closer at what keeps meeting you at the same edge…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-given-up.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he looks out past you, not quite at you.",
        "You asked about giving up on love without knowing it. Your hand went to the man still at work.",
        "So I won't rule on your heart from outside it, dear. Nobody can.\nAnd here you are, asking, dear. A woman who had quit wouldn't be.\nBut the question got in somehow, dear. Something put it there.\nThat's why you ask this at night, dear, and the day gives no answer.",
        "Let me look closer at what has been sitting on top of your hope…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his eyes are open, and he's not asleep.",
        "You asked about giving up on love without knowing it. Your hand went to the card that only looks still.",
        "So still isn't the same as finished, dear. Look at his eyes.\nAnd he's wide awake up there, dear, with nothing moving at all.\nBut rest and quitting look alike from outside, dear.\nThat's why you've read your own rest as a verdict, dear.",
        "Let me look closer at what has been keeping you this still…",
      ],
      c: [
        "You turned the Fool, dear. Look — one arm swings out and the sleeve flares open.",
        "You asked about giving up on love without knowing it. Your hand went to the one mid-step.",
        "So you're mid-step, dear. You have not sat down.\nAnd nobody steps off a cliff having quit, dear. Look at his foot.\nBut this card can't say what's inside you, dear. No card can.\nThat's why you've had to guess at yourself, dear, and you guessed hard.",
        "Let me look closer at what has been slowing that step…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-twin-ready.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he holds his wand like a candle, straight up and steady.",
        "You asked if your twin flame is ready for you. Your hand went to the man with it all in reach.",
        "So his part in this was never your job, dear. Not one bit of it.\nAnd look at his hands. This card is a person doing things.\nBut ready shows, dear. Nobody has to guess at it.\nThat's why signs are all you have, dear. You've been hunting them a long while.",
        "Let me look closer at what has been standing in the way of a plain sign…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the wood he hangs from is cut flat across the top.",
        "You asked if your twin flame is ready for you. Your hand went to the card that holds it all still.",
        "So the whole thing has been paused, dear. You knew that already.\nAnd look at him. Nothing moves, and nothing gets decided.\nBut a pause tells you nothing about what comes after it, dear.\nThat's why waiting here is so hard, dear. There's nothing in it to read.",
        "Let me look closer at what has kept this paused so long…",
      ],
      c: [
        "You turned the Fool, dear. Look — he holds the flower away from himself, out at arm's length.",
        "You asked if your twin flame is ready for you. Your hand went to the one who carries no plan.",
        "So there's no plan in this yet, dear. You've felt that for a while.\nAnd look at him. Going, but not towards anything with a name.\nBut ready gets built, dear. No one is simply ready one morning.\nThat's why there's nothing here for you to fix. It was never yours, dear.",
        "Let me look closer at what has been standing where a plan should be…",
      ],
    },
    // 'Does my twin flame feel this too?' ~ competes with cards-feels. That one reads what
    // he feels; this one reads whether the intensity is SHARED, which is a different and
    // sharper question — and the one where narrating his interior is most tempting.
    'cards-twin-feels': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-twin-feels.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he faces forward, and both his hands are busy.",
        "You asked if your twin flame feels this too. Your hand went to the man who works with what's there.",
        "So he feels it too, dear. You haven't been holding this on your own.\nAnd look at his table. Only what's on it can be worked with.\nBut his side was never put on your table, dear. You've had to guess it.\nThat's why Monday feels certain, dear, and by Thursday you're lost again.",
        "Let me look closer at what stands between you and his side of it…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he hangs from a beam with two cut branches on it.",
        "You asked if your twin flame feels this too. Your hand went to the card that keeps the rest turned away.",
        "So it reached him too, dear. The card is steady on that.\nAnd half of what he does is out of your view, dear.\nBut you have only ever been shown your own half of this.\nThat's why it can feel huge to you, dear, and go unsaid between you.",
        "Let me look closer at what's keeping his half turned away…",
      ],
      c: [
        "You turned the Fool, dear. Look — the ground he stands on is orange rock, and it ends.",
        "You asked if your twin flame feels this too. Your hand went to the one walking on his own.",
        "So you have not been carrying this alone, dear. He carries some of it.\nAnd he has one road and one bundle, dear. Nobody else on it.\nBut you can't see his road from where you stand, dear.\nThat's why it lands on you like a weight, dear, and shows nowhere else.",
        "Let me look closer at what has been standing between the two of you…",
      ],
    },
    // 'Is my twin flame coming back to me?' ~ competes with cards-ever-back. That one reads
    // the possibility; this one must ALSO refuse the separation-phase script, which is what
    // turns an absence into a stage of a journey with a guaranteed ending.
    'cards-twin-back': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-twin-back.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — flowers growing right up around the legs of his table.",
        "You asked if your twin flame is coming back. Your hand went to the man who acts.",
        "So the pull you feel is real, dear. He felt it too.\nAnd look at his raised hand. This card does things, it doesn't wait.\nBut what it will not do is tell you his next move, dear.\nThat's why the pull can be so strong, dear, and the phone still quiet.",
        "Let me look closer at what has been blocking your own way forward…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — gold rays come off his head, pointing down at the ground.",
        "You asked if your twin flame is coming back. Your hand went to the card that holds a thing still.",
        "So the hold on you is real, dear. I can see it plainly from here.\nAnd look at him. Time passes and the picture doesn't change.\nBut I won't tell you what happens next, dear. No card can.\nThat's why you've waited at such a cost, dear, with nothing to show for it.",
        "Let me look closer at what has been keeping you in the hold…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun above him is a plain white circle.",
        "You asked if your twin flame is coming back. Your hand went to the one mid-journey.",
        "So nothing has been finished, dear. Not by him, and not by you.\nAnd out he goes, dear. On the road, with no map at all.\nBut the road ahead of him has no end drawn on it, dear.\nThat's why a quiet week feels like an answer, dear. It isn't one.",
        "Let me look closer at what has been standing in place of an answer…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-hiding-something.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he stands where you can see him, and the table hides the rest.",
        "You asked about him hiding something. Your hand went to the man who decides what's on show.",
        "So you've been shown a front, dear. Fronts are chosen, and that's real.\nAnd the table covers him from the waist down, dear.\nBut a thing left out isn't a lie told, dear. Those are different.\nThat's why you have no name for it, dear, and still feel it there.",
        "Let me look closer at what has been standing in the covered part…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his hands are behind him where the picture stops.",
        "You asked about him hiding something. Your hand went to the card with a back you can't see.",
        "So there's a back to this you can't reach, dear. You noticed that.\nAnd the working half of him is out of the frame, dear.\nBut you've been asked to prove a thing isn't there, dear.\nThat's why it goes round and round, dear. Nobody can prove that.",
        "Let me look closer at what keeps this half out of frame…",
      ],
      c: [
        "You turned the Fool, dear. Look — the bundle on his stick is closed and tied shut.",
        "You asked about him hiding something. Your hand went to the one who carries a closed bag.",
        "So there's a closed bag here, dear. That much is real.\nAnd it's tied shut, dear, and I won't tell you what's inside.\nBut no honest reader names what's in a shut bag, dear.\nThat's why you circle it, dear. You saw the bag, and it stayed shut.",
        "Let me look closer at what has been keeping that bag shut…",
      ],
    },
    // 'Something feels off — is my intuition right?' — the only headline on the funnel that
    // submits HER JUDGEMENT for a verdict, and both available verdicts do harm: "yes"
    // convicts him by proxy of whatever she has already concluded, "no" tells a woman her
    // own observation is imaginary. Every read here splits the question instead — the
    // NOTICING is affirmed, the MEANING is left open — and refuses the flattering third
    // option, that intuition is never wrong, which turns every fear into a finding.
    'cards-feels-off': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-feels-off.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the smallest thing on his table is the coin.",
        "You asked if something feels off, and if you're right. Your hand went to the man who notices detail.",
        "So you picked up something small, dear. That's real.\nAnd the coin is easy to miss, dear, and it's still there.\nBut noticing is one job, dear. Reading it is another.\nThat's why the first part is done, dear, and the second is still open.",
        "Let me look closer at what your eye caught on…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — not one line on this card is level.",
        "You asked if something feels off, and if you're right. Your hand went to the card that sits wrong.",
        "So your eye is telling you this sits wrong, dear. It's working.\nAnd not one line on that card is level, dear. You saw it at once.\nBut what your eye has found is a separate question, dear.\nThat's why I won't talk you out of it, dear, or hand you a verdict.",
        "Let me look closer at what has been sitting out of true…",
      ],
      c: [
        "You turned the Fool, dear. Look — the drop is behind his heel and he can't see it.",
        "You asked if something feels off, and if you're right. Your hand went to the one who doesn't look.",
        "So you looked, dear. That's a real difference between you and him.\nAnd he doesn't look, dear, and the edge is right behind his heel.\nBut I won't rule on what your looking found, dear.\nThat's why looking early counts, dear, whatever it turns out to mean.",
        "Let me look closer at what has been sitting just out of view…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-really-love.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the wand in his hand is white and lifted above the roses.",
        "You asked whether the love is really love. Your hand went to the card of what a man does.",
        "So yes, dear. What you've been given is real love.\nAnd a man like this does nothing by halves. He knew what he was building with you.\nBut building it and saying it out loud are two different jobs for him.\nThat's why you got the care, dear, and never quite got the words.",
        "Let me look closer at what keeps the words from coming…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope holds and the tree keeps growing round it.",
        "You asked whether the love is really love. Your hand went to the card of a thing held in place.",
        "So the love is real, dear. What you've been given is not in doubt.\nAnd he knows he's stuck there. That's the part he has never said out loud.\nBut he can't get himself down from there just by knowing it.\nThat's why nothing moves, dear, however warm he is with you.",
        "Let me look closer at what has been holding that rope in place…",
      ],
      c: [
        "You turned the Fool, dear. Look — he holds the flower up, not down.",
        "You asked if he really loves you. Your hand went to the card of an open heart.",
        "So it's real, dear. What he gives you, he gives freely.\nAnd nothing in this card is weighed out or held back on purpose.\nBut a heart this open has not worked out where it's going yet.\nThat's why he can be warm with you, dear, and still name nothing.",
        "Let me look closer at what stops him putting a name to it…",
      ],
    },
    // 'How does he really feel about me?' — ⚠️ the PRONOUN VARIANT of the live 'cards-feels'
    // ("about YOU"). Its lens is HER VOICE and the position of the asker: she has come to a
    // stranger for something a person who knows her could have said. The incumbent reads his
    // feelings; this reads the ASKING. See the union note on the confound.
    'cards-feel-about-me': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-feel-about-me.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the four things on the table are all within his reach.",
        "You asked how he really feels about you. Your hand went to the card of a man who chooses.",
        "So he feels it, dear. The card is plain with me about that.\nAnd he has chosen how much of it reaches you. That choosing is done on purpose.\nBut choosing what to show you is not the same as feeling less.\nThat's why he can seem near one day, dear, and measured the next.",
        "Let me look closer at what sits behind the part he keeps back…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his face is the lowest thing on the card.",
        "You asked how he really feels about you. Your hand went to the card of a man seen upside down.",
        "So he does feel it, dear. You've been picking that up correctly.\nAnd there is more of it in him than that angle has let you see.\nBut hanging there, he cannot turn himself the right way up.\nThat's why you keep getting halves of him, dear, and never the whole.",
        "Let me look closer at what has been holding him in that position…",
      ],
      c: [
        "You turned the Fool, dear. Look — the dog is barking and he hasn't turned round.",
        "You asked how he really feels about you. Your hand went to the card of a man mid-step.",
        "So he feels it, dear. What you picked up from him was there.\nAnd this card walks on without once looking back at what it left.\nBut walking on is a habit in him. It is not a ruling on you.\nThat's why the warmth reached you, dear, and the account never did.",
        "Let me look closer at what keeps him from stopping long enough…",
      ],
    },
    // 'Does he love me, or am I imagining it?' — a BINARY whose second branch puts HER
    // PERCEPTION on trial. BOTH doors are shut: "he loves you" narrates his interior, and
    // "you imagined it" is the gaslighting 'cards-feels-off' forbids — and here the headline
    // itself invites it. Refuse the either-or as 'cards-moved-on' does; affirm the noticing
    // as 'cards-feels-off' does; never claim a feeling is proof of anything.
    'cards-imagining-it': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-imagining-it.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the table is between you and the rest of him.",
        "You asked about his love, and about your own eyes. Your hand went to the card of things truly made.",
        "So you did not imagine it, dear. He loves you.\nAnd this card builds nothing by chance. What stands between you was made on purpose.\nBut he has put it into the doing, dear, and not into words you can hold.\nThat's why you keep checking it against your own memory.",
        "Let me look closer at what keeps him from saying it plainly…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — you're seeing him from below, not from level.",
        "You asked about his love, and about your own eyes. Your hand went to the card of a crooked view.",
        "So the love is there, dear. You have been looking at it sideways.\nAnd from down there, every plain thing can look like something else.\nBut the angle is the trouble, dear. Your eyes are working fine.\nThat's why one week you are certain, and the next week you are not.",
        "Let me look closer at what has been holding you at that angle…",
      ],
      c: [
        "You turned the Fool, dear. Look — the drop is real and it's right there beside his boot.",
        "You asked about his love, and about your own eyes. Your hand went to the card of a man who steps out anyway.",
        "So it's real, dear. You did not build this on your own.\nAnd he stepped out too. That is not a thing a man does over nothing.\nBut he stepped without once looking at where it lands.\nThat's why it feels real to you, dear, and unsteady at the same time.",
        "Let me look closer at what makes the ground feel so unsteady…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-still-think.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his sleeve is pushed back off the wrist of his raised arm.",
        "You asked what he thinks now. Your hand went to the man who deals in what's made.",
        "So he does think of you, dear. What you had was real.\nAnd every piece on that table was wanted, dear. Someone chose each one.\nBut you've scaled yourself down to a thought, dear. That's what I mind.\nThat's why the ask got so small. You used to want the whole of it.",
        "Let me look closer at what shrank the ask that far…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the post he hangs from runs straight down past him.",
        "Your question was about his thinking. Your hand went to the card that holds a question open.",
        "So it happened, dear. That much is settled, whatever comes next.\nAnd he hangs there asking for very little, dear. So do you.\nBut being thought of is the smallest thing going, dear.\nThat's why you never asked for more, dear. Small felt safer to say.",
        "Let me look closer at what has been keeping even that from you…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog looks up at him and he doesn't look down.",
        "You came asking what he thinks. Your hand went to the one who carries almost nothing.",
        "So he carries you still, dear. What you had was not in question.\nAnd look at his bundle. One small thing, and that's the lot.\nBut you've cut this down to almost nothing, dear.\nThat's why being thought of is all you ask now, dear.",
        "Let me look closer at what took the rest of it away…",
      ],
    },
    // 'Does he still love me?' — the lens is SURVIVAL rather than EXISTENCE. ⚠️ ONE WORD from
    // the live 'cards-really-love', and the word is the whole difference: that hook doubts the
    // feeling ever amounted to love (a question about a STANDARD); this one takes the love as
    // given and asks whether it LASTED. Affirm the past tense with confidence — that is the
    // payout and it costs nothing true — and refuse the present tense in both directions.
    'cards-still-love': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-still-love.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the four tools sit exactly where he put them.",
        "You asked whether the love lasted. Your hand reached for the maker, dear.",
        "So it survived, dear. What was built here was real, and it holds.\nAnd a made thing leaves marks, dear. Look where his tools still sit.\nBut whether he says so is a different matter, dear.\nThat's why it never left you, dear, and the words never came.",
        "Let me look closer at what stands between you and knowing…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam's two arms reach out past the sides of him.",
        "You asked whether the love lasted. Your hand reached for the card that gives no verdict.",
        "So nothing has been shut, dear. It happened, and nothing has undone it.\nAnd he hangs between, dear. Nothing has been announced either way.\nBut nobody has told you which it is, dear. Not once.\nThat's why you've carried the not-knowing alone. That's the heavy part, dear.",
        "Let me look closer at what has been keeping this unsaid…",
      ],
      c: [
        "You turned the Fool, dear. Look — a white flower, held loosely, with its stem down.",
        "You asked whether the love lasted. Your hand reached for the one who doesn't look back.",
        "So what you had was real, dear. That is not in question.\nAnd he faces out, dear, with the whole road behind him.\nBut the card shows me nothing of what he carries now, dear.\nThat's why you keep looking back at it, dear. Nothing closed it off.",
        "Let me look closer at what keeps this question open…",
      ],
    },
    // 'Does he still love me, or has he moved on?' — ⚠️ shares the verbatim clause "or has he
    // moved on?" with the live 'cards-moved-on' (reunion), which is untouched. Its refusal must
    // be its OWN: cards-moved-on refuses because neither branch is knowable, 'cards-imagining-it'
    // refuses because the second branch is cruel. This refuses on a different ground entirely —
    // 🔴 THE TWO ARE NOT OPPOSITES. Moving on is something a person DOES with a life; loving is
    // something that happens IN them. They are not on one axis and never were.
    'cards-love-or-moved-on': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-love-or-moved-on.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a red rose and a white lily grow in the same bed.",
        "You asked if the love is there, or if he has moved past it. Your hand went to the man who sorts things.",
        "So what you had was real, dear. That much isn't in question.\nAnd look at the bed, dear. Rose and lily, side by side, both real.\nBut love and moving on were never a pair, dear.\nThat's why no answer has fitted, dear. The question was built wrong.",
        "Let me look closer at what put that false choice in front of you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one leg goes up and one goes across, at the same time.",
        "You asked if the love is there, or if he has moved past it. Your hand went to the card that holds two things.",
        "So he can hold both, dear. People do it all the time.\nAnd look at him. Up and down at once, and both are true.\nBut you were handed a choice that doesn't work, dear. Not your doing.\nThat's why picking one has felt wrong, dear. Neither is the true answer.",
        "Let me look closer at what has been forcing this into two…",
      ],
      c: [
        "You turned the Fool, dear. Look — his stick is behind him and the flower is in front.",
        "You asked if the love is there, or if he has moved past it. Your hand went to the one going forward.",
        "So he holds the old and the new at once, dear. People are like that.\nAnd look at his hands. Stick behind him, flower out in front.\nBut nobody made you pick one, dear. The question did that.\nThat's why the two answers keep swapping places, dear, night after night.",
        "Let me look closer at what has been making you pick…",
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
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-forever-or-now.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — red roses on the vine above his head.",
        "You asked if you're his forever, or just his now. Your hand went to the man who makes things.",
        "So the forever you felt was real, dear. The card doesn't argue with you there.\nAnd look at his table, dear. Every tool to build one is already there.\nBut forever is built, dear. Here it has only been felt.\nThat's why you can feel certain of him, dear, and still have nothing to call it.",
        "Let me look closer at what stands between you and a place with a name…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — green leaves still growing on the beam he hangs from.",
        "You asked if you're his forever or his now. Your hand went to a man still hanging.",
        "So no verdict was passed on you, dear. Look how he hangs — nothing is settled.\nAnd the word for it has never been named in him either, dear.\nBut the leaves keep coming off that dead beam anyway, dear.\nThat's why you can be his whole world at the door, dear, and nothing past it.",
        "Let me look closer at what sits between you and that word…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun behind him, big and low in the sky.",
        "You asked if you're his forever or his now. Your hand went to the one with no map.",
        "So he hasn't set you aside, dear. This card has settled nothing yet.\nAnd look at his hand, dear. He walks out with no map in it.\nBut a man with no map can still walk beside you for years.\nThat's why every plan you make with him stops at next month, dear.",
        "Let me look closer at what has been standing in the way of a straight answer…",
      ],
    },
    // 🔴🔴 'Why do his children come before me?' — THE SHARPEST LANDER ON THE FUNNEL. It asks a
    // card to comment on a man's CHILDREN: real third parties, very possibly minors, who are not
    // her rivals. NEVER rank her against them, NEVER frame them as an obstacle, NEVER grade him
    // as a father, NEVER an ultimatum. The finding: children legitimately do come first, and that
    // is NOT the wound — the wound is that she has been left to infer her place from the leftovers.
    'cards-his-children': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-his-children.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a gold cup and a coin marked with a star, set out in order.",
        "You asked why his children come before you. Your hand went to the man who plans.",
        "So his children do have a first call, dear. I won't dress that up for you.\nAnd first call was never the only call, dear. Look how much is on that table.\nBut nobody has ever set a place there for you. Not one you could point at.\nThat's why you're not asking to move up a list, dear. You're asking to appear on one.",
        "Let me look closer at what stands between you and a place of your own…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his hands are behind his back, where you can't see them.",
        "You asked why his children come before you. Your hand went to the man hung the other way up.",
        "So the race was handed to you, dear. You never entered it yourself.\nAnd his children do come first, dear. That part is true and it stays true.\nBut first was never the same as only, dear. Nobody drew you a place either way.\nThat's why you can't name where you sit, dear. No one has ever told you.",
        "Let me look closer at what has been standing where your place should be…",
      ],
      c: [
        "You turned the Fool, dear. Look — his coat is covered in flowers, and the drop is one step away.",
        "You asked why his children come before you. Your hand went to the one who walked in late.",
        "So you came into a life that was already full, dear. You came with open hands.\nAnd a full life leaves very little room showing, dear. That's what you walked into.\nBut wanting a place of your own takes nothing from theirs, dear.\nThat's why you've asked for so little, dear. You called that being fair.",
        "Let me look closer at what has been in the way of your own place…",
      ],
    },
    // 'Am I living in her shadow?' — ⚠️ "her" may be an ex OR a woman who has DIED, and the
    // headline does not say. 🔴 MEDIUMSHIP BAN applies (this family runs the decode-him frame,
    // which carries none of it). 🔴 She may NEVER be disparaged, doubted or made a rival —
    // unlike `fidelity`'s third person, she may be entirely legitimate. The finding: a shadow is
    // cast by something she cannot see the whole of, so the comparison has no visible terms.
    'cards-her-shadow': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-her-shadow.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the number one sits at the very top of his card.",
        "You asked if you're living in her shadow. Your hand went to the man who deals in solid things.",
        "So there is something in that room with you, dear. The card gives you that.\nAnd a shadow isn't a person, dear. It's what falls when the light is blocked.\nBut nobody has ever set out the terms, dear. You've been guessing at them.\nThat's why a good day with him can still end with you comparing, dear.",
        "Let me look closer at what's standing between you and the light…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his hands are tucked behind his back, out of sight.",
        "You asked if you're living in her shadow. Your hand went to the man hung upside down.",
        "So no measure was ever set out for you, dear. His hands are behind his back.\nAnd the light in this comes from him, dear. He decides what gets shown.\nBut you can't answer a question that was never asked out loud, dear.\nThat's why you go looking for signs of her, dear, and you keep finding them.",
        "Let me look closer at what's casting this over you…",
      ],
      c: [
        "You turned the Fool, dear. Look — mountains behind him, and one step left before the drop.",
        "You asked if you're living in her shadow. Your hand went to the one who came in late.",
        "So you came in after her, dear. Coming later doesn't put you under anyone.\nAnd look at him, dear. He walks in with nothing settled and no past to carry.\nBut the order still gets treated like a ranking, dear. No one has said otherwise.\nThat's why the good days still leave you checking, dear. You've had no word to hold.",
        "Let me look closer at what stands between you and being seen plainly…",
      ],
    },
    // 'Why do we still live apart?' — the most concrete of the five: a physical arrangement.
    // 🔴 NEVER supply a CAUSE for it (the `searching` family's ban, pointed at a man), never
    // "he is not serious", never "he is protecting himself". The finding: an arrangement that was
    // DECIDED is a different object from one that merely never changed, and nobody has told her
    // which she is living in.
    'cards-live-apart': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-live-apart.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the wand in his hand is white at both ends.",
        "You asked why you still live apart. Your hand went to the man who decides before he acts.",
        "So the miles aren't the measure of him, dear. The card is clear with me there.\nAnd nothing on that table got there by accident, dear. He set each thing down.\nBut a plan and a habit look the same from outside, dear.\nThat's why you've been guessing which one you live in, dear. Nobody has said.",
        "Let me look closer at what sits between you and a plain reason…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam he hangs from is shaped like a T.",
        "You asked why you still live apart. Your hand went to the card that turns a question over.",
        "So he hasn't put you outside his life, dear. This card shows a man held, not gone.\nAnd a man held in one spot can't come to you, dear. He can't leave either.\nBut you've had to work that out alone, dear. Every time, on your own.\nThat's why asking him got hard, dear. You'd already answered it for him.",
        "Let me look closer at what stands between you and asking him…",
      ],
      c: [
        "You turned the Fool, dear. Look — a red feather stands up from his cap.",
        "You asked why you still live apart. Your hand went to the one who travels light.",
        "So the quiet is what hurts, dear. Two front doors on their own wouldn't.\nAnd look what he carries, dear. What fits on a stick, and no map.\nBut you can read a closed door for years and still be told nothing, dear.\nThat's why you're tired, dear. You've been living it and explaining it both.",
        "Let me look closer at what has kept a plain reason from reaching you…",
      ],
    },
    // 'Have I already given him too long?' — asks for a verdict on HER OWN PAST. 🔴 Both poles
    // banned: "yes, too long" is a sentence a stranger has no standing to pass, "no, it was worth
    // it" is a promise. 🔴 NEVER grade her (wasted, naive, foolish), NEVER a timeframe, NEVER
    // "you will know when". The finding: "too long" treats the years as a DEPOSIT toward a
    // purchase that may not complete — but they were also her life, and she lived them.
    'cards-too-long': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-too-long.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — one arm raised high, a wide white sleeve falling from it.",
        "You asked if you've already given him too long. Your hand went to the man who makes things.",
        "So you didn't spend those years, dear. You lived them.\nAnd nobody has ever told you what those years were for, dear.\nBut you've been paying a toll on them ever since, dear. At your own gate.\nThat's why you keep counting them, dear, and the count never gets smaller.",
        "Let me look closer at what has been sitting in the way of a change…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — leaves growing out of the dead wood he hangs from.",
        "You asked if you've given him too long. Your hand went to the man who isn't moving.",
        "So the years weren't the trouble, dear. Nothing moved, and that's a different thing.\nAnd look at him, dear. He has been still, not short of time.\nBut being still feels just like time when you're the one waiting, dear.\nThat's why you counted the years, dear. They were the only thing moving.",
        "Let me look closer at what has been holding this still…",
      ],
      c: [
        "You turned the Fool, dear. Look — his front foot is already off the rock.",
        "You asked if you've already given him too long. Your hand went to the one who set out with no promise.",
        "So the answer you came for isn't a number, dear. There's a plainer question under it.\nAnd yours is this. Am I allowed to want this to change?\nBut you've been waiting to call the years a mistake first, dear.\nThat's why permission never came, dear. You were waiting to give it to yourself.",
        "Let me look closer at what stands between you and wanting more…",
      ],
    },
    // Soulmate-label (2026-08-17). 🔴🔴 THE LABEL BAN RUNS THROUGH ALL NINE: never certify and
    // never deny that he is her soulmate or her twin flame. Unfalsifiable, and a verdict on a
    // real man. 🔴🔴 NEVER RANK THE LABELS — no word here is higher, rarer or deeper than
    // another, and "just a strong connection" may never be treated as the losing branch. The
    // shared move: affirm the PULL as real information about HER, refuse the WORD.
    'cards-really-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-really-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his tools are plain things, simply made.",
        "You asked if he's really your soulmate. Your hand went to the man who works in the plain world.",
        "So the pull is real, dear. I can see that much on the card.\nAnd his tools are plain things, dear. Every one of them can be checked.\nBut the word you came with can't be checked at all, dear.\nThat's why really got into your question, dear. The doubt came first.",
        "Let me look closer at what has been standing in place of that question…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope is the only thing that has been decided.",
        "You asked if he's really your soulmate. Your hand went to the card that won't name things.",
        "So I won't put that word on him, dear. Nor take it off him.\nAnd there's no label anywhere on this card, dear. Just a man, held.\nBut nothing about him changes with a word, dear. Not one thing.\nThat's why the word never settles you. You already know what he does, dear.",
        "Let me look closer at what the doing has been telling you…",
      ],
      c: [
        "You turned the Fool, dear. Look — he has set out with no name for where he's going.",
        "You asked if he's really your soulmate. Your hand went to the one who names nothing.",
        "So you already hold your answer, dear. It sits in what he does.\nAnd he moves on a feeling, dear, with no word for it at all.\nBut the word has been doing work it can't do, dear.\nThat's why an answer either way would leave you where you are.",
        "Let me look closer at what has been resting on that one word…",
      ],
    },
    // ⚠️ The FIFTH binary-refusing hook. Its ground is its own: both branches describe THE SAME
    // EVIDENCE under two words, so the answer would change nothing she could observe or act on.
    // 🔴 The word doing the damage is her own "just" — refuse the ladder, do not climb it.
    // 🔴 The RUNNER SCRIPT ban is sharpest here: never read his distance or silence as proof.
    'cards-twin-or-connection': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-twin-or-connection.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — he's holding one wand, not two.",
        "You asked about twin flame, or a strong pull. Your hand went to the man of one thing.",
        "So the same man stands there under either word, dear.\nAnd he holds one wand, dear. One man, one table, one set of tools.\nBut neither word changes a thing you could see, dear. Not one thing.\nThat's why the answer has felt hollow, dear. Nothing follows from it.",
        "Let me look closer at what has been riding on that word…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — turn him over and he's the same man either way.",
        "You asked about twin flame, or a strong pull. Your hand went to the card of two views.",
        "So this is two names for one situation, dear. That's all it is.\nAnd upside down or right way up, dear, he's still the same man.\nBut nothing about him shifts when the word does, dear.\nThat's why sorting it has got you nowhere, dear. There's nothing to sort.",
        "Let me look closer at what has been forcing this into words…",
      ],
      c: [
        "You turned the Fool, dear. Look — the flower is white whichever way you name it.",
        "You asked about twin flame, or a strong pull. Your hand went to the one who labels nothing.",
        "So he carries the same load under either name, dear.\nAnd the flower is white whichever way you name it, dear.\nBut that word was handed to you, dear. You didn't go looking for it.\nThat's why it weighs on you, dear. It came from someone else.",
        "Let me look closer at who handed you that word…",
      ],
    },
    // 🔴🔴 NEVER NAME OR POINT AT A PERSON FROM HER PAST — no face, no initial, no "you already
    // know who". 🔴🔴 NEVER TELL HER SHE MISSED HIM (invents a loss to grieve) and NEVER promise
    // an arrival instead (a date in disguise). The finding: "without realizing it" presumes a
    // moment she failed a test, and a meeting was never an examination.
    'cards-met-already': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-19 from
      // fb-tarot/docs/drafts/rewrites/cards-met-already.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — nothing on his table has been used up.",
        "You asked if you've already met your soulmate. Your hand went to the man with full hands.",
        "So there was never one go, dear. That isn't how any of this works.\nAnd nothing on his table has been used up, dear. Nothing crossed off.\nBut you've been afraid you spent your one chance, dear.\nThat's why you keep sorting old faces, dear, hunting the one you missed.",
        "Let me look closer at what put that one-chance idea in you…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he's looking at the world from the other end.",
        "You asked if you've already met your soulmate. Your hand went to the card that looks again.",
        "So a review isn't the same as a mistake found, dear.\nAnd he sees the same world, dear, just from the other end of it.\nBut you've been searching your own past like a case file, dear.\nThat's why nothing you find settles it. You were doing your best, dear.",
        "Let me look closer at what has you searching your own past…",
      ],
      c: [
        "You turned the Fool, dear. Look — the road he's on hasn't been walked before.",
        "You asked if you've already met your soulmate. Your hand went to the one with road ahead.",
        "So there's road ahead of you, dear. Plainly, and plenty of it.\nAnd all of it is unwalked, dear. He faces forward the whole time.\nBut a meeting behind you wouldn't close a road like that, dear.\nThat's why the fear doesn't hold, dear, whichever way the answer goes.",
        "Let me look closer at what has been narrowing the road for you…",
      ],
    },
    // ── MONEY-BLOCK (2026-08-19). Written to the Natural Tarot-Cut: the picture, the bridge,
    // then four bubbles that run as one causal chain, then the obstruction. Beat 3 below is
    // those four bubbles joined by newlines, which is how Version B serves them as separate
    // chat messages. Money translation of the cuts: cut 3 answers her fear about HERSELF
    // ("it was never you"), cut 4 says where the thing in the way actually sits, cut 5 is
    // EARNING against KEEPING, cut 6 is the near-miss — "it goes just as it is about to land".
    // Source of every string: fb-tarot/docs/drafts/rewrites/<hook>.json, folded here verbatim.
    // ── money-retiring (55-64) — retirement is close and the money is not there ──
    // Why is my money still blocked this close to retiring?
    'cards-blocked-retiring': {
      a: [
        "You turned the Magician, dear. Look — he's standing, not sitting, with his work in front of him.",
        "You asked why the money is still blocked. Your hand went to the card of a person who can make things.",
        "So it was never you, dear. The making was never where this went wrong.\nAnd look where he stands. The trouble sits further down the line than his hands.\nBut earning a thing and keeping it are two different jobs, dear.\nThat's why it goes just as it's about to land in your hands.",
        "Let me look closer at what steps in right at the landing…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the only rope on him is at his foot.",
        "You asked why the money's still blocked. Your hand went to the card of a thing held in place.",
        "So the money is held, dear. Held is a long way from gone.\nAnd the rope has him at one point only. The rest of him hangs free.\nBut one rope is enough to stop the whole of him moving.\nThat's why the other parts of your life work and this one part never does.",
        "Let me look closer at what has had hold of that one point…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog is running and he's walking.",
        "You asked why the money is blocked so near retiring. Your hand went to the card of a person setting out.",
        "So you're not out of road, dear. This card has never once counted your years.\nAnd see the dog. The hurry on this card belongs to him, not to the man.\nBut hurrying has never once moved this thing out of your way.\nThat's why the years feel short to you, dear, and nothing shifts.",
        "Let me look closer at what's been put in that road in front of you…",
      ],
    },
    // How long has something been blocking me from a nest egg?
    'cards-nest-egg': {
      a: [
        "You turned the Magician, dear. Look — he works standing at a low red table.",
        "You asked how long something has been blocking a nest egg. Your hand went to the steady worker.",
        "So this was never about you, dear. You've kept at it for years.\nAnd there he still is, working at that table. The work went in.\nBut work going in and money staying are two different things, dear.\nThat's why the years of effort show nowhere, dear. Nothing gathered.",
        "Let me look closer at what keeps stopping it from building…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his face is calm, like he has hung there a long time.",
        "You asked how long something has been blocking a nest egg. Your hand went to the card of long stops.",
        "So this hold is old, dear. It isn't anything recent.\nAnd look at his face. Calm, like he has hung there a long while.\nBut I won't count the years for you, dear. No one honestly could.\nThat's why you stopped noticing it, dear. It turned into normal.",
        "Let me look closer at when it first went still…",
      ],
      c: [
        "You turned the Fool, dear. Look — his bag is small and it's not full.",
        "You asked how long something has been blocking a nest egg. Your hand went to the one with an empty bag.",
        "So nothing was taken from you, dear. This is a block, not a loss.\nAnd his bag is small, dear, and it has never once been filled.\nBut a thing never laid down is not a thing taken, dear.\nThat's why nothing can be pointed at, dear. It simply never gathered.",
        "Let me look closer at what has kept the ground bare…",
      ],
    },
    // Is something blocking my money, or did I just leave it too late?
    'cards-too-late': {
      a: [
        "You turned the Magician, dear. Look — red roses over his head and white ones down at his feet.",
        "You asked if something is blocking your money, or if you left it too late. Your hand went to the maker.",
        "So you did not leave it too late, dear. I'll say that plainly.\nAnd his hands still work, dear. That part is your answer.\nBut what stands in your way is a block, dear, and blocks are things.\nThat's why a shut door is what you see, dear. It's a thing in front of one.",
        "Let me look closer at what has been standing there…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he's held up, not fallen down.",
        "You asked if something is blocking your money, or if you left it too late. Your hand went to the card that holds.",
        "So you're not too late, dear. Look — he's held up, not fallen down.\nAnd nothing about him has run out, dear. He's held, that's all.\nBut a hold is the opposite of running out, dear. Quite the opposite.\nThat's why you've blamed your own timing, dear. Timing wasn't it.",
        "Let me look closer at what has had hold of it…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun is out and it's full daylight on him.",
        "You asked if something is blocking your money, or if you left it too late. Your hand went to the card that begins.",
        "So you're not too late, dear. The Fool never asks your age.\nAnd he steps off in full daylight, dear, and nobody stops him.\nBut what stops you is a thing, dear, not a date on a calendar.\nThat's why it can move, dear. Dates can't be moved, and things can.",
        "Let me look closer at what has been put in that road…",
      ],
    },
    // ── money-working (65+) — past the age she expected to stop, and still working ──
    // Why am I still working when the money should have come by now?
    'cards-still-working': {
      a: [
        "You turned the Magician, dear. Look — a snake curls round his waist with its tail in its mouth.",
        "You asked why you're still working. Your hand went to the card of a person who works.",
        "So the fault was never yours, dear. The effort went in, every year.\nAnd look at that belt. It goes round and comes back to itself.\nBut the work went in, dear, and it never once came back out.\nThat's why you're still at it, dear, with nothing to show for the years.",
        "Let me look closer at where all that work has been going…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his head hangs nearer the ground than his feet.",
        "You asked why you're still working. Your hand went to the card of something stopped in the air.",
        "So the rest you were owed is not gone, dear. It stalled.\nAnd it hasn't fallen, dear, and it hasn't landed either.\nBut it stalled on the way to you, dear. Not before it set off.\nThat's why you're still working, dear, when you had planned to have stopped.",
        "Let me look closer at where it stalled…",
      ],
      c: [
        "You turned the Fool, dear. Look — the stick over his shoulder is plain wood with no bark.",
        "You asked why you're still working. Your hand went to the card of a fresh start.",
        "So your years are not a debt, dear. This card doesn't read them that way.\nAnd he sets out with a plain stick, dear, and nothing owed to anyone.\nBut it doesn't come as the settling-up you were promised, dear.\nThat's why the wait went on, dear. You watched for the wrong thing.",
        "Let me look closer at what has been standing where that rest should be…",
      ],
    },
    // How much longer will something keep blocking my money?
    'cards-how-much-longer': {
      a: [
        "You turned the Magician, dear. Look — he could touch all four things without moving his feet.",
        "You asked how much longer. Your hand went to the card of a person who acts.",
        "So this isn't a wait, dear. It's a thing that has to be moved.\nAnd every tool he needs is within reach, dear. Nothing is far off.\nBut no number from me, dear. A block doesn't run down like a clock.\nThat's why last year looked just like this one, dear. Nothing was touched.",
        "Let me look closer at what has not been touched…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he hangs quite still, without a swing in him.",
        "You asked how much longer. Your hand went to the card of a hold that doesn't tire.",
        "So a block doesn't run out, dear. It sits where it is.\nAnd he hasn't moved an inch, dear, and nothing about him is tiring.\nBut I won't hand you a date, dear. A date would be a comfort I made up.\nThat's why nothing has changed on its own, dear. It waits to be moved.",
        "Let me look closer at what is doing the holding…",
      ],
      c: [
        "You turned the Fool, dear. Look — his head is up, and his eyes are off the ground.",
        "You asked how much longer. Your hand went to the card that doesn't count.",
        "So this ends by moving, dear. Not by time running out.\nAnd he counts nothing, dear. He steps, and the counting stops.\nBut you've been serving a sentence, dear. Nobody handed you one.\nThat's why counting has got you nowhere, dear. It was never a countdown.",
        "Let me look closer at what has been standing in the way of that step…",
      ],
    },
    // Is something still blocking my money, or have I run out of time?
    'cards-out-of-time': {
      a: [
        "You turned the Magician, dear. Look — the flowers grow in a bed in front of him, not behind.",
        "You asked if you're blocked or out of time. Your hand went to the card of what's still to hand.",
        "So you have not run out of time, dear. I'll say it plainly.\nAnd this card deals in what's here now, dear. It shows me something here.\nBut a block is a thing standing in a road, dear. Not the end of the road.\nThat's why it has felt final, dear, when it has never once been final.",
        "Let me look closer at what is standing there…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one leg is crossed behind the other at the knee.",
        "You asked if you're blocked or out of time. Your hand went to the card of a hold.",
        "So you have not run out of time, dear. This is a hold, not an ending.\nAnd nothing about a hold is finished, dear. It can be shifted.\nBut you have read this hold as a verdict on your whole life, dear.\nThat's why the years frighten you, dear. You read a pause as a full stop.",
        "Let me look closer at what took hold, and when…",
      ],
      c: [
        "You turned the Fool, dear. Look — there's nothing drawn behind his shoulders at all.",
        "You asked if you're blocked or out of time. Your hand went to the card that begins.",
        "So you have not run out of time, dear. This card keeps no calendar.\nAnd he begins with nothing behind him, dear. Nothing owed either.\nBut this card shows an open road, dear. Nobody finished is shown one.\nThat's why your fear and this card disagree, dear. One of them is wrong.",
        "Let me look closer at what has been laid across that road…",
      ],
    },
    // ── money-energy — she suspects herself, because the internet told her to ──
    // Is my energy blocking my money?
    'cards-my-energy': {
      a: [
        "You turned the Magician, dear. Look — white lilies at the front and red roses behind them.",
        "You asked if your energy is blocking the money. Your hand went to the card of work being done.",
        "So no, dear. Your energy has never been the block.\nAnd on this card the energy is the tool, dear. It's what does the work.\nBut yours has been pouring out at full strength for years, dear.\nThat's why you're tired and nothing shows, dear. Something has been taking it.",
        "Let me look closer at where all that has been going…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he's held from above, with nothing under him.",
        "You asked if your energy is blocking the money. Your hand went to the card of a thing under weight.",
        "So your energy isn't wrong, dear. It's under weight.\nAnd wrong and weighed down are two different things, dear.\nBut you've been told the first one for years, dear. I won't repeat it.\nThat's why the harder you push, the heavier it sits, dear.",
        "Let me look closer at what has been pressing on it…",
      ],
      c: [
        "You turned the Fool, dear. Look — his sleeves and collar are edged with a pale trim.",
        "You asked if your energy works against you. Your hand went to the card of open hands.",
        "So your energy is still fresh, dear. After all of it.\nAnd this card is unspent, dear, and still willing to set out.\nBut that's not how a woman in her own way reads, dear.\nThat's why you kept turning it over, dear. The blame was never yours.",
        "Let me look closer at what is actually in the way…",
      ],
    },
    // What does my energy say about why money won't stay?
    'cards-money-wont-stay': {
      a: [
        "You turned the Magician, dear. Look — the table he works at is small and plain.",
        "You asked why money won't stay. Your hand went to the card of a maker.",
        "So the getting has always worked, dear. That half of it is sound.\nAnd this card is all about bringing it in, dear. Look at the table.\nBut drawing it in is one job, dear. Keeping it is a second one.\nThat's why it arrives and goes, dear, and you never see it settle.",
        "Let me look closer at the door it goes back out of…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam above him is wider than he is.",
        "You asked why money won't stay. Your hand went to the card of what won't let go.",
        "So nothing is leaking out of you, dear. That's not what this shows.\nAnd something further up has hold of it, dear. It never gets to you.\nBut a claim made further up takes its share first, dear.\nThat's why what lands is always less than what you earned, dear.",
        "Let me look closer at what has the claim…",
      ],
      c: [
        "You turned the Fool, dear. Look — there's more sky on this card than ground.",
        "You asked why money won't stay. Your hand went to the most open card in the deck.",
        "So being open isn't a fault, dear. It's how you've been loved.\nAnd this card gives as easily as it takes, dear. That's its nature.\nBut nothing has ever been built to hold what comes in, dear.\nThat's why it goes straight through, dear. However much comes in.",
        "Let me look closer at what has never been built…",
      ],
    },
    // How long has my energy been working against my money?
    'cards-energy-how-long': {
      a: [
        "You turned the Magician, dear. Look — the wand is the only thing he's holding.",
        "You asked how long your energy has worked against you. Your hand went to the card of aim.",
        "So it never once did, dear. Your aim has been right the whole time.\nAnd every year of it went at something, dear. It went in straight.\nBut something at the far end kept taking it in, dear.\nThat's why the work vanished, dear. You started to blame yourself.",
        "Let me look closer at how far back that reaches…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope is tied neatly, not knotted in a hurry.",
        "You asked how long your energy has worked against you. Your hand went to the older card.",
        "So this began before you started keeping score, dear.\nAnd whatever settled here settled long ago, dear. No one named it.\nBut I won't give you a count of years, dear. Nobody honest would.\nThat's why no day marks the start, dear. There isn't one to find.",
        "Let me look closer at when it settled…",
      ],
      c: [
        "You turned the Fool, dear. Look — his belt is tied in a simple knot at the front.",
        "You asked how long the energy has worked against your money. Your hand went to the card that keeps no record.",
        "So nothing has been running against you, dear. Nothing at all.\nAnd this card carries no account of your years, dear. None.\nBut a bare field and a poisoned one are different things, dear.\nThat's why waste is the word you reach for, dear. Nothing was spoiled.",
        "Let me look closer at why the ground has stayed bare…",
      ],
    },
    // ── money-prayer — she has prayed for years. Never rule on God, in either direction ──
    // I've prayed about money for years. What's still blocking it?
    'cards-prayed-years': {
      a: [
        "You turned the Magician, dear. Look — the ground he stands on is flowers, not stone.",
        "You asked what is still blocking it. Your hand went to the card of things you can touch.",
        "So I don't read prayers, dear. That isn't mine to read.\nAnd this card points at something plainer, dear. Something down here.\nBut a plain thing has stood between the work and the result, dear.\nThat's why it has gone on so long, dear. Nobody ever named the thing.",
        "Let me look closer at what is standing there…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his free foot rests against the tied leg.",
        "You've prayed for years, dear. Your hand went to the card of a long quiet.",
        "So I won't say what your prayers were met with, dear. That's yours.\nAnd no card of mine ranks above what you pray to, dear. None.\nBut something in your day to day is held, dear.\nThat's why the quiet has felt like an answer, dear. A hold isn't one.",
        "Let me look closer at what has been held…",
      ],
      c: [
        "You turned the Fool, dear. Look — there's nothing behind him on the path he came along.",
        "You asked what is still blocking the money. Your hand went to the card of an open road.",
        "So I won't speak for what you pray to, dear. The Fool speaks of the road.\nAnd the way ahead is still open, dear, and still unwritten.\nBut what has held this up is lying in the road, dear.\nThat's why it has felt like a verdict on you, dear. It's an object.",
        "Let me look closer at what is lying in it…",
      ],
    },
    // How long will my prayers for money keep going unanswered?
    'cards-prayers-unanswered': {
      a: [
        "You turned the Magician, dear. Look — he stands in the middle, with room on both sides.",
        "You asked how much longer your prayers go on. Your hand went to the card of doing.",
        "So I can't say what has been answered, dear, and I won't guess.\nAnd this card turns me toward what is yours to touch, dear.\nBut nothing here waits on permission, dear. It waits on being moved.\nThat's why the years have passed with no change, dear. Nothing was moved.",
        "Let me look closer at what has been left unmoved…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam is higher than anything else on the card.",
        "You asked how long the prayers keep going. Your hand went to the card made of waiting.",
        "So a hold is not a refusal, dear. I'll say that much plainly.\nAnd I won't call this answered, dear, and I won't call it refused.\nBut you've been treating a long quiet as a no, dear.\nThat's why a long quiet reads as a door closing, dear. Nothing closed.",
        "Let me look closer at what the quiet has been sitting on…",
      ],
      c: [
        "You turned the Fool, dear. Look — he holds the stick loosely, with two fingers.",
        "You asked how long the prayers go on. Your hand went to the card that moves.",
        "So I won't give you a date, dear, and I won't speak for heaven.\nAnd this card says one thing only, dear. The road has not closed.\nBut a woman still walking it hasn't been turned down, dear.\nThat's why walking on has cost you, dear. Nothing has shown you it's worth it.",
        "Let me look closer at what has been sitting in the road ahead…",
      ],
    },
    // ── Soulmate age-band, test A (wired 2026-08-20) ──────────────────────────────────
    'cards-slipping-past': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-slipping-past.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the roses above him hang from the corners, not the middle.",
        "You asked why your soulmate keeps slipping past. Your hand went to the man who holds his work close.",
        "So you were never what was missing, dear. Look at that table — nothing on it is short.\nAnd it broke at the same point every time, dear. Right before it held.\nBut you've gone over your own part again and again, dear.\nThat's why you feel it coming now, dear. Close, and then quiet.",
        "Let me look closer at what steps in just before it lands…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his beard hangs down toward the bottom of the card.",
        "You asked why your soulmate keeps slipping past. Your hand went to the card that stops half way.",
        "So none of them got away from you, dear. They stopped before the end.\nAnd this whole card is a stop, dear. Nothing in it has finished.\nBut you've counted each one as a loss, dear. They were stops.\nThat's why it never feels done, dear. Not one of them actually left.",
        "Let me look closer at what you've been left holding each time…",
      ],
      c: [
        "You turned the Fool, dear. Look — his collar is white and cut into points.",
        "You asked why your soulmate keeps slipping past. Your hand went to the one still walking.",
        "So you didn't miss them, dear. The ground ran out under each one.\nAnd it ran out behind you, dear. Not out in front where you'd see it.\nBut you've searched the front of it every time, dear. For a warning.\nThat's why you never see it coming, dear. You watch the wrong end.",
        "Let me look closer at what has been cutting these short each time…",
      ],
    },
    'cards-choosing-wrong': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-choosing-wrong.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the sword on his table has a cross at the handle.",
        "You asked what keeps you choosing everyone but your soulmate. Your hand went to the man with his tools laid out.",
        "So you didn't choose them, dear. They showed you one man and turned into another.\nAnd that table has four different things on it, dear. You got shown one.\nBut you had one thing to go on, dear. Anyone would have read it the same.\nThat's why it changed on you later, dear. You'd only ever seen the front.",
        "Let me look closer at what gets shown first and what comes after…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his shoes are gold, and they're the brightest thing he wears.",
        "You asked what keeps you choosing everyone but your soulmate. Your hand went to the card that hangs the wrong way up.",
        "So the fault was not in your choosing, dear. You were shown the wrong way up.\nAnd the gold on this card sits at his feet, dear. Not at his head.\nBut you can only see what's turned toward you, dear. The rest stays round the back.\nThat's why they seemed right at the start, dear. The bright part faces out.",
        "Let me look closer at what has been turned away from you each time…",
      ],
      c: [
        "You turned the Fool, dear. Look — the flowers on his coat are stitched, not picked.",
        "You asked what keeps you choosing everyone but your soulmate. Your hand went to the one dressed for the road.",
        "So you were not picking badly, dear. You were picking from what came near you.\nAnd the flowers on that coat are stitched on, dear. Not one of them grew.\nBut from where you stood they looked real, dear. Anyone would think so.\nThat's why you believed them, dear. They were made to look that way.",
        "Let me look closer at what was sewn on before you ever met…",
      ],
    },
    'cards-found-me-yet': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-found-me-yet.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the cup on his table has a stem and a foot.",
        "You asked why your soulmate hasn't found you yet. Your hand went to the man with his work set out.",
        "So you did nothing to stop this, dear. Not one thing you did closed it off.\nAnd the cup on that table is already out, dear. Filled and standing.\nBut you've read that as something you failed at, dear.\nThat's why you turn it over so often, dear. You were ready, and it still didn't come.",
        "Let me look closer at what's been left standing in front of that cup…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — leaves grow on both arms of the beam above him.",
        "You asked why your soulmate hasn't found you yet. Your hand went to the card that waits.",
        "So this was never yours to fix, dear. Nothing here was put in place by you.\nAnd the wood still has green on it, dear. A stop, not an ending.\nBut you've worked at it as though it were yours, dear.\nThat's why trying harder changed nothing, dear. It was never in your hands.",
        "Let me look closer at what tied this up in the first place…",
      ],
      c: [
        "You turned the Fool, dear. Look — his hair curls out from under the green wreath.",
        "You asked why your soulmate hasn't found you yet. Your hand went to the one already walking.",
        "So you are not hard to find, dear. Look at that card — nothing on it is hidden.\nAnd there's no map drawn anywhere on it, dear. None was needed.\nBut you've started to think you're the thing that's hidden, dear.\nThat's why silence has felt personal, dear. Like it was aimed at you.",
        "Let me look closer at what made that quiet feel aimed at you…",
      ],
    },
    'cards-keeps-waiting': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-keeps-waiting.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his raised sleeve is white, and the robe over it is red.",
        "You asked how long a soulmate keeps you waiting. Your hand went to the man at work.",
        "So I won't put a number on it, dear. No honest reader would.\nAnd there's no door on that card, dear. Nothing on it is being watched.\nBut you've been watching it, dear. Your eyes go there before anything else.\nThat's why rest doesn't help, dear. You've been holding a door open on your own.",
        "Let me look closer at what has been keeping that door shut…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — there's no ground drawn under him at all.",
        "You asked how long a soulmate keeps you waiting. Your hand went to the card that hangs.",
        "So this card gives no length, dear. It was never built to.\nAnd nothing on it is being counted, dear. No marks, no tally.\nBut you've been keeping that count yourself, dear. Quietly.\nThat's why it stays on your mind, dear. Nothing has been settled yet.",
        "Let me look closer at what has been holding the settling up…",
      ],
      c: [
        "You turned the Fool, dear. Look — he carries it all on one shoulder, and it's the right one.",
        "You asked how long a soulmate keeps you waiting. Your hand went to the one still on the road.",
        "So no reader can give you a date, dear. Anyone who does is guessing.\nAnd there's no date on that card, dear. Nowhere on it.\nBut you've been reading the quiet as an answer, dear.\nThat's why the quiet has weighed so much, dear. Nothing said, so you filled it in.",
        "Let me look closer at what has been keeping this so quiet…",
      ],
    },
    'cards-missed-chance': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-missed-chance.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — there's no chair on this card, only him and the table.",
        "You asked if you've already missed your soulmate. Your hand went to the card of a thing being made.",
        "So no, dear. Nothing on that table has been used up and carried off.\nAnd nothing there is being handed out, dear. There's no queue and no last one.\nBut you've pictured it as one thing passing by, dear. Once, and gone.\nThat's why you keep sifting back through it, dear. Looking for where you let it go.",
        "Let me look closer at what keeps pulling you back over it…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his hair hangs straight down and none of it moves.",
        "You asked if you've already missed your soulmate. Your hand went to the card that hasn't finished.",
        "So no, dear. This card is a middle, and a middle has no ending on it.\nAnd nothing on it has gone past, dear. It's all still hanging there.\nBut you've settled it in your own mind already, dear. Missed, and done.\nThat's why good news slides off you now, dear. You'd already shut the book.",
        "Let me look closer at what shut that book so early…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog's coat is drawn in tight curls.",
        "You asked if you've already missed your soulmate. Your hand went to the card that starts.",
        "So no, dear. That card opens the deck, it does not end one.\nAnd there's no gate on it, dear. Nothing on that road opens and then shuts.\nBut you've been living as though one shut, dear. Somewhere back there, quietly.\nThat's why you count backwards now, dear. You're hunting for the door you walked past.",
        "Let me look closer at what put a door on that road…",
      ],
    },
    'cards-after-marriage': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-after-marriage.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the loop above his head is lying on its side.",
        "You asked if there's a soulmate for you after the marriage ended. Your hand went to the man who starts things.",
        "So yes, dear. The loop above him has no end and no one place to start.\nAnd four things sit out on that wood, dear. Not one.\nBut you've been counting, dear. One marriage, one chance, and the sum stops there.\nThat's why it felt like the end of it, dear. One ended, so you counted none left.",
        "Let me look closer at what has been closing this off since…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his tunic is grey-green, and his legs are in red.",
        "You asked if there's a soulmate for you after the marriage ended. Your hand went to the card that turns things over.",
        "So the answer is yes, dear. This card ends nothing — it turns it.\nAnd nothing on this card is broken, dear. Turned round, but whole.\nBut you've been living it as an ending, dear. Not as a turn.\nThat's why nothing has felt steady since, dear. A turn feels like a fall while you're in it.",
        "Let me look closer at what has stopped this turning all the way…",
      ],
      c: [
        "You turned the Fool, dear. Look — the dog's front paws are up off the ground.",
        "You asked if there's a soulmate for you after the marriage ended. Your hand went to the one who starts again.",
        "So yes, dear. That card is a first step, and it opens the whole deck.\nAnd the road behind is off the card, dear. It isn't drawn anywhere.\nBut you've been standing at the edge, dear. Looking down, not out.\nThat's why you look down first now, dear. You know what a drop costs.",
        "Let me look closer at what has kept you at that edge…",
      ],
    },
    'cards-second-time': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-second-time.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the lilies at the front have long stems and stand straight.",
        "You asked how long it takes to find a soulmate the second time. Your hand went to the man who begins.",
        "So there's no rule for a second one, dear. I won't pretend there is.\nAnd that table is set the same as it ever was, dear. Nothing missing.\nBut you come to it knowing things now, dear. You didn't before.\nThat's why this one feels heavier, dear. You're carrying what the first one taught you.",
        "Let me look closer at what came with you from the first…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — a small mark sits in the bottom corner of the card.",
        "You asked how long it takes to find a soulmate the second time. Your hand went to the card that holds still.",
        "So no clock runs on this card, dear. Not the first time, and not now.\nAnd this card keeps no score, dear. First or second, it reads the same.\nBut you've been keeping score yourself, dear. First, second, and how far behind.\nThat's why this feels like catching up, dear. You've been counting from where you started over.",
        "Let me look closer at what has been running that count…",
      ],
      c: [
        "You turned the Fool, dear. Look — the cliff below him is layered like steps of rock.",
        "You asked how long it takes to find a soulmate the second time. Your hand went to the one who sets out.",
        "So I can't time it for you, dear. Nobody walks this at a set pace.\nAnd that card has no second time on it, dear. Every step out is a first.\nBut you've walked out before, dear. You know what the ground does.\nThat's why you're slower now, dear. You're watching where you put your foot.",
        "Let me look closer at what has made the ground feel unsafe…",
      ],
    },
    'cards-best-years': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-best-years.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — there's no shadow under him at all.",
        "You asked why you gave your best years to the wrong man. Your hand went to the man who builds.",
        "So those years were not paid out, dear. Nothing on that table ever left it.\nAnd what you built in them is still yours, dear. It didn't go with him.\nBut you've been adding them up as a loss, dear. Year by year.\nThat's why the number is the part that hurts, dear. Not him — the count.",
        "Let me look closer at what keeps that count running…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his blue coat and red legs are the brightest things here.",
        "You asked why you gave your best years to the wrong man. Your hand went to the card that holds on.",
        "So you didn't throw them away, dear. They're still held on this card.\nAnd this card holds it all in place, dear. Nothing on it has been lost.\nBut you've written that stretch off already, dear. Crossed out, all of it.\nThat's why looking back stings so, dear. You cross it out again each time.",
        "Let me look closer at what makes you cross those years out…",
      ],
      c: [
        "You turned the Fool, dear. Look — his belt is worked with small circles all the way round.",
        "You asked why you gave your best years to the wrong man. Your hand went to the one on the road.",
        "So you didn't come out of it empty, dear. What you carry is on you, not behind you.\nAnd the road behind him isn't drawn, dear. Not one bit of it made the card.\nBut you keep turning round to look at yours, dear. It's all you measure by.\nThat's why each year feels spent, dear. You've been counting what it cost you.",
        "Let me look closer at what keeps you turned round…",
      ],
    },
    'cards-too-late-love': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-too-late-love.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — there's no wall and no door behind him, only sky.",
        "You asked if it's too late to meet your soulmate. Your hand went to the man who is still working.",
        "So no door has shut, dear. There isn't one on this card to close.\nAnd nothing on that table is packed away, dear. It's all still out.\nBut you've been treating it as shut, dear. So you stopped trying the handle.\nThat's why you stopped looking, dear. You had no reason to keep checking.",
        "Let me look closer at what put that door there…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rays at his head are short, and they all match.",
        "You asked if it's too late to meet your soulmate. Your hand went to the card that waits with him.",
        "So this card does not say late, dear. It has no way of saying it.\nAnd the light at his head is still on, dear. Bright as it ever was.\nBut you've been reading it from underneath, dear. All of it looks late from there.\nThat's why late was the word that fitted, dear. It was the only one left.",
        "Let me look closer at what turned you upside down in the first place…",
      ],
      c: [
        "You turned the Fool, dear. Look — his sleeves are slit, and there's red showing through.",
        "You asked if it's too late to meet your soulmate. Your hand went to the one just setting off.",
        "So there is no late on this card, dear. Nothing on it has a time to be there by.\nAnd that card is the first in the whole deck, dear. Numbered nothing at all.\nBut you've been putting yourself near the end, dear. Counting from the wrong side.\nThat's why running out is how it feels, dear. You've been counting down, not up.",
        "Let me look closer at what set that count going…",
      ],
    },
    'cards-longer-to-wait': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-longer-to-wait.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the vine above him only reaches the two top corners.",
        "You asked how much longer you have to wait for your soulmate. Your hand went to the man still at his table.",
        "So I won't count it out for you, dear. That count doesn't exist.\nAnd nothing on that card is waiting, dear. Both hands are busy.\nBut you've been living in the wait, dear. Not just passing through.\nThat's why sleep hasn't helped, dear. Part way through wears at you.",
        "Let me look closer at what has held this part way through…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the rope goes round his foot once and stops there.",
        "You asked how much longer you have to wait for your soulmate. Your hand went to the card that hangs on.",
        "So there's no number here, dear. I'd be making it up and you'd know.\nAnd one rope is all there is on that card, dear. Just the one.\nBut you've been braced for something much bigger, dear.\nThat's why so little has moved, dear. One small thing has been holding all of it.",
        "Let me look closer at the one thing holding this…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun is up in the corner, and the sky is clear.",
        "You asked how much longer you have to wait for your soulmate. Your hand went to the one out on the road.",
        "So I can't hand you a number, dear. There isn't one to hand.\nAnd no one on that road knows how far, dear. It isn't written anywhere.\nBut you've stood still to count it, dear. And the counting is the weight.\nThat's why the question won't leave you, dear. You can see the road and still not the end.",
        "Let me look closer at what's keeping the end out of sight…",
      ],
    },
    'cards-allowed-to-want': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-allowed-to-want.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the cup on his table has no lid on it.",
        "You asked if you're still allowed to want a soulmate. Your hand went to the card where the work sits out in the open.",
        "So nobody hands that out, dear. There's no one on this card giving leave.\nAnd nothing there has been taken away, dear. Not one thing.\nBut you've been waiting to be told it's alright, dear. By someone.\nThat's why you say it quietly, dear. Or add that you know it's silly.",
        "Let me look closer at what taught you to ask first…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the light behind his head has points on it, like a star.",
        "You asked if you're still allowed to want a soulmate. Your hand went to the card that will not be hurried.",
        "So you are not wrong to want it, dear. That light is on and nothing has dimmed it.\nAnd it sits behind his head, dear. Not out front where it gets judged.\nBut you've kept yours out of sight too, dear. Where nobody can weigh in.\nThat's why you tell people you're content, dear. It's easier than being talked out of it.",
        "Let me look closer at what made it safer to say nothing…",
      ],
      c: [
        "You turned the Fool, dear. Look — there's nobody stood at that edge telling him to stop.",
        "You asked if you're still allowed to want a soulmate. Your hand went to the one who just goes.",
        "So there's no one whose word you need, dear. Look at that card — nobody is asked.\nAnd nothing on that road is marked off, dear. No sign, no rope across it.\nBut you put the question to other people, dear. And you took their answer.\nThat's why you say sorry for it now, dear. You never used to.",
        "Let me look closer at what that answer left behind…",
      ],
    },
    // ── Soulmate keyword, test B (wired 2026-08-20) ───────────────────────────────────
    'cards-blocking-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-blocking-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his right hand is up and his left points at the ground.",
        "You asked if something is blocking you from your soulmate. Your hand went to the card of a thing being worked.",
        "So yes, dear. Something is in the way, and it was never you.\nAnd look where he points, dear. Down at the ground, not out at the world.\nBut you've been searching yourself for it, dear. Turning over what you did.\nThat's why nothing you tried has shifted it, dear. You were looking in the wrong place.",
        "Let me look closer at where the block is actually sitting…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — one rope, one ankle, and the rest of him quite free.",
        "You asked if something is blocking you from your soulmate. Your hand went to the card of a thing held.",
        "So yes, dear. Something has a hold on this, and it is one thing, not you.\nAnd it's a small thing, dear. One rope, and the whole card stops.\nBut you've been treating it as all of you, dear. Your whole self.\nThat's why it has felt so big, dear. One rope holding still can stop a life.",
        "Let me look closer at the one thing that has a hold on this…",
      ],
      c: [
        "You turned the Fool, dear. Look — the drop is right at his boot and the sun is still full on him.",
        "You asked if something is blocking you from your soulmate. Your hand went to the card of open road.",
        "So yes, dear. Something sits across the road, and you did not put it there.\nAnd the road itself is clear, dear. Wide open, and lit.\nBut you've begun to think the road was never yours, dear.\nThat's why you slowed, dear. Not because you gave up — because nothing gave.",
        "Let me look closer at what is lying across that road…",
      ],
    },
    'cards-blocked-before': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-blocked-before.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — every tool on that table is within reach of one hand.",
        "You asked why you keep getting blocked before your soulmate comes. Your hand went to the card where nothing is missing.",
        "So it stops at the same place each time, dear. That is a position, not a habit of yours.\nAnd it stops early, dear. Before a single person is in it.\nBut you've read the repeat as a fact about yourself, dear.\nThat's why the sameness is what wears, dear. Not the loss — the repeat of it.",
        "Let me look closer at the point it keeps stopping at…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the beam holds and not one line under it is level.",
        "You asked why you keep getting blocked before your soulmate comes. Your hand went to the card that halts.",
        "So the halt comes first, dear. Long before anyone arrives, and that is the whole point.\nAnd a halt sits in one spot, dear. It does not follow you about.\nBut you've carried it as though it travels with you, dear.\nThat's why every fresh start feels borrowed, dear. You're waiting for it to catch up.",
        "Let me look closer at the spot it has been sitting in…",
      ],
      c: [
        "You turned the Fool, dear. Look — the road behind him is not drawn, only the ground he is on.",
        "You asked why you keep getting blocked before your soulmate comes. Your hand went to the card of setting out.",
        "So you get as far as the setting out, dear. Then it closes, before a person is in it.\nAnd this card is only ever the setting out, dear. It never shows the arriving.\nBut you've counted each one as a failure, dear. They were the same stop.\nThat's why hope costs you more each time, dear. You've paid at the same gate twice over.",
        "Let me look closer at the gate that keeps closing…",
      ],
    },
    'cards-connection-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-connection-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — a cup and a coin sat side by side on the table.",
        "You asked if this connection is your soulmate or something else. Your hand went to the card that names things.",
        "So this is not nothing, dear. Whatever you end up calling it, there is something there.\nAnd there are four names on that table, dear. All four are real things.\nBut you've made the name the first job, dear. Before anything else can happen.\nThat's why the question never closes, dear. A name was never going to settle this.",
        "Let me look closer at what the naming has been standing in for…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he sees the whole card, just not the way up you do.",
        "You asked if this connection is your soulmate or something else. Your hand went to the card that hangs the other way up.",
        "So it is real, dear. This card does not deal in made-up things.\nAnd it shows one thing from two ways up, dear. Both of them true.\nBut you've been asking which one it is, dear. As though only one can be.\nThat's why no answer has stuck, dear. You've been sorting something that will not sort.",
        "Let me look closer at what you'd have to give up to stop sorting it…",
      ],
      c: [
        "You turned the Fool, dear. Look — the white flower is held out, away from him, at arm's length.",
        "You asked if this connection is your soulmate or something else. Your hand went to the card with no label on it.",
        "So it counts, dear. This card puts no name on where it leads, and it counts anyway.\nAnd that flower is held out, dear. Offered, and not yet taken.\nBut you've wanted it named before you'd let it matter, dear.\nThat's why there's no settling in it, dear. You've been waiting on a word.",
        "Let me look closer at what has kept that word out of reach…",
      ],
    },
    'cards-connection-nothing': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-connection-nothing.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — his wand is raised and nothing on the table has moved yet.",
        "You asked why this feels like your soulmate when nothing is happening. Your hand went to the card of work not yet done.",
        "So what you feel and what moves are two things, dear. They keep different time.\nAnd the hand on this card is still up, dear. Nothing on the table has stirred.\nBut you've been reading the stillness as your answer, dear.\nThat's why you doubt yourself at night, dear. Nothing moved, so you marked yourself wrong.",
        "Let me look closer at what has been keeping it all so still…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — nothing on this card is falling and nothing is climbing.",
        "You asked why this feels like your soulmate when nothing is happening. Your hand went to the card where nothing moves.",
        "So a stop isn't an absence, dear. This whole card is a held thing, and it's full.\nAnd there's nothing underneath him at all, dear. So nothing has anywhere to move.\nBut you've taken quiet as proof, dear. Proof of what you feared.\nThat's why you re-read old messages at night, dear. Hunting for something to hold up.",
        "Let me look closer at what has been holding all of this still…",
      ],
      c: [
        "You turned the Fool, dear. Look — the little dog is up on its back legs and he has not turned round.",
        "You asked why this feels like your soulmate when nothing is happening. Your hand went to the card that starts before it shows.",
        "So you felt it first, dear. On this card that always comes before there's anything to see.\nAnd nothing on that road has happened yet, dear. Not one thing.\nBut you've been grading yourself on what has shown up, dear.\nThat's why the word fool keeps coming up, dear. You had nothing to check it against.",
        "Let me look closer at what's due to show and hasn't…",
      ],
    },
    'cards-energy-away': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-energy-away.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — the wand in his raised hand is lit at the tip.",
        "You asked if your energy is keeping your soulmate away. Your hand went to the card where the power is the tool.",
        "So no, dear. What you carry has never been what keeps people off.\nAnd on this card it's the thing that works, dear. Not the thing in the way.\nBut yours has been going out at full strength a long while, dear.\nThat's why there's nothing to point at, dear. And you're tired out all the same.",
        "Let me look closer at where all of it has been going…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the light behind his head is bright and his face is quite calm.",
        "You asked if your energy is keeping your soulmate away. Your hand went to the card that's still lit.",
        "So no, dear. Nothing about you sends people off — look at that light.\nAnd that light is doing the work, dear. It never once stood in your way.\nBut you've been looking inward first, dear, and it was never in there.\nThat's why you're tired, dear. Something outside you has been drawing on it.",
        "Let me look closer at what has been drawing on that light…",
      ],
      c: [
        "You turned the Fool, dear. Look — the sun is high and it is full daylight on the whole card.",
        "You asked if your energy is keeping your soulmate away. Your hand went to the card in open sun.",
        "So no, dear. There's no shadow on you here, and the light falls on all of it.\nAnd nothing on it's in shade, dear. Nothing hidden, nothing held back.\nBut you've started dimming yourself on purpose, dear. Just in case.\nThat's why meeting people costs you now, dear. You go in half turned down.",
        "Let me look closer at what taught you to turn yourself down…",
      ],
    },
    'cards-energy-soulmate': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-energy-soulmate.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — one arm straight up, and the sleeve falling back off the wrist.",
        "You asked what your energy says about your soulmate. Your hand went to the card of a thing still being made.",
        "So it says you are still reaching, dear. That arm has not come down.\nAnd it points up and out, dear. Away from himself, at something not here yet.\nBut you've read your own tiredness as giving up, dear.\nThat's why closed off is the phrase you reach for, dear. Worn would be nearer.",
        "Let me look closer at what has been wearing on that reach…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — his eyes are open, and he is not asleep.",
        "You asked what your energy says about your soulmate. Your hand went to the card that waits awake.",
        "So it says you're still here, dear. You never went anywhere.\nAnd the eyes stay open, dear. Through all of it, on a card where nothing else moves.\nBut you've called that stubbornness, dear. Or worse.\nThat's why you play it down when people ask, dear. You'd rather they didn't see it.",
        "Let me look closer at what made it something to hide…",
      ],
      c: [
        "You turned the Fool, dear. Look — his head is up and his eyes are off the ground.",
        "You asked what your energy says about your soulmate. Your hand went to the card that keeps looking up.",
        "So it says you have not stopped looking, dear. The head on this card is up.\nAnd it stays up, dear, with the drop right there at the boot.\nBut you've been counting the years and calling that foolish, dear.\nThat's why hoping has started to feel like a fault, dear. It is the one thing that never went.",
        "Let me look closer at what turned hoping into a fault…",
      ],
    },
    'cards-waiting-to-heal': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-waiting-to-heal.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — nothing on that table is put away.",
        "You asked if your soulmate is waiting for you to heal. Your hand went to the card where the work is already begun.",
        "So no, dear. Nothing is standing still, waiting on you to be finished.\nAnd there's no test on that table, dear. Nothing on it has to be passed.\nBut you've run your life as though there's one, dear. Yourself last.\nThat's why later is where things go, dear. Something taught you to wait your turn.",
        "Let me look closer at what put you last in your own queue…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — he hangs by one foot and his face has no strain in it.",
        "You asked if your soulmate is waiting for you to heal. Your hand went to the card that holds without struggling.",
        "So no, dear. Nothing on this card is on hold, and nothing waits on you.\nAnd this card is held and whole at the same time, dear.\nBut someone told you to be whole first, dear, and you believed it.\nThat's why you keep setting the bar further out, dear. It moves each time you near it.",
        "Let me look closer at what keeps moving that bar…",
      ],
      c: [
        "You turned the Fool, dear. Look — he steps off with his bundle still tied shut.",
        "You asked if your soulmate is waiting for you to heal. Your hand went to the card that goes as it is.",
        "So no, dear. Not one thing here is holding back until you're ready.\nAnd the bundle isn't unpacked, dear. It goes with him, tied as it is.\nBut you've been unpacking yours first, dear. Before you'd let yourself go anywhere.\nThat's why the going never comes, dear. There's always one more thing in the bag.",
        "Let me look closer at what's still in that bundle…",
      ],
    },
    'cards-heal-first': {
      // 🔄 Natural Tarot-Cut, wired 2026-08-20 from
      // fb-tarot/docs/drafts/rewrites/cards-heal-first.json — approved copy, folded verbatim:
      // bubbles 3-6 become beat 3, joined by newlines, and Version B serves them as
      // separate chat messages with a typing pause between each.
      a: [
        "You turned the Magician, dear. Look — all four things are on the table at once, not one after another.",
        "You asked if healing comes first, before your soulmate. Your hand went to the card where it's all out together.",
        "So there's no before, dear. Nothing on that table is waiting its turn.\nAnd all four sit there at once, dear. None of them is first.\nBut you've been running yours in order, dear. This, then that, then love.\nThat's why love keeps sliding down the list, dear. It has been last for years.",
        "Let me look closer at what put love at the end of that list…",
      ],
      b: [
        "You turned the Hanged Man, dear. Look — the wood he hangs from has green leaves still coming out of it.",
        "You asked if healing comes first, before your soulmate. Your hand went to the card where two things happen at once.",
        "So it doesn't go in order, dear. On this card the mending and the hanging are one moment.\nAnd the leaves come out of cut wood, dear. Straight out of the cut, not after it.\nBut you've been waiting for one to finish, dear, so the other can start.\nThat's why you feel behind, dear. You've been queueing for a door that's open.",
        "Let me look closer at what keeps you stood at that door…",
      ],
      c: [
        "You turned the Fool, dear. Look — his foot is already off the rock and the flower is still in his hand.",
        "You asked if healing comes first, before your soulmate. Your hand went to the card that goes anyway.",
        "So no, dear. Nothing on this card was finished before it started.\nAnd the step and the flower happen together, dear. Not one, then the other.\nBut you've set yourself a mark to reach first, dear.\nThat's why not yet has become your answer, dear. To yourself, mostly.",
        "Let me look closer at what set that mark where it's at…",
      ],
    },
  },
}

export const DECKS: Record<TarotDeck, CardSetConfig> = {
  'arcana-mfh': ARCANA_MFH,
  'arcana-eef': ARCANA_EEF,
  'return-mhf': RETURN_MHF,
}

export function getDeck(deck: TarotDeck): CardSetConfig {
  return DECKS[deck]
}

// The S1 tap instruction for a hook on a deck. The deck's own line unless that hook overrides
// it — which the money hooks do, because return-mhf's line names a man.
export function instructionFor(deck: TarotDeck, hook: TarotHook | null): string {
  const cfg = DECKS[deck]
  return (hook && cfg.hookInstruction?.[hook]) || cfg.instruction
}

// The decode-him funnel is love/relationship-themed, so the chat skips the
// topic picker (same as palm).
//
// 🔴 It was hardcoded to 'love' until 2026-08-19, which was correct while every hook on the
// funnel asked about a man. The money hooks broke that: a woman who clicked an ad about her
// pension would have been handed a LOVE reading for the rest of the chat, and nothing
// downstream would have noticed. tests/tarot-money-block-copy.test.ts asserts this the moment
// a money hook lands in the registry.
const MONEY_HOOKS: TarotHook[] = [
  ...MONEY_RETIRING_HOOKS,
  ...MONEY_WORKING_HOOKS,
  ...MONEY_ENERGY_HOOKS,
  ...MONEY_PRAYER_HOOKS,
]
export function hookToBucket(hook: TarotHook): Bucket {
  return MONEY_HOOKS.includes(hook) ? 'money' : 'love'
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
