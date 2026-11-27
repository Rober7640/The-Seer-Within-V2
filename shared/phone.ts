import { msg } from './i18n';

/**
 * The phone box on the Payments.AI checkout — one rule for the page AND the server,
 * so the page can never accept a number the server then refuses.
 *
 * Payments.AI wants E.164 (+ country code). Our buyers are mostly American and type
 * "555 555 0123" with no "+1", which the box used to refuse (Joel's re-test list,
 * 16 Nov). So a plain US number is accepted and given its +1 here:
 *   - "+…"                 → kept as typed (any country), if 8-15 digits
 *   - "00…"                → the international prefix, read as "+…"
 *   - 10 digits            → a US/Canada number ⇒ "+1" + the digits
 *   - 11 digits from a "1" → a US/Canada number with its 1 ⇒ "+" + the digits
 * Anything else (e.g. a local "07700 900123" or "0917 123 4567") is refused, with a
 * message asking for the country code — we can't guess which country it is.
 */
export const PHONE_ERROR = msg(
  'Please enter your phone number. If you are outside the US, start with your country code, e.g. +44 7700 900123',
);

export function normalizePhone(raw: unknown): string | null {
  let s = String(raw ?? '').replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  if (/^[2-9]\d{9}$/.test(s)) return `+1${s}`;
  if (/^1[2-9]\d{9}$/.test(s)) return `+${s}`;
  return null;
}
