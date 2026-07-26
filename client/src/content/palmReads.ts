// Copy + lookup tables for the /fb-palm "quiz bridge" funnel.
// Single source of truth shared by PalmBridge (the lander) and useConversation
// (the chat handoff). See fb-palm/docs/PRD-quiz-bridge.md.
//
// Two axes:
//   sign — WHICH physical "tell" the ad quizzed (the visual mechanism).
//          'thumb' = the original thumb-crease marks; 'finger-lock' = which
//          thumb lands on top when you interlace your fingers. Each sign brings
//          its own art strip, instruction copy, per-option archetype, and reads.
//          Default 'thumb' → every original /fb-palm link is unchanged.
//   hook — WHICH love question the ad asked (soulmate-timing / already-met /
//          love-again). Shared across signs: it sets the headline + the wound
//          a read mirrors. Independent of the sign.
//
// Three versions, split externally by VWO across three links:
//   Version A  (/fb-palm)    → static result card on S3, then a brief greeting
//   Version B  (/fb-palm/b)  → no card; the read is delivered as chat messages
//   Version C  (/fb-palm/c)  → no card; interactive — one open question, the LLM
//                              reads her answer (falls back to the static read)
// All three share the S1 quiz + S2 reading beat and everything after name
// capture. The chat reads sign/hook/option/version from the query string.

import type { Bucket } from '@/types/chat'

export type PalmHook =
  | 'soulmate-timing'
  | 'already-met'
  | 'love-again'
  // New-wave test hooks — thumb-only for now (ledger `target_signs`): reads
  // exist only on THUMB; other signs fall back to DEFAULT_HOOK.
  | 'is-he-true'
  | 'sense-lying'
  | 'heart-safe'
export type PalmThumb = 'a' | 'b' | 'c' // the option the visitor tapped (A/B/C)
export type PalmOption = PalmThumb // alias — signs other than 'thumb' still pick A/B/C
export type PalmVersion = 'a' | 'b' | 'c'
export type PalmSign =
  | 'thumb'
  | 'finger-lock'
  | 'finger-shape'
  | 'palms'
  | 'palm-signs'
  | 'thumb-curve'
  | 'thumb-curve-alt'
  | 'hand-size'
  | 'finger-length'
  | 'finger-length-alt'
  | 'thumb-angle'

export const PALM_HOOKS: PalmHook[] = [
  'soulmate-timing',
  'already-met',
  'love-again',
  'is-he-true',
  'sense-lying',
  'heart-safe',
]

// Shown when /fb-palm is hit without a recognized ?hook= / ?sign= (bare visit).
export const DEFAULT_HOOK: PalmHook = 'soulmate-timing'
export const DEFAULT_SIGN: PalmSign = 'thumb'

// Verbatim match to the ad question (the whole point — message scent). Shared by
// every sign: the love question is orthogonal to the physical tell.
export const HEADLINES: Record<PalmHook, string> = {
  'already-met': 'Have you already met your soulmate?',
  'love-again': 'Will I love again?',
  'soulmate-timing': 'When is my soulmate coming?',
  'is-he-true': 'Am I being lied to?',
  'sense-lying': 'Why do I feel like he’s lying to me?',
  'heart-safe': 'Is he ever going to commit?',
}

// Version C opener question, per hook (sign-agnostic — it's about her heart, not
// the mark). C opens with the mark line + this, then the LLM reads her answer.
const PALM_QUESTION: Record<PalmHook, string> = {
  'already-met': "Before I look closer, tell me… is there already someone your mind keeps returning to?",
  'love-again': "Before I look closer, tell me… what's been weighing on your heart since it happened?",
  'soulmate-timing': "Before I look closer, tell me… what's making the waiting feel so heavy right now?",
  'is-he-true': "Before I look closer, tell me… what is it about him your gut keeps snagging on?",
  'sense-lying': "Before I look closer, tell me… when did the feeling first creep in?",
  'heart-safe': "Before I look closer, tell me… what has he promised that you're still waiting to see?",
}

// ── Sign registry ────────────────────────────────────────────────────────────
// Adding a new ad concept = add one SignConfig entry + drop its strip png in
// client/public/palm/. Everything else (bridge UI, chat handoff, reads) reads
// from here. Each read is the 4-beat "build" (see Appendix B of the PRD):
//   1. name the mark (+ reading label)
//   2. mirror HER question back (acknowledge the wound first if it hurts)
//   3. the "yes" beat — affirm via the archetype, withhold the specifics
//   4. open loop → "let me look closer"

export interface SignConfig {
  id: PalmSign
  // UI copy
  eyebrow: string // S1 eyebrow — "According to Your Thumb"
  instruction: string // S1 tap instruction
  beatNoun: string // S2 — "Evelyn is reading your {beatNoun}…"
  continueCta: string // S3 (Version A card) CTA, sans the ▸
  chooseMoment: string // greetingA — "I felt it {chooseMoment}"
  // Tap-target art: a horizontal strip of `options.length` equal panels.
  strip: { url: string; width: number; height: number }
  options: PalmOption[] // which letters this sign offers (A/B[/C])
  // How many GRID columns the options are laid out in. Omitted = one column per
  // option (the historical behaviour: 2 options side-by-side, 3 side-by-side).
  //
  // Set this to 1 to stack the options TOP-DOWN, which lets each tile span the full
  // card width. That is the right call when the panel art is landscape: a side-by-side
  // tile is ~150px wide on a phone, so a wide image gets crushed. Stacked, it is ~310px.
  // Only `hand-size` needs it today — see the note on HAND_SIZE.
  columns?: 1 | 2 | 3
  // Per-option archetype vocab. mark = the concrete tell named in sentence 1;
  // reading = the heart label. Both feed the Version-A greeting + the Version-C
  // LLM injection; the reads name the mark themselves in sentence 1.
  mark: Record<PalmOption, string>
  reading: Record<PalmOption, string>
  // reads[hook][option] = the 4-sentence build. Partial on the hook axis: a
  // hook may target a subset of signs (ledger `target_signs`); a combo without
  // reads falls back to DEFAULT_HOOK on the bridge and to the generic funnel
  // in the chat (parsePalmParams returns null).
  reads: Partial<Record<PalmHook, Record<PalmOption, string[]>>>
}

