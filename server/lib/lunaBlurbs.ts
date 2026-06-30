/**
 * Luna conversion blurbs — the CTA modules that turn a daily content email into a
 * live-chat click. Source: docs/kit/luna-voss-daily-emails-prd.md §5.
 *
 * pickBlurb() rotates by send index (no consecutive repeats; free-minutes ~1-in-3)
 * and matches the blurb angle to the day's pillar. CTA labels carry no arrow — the
 * template appends it. Links resolve to the /luna cold lander with UTMs.
 */
import type { Pillar } from './dailySkyEditor';

export interface LunaBlurb {
  id: string;
  angle: string;
  text: string;       // 1–2 short sentences placed above the CTA button
  ctaLabel: string;   // reader-voice, NO trailing arrow (template adds it)
}

export const BLURBS: Record<string, LunaBlurb> = {
  'LV-01': { id: 'LV-01', angle: 'curiosity', text: "This email can't tell you which house this lands in. Your chart can.", ctaLabel: 'Show me where it lands, Luna' },
  'LV-02': { id: 'LV-02', angle: 'timing', text: "This window doesn't stay open — that's the whole point of timing. Your chart decides whether you ride it or sit it out.", ctaLabel: 'Read my timing' },
  'LV-03': { id: 'LV-03', angle: 'personalization', text: "That was the generic sky. Your chart is the local weather — the difference between 'rain expected' and 'grab an umbrella by 4pm.'", ctaLabel: 'Make it about me' },
  'LV-04': { id: 'LV-04', angle: 'free-minutes', text: "Quick reminder: you've got 3 free minutes with me, unused — enough for the one question that's been rattling around all week.", ctaLabel: 'Spend my 3 free minutes' },
  'LV-05': { id: 'LV-05', angle: 'social-proof', text: "I've done 431 of these readings. Almost every time someone says 'wait, how did you know that?' — it was in the chart the whole time.", ctaLabel: 'See what’s in mine' },
  'LV-06': { id: 'LV-06', angle: 'objection-knowledge', text: "You don't need to know a single thing about astrology. You just talk, I read — like texting a friend who knows your chart cold.", ctaLabel: 'Okay, let’s just talk' },
  'LV-07': { id: 'LV-07', angle: 'returning', text: "Last time we talked, we left something half-finished. The sky's moved since — there's a fresh layer to it.", ctaLabel: 'Pick up where we left off' },
  'LV-08': { id: 'LV-08', angle: 'curiosity-pattern', text: "That thing you keep doing — the pattern you swore you'd break? There's usually a placement behind it, and I can show you where it lives.", ctaLabel: 'Show me why I do this' },
  'LV-09': { id: 'LV-09', angle: 'timing-decision', text: "Got a decision hovering — a text, a yes or no, a leap? Some weeks the sky backs you, some say wait. Five minutes tells you which.", ctaLabel: 'Tell me: go or wait?' },
  'LV-10': { id: 'LV-10', angle: 'personalization-bigthree', text: "Your sun, moon, and rising are the back of the book. The actual story — why they're basically arguing — that's the read.", ctaLabel: 'Read me the real story' },
  'LV-11': { id: 'LV-11', angle: 'free-norisk', text: "You can do this for free. Three minutes, no card, no 'trial that bills you later.' Worst case, you learn something about yourself.", ctaLabel: 'Try it free, Luna' },
  'LV-12': { id: 'LV-12', angle: 'objection-vague', text: "Thinking 'isn't this just vague feel-good stuff'? Fair. My rule: tendencies and timing, never 'a tall stranger awaits.' Bring something real.", ctaLabel: 'Test me on something real' },
  'LV-13': { id: 'LV-13', angle: 'curiosity-area', text: "I can tell you what energy's in the air — this email just did. Where it shows up for you, love, money, work, is a chart question.", ctaLabel: 'Which part of my life?' },
  'LV-14': { id: 'LV-14', angle: 'social-human', text: "I'm not a hotline. One person, reading one actual chart — yours. When we talk, I'm reading you, not running a script.", ctaLabel: 'Read mine for real' },
  'LV-15': { id: 'LV-15', angle: 'returning-sky', text: "Your chart's the same as last time. The sky isn't. New transits are touching the exact placements we talked about.", ctaLabel: 'Show me what’s changed' },
  'LV-16': { id: 'LV-16', angle: 'objection-time', text: "This isn't a one-hour sit-down. Three minutes, on your phone, in line for coffee. Ask one thing, get a real answer.", ctaLabel: 'Give me the 3-minute version' },
  'LV-17': { id: 'LV-17', angle: 'personalization-free', text: "Everything above applies to roughly everyone. Your chart applies to exactly one person — and your 3 free minutes are right there.", ctaLabel: 'Read my exact chart' },
  'LV-18': { id: 'LV-18', angle: 'timing-curiosity', text: "One placement in most charts is lit up this week. I won't name yours in an email — it usually shows up as one nagging feeling you can't place.", ctaLabel: 'Name what I’m feeling' },
};

// Which blurb angles fit which data-driven pillar (PRD §5.1), best-fit first.
const PILLAR_BLURBS: Record<Pillar, string[]> = {
  "Today's Sky": ['LV-13', 'LV-03', 'LV-18'],
  'Your Timing Window': ['LV-02', 'LV-09', 'LV-18'],
};
const CROSS_CUTTING = ['LV-05', 'LV-14', 'LV-01', 'LV-08'];
const FREE_BLURBS = ['LV-04', 'LV-11', 'LV-17'];

// The single italic reassurance line under the CTA (PRD §5.3), rotated by index.
export const FRICTION_LINES = [
  '3 free minutes, no card &mdash; just talk to me like you’d text a friend.',
  'No sign-up wall, no credit card. Your first 3 minutes are on me.',
  'You don’t need to know any astrology. Bring a question, I’ll bring your chart.',
  'Free to start, nothing to install &mdash; stop whenever you want.',
];

export interface PickedBlurb { id: string; text: string; ctaLabel: string; friction: string; }

/** Deterministically pick a blurb for a send: matched to pillar, rotating, no repeat. */
export function pickBlurb(pillar: Pillar, index: number, lastId?: string): PickedBlurb {
  const pref = PILLAR_BLURBS[pillar] ?? PILLAR_BLURBS["Today's Sky"];
  // Every 3rd send, lead with a free-minutes blurb; otherwise pillar + cross-cutting.
  const pool = index % 3 === 2 ? [...FREE_BLURBS, ...pref] : [...pref, ...CROSS_CUTTING];
  const uniq = Array.from(new Set(pool));
  let pick = uniq[index % uniq.length];
  if (pick === lastId && uniq.length > 1) pick = uniq[(index + 1) % uniq.length];
  const b = BLURBS[pick];
  return { id: b.id, text: b.text, ctaLabel: b.ctaLabel, friction: FRICTION_LINES[index % FRICTION_LINES.length] };
}

/** Full CTA href to the /luna cold lander with campaign UTMs. */
export function buildCtaHref(blurbId: string, base = 'https://theseerwithin.com/luna'): string {
  return `${base}?utm_source=kit&utm_medium=email&utm_campaign=luna-daily&utm_content=${blurbId}`;
}
