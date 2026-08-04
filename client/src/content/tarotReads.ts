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
  | 'self-frame'

export function angleForHook(hook: TarotHook): TarotAngle {
  if (SELF_FRAME_HOOKS.includes(hook)) return 'self-frame'
  if (TRUST_HOOKS.includes(hook)) return 'trust'
  if (COMMITMENT_HOOKS.includes(hook)) return 'commitment'
  if (HONESTY_HOOKS.includes(hook)) return 'honesty'
  if (REUNION_HOOKS.includes(hook)) return 'reunion'
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