const THUMB: SignConfig = {
  id: 'thumb',
  eyebrow: 'According to Your Thumb',
  instruction: 'Tap the thumb that looks most like yours.',
  beatNoun: 'thumb',
  continueCta: "There's more your thumb is telling me — begin your free reading",
  chooseMoment: 'the moment your thumb chose',
  strip: { url: '/palm/thumbs-strip.png', width: 972, height: 460 },
  options: ['a', 'b', 'c'],
  // A — trident (three lines to one) → gathering; B — Y leaning right → reaching;
  // C — Y leaning left → inward.
  mark: {
    a: 'a trident, three lines rising to one',
    b: 'a Y that leans right, reaching outward',
    c: 'a Y that leans left, curling inward',
  },
  reading: {
    a: 'the gathering heart',
    b: 'the reaching heart',
    c: 'the inward heart',
  },
  reads: {
    'already-met': {
      a: [
        "A trident — three lines converging into one. The gathering heart.",
        "You're wondering if you've already crossed paths with them… and somehow didn't see it.",
        "A heart that gathers like yours never pulls toward a stranger — yes, they're already in your world, closer than you think.",
        "But something's been clouding the recognition… let me look closer.",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You're wondering if you've already met them… and missed the moment.",
        "You didn't miss it, dear — a heart always reaching ahead simply walked past what was beside it. They're already here.",
        "Let me look closer at what's been keeping you from seeing it…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "You're wondering if love already passed you by, unnoticed.",
        "It didn't — a heart this guarded recognizes its match and hides the knowing, even from itself. You've already met them.",
        "Let me look closer at what you've kept even from yourself…",
      ],
    },
    'love-again': {
      a: [
        "A trident — three lines converging into one. The gathering heart.",
        "You're asking if love will come again… and I feel the ache behind the question.",
        "Even broken open, a heart like yours keeps gathering toward one love — so yes, dear, it's still ahead of you, drawing closer.",
        "Let me look closer at what's already moving toward you…",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You're asking if your heart can open again, after what it cost you last time.",
        "After a loss like that most hearts pull inward — but yours still reaches. So yes, you will love again, sooner than the fear admits.",
        "Let me look closer at what's standing between you and that next beginning…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "You're afraid the break sealed your heart shut for good.",
        "It didn't, dear — anyone hurt the way you were would guard it too. But love is finding its way back to you, gentler this time.",
        "Let me look closer at what's waiting on the other side of that fear…",
      ],
    },
    'soulmate-timing': {
      a: [
        "A trident — three lines converging into one. The gathering heart.",
        "You've waited so long the hope has worn thin… I feel that tiredness.",
        "But three lines drawing to a single point means a meeting already forming — yes, they're coming, closer than the waiting let you believe.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You've been reaching, wondering when someone will finally reach back.",
        "The timing leans the very same way you do — yes, dear, they're coming, closer than all that searching let you feel.",
        "Let me look closer at the timing…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "You've waited so long you've started to wonder if you imagined the promise at all.",
        "You didn't — the timing has only been waiting for you to turn outward. Yes, they're coming, closer than you think.",
        "Let me look closer at what's been keeping you apart…",
      ],
    },
    // Decode-him deception pair (thumb-only test). Beat 3 affirms HER intuition
    // as real information — never a verdict on him (empowerment, not paranoia).
    'is-he-true': {
      a: [
        "A trident — three lines drawing to one point. The gathering heart.",
        "You're asking if you're being lied to — and I can feel you've carried that question longer than you've let on.",
        "A heart that gathers like yours misses nothing, dear; the unease you keep waving off is real information, worth listening to — not the overthinking you've blamed it on.",
        "Let me look closer at what it's actually picking up…",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You give your trust before it's earned, and lately some quiet part of you has been drawing it back.",
        "A reaching heart feels the exact moment the warmth stops meeting it, dear — that hesitation is information, not insecurity, and it's earned the right to be looked at.",
        "Let me look closer at what made your heart start holding back…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "Some part of you already senses the answer you came to ask me — you've just kept it even from yourself.",
        "A heart this guarded reads what's true long before the mind will say it, dear; the quiet you've felt isn't nothing — it's your own knowing, waiting to be heard.",
        "Let me look closer at what you've been carrying alone…",
      ],
    },
    'sense-lying': {
      a: [
        "A trident — three lines drawing to one point. The gathering heart.",
        "You already feel it, dear — that's not the question. You're asking why the feeling won't leave you alone.",
        "Here's why: a heart that gathers like yours reads the small shifts long before the mind will name them. The feeling isn't you imagining things — it's you noticing what's there to notice.",
        "Let me look closer at what it's been gathering…",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You feel it and you're asking why — when nothing's been said, nothing proven.",
        "Because a reaching heart feels the warmth change before the words do, dear. The feeling came before the proof because your heart reaches ahead — it registers the shift first. That's not insecurity; that's an instrument working.",
        "Let me look closer at what it reached for and found cooler than before…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "You feel it quietly, and you're asking why you can't talk yourself out of it.",
        "Because a heart this guarded doesn't sound an alarm over nothing, dear — it's slow to feel and slow to suspect, so the fact that you feel anything at all is worth taking seriously, not arguing away.",
        "Let me look closer at what finally got past your guard…",
      ],
    },
    // Wave-1 lead (thumb-only test). Self-bridged: the hand reads HER wanting
    // and her knowing — never a forecast of his choice.
    'heart-safe': {
      a: [
        "A trident — three lines drawing to one point. The gathering heart.",
        "You're asking if he's ever going to commit — you've heard the words, but you're still waiting to feel the weight behind them.",
        "A heart that gathers like yours doesn't ask that question lightly, dear — it asks when it already senses the answer forming; your wanting more was never too much, it's your heart reading the distance exactly right.",
        "Let me look closer at what the answer has been waiting on…",
      ],
      b: [
        "A Y that leans right — your line reaches outward. The reaching heart.",
        "You reach first, you give first — and you're asking how long a heart is meant to keep reaching before it's met.",
        "A reaching heart isn't foolish for going first, dear — but it knows, sooner than the mind will admit, when it's carrying the whole distance; that tiredness isn't you giving up on love, it's your heart asking for the truth it's owed.",
        "Let me look closer at what your reaching has actually been met with…",
      ],
      c: [
        "A Y that leans left — your line curls inward. The inward heart.",
        "You've been carrying this question quietly, dear — asking it to yourself long before you brought it to me.",
        "A heart this guarded doesn't hope recklessly; if it's still holding on, something real is holding it — and if it's begun asking whether he'll ever choose you fully, that asking is its own kind of knowing.",
        "Let me look closer at what your heart already suspects…",
      ],
    },
  },
}

