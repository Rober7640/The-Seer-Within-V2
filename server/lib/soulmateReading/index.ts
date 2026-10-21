// Soulmate Initials Reading — the one entry point.
//
// Give it one paid order and it returns the finished PDF the buyer receives,
// plus the HTML and the deterministic facts (so a caller can store/inspect
// them). This is the whole product: the operator's plumbing (Stripe webhook →
// n8n → AWeber) only has to call this and deliver the bytes.
//
// Usage from n8n or a server route:
//   const { pdf } = await generateReadingPdf(order);
//   // upload `pdf`, email the link.

import { computeReadingNumbers, type ReadingNumbers } from './numbers';
import { resolveInitials, type ResolvedInitials } from './initials';
import { drawSeven, type DrawnCard } from './draw';
import { generateProse, type ReadingProse } from './content';
import { buildReadingHtml } from './html';
import { resolveCardImages, renderPdf } from './pdf';

export interface ReadingOrder {
  sessionId: string; // Stripe checkout session id — the reproducibility seed
  firstName: string;
  dateOfBirth: string; // YYYY-MM-DD
  stone: string; // display label, e.g. "Rose Quartz"
  bump: boolean; // bought the "charge my stone" add-on
}

export interface ReadingResult {
  pdf: Buffer;
  html: string;
  meta: {
    numbers: ReadingNumbers;
    initials: ResolvedInitials;
    draw: DrawnCard[];
    prose: ReadingProse;
  };
}

/** Build the facts (deterministic) + prose (Claude) for an order, without rendering. */
export async function buildReading(
  order: ReadingOrder,
  opts?: { referenceDate?: Date },
): Promise<{ html: string; meta: ReadingResult['meta']; cardImages: Record<string, string | null> }> {
  const numbers = computeReadingNumbers(order.firstName, order.dateOfBirth, opts?.referenceDate);
  const initials = resolveInitials({
    lifePath: numbers.lifePath,
    firstNameNumber: numbers.firstNameNumber,
    sessionId: order.sessionId,
  });
  const draw = drawSeven(order.sessionId);
  const prose = await generateProse({
    firstName: order.firstName,
    stone: order.stone,
    bump: order.bump,
    numbers,
    initials,
    draw,
  });
  const cardImages = await resolveCardImages(draw);
  const html = buildReadingHtml({
    firstName: order.firstName,
    stone: order.stone,
    numbers,
    initials,
    draw,
    prose,
    cardImages,
  });
  return { html, meta: { numbers, initials, draw, prose }, cardImages };
}

/** Full pipeline: facts → prose → HTML → PDF. */
export async function generateReadingPdf(
  order: ReadingOrder,
  opts?: { referenceDate?: Date },
): Promise<ReadingResult> {
  const { html, meta } = await buildReading(order, opts);
  const pdf = await renderPdf(html);
  return { pdf, html, meta };
}
