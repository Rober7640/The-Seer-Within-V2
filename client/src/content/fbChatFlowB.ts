// /fb chat-flow B (v1_fb_chat_flow_2026): the scripted lines before the email.
//
// The lander says "Send Evelyn your first name", and A answers it with "It's lovely to
// meet you". B gives the name a reading: the candle bends and smokes when she says it
// (an open loop, closed by the diagnosis right before the pitch), then the name's
// number. No model call, so nothing slows the second step of the chat.
//
// Copy approved by the operator 2026-11-21 (candle + number). Never edit these lines
// while the test runs: arm B must read the same for every woman in it.
import type { Bucket } from '@/types/chat'

/** Pythagorean letter values: A=1 … I=9, J=1 … R=9, S=1 … Z=8. */
const VALUE = (c: string) => ((c.charCodeAt(0) - 65) % 9) + 1

/**
 * Her name's number, 1–9: add the letter values, then add the digits until one is
 * left. Accents are stripped first (José → JOSE). null when the name has no A–Z
 * letters at all, so the caller can skip the number lines.
 */
export function nameNumber(name: string): number | null {
  const letters = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  if (!letters) return null
  let n = letters.split('').reduce((sum, c) => sum + VALUE(c), 0)
  while (n > 9) n = String(n).split('').reduce((sum, d) => sum + Number(d), 0)
  return n
}

const NUMBER_LINE: Record<number, string> = {
  1: "Ones go first. You've always been the one who figures it out alone... even when you wish you didn't have to.",
  2: 'Twos feel everything in a room before anyone speaks. You give people a softness you rarely get back.',
  3: 'Threes light up a room... then go home and wonder why it still feels empty.',
  4: 'Fours are the steady ones. Everyone leans on you. Nobody asks what it costs you to stay standing.',
  5: 'Fives were born restless. You keep reaching for a life that feels like yours... and it keeps slipping out of reach.',
  6: 'Sixes hold everyone else together... and quietly wait for someone to hold them.',
  7: "Sevens see straight through people. You've always known things you couldn't explain... and kept most of it to yourself.",
  8: "Eights were built to carry weight. You've worked harder than most for what should have come easier.",
  9: "Nines give and give. You've loved people through things that would have broken others... and you're tired.",
}

/** Replaces A's "It's lovely to meet you, {name}." through the topic question. */
export function fbBNameLines(name: string): string[] {
  const n = nameNumber(name)
  return [
    `${name}...`,
    'I said your name out loud just now, and the candle beside me bent. Hard to one side.',
    'Like someone had opened a door. But every window in this room is shut.',
    'Then it gave off a thin line of black smoke.',
    "I've sat with candles for over forty years, dear. I know what that means.",
    ...(n ? [`Your name carries a number too. ${name} comes to a ${n}.`, NUMBER_LINE[n]] : []),
    'Everything we discuss stays between us... our secret.',
    "Now, what's weighing on your heart today?",
  ]
}

/** Replaces A's per-topic lines ("warmth… flicker of shadow" and the rest). */
export function fbBTopicLines(bucket: Bucket, name: string): string[] {
  switch (bucket) {
    case 'love':
      return [`Love. That's where the smoke was pulling, ${name}.`, 'Something is sitting over your heart that was never yours to carry.']
    case 'money':
      return [`Money. That's where the smoke was pulling, ${name}.`, 'Something is sitting over your money that was never yours to carry.']
    case 'purpose':
      return [`Your path. That's where the smoke was pulling, ${name}.`, 'Something is sitting over your path that was never yours to carry.']
    case 'someone':
      return [
        `Someone's on your mind. That's where the smoke was pulling, ${name}.`,
        'Their energy is tangled with yours... and so is something else.',
        "Tell me... what's their first name?",
      ]
  }
}
