/** 08 local build contract v1. No environment, DB, network, or payment imports. */
export const CONTRACT_VERSION = 1 as const;
export const MAIN_CENTS = 3500;
export const SAME_DAY_CENTS = 1277;
export type CardId = string;
export interface Card { id: CardId; name: string; image: string }
export interface FixedCard { cardId: CardId; reversed: boolean }
export interface Position {
  id: string;
  number: number;
  label: string;
  visibility: 'free' | 'paid';
  fixedCard?: FixedCard;
}
export interface Edition {
  id: string;
  version: number;
  slug: string;
  question: string;
  /** Explicit daily theme used by the adaptive report prompt and PDF. */
  theme: string;
  spread: { id: string; name: string; version: number };
  positions: Position[];
  freeEmailText: string;
  bookingCopy?: { headline: string; intro: string; bridge: string; offer: string; name: string };
  status: 'draft' | 'published';
}
export interface PersonalLens {
  firstName: string;
  lastName: string;
  expressionNumber: number;
  cardId: CardId;
  methodVersion: string;
}
export interface OrderDraw {
  orderId: string;
  editionId: string;
  editionVersion: number;
  methodVersion: string;
  positions: Array<{ positionId: string; cardId: CardId; reversed: boolean }>;
  /** Separate lens; can coincide with a spread card, never consumes a position. */
  personalLens: PersonalLens;
}
/**
 * The booking page collects NO personal data (operator ruling 3, 2026-09-13). An intake is only
 * the edition and the speed-bump choice; name, email, birth name and date of birth are collected
 * by the hosted checkout (Stripe custom fields in production, `/checkout-sim` locally).
 */
export interface Intake {
  id: string;
  editionId: string;
  editionVersion: number;
  sameDay: boolean;
}
export interface PaidOrder {
  id: string;
  intakeId: string;
  editionSnapshot: Edition;
  draw: OrderDraw;
  deliveryEmail: string;
  /** What the pages call her. Derived from the "name on card" field at checkout. */
  displayFirstName: string;
  /** The name given at birth, as typed — the personal-card lens is computed from it. Never log it. */
  fullBirthName: string;
  /** `YYYY-MM-DD` as combined from the checkout's three numeric boxes. Never log it. */
  dateOfBirth: string;
  baseCents: typeof MAIN_CENTS;
  bumpCents: number;
  currency: 'usd';
  paymentReference: string;
  paidAt: string;
  dueAt: string;
  deliveryHours: 12 | 24;
  /** Audio purchase is separate; false/absent cannot delay the main reading. */
  audio?: { purchased: true; amountCents: number; paymentReference: string };
  writtenStatus: 'queued' | 'generating' | 'review' | 'ready' | 'delivered' | 'failed';
  audioStatus?: 'queued' | 'generating' | 'ready' | 'delivered' | 'failed';
}
