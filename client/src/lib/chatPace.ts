// How long a line takes Evelyn to type, and how long she waits before starting.
//
// ⚠ A FIXED PAUSE IS THE TELL *(operator, 2026-08-09)*. If every line takes the
// same time, "You came." and a ninety-character sentence arrive at the same
// speed, and the reader knows it is a machine before she can say why. Real
// typing is proportional to what is being typed, it varies run to run, and
// there is a gap between one message landing and the next one starting.
//
// Same shape as V1's `lib/typing.ts` (60ms/char, 1–5s), tuned faster because
// this is a checkout: V1's pace would put five seconds between the greeting and
// the card, and latency in front of a payment reads as a slow payment.
// The whole run to the gate lands around 3.5 seconds.

const MS_PER_CHAR = 18
const MIN_MS = 650
const MAX_MS = 2000
// ±18% run to run. Without it, two lines of the same length are identical every
// time, which is its own tell.
const VARIANCE = 0.18

/** Milliseconds of typing indicator before a line of this length appears. */
export function typingPace(text: string): number {
  const jitter = 1 + (Math.random() * VARIANCE * 2 - VARIANCE)
  return Math.min(Math.max(text.length * MS_PER_CHAR * jitter, MIN_MS), MAX_MS)
}

/** The beat AFTER one message lands, before she starts typing the next. */
export const BETWEEN_LINES_MS = 320

/** She has stopped talking and is getting the card out. */
export const BEFORE_CARD_MS = 700
