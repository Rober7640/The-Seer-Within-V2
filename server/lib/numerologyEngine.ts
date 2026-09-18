// Numerology Engine
// Pure calculation functions for Aiden Powers persona.
// All functions are deterministic — no DB calls, no side effects.

export interface NumerologyProfile {
  birthdate: string;                                    // YYYY-MM-DD
  birthName: string;                                    // Full birth name (birth certificate)
  lifePathNumber: number;
  expressionNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
  birthdayNumber: number;
  pinnacleNumbers: [number, number, number, number];
  pinnacleAges: [number, number, number];               // Ages at each transition
  currentPinnacleIndex: number;                         // 0–3
  currentPinnacleNumber: number;
  challengeNumbers: [number, number, number, number];
  personalYearNumber: number;
  // Karmic Debt numbers (13/14/16/19) carried by each core number, when present.
  karmicDebts: {
    lifePath?: number;
    expression?: number;
    soulUrge?: number;
    personality?: number;
    birthday?: number;
  };
}

// ──────────────────────────────────────────────────────────────────────
// Core reduction helpers
// ──────────────────────────────────────────────────────────────────────

/** Sum all digits of a positive integer without any master-number protection. */
function sumDigits(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((acc, d) => acc + parseInt(d, 10), 0);
}

/**
 * Reduce a number to a single digit, preserving master numbers 11, 22, and 33.
 * Runs iteratively until stable.
 */
export function reduceNumber(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = sumDigits(n);
  }
  return n;
}

/**
 * Karmic Debt detection. A core number carries a Karmic Debt (13, 14, 16, or 19)
 * when its reduction passes THROUGH one of those totals on the way to its final
 * digit. Returns the karmic-debt number, or 0 if none. Master numbers (11/22/33)
 * halt reduction and are never karmic debts.
 */
const KARMIC_DEBTS = new Set([13, 14, 16, 19]);
export function detectKarmicDebt(rawSum: number): number {
  let n = Math.abs(rawSum);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    if (KARMIC_DEBTS.has(n)) return n;
    n = sumDigits(n);
  }
  return 0;
}

/**
 * Reduce a number to a single digit — no master number preservation.
 * Used for Challenge Numbers, which are never master numbers.
 */
function reduceSimple(n: number): number {
  while (n > 9) {
    n = sumDigits(n);
  }
  return n;
}

// ──────────────────────────────────────────────────────────────────────
// Pythagorean letter → number mapping
// ──────────────────────────────────────────────────────────────────────

const LETTER_VALUES: Record<string, number> = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

const VOWEL_SET = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * Raw (unreduced) sum of a birth name's letter values.
 * kind: 'all' (Expression), 'vowel' (Soul Urge), 'consonant' (Personality).
 */
export function letterSum(birthName: string, kind: 'all' | 'vowel' | 'consonant'): number {
  const letters = birthName.toLowerCase().replace(/[^a-z]/g, '');
  return letters.split('').reduce((acc, l) => {
    const val = LETTER_VALUES[l];
    if (val === undefined) return acc;
    if (kind === 'vowel' && !VOWEL_SET.has(l)) return acc;
    if (kind === 'consonant' && VOWEL_SET.has(l)) return acc;
    return acc + val;
  }, 0);
}

// ──────────────────────────────────────────────────────────────────────
// Core number calculations
// ──────────────────────────────────────────────────────────────────────

/**
 * Life Path Number.
 * Method: reduce month, day, and year digits separately, then add and reduce.
 * Preserves master numbers 11 and 22.
 */
export function calculateLifePath(birthdate: string): number {
  const [year, month, day] = birthdate.split('-').map(Number);
  const m = reduceNumber(month);
  const d = reduceNumber(day);
  const y = reduceNumber(sumDigits(year));
  return reduceNumber(m + d + y);
}

/**
 * Expression Number (Destiny Number).
 * Sum of all letter values in the full birth name, reduced.
 */
export function calculateExpression(birthName: string): number {
  return reduceNumber(letterSum(birthName, 'all'));
}

