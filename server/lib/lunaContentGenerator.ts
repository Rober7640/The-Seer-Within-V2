/**
 * Luna content generator — the "writer" stage of the daily-email pipeline.
 *
 * Turns a DayPlan (from dailySkyEditor) into Luna-voiced email copy: subject,
 * preheader, body (HTML + text), and P.S. Uses the same Haiku-with-fallback
 * pattern as personaVerifiedDripGenerator.ts. The CTA/blurb is appended later by
 * the assembler — this stage writes the editorial copy only.
 *
 * Accuracy rules are enforced in the prompt AND structurally: the talking points
 * fed in only describe the COLLECTIVE sky; the copy must never claim a personal
 * house/placement, promise an outcome, or ask for birth data. Every draft should
 * still be run through the persona-email-qa gate before sending.
 */
import { fireWithBreaker, anthropicBreaker } from './circuitBreaker';
import { anthropicFailover as anthropic } from './anthropicWithFailover';
import { getModelForOperation } from './modelConfig';
import { getPersonaDripConfig } from './personaDripConfig';
import logger from './logger';
import type { DayPlan } from './dailySkyEditor';

export interface LunaEmailCopy {
  subject: string;       // house format: "{firstName}, [hook] ([detail])"
  h1: string;            // big headline at the top of the email (no {firstName}), ~5–9 words
  preheader: string;     // ~40–90 chars
  bodyHtml: string;      // <p>…</p> per paragraph
  bodyText: string;      // plain text, \n\n between paragraphs
  ps: string;            // P.S. sentence (the template prepends "P.S.")
  source: 'haiku' | 'fallback';
}

const LUNA = getPersonaDripConfig('luna-voss');

function buildPrompt(plan: DayPlan): string {
  const voice = LUNA?.voiceBrief ?? 'a modern astrologer — sharp, warm, a little witty, zero fluff.';
  const points = plan.talkingPoints.map(p => `- ${p}`).join('\n');
  return `You are Luna Voss, ${voice}

Write ONE daily astrology email for a US email list. It is a free content newsletter; the goal is a useful, on-voice read that quietly makes people want a live chart reading. The CTA button is added separately — do NOT write a CTA, link, or sign-off line in the body.

Today's material (the COLLECTIVE sky — true for everyone):
- Pillar: ${plan.pillar}
- Headline: ${plan.headline ?? 'quiet sky (no tight personal aspect)'}
- Moon: ${plan.moonPhase.name}, ~${plan.moonPhase.illumination}% lit${plan.timingNote ? `\n- Timing: ${plan.timingNote}` : ''}
Talking points to draw from:
${points}

HARD RULES (a QA gate will reject violations):
- Describe only the COLLECTIVE sky. NEVER name a personal house/placement ("your 4th house", "your Venus") and never assert you know where it lands for them ("which house is holding this"). You may tease only that the specific area is personal and visible in a reading.
- Speak in tendencies and timing. NEVER promise an outcome ("you will…", "they'll come back").
- NEVER invent a specific date or duration for a transit, retrograde, or phase (no "retrograde lasts until January", no "exact for 36 hours"). If a duration isn't in the material above, don't state one — keep it loose ("for now", "this stretch", "a few days").
- Do NOT ask for birth date/time/city. No medical, legal, or financial advice.
- Plain English, no jargon dump. Warm, direct, a little witty. Short lines, generous white space.
- Use the literal token {firstName} where a first name would go (it is a merge field).

Format:
- Subject: house format "{firstName}, [hook] ([specific, concrete detail])", under 60 chars.
- H1: a short headline for the top of the email (5–9 words, NO first name, evocative).
- Preheader: 40–90 chars, complements (doesn't repeat) the subject.
- Body: 90–150 words, 2–3 short paragraphs.
- P.S.: one sentence that closes the loop on the hook (no "P.S." prefix — just the sentence).

Return ONLY valid JSON, no markdown fences:
{"subject":"...","h1":"...","preheader":"...","bodyText":"...","bodyHtml":"<p>...</p>","ps":"..."}`;
}

/** Deterministic fallback — used if Haiku fails. Pure + exported for testing. */
export function buildFallbackCopy(plan: DayPlan): LunaEmailCopy {
  const signoff = LUNA?.signoff ?? '— Luna';
  const headline = plan.headline ?? "today's quiet sky";
  // Reader-facing lines: take the human talking points, drop the internal QA note.
  const reader = plan.talkingPoints.filter(t => !t.startsWith('WHICH area'));
  const lead = reader[0] ?? `The sky's worth a glance today — ${headline}.`;
  const move = reader[1] ?? 'Small, deliberate moves land better than big ones today.';

  const p1 = `Hi {firstName} — here's today's sky in one line. ${lead}`;
  const p2 = `${move} The catch is where it lands in your chart — for some it's love, for others money or the conversation they keep rehearsing. That part's personal.`;
  const ps = 'Which area it actually hits is a 30-second answer once you can see your chart — not a mystery.';

  return {
    subject: `{firstName}, the sky's got something today (${headline.toLowerCase()})`.slice(0, 120),
    h1: plan.headline ?? 'A quiet sky, but worth a look',
    preheader: `${plan.moonPhase.name} overhead — here's what to do with it.`,
    bodyText: `${p1}\n\n${p2}`,
    bodyHtml: `<p>${p1}</p>\n<p>${p2}</p>`,
    ps,
    source: 'fallback',
  };
}

/** Generate Luna-voiced copy for a day. Falls back to buildFallbackCopy on any failure. */
export async function generateLunaDailyEmail(plan: DayPlan): Promise<LunaEmailCopy> {
  const prompt = buildPrompt(plan);
  try {
    const response = await fireWithBreaker(anthropicBreaker, () =>
      anthropic.messages.create({
        model: getModelForOperation('greeting'),
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    );
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('[LunaContent] Haiku returned no JSON — using fallback', { date: plan.date });
      return buildFallbackCopy(plan);
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.subject || !parsed.h1 || !parsed.bodyHtml || !parsed.bodyText || !parsed.preheader || !parsed.ps) {
      logger.warn('[LunaContent] Haiku JSON missing fields — using fallback', { date: plan.date });
      return buildFallbackCopy(plan);
    }
    return {
      subject: String(parsed.subject).slice(0, 120),
      h1: String(parsed.h1).slice(0, 120),
      preheader: String(parsed.preheader).slice(0, 140),
      bodyHtml: String(parsed.bodyHtml),
      bodyText: String(parsed.bodyText),
      ps: String(parsed.ps),
      source: 'haiku',
    };
  } catch (error) {
    logger.warn('[LunaContent] Haiku threw — using fallback', { date: plan.date, error: (error as Error).message });
    return buildFallbackCopy(plan);
  }
}
