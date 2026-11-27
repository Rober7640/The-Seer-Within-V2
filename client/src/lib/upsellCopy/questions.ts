// Questions 2 and 3 and the typed-answer matching for Upsell 1, and all three questions and
// the typed-answer matching for Upsell 2, resolved from the copy.
//
// Until the /fb Upsell 1 copy test (v1_fb_u1_copy_2026) the hook imported these straight
// from upsellMessages.ts, because no offer asked its own Q2 or Q3. Arm B of that test does,
// so the hook now asks the copy first and falls back to exactly those shared constants.
// ⛔ V1_UPSELL1 and every backend offer set none of the optional fields, so for them each
// helper returns the very same objects the hook used before (asserted in questions.test.ts).
//
// Upsell 2 the same way, for the /fb Upsell 2 copy test (v1_fb_u2_copy_2026): until then
// useUpsell2Chat imported Q1, Q2, Q3, their buttons and detectU2Q1/2/3Intent straight from
// upsell2Messages.ts. ⛔ V1_UPSELL2, the retarget copy and every backend offer set none of
// QUESTION_1/2/3, QUESTION_*_REPLIES or detectIntent, so they get those same shared objects.
// (AFTER_Q1/2/3 were already optional on Upsell2Copy, with the same fallback, before this.)

import {
  UPSELL_QUESTION_2,
  UPSELL_QUESTION_2_REPLIES,
  UPSELL_AFTER_Q2,
  UPSELL_QUESTION_3,
  UPSELL_QUESTION_3_REPLIES,
  UPSELL_AFTER_Q3,
  detectQ1Intent,
  detectQ2Intent,
  detectQ3Intent,
  type QuickReply,
} from "@/lib/upsellMessages";
import {
  UPSELL2_QUESTION_1,
  UPSELL2_QUESTION_1_REPLIES,
  UPSELL2_AFTER_Q1,
  UPSELL2_QUESTION_2,
  UPSELL2_QUESTION_2_REPLIES,
  UPSELL2_AFTER_Q2,
  UPSELL2_QUESTION_3,
  UPSELL2_QUESTION_3_REPLIES,
  UPSELL2_AFTER_Q3,
  detectU2Q1Intent,
  detectU2Q2Intent,
  detectU2Q3Intent,
} from "@/lib/upsell2Messages";
import type { Upsell1Copy, Upsell2Copy } from "./types";

export interface Upsell1Question {
  question: string;
  replies: QuickReply[];
  after: Record<string, string[]>;
}

export function upsell1Question2(copy: Upsell1Copy): Upsell1Question {
  return {
    question: copy.QUESTION_2 ?? UPSELL_QUESTION_2,
    replies: copy.QUESTION_2_REPLIES ?? UPSELL_QUESTION_2_REPLIES,
    after: copy.AFTER_Q2 ?? UPSELL_AFTER_Q2,
  };
}

export function upsell1Question3(copy: Upsell1Copy): Upsell1Question {
  return {
    question: copy.QUESTION_3 ?? UPSELL_QUESTION_3,
    replies: copy.QUESTION_3_REPLIES ?? UPSELL_QUESTION_3_REPLIES,
    after: copy.AFTER_Q3 ?? UPSELL_AFTER_Q3,
  };
}

export function upsell1Intent(copy: Upsell1Copy, question: 1 | 2 | 3): (input: string) => string {
  if (question === 1) return copy.detectIntent?.q1 ?? detectQ1Intent;
  if (question === 2) return copy.detectIntent?.q2 ?? detectQ2Intent;
  return copy.detectIntent?.q3 ?? detectQ3Intent;
}

// ── Upsell 2 ────────────────────────────────────────────────────────────────────

export function upsell2Question1(copy: Upsell2Copy): Upsell1Question {
  return {
    question: copy.QUESTION_1 ?? UPSELL2_QUESTION_1,
    replies: copy.QUESTION_1_REPLIES ?? UPSELL2_QUESTION_1_REPLIES,
    after: copy.AFTER_Q1 ?? UPSELL2_AFTER_Q1,
  };
}

export function upsell2Question2(copy: Upsell2Copy): Upsell1Question {
  return {
    question: copy.QUESTION_2 ?? UPSELL2_QUESTION_2,
    replies: copy.QUESTION_2_REPLIES ?? UPSELL2_QUESTION_2_REPLIES,
    after: copy.AFTER_Q2 ?? UPSELL2_AFTER_Q2,
  };
}

export function upsell2Question3(copy: Upsell2Copy): Upsell1Question {
  return {
    question: copy.QUESTION_3 ?? UPSELL2_QUESTION_3,
    replies: copy.QUESTION_3_REPLIES ?? UPSELL2_QUESTION_3_REPLIES,
    after: copy.AFTER_Q3 ?? UPSELL2_AFTER_Q3,
  };
}

export function upsell2Intent(copy: Upsell2Copy, question: 1 | 2 | 3): (input: string) => string {
  if (question === 1) return copy.detectIntent?.q1 ?? detectU2Q1Intent;
  if (question === 2) return copy.detectIntent?.q2 ?? detectU2Q2Intent;
  return copy.detectIntent?.q3 ?? detectU2Q3Intent;
}