// finger-lock — interlace your fingers; which thumb settles on top.
//   A = right thumb over left  → the leading heart  (moves first, reaches)
//   B = thumbs perfectly even  → the mirrored heart (rare; matches its other half)
//   C = left thumb over right  → the guarded heart  (protects, feels before it admits)
const FINGER_LOCK: SignConfig = {
  id: 'finger-lock',
  eyebrow: 'According to How You Lock Your Hands',
  instruction: 'Lace your fingers together — tap the one that matches.',
  beatNoun: 'hands',
  continueCta: "There's more your hands are telling me — begin your free reading",
  chooseMoment: 'the moment your hands locked',
  strip: { url: '/palm/finger-lock-strip.png', width: 1041, height: 587 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'your right thumb crossing over the left when your hands lock',
    b: 'your thumbs locking perfectly even, neither one above the other',
    c: 'your left thumb crossing over the right when your hands lock',
  },
  reading: {
    a: 'the leading heart',
    b: 'the mirrored heart',
    c: 'the guarded heart',
  },
  reads: {
    'already-met': {
      a: [
        "Your right thumb settles over the left when your hands lock — the leading heart.",
        "You're wondering if they've already walked into your life… and you somehow missed the sign.",
        "A heart that leads the way yours does reaches a person before it understands why — yes, they're already here, closer than you've let yourself believe.",
        "Something's been pulling your eyes the other way… let me look closer.",
      ],
      b: [
        "Your thumbs lock perfectly even, neither above the other — the mirrored heart.",
        "You're wondering if the one who matches you has already crossed your path, unnoticed.",
        "A heart this balanced only settles when it meets its mirror — and it already has; yes, you've met them, closer than you think.",
        "Let me look closer at why the recognition hasn't surfaced yet…",
      ],
      c: [
        "Your left thumb crosses over the right when your hands lock — the guarded heart.",
        "You're wondering if love already passed you by while your guard was up.",
        "It didn't — a heart this protected feels its match long before it admits it, and yours already has. You've met them.",
        "Let me look closer at what you've been keeping even from yourself…",
      ],
    },
    'love-again': {
      a: [
        "Your right thumb settles over the left when your hands lock — the leading heart.",
        "You're asking if love will find you again… and I feel the ache still sitting behind that question.",
        "Even after a wound like that, a heart that leads keeps moving toward the next love instead of away — so yes, dear, it's still ahead of you, drawing closer.",
        "Let me look closer at what's already turning back toward you…",
      ],
      b: [
        "Your thumbs lock perfectly even, neither above the other — the mirrored heart.",
        "You're asking whether your heart can open again, after everything the last one cost you.",
        "A balanced heart doesn't stay closed for long — it waits for the one who matches it, and that love is already finding its way to you, gentler this time.",
        "Let me look closer at what's standing between you and that next beginning…",
      ],
      c: [
        "Your left thumb crosses over the right when your hands lock — the guarded heart.",
        "You're afraid the heartbreak sealed your heart shut for good.",
        "It didn't, dear — anyone hurt the way you were would guard it just the same. But love is making its way back to you, and a guarded heart feels it coming first.",
        "Let me look closer at what's waiting on the other side of that fear…",
      ],
    },
    'soulmate-timing': {
      a: [
        "Your right thumb settles over the left when your hands lock — the leading heart.",
        "You've been waiting so long the hope has started to wear thin… I feel that tiredness in you.",
        "But a heart that leads doesn't wait idle — it draws the meeting closer just by reaching, and yours already has; yes, they're coming, sooner than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your thumbs lock perfectly even, neither above the other — the mirrored heart.",
        "You've been wondering when the one who finally matches you will appear.",
        "A mirrored heart only quiets when its other half draws near — and yours is quieting, which means they're already close, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [
        "Your left thumb crosses over the right when your hands lock — the guarded heart.",
        "You've waited so long you've started to wonder if you imagined the promise of them at all.",
        "You didn't — a guarded heart simply makes the timing patient, not absent. Yes, they're coming, closer than you've allowed yourself to hope.",
        "Let me look closer at what's been keeping you apart…",
      ],
    },
  },
}

