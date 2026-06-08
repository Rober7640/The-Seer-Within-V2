// Copy + lookup tables for the /fb-palm "quiz bridge" funnel.
// Single source of truth shared by PalmBridge (the lander) and useConversation
// (the chat handoff). See fb-palm/docs/PRD-quiz-bridge.md.
//
// Two versions, split externally by VWO across two links:
//   Version A  (/fb-palm)    → static result card on S3, then a brief chat greeting
//   Version B  (/fb-palm/b)  → no card; the reading is delivered as chat messages
// Both share the S1 quiz + S2 reading beat, the thumb vocabulary, and everything
// after name capture. The chat reads the version from the `v` query param.

import type { Bucket } from '@/types/chat'

export type PalmHook = 'soulmate-timing' | 'already-met' | 'love-again'
export type PalmThumb = 'a' | 'b' | 'c'
export type PalmVersion = 'a' | 'b' | 'c'

export const PALM_HOOKS: PalmHook[] = ['soulmate-timing', 'already-met', 'love-again']
export const PALM_THUMBS: PalmThumb[] = ['a', 'b', 'c']

// Shown when /fb-palm is hit without a recognized ?hook= (e.g. a bare visit).
export const DEFAULT_HOOK: PalmHook = 'soulmate-timing'

// Verbatim match to the ad question (the whole point — message scent).
export const HEADLINES: Record<PalmHook, string> = {
  'already-met': 'Have you already met your soulmate?',
  'love-again': 'Will I love again?',
  'soulmate-timing': 'When is my soulmate coming?',
}

export const INSTRUCTION = 'Tap the thumb that looks most like yours.'
export const CONTINUE_CTA = "There's more your thumb is telling me — begin your free reading"

// Thumb archetypes — the crease drawn at the base of each thumb in the art
// (strip-plain.png), consistent across all versions and hooks:
//   A — a trident (three lines converging to one) → the gathering heart
//   B — a Y leaning right (reaching outward)       → the reaching heart
//   C — a Y leaning left (curling inward)          → the inward heart
// THUMB_MARK/THUMB_READING feed the Version-A greeting + the Version-C LLM
// injection; the READS below name the mark in sentence 1 themselves (no prefix).
export const THUMB_MARK: Record<PalmThumb, string> = {
  a: 'a trident, three lines rising to one',
  b: 'a Y that leans right, reaching outward',
  c: 'a Y that leans left, curling inward',
}

export const THUMB_READING: Record<PalmThumb, string> = {
  a: 'the gathering heart',
  b: 'the reaching heart',
  c: 'the inward heart',
}

// READS[hook][thumb] = the 4-beat "build" (Version C's arc, made static):
//   1. name the mark (+ reading label)
//   2. mirror HER question back (acknowledge the wound first if it hurts)
//   3. the "yes" beat — affirm via the archetype, withhold the specifics
//   4. open loop → "let me look closer"
// Self-contained — no mark prefix. Used as:
//   Version A → joined into the card paragraph (cardRead)
//   Version B → one chat bubble per sentence (openerB)
//   Version C → fallback (openerB) + the same arc the LLM is told to produce
export const READS: Record<PalmHook, Record<PalmThumb, string[]>> = {
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
}

// All v1 hooks are love-themed, so the chat skips the topic picker.
export function hookToBucket(_hook: PalmHook): Bucket {
  return 'love'
}

export function isPalmHook(v: string | null): v is PalmHook {
  return v !== null && (PALM_HOOKS as string[]).includes(v)
}

export function isPalmThumb(v: string | null): v is PalmThumb {
  return v !== null && (PALM_THUMBS as string[]).includes(v)
}

// Parse + validate palm params from a query string. Returns null unless BOTH a
// valid hook and thumb are present — the chat only diverges when the user
// actually came through the bridge (provable no-impact on other funnels).
// `version` defaults to 'a' unless ?v=b.
export function parsePalmParams(
  search: string,
): { hook: PalmHook; thumb: PalmThumb; version: PalmVersion } | null {
  const p = new URLSearchParams(search)
  const hook = p.get('hook')
  const thumb = p.get('thumb')
  if (!isPalmHook(hook) || !isPalmThumb(thumb)) return null
  const vParam = p.get('v')
  const version: PalmVersion = vParam === 'b' ? 'b' : vParam === 'c' ? 'c' : 'a'
  return { hook, thumb, version }
}

// ── Composed copy ───────────────────────────────────────────────────────────

// Version A — the static S3 result card: the 4-sentence build as one paragraph.
export function cardRead(hook: PalmHook, thumb: PalmThumb): string {
  return READS[hook][thumb].join(' ')
}

// Version A — brief chat greeting AFTER the card (don't re-deliver the read;
// acknowledge it and hand into name capture).
export function greetingA(thumb: PalmThumb): string {
  return `Mmm… ${THUMB_READING[thumb]}. I felt it the moment your thumb chose. The connection only opens once I know who I'm speaking with, though… what's your first name, dear?`
}

// Version B (and Version C fallback) — the 4-sentence build as a chat sequence,
// one bubble per sentence, then ask the name → existing love deepening.
export function openerB(hook: PalmHook, thumb: PalmThumb): string[] {
  return [
    ...READS[hook][thumb],
    "Before I follow this thread any further, I need to know who I'm speaking with… what's your first name, dear?",
  ]
}

// Version C (interactive) — one open question per hook. C opens with the mark
// line (READS sentence 1) + this question, then the LLM reads HER answer.
const PALM_QUESTION: Record<PalmHook, string> = {
  'already-met': "Before I look closer, tell me… is there already someone your mind keeps returning to?",
  'love-again': "Before I look closer, tell me… what's been weighing on your heart since it happened?",
  'soulmate-timing': "Before I look closer, tell me… what's making the waiting feel so heavy right now?",
}

// Version C opener (static, instant): the mark line + the open question.
export function openerCStart(hook: PalmHook, thumb: PalmThumb): string[] {
  return [READS[hook][thumb][0], PALM_QUESTION[hook]]
}

// Version C fallback (if the reflect LLM call fails): the rest of the static
// build minus the mark line already shown (mirror → yes beat → open loop).
export function palmReflectFallback(hook: PalmHook, thumb: PalmThumb): string[] {
  return READS[hook][thumb].slice(1)
}
