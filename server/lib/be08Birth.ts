import type Stripe from 'stripe';

// 08 · Her birth fields: the DOB parser, and the Stripe custom_fields FALLBACK reader.
//
// D5 (2026-09-13) had Stripe's hosted Checkout collect her display first name, full birth
// name and date of birth as three `custom_fields`. D5 as AMENDED 2026-09-14 (Joel): those
// three are collected on OUR booking page and parked on be_order_intake by POST /checkout,
// because Stripe's docs forbid personal data in custom fields. `readBe08CustomFields` stays
// only so a session created before the change still fulfils; the webhook reads the intake
// first. `parseDateOfBirth` now runs TWICE: at checkout (refusing a bad date before money)
// and again on the paid signal (the intake's ISO date, or a legacy Stripe free-text value —
// "03/07/1971", "1971-07-03", "7 March 1971", "March 7th 71"). It turns that into a real
// date when it can, and says WHY when it cannot, so the caller can route her to support.
//
// ⛔ A bad value NEVER blocks a PAID order. Nothing here throws on her input.
// ⚠ PII. Never log a full birth name or a date of birth — only the reason code.

/** The three custom_field keys the 08 checkout USED to create (before 2026-09-14). Exact
 *  strings — still read as a fallback for sessions created under D5's first form. */
export const BE_08_FIELD_DISPLAY_FIRST_NAME = 'display_first_name';
export const BE_08_FIELD_FULL_BIRTH_NAME = 'full_birth_name';
export const BE_08_FIELD_DATE_OF_BIRTH = 'date_of_birth';

const MAX_TEXT = 200;
const MIN_AGE = 13;
const MAX_AGE = 110;

export interface Be08CustomFields {
  displayFirstName: string | null;
  fullBirthName: string | null;
  /** Exactly what she typed, trimmed. Parse with `parseDateOfBirth`. */
  dateOfBirthRaw: string | null;
}

/** Pull the three 08 fields off a Checkout session. Missing or empty → null, never a throw. */
export function readBe08CustomFields(
  session: Pick<Stripe.Checkout.Session, 'custom_fields'>,
): Be08CustomFields {
  const fields = Array.isArray(session.custom_fields) ? session.custom_fields : [];
  const text = (key: string): string | null => {
    const field = fields.find((f) => f && f.key === key);
    const value = field?.text?.value;
    if (typeof value !== 'string') return null;
    const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    return trimmed || null;
  };
  return {
    displayFirstName: text(BE_08_FIELD_DISPLAY_FIRST_NAME),
    fullBirthName: text(BE_08_FIELD_FULL_BIRTH_NAME),
    dateOfBirthRaw: text(BE_08_FIELD_DATE_OF_BIRTH),
  };
}

export type DobParse =
  | { ok: true; iso: string }
  | { ok: false; reason: DobFailReason };

/** Why a typed date of birth could not be used. Safe to log — carries no value. */
export type DobFailReason =
  | 'missing'
  | 'unparseable'
  | 'not_a_date'     // 31/02/1970
  | 'in_future'
  | 'too_young'      // < 13
  | 'too_old';       // > 110

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/**
 * Accepts, in this order:
 *   YYYY-MM-DD (also YYYY/MM/DD, YYYY.MM.DD)
 *   MM/DD/YYYY (also - and . separators), US order — the Stripe label asks for
 *     "MM/DD/YYYY", so when both parts could be a month ("03/07/1971") it is read
 *     month-first. A part > 12 still disambiguates the other way regardless of order
 *     ("25/12/1980" is day 25, month 12 — it cannot be month 25).
 *   D Month YYYY / Month D YYYY, with an optional ordinal and comma ("7th March 1971",
 *     "March 7, 1971"). Two-digit years are refused — 71 could be 1971 or 2071.
 * Then the calendar check (a real day), not in the future, and 13 ≤ age ≤ 110.
 */
export function parseDateOfBirth(raw: string | null | undefined, now: Date = new Date()): DobParse {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, reason: 'missing' };

  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;

  let match: RegExpMatchArray | null;
  if ((match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    y = Number(match[3]);
    if (a > 12 && b <= 12) [d, m] = [a, b];        // 25/03/1971 — a can't be a month, day first
    else if (b > 12 && a <= 12) [m, d] = [a, b];   // 03/25/1971 — b can't be a month, month first
    else if (a > 12 && b > 12) return { ok: false, reason: 'not_a_date' };
    else [m, d] = [a, b];                          // 03/07/1971 — both could be a month: US order
  } else if ((match = value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})$/))) {
    const month = MONTHS[match[2].toLowerCase()];
    if (!month) return { ok: false, reason: 'unparseable' };
    [d, m, y] = [Number(match[1]), month, Number(match[3])];
  } else if ((match = value.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/))) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return { ok: false, reason: 'unparseable' };
    [m, d, y] = [month, Number(match[2]), Number(match[3])];
  } else {
    return { ok: false, reason: 'unparseable' };
  }

  if (y === null || m === null || d === null) return { ok: false, reason: 'unparseable' };
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false, reason: 'not_a_date' };
  }
  if (date.getTime() > now.getTime()) return { ok: false, reason: 'in_future' };

  let age = now.getUTCFullYear() - y;
  const birthdayNotYet =
    now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (birthdayNotYet) age--;
  if (age < MIN_AGE) return { ok: false, reason: 'too_young' };
  if (age > MAX_AGE) return { ok: false, reason: 'too_old' };

  const pad = (n: number) => String(n).padStart(2, '0');
  return { ok: true, iso: `${y}-${pad(m)}-${pad(d)}` };
}

/**
 * "Mary Anne Smith" → first "Mary Anne", last "Smith" — the local app's rule, unchanged:
 * the LAST space splits, so a two-word first name survives and the lens reads the whole
 * name either way (it sums every letter). Null when there is no last name to split off.
 */
export function splitBirthName(full: string | null | undefined): { first: string; last: string } | null {
  const value = (full ?? '').replace(/\s+/g, ' ').trim();
  const at = value.lastIndexOf(' ');
  if (at < 1) return null;
  const first = value.slice(0, at).trim();
  const last = value.slice(at + 1).trim();
  return first && last ? { first, last } : null;
}