// finger-shape — the shape of your finger down its sides.
//   A = straight, even sides   → the steady heart     (loyal, builds, constant)
//   B = tapering to a point     → the dreaming heart   (intuitive, romantic, feels first)
//   C = knuckled, ridged sides  → the discerning heart (weighs, then knows the real thing)
const FINGER_SHAPE: SignConfig = {
  id: 'finger-shape',
  eyebrow: 'According to Your Finger Shape',
  instruction: 'Tap the finger that looks most like yours.',
  beatNoun: 'fingers',
  continueCta: "There's more your fingers are telling me — begin your free reading",
  chooseMoment: 'the moment you recognized yours',
  strip: { url: '/palm/finger-shape-strip.png', width: 959, height: 725 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'a finger that runs straight and even, its sides like two steady lines',
    b: 'a fingertip that narrows to a soft, tapering point',
    c: 'a finger that swells and dips at the knuckles, ridged and pronounced',
  },
  reading: {
    a: 'the steady heart',
    b: 'the dreaming heart',
    c: 'the discerning heart',
  },
  reads: {
    'already-met': {
      a: [
        "Your finger runs straight and even, its sides like two steady lines — the steady heart.",
        "You're wondering if they've already come into your life… and you somehow looked past them.",
        "A heart this steady doesn't fall for strangers — it recognizes the one it can build on, and yours already has; yes, they're in your world, closer than you think.",
        "Something familiar has been hiding in plain sight… let me look closer.",
      ],
      b: [
        "Your fingertip narrows to a soft, tapering point — the dreaming heart.",
        "You're wondering if the one you've pictured has already crossed your path, unrecognized.",
        "A heart that dreams the way yours does senses its match before the mind catches up — and it already has. You've met them.",
        "Let me look closer at why your knowing hasn't surfaced yet…",
      ],
      c: [
        "Your finger swells and dips at the knuckles, ridged and pronounced — the discerning heart.",
        "You're wondering if you've already met them and talked yourself out of it.",
        "A heart this discerning doesn't mistake the real thing — it weighs, then knows, and yours has already known. They're someone you've met.",
        "Let me look closer at what your doubt has been guarding you from…",
      ],
    },
    'love-again': {
      a: [
        "Your finger runs straight and even, its sides like two steady lines — the steady heart.",
        "You're asking if love will come again… and I can feel how carefully you're holding that hope.",
        "A steady heart doesn't break for good — it rebuilds, slowly and surely, and yours is already laying the ground for what's next. So yes, dear, you'll love again.",
        "Let me look closer at what's already taking root…",
      ],
      b: [
        "Your fingertip narrows to a soft, tapering point — the dreaming heart.",
        "You're asking whether a heart that feels as deeply as yours can survive opening again.",
        "It can, and it will — a dreaming heart loves too fully to stay closed; the next one is already finding its way to you, gentler than the last.",
        "Let me look closer at what's standing between you and that beginning…",
      ],
      c: [
        "Your finger swells and dips at the knuckles, ridged and pronounced — the discerning heart.",
        "You're afraid that after what happened, you'll never trust your own heart again.",
        "You will — a discerning heart learns, it doesn't close. And it's already sensing someone worth trusting, drawing nearer.",
        "Let me look closer at what's waiting past that fear…",
      ],
    },
    'soulmate-timing': {
      a: [
        "Your finger runs straight and even, its sides like two steady lines — the steady heart.",
        "You've been patient so long the waiting has started to feel like doubt… I feel that in you.",
        "But a steady heart draws its match by staying true, not by chasing — and yours has nearly drawn them in; yes, they're coming, closer than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your fingertip narrows to a soft, tapering point — the dreaming heart.",
        "You've been wondering when the one you keep imagining will finally become real.",
        "A dreaming heart feels the timing before it arrives — and yours is stirring, which means they're close now, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [
        "Your finger swells and dips at the knuckles, ridged and pronounced — the discerning heart.",
        "You've waited so long you've begun to wonder if you're being too particular to ever be met.",
        "You're not — a discerning heart waits for the right one, not the next one, and the right one is already on their way. Yes, they're coming.",
        "Let me look closer at what's been keeping you apart…",
      ],
    },
  },
}

// palms — hold both palms together; compare where the two heart lines meet.
//   A = level, neither higher → the even heart   (gives and receives in balance)
//   B = right line higher      → the giving heart  (loves outward, leads with the heart)
//   C = left line higher       → the deep heart    (feels privately, loves beneath the surface)
// Art labels these 1/2/3; option keys stay a/b/c (read lookup + analytics).
const PALMS: SignConfig = {
  id: 'palms',
  eyebrow: 'According to Your Palms',
  instruction: 'Hold your palms together — tap the one that matches.',
  beatNoun: 'palms',
  continueCta: "There's more your palms are telling me — begin your free reading",
  chooseMoment: 'the moment your palms met',
  strip: { url: '/palm/palms-strip.png', width: 1080, height: 551 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'your two heart lines meeting level when your palms come together, neither rising above the other',
    b: 'your right heart line sitting higher than the left when your palms meet',
    c: 'your left heart line sitting higher than the right when your palms meet',
  },
  reading: {
    a: 'the even heart',
    b: 'the giving heart',
    c: 'the deep heart',
  },
  reads: {
    'already-met': {
      a: [
        "Your two heart lines meet level when your palms come together, neither rising above the other — the even heart.",
        "You're wondering if they've already entered your life… and the timing simply slipped past you.",
        "A heart this even doesn't miss its equal — it recognizes balance the moment it feels it, and yours already has; yes, they're in your world, closer than you think.",
        "Something kept the two lines from meeting in the open… let me look closer.",
      ],
      b: [
        "Your right heart line sits higher than the left when your palms meet — the giving heart.",
        "You're wondering if you've already met them, while you were busy pouring yourself into everyone else.",
        "A heart that gives the way yours does draws its match close without noticing — and it already has. You've met them.",
        "Let me look closer at who's been standing just outside your giving…",
      ],
      c: [
        "Your left heart line sits higher than the right when your palms meet — the deep heart.",
        "You're wondering if love already came and went beneath your notice.",
        "It didn't — a heart this deep feels its match long before it shows on the surface, and yours already has. They're someone you've met.",
        "Let me look closer at what's been moving under the surface…",
      ],
    },
    'love-again': {
      a: [
        "Your two heart lines meet level when your palms come together, neither rising above the other — the even heart.",
        "You're asking if love will find you again… and I feel how much that question still costs you.",
        "An even heart always rights itself — it was made to give and receive in balance, and that balance is already returning to you. So yes, dear, you'll love again.",
        "Let me look closer at what's restoring the balance…",
      ],
      b: [
        "Your right heart line sits higher than the left when your palms meet — the giving heart.",
        "You're asking whether a heart that gave so much, and lost, can give again.",
        "It can — a giving heart doesn't run dry, it only waits for someone worth giving to. And that someone is already drawing near, gentler this time.",
        "Let me look closer at what's standing between you and that next beginning…",
      ],
      c: [
        "Your left heart line sits higher than the right when your palms meet — the deep heart.",
        "You're afraid the hurt sank so deep this time that nothing new can reach you.",
        "It can't stay sealed, dear — a deep heart simply heals out of sight before it shows. Love is already finding the quiet way back to you.",
        "Let me look closer at what's mending beneath the surface…",
      ],
    },
    'soulmate-timing': {
      a: [
        "Your two heart lines meet level when your palms come together, neither rising above the other — the even heart.",
        "You've waited so long the balance has started to feel like emptiness… I feel that in you.",
        "But an even heart draws its match by holding steady, not by chasing — and the scales are nearly tipping toward you; yes, they're coming, closer than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your right heart line sits higher than the left when your palms meet — the giving heart.",
        "You've been giving and giving, wondering when someone will finally show up to receive it.",
        "Soon — a giving heart pulls its match closer with every act of love, and yours has nearly closed the distance. Yes, they're coming, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [
        "Your left heart line sits higher than the right when your palms meet — the deep heart.",
        "You've waited so long you've started to wonder if what you feel is even real.",
        "It's real — a deep heart simply senses love before it arrives, and yours has already begun to feel them coming. Yes, they're close.",
        "Let me look closer at what's been keeping you apart…",
      ],
    },
  },
}

