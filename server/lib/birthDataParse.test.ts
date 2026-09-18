// Regression tests for the birth-data intake parsers (Luna/Nova astrology intake).
// These extract date/time/city from FREE TEXT so the persona never re-asks for what
// the user already gave (the intake-tax the fork was built to kill).
// Run with: npx tsx server/lib/birthDataParse.test.ts

import { parseBirthDate, parseBirthTime, extractBirthCity } from './chatEngine';

let passed = 0, failed = 0;
const failures: string[] = [];
function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) passed++;
  else { failed++; failures.push(`${name}: got ${JSON.stringify(actual)} exp ${JSON.stringify(expected)}`); }
}

// ── parseBirthDate: numeric, ISO, natural language, EMBEDDED in a sentence ──
eq(parseBirthDate('June 15 1990'), '1990-06-15', 'date: bare natural');
eq(parseBirthDate('15 June 1990'), '1990-06-15', 'date: day-month-year');
eq(parseBirthDate('June 15, 1990'), '1990-06-15', 'date: with comma');
eq(parseBirthDate('Jun 15th 1990'), '1990-06-15', 'date: abbrev + ordinal');
eq(parseBirthDate('6/15/1990'), '1990-06-15', 'date: US numeric');
eq(parseBirthDate('1990-06-15'), '1990-06-15', 'date: ISO');
eq(parseBirthDate('I was born June 15 1990 at 3:15pm in Chicago'), '1990-06-15', 'date: embedded in sentence');
eq(parseBirthDate('Born December 2 1988, 9am, Denver Colorado'), '1988-12-02', 'date: embedded with commas');
eq(parseBirthDate('September 3 1985'), '1985-09-03', 'date: september');
eq(parseBirthDate('sept 3 1985'), '1985-09-03', 'date: sept abbrev');
eq(parseBirthDate('3:15 pm like I said'), null, 'date: time-only is not a date');
eq(parseBirthDate('Chicago, in the United States'), null, 'date: place is not a date');
eq(parseBirthDate('why do I keep dating unavailable men'), null, 'date: question is not a date');
eq(parseBirthDate('13/40/1990'), null, 'date: invalid month/day rejected');

// ── parseBirthTime: am/pm anywhere, hour-only, 24h, unknown ──
eq(parseBirthTime('I was born June 15 1990 at 3:15pm in Chicago'), '15:15', 'time: embedded pm');
eq(parseBirthTime('Born December 2 1988, 9am, Denver Colorado'), '09:00', 'time: hour-only am');
eq(parseBirthTime('2:30 PM'), '14:30', 'time: bare pm');
eq(parseBirthTime('12:00 am'), '00:00', 'time: midnight');
eq(parseBirthTime('12 pm'), '12:00', 'time: noon hour-only');
eq(parseBirthTime('13:45'), '13:45', 'time: 24h bare');
eq(parseBirthTime('unknown'), '12:00', 'time: unknown → noon');
eq(parseBirthTime("I don't know"), '12:00', 'time: dont know → noon');
eq(parseBirthTime('June 15 1990'), null, 'time: a date has no time');

// ── extractBirthCity: "in <City>" (last one), trailing segment, country ──
eq(extractBirthCity('I was born June 15 1990 at 3:15pm in Chicago'), 'Chicago', 'city: in Chicago');
eq(extractBirthCity('I was born June 15 1990 at quarter past 3 in the afternoon in Chicago'), 'Chicago', 'city: last "in" wins, filler rejected');
eq(extractBirthCity('Born December 2 1988, 9am, Denver Colorado'), 'Denver Colorado', 'city: trailing segment');
eq(extractBirthCity('June 15 1990 at 3pm in London, UK'), 'London, UK', 'city: with country');

console.log(`\nbirth-data parsers: ${passed} passed, ${failed} failed`);
if (failed) { console.log('\nFAILURES:'); failures.forEach(f => console.log(`  ✗ ${f}`)); process.exit(1); }
