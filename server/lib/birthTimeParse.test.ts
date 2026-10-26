// Tests for the birth-time intake parsers (Luna/Nova astrology onboarding).
// Run with: npx tsx server/lib/birthTimeParse.test.ts
//
// Regression for the Traci McKennon incident (2026-10-22): the strict parser
// rejected a semicolon typo ("2;30PM") and a sentence-wrapped time ("It is 2:30
// PM"), and after 3 misses SILENTLY defaulted to noon — producing a wrong chart.
// parseBirthTime now accepts clearly-formatted/embedded times; recoverBirthTime
// salvages typos so the persona can CONFIRM ("did you mean 2:30 PM?") instead of
// guessing noon.

import { parseBirthTime, recoverBirthTime } from './chatEngine';

let passed = 0, failed = 0;
const failures: string[] = [];
function eq(actual: unknown, expected: unknown, name: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else { failed++; failures.push(`${name}: got ${JSON.stringify(actual)} exp ${JSON.stringify(expected)}`); }
}

// ── parseBirthTime: clear/embedded times accepted directly (no confirm) ──
eq(parseBirthTime('2:30 PM'), '14:30', 'clear: bare pm');
eq(parseBirthTime('2:30 pm'), '14:30', 'clear: lowercase pm');
eq(parseBirthTime('12:00 am'), '00:00', 'clear: midnight');
eq(parseBirthTime('12 pm'), '12:00', 'clear: noon hour-only');
eq(parseBirthTime('9am'), '09:00', 'clear: hour-only am no space');
eq(parseBirthTime('13:45'), '13:45', 'clear: 24h unambiguous');
eq(parseBirthTime('I was born June 15 1990 at 3:15pm in Chicago'), '15:15', 'clear: embedded in sentence');
eq(parseBirthTime('It is 2:30 PM'), '14:30', 'clear: sentence wrapper');
eq(parseBirthTime('unknown'), '12:00', 'unknown → noon');
eq(parseBirthTime("I don't know"), '12:00', 'dont know → noon');

// ── parseBirthTime: ambiguous / typos / non-times must NOT be silently accepted ──
eq(parseBirthTime('2;30PM'), null, 'typo: semicolon not auto-accepted (→ confirm)');
eq(parseBirthTime('230pm'), null, 'typo: missing colon not auto-accepted (→ confirm)');
eq(parseBirthTime('2:30'), null, 'ambiguous: no am/pm, hour 1-12 (→ confirm/re-ask)');
eq(parseBirthTime('Yes'), null, 'non-time: Yes');
eq(parseBirthTime('June 15 1990'), null, 'non-time: a date has no time');

// ── recoverBirthTime: salvage typos for a confirm prompt ──
eq(recoverBirthTime('2;30PM'), { value: '14:30', display: '2:30 PM' }, 'recover: semicolon');
eq(recoverBirthTime('2.30pm'), { value: '14:30', display: '2:30 PM' }, 'recover: dot');
eq(recoverBirthTime('2 30 pm'), { value: '14:30', display: '2:30 PM' }, 'recover: spaced');
eq(recoverBirthTime('230pm'), { value: '14:30', display: '2:30 PM' }, 'recover: missing colon');
eq(recoverBirthTime('11;15 am'), { value: '11:15', display: '11:15 AM' }, 'recover: am semicolon');
eq(recoverBirthTime('Yes'), null, 'recover: non-time returns null');
eq(recoverBirthTime('2:30 PM'), { value: '14:30', display: '2:30 PM' }, 'recover: also handles clean (harmless)');

console.log(`\nbirth-time parsers: ${passed} passed, ${failed} failed`);
if (failed) { console.log('\nFAILURES:'); failures.forEach(f => console.log(`  ✗ ${f}`)); process.exit(1); }
process.exit(0);
