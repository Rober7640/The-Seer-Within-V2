// Unit tests for the Numerology Engine
// Run with: npx tsx server/lib/numerologyEngine.test.ts

import {
  reduceNumber,
  detectKarmicDebt,
  calculateLifePath,
  calculateExpression,
  calculateSoulUrge,
  calculatePersonality,
  calculateBirthday,
  calculateNumerologyProfile,
  formatNumerologyProfileForPrompt,
} from './numerologyEngine';

// ============================================================
// Tiny test runner (matches universalSafety.test.ts style)
// ============================================================
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assertEq(actual: unknown, expected: unknown, name: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  }
}

// ============================================================
// Master numbers — reduceNumber preserves 11, 22, AND 33
// ============================================================
assertEq(reduceNumber(11), 11, 'reduceNumber preserves 11');
assertEq(reduceNumber(22), 22, 'reduceNumber preserves 22');
assertEq(reduceNumber(33), 33, 'reduceNumber preserves 33 (the fix)');
assertEq(reduceNumber(38), 11, 'reduceNumber(38) -> 11 (master)');
assertEq(reduceNumber(51), 6, 'reduceNumber(51) -> 6');
assertEq(reduceNumber(9), 9, 'reduceNumber single digit unchanged');

// Life Path 33: 2000-09-22 -> m=9, d=22, y=2 -> 9+22+2=33 (must stay 33, not 6)
assertEq(calculateLifePath('2000-09-22'), 33, 'Life Path 33 preserved (2000-09-22)');

// ============================================================
// Karmic Debt detection — passes through 13/14/16/19, not masters
// ============================================================
assertEq(detectKarmicDebt(14), 14, 'KD: raw 14 -> 14');
assertEq(detectKarmicDebt(19), 19, 'KD: raw 19 (day 19) -> 19');
assertEq(detectKarmicDebt(16), 16, 'KD: raw 16 (WOW) -> 16');
assertEq(detectKarmicDebt(49), 13, 'KD: 49 -> 13 -> 4, passes through 13');
assertEq(detectKarmicDebt(22), 0, 'KD: master 22 is not a karmic debt');
assertEq(detectKarmicDebt(52), 0, 'KD: 52 -> 7, no karmic debt');
assertEq(detectKarmicDebt(9), 0, 'KD: single digit, no karmic debt');

// ============================================================
// Reference profile — Carol Ann Baker, 1975-07-22 (hand-computed)
//   Name letters carolannbaker sum=52 -> Expression 7
//   Vowels a,o,a,a,e = 14 -> Soul Urge 5 + Karmic Debt 14
//   Consonants c,r,l,n,n,b,k,r = 38 -> Personality 11
//   Day 22 -> Birthday 22
//   LifePath m7 + d22 + y22 = 51 -> 6
//   Pinnacles: p1 reduce(29)=11, p2 reduce(44)=8, p3 reduce(19)=1, p4 reduce(29)=11
//   Challenges (reduceSimple): m7 d4 y4 -> [3,0,3,3]
// ============================================================
assertEq(calculateExpression('Carol Ann Baker'), 7, 'Carol Expression = 7');
assertEq(calculateSoulUrge('Carol Ann Baker'), 5, 'Carol Soul Urge = 5');
assertEq(calculatePersonality('Carol Ann Baker'), 11, 'Carol Personality = 11 (master)');
assertEq(calculateBirthday('1975-07-22'), 22, 'Carol Birthday = 22 (master)');
assertEq(calculateLifePath('1975-07-22'), 6, 'Carol Life Path = 6');

const carol = calculateNumerologyProfile('1975-07-22', 'Carol Ann Baker');
assertEq(carol.pinnacleNumbers, [11, 8, 1, 11], 'Carol Pinnacles [11,8,1,11]');
assertEq(carol.challengeNumbers, [3, 0, 3, 3], 'Carol Challenges [3,0,3,3]');
assertEq(carol.karmicDebts, { soulUrge: 14 }, 'Carol has Soul Urge Karmic Debt 14');

// birthday-19 person carries a Birthday karmic debt 19
const kd19 = calculateNumerologyProfile('1990-04-19', 'John Doe');
assertEq(kd19.karmicDebts.birthday, 19, 'Birthday 19 -> Karmic Debt 19');

// formatter surfaces karmic debt when present, omits when absent
const carolText = formatNumerologyProfileForPrompt(carol);
assertEq(/Karmic Debt/i.test(carolText), true, 'formatter emits Karmic Debt line for Carol');
const noKd = calculateNumerologyProfile('1990-02-03', 'Sam');
assertEq(/Karmic Debt/i.test(formatNumerologyProfileForPrompt(noKd)), false, 'formatter omits Karmic Debt when none');

// backward-compat: a profile stored before karmicDebts existed must not crash the formatter
const legacy = { ...carol } as Record<string, unknown>;
delete legacy.karmicDebts;
let legacyOk = true;
try { formatNumerologyProfileForPrompt(legacy as never); } catch { legacyOk = false; }
assertEq(legacyOk, true, 'formatter tolerates legacy profile without karmicDebts');

// ============================================================
// Report
// ============================================================
console.log(`\nNumerology engine: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
