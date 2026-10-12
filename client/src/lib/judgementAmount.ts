// What she typed in 03's amount box, in cents. Shared by the page and the chat
// so the same keystrokes can never mean two different amounts.
//
// "40", "40.00", "$40" and " 40 " are all a woman typing forty dollars, and
// "1,000" is a thousand. "12,5" and "40,00" are a European keyboard's decimal
// comma — ⛔ never $125 and $4,000, which is what stripping every comma charged.
// Anything else is not a number and stays invalid rather than being guessed at.

// "40", "40.5", "40.00".
const PLAIN = /^\d+(\.\d{0,2})?$/
// "1,000", "12,345,678.50" — commas only between groups of exactly three.
const THOUSANDS = /^\d{1,3}(,\d{3})+(\.\d{0,2})?$/
// "12,5", "40,00" — one comma, one or two digits after it, no dot anywhere.
const DECIMAL_COMMA = /^\d+,\d{1,2}$/

export function parseAmountCents(input: string): number | null {
  const typed = input.trim().replace(/^\$/, '')
  let cleaned: string
  if (PLAIN.test(typed)) cleaned = typed
  else if (THOUSANDS.test(typed)) cleaned = typed.replace(/,/g, '')
  else if (DECIMAL_COMMA.test(typed)) cleaned = typed.replace(',', '.')
  else return null
  const cents = Math.round(Number(cleaned) * 100)
  return Number.isFinite(cents) ? cents : null
}