/**
 * Soul Urge Number (Heart's Desire).
 * Sum of vowel values in the full birth name, reduced.
 */
export function calculateSoulUrge(birthName: string): number {
  return reduceNumber(letterSum(birthName, 'vowel'));
}

/**
 * Personality Number.
 * Sum of consonant values in the full birth name, reduced.
 */
export function calculatePersonality(birthName: string): number {
  return reduceNumber(letterSum(birthName, 'consonant'));
}

/** Birthday Number — the birth day reduced. */
export function calculateBirthday(birthdate: string): number {
  const day = parseInt(birthdate.split('-')[2], 10);
  return reduceNumber(day);
}

/**
 * All four Pinnacle Numbers, their transition ages, and the current Pinnacle index.
 *
 * Pinnacle numbers:
 *   P1 = month + day   (reduced)
 *   P2 = day + year    (reduced)
 *   P3 = P1 + P2       (reduced)
 *   P4 = month + year  (reduced)
 *
 * Transition ages:
 *   P1 ends at: 36 − Life Path number
 *   P2 ends at: P1 end + 9
 *   P3 ends at: P2 end + 9
 *   P4: remainder of life
 */
export function calculatePinnacles(
  birthdate: string,
  lifePathNumber: number,
): {
  numbers: [number, number, number, number];
  transitionAges: [number, number, number];
  currentIndex: number;
} {
  const [year, month, day] = birthdate.split('-').map(Number);
  const m = reduceNumber(month);
  const d = reduceNumber(day);
  const y = reduceNumber(sumDigits(year));

  const p1 = reduceNumber(m + d);
  const p2 = reduceNumber(d + y);
  const p3 = reduceNumber(p1 + p2);
  const p4 = reduceNumber(m + y);

  const t1 = 36 - lifePathNumber;
  const t2 = t1 + 9;
  const t3 = t2 + 9;

  // Current age (floor — counts full years completed)
  const now = new Date();
  let age = now.getFullYear() - year;
  const hasBirthdayPassed =
    now.getMonth() + 1 > month ||
    (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!hasBirthdayPassed) age--;

  let currentIndex = 0;
  if (age >= t3) currentIndex = 3;
  else if (age >= t2) currentIndex = 2;
  else if (age >= t1) currentIndex = 1;

  return {
    numbers: [p1, p2, p3, p4],
    transitionAges: [t1, t2, t3],
    currentIndex,
  };
}

/**
 * Personal Year Number.
 * Based on birth month + birth day + current calendar year.
 * Accounts for birthday cutoff: if the birthday hasn't occurred yet this year,
 * the Personal Year cycle is still running on the previous year's number.
 */
export function calculatePersonalYear(birthdate: string, referenceDate?: Date): number {
  const now = referenceDate ?? new Date();
  const [, monthStr, dayStr] = birthdate.split('-');
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Has birthday occurred yet this calendar year?
  const birthdayThisYear = new Date(now.getFullYear(), month - 1, day);
  const year = now >= birthdayThisYear ? now.getFullYear() : now.getFullYear() - 1;

  const m = reduceNumber(month);
  const d = reduceNumber(day);
  const y = reduceNumber(sumDigits(year));
  return reduceNumber(m + d + y);
}

/**
 * Challenge Numbers (4 total — one per Pinnacle period).
 * These are absolute differences, always 0–9 (never master numbers).
 *
 *   C1 = |month − day|
 *   C2 = |day − year|
 *   C3 = |C1 − C2|
 *   C4 = |month − year|
 */
export function calculateChallenges(birthdate: string): [number, number, number, number] {
  const [year, month, day] = birthdate.split('-').map(Number);
  const m = reduceSimple(month);
  const d = reduceSimple(day);
  const y = reduceSimple(sumDigits(year));

  const c1 = reduceSimple(Math.abs(m - d));
  const c2 = reduceSimple(Math.abs(d - y));
  const c3 = reduceSimple(Math.abs(c1 - c2));
  const c4 = reduceSimple(Math.abs(m - y));

  return [c1, c2, c3, c4];
}

