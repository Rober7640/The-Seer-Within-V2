/**
 * 07 — read the spread registry, and resolve a tier ONCE.
 *
 *   import { spreads, spread, resolve, cardCounts } from './07-registry.mjs';
 *
 * ⭐ `scripts/07-spreads.json` is the definition. This file is the only arithmetic on top of
 *    it, and everything that needs a card count — the booking page, the be_07_draws seed, the
 *    n8n brief test — calls `resolve` rather than counting for itself. The one failure this
 *    offer cannot survive is the number she is SOLD and the number she is DELIVERED being
 *    computed by two pieces of code that can disagree.
 *
 * ⛔ n8n stays downstream of all of this. It reads a stored draw record, never this registry
 *    and never a spread name. Keep it that way — a spread invented tomorrow should need no
 *    workflow change at all.
 */
import fs from 'fs';

export const REGISTRY = JSON.parse(
  fs.readFileSync(new URL('./07-spreads.json', import.meta.url), 'utf8'));

export const TIER_MODEL = REGISTRY.tier_model;
export const FLOOR = REGISTRY.floor;
export const ORDER = TIER_MODEL.order;

/**
 * Every spread key, in CALENDAR order.
 *
 * 🔴 THIS USED TO READ `REGISTRY.days.map((d) => byDay(d).key)`, and that was a silent cap at
 *    seven. `byDay` takes the FIRST spread on a weekday, so once the registry holds more than
 *    one spread per weekday — which the 30-day test does by construction — every spread after
 *    the first on its day was dropped from `keys()`, from `spreads()`, and therefore from
 *    check-07-registry.mjs, test-07-brief.mjs and the booking-page generator. The run still
 *    printed green. Twenty-three unchecked spreads is not a check.
 *
 * ⛔ The weekday is the OPENING SHAPE, not the identity. `day_number` (1..N) is the calendar
 *    slot and is what orders this list. Spreads without one keep file order, so a seven-spread
 *    registry written before the 30-day test returns exactly what it always did.
 */
export const keys = () =>
  Object.entries(REGISTRY.spreads)
    .map(([k, s], i) => [k, s.day_number ?? i + 1, i])
    .sort((a, b) => a[1] - b[1] || a[2] - b[2])
    .map(([k]) => k);

/** [key, entry] for every spread, in calendar order. */
export const spreads = () => keys().map((k) => [k, REGISTRY.spreads[k]]);

export function spread(key) {
  const s = REGISTRY.spreads[key];
  if (!s) throw new Error(`unknown spread key: ${key} — have ${Object.keys(REGISTRY.spreads).join(', ')}`);
  return { key, ...s };
}

/**
 * The FIRST spread on a weekday.
 * ⚠ With more than one spread per weekday this is ambiguous by definition — it answers
 *   "what shape does this weekday run?", never "which spread is this?". ⛔ Never use it to
 *   enumerate; that is what broke `keys()`. Use `keys()` / `byDayNumber()` to address a spread.
 */
export function byDay(day) {
  const hit = Object.entries(REGISTRY.spreads).find(([, s]) => s.day === day);
  if (!hit) throw new Error(`no spread on day: ${day}`);
  return { key: hit[0], ...hit[1] };
}

/** Every spread that runs a weekday's opening shape, in calendar order. */
export const byWeekday = (day) =>
  spreads().filter(([, s]) => s.day === day).map(([k, s]) => ({ key: k, ...s }));

/** The spread in calendar slot n (1-based). */
export function byDayNumber(n) {
  const key = keys()[n - 1];
  if (!key) throw new Error(`no spread in calendar slot ${n} — the registry holds ${keys().length}`);
  return spread(key);
}

export const free = (key) => spread(key).positions.filter((p) => p.free);
export const paid = (key) => spread(key).positions.filter((p) => !p.free);

/**
 * What a tier actually contains on a given day.
 *
 * ⭐ 07-C5, locked 2026-09-04: a rung is HOW MANY OF HER QUESTIONS get answered. Answer one is
 *    the day's spread, every paid position. Each answer after it is the whole table read again
 *    against her next question, plus three of the morning's OPEN cards.
 *
 * -> { ok: true, questions, positions, answers, counts:{free,paid,open,total}, price_usd, … }
 * -> { ok: false, reason }   only ever the floor — no rung can collapse into a cheaper one now
 */
