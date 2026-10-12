// parseDollarInput — reads the paywall's "Custom Amount" field as cents.
//
// Shared by the in-chat paywall (BuyCreditsModal) and the /credits store
// (CreditsStoreView) so the two can never read the same text differently.
//
// WHY: phones in Europe and Latin America type the decimal point as a comma.
// The old cleaning step deleted the comma, so "12,5" was read as $125.
//
// The rules:
//   - a comma is the decimal point, same as a dot ("12,5" = $12.50);
//   - more than one separator ("1.000,00", "1,000.00") is invalid — we can't
//     tell which one is the decimal point, so we refuse to guess;
//   - at most 2 decimals; a third is invalid rather than cut off, so a pasted
//     "12,345" never becomes $12.34.
// Anything that isn't a digit or a separator ("$", spaces, letters, "-") is
// dropped as she types, so the field only ever shows what will be charged.

/** Shown in the field's error spot when the text can't be read as one amount. */
export const DOLLAR_INPUT_HINT = "Enter an amount like 25 or 25.50.";

/** The field's keystroke filter: keep digits and decimal separators only. */
export function cleanDollarInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, "");
}

export interface ParsedDollarInput {
  /** Whole cents. 0 when the field is empty or invalid. */
  cents: number;
  /** True when the text can't be read as one amount (e.g. "1.000,00", "12,345"). */
  invalid: boolean;
}

export function parseDollarInput(raw: string): ParsedDollarInput {
  const text = cleanDollarInput(raw);
  if ((text.match(/[.,]/g) ?? []).length > 1) return { cents: 0, invalid: true };
  const [whole, fraction = ""] = text.split(/[.,]/);
  if (fraction.length > 2) return { cents: 0, invalid: true };
  // Whole-number maths on the digit strings, so no float rounding creeps in.
  const cents = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return { cents: 0, invalid: true };
  return { cents, invalid: false };
}
