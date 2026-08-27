// The shape every offer's U1 + U2 conversation is written to.
//
// One type, many offers. V1's own flow is expressed in the same shape (see
// ./v1.ts), which is what lets useUpsellChat / useUpsell2Chat run one code path
// for the six live funnels and every backend offer alike.

import type { Bucket } from "@shared/types";
import type { QuickReply, UpsellStage } from "@/lib/upsellMessages";
import type { Upsell2Stage } from "@/lib/upsell2Messages";

// Stage → the stage that follows it. This is what removes the questions: V1
// routes RISK → QUESTION_1, offer 02 routes RISK → SOLUTION, and the question
// cases in the hook are simply never entered.
export interface Upsell1Chain {
  CONFIRMATION: UpsellStage;
  GAP: UpsellStage;
  RISK: UpsellStage;
  AFTER_Q1: UpsellStage;
  SOLUTION: UpsellStage;
  LAVA_INTRO: UpsellStage;
  AFTER_Q2: UpsellStage;
  RITUAL: UpsellStage;
  FEEL: UpsellStage;
  AFTER_Q3: UpsellStage;
  BUCKET: UpsellStage;
  DELIVERY: UpsellStage;
}

export interface Upsell2Chain {
  PATH_A_OPEN: Upsell2Stage;
  PATH_B_OPEN: Upsell2Stage;
  MANIFEST_REVEAL: Upsell2Stage;
  GAP: Upsell2Stage;
  AFTER_Q1: Upsell2Stage;
  INTRODUCE: Upsell2Stage;
  STONES: Upsell2Stage;
  AFTER_Q2: Upsell2Stage;
  MANIFEST_PERSONALIZE: Upsell2Stage;
  RITUAL_INSTRUCTION: Upsell2Stage;
  WHAT_RECEIVE: Upsell2Stage;
  AFTER_Q3: Upsell2Stage;
  SOCIAL_PROOF: Upsell2Stage;
  PRICE: Upsell2Stage;
}

export interface Upsell1Copy {
  CONFIRMATION: string[];
  GAP: string[];
  RISK: string[];
  QUESTION_1: string;
  QUESTION_1_REPLIES: QuickReply[];
  AFTER_Q1: Record<string, string[]>;
  SOLUTION: string[];
  LAVA_INTRO: string[];
  RITUAL: string[];
  FEEL: string[];
  DELIVERY: string[];
  OFFER: string[];
  SUCCESS: string[];
  SHIPPING_CONFIRMED: string[];
  SOFT_DECLINE: string[];
  bucketMessages(bucket: Bucket | undefined, personName: string | null | undefined): string[];
  chain: Upsell1Chain;
  // Stage → the label on a CONTINUE tap shown after that stage's messages.
  // Not a question: one button, no branch, nothing captured. It exists purely
  // so ~50 messages don't arrive as one uninterrupted broadcast — V1 got that
  // rhythm from its three questions, and offer 02 has none. Empty on V1, whose
  // questions already break the wall.
  pauses: Partial<Record<UpsellStage, string>>;
  // Label on the accept button AND the bubble it posts as her reply.
  acceptLabel: string;
  // First names that are placeholders rather than names. /api/upsell/user-data's
  // Stripe fallback stamps "Friend" when checkout carried no firstName metadata,
  // which 02's does not — and "It's done, Friend" is worse copy than Evelyn's own
  // fallback, "dear".
  placeholderNames: readonly string[];
}

export interface Upsell2Copy {
  PATH_A_OPEN: string[];
  PATH_B_OPEN: string[];
  // When present, played instead of calling Claude for that segment.
  REVEAL: string[] | null;
  PERSONALIZE: string[] | null;
  GAP: string[];
  INTRODUCE: string[];
  STONES: string[];
  RITUAL_INSTRUCTION: string[];
  RITUAL_PATH_A_EXTRA: string;
  WHAT_RECEIVE: string[];
  SOCIAL_PROOF: string[];
  PRICE: string[];
  URGENCY: string[];
  DOWNSELL: string[];
  SUCCESS: string[];
  SUCCESS_HAS_SHIPPING: string[];
  SUCCESS_NEEDS_SHIPPING: string[];
  SHIPPING_CONFIRMED: string[];
  SOFT_DECLINE: string[];
  chain: Upsell2Chain;
  // See Upsell1Copy.pauses.
  pauses: Partial<Record<Upsell2Stage, string>>;
  downsellDeclineLabel: string;
  placeholderNames: readonly string[];
}

// "Friend" is not a name — see Upsell1Copy.placeholderNames.
export function displayName(
  firstName: string | null | undefined,
  placeholders: readonly string[],
): string {
  const name = firstName || "";
  return placeholders.includes(name) ? "" : name;
}
