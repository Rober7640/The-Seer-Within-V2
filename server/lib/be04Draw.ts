import { randomInt } from 'node:crypto';
import { TEA_CUPS, type TeaCup } from '@shared/backendOffers';

// 04 · The Turn — which of the three readings she is sent.
//
// Operator decision 2026-10-11: NO PICK. Every buyer's reading reads the same cup photo; the
// three readings (TEA_CUPS) are three interpretations of it, and each buyer is dealt ONE by a
// uniform random draw, on the SERVER, at checkout. The booking screens never ask, and the
// receipt never names it — the reading itself is the reveal.
//
// The draw is written to the Stripe session's metadata as `cup` (always a valid slug), with
// `cupDrawn: '1'`; the delivery job reads `cup` back to choose her link (be04Delivery.ts).
// ⛔ A `cup` the client sends is ignored — an old cached booking page may still send one.

/** A uniform whole number in [0, max) — the one-argument shape of `crypto.randomInt`. */
export type RandomIndex = (max: number) => number;

/**
 * One of the three cups, uniformly at random. `random` is injectable so tests are
 * deterministic; the default is node's CSPRNG (`crypto.randomInt`, uniform with no modulo
 * bias). An injected source that answers outside 0..2 is a bug in the caller: it throws
 * rather than quietly dealing everyone the same cup.
 */
export function drawTeaCup(random: RandomIndex = (max) => randomInt(max)): TeaCup {
  const index = random(TEA_CUPS.length);
  if (!Number.isInteger(index) || index < 0 || index >= TEA_CUPS.length) {
    throw new RangeError(`drawTeaCup: index ${index} is not a whole number in 0..${TEA_CUPS.length - 1}`);
  }
  return TEA_CUPS[index];
}