// palm-signs — cup both hands; do your heart lines meet across the join. (2-option)
//   A = lines meet as one unbroken line → the joined heart  (reaches across, connects)
//   B = lines rise with a space between → the rising heart   (reaches upward, holds a little back)
const PALM_SIGNS: SignConfig = {
  id: 'palm-signs',
  eyebrow: 'According to Your Palm Lines',
  instruction: 'Cup your hands together — tap the one that matches.',
  beatNoun: 'palms',
  continueCta: "There's more your palms are telling me — begin your free reading",
  chooseMoment: 'the moment your hands cupped together',
  strip: { url: '/palm/palm-signs-strip.png', width: 800, height: 493 },
  options: ['a', 'b'],
  mark: {
    a: 'your heart lines reaching across to meet as one unbroken line when you cup your hands',
    b: 'your heart lines rising toward each other but holding a small space between them',
    c: '',
  },
  reading: {
    a: 'the joined heart',
    b: 'the rising heart',
    c: '',
  },
  reads: {
    'already-met': {
      a: [
        "Your heart lines reach across and meet as one unbroken line when you cup your hands — the joined heart.",
        "You're wondering if the one meant for you has already arrived… and you didn't recognize the sign.",
        "A heart that joins the way yours does only completes its line against another — and it already has; yes, they're here, closer than you think.",
        "Something's been blurring where your line meets theirs… let me look closer.",
      ],
      b: [
        "Your heart lines rise toward each other but hold a small space between them — the rising heart.",
        "You're wondering if you've already met them, but something always kept a distance.",
        "That space isn't absence, dear — a rising heart reaches before it lets itself be reached, and yours already has. You've met them.",
        "Let me look closer at what's been keeping that small distance…",
      ],
      c: [],
    },
    'love-again': {
      a: [
        "Your heart lines reach across and meet as one unbroken line when you cup your hands — the joined heart.",
        "You're asking if love will come again… and I feel the place where the last one broke off.",
        "But a joined heart always reaches to complete itself again — the line doesn't end at a loss, it continues. So yes, dear, you'll love again.",
        "Let me look closer at where your line picks back up…",
      ],
      b: [
        "Your heart lines rise toward each other but hold a small space between them — the rising heart.",
        "You're asking whether your heart can close that distance again, after what it cost you.",
        "It can — a rising heart never stops reaching upward, even after a fall. The next love is already rising to meet it, gentler this time.",
        "Let me look closer at what's standing in that small space…",
      ],
      c: [],
    },
    'soulmate-timing': {
      a: [
        "Your heart lines reach across and meet as one unbroken line when you cup your hands — the joined heart.",
        "You've waited so long you've started to doubt the line leads anywhere at all.",
        "It does — a joined heart's line always finds its other end, and yours is nearly there; yes, they're coming, closer than the waiting let you believe.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your heart lines rise toward each other but hold a small space between them — the rising heart.",
        "You've been reaching upward so long you've wondered if anyone will ever reach back.",
        "Someone is — a rising heart draws its match by lifting, not waiting, and the space is nearly closed. Yes, they're coming, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [],
    },
  },
}

// thumb-curve — does your thumb bend back. (2-option)
//   A = holds straight and firm → the constant heart  (loyal, waited, doesn't waver)
//   B = arches back, supple      → the open heart      (gives freely, adapts, draws love in)
const THUMB_CURVE: SignConfig = {
  id: 'thumb-curve',
  eyebrow: 'According to How Your Thumb Bends',
  instruction: 'Tap the thumb that bends like yours.',
  beatNoun: 'thumb',
  continueCta: "There's more your thumb is telling me — begin your free reading",
  chooseMoment: 'the moment your thumb answered',
  strip: { url: '/palm/thumb-curve-strip.png', width: 946, height: 580 },
  options: ['a', 'b'],
  mark: {
    a: 'a thumb that holds straight and firm, refusing to bend back',
    b: 'a thumb that arches back, supple and open',
    c: '',
  },
  reading: {
    a: 'the constant heart',
    b: 'the open heart',
    c: '',
  },
  reads: {
    'already-met': {
      a: [
        "Your thumb holds straight and firm, refusing to bend back — the constant heart.",
        "You're wondering if they've already come into your life… and you held back from seeing it.",
        "A heart this constant doesn't give itself to just anyone — it waited, and the one it was waiting for is already here; yes, closer than you think.",
        "Something in you guarded the recognition… let me look closer.",
      ],
      b: [
        "Your thumb arches back, supple and open — the open heart.",
        "You're wondering if you've already met them, with your heart as open as it's been.",
        "A heart this open draws people in easily — and the right one has already come close; yes, you've met them, nearer than you realize.",
        "Let me look closer at who slipped in while your heart was open…",
      ],
      c: [],
    },
    'love-again': {
      a: [
        "Your thumb holds straight and firm, refusing to bend back — the constant heart.",
        "You're asking if love will come again… and I can feel how much loyalty you gave the last one.",
        "A constant heart loves once and deeply — but it was built to love again, just as fully, when the right one comes. So yes, dear, you will.",
        "Let me look closer at what's already on its way…",
      ],
      b: [
        "Your thumb arches back, supple and open — the open heart.",
        "You're asking whether a heart that opened so wide, and got hurt, can open again.",
        "It can, and it will — an open heart can't help itself; it's already softening toward what's coming, gentler this time.",
        "Let me look closer at what's standing in the way…",
      ],
      c: [],
    },
    'soulmate-timing': {
      a: [
        "Your thumb holds straight and firm, refusing to bend back — the constant heart.",
        "You've stayed so loyal to the waiting that it's started to wear on you… I feel that.",
        "But a constant heart is always rewarded in the end — yours has nearly outlasted the wait; yes, they're coming, closer than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your thumb arches back, supple and open — the open heart.",
        "You've kept your heart open so long you've wondered if it's been left open too long.",
        "It hasn't — an open heart is exactly what draws love in, and yours is drawing them close now. Yes, they're coming, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [],
    },
  },
}

// thumb-curve-alt — same concept + reads as thumb-curve, but the abstract
// line-art creative. A separate sign only so VWO can test realistic-vs-abstract
// art with identical copy. Reuses everything but the strip.
const THUMB_CURVE_ALT: SignConfig = {
  ...THUMB_CURVE,
  id: 'thumb-curve-alt',
  strip: { url: '/palm/thumb-curve-alt-strip.png', width: 1080, height: 519 },
}

// hand-size — are your hands large or small. (2-option; art recomposed
// side-by-side from the stacked source.)
//   A = large, generous → the sheltering heart (nurtures, holds, protects)
//   B = small, quick     → the daring heart     (leaps first, loves boldly)
const HAND_SIZE: SignConfig = {
  id: 'hand-size',
  eyebrow: 'According to Your Hand Size',
  instruction: 'Tap the hands that look most like yours.',
  beatNoun: 'hands',
  continueCta: "There's more your hands are telling me — begin your free reading",
  chooseMoment: 'the moment your hands answered',
  // Reworked 2026-07-14 (Joel, call): "the image is a bit still too small… if we can't
  // do left, right, maybe we can do top down so that we can make that image a bit
  // bigger, because this image is more of a horizontal image rather than a vertical
  // image." He is right, and it measures: the art is 1.8:1 landscape (forearm + open
  // palm), so the previous SQUARE 745x745 panel was ~47% empty white and the hands
  // rendered tiny in a ~150px side-by-side tile.
  //
  // The square panel existed to protect the labels: the measuring hand overlaps the
  // baked-in "Big hands"/"Small hands" text horizontally, so a tight SQUARE crop would
  // have had to erase it — and WITHOUT those labels the two options look near-identical,
  // which destroys the only thing this image is here to show. Padding was the lesser evil.
  //
  // `columns: 1` dissolves that trade. Stacked top-down, each tile spans the full card
  // (~310px on a phone instead of ~150px), so the panel can be cropped back to its
  // natural landscape shape: labels kept, dead margin gone, hands roughly 2x bigger.
  // Re-crop is reproducible — scripts/palm-handsize-recrop.py (identical box on BOTH
  // halves; different boxes would kill the big-vs-small size difference).
  //
  // Joel's constraint on any future change here: "we just need to make sure that a
  // person can see what's considered big, what's considered small." Keep the labels.
  strip: { url: '/palm/hand-size-strip.png', width: 1490, height: 412 },
  options: ['a', 'b'],
  columns: 1,
  mark: {
    a: 'hands that run large and generous, made to hold and shelter',
    b: 'hands that run small and quick, made to reach and leap',
    c: '',
  },
  reading: {
    a: 'the sheltering heart',
    b: 'the daring heart',
    c: '',
  },
  reads: {
    'already-met': {
      a: [
        "Your hands run large and generous, made to hold and shelter — the sheltering heart.",
        "You're wondering if the one you're meant to care for has already come into your life.",
        "A heart this sheltering always recognizes who it's meant to protect — and it already has; yes, they're in your world, closer than you think.",
        "Something's kept you from gathering them in… let me look closer.",
      ],
      b: [
        "Your hands run small and quick, made to reach and leap — the daring heart.",
        "You're wondering if you've already met them, in one of the moments you leapt.",
        "A heart this daring meets its match in motion, not in waiting — and it already has. You've met them.",
        "Let me look closer at the moment you almost noticed…",
      ],
      c: [],
    },
    'love-again': {
      a: [
        "Your hands run large and generous, made to hold and shelter — the sheltering heart.",
        "You're asking if love will come again… after you gave so much of yourself caring for the last one.",
        "A sheltering heart is never empty for long — it was made to hold someone, and someone worth holding is already drawing near, gentler this time.",
        "Let me look closer at what's coming toward your open arms…",
      ],
      b: [
        "Your hands run small and quick, made to reach and leap — the daring heart.",
        "You're asking whether a heart that leapt once, and fell, can dare to leap again.",
        "It can, and it will — a daring heart can't stay still for long, and it's already gathering itself for the next leap, toward someone gentler.",
        "Let me look closer at what's waiting at the other end…",
      ],
      c: [],
    },
    'soulmate-timing': {
      a: [
        "Your hands run large and generous, made to hold and shelter — the sheltering heart.",
        "You've had so much love to give and no one to give it to… I feel that ache in you.",
        "But a sheltering heart always finds the one who needs it — and yours nearly has; yes, they're coming, closer than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your hands run small and quick, made to reach and leap — the daring heart.",
        "You've been ready to leap so long the waiting feels unbearable.",
        "Not much longer — a daring heart draws its moment close by staying ready, and yours is nearly there. Yes, they're coming, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [],
    },
  },
}

// finger-length — index vs ring finger length (the digit-ratio quiz). 3-option,
// A→C running ring-dominant → index-dominant. Mark wording is robust to both
// arts (finger-length shows ring near/under index; the -alt full-hand art shows
// ring reaching past it), so the two share one set of reads.
//   A = ring as tall as / past index → the magnetic heart   (draws love in)
//   B = ring and index nearly even    → the harmonious heart (meets love evenly)
//   C = index clearly above ring       → the certain heart    (knows who it wants)
const FINGER_LENGTH: SignConfig = {
  id: 'finger-length',
  eyebrow: 'According to Your Finger Length',
  instruction: 'Tap the fingers that look most like yours.',
  beatNoun: 'fingers',
  continueCta: "There's more your fingers are telling me — begin your free reading",
  chooseMoment: 'the moment you recognized yours',
  strip: { url: '/palm/finger-length-strip.png', width: 919, height: 474 },
  options: ['a', 'b', 'c'],
  mark: {
    a: 'your ring finger standing as tall as your index, or rising past it',
    b: 'your ring and index fingers standing almost perfectly even',
    c: 'your index finger standing clearly above your ring',
  },
  reading: {
    a: 'the magnetic heart',
    b: 'the harmonious heart',
    c: 'the certain heart',
  },
  reads: {
    'already-met': {
      a: [
        "Your ring finger stands as tall as your index, rising to meet it — the magnetic heart.",
        "You're wondering if the one drawn to you has already appeared… and you didn't feel the pull for what it was.",
        "A heart this magnetic doesn't have to search — it draws its match close on its own, and it already has; yes, they're in your world, closer than you think.",
        "Something's been dimming the pull between you… let me look closer.",
      ],
      b: [
        "Your ring and index fingers stand almost perfectly even — the harmonious heart.",
        "You're wondering if the one who matches your balance has already crossed your path.",
        "A harmonious heart recognizes its equal at once — and yours already has; yes, you've met them, closer than you think.",
        "Let me look closer at why the two of you haven't aligned yet…",
      ],
      c: [
        "Your index finger stands clearly above your ring — the certain heart.",
        "You're wondering if you've already met them and let your own doubt talk you out of it.",
        "A heart this certain knows its person the moment it meets them — and yours has already known. They're someone you've met.",
        "Let me look closer at what made you second-guess the knowing…",
      ],
    },
    'love-again': {
      a: [
        "Your ring finger stands as tall as your index, rising to meet it — the magnetic heart.",
        "You're asking if love will come again… and I feel how the last one drained that pull from you.",
        "But a magnetic heart never loses its draw for long — yours is already pulling someone new toward you, gentler this time. So yes, dear, you'll love again.",
        "Let me look closer at who's being drawn in…",
      ],
      b: [
        "Your ring and index fingers stand almost perfectly even — the harmonious heart.",
        "You're asking whether your heart can find its balance again, after the last one threw it off.",
        "It can — a harmonious heart always rights itself toward love, and yours is already settling back into balance, ready for someone gentler.",
        "Let me look closer at what's restoring the balance…",
      ],
      c: [
        "Your index finger stands clearly above your ring — the certain heart.",
        "You're afraid that after being so sure once, and so wrong, you'll never trust your certainty again.",
        "You will — a certain heart learns to choose better, not to stop choosing. And it's already certain about someone drawing near.",
        "Let me look closer at what's waiting past that fear…",
      ],
    },
    'soulmate-timing': {
      a: [
        "Your ring finger stands as tall as your index, rising to meet it — the magnetic heart.",
        "You've drawn so many near and still not the one… that wears on a heart like yours, I feel it.",
        "But a magnetic heart pulls its true match closer with time, not chance — and yours is nearly here; yes, they're coming, closer than the waiting let you feel.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        "Your ring and index fingers stand almost perfectly even — the harmonious heart.",
        "You've been waiting for the balance to tip toward you, wondering if it ever will.",
        "It's tipping now — a harmonious heart draws its equal at just the right moment, and yours is nearly aligned. Yes, they're coming, closer than you think.",
        "Let me look closer at the timing…",
      ],
      c: [
        "Your index finger stands clearly above your ring — the certain heart.",
        "You've known exactly who you're waiting for, and the not-arriving has worn you down.",
        "Your certainty isn't wrong, dear — a certain heart simply senses its person before they arrive, and yours already has. Yes, they're coming.",
        "Let me look closer at what's been keeping you apart…",
      ],
    },
  },
}

// finger-length-alt — same concept + reads as finger-length, full-hand art.
// Separate sign only so VWO can test two-finger vs full-hand creative.
const FINGER_LENGTH_ALT: SignConfig = {
  ...FINGER_LENGTH,
  id: 'finger-length-alt',
  strip: { url: '/palm/finger-length-alt-strip.png', width: 969, height: 653 },
}

// thumb-angle — does the life line's arc run true with the line of the thumb.
//   A = aligned, the two agree   → the true heart    (recognises its own)
//   B = not aligned, each its own way → the seeking heart (travels wide, still looking)
// 2-option. Archetypes deliberately avoid the existing labels: "open"=thumb-curve,
// "guarded/inward"=finger-lock/thumb, "harmonious"=finger-length.
const THUMB_ANGLE: SignConfig = {
  id: 'thumb-angle',
  eyebrow: "According to Your Life Line's Arc",
  instruction: 'Open your hand and look at the curve around your thumb — tap the one that matches yours.',
  beatNoun: 'life line',
  continueCta: "There's more your life line is telling me — begin your free reading",
  chooseMoment: 'the moment your hand opened',
  strip: { url: '/palm/thumb-angle-strip.png', width: 1357, height: 1027 },
  options: ['a', 'b'],
  mark: {
    a: 'a life line that runs true with the line of your thumb, the two in agreement',
    b: 'a life line that pulls away from your thumb, each going its own way',
    c: '',
  },
  reading: {
    a: 'the true heart',
    b: 'the seeking heart',
    c: '',
  },
  reads: {
    'already-met': {
      a: [
        'Your life line runs true with the line of your thumb, the two in agreement — the true heart.',
        "You're wondering if they've already come into your life, and whether you'd know them if they had.",
        'You would — a heart this true recognises its own; it has already met the one it agrees with, and something in you has known for a while. Yes, you\'ve met them.',
        'Let me look closer at when you first knew…',
      ],
      b: [
        'Your life line pulls away from your thumb, each going its own way — the seeking heart.',
        "You're wondering if they've already crossed your path while you were busy looking further out.",
        'They have — a seeking heart travels wide, and it walked right past what it was looking for; yes, you\'ve met them, closer than the distance you were searching.',
        'Let me look closer at who you overlooked…',
      ],
      c: [],
    },
    'love-again': {
      a: [
        'Your life line runs true with the line of your thumb, the two in agreement — the true heart.',
        "You're asking if love comes again, after you gave yourself so completely to someone who didn't match you.",
        "It does — a true heart doesn't lose its aim; it simply waits for someone who runs the same direction. So yes, dear, you will love again.",
        "Let me look closer at who's already turning toward you…",
      ],
      b: [
        'Your life line pulls away from your thumb, each going its own way — the seeking heart.',
        "You're asking if love comes again, when the last one left you convinced you're better off on your own path.",
        "You're not — a seeking heart isn't running from love, it's still looking for the one worth stopping for. So yes, you'll love again.",
        "Let me look closer at what's still keeping you moving…",
      ],
      c: [],
    },
    'soulmate-timing': {
      a: [
        'Your life line runs true with the line of your thumb, the two in agreement — the true heart.',
        "You've been so sure of what you want that the waiting has started to feel like a punishment for it.",
        "It isn't — a true heart is never wasted, and yours has nearly finished the wait. Yes, they're coming, and sooner than the waiting let you believe.",
        "Let me look closer at what's been holding the timing…",
      ],
      b: [
        'Your life line pulls away from your thumb, each going its own way — the seeking heart.',
        "You've gone your own way so long that you've wondered whether you left it too late.",
        "You haven't — a seeking heart finds them at exactly the moment it stops searching, and that moment is close. Yes, they're coming.",
        "Let me look closer at what's been holding the timing…",
      ],
      c: [],
    },
  },
}

export const SIGNS: Record<PalmSign, SignConfig> = {
  thumb: THUMB,
  'finger-lock': FINGER_LOCK,
  'finger-shape': FINGER_SHAPE,
  palms: PALMS,
  'palm-signs': PALM_SIGNS,
  'thumb-curve': THUMB_CURVE,
  'thumb-curve-alt': THUMB_CURVE_ALT,
  'hand-size': HAND_SIZE,
  'finger-length': FINGER_LENGTH,
  'finger-length-alt': FINGER_LENGTH_ALT,
  'thumb-angle': THUMB_ANGLE,
}

export function getSign(sign: PalmSign): SignConfig {
  return SIGNS[sign]
}

// All v1 hooks are love-themed, so the chat skips the topic picker.
export function hookToBucket(_hook: PalmHook): Bucket {
  return 'love'
}

export function isPalmHook(v: string | null): v is PalmHook {
  return v !== null && (PALM_HOOKS as string[]).includes(v)
}

export function isPalmSign(v: string | null): v is PalmSign {
  return v !== null && Object.prototype.hasOwnProperty.call(SIGNS, v)
}

export function isPalmThumb(v: string | null): v is PalmThumb {
  return v === 'a' || v === 'b' || v === 'c'
}

// Parse + validate palm params from a query string. Returns null unless BOTH a
// valid hook and a valid option (for the resolved sign) are present — the chat
// only diverges when the user actually came through the bridge (provable
// no-impact on other funnels). `sign` defaults to 'thumb', `version` to 'a'.
export function parsePalmParams(
  search: string,
): { sign: PalmSign; hook: PalmHook; thumb: PalmOption; version: PalmVersion } | null {
  const p = new URLSearchParams(search)
  const hook = p.get('hook')
  const thumb = p.get('thumb')
  if (!isPalmHook(hook) || !isPalmThumb(thumb)) return null

  const signParam = p.get('sign')
  const sign: PalmSign = isPalmSign(signParam) ? signParam : DEFAULT_SIGN
  // The tapped option must be one this sign actually offers.
  if (!SIGNS[sign].options.includes(thumb)) return null
  // The hook must carry reads for this sign (thumb-only hooks); otherwise treat
  // it like an unknown hook — no palm divergence.
  if (!SIGNS[sign].reads[hook]) return null

  const vParam = p.get('v')
  const version: PalmVersion = vParam === 'b' ? 'b' : vParam === 'c' ? 'c' : 'a'
  return { sign, hook, thumb, version }
}

// ── Composed copy ───────────────────────────────────────────────────────────

// Reads for a hook×sign combo. Callers run behind parsePalmParams (which
// rejects combos without reads), so the DEFAULT_HOOK fallback never fires in
// practice — it exists to keep the lookup total for TypeScript.
function readsFor(sign: PalmSign, hook: PalmHook): Record<PalmOption, string[]> {
  return SIGNS[sign].reads[hook] ?? SIGNS[sign].reads[DEFAULT_HOOK]!
}

// Version A — the static S3 result card: the 4-sentence build as one paragraph.
export function cardRead(sign: PalmSign, hook: PalmHook, thumb: PalmOption): string {
  return readsFor(sign, hook)[thumb].join(' ')
}

// Version A — brief chat greeting AFTER the card (don't re-deliver the read;
// acknowledge it and hand into name capture).
export function greetingA(sign: PalmSign, thumb: PalmOption): string {
  const s = SIGNS[sign]
  return `Mmm… ${s.reading[thumb]}. I felt it ${s.chooseMoment}. The connection only opens once I know who I'm speaking with, though… what's your first name, dear?`
}

// Version B (and Version C fallback) — the 4-sentence build as a chat sequence,
// one bubble per sentence, then ask the name → existing love deepening.
export function openerB(sign: PalmSign, hook: PalmHook, thumb: PalmOption): string[] {
  return [
    ...readsFor(sign, hook)[thumb],
    "Before I follow this thread any further, I need to know who I'm speaking with… what's your first name, dear?",
  ]
}

// Version C opener (static, instant): the mark line (sentence 1) + the open
// question. Then the LLM reads HER answer.
export function openerCStart(sign: PalmSign, hook: PalmHook, thumb: PalmOption): string[] {
  return [readsFor(sign, hook)[thumb][0], PALM_QUESTION[hook]]
}

// Version C fallback (if the reflect LLM call fails): the rest of the static
// build minus the mark line already shown (mirror → yes beat → open loop).
export function palmReflectFallback(sign: PalmSign, hook: PalmHook, thumb: PalmOption): string[] {
  return readsFor(sign, hook)[thumb].slice(1)
}
