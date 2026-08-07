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
        "You're asking if he'll come back… and your hand reached for the warm card, not the cold one.",
        "The Sun doesn't promise a knock at the door tomorrow — it says the warmth between you was real, and real warmth rarely goes fully cold; the pull you still feel is not one-sided.",
        "Let me look closer at what's keeping him from turning back around…",
      ],
      b: [
        "You turned the Moon, dear — the card of what's kept in the half-light.",
        "You're asking if he'll return, and I can feel how long you've been holding that question.",
        "The Moon doesn't mean he's gone for good — it means his side is still unclear even to him, and the sense that 'this isn't finished' is your intuition reading him accurately.",
        "Let me look closer at what's unresolved in him — and whether it's pulling him back or holding him still…",
      ],
      c: [
        "You turned the Tower, dear — the card of what's already moving beneath the surface.",
        "You're asking if he'll come back, after everything shifted so suddenly.",
        "The Tower doesn't mean the door is shut — it means the old shape between you broke, and something is still rearranging; what feels like an ending is often the ground clearing for a different return.",
        "Let me look closer at what's rebuilding underneath…",
      ],
    },
    'cards-feels': {
      a: [
        "You turned the Sun, dear — the card of what stands in the light.",
        "You're asking how he really feels, and your hand reached for the card of what's genuine.",
        "The Sun doesn't hand you a confession — it says the warmth you've felt from him is real, not imagined, and your read on it is truer than the doubt you keep talking yourself into.",
        "Let me look closer at what he feels but hasn't found the words for…",
      ],
      b: [
        "You turned the Moon, dear — the card of what's kept in the half-light.",
        "You're asking what he feels, because he keeps some of it just out of reach.",
        "The Moon doesn't mean he's cold — it means his feelings are real but half-spoken, and that sense of 'there's more here than he shows' is you reading him correctly.",
        "Let me look closer at what he's holding back — and why…",
      ],
      c: [
        "You turned the Tower, dear — the card of what's already moving beneath the surface.",
        "You're asking how he feels, and something between you has recently shifted.",
        "The Tower doesn't mean his feelings collapsed — it means they're changing shape, and the unsteadiness you sense is real movement, not you overthinking it.",
        "Let me look closer at where his feelings are actually heading…",
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
        "You chose the Magician, dear — the card of power and the will to act.",
        "You're asking if he'll come back, and you reached for the card of someone who can make a move.",
        "The Magician doesn't promise a knock at the door — it says he has the power to return if he chooses it, and the pull you still feel between you is not one-sided.",
        "Let me look closer at what's holding his hand back…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the pause before movement.",
        "You reached for the card that matches the in-between you've been living in.",
        "The Hanged Man doesn't promise a return — it says this is unresolved rather than finished, and the part of you that refuses to call it over is reading the situation accurately.",
        "Let me look closer at what he's reconsidering…",
      ],
      c: [
        // 2026-07-30: brought in line with the 2026-07-28 sign-off (return-mhf:596-598).
        // The previous beat 3 read 'what comes back often comes back as a new beginning',
        // which presupposes a return. The signed-off wording is conditional — it never
        // predicts that he comes back.
        "You chose the Fool, dear — the card of the unwritten chapter, the road still open.",
        "Your hand went to the one card that refuses to call this finished.",
        "The Fool doesn't mean he's gone for good — it points to a road still open rather than a door closed; if something does come of this, it begins fresh rather than picking up where it broke.",
        "Let me look closer at the turn that's forming…",
      ],
    },
    'cards-feels': {
      a: [
        "You chose the Magician, dear — the card of intention, of feeling that's active, not passive.",
        "You're asking how he really feels, and you reached for the card of directed will.",
        "The Magician doesn't hand you a confession — it leans toward feelings that are real and deliberate, not idle; the warmth you've felt from him is intended, not imagined.",
        "Let me look closer at what he hasn't found the words for…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of feeling held in suspension.",
        "You reached for the card that matches the mixed signals you've been reading.",
        "The Hanged Man doesn't mean he feels nothing — it leans toward feelings that are real but suspended, caught between what he wants and what he's ready for; the pull you sense is genuine.",
        "Let me look closer at what he's holding back, and why…",
      ],
      c: [
        "You chose the Fool, dear — the card of open, uncomplicated feeling.",
        "That's not random; you reached for the card that matches how fresh this still feels.",
        "The Fool doesn't mean he's careless with you — it leans toward feelings that are genuine and in the moment; what he feels is real, even if he hasn't thought through where it leads.",
        "Let me look closer at where his heart is actually pointing…",
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
        "You chose the Magician, dear — the card of the man who authors himself.",
        "Your hand went to the card of someone who decides what the world gets to see, and I don't think that was chance.",
        "The Magician doesn't make him a fraud — it says the man he introduces you to is a version he built on purpose, and your sense that there is a second one living underneath it is worth taking seriously.",
        "Let me look closer at the man he keeps out of the introduction…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the single angle, of what you can only see from one side.",
        "You reached for the card that matches how partial he still feels to you, even now.",
        "The Hanged Man doesn't say he is someone else — it says you have only ever been shown one side of him, and the reason you cannot get a clean read is that you have never been given the whole.",
        "Let me look closer at the part of him you were never introduced to…",
      ],
      c: [
        "You chose the Fool, dear — the card of the man who is still becoming.",
        "That is not random; you reached for the card that matches how unsettled he seems, even to himself.",
        "The Fool doesn't accuse him of pretending — it leans toward a man who has not finished deciding who he is, so the person you met and the one in front of you now genuinely differ; the inconsistency you keep noticing is real, and it is not your imagination.",
        "Let me look closer at which of him is the one that stays…",
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
        "You chose the Magician, dear — the card of will, of what a man is actually choosing.",
        "You are asking whether he will ever commit, and your hand found the card of choice rather than circumstance.",
        "The Magician hands down no yes and no no — it says the capability is sitting right there unused, and your sense that he could if he decided to is reading him accurately, not flattering him.",
        "Let me look closer at what he keeps choosing instead…",
      ],
      b: [
        "You chose the Hanged Man, dear — the card of the held breath, of the thing suspended between two answers.",
        "You reached for the card that matches exactly where he has left you standing.",
        "The Hanged Man will not tell me he will or he won't — it says he is genuinely undecided rather than quietly certain, and the waiting you have done has been real waiting, not something you invented to stay hopeful.",
        "Let me look closer at what he is weighing…",
      ],
      c: [
        "You chose the Fool, dear — the card of the open road, of the step not yet taken.",
        "Your hand went to the card of beginnings, which is telling for a question about a man who has not begun.",
        "The Fool promises nothing about the step being taken — it says nothing here has been sealed shut, and the part of you that has not stopped hoping is reading an open situation rather than being naive.",
        "Let me look closer at the step that is waiting…",
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
        "You chose the Emperor, dear — the card of a man who moves on his own terms.",
        "You're asking if he'll come back, and you reached for the card of control and timing.",
        "The Emperor doesn't promise a sudden return — it leans toward someone who acts deliberately, not on impulse; if he comes back it will be a considered choice, and his side isn't as shut as it feels.",
        "Let me look closer at what he's weighing…",
      ],
      b: [
        "You chose the Empress, dear — the card of warmth and the pull of a real bond.",
        "You're asking if he'll return, carrying the memory of what you had.",
        "The Empress leans toward reconciliation, dear — the care between you was real, and real warmth keeps its pull; that bond is still working on him.",
        "Let me look closer at what's drawing him back…",
      ],
      c: [
        "You chose the Fool, dear — the card of the unexpected turn.",
        "You're asking if he'll come back, with something still unfinished.",
        "The Fool leans toward a fresh, unexpected turn — what returns often returns as a new beginning, not the old shape; don't rule out a surprise.",
        "Let me look closer at the turn that's forming…",
      ],
    },
    'cards-feels': {
      a: [
        "You chose the Emperor, dear — the card of feeling held behind control.",
        "You're asking how he really feels, and you reached for the card of the guarded heart.",
        "The Emperor doesn't mean he feels little — it leans toward strong feeling kept behind composure; he shows it through steadiness more than words, and it's realer than his restraint suggests.",
        "Let me look closer at what the composure is protecting…",
      ],
      b: [
        "You chose the Empress, dear — the card of deep, nurturing feeling.",
        "You're asking how he feels, wanting to trust the warmth you sense.",
        "The Empress leans toward genuine, tender feeling, dear — he cares more, and more softly, than he's found a way to say; the warmth you feel is not one-sided.",
        "Let me look closer at what his heart already knows…",
      ],
      c: [
        "You chose the Fool, dear — the card of open, in-the-moment feeling.",
        "You're asking what he feels, reading something fresh and unguarded in him.",
        "The Fool leans toward feeling that's real but uncomplicated — he feels it now, genuinely, even if he hasn't thought through where it leads; the spark is real.",
        "Let me look closer at where his heart is pointing…",
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
  reads: {
    // The ad's hook — "Will he come back?". Reads HIM as a tendency, never a verdict.
    'cards-return': {
      a: [
        "You turned the Magician, dear — the card of power and the will to act.",
        "You're asking if he'll come back, and your hand reached for the card of someone who can make a move.",
        "The Magician doesn't promise a knock at the door — it says he has the power to return if he chooses it, and the pull you still feel between you is not one-sided.",
        "Let me look closer at what's holding his hand back…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the moment held still, seen from a new angle.",
        "You reached for the card that matches the in-between you've been living in.",
        "The Hanged Man doesn't promise a return — it says this is unresolved rather than finished, and the part of you that refuses to call it over is reading the situation accurately.",
        "Let me look closer at what he's reconsidering…",
      ],
      c: [
        "You turned the Fool, dear — the card of the unwritten chapter, the road still open.",
        "Your hand went to the one card that refuses to call this finished.",
        "The Fool doesn't mean he's gone for good — it points to a road still open rather than a door closed; if something does come of this, it begins fresh rather than picking up where it broke.",
        "Let me look closer at the turn that's forming…",
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
        "You turned the Magician, dear — the card of intention, of feeling that's active, not passive.",
        "You're asking how he really feels, and you reached for the card of directed will.",
        "The Magician doesn't hand you a confession — it leans toward feelings that are real and deliberate, not idle; the warmth you've felt from him is intended, not imagined.",
        "Let me look closer at what he hasn't found the words for…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of feeling held in suspension.",
        "You reached for the card that matches the mixed signals you've been reading.",
        "The Hanged Man doesn't mean he feels nothing — it leans toward feelings that are real but suspended, caught between what he wants and what he's ready for; the pull you sense is genuine.",
        "Let me look closer at what he's holding back, and why…",
      ],
      c: [
        "You turned the Fool, dear — the card of open, uncomplicated feeling.",
        "That's not random; you reached for the card that matches how fresh this still feels.",
        "The Fool doesn't mean he's careless with you — it leans toward feelings that are genuine and in the moment; what he feels is real, even if he hasn't thought through where it leads.",
        "Let me look closer at where his heart is actually pointing…",
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
        "You turned the Magician, dear — the card of the man who authors himself.",
        "Your hand went to the card of someone who decides what the world gets to see, and I don't think that was chance.",
        "The Magician doesn't make him a fraud — it says the man he introduces you to is a version he built on purpose, and your sense that there is a second one living underneath it is worth taking seriously.",
        "Let me look closer at the man he keeps out of the introduction…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the single angle, of what you can only see from one side.",
        "You reached for the card that matches how partial he still feels to you, even now.",
        "The Hanged Man doesn't say he is someone else — it says you have only ever been shown one side of him, and the reason you cannot get a clean read is that you have never been given the whole.",
        "Let me look closer at the part of him you were never introduced to…",
      ],
      c: [
        "You turned the Fool, dear — the card of the man who is still becoming.",
        "That is not random; you reached for the card that matches how unsettled he seems, even to himself.",
        "The Fool doesn't accuse him of pretending — it leans toward a man who has not finished deciding who he is, so the person you met and the one in front of you now genuinely differ; the inconsistency you keep noticing is real, and it is not your imagination.",
        "Let me look closer at which of him is the one that stays…",
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
        "You turned the Magician, dear — the card of will, of what a man is actually choosing.",
        "You are asking whether he will ever commit, and your hand found the card of choice rather than circumstance.",
        "The Magician hands down no yes and no no — it says the capability is sitting right there unused, and your sense that he could if he decided to is reading him accurately, not flattering him.",
        "Let me look closer at what he keeps choosing instead…",
      ],
      b: [
        "You turned the Hanged Man, dear — the card of the held breath, of the thing suspended between two answers.",
        "You reached for the card that matches exactly where he has left you standing.",
        "The Hanged Man will not tell me he will or he won't — it says he is genuinely undecided rather than quietly certain, and the waiting you have done has been real waiting, not something you invented to stay hopeful.",
        "Let me look closer at what he is weighing…",
      ],
      c: [
        "You turned the Fool, dear — the card of the open road, of the step not yet taken.",
        "Your hand went to the card of beginnings, which is telling for a question about a man who has not begun.",
        "The Fool promises nothing about the step being taken — it says nothing here has been sealed shut, and the part of you that has not stopped hoping is reading an open situation rather than being naive.",
        "Let me look closer at the step that is waiting…",
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

export function openerB(deck: TarotDeck, hook: TarotHook, card: TarotOption): string[] {
  return [
    ...readsFor(deck, hook)[card],
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