export function resolve(key, tier) {
  const s = spread(key);
  const t = TIER_MODEL.tiers[tier];
  if (!t) throw new Error(`unknown tier: ${tier} — have ${ORDER.join(', ')}`);

  const dayFree = s.positions.filter((p) => p.free);
  const dayPaid = s.positions.filter((p) => !p.free);

  // ⭐ THE FLOOR MOVED, 2026-09-06. It used to sit on the DAY SPREAD's own total and refuse
  //    anything under six. That was right while what she bought was "the rest of today's cards" —
  //    a four-card day spread would have sold the top rung on almost nothing.
  //
  //    Under 07-C5 she does not buy the rest of the day's cards. She buys HER QUESTIONS answered,
  //    and each question after the first is laid on three cards cut with no position on them. So
  //    the thing that has to clear a floor is **what the paid reading actually contains**, not how
  //    many cards happened to be placed this morning. A three-card past/present/future daily is a
  //    legitimate product; a two-card answer is not.
  //
  //    So: answer 1 is the day's paid positions, TOPPED UP from the open cut until it is a real
  //    reading. ⛔ Nothing changes for a spread that already has five or more paid cards — every
  //    existing spread tops up by zero and its card counts are byte-identical to before.
  const per = TIER_MODEL.open_per_question;
  const minAnswer = TIER_MODEL.min_cards_per_answer ?? FLOOR;
  const topUp = Math.max(0, minAnswer - dayPaid.length);

  if (dayFree.length === 0 || dayPaid.length === 0) {
    return { ok: false, refusal: 'no-split',
      reason: `${s.name} has ${dayFree.length} free and ${dayPaid.length} paid — a daily needs both` };
  }

  const n = t.questions;

  // Answer 1 does all the establishing work: the day's paid cards, plus a top-up off the open cut
  // when the day spread is small. Answers 2 and 3 inherit the standing table and cost three open
  // cards each — which is why WORDS needs no change to carry two and three answers.
  const answers = [{ index: 1, establishes: true, positions: dayPaid.map((p) => ({ ...p, block: 'day' })) }];
  const open = [];
  if (topUp > 0) {
    const slice = TIER_MODEL.open_positions.slice(0, topUp).map((p, i) => ({
      ...p, block: 'open', draw_index: i + 1, answer: 1,
    }));
    open.push(...slice);
    answers[0].positions.push(...slice);
  }
  for (let a = 2; a <= n; a++) {
    // ⛔ In the order they came off the cut. The writer never picks which open card goes where.
    const slice = TIER_MODEL.open_positions.map((p, i) => ({
      ...p, block: 'open', draw_index: topUp + (a - 2) * per + i + 1, answer: a,
    }));
    open.push(...slice);
    answers.push({ index: a, establishes: false, positions: slice });
  }

  const positions = answers.flatMap((a) => a.positions);
  return {
    ok: true,
    key, tier, day: s.day, label: t.label,
    questions: n,
    price_usd: t.price_usd,
    target_words: t.target_words,
    position_words: Math.round(t.target_words * TIER_MODEL.position_share),
    closing_passage: tier === TIER_MODEL.closing_passage_tier,
    answers, positions,
    counts: {
      free: dayFree.length,
      paid: dayPaid.length,
      open: open.length,
      total: dayFree.length + dayPaid.length + open.length,
    },
  };
}

/**
 * How many cards the morning cut lays LOOSE, for this spread.
 *
 * ⭐ Derived, not a constant. It used to be a flat six — three for her second question, three for
 * her third. That held while every day spread carried five or six paid cards of its own. A small
 * spread (a three-card past/present/future) tops answer 1 up from the same cut, so it needs more
 * loose cards, not fewer: three placed and nine loose, against seven placed and six loose.
 *
 * ⛔ It is still ONE cut, in one minute, before light. What changes is how many of them have a
 * position on them by the time she reads the email.
 */
export function openDrawSize(key) {
  const paid = spread(key).positions.filter((p) => !p.free).length;
  const min = TIER_MODEL.min_cards_per_answer ?? FLOOR;
  const topUp = Math.max(0, min - paid);
  return topUp + TIER_MODEL.open_per_question * 2;
}

/** What the booking page prints: { spread: 8, pattern: 11, table: 14 }. Never null under C5. */
export function cardCounts(key) {
  return Object.fromEntries(ORDER.map((t) => {
    const r = resolve(key, t);
    return [t, r.ok ? r.counts.total : null];
  }));
}

/** The 7x3 table, for a page or a check. */
export const tierTable = () =>
  spreads().map(([k, s]) => ({ day: s.day, key: k, name: s.name, ...cardCounts(k) }));