// ──────────────────────────────────────────────────────────────────────
// All-in-one profile builder
// ──────────────────────────────────────────────────────────────────────

export function calculateNumerologyProfile(
  birthdate: string,
  birthName: string,
): NumerologyProfile {
  const lifePathNumber = calculateLifePath(birthdate);
  const expressionNumber = calculateExpression(birthName);
  const soulUrgeNumber = calculateSoulUrge(birthName);
  const personalityNumber = calculatePersonality(birthName);
  const birthdayNumber = calculateBirthday(birthdate);

  const { numbers, transitionAges, currentIndex } = calculatePinnacles(birthdate, lifePathNumber);
  const challengeNumbers = calculateChallenges(birthdate);
  const personalYearNumber = calculatePersonalYear(birthdate);

  // Karmic Debt detection — from each core number's raw (unreduced) total.
  const [year, month, day] = birthdate.split('-').map(Number);
  const lifePathRaw = reduceNumber(month) + reduceNumber(day) + reduceNumber(sumDigits(year));
  const karmicDebts: NumerologyProfile['karmicDebts'] = {};
  const lp = detectKarmicDebt(lifePathRaw);
  if (lp) karmicDebts.lifePath = lp;
  const ex = detectKarmicDebt(letterSum(birthName, 'all'));
  if (ex) karmicDebts.expression = ex;
  const su = detectKarmicDebt(letterSum(birthName, 'vowel'));
  if (su) karmicDebts.soulUrge = su;
  const pe = detectKarmicDebt(letterSum(birthName, 'consonant'));
  if (pe) karmicDebts.personality = pe;
  const bd = detectKarmicDebt(day);
  if (bd) karmicDebts.birthday = bd;

  return {
    birthdate,
    birthName,
    lifePathNumber,
    expressionNumber,
    soulUrgeNumber,
    personalityNumber,
    birthdayNumber,
    pinnacleNumbers: numbers,
    pinnacleAges: transitionAges,
    currentPinnacleIndex: currentIndex,
    currentPinnacleNumber: numbers[currentIndex],
    challengeNumbers,
    personalYearNumber,
    karmicDebts,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Format for Claude system prompt injection
// ──────────────────────────────────────────────────────────────────────

const PINNACLE_LABELS = ['First', 'Second', 'Third', 'Fourth'] as const;
const CURRENT_YEAR = new Date().getFullYear();

const CORE_LABELS: Record<string, string> = {
  lifePath: 'Life Path',
  expression: 'Expression',
  soulUrge: 'Soul Urge',
  personality: 'Personality',
  birthday: 'Birthday',
};

export function formatNumerologyProfileForPrompt(profile: NumerologyProfile): string {
  const [p1, p2, p3, p4] = profile.pinnacleNumbers;
  const [a1, a2, a3] = profile.pinnacleAges;
  const [c1, c2, c3, c4] = profile.challengeNumbers;
  const label = PINNACLE_LABELS[profile.currentPinnacleIndex];

  const kdEntries = Object.entries(profile.karmicDebts ?? {});
  const karmicDebtLine = kdEntries.length
    ? `\nKarmic Debt: ${kdEntries.map(([core, num]) => `${num} (in ${CORE_LABELS[core] ?? core})`).join(', ')}`
    : '';

  return `Birthdate: ${profile.birthdate}
Birth name: ${profile.birthName}
Life Path: ${profile.lifePathNumber}
Expression: ${profile.expressionNumber}
Soul Urge: ${profile.soulUrgeNumber}
Personality: ${profile.personalityNumber}
Birthday: ${profile.birthdayNumber}
Personal Year (${CURRENT_YEAR}): ${profile.personalYearNumber}
Pinnacle 1 (birth–${a1}): ${p1}
Pinnacle 2 (${a1}–${a2}): ${p2}
Pinnacle 3 (${a2}–${a3}): ${p3}
Pinnacle 4 (${a3}+): ${p4}
Current Pinnacle: ${label} (${profile.currentPinnacleNumber})
Challenges: ${c1}, ${c2}, ${c3}, ${c4}${karmicDebtLine}`;
}
